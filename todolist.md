### **專案執行 To-Do List**

#### **第一階段：建立與設定 Supabase 後端環境 (✅ 已完成)**

**目標**：完成所有後端基礎建設，包含使用者認證、資料庫建立與安全性設定。

*   **[x] 建立 Supabase 專案**：已在 Supabase 儀表板建立新專案。
*   **[x] 取得專案 URL 與 `anon` 金鑰**：已從 `Project Settings -> API` 中取得。
*   **[x] 設定 Google OAuth 登入**：已在 Google Cloud Console 建立憑證，並在 Supabase 中完成設定。
*   **[x] 使用 SQL 建立資料表**：已建立 `profiles` 與 `whitelist` 表格。
*   **[x] 使用 SQL 設定 RLS 安全性原則**：已為兩個表格啟用 RLS 並設定對應的存取規則。

---
📝 **最終資料表結構 (Final Table Schemas)**

**1. `profiles` 表格**
*   **用途**：儲存使用者的基本資料，並標記誰是管理者。
*   **結構**：  
| 欄位 (Column) | 類型 (Type) | 描述 (Description) | 約束/預設值 (Constraints/Defaults) |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | 使用者唯一識別碼 | `Primary Key`, `Foreign Key` to `auth.users.id` |
| `email` | `text` | 使用者 Email | - |
| `is_admin` | `boolean` | 是否為管理者 | `Default: false` |

**2. `whitelist` 表格**
*   **用途**：儲存被授權可以操作鐵捲門的使用者 Email 清單。
*   **結構**：
| 欄位 (Column) | 類型 (Type) | 描述 (Description) | 約束/預設值 (Constraints/Defaults) |
| :--- | :--- | :--- | :--- |
| `id` | `bigserial` | 自動遞增的流水號 | `Primary Key` |
| `email` | `text` | 被授權的 Email | `Not Null`, `Unique` |
| `created_at`| `timestamptz`| 建立時間 | `Default: now()` |
---

#### **第二階段：整合使用者前端網頁與 Supabase (下一步)**

**目標**：將您現有的 HTML/CSS/JS 草稿與 Supabase 連接，實現真正的使用者登入、登出及狀態檢查。

*   **[ ] 在 `index.html` 中引入 Supabase-js 函式庫**
    *   在 `</body>` 標籤之前，加入官方的 CDN script 標籤：
      ```html
      <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
      <script src="script.js"></script>
      ```

*   **[ ] 在 `script.js` 檔案頂部初始化 Supabase Client**
    *   將第一階段取得的 URL 和 `anon` key 填入，建立一個全域的 supabase 物件。
      ```javascript
      const SUPABASE_URL = '您的_SUPABASE_URL';
      const SUPABASE_ANON_KEY = '您的_SUPABASE_ANON_KEY';
      const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      ```

*   **[ ] 修改 `handleGoogleLogin()` 函式**
    *   移除模擬程式碼，改為呼叫 Supabase 的 OAuth 登入方法。
      ```javascript
      async function handleGoogleLogin() {
          const { error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
          });
          if (error) {
              console.error('Google 登入失敗:', error);
              updateSystemMessage('登入時發生錯誤，請稍後再試。', 'danger');
          }
      }
      ```

*   **[ ] 修改 `handleLogout()` 函式**
    *   移除模擬程式碼，改為呼叫 Supabase 的登出方法。
      ```javascript
      async function handleLogout() {
          setControlsDisabled(true); // 防止登出過程中誤觸
          const { error } = await supabase.auth.signOut();
          if (error) {
              console.error('登出失敗:', error);
              updateSystemMessage('登出時發生錯誤。', 'danger');
          } else {
              currentUser = null;
              updateUI();
          }
          setControlsDisabled(false);
      }
      ```

*   **[ ] 監聽認證狀態變化，取代 `initialize()`**
    *   這是最重要的一步，它會自動處理登入、登出、頁面重整後的所有狀態。用它來取代原本的 `initialize()` 函式。
      ```javascript
      // 監聽 Supabase Auth 的狀態變化
      supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
              onLoginSuccess(session.user);
          } else if (event === 'SIGNED_OUT') {
              currentUser = null;
              updateUI();
          }
      });

      // 頁面初次載入時，檢查當前的 session
      async function checkInitialSession() {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
              onLoginSuccess(session.user);
          } else {
              updateUI();
          }
      }

      // 程式進入點
      checkInitialSession();
      ```

#### **第三階段：建立後端函式並串接核心控制邏輯 (待辦)**

**目標**：建立一個安全的 Supabase Edge Function 來隱藏 MQTT 敏感資訊，並從前端觸發它。

*   **[ ] 安裝 Supabase CLI 並登入**：在本機電腦的終端機中，安裝並設定好命令列工具。
*   **[ ] 在專案資料夾中初始化 Supabase**：執行 `supabase init`。
*   **[ ] 建立名為 `control-door` 的 Edge Function**：執行 `supabase functions new control-door`。
*   **[ ] 在 Supabase 儀表板設定環境變數**：前往 `Project Settings -> Functions`，設定 `MQTT_BROKER_URL`, `MQTT_TOPIC` 等敏感資訊。
*   **[ ] 在函式中撰寫核心邏輯**：編輯函式檔案，加入驗證使用者、查詢白名單、發布 MQTT 訊息的程式碼。
*   **[ ] 部署 Edge Function 到雲端**：執行 `supabase functions deploy control-door`。
*   **[ ] 修改前端 `controlDoor()` 函式**：
    *   將 `setTimeout` 移除，改為使用 `supabase.functions.invoke()` 來呼叫後端函式。
      ```javascript
      async function controlDoor(command) {
          // ... (前段檢查邏輯不變)
          try {
              const { data, error } = await supabase.functions.invoke('control-door', {
                  body: { command: command }
              });
              if (error) throw error;
              updateSystemMessage(data.message, 'success');
          } catch (error) {
              console.error('指令發送失敗:', error);
              updateSystemMessage('指令發送失敗：' + error.message, 'danger');
          } finally {
              setControlsDisabled(false);
          }
      }
      ```

#### **第四階段：開發管理者維護網頁 (待辦)**

**目標**：建立一個獨立頁面，讓管理者可以安全地新增或刪除白名單中的 Email。

*   **[ ] (手動任務) 將自己的帳號設為管理員**
    *   前往 Supabase 儀表板的 `Table Editor` -> `profiles` 表格，手動將您自己帳號對應的 `is_admin` 欄位打勾設為 `true`。
*   **[ ] 建立 `admin.html` 與 `admin.js` 檔案**：複製現有檔案結構，並修改 UI 以符合管理需求（一個列表、一個輸入框、新增/刪除按鈕）。
*   **[ ] 實作管理員登入與權限檢查**：登入後，查詢 `profiles` 表格確認當前使用者的 `is_admin` 是否為 `true`，否則顯示權限不足。
*   **[ ] 實作讀取白名單功能 (Read)**：使用 `supabase.from('whitelist').select('*')` 獲取列表並顯示。
*   **[ ] 實作新增白名單功能 (Create)**：使用 `supabase.from('whitelist').insert({ email: '...' })`。
*   **[ ] 實作刪除白名單功能 (Delete)**：使用 `supabase.from('whitelist').delete().eq('id', ...)`。