#include <WiFi.h>
#include <PubSubClient.h>
#include "credentials.h" // 引用包含密碼、Topic 等機密資訊的檔案
#include <ESPmDNS.h>
#include <WiFiUdp.h>
#include <ArduinoOTA.h>
#include <time.h>

#define PIN_RELAY_1 16
#define PIN_RELAY_2 17
#define PIN_RELAY_3 18
#define RELAY_ON HIGH
#define RELAY_OFF !RELAY_ON
#define PIN_TRIG  33  //發出聲波腳位
#define PIN_ECHO  32  //接收聲波腳位

// --- 系統行為常數定義 ---
const unsigned long WIFI_RECONNECT_INTERVAL = 30000; // Wi-Fi 斷線後重連間隔 (ms)
const unsigned long MQTT_RECONNECT_INTERVAL = 5000;  // MQTT 斷線後重連間隔 (ms)
const unsigned long DAILY_REBOOT_INTERVAL_MS = 24 * 3600 * 1000UL; // 每日重啟間隔 (24小時)

// --- 超音波感測器常數定義 ---
const unsigned long SENSOR_TRIG_DISTANCE_MIN = 10;   // 觸發感測的最小距離 (cm)
const unsigned long SENSOR_TRIG_DISTANCE_MAX = 150;  // 觸發感測的最大距離 (cm)
const unsigned long SENSOR_PULSEIN_TIMEOUT = 50000;  // pulseIn 超時 (us)，避免感測器異常時卡住
const unsigned long SENSOR_SENSE_INTERVAL_MS = 250;      // 每 250ms 偵測一次
const unsigned long SENSOR_TRIGGER_DURATION_MS = 1000;   // 需要持續偵測到 1 秒才觸發
const unsigned long SENSOR_COOLDOWN_DURATION_MS = 15000; // 觸發後冷卻 15 秒

const unsigned long INVALID_DISTANCE = 999;

// NTP 伺服器與時區設定 (台灣為 GMT+8)
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 8 * 3600;
const int   daylightOffset_sec = 0;

// MQTT 訊息內容 (非機密)
const char* MSG_UP = "DoorUp";
const char* MSG_STOP = "DoorStop";
const char* MSG_DOWN = "DoorDown";

WiFiClient espClient;
PubSubClient client(espClient);

// 用於非阻塞式重連的計時器
unsigned long wifiReconnectPrevMillis = 0;
unsigned long mqttReconnectPrevMillis = 0;

void callback(char* topic, byte* payload, unsigned int length) {  
  String strMsg;
  strMsg.reserve(length); // 預先分配記憶體
  for (int i = 0; i < length; i++) { strMsg += (char)payload[i]; }
  String strTopic = String(topic);
  
  Serial.print("receive: "); Serial.print(strTopic); 
  Serial.print(" | "); Serial.println(strMsg); 

  // 處理新 Topic 的指令
  if (strTopic == TOPIC) { 
    processCommand(strMsg);
    return;
  }

  // 處理舊 Topic 的指令，並加上日期檢查
  if (strTopic == TOPIC_OLD) { 
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
      Serial.println("無法取得時間，舊 Topic 指令被拒絕。");
      return;
    }

    int currentYearMonth = (timeinfo.tm_year * 100) + (timeinfo.tm_mon + 1);
    bool isExpired = currentYearMonth >= 202511; // 檢查是否為 2025 年 11 月或之後
    if (isExpired) {
      Serial.println("舊 Topic 已於 2025/11/01 起失效，指令被忽略。");
      return;
    }

    processCommand(strMsg);
  }
}

void processCommand(String msg) {
  if (msg == MSG_UP) {
    triggerRelay(PIN_RELAY_1, "UP");
  } else if (msg == MSG_STOP) {
    triggerRelay(PIN_RELAY_2, "STOP");
  } else if (msg == MSG_DOWN) {
    triggerRelay(PIN_RELAY_3, "DOWN");
  }
  else Serial.println("Unknown command received.");
}

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  pinMode(PIN_TRIG, OUTPUT); 
  pinMode(PIN_ECHO, INPUT); 
  
  pinMode(PIN_RELAY_1, OUTPUT);
  pinMode(PIN_RELAY_2, OUTPUT);
  pinMode(PIN_RELAY_3, OUTPUT);
  
  Serial.begin(9600);
  delay(50); 
  Serial.println("Booting");
  
  WiFi.begin(ssid,password);  

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  OTA_Begin();

  xTaskCreatePinnedToCore(Task_Sr04,"TaskSr04",2048,NULL,0,NULL,0); 

}

