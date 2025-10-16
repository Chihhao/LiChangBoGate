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

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. 建立一個模擬使用者的 client，專門用來驗證 JWT 並取得使用者資訊
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // 2. Get user from Authorization header
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("User auth error:", userError?.message);
      return createJsonResponse({ error: "無效的認證或未登入" }, 401);
    }

    // 建立一個擁有 service_role 權限的 client (可繞過 RLS)，專門用來執行後端管理任務
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 3. Check if user's email is in the whitelist
    const { data: whitelistEntry, error: whitelistError } = await adminClient
      .from("whitelist")
      .select("email")
      .eq("email", user.email)
      .single();

    if (whitelistError || !whitelistEntry) {
      console.error(`Whitelist check failed for ${user.email}:`, whitelistError?.message);
      return createJsonResponse({ error: "權限不足，您的帳號未在白名單中" }, 403);
    }

    // 4. Get and validate the command from the request body
    const { command } = await req.json();
    const allowedCommands = ['up', 'stop', 'down'];
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
      down: 'DoorDown'
    };
    const payload = payloadMap[command];

    await new Promise<void>((resolve, reject) => {
      mqttClient.on('connect', () => {
        mqttClient.publish(mqttTopic, payload, (err) => {
          if (err) {
            console.error("MQTT publish error:", err);
            mqttClient.end();
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
        reject(new Error("無法連接至 MQTT 伺服器"));
      });
    });

    // 7. Return success response
    return createJsonResponse({ message: `指令 [${command.toUpperCase()}] 已成功發送！` }, 200);

  } catch (error) {
    console.error("Unhandled function error:", error);
    return createJsonResponse({ error: error.message || "伺服器發生未知錯誤" }, 500);
  }
});
