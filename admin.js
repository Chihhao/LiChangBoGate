// --- Supabase 初始化 ---
const { createClient } = supabase;
const SUPABASE_URL = 'https://ooumvivnvhbcdpphirrq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vdW12aXZudmhiY2RwcGhpcnJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTIwNjEsImV4cCI6MjA3NjE2ODA2MX0.eRst8MK1CdcS_bemecDBJrJxVFT9_ABTYXA7ylw5FNc';
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM 元素 ---
const mainContainer = document.getElementById('main-container');
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const permissionDeniedView = document.getElementById('permission-denied-view');
const userModal = document.getElementById('user-modal');
const installGuideLink = document.getElementById('install-guide-link');
const installGuideModal = document.getElementById('install-guide-modal');
const closeGuideBtn = document.getElementById('close-guide-btn');

let currentUser = null;
let whitelistCache = []; // 用於儲存白名單資料，實現即時搜尋

// --- 核心函式 ---

/**
 * 檢查使用者是否為管理員
 */
async function checkAdminStatus(user) {
    try {
        const { data, error } = await supabaseClient
            .from('whitelist')
            .select('is_admin')
            .eq('email', user.email)
            .single();

        if (error || !data || !data.is_admin) {
            showPermissionDenied();
        } else {
            // 確認是管理員，顯示管理介面並載入資料
            showAdminView();
            await loadWhitelist();
        }
    } catch (e) {
        console.error("檢查管理員權限時出錯:", e);
        showPermissionDenied();
    }
}

/**
 * 載入並快取白名單列表
 */
async function loadWhitelist() {
    try {
        const { data, error } = await supabaseClient
            .from('whitelist')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        whitelistCache = data; // 存入快取
        renderTable(whitelistCache); // 渲染表格
    } catch (error) {
        console.error("讀取白名單失敗:", error);
        adminView.innerHTML = `<p style="color: red;">讀取白名單失敗</p>`;
    }
}

/**
 * 格式化 email，如果後綴是 @gmail.com 則省略
 * @param {string} email 
 * @returns {string} 格式化後的 email
 */
function formatEmail(email) {
    return email.endsWith('@gmail.com') ? email.replace('@gmail.com', '') : email;
}
/**
 * 渲染白名單表格
 * @param {Array} data - 要渲染的使用者資料
 */
function renderTable(data) {
    const tableBody = adminView.querySelector('#user-table-body');
    if (!tableBody) return;

    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center;">沒有符合條件的資料</td></tr>`;
        return;
    }
    
    tableBody.innerHTML = data.map(item => `
        <tr id="user-${item.id}">
			<!-- 【第 1 欄】: 住戶 -->
            <td>
                ${item.resident_id || 'N/A'}
            </td>
            <!-- 【第 2 欄】: Google 帳號 -->
            <td>
                <div class="email">${formatEmail(item.email)}</div>
                ${item.is_admin ? '<span style="color: #059669; font-size:12px; font-weight: bold;">管理員</span>' : ''}
            </td>
            <!-- 【第 3 欄】: 操作 -->
            <td class="actions">
                <button class="btn-action edit" data-id="${item.id}" title="編輯">
                    <i class="mdi mdi-pencil-outline"></i>
                </button>
                <button class="btn-action delete" data-id="${item.id}" data-email="${item.email}" title="刪除">
                    <i class="mdi mdi-delete-outline"></i>
                </button>
            </td>
        </tr>
    `).join('');
}


/**
 * 處理儲存操作 (新增或更新)
 */
