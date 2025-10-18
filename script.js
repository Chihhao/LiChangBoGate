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
const debugLoginButton = document.getElementById('debug-login-button');
const logoutButton = document.getElementById('logout-button');
const installGuideLink = document.getElementById('install-guide-link');
const installGuideModal = document.getElementById('install-guide-modal');
const closeGuideBtn = document.getElementById('close-guide-btn');


const upButton = document.getElementById('up-button');
const stopButton = document.getElementById('stop-button');
const downButton = document.getElementById('down-button');
const controlButtons = [upButton, stopButton, downButton];

// 模擬一個使用者物件，實際情況會從 Supabase 取得
let currentUser = null;

// --- 事件監聽 ---
loginButton.addEventListener('click', handleGoogleLogin);
debugLoginButton.addEventListener('click', handleDebugLogin);
logoutButton.addEventListener('click', handleLogout); 

// 安裝說明 Modal 的事件監聽
if (installGuideLink) {
    installGuideLink.addEventListener('click', (e) => {
        e.preventDefault();
        installGuideModal.classList.remove('hidden');
    });
}
if (closeGuideBtn) {
    closeGuideBtn.addEventListener('click', () => installGuideModal.classList.add('hidden'));
}


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
 * @description 處理 DEBUG 快速登入
 */
function handleDebugLogin() {
    // 1. 模擬一個使用者物件
    const debugUser = {
        email: 'debug@example.com',
        user_metadata: { full_name: 'DEBUG User' },
        isDebug: true // 加入一個標記，表示這是 DEBUG 使用者
    };
    currentUser = debugUser;

    // 2. 直接模擬登入成功的 UI 流程，繞過 onLoginSuccess 的資料庫檢查
    loginView.classList.add('hidden');
    controlView.classList.remove('hidden');

    // 3. 顯示歡迎訊息
    const fallbackName = currentUser.user_metadata.full_name || currentUser.email;
    updateSystemMessage(`你好, ${fallbackName}`, 'info');
}

/**
 * @description 處理登出邏輯
 * TO-DO: 登出成功後，由 onAuthStateChange 自動處理 UI 更新
 */
