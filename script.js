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
 * @description 處理 Google 登入邏輯
 * TO-DO: 在此處整合 Supabase 的 signInWithOAuth()
 */
function handleGoogleLogin() {
    console.log('正在嘗試使用 Google 登入...');
    // 模擬登入成功
    const fakeUser = {
        email: 'user@example.com',
        user_metadata: { full_name: '測試使用者' }
    };
    onLoginSuccess(fakeUser);
}

/**
 * @description 處理登出邏輯
 */
function handleLogout() {
    console.log('正在登出...');
    currentUser = null;
    updateUI();
}


/**
 * @description 傳送控制指令到後端
 * @param {string} command - 指令 ('up', 'stop', 'down')
 * TO-DO: 在此處整合呼叫 Supabase Edge Function 的 fetch() 請求
 */
async function controlDoor(command) {
    if (!currentUser) {
        updateSystemMessage('錯誤：請先登入！', 'danger');
        return;
    }

    setControlsDisabled(true);
    updateSystemMessage(`指令發送中: [${command.toUpperCase()}]...`, 'info');

    try {
        // 模擬 1 秒的網路延遲
        await new Promise(resolve => setTimeout(resolve, 1000));
        updateSystemMessage(`指令 [${command.toUpperCase()}] 已成功發送！`, 'success');
    } catch (error) {
        console.error('指令發送失敗:', error);
        updateSystemMessage('指令發送失敗，請稍後再試。', 'danger');
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

/**
 * @description 頁面載入時執行的初始化函式
 * TO-DO: 在此處檢查 Supabase 的 session，以實現自動登入
 */
function initialize() {
    updateUI();
}

// --- 程式進入點 ---
initialize();