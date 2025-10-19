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

[ ] **目標**: 實現基於 Web App + Supabase 的進階安全架構。
    - [ ] 建立 Supabase 專案，設定 Google Auth 與 Phone Auth。
    - [ ] 建立前端網頁 App，整合 Supabase Auth 處理使用者登入。
        - [ ] 實作 Google 登入按鈕。
        - [ ] 實作手機號碼 + 密碼登入介面及首次登入修改密碼流程。
    - [ ] 開發 Supabase Edge Function，用於驗證使用者並發布 MQTT 指令。
    - [ ] 建立使用者白名單資料表與功能更完整的管理介面（新增用戶、停用用戶）。

## 🚀 進階安全架構：Web App + Supabase (Auth + Edge Function)

徹底解決共享 Topic 的風險並實現每個用戶獨立驗證，可以採用「前端 + BaaS (後端即服務)」的現代化架構。

### 架構組成

1.  **前端 (Frontend)**: 一個託管在 GitHub Pages 上的簡單網頁 App。
    *   使用 Supabase 客戶端函式庫處理 Google 登入。
    *   使用者登入後，點擊按鈕會呼叫後端的安全函數，而**非直接發送 MQTT 指令**。

2.  **後端 (Backend)**: 使用 [Supabase](https://supabase.com/) 平台。
    *   **身份驗證 (Auth)**: 處理使用者登入（例如 Google 登入），取代共享密碼或 Topic。
    *   **邊緣函數 (Edge Function)**: 一個運行在 Supabase 安全環境中的伺服器端程式 (Serverless Function)。
        *   接收前端的請求，並驗證使用者的登入狀態。
        *   **安全地儲存 MQTT Broker 位址與 Topic**。
        *   驗證通過後，由函數本身代替使用者發布 MQTT 指令到 Broker。

3.  **物聯網端 (ESP32 & MQTT Broker)**:
    *   **完全維持不變**。ESP32 繼續監聽原有的 Topic，無需任何韌體更新。

4. 管理者頁面
    * 建立一個功能完善的管理介面，託管在 GitHub Pages 上。此頁面僅限被設定為「管理者」角色的用戶登入。功能包含：新增用戶（可選擇 Email 或手機號碼）、設定初始密碼、停用/啟用現有用戶。

≠

### 優點

*   **極高安全性**:
    *   MQTT Topic 等敏感資訊**永不暴露**在前端網頁中。
    *   每個使用者都透過自己的帳號 (如 Google) 進行驗證。
    *   管理員可以輕易地在 Supabase 後台新增或移除特定用戶的權限。
*   **無需修改韌體**: 對現有的 ESP32 硬體零改動。
*   **絕佳使用者體驗**:
    *   使用者只需在初次設定時登入一次。
    *   日常使用時，只需將網頁 App "新增到主畫面"，即可實現點擊圖示 -> 按下按鈕的無縫操作。
