// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2";
import * as mqtt from "npm:mqtt";

// CORS headers for preflight and actual requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * @description Helper function to create a JSON response with appropriate headers.
 */
function createJsonResponse(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: status,
  });
}

/**
 * @description Helper function to log an action to the 'logs' table.
 */
async function logAction(
  adminClient: any,
  userId: string,
  userEmail: string,
  residentId: string | null, // 新增 residentId 參數
  command: string,
  status: "success" | "failure",
  details: string
) {
  try {
    const { error: logError } = await adminClient.from("logs").insert({
      user_id: userId,
      user_email: userEmail,
      resident_id: residentId, // 將 resident_id 存入資料庫
      command: command,
      status: status,
      details: details,
    });
    if (logError) throw logError;
  } catch (error) {
    console.error("Failed to write to log table:", error.message);
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 提前從請求中解析 body，以便在發生錯誤時也能記錄
    const body = await req.json();
    const { command } = body;
    let residentId: string | null = null; // 在 try 區塊外部宣告 residentId
    let user: any = null; // 在 try 區塊外部宣告 user

    // 1. 建立一個模擬使用者的 client，專門用來驗證 JWT 並取得使用者資訊
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // 2. Get user from Authorization header
    const { data: { user: authUser }, error: userError } = await userClient.auth.getUser();
    user = authUser; // 將 user 指派給外部變數

    if (userError || !user) {
      console.error("User auth error:", userError?.message);
      const errorMsg = "無效的認證或未登入";
      // 即使驗證失敗，也嘗試記錄（如果能解析出 command 的話）
      // 注意：此時 user 為 null，所以 user_id 和 user_email 會是 null
      await logAction(createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!), null, "unknown", null, command || "unknown", "failure", errorMsg);
      return createJsonResponse({ error: errorMsg }, 401);
    }

    // 建立一個擁有 service_role 權限的 client (可繞過 RLS)，專門用來執行後端管理任務
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 3. Check if user's email is in the whitelist
    const { data: whitelistEntry, error: whitelistError } = await adminClient
      .from("whitelist")
      .select("email, resident_id") // 同時查詢 email 和 resident_id
      .eq("email", user.email)
      .single();

    if (whitelistError || !whitelistEntry) {
      const errorMsg = "權限不足，您的帳號未在白名單中";
      console.error(`Whitelist check failed for ${user.email}:`, whitelistError?.message || "Not in whitelist");
      await logAction(adminClient, user.id, user.email, null, command, "failure", errorMsg);
      return createJsonResponse({ error: errorMsg }, 403);
    }

    const allowedCommands = ['up', 'stop', 'down', 'front_gate_open', 'rear_gate_open', 'food_waste_open', 'recycling_open'];
    if (!allowedCommands.includes(command)) {
      return createJsonResponse({ error: `無效的指令: ${command}` }, 400);
    }

    // 5. Get MQTT details from environment variables
    const mqttBrokerUrl = Deno.env.get("MQTT_BROKER_URL");
    const mqttTopic = Deno.env.get("MQTT_TOPIC");

    if (!mqttBrokerUrl || !mqttTopic) {
      console.error("MQTT environment variables not set");
      return createJsonResponse({ error: "伺服器內部設定錯誤" }, 500);
    }

    // 6. Publish MQTT message
    const mqttClient = mqtt.connect(mqttBrokerUrl);
    const payloadMap: { [key: string]: string } = {
      up: 'DoorUp',
      stop: 'DoorStop',
      down: 'DoorDown',
      front_gate_open: 'FrontGateOpen',
      rear_gate_open: 'RearGateOpen',
      food_waste_open: 'FoodWasteOpen',
      recycling_open: 'RecyclingOpen'
    };
    const payload = payloadMap[command];

    await new Promise<void>((resolve, reject) => {
      mqttClient.on('connect', () => {
        mqttClient.publish(mqttTopic, payload, (err) => {
          if (err) {
            console.error("MQTT publish error:", err);
            mqttClient.end();
            logAction(adminClient, user.id, user.email, whitelistEntry.resident_id, command, "failure", `發布 MQTT 指令失敗: ${err.message}`);
            reject(new Error("發布 MQTT 指令失敗"));
            return;
          }
          console.log(`Successfully published '${payload}' to topic '${mqttTopic}' for user ${user.email}`);
          mqttClient.end();
          resolve();
        });
      });

      mqttClient.on('error', (err) => {
        console.error("MQTT connection error:", err);
        mqttClient.end();
        logAction(adminClient, user.id, user.email, whitelistEntry.resident_id, command, "failure", `無法連接至 MQTT 伺服器: ${err.message}`);
        reject(new Error("無法連接至 MQTT 伺服器"));
      });
    });

    // 7. Return success response
    const successMsg = `指令 [${command.toUpperCase()}] 已成功發送！`;
    await logAction(adminClient, user.id, user.email, whitelistEntry.resident_id, command, "success", successMsg);
    return createJsonResponse({ message: successMsg }, 200);

  } catch (error) {
    console.error("Unhandled function error:", error);
    // 在最終的 catch 區塊也加入 log，捕捉所有未預期的錯誤
    // await logAction(adminClient, user?.id, user?.email, command || "unknown", "failure", error.message);
    return createJsonResponse({ error: error.message || "伺服器發生未知錯誤" }, 500);
  }
});