void OTA_Begin(){
    ArduinoOTA.setHostname(ota_hostname);
  
    ArduinoOTA.setPassword(ota_password);
    
    ArduinoOTA
      .onStart([]() {
        String type;
        if (ArduinoOTA.getCommand() == U_FLASH)
          type = "sketch";
        else // U_SPIFFS
          type = "filesystem";
  
        // NOTE: if updating SPIFFS this would be the place to unmount SPIFFS using SPIFFS.end()
        Serial.println("Start updating " + type);
      })
      .onEnd([]() {
        Serial.println("\nEnd");
      })
      .onProgress([](unsigned int progress, unsigned int total) {
        Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
      })
      .onError([](ota_error_t error) {
        Serial.printf("Error[%u]: ", error);
        if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
        else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
        else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
        else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
        else if (error == OTA_END_ERROR) Serial.println("End Failed");
      });
  
    ArduinoOTA.begin();
}

/**
 * @brief 維護 Wi-Fi 與 MQTT 的連線狀態 (非阻塞式)
 * 
 * 這個函式會被放在 loop() 中持續呼叫。
 * 1. 檢查 Wi-Fi 連線，若斷線則每 30 秒嘗試重連一次。
 * 2. 在 Wi-Fi 連線正常的前提下，檢查 MQTT 連線。
 * 3. 若 MQTT 斷線，則每 5 秒嘗試重連一次。
 * 4. 若 MQTT 連線正常，則執行 client.loop() 來處理傳入的訊息。
 */
void maintainConnections() {
  unsigned long currentMillis = millis();

  // --- 1. 維護 Wi-Fi 連線 ---
  if (WiFi.status() != WL_CONNECTED) {
    // 如果 Wi-Fi 斷線，MQTT 必定也無法連線，所以先處理 Wi-Fi
    digitalWrite(LED_BUILTIN, LOW); // 熄滅 LED 燈號表示斷線
    
    // 每 30 秒嘗試重連一次
    if (currentMillis - wifiReconnectPrevMillis >= WIFI_RECONNECT_INTERVAL) {
      Serial.println("Reconnecting to WiFi...");
      WiFi.disconnect();
      WiFi.reconnect();
      wifiReconnectPrevMillis = currentMillis;
    }
    return; // Wi-Fi 沒連上，直接返回，不做後續 MQTT 檢查
  }

  // --- 2. 維護 MQTT 連線 ---
  if (!client.connected()) {
    digitalWrite(LED_BUILTIN, LOW); // 熄滅 LED 燈號表示斷線

    // 每 5 秒嘗試重連一次
    if (currentMillis - mqttReconnectPrevMillis >= MQTT_RECONNECT_INTERVAL) {
      Serial.println("Attempting MQTT connection...");
      client.setServer(mqttServer, mqttPort);
      client.setCallback(callback);

      String clientId = "esp32-door-";
      clientId += String(WiFi.macAddress());

      if (client.connect(clientId.c_str())) {
        Serial.println("MQTT Connected!");
        digitalWrite(LED_BUILTIN, HIGH); // 點亮 LED

        // 連線成功後，重新訂閱主題
        client.subscribe(TOPIC);
        client.subscribe(TOPIC_OLD);
        Serial.print("Subscribed to: "); Serial.println(TOPIC);
        Serial.print("Subscribed to old: "); Serial.println(TOPIC_OLD);

        // 發送上線狀態訊息 (只在連線成功當下發送一次)
        String statusTopic = String(TOPIC) + "/status";
        String onlineMessage = "{\"status\":\"online\", \"ip\":\"" + WiFi.localIP().toString() + "\"}";
        client.publish(statusTopic.c_str(), onlineMessage.c_str());
        Serial.printf("Published online status to: %s\n", statusTopic.c_str());
      } else {
        Serial.print("MQTT connect failed, rc="); Serial.println(client.state());
      }
      mqttReconnectPrevMillis = currentMillis;
    }
    return; // 本次 MQTT 連線嘗試結束，無論成功失敗都返回
  }

  // --- 3. 處理 MQTT 訊息 ---
  // 如果 Wi-Fi 和 MQTT 都已連線，則正常處理 MQTT 訊息
  client.loop();
}