async function handleSave() {
    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '儲存中...';

    const id = document.getElementById('user-id-input').value;
    let email = document.getElementById('email-input').value.trim();
    const is_admin = document.getElementById('is-admin-checkbox').checked;
    const building = document.getElementById('building-select').value;
    const floor = document.getElementById('floor-select').value;
    let resident_id = 'N/A'; // 預設值
    if (building && floor) {
        resident_id = building + floor; // 如果都有選，才組合
    }

    if (!email) {
        alert('Email 為必填欄位');
        saveBtn.disabled = false;
        saveBtn.textContent = '儲存';
        return;
    }

    // 驗證並自動補完 @gmail.com
    if (email.includes('@')) {
        if (!email.endsWith('@gmail.com')) {
            alert('Email 格式錯誤，目前僅支援 @gmail.com 的信箱。');
            saveBtn.disabled = false;
            saveBtn.textContent = '儲存';
            return;
        }
    } else {
        // 如果不含 @，自動補上後綴
        email += '@gmail.com';
    }

    try {
        let error;
        const userData = { email, is_admin, resident_id };

        if (id) { // 更新
            const { error: updateError } = await supabaseClient
                .from('whitelist')
                .update(userData)
                .eq('id', id);
            error = updateError;
        } else { // 新增
            const { error: insertError } = await supabaseClient
                .from('whitelist')
                .insert(userData);
            error = insertError;
        }

        if (error) throw error;

        closeModal();
        await loadWhitelist(); // 重新載入列表
    } catch (error) {
        console.error("儲存失敗:", error);
        alert(`儲存失敗: ${error.message}`);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '儲存';
    }
}

/**
 * 從白名單刪除 Email
 */
async function handleDelete(id, email) {
    if (!confirm(`確定要刪除 ${email} 嗎？`)) return;

    try {
        const { error } = await supabaseClient
            .from('whitelist')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        await loadWhitelist(); // 重新載入列表
    } catch (error) {
        console.error("刪除失敗:", error);
        alert(`刪除失敗: ${error.message}`);
    }
}

// --- UI 更新與互動 ---

function showAdminView() {
    loginView.classList.add('hidden');
    permissionDeniedView.classList.add('hidden');
    adminView.classList.remove('hidden');
    mainContainer.style.maxWidth = '800px'; // 擴展容器寬度

    // 渲染管理介面骨架
    adminView.innerHTML = `
        <h1>住戶白名單管理</h1>
        <div class="toolbar">
            <input type="search" id="search-input" placeholder="依 Google 帳號 或住戶搜尋...">
            <button id="add-new-btn" class="btn">
                <i class="mdi mdi-plus" style="margin-right: 4px;"></i>新增住戶
            </button>
        </div>
        <div class="table-container">
            <table class="user-table">
                <thead>
                    <tr>
						<th>住戶</th>
                        <th>Google 帳號</th>						
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="user-table-body">
                    <tr><td colspan="3" style="text-align: center;">載入中...</td></tr>
                </tbody>
            </table>
        </div>
        <button id="logout-button" class="btn btn-logout">登出</button>
    `;

    // 為動態生成的元素加上事件監聽
      document.getElementById('search-input').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredData = whitelistCache.filter(user =>
            user.email.toLowerCase().includes(searchTerm) ||
            (user.resident_id && user.resident_id.toLowerCase().includes(searchTerm))
        );
        renderTable(filteredData);
    });
}

function showPermissionDenied() {
    loginView.classList.add('hidden');
    adminView.classList.add('hidden');
    permissionDeniedView.classList.remove('hidden');
    permissionDeniedView.innerHTML = `
        <h1>權限不足</h1>
        <div class="warning-notice">
            <i class="mdi mdi-alert-circle-outline"></i>
            <span>您的帳號不是管理員，無法存取此頁面。</span>
        </div>
        <button id="logout-button-denied" class="btn btn-logout">登出</button>
    `;
}

function openModal(mode, userData = null) {
    const form = document.getElementById('user-form');
    form.reset(); // 清空表單

    const buildingSelect = document.getElementById('building-select');
    const floorSelect = document.getElementById('floor-select');
    const modalTitle = document.getElementById('modal-title');

    if (mode === 'edit') {
        modalTitle.textContent = '編輯住戶資料';
        document.getElementById('user-id-input').value = userData.id;
        document.getElementById('email-input').value = userData.email;
        document.getElementById('is-admin-checkbox').checked = userData.is_admin;

        const residentId = userData.resident_id;
        if (residentId && residentId !== 'N/A' && residentId.length >= 2) {
            const building = residentId.charAt(0); // 取第一個字元為棟別
            const floor = residentId.substring(1); // 取剩餘部分為樓層
            buildingSelect.value = building;
            floorSelect.value = floor;
        } else {
            buildingSelect.value = "";
            floorSelect.value = "";
        }
        
    } else {
        modalTitle.textContent = '新增住戶';
        document.getElementById('user-id-input').value = '';
    }
    userModal.classList.remove('hidden');
}

