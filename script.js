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
const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmOkBtn = document.getElementById('confirm-ok-btn');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');


const upButton = document.getElementById('up-button');
const stopButton = document.getElementById('stop-button');
const downButton = document.getElementById('down-button');
const frontGateButton = document.getElementById('front-gate-button');
const rearGateButton = document.getElementById('rear-gate-button');
const foodWasteGateButton = document.getElementById('food-waste-gate-button');
const recyclingGateButton = document.getElementById('recycling-gate-button');
const controlButtons = [upButton, stopButton, downButton, frontGateButton, rearGateButton, foodWasteGateButton, recyclingGateButton];

// 模擬一個使用者物件，實際情況會從 Supabase 取得
let currentUser = null;
let pendingAction = null; // 用來暫存待確認的動作

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

// 確認視窗 Modal 的事件監聽
confirmCancelBtn.addEventListener('click', hideConfirm);
confirmOkBtn.addEventListener('click', () => {
    if (pendingAction) {
        pendingAction(); // 執行被暫存的動作
    }
    hideConfirm();
});


upButton.addEventListener('click', () => {
    showConfirm('開啟鐵捲門', () => controlDoor('up'));
});
stopButton.addEventListener('click', () => {
    showConfirm('停止鐵捲門', () => controlDoor('stop'));
});
downButton.addEventListener('click', () => {
    showConfirm('關閉鐵捲門', () => controlDoor('down'));
});
frontGateButton.addEventListener('click', () => {
    showConfirm('開啟前棟大門(測試中)', () => controlDoor('front_gate_open'));
});
rearGateButton.addEventListener('click', () => {
    showConfirm('開啟後棟大門(測試中)', () => controlDoor('rear_gate_open'));
});
foodWasteGateButton.addEventListener('click', () => {
    // 使用新的 enable=false 參數，並提供自訂訊息
    showConfirm('開啟廚餘鐵門', () => controlDoor('food_waste_open'), '此功能尚未開放，敬請期待。', false);
});
recyclingGateButton.addEventListener('click', () => {
    // 使用新的 enable=false 參數，並提供自訂訊息
    showConfirm('開啟回收鐵門', () => controlDoor('recycling_open'), '此功能尚未開放，敬請期待。', false);
});

// --- 核心函式 ---

/**
 * @description 處理 Google 登入邏輯，導向 Google 進行 OAuth 驗證
 */
async function handleGoogleLogin() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}${window.location.pathname}`,
            // 解決 PWA 中 Google 登入被阻擋 (disallowed_useragent) 的問題
            queryParams: {
                prompt: 'consent',
            }
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
 */
async function handleLogout() {
    // 即使 session 已過期，也要嘗試呼叫 signOut 來觸發 onAuthStateChange 並清除本地儲存。
    // { scope: 'local' } 會嘗試只清除本地 session，避免因 JWT 過期向伺服器請求而被拒絕。
    const { error } = await supabaseClient.auth.signOut({ scope: 'local' });
 
    if (error) {
        console.error('登出時發生錯誤:', error);
    }
 
    // 無論 signOut 是否成功，都手動清除 currentUser 並更新 UI。
    // 這是最關鍵的一步，確保即使 signOut 因 session 失效而出錯，UI 也能正確回到登入畫面。
    currentUser = null;
    updateUI();
}


/**
 * @description 傳送控制指令到後端
 * @param {string} command - 指令 ('up', 'stop', 'down')
 */
async function controlDoor(command) {
    // 1. 每次操作前都先刷新並驗證 Session，這是最穩健的做法
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

    // 如果 session 刷新失敗或不存在，代表登入狀態已失效
    if (sessionError || !session) {
        updateSystemMessage('登入已逾期，請重新登入。', 'danger');
        console.error('Session invalid, forcing logout.');
        // 可以在此處強制觸發登出流程，確保 UI 一致性
        await supabaseClient.auth.signOut({ scope: 'local' });
        return;
    }

    // 更新當前的 currentUser，以防萬一
    currentUser = session.user;

    // 2. 如果是 DEBUG 模式，直接模擬成功，不呼叫後端
    // 注意：getSession 刷新機制對 DEBUG 模式無效，因為它沒有真的 session
    // 但我們保留這個邏輯用於開發測試
    if (currentUser.isDebug) {
        setControlsDisabled(true);
        updateSystemMessage(`[DEBUG] 模擬指令 [${command.toUpperCase()}] 發送成功！`, 'success');
        setTimeout(() => setControlsDisabled(false), 500); // 模擬延遲後恢復按鈕
        return;
    }
 
    // 3. 執行實際的指令發送
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
    if (currentUser && !currentUser.isDebug) { // DEBUG 模式下 currentUser 是手動設定的，不依賴 session
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

/**
 * @description 顯示確認視窗
 * @param {string} title - 視窗標題
 * @param {Function} action - 使用者點擊確認後要執行的回呼函式
 * @param {string} [message] - (可選) 要顯示的訊息，若不提供則使用預設值。
 * @param {boolean} [enable=true] - (可選) 是否啟用確認按鈕。
 */
function showConfirm(title, action, message = '無需在門附近即可操作，請謹慎使用。', enable = true) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    pendingAction = action;

    // 根據 enable 參數設定確認按鈕的狀態
    confirmOkBtn.disabled = !enable;

    confirmModal.classList.remove('hidden');
}

/**
 * @description 隱藏確認視窗
 */
function hideConfirm() {
    confirmModal.classList.add('hidden');
    pendingAction = null;
    confirmOkBtn.disabled = false; // 確保關閉時重設按鈕狀態
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
        // 此事件在 signOut 成功時觸發。
        // 我們的 handleLogout 函式已經處理了 UI 更新，這裡僅作日誌記錄。
        // 這樣可以避免在 handleLogout 中重複執行 UI 更新。
        console.log('User signed out, UI updated.');
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
        navigator.serviceWorker.register('sw.js')
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
