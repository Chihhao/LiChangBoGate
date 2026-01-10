# 需求文件: 啟用大門與回收區控制 (REQ-02)

## 1. 專案背景與目標
目前系統僅啟用「車道鐵捲門」控制。本需求旨在啟用介面上已預留的「前棟大門」、「後棟大門」、「廚餘鐵門」與「回收鐵門」功能。

為了簡化維護與部署，將採用 **「單一韌體 (All-in-One Firmware)」** 策略。所有區域的 ESP32 使用完全相同的程式碼，透過 **不同的硬體接線 (GPIO)** 來決定實際觸發的功能。

## 2. 硬體架構規劃

### 2.1 單一韌體策略
*   所有 ESP32 訂閱相同的 MQTT Topic。
*   所有 ESP32 接收相同的 MQTT 指令。
*   **區隔方式**：依據實體繼電器連接的 GPIO 腳位不同，決定該板子對哪個指令有反應。

### 2.2 GPIO 腳位分配表 (Pin Mapping)

| 功能區域 | 動作指令 | 建議 GPIO | 備註 |
| :--- | :--- | :--- | :--- |
| **車庫鐵捲門** | 上 (Up) | **16** | 現有功能 |
| | 停 (Stop) | **17** | 現有功能 |
| | 下 (Down) | **18** | 現有功能 |
| **前/後棟大門** | 前棟開門 (FrontGateOpen) | **19** | 新增 |
| | 後棟開門 (RearGateOpen) | **21** | 新增 |
| **廚餘/回收** | 廚餘開門 (FoodWasteOpen) | **22** | 新增 |
| | 回收開門 (RecyclingOpen) | **23** | 新增 |
| **感測器** | Echo | **32** | 現有 (僅車庫板需接) |
| | Trig | **33** | 現有 (僅車庫板需接) |

> **注意**：施工時需嚴格遵守此表，例如前棟大門的繼電器必須接在 GPIO 19，不可接在 GPIO 16。

## 3. 韌體功能變更 (Firmware)

### 3.1 指令處理擴充
修改 `processCommand` 函式，新增以下指令的解析與對應 GPIO 觸發：
*   `FrontGateOpen` -> 觸發 GPIO 19
*   `RearGateOpen` -> 觸發 GPIO 21
*   `FoodWasteOpen` -> 觸發 GPIO 22
*   `RecyclingOpen` -> 觸發 GPIO 23

### 3.2 超音波感測器自動偵測 (Auto-Detect)
為了避免未連接感測器的板子（如大門、回收區）浪費資源執行偵測任務，需在 `setup()` 加入開機自我檢測：
1.  **檢測邏輯**：開機時嘗試發送 Trig 並讀取 Echo。
2.  **判斷**：
    *   若讀取到有效訊號（或 Echo 電位有拉高）：判定為**有連接** -> 啟動 `Task_Sr04`。
    *   若完全無訊號（Timeout 且電位為 Low）：判定為**無連接** -> **不啟動** `Task_Sr04`。

## 4. 前端介面變更 (Frontend)

### 4.1 index.html
*   移除以下按鈕的 `disabled` 屬性：
    *   `front-gate-button` (前棟大門)
    *   `rear-gate-button` (後棟大門)
    *   `food-waste-gate-button` (廚餘鐵門)
    *   `recycling-gate-button` (回收鐵門)

### 4.2 script.js
*   為上述按鈕新增 `click` 事件監聽器。
*   發送對應的新指令字串：
    *   `front_gate_open`
    *   `rear_gate_open`
    *   `food_waste_open`
    *   `recycling_open`
*   (註：後端 Edge Function 需確認能透傳這些指令，或需對應修改)

## 5. 執行步驟
1.  修改 `index.html` 啟用按鈕。
2.  修改 `script.js` 加入事件監聽與指令發送。
3.  修改 `esp32_door_mqtt.ino` 實作新腳位定義、指令處理與感測器自動偵測邏輯。