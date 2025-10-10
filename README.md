# ESP32 社區鐵捲門 MQTT 遠端控制器

本專案利用 ESP32 開發板，透過 Wi-Fi 連接至 MQTT 伺服器，讓使用者能夠使用手機等裝置，遠端發送指令來控制社區的鐵捲門（上、下、停）。

![專案照片](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/IMG_7068.jpg)

## ✨ 功能特色

*   **遠端遙控**: 透過網際網路，在任何地方都能控制鐵捲門。
*   **跨平台支援**: 支援 iOS 與 Android 裝置（透過通用 MQTT 客戶端 App）。
*   **即時反應**: 基於 MQTT 協定，指令傳輸延遲低。
*   **低成本實現**: 使用常見且便宜的 ESP32 開發板與繼電器模組。

> [!WARNING]
> ### **重大安全警告**
> *   **謹慎使用**: 此系統透過網際網路控制鐵捲門，無須靠近即可操作。請務必謹慎使用，確保操作時鐵捲門周遭環境安全，避免造成意外。
> *   **資訊安全**: 目前系統使用公開的 MQTT 伺服器。為了社區安全，**請勿將此頁面或相關資訊外流**。任何知道伺服器位址和主題 (Topic) 的人都能控制鐵捲門。
> *   **未來更新**: 未來版本計畫加入白名單或使用者驗證機制，以大幅提升安全性。

## 🛠️ 硬體需求

*   ESP32 開發板 (例如：ESP32-DevKitC)
*   4路 (或以上) 繼電器模組 (Relay Module)
*   5V/12V 電源供應器 (根據繼電器模組規格)
*   杜邦線若干

## ⚙️ 軟體與環境

*   [Arduino IDE](https://www.arduino.cc/en/software) 或 [PlatformIO](https://platformio.org/)
*   ESP32 Board Support Package
*   Arduino 函式庫:
    *   `WiFi.h`
    *   `PubSubClient.h`
*   MQTT Broker (本專案使用公開伺服器 `mqttgo.io`)
*   手機端 MQTT Client App (例如：`MQTT-Client` for iOS, `MQTT Dashboard` for Android)

## 🏗️ 安裝與設定

### 1. 硬體接線

請參考下圖將 ESP32 與繼電器模組連接。繼電器模組的 `COM` 與 `NO` (常開) 接點需再連接至鐵捲門原有的手動開關按鈕上。

*   **ESP32 -> 繼電器模組**
    *   `GND` -> `GND`
    *   `5V` -> `VCC`
    *   `GPIO 18` -> `IN1` (控制：上)
    *   `GPIO 19` -> `IN2` (控制：停)
    *   `GPIO 21` -> `IN3` (控制：下)

*   **相關照片**
    * ![硬體接線圖1](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/IMG_7055.jpg)
    * ![硬體接線圖2](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/IMG_7067.jpg)
    * ![硬體接線圖3](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/p003.jpg)
    * ![硬體接線圖4](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/p002.png)
    * ![硬體接線圖5](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/p001.png)  

### 2. 燒錄程式

1.  使用 Git Clone 或直接下載本專案的程式碼。
2.  在 Arduino IDE 或 PlatformIO 中開啟專案。
3.  **修改設定**: 在程式碼中找到設定區塊，填入您的 Wi-Fi 帳號密碼。
    ```cpp
    // --- 請修改為您的 Wi-Fi 資訊 ---
    const char* ssid = "YOUR_WIFI_SSID";
    const char* password = "YOUR_WIFI_PASSWORD";
    // --------------------------------
    ```
4.  連接 ESP32 開發板至電腦。
5.  選擇正確的開發板型號與 COM Port。
6.  編譯並上傳程式碼至 ESP32。


# Iphone(IOS) 操作 SOP  
1.  至 App Store 下載 **MQTT-Client**。
![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/p1.png)  
2.  點選右下角 **Setting**，進入設定畫面。
3.  **伺服器設定**:
    *   Server IP: `mqttgo.io`
    *   啟用 `Clear session`
    *   關閉 `Lightcontrol` 
    ![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/p2.png)  
4.  **按鈕設定**:
    *   啟用 `Doorcontrol`
    *   點選 `-` 將 `2 Doors` 變成 `1 Door`
    *   Topic: `請洽管委會`
    *   上 Message: `DoorUp`
    *   停 Message: `DoorStop`
    *   下 Message: `DoorDown`
    *   QOS: `0`
    *   關閉 `Retain`  
    ![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/p3.png)  
5.  點選左下角 **Control**，即可進入主畫面開始使用。
    ![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/p4.png)  
  
### Android 操作 SOP
1.  至 Play Store 下載 **MQTT Dashboard**。
    ![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/downloadMqttDashboard.jpg)  
2.  在 **Broker** 頁面點擊 `+` 新增項目。
    ![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/addBroker.png) 
3.  **伺服器設定**:
    *   Client Id: (可自訂，例如您的名字)
    *   Server Name: `mqttgo.io`
    *   Port No: `1883`
    *   User Name: (保持空白)
    *   Password: (保持空白)
    ![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/serverInfo.png)  
4.  儲存後，App 會自動連線，成功後會顯示綠燈。  
    ![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/connentSuccess.jpg)  
5.  切換到 **Publish** 頁面，點擊 `+` 新增三個按鈕。
    ![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/addPublishItems.png)  
    ![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/selectButton.png)  
6.  **按鈕設定** (重複三次):
    *   **開門**:
        *   Type: `Button`
        *   Name: `開門`
        *   Topic: `請洽管委會`
        *   Payload: `DoorUp`
    *   **停止**:
        *   Type: `Button`
        *   Name: `停止`
        *   Topic: `請洽管委會`
        *   Payload: `DoorStop`
    *   **關門**:
        *   Type: `Button`
        *   Name: `關門`
        *   Topic: `請洽管委會`
        *   Payload: `DoorDown` 
    ![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/button1.jpg)  
    ![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/button2.jpg)  
    ![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/button3.jpg)  
7.  完成後即可在主畫面看到三個按鈕，點擊即可操控鐵捲門。
    ![image](https://github.com/Chihhao/esp32_door_mqtt/blob/main/image/addThreeButtons.jpg)  

## 🔮 未來計畫

*   [ ] **增加白名單**: 在 ESP32 端建立一份授權使用者清單 (Client ID)，只允許清單內的裝置發送指令。
*   [ ] **改用私有 MQTT Broker**: 建立需要帳號密碼驗證的私有 MQTT 伺服器，杜絕未經授權的存取。