async function handleLogout() {
    setControlsDisabled(true); // 防止登出過程中誤觸
    try {
        const { error } = await supabaseClient.auth.signOut();
        // 如果 signOut 過程本身出錯 (例如 403 錯誤)，就拋出它
        if (error) {
            // 為了讓 finally 區塊能捕捉到，我們手動拋出
            throw error;
        }
    } catch (error) {
        // 在控制台靜默地記錄錯誤，但不要打斷流程
        console.warn('Sign out failed, possibly because session was already invalid:', error.message);
    } finally {
        // 【關鍵】無論成功或失敗，都強制更新 UI 到登出狀態
        currentUser = null;
        updateUI();
        setControlsDisabled(false);
    }
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

    // 如果是 DEBUG 模式，直接模擬成功，不呼叫後端
    if (currentUser.isDebug) {
        setControlsDisabled(true);
        updateSystemMessage(`[DEBUG] 模擬指令 [${command.toUpperCase()}] 發送成功！`, 'success');
        setTimeout(() => setControlsDisabled(false), 500); // 模擬延遲後恢復按鈕
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
 * @description 登入成功後要執行的動作（包含白名單驗證）
 * @param {object} user - Supabase 回傳的使用者物件
 */
async function onLoginSuccess(user) {
    currentUser = user;

    try {
        const { data, error } = await supabaseClient
            .from('whitelist')
            .select('resident_id')
            .eq('email', user.email)
            .single(); // .single() 會在找不到資料時回傳 error，這對我們很有利

        // 如果有任何錯誤 (包括找不到使用者)，就拋出錯誤，讓 catch 區塊來處理
        if (error) {
            throw error;
        }

        // --- 驗證成功路徑 ---
        // 1. 顯示操作介面
        loginView.classList.add('hidden');
        controlView.classList.remove('hidden');
        
        // 2. 根據 resident_id 顯示對應的歡迎訊息
        if (data.resident_id && data.resident_id !== 'N/A') {
            updateSystemMessage(`${data.resident_id} 住戶您好！`, 'info');
        } else {
            // 如果使用者在白名單內，但沒有住戶編號，就顯示備用訊息
            const fallbackName = currentUser.user_metadata.full_name || currentUser.email;
            updateSystemMessage(`你好, ${fallbackName}`, 'info');
        }

    } catch (dbError) {
        // --- 驗證失敗路徑 ---
        console.error("權限驗證失敗:", dbError.message);

        // 1. 停留在登入頁面，不顯示操作介面
        loginView.classList.remove('hidden');
        controlView.classList.add('hidden');

        // 2. 在登入按鈕前動態插入一個權限錯誤的提示框
        // 避免直接修改現有的 .info-notice，以防與 iOS 提示衝突
        const existingErrorPrompt = document.getElementById('permission-error-prompt');
        if (!existingErrorPrompt) {
            const errorPrompt = document.createElement('div');
            errorPrompt.id = 'permission-error-prompt';
            errorPrompt.className = 'warning-notice'; // 使用紅色系的警告樣式
            errorPrompt.innerHTML = `
                <i class="mdi mdi-alert-circle-outline"></i>
                <span>您沒有權限！請向管委會申請使用。</span>
            `;
            // 將錯誤提示插入到登入按鈕的前面
            loginView.insertBefore(errorPrompt, loginButton);
        }
    }
}

/**
 * @description 根據登入狀態更新 UI 介面
 */
function updateUI() {
    if (currentUser) {
        loginView.classList.add('hidden');
        controlView.classList.remove('hidden');
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

/**
 * @description 根據當前 URL 決定是否顯示 DEBUG 按鈕
 */
function handleDebugButtonVisibility() {
    const allowedDebugOrigins = ['http://127.0.0.1:5500', 'http://10.0.4.58:5500'];
    const currentOrigin = window.location.origin;

    if (debugLoginButton && !allowedDebugOrigins.includes(currentOrigin)) {
        debugLoginButton.style.display = 'none';
    }
}

// --- iOS 安裝提示邏輯 ---
/**
 * 偵測是否為 iOS 裝置且尚未安裝 PWA，若是，則顯示安裝提示。
 */
function showIosInstallPrompt() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isInStandaloneMode) {
        const noticeElement = loginView.querySelector('.info-notice');
        if (noticeElement) {
            // 複製一個提示框專門給 iOS 用，避免覆蓋掉原本的權限提示
            const iosPrompt = noticeElement.cloneNode(true);
            iosPrompt.id = 'ios-install-prompt';
            iosPrompt.innerHTML = `
                <i class="mdi mdi-apple-ios"></i>
                <span>iPhone 用戶可點擊下方「分享」按鈕，並選擇「加入主畫面」以獲得最佳體驗。</span>
            `;
            loginView.insertBefore(iosPrompt, loginButton);
        }
    }
}

// --- PWA 相關邏輯 ---
// 註冊 Service Worker 是 PWA 的核心之一，即使沒有安裝按鈕也需要保留
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('Service Worker registered: ', registration))
            .catch(registrationError => console.log('Service Worker registration failed: ', registrationError));
        
        // 頁面載入後，檢查是否要顯示 iOS 提示
        showIosInstallPrompt();

        // 頁面載入後，檢查是否顯示 DEBUG 按鈕
        handleDebugButtonVisibility();
    });
}

// --- 動態生成 Apple Touch Icon 解決 iOS 模糊問題 ---
/**
 * @description 透過 Canvas 將 SVG 轉換為高解析度 PNG Data URI，並設定為 apple-touch-icon。
 * 這是為了解決 iOS 設備上「加入主畫面」時 SVG 圖示可能模糊的問題。
 */
function generateAppleTouchIcon() {
    const iconUrl = 'icon.svg';
    const iconSize = 512; // 設定高解析度尺寸

    const canvas = document.createElement('canvas');
    canvas.width = iconSize;
    canvas.height = iconSize;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = () => {
        // 將 SVG 圖片繪製到 Canvas 上
        ctx.drawImage(img, 0, 0, iconSize, iconSize);

        // 從 Canvas 獲取 PNG 格式的 Data URI
        const pngDataUrl = canvas.toDataURL('image/png');

        // 創建 <link> 標籤
        const link = document.createElement('link');
        link.rel = 'apple-touch-icon';
        link.href = pngDataUrl;

        // 將 <link> 標籤添加到 <head>
        document.head.appendChild(link);
        console.log('Apple Touch Icon generated and applied.');
    };
    img.onerror = () => {
        console.error('Failed to load icon.svg for generating Apple Touch Icon.');
    };
    img.src = iconUrl;
}

window.addEventListener('load', generateAppleTouchIcon);
