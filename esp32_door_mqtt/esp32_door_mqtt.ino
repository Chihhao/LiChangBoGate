#include <WiFi.h>
#include <PubSubClient.h>
#include <ESPmDNS.h>
#include <WiFiUdp.h>
#include <ArduinoOTA.h>

#define PIN_RELAY_1 16
#define PIN_RELAY_2 17
#define PIN_RELAY_3 18
#define RELAY_ON HIGH
#define RELAY_OFF !RELAY_ON
#define PIN_TRIG  33  //發出聲波腳位
#define PIN_ECHO  32  //接收聲波腳位

const char* ssid     = "Lizabo";
const char* password = "*****";

const char* mqttServer = "mqttgo.io";
const int mqttPort = 1883;
const char* TOPIC = "LiChangBoBuilding";
const char* MSG_UP = "DoorUp";
const char* MSG_STOP = "DoorStop";
const char* MSG_DOWN = "DoorDown";

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long previousMillis = 0;
unsigned long interval = 30000;

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

  if(strTopic == String(TOPIC)){
    if(strMsg == String(MSG_UP)) {
      DoorUp();
    }
    else if(strMsg == String(MSG_STOP)) {
      DoorStop();
    }
    else if(strMsg == String(MSG_DOWN)) {
      DoorDown();
    }  
  }
}

void checkWifi(){
  if(WiFi.status()== WL_CONNECTED){ return; }

  unsigned long currentMillis = millis();  
  if ((WiFi.status() != WL_CONNECTED) && (currentMillis - previousMillis >=interval)) {
    Serial.print(millis());
    Serial.println("Reconnecting to WiFi...");
    WiFi.disconnect();
    WiFi.reconnect();
    previousMillis = currentMillis;
    if(WiFi.status()== WL_CONNECTED){
        Serial.println("WiFi Connected");
    }
  }
}

void checkMQTT(){
  if(client.connected()){
    client.loop();
    return;
  }
  digitalWrite(LED_BUILTIN, LOW);
  client.disconnect();
  delay(10);  
  
  client.setServer(mqttServer,mqttPort);    
  client.setCallback(callback);
  
  while (!client.connected()){    
    Serial.println("Connecting to MQTT..");
    if (client.connect("ESP32_LiChangBoBuilding")) {    
      Serial.println("MQTT Connected");
      digitalWrite(LED_BUILTIN, HIGH);
    }else {
      Serial.print("MQTT Connect fail: state: ");
      Serial.println(client.state());
      digitalWrite(LED_BUILTIN, LOW);
      delay(2000);
    }    
  }
  client.subscribe(TOPIC);
  
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

  OTA_Begin();

  xTaskCreatePinnedToCore(Task_Sr04,"TaskSr04",2048,NULL,0,NULL,0); 

}

void OTA_Begin(){
    // Hostname defaults to esp3232-[MAC]
    ArduinoOTA.setHostname("esp32_Lizabo");
  
    // No authentication by default
    ArduinoOTA.setPassword("1201");
    
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

void loop() {
  ArduinoOTA.handle();
  checkWifi();
  checkMQTT();   
  client.loop();  
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

void Task_Sr04(void* parameter){  
  unsigned long _startMillis = millis(); 
  int _keepTime = 2000;

  while(true){
    unsigned long d = GetDistance();         
    if(d >= 10 && d <= 120){        
        if(millis() - _startMillis >= _keepTime){    
            DoorUp();    
            delay(4000);  
            _startMillis = millis(); 
        }     
    }
    else{
        _startMillis = millis(); 
    }
    
    delay(800);
  }    
}
