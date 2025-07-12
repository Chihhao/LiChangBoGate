* 可以用手機遙控社區鐵捲門。  
* 這是使用網路原理，不用靠近鐵捲門也能控制，請謹慎使用
* 為了社區安全，請盡量不要外流本網頁，密碼將定期更新

# Iphone(IOS) 操作 SOP  
* 下載 MQTT-Client  
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/p1.png)  
* 點選右下角 Setting，進入設定畫面  
(1) 設定 Server IP: mqttgo.io  
(2) 啟用 Clear session  
(3) 關閉 Lightcontrol  
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/p2.png)  
(4) 啟用 Doorcontrol  
(5) 點選 "-" 將 2 Doors 變成 1 Door  
(6) 設定 Topic: LiChangBoBuilding  
(7) 設定 上 Message: DoorUp  
(8) 設定 停 Message: DoorStop  
(9) 設定 下 Message: DoorDown  
(10) 設定 QOS 0  
(11) 關閉 Retain    
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/p3.png)  
* 點選左下角 Control，進入使用畫面，即可使用  
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/p4.png)  
  
# Android 操作 SOP   
* 下載 MQTT Dashboard  
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/downloadMqttDashboard.jpg)  
* 在 Broker 頁面新增項目  
(1) Client Id: 隨便  
(2) Server Name: mqttgo.io  
(3) Port No: 1883  
(4) User Name: 保持空白  
(5) Password: 保持空白  
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/addBroker.png)  
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/serverInfo.png)  
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/connentSuccess.jpg)  
* 如上圖，連線成功後，在 Publish 頁面，新增三個按鈕  
(1) 開門 / LiChangBoBuilding / DoorUp  
(2) 停止 / LiChangBoBuilding / DoorStop  
(3) 關門 / LiChangBoBuilding / DoorDown  
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/addPublishItems.png)  
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/selectButton.png)  
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/button1.jpg)  
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/button2.jpg)  
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/button3.jpg)  
* 完成後如下圖，按下按鈕即可操控鐵捲門  
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/addThreeButtons.jpg)  

# 相關照片  
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/p003.jpg)  
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/p002.png)  
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/IMG_7055.jpg)  
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/IMG_7067.jpg)  
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/IMG_7068.jpg)  
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/p001.png)  


