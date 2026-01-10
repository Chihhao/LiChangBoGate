# 需求文件: 住戶註冊與審核流程 (REQ-01)

## 1. 專案背景與目標
目前系統採用「靜態白名單」機制，管理員需手動輸入 Email 與住戶編號才能開通權限。為了降低管理負擔並提升資料正確性，將導入「自助註冊 + 管理員審核」流程。

## 2. 核心流程變更

### 2.1 使用者端 (User Side)
1.  **登入**: 使用者透過 Google 或 **LINE** 登入。
    *   **Google**: 使用 Email 識別。
    *   **LINE**: 使用 LINE User ID 識別，並自動抓取**暱稱** (用於管理員辨識)。
2.  **狀態檢查**: 系統檢查 `whitelist` 資料表。
    *   **新使用者 (無資料)**: 顯示「住戶註冊表單」。
    *   **待審核 (Pending)**: 顯示「審核中」畫面，提示聯絡管理員。
    *   **已核准 (Approved)**: 進入原本的「遙控器操作畫面」。
    *   **已拒絕 (Rejected)**: 顯示「申請被拒絕」畫面。
3.  **註冊表單**:
    *   欄位：真實姓名 (必填)、棟別 (下拉選單)、樓層 (下拉選單)。
    *   送出後，透過後端 RPC 函式寫入資料庫 (含 LINE 資訊)，狀態預設為 `pending`。

### 2.2 管理員端 (Admin Side)
1.  **待審核清單**: 在後台首頁新增區塊，列出所有 `status = 'pending'` 的申請。
    *   顯示資訊：LINE 暱稱、真實姓名、申請棟別樓層。
2.  **審核操作**:
    *   **核准**: 將狀態改為 `approved`，並確認 `resident_id` (如 A3) 正確寫入。
    *   **拒絕/刪除**: 刪除該筆申請或標記為 `rejected`。

## 3. 資料庫變更 (Database Schema)

需修改 `whitelist` 資料表以支援新流程，並確保舊資料相容。

### 3.1 新增欄位
| 欄位名稱 | 類型 | 預設值 | 說明 |
| :--- | :--- | :--- | :--- |
| `name` | text | NULL | 住戶真實姓名 |
| `status` | text | 'pending' | 帳號狀態 (`pending`, `approved`, `rejected`) |
| `provider_id` | text | NULL | **LINE User ID** (LINE 登入必填) |
| `display_name`| text | NULL | **LINE 暱稱** |

### 3.2 資料遷移 (Migration Strategy)
*   既有的白名單資料，執行 SQL 將 `status` 統一更新為 `'approved'`，確保現有住戶不受影響。

### 3.3 安全性 (RLS & RPC)
*   **關閉公開寫入權限**: `whitelist` 表格不開放公開 `INSERT/UPDATE`。
*   **新增 RPC 函式 (`register_resident`)**:
    *   用途：供前端呼叫進行註冊。
    *   邏輯：接收 `name`, `building`, `floor`，自動抓取當前登入者的 Email 或 LINE ID/Metadata，並強制設定 `status = 'pending'`。

## 4. 前端介面調整

### 4.1 index.html (使用者)
*   新增 `registration-view` (註冊表單)。
*   新增 `pending-view` (審核中提示)。
*   修改 `script.js` 的 `onLoginSuccess` 邏輯，加入狀態判斷狀態機 (State Machine)。

### 4.2 admin.html (管理員)
*   新增「待審核名單」UI 區塊。
*   實作「核准」與「駁回」的 API 呼叫邏輯。

## 5. 執行步驟
1.  建立 Supabase Migration SQL (Schema 修改 + RPC)。
2.  修改 `index.html` 與 `script.js` (實作註冊流程)。
3.  修改 `admin.html` 與 `admin.js` (實作審核流程)。