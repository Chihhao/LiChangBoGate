# 專案版本資訊 (Project Version Information)

此文件記錄了本專案在開發與測試時所使用的核心環境與函式庫版本，以利於重現建置環境或進行問題排查。

## 韌體 (Firmware - ESP32)

### 核心環境 (Core Environment)

從 Arduino IDE 的編譯日誌中提取的核心工具鏈版本。

| 元件                  | 版本                         | 說明                                                 |
| :-------------------- | :--------------------------- | :--------------------------------------------------- |
| **ESP32 Board Package** | `2.0.11`                     | 在 Arduino IDE 中使用的 ESP32 開發板支援套件。       |
| **ESP-IDF**             | `v4.4.5`                     | Arduino 核心所依賴的底層開發框架版本。               |
| **esptool.py**          | `v4.5.1`                     | 用於將編譯好的程式碼燒錄到 ESP32 晶片的工具。        |
| **xtensa-esp32-elf-gcc**| `esp-2021r2-patch5-8.4.0`    | ESP32 的 C/C++ 交叉編譯器工具鏈。                    |

### Arduino 函式庫 (Arduino Libraries)

專案 `esp32_door_mqtt.ino` 中使用的函式庫。

| 函式庫名稱     | 版本    | 說明                                       |
| :------------- | :------ | :----------------------------------------- |
| **WiFi**       | `2.0.0` | ESP32 內建的 Wi-Fi 連線功能函式庫。        |
| **PubSubClient** | `2.8`   | 用於實現 MQTT 通訊的客戶端函式庫。         |
| **ESPmDNS**    | `2.0.0` | ESP32 內建的 mDNS 服務函式庫，常用於 OTA。 |
| **ArduinoOTA** | `2.0.0` | 實現無線韌體更新 (Over-the-Air) 的函式庫。 |
| **Update**     | `2.0.0` | 提供韌體更新相關功能的底層函式庫。         |

---

## 前端 (Frontend - Web App)

使用者介面 (`index.html`, `admin.html`) 所使用的主要 JavaScript 函式庫。

| 函式庫名稱          | 版本 | 說明                               |
| :------------------ | :--- | :--------------------------------- |
| **@supabase/supabase-js** | `@2` | 用於與 Supabase 後端進行互動的客戶端。 |

---

## 後端 (Backend - Supabase Edge Function)

`control-door` 函式所依賴的 Deno 模組。

| 模組名稱                  | 版本                            | 說明                               |
| :------------------------ | :------------------------------ | :--------------------------------- |
| **@supabase/functions-js**| (edge-runtime)                  | Supabase Edge Function 的執行環境定義。 |
| **@supabase/supabase-js** | `npm:@supabase/supabase-js@2`   | 用於在後端驗證使用者及操作資料庫。 |
| **mqtt**                  | `npm:mqtt`                      | 用於在後端發布 MQTT 指令的函式庫。   |