function closeModal() {
    userModal.classList.add('hidden');
}

// --- 事件綁定與初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    // --- DEBUG 按鈕可見性控制 ---
    const debugLoginButton = document.getElementById('debug-login-button');
    if (debugLoginButton) {
        const allowedDebugOrigins = ['http://127.0.0.1:5500', 'http://10.0.4.58:5500'];
        const currentOrigin = window.location.origin;
        if (!allowedDebugOrigins.includes(currentOrigin)) {
            debugLoginButton.style.display = 'none';
        }
    }

    // 檢查初始 session
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            currentUser = session.user;
            checkAdminStatus(currentUser);
        } else {
            loginView.classList.remove('hidden');
        }
    });

    // 監聽登入/登出狀態
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        if (session && !currentUser) {
            currentUser = session.user;
            checkAdminStatus(currentUser);
        } else if (!session && currentUser) {
            window.location.reload();
        }
    });

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

    // --- 全域點擊事件委派 ---
    document.body.addEventListener('click', async (e) => {
        // Google 登入
        if (e.target.closest('#login-button')) {
            supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + window.location.pathname
                }
            });
        }
        
        // DEBUG 登入
        if (e.target.closest('#debug-login-button')) {
            console.log('DEBUG模式登入...');
            // 模擬一個管理員使用者物件
            currentUser = { email: 'debug@admin.com', id: 'debug-user-id' };
            // 手動模擬檢查管理員權限的流程
            showAdminView();
            loadWhitelist();
        }

        // 登出
        if (e.target.closest('#logout-button') || e.target.closest('#logout-button-denied')) {
            // 增加保護：如果本地已是登出狀態，直接重整頁面。
            if (!currentUser) {
                window.location.reload();
            } else {
                // 正常執行登出，onAuthStateChange 會監聽並重整頁面。
                const { error } = await supabaseClient.auth.signOut();
                if (error && error.name !== 'AuthSessionMissingError') console.error('登出時發生錯誤:', error);
            }
        }
        
        // 新增按鈕
        if (e.target.closest('#add-new-btn')) {
            openModal('add');
        }

        // 編輯按鈕
        const editBtn = e.target.closest('.btn-action.edit');
        if (editBtn) {
            const userId = editBtn.dataset.id;
            const userData = whitelistCache.find(user => user.id == userId);
            if (userData) openModal('edit', userData);
        }
        
        // 刪除按鈕
        const deleteBtn = e.target.closest('.btn-action.delete');
        if (deleteBtn) {
            const { id, email } = deleteBtn.dataset;
            handleDelete(id, email);
        }

        // Modal 取消按鈕
        if (e.target.closest('#cancel-btn')) {
            closeModal();
        }
    });
    
    // Modal 表單提交
    document.getElementById('user-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleSave();
    });
});

// --- PWA Service Worker 註冊 ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // 我們可以共用同一個 sw.js 檔案
        navigator.serviceWorker.register('sw.js')
            .then(registration => console.log('Admin Service Worker registered: ', registration))
            .catch(registrationError => console.log('Admin Service Worker registration failed: ', registrationError));
    });
}

// --- 動態生成 Apple Touch Icon 解決 iOS 模糊問題 ---
/**
 * @description 透過 Canvas 將 SVG 轉換為高解析度 PNG Data URI，並設定為 apple-touch-icon。
 * 這是為了解決 iOS 設備上「加入主畫面」時 SVG 圖示可能模糊的問題。
 */
function generateAdminAppleTouchIcon() {
    const iconUrl = 'admin-icon.svg'; // 使用管理員圖示
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
        console.log('Admin Apple Touch Icon generated and applied.');
    };
    img.onerror = () => {
        console.error('Failed to load admin-icon.svg for generating Apple Touch Icon.');
    };
    img.src = iconUrl;
}

window.addEventListener('load', generateAdminAppleTouchIcon);