void loop() {
  ArduinoOTA.handle();
  maintainConnections();

  // 每日定時重啟，作為長期穩定運行的保險機制
  if (millis() >= DAILY_REBOOT_INTERVAL_MS) {
    Serial.println("Performing scheduled daily reboot...");
    delay(100); // 等待序列埠訊息發送
    ESP.restart();
  }
}

unsigned long GetDistance() { 
  digitalWrite(PIN_TRIG, LOW);  //關閉超音波
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); //啟動超音波
  delayMicroseconds(10);        //sustain at least 10us HIGH pulse
  digitalWrite(PIN_TRIG, LOW);  //關閉超音波
  
  // 增加 50000 微秒 (50毫秒) 的超時，對應約 8.6 公尺的距離
  unsigned long duration = pulseIn(PIN_ECHO, HIGH, SENSOR_PULSEIN_TIMEOUT);
  if (duration == 0) {
    // Serial.println("Ultrasonic sensor timeout!");
    return INVALID_DISTANCE; // 回傳一個無效值表示超時或無回波
  }

  unsigned long d = duration / 58; // 使用整數除法，避免不必要的浮點數運算
  return d;
}

void triggerRelay(int pin, const char* action) {
    Serial.printf("%s Relay On\n", action);
    digitalWrite(pin, RELAY_ON);
    delay(1000); // 模擬按鈕按下的時間
    digitalWrite(pin, RELAY_OFF);
    Serial.printf("%s Relay Off\n", action);
}

void triggerRelayTask(int pin, const char* action) {
    Serial.printf("%s Relay On\n", action);
    digitalWrite(pin, RELAY_ON);
    vTaskDelay(pdMS_TO_TICKS(1000)); // 使用 vTaskDelay 避免阻塞 Task
    digitalWrite(pin, RELAY_OFF);
    Serial.printf("%s Relay Off\n", action);
}

/**
 * @brief 超音波感測任務 (優化版本)
 * 
 * 1. 持續偵測: 當物體進入感測範圍並持續停留指定時間後，觸發開門。
 * 2. 防止誤觸: 如果物體在指定時間內離開，則重置計時。
 * 3. 冷卻機制: 觸發開門後，會進入冷卻期，防止重複觸發。
 * 4. 高效延遲: 使用動態計算的 vTaskDelay，在無事可做時讓 CPU 充分休息。
 */
void Task_Sr04(void* parameter) {
  // --- 狀態變數 ---
  unsigned long detectionStartTime = 0;
  unsigned long cooldownEndTime = 0;
  bool isDetecting = false;

  while (true) {
    unsigned long currentTime = millis();    
    unsigned long delayTimeMs = SENSOR_SENSE_INTERVAL_MS; // 預設的偵測間隔

    // 只有在非冷卻期才執行感測邏輯
    if (currentTime >= cooldownEndTime) {
      unsigned long d = GetDistance();

      if (d != INVALID_DISTANCE && d >= SENSOR_TRIG_DISTANCE_MIN && d <= SENSOR_TRIG_DISTANCE_MAX) {
        // 物體在範圍內
        if (!isDetecting) {
          // 首次偵測到，開始計時
          isDetecting = true;
          detectionStartTime = currentTime;
        } else if (currentTime - detectionStartTime >= SENSOR_TRIGGER_DURATION_MS) {
          // 持續偵測時間達標，觸發開門
          triggerRelayTask(PIN_RELAY_1, "UP (Sensor)");
          cooldownEndTime = currentTime + SENSOR_COOLDOWN_DURATION_MS; // 進入冷卻期
          // 觸發後，直接將本次延遲時間設為完整的冷卻時間
          delayTimeMs = SENSOR_COOLDOWN_DURATION_MS;
          isDetecting = false; // 重置偵測狀態
        }
      } else {
        // 物體已離開範圍，重置偵測狀態
        isDetecting = false;
      }
    } else {
      // 當前仍在冷卻期，計算剩餘的冷卻時間作為本次的延遲時間
      delayTimeMs = cooldownEndTime - currentTime;
    }

    // 根據計算出的時間進行延遲，讓出 CPU
    vTaskDelay(pdMS_TO_TICKS(delayTimeMs));
  }
}
