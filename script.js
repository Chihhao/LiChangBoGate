// --- Supabase 初始化 ---
const { createClient } = supabase;
const SUPABASE_URL = 'https://ooumvivnvhbcdpphirrq.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vdW12aXZudmhiY2RwcGhpcnJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTIwNjEsImV4cCI6MjA3NjE2ODA2MX0.eRst8MK1CdcS_bemecDBJrJxVFT9_ABTYXA7ylw5FNc'; 
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM 元素選擇 ---
const loginView = document.getElementById('login-view');
const controlView = document.getElementById('control-view');
const systemMessage = document.getElementById('system-message');

const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');

const upButton = document.getElementById('up-button');
const stopButton = document.getElementById('stop-button');
const downButton = document.getElementById('down-button');
const controlButtons = [upButton, stopButton, downButton];

// 模擬一個使用者物件，實際情況會從 Supabase 取得
let currentUser = null;

// --- 事件監聽 ---
loginButton.addEventListener('click', handleGoogleLogin);
logoutButton.addEventListener('click', handleLogout); 

upButton.addEventListener('click', () => controlDoor('up'));
stopButton.addEventListener('click', () => controlDoor('stop'));
downButton.addEventListener('click', () => controlDoor('down'));

// --- 核心函式 ---

/**
 * @description 處理 Google 登入邏輯，導向 Google 進行 OAuth 驗證
 */
async function handleGoogleLogin() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}${window.location.pathname}`
        }
    });
    if (error) {
        console.error('Google 登入失敗:', error);
        updateSystemMessage('登入時發生錯誤，請稍後再試。', 'danger');
    }
}

/**
 * @description 處理登出邏輯
 * TO-DO: 登出成功後，由 onAuthStateChange 自動處理 UI 更新
 */
async function handleLogout() {
    setControlsDisabled(true); // 防止登出過程中誤觸
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error('登出失敗:', error);
        updateSystemMessage('登出時發生錯誤。', 'danger');
        setControlsDisabled(false); // 即使失敗也要重新啟用按鈕
    }
    // 登出成功後，onAuthStateChange 事件會被觸發，
    // 並自動處理 currentUser = null 和 updateUI()。
    // 因此這裡不需要手動呼叫它們。
}


/**
 * @description 傳送控制指令到後端
 * @param {string} command - 指令 ('up', 'stop', 'down')
 */
async function controlDoor(command) {
    if (!currentUser) {
        updateSystemMessage('錯誤：請先登入！', 'danger');
        return;
    }
 
    setControlsDisabled(true);
    updateSystemMessage(`指令發送中: [${command.toUpperCase()}]...`, 'info');
 
    try {
        // 呼叫名為 'control-door' 的 Edge Function
        const { data, error } = await supabaseClient.functions.invoke('control-door', {
            body: { command: command }, // 將指令作為請求的 body 傳送
        });
 
        if (error) {
            // 如果函式執行出錯，則拋出錯誤
            throw error;
        }
 
        // 使用函式回傳的成功訊息更新 UI
        updateSystemMessage(data.message, 'success');
    } catch (error) {
        console.error('指令發送失敗:', error);
        const errorMessage = error.context?.body?.error || error.message || '請檢查網路連線或稍後再試。';
        updateSystemMessage(`指令失敗: ${errorMessage}`, 'danger');
    } finally {
        setControlsDisabled(false);
    }
}

/**
 * @description 登入成功後要執行的動作
 * @param {object} user - Supabase 回傳的使用者物件
 */
function onLoginSuccess(user) {
    currentUser = user;
    updateUI();
}

/**
 * @description 根據登入狀態更新 UI 介面
 */
function updateUI() {
    if (currentUser) {
        loginView.classList.add('hidden');
        controlView.classList.remove('hidden');
        // 登入後，更新系統訊息為歡迎詞
        updateSystemMessage(`你好, ${currentUser.user_metadata.full_name || currentUser.email}`, 'info');
    } else {
        loginView.classList.remove('hidden');
        controlView.classList.add('hidden');
    }
}

/**
 * @description 更新系統訊息顯示與樣式
 * @param {string} message - 要顯示的訊息
 * @param {string} type - 訊息類型 ('info', 'success', 'danger')
 */
function updateSystemMessage(message, type = 'info') {
    systemMessage.textContent = message;
    
    // 根據訊息類型改變文字顏色
    switch (type) {
        case 'success':
            systemMessage.style.color = '#059669'; // 成功綠色
            break;
        case 'danger':
            systemMessage.style.color = '#B91C1C'; // 失敗紅色
            break;
        case 'info':
        default:
            systemMessage.style.color = 'var(--text-secondary)'; // 預設灰色
            break;
    }
}

/**
 * @description 設定控制按鈕的禁用狀態
 * @param {boolean} isDisabled
 */
function setControlsDisabled(isDisabled) {
    controlButtons.forEach(button => {
        button.disabled = isDisabled;
    });
}

// --- 程式進入點 ---

// 監聽 Supabase Auth 的狀態變化 (登入、登出)
supabaseClient.auth.onAuthStateChange((event, session) => {
    // 當使用者登入時 (SIGNED_IN) 且 session 物件存在
    if (event === 'SIGNED_IN' && session) {
        onLoginSuccess(session.user);
    } 
    // 當使用者登出時 (SIGNED_OUT)
    else if (event === 'SIGNED_OUT') {
        currentUser = null;
        updateUI();
        setControlsDisabled(false); // 確保登出後按鈕是可用的 (雖然 view 已隱藏)
    }
});

// 頁面初次載入時，檢查當前的 session 狀態以實現自動登入
async function checkInitialSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        onLoginSuccess(session.user);
    } else {
        updateUI();
    }
}

checkInitialSession();