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

void callback(char*topic, byte* payload, unsigned int length) {  
  String strTopic = String((char*)topic);
  strTopic.trim();

  char _payload[30];
  int i=0;
  while(i<length){
    _payload[i] = (char)payload[i];
    i++;
  }  
  _payload[i] = '\0';
    
  String strMsg = String(_payload);
  strMsg.trim();
  
  Serial.print(String("receive: ") + strTopic); 
  Serial.println(String(" | ") + strMsg); 

  // 處理新 Topic 的指令
  if (strTopic == String(TOPIC)) {
    processCommand(strMsg);
    return;
  }

  // 處理舊 Topic 的指令，並加上日期檢查
  if (strTopic == String(TOPIC_OLD)) {
    struct tm timeinfo;
    if (!getLocalTime(&timeinfo)) {
      Serial.println("無法取得時間，舊 Topic 指令被拒絕。");
      return;
    }

    // 檢查日期是否在 2025/10/31 之後
    // tm_year 是從 1900 年起算, 所以 2025 年是 125
    // tm_mon 是 0-11, 所以 10 月是 9
    bool isExpired = false;
    if (timeinfo.tm_year > 125) { // > 2025 年
      isExpired = true;
    } else if (timeinfo.tm_year == 125 && timeinfo.tm_mon > 9) { // 2025 年且 > 10 月
      isExpired = true;
    }

    if (isExpired) {
      Serial.println("舊 Topic 已於 2025/10/31 後失效，指令被忽略。");
      return;
    }

    processCommand(strMsg);
  }
}

void processCommand(String msg) {
  if (msg == String(MSG_UP))       DoorUp();
  else if (msg == String(MSG_STOP)) DoorStop();
  else if (msg == String(MSG_DOWN)) DoorDown();
  else Serial.println("Unknown command received.");
}

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  pinMode(PIN_TRIG, OUTPUT); 
  pinMode(PIN_ECHO, INPUT_PULLUP); 
  
  pinMode(PIN_RELAY_1, OUTPUT);
  pinMode(PIN_RELAY_2, OUTPUT);
  pinMode(PIN_RELAY_3, OUTPUT);
  
  Serial.begin(9600);
  delay(50); 
  Serial.println("Booting");
  
  WiFi.begin(ssid,password);  

  // 初始化NTP時間
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  OTA_Begin();

  xTaskCreatePinnedToCore(Task_Sr04,"TaskSr04",2048,NULL,0,NULL,0); 

}

void OTA_Begin(){
    // 從 credentials.h 讀取主機名稱
    ArduinoOTA.setHostname(ota_hostname);
  
    // 從 credentials.h 讀取密碼
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
    if (currentMillis - wifiReconnectPrevMillis >= 30000) {
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
    if (currentMillis - mqttReconnectPrevMillis >= 5000) {
      Serial.println("Attempting MQTT connection...");
      client.setServer(mqttServer, mqttPort);
      client.setCallback(callback);
      
      if (client.connect("ESP32_LiChangBoBuilding")) {
        Serial.println("MQTT Connected!");
        digitalWrite(LED_BUILTIN, HIGH); // 點亮 LED
        // 連線成功後，重新訂閱主題
        client.subscribe(TOPIC);
        client.subscribe(TOPIC_OLD);
        Serial.print("Subscribed to: "); Serial.println(TOPIC);
        Serial.print("Subscribed to old: "); Serial.println(TOPIC_OLD);
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
}

unsigned long GetDistance() { 
  digitalWrite(PIN_TRIG, LOW);  //關閉超音波
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); //啟動超音波
  delayMicroseconds(10);        //sustain at least 10us HIGH pulse
  digitalWrite(PIN_TRIG, LOW);  //關閉超音波

  unsigned long d = pulseIn(PIN_ECHO, HIGH) / 58.0; //計算傳回時間/58 = 距離
  Serial.print(d);  
  Serial.println("cm");
  return d;
}

void DoorUp(){
    Serial.println("UP Relay On");
    digitalWrite(PIN_RELAY_1, RELAY_ON);
    Serial.println("Delay(1000)");
    delay(1000);
    Serial.println("UP Relay Off");
    digitalWrite(PIN_RELAY_1, RELAY_OFF);  
}

void DoorStop(){
    Serial.println("STOP Relay On");
    digitalWrite(PIN_RELAY_2, RELAY_ON);
    Serial.println("Delay(1000)");
    delay(1000);
    Serial.println("STOP Relay Off");
    digitalWrite(PIN_RELAY_2, RELAY_OFF);
}

void DoorDown(){
    Serial.println("DOWN Relay On");
    digitalWrite(PIN_RELAY_3, RELAY_ON);
    Serial.println("Delay(1000)");
    delay(1000);
    Serial.println("DOWN Relay Off");
    digitalWrite(PIN_RELAY_3, RELAY_OFF);
}

/**
 * @brief 超音波感測任務 (優化版本)
 * 
 * 1. 持續偵測: 當物體進入感測範圍 (10-150cm) 並持續停留 2 秒後，觸發開門。
 * 2. 防止誤觸: 如果物體在 1 秒內離開，則重置計時。
 * 3. 冷卻機制: 觸發開門後，會進入 15 秒的冷卻期，防止重複觸發。
 * 4. 非阻塞: 完全使用 millis() 實現，不影響其他任務。
 */
void Task_Sr04(void* parameter) {
  // --- 設定值 ---
  const unsigned long SENSE_INTERVAL_MS = 250;      // 每 250ms 偵測一次
  const unsigned long TRIGGER_DURATION_MS = 1000;   // 需要持續偵測到 1 秒才觸發
  const unsigned long COOLDOWN_DURATION_MS = 15000; // 觸發後冷卻 15 秒

  // --- 狀態變數 ---
  unsigned long lastSenseTime = 0;
  unsigned long detectionStartTime = 0;
  unsigned long cooldownEndTime = 0;
  bool isDetecting = false;

  while (true) {
    unsigned long currentTime = millis();

    // 檢查是否在冷卻期
    if (currentTime < cooldownEndTime) {
      vTaskDelay(pdMS_TO_TICKS(1000)); // 在冷卻期中，每秒檢查一次即可
      continue;
    }

    // 每隔 SENSE_INTERVAL_MS 進行一次偵測
    if (currentTime - lastSenseTime >= SENSE_INTERVAL_MS) {
      lastSenseTime = currentTime;
      unsigned long d = GetDistance();

      if (d >= 10 && d <= 150) { // 物體在範圍內
        if (!isDetecting) { // 如果是首次偵測到
          isDetecting = true;
          detectionStartTime = currentTime; // 開始計時
        } else if (currentTime - detectionStartTime >= TRIGGER_DURATION_MS) { // 如果已持續偵測超過設定時間
          DoorUp();
          cooldownEndTime = currentTime + COOLDOWN_DURATION_MS; // 進入冷卻期
          isDetecting = false; // 重置偵測狀態
        }
      } else { // 物體不在範圍內
        isDetecting = false; // 重置偵測狀態
      }
    }

    vTaskDelay(pdMS_TO_TICKS(50)); // 短暫釋放CPU資源給其他任務
  }
}
