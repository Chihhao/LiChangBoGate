#include <WiFi.h>
#include <PubSubClient.h>

#define PIN_RELAY_1 16
#define PIN_RELAY_2 17
#define PIN_RELAY_3 18
#define RELAY_ON HIGH
#define RELAY_OFF !RELAY_ON

const char* ssid     = "Lizabo";
const char* password = "xxxxxxxx";

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
      Serial.println("UP Relay On");
      digitalWrite(PIN_RELAY_1, RELAY_ON);
      Serial.println("Delay(1000)");
      delay(1000);
      Serial.println("UP Relay Off");
      digitalWrite(PIN_RELAY_1, RELAY_OFF);
    }
    else if(strMsg == String(MSG_STOP)) {
      Serial.println("STOP Relay On");
      digitalWrite(PIN_RELAY_2, RELAY_ON);
      Serial.println("Delay(1000)");
      delay(1000);
      Serial.println("STOP Relay Off");
      digitalWrite(PIN_RELAY_2, RELAY_OFF);
    }
    else if(strMsg == String(MSG_DOWN)) {
      Serial.println("DOWN Relay On");
      digitalWrite(PIN_RELAY_3, RELAY_ON);
      Serial.println("Delay(1000)");
      delay(1000);
      Serial.println("DOWN Relay Off");
      digitalWrite(PIN_RELAY_3, RELAY_OFF);
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
  
  pinMode(PIN_RELAY_1, OUTPUT);
  pinMode(PIN_RELAY_2, OUTPUT);
  pinMode(PIN_RELAY_3, OUTPUT);
  
  Serial.begin(9600);
  delay(50); 

  WiFi.begin(ssid,password);  
}
 
void loop() {
  checkWifi();
  checkMQTT();   
  client.loop();    
}
