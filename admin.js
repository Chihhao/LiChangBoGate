// --- Supabase 初始化 ---
const { createClient } = supabase;
const SUPABASE_URL = 'https://ooumvivnvhbcdpphirrq.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vdW12aXZudmhiY2RwcGhpcnJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTIwNjEsImV4cCI6MjA3NjE2ODA2MX0.eRst8MK1CdcS_bemecDBJrJxVFT9_ABTYXA7ylw5FNc'; 
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM 元素 ---
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const permissionDeniedView = document.getElementById('permission-denied-view');

let currentUser = null;

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
            if (currentUser) currentUser.is_admin_flag = false;
            showPermissionDenied();
            return;
        }

        // 確認是管理員，顯示管理介面並載入資料
        showAdminView();
        await loadWhitelist();
        if (currentUser) currentUser.is_admin_flag = true;

    } catch (e) {
        console.error("檢查管理員權限時出錯:", e);
        showPermissionDenied();
    }
}

/**
 * 載入並顯示白名單列表
 */
async function loadWhitelist() {
    const { data, error } = await supabaseClient
        .from('whitelist')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("讀取白名單失敗:", error);
        adminView.innerHTML = `<p style="color: red;">讀取白名單失敗</p>`;
        return;
    }

    const listHtml = data.map(item => `
        <div class="whitelist-item" id="item-${item.id}">
            <span class="whitelist-email">${item.email} ${item.is_admin ? '(管理員)' : ''}</span>
            <button class="delete-btn" data-id="${item.id}" data-email="${item.email}" title="刪除">
                <i class="mdi mdi-delete-outline"></i>
            </button>
        </div>
    `).join('');

    adminView.querySelector('#whitelist-list').innerHTML = listHtml;
}

/**
 * 新增 Email 到白名單
 */
async function handleAddEmail() {
    const addButton = document.getElementById('add-email-btn');
    addButton.disabled = true;
    addButton.textContent = '新增中...';
    const input = document.getElementById('new-email-input');
    const email = input.value.trim();

    try {
        if (!email) {
            alert('請輸入 Email');
            return;
        }

        const { error } = await supabaseClient
            .from('whitelist')
            .insert({ email: email });

        if (error) {
            throw error;
        }

        input.value = '';
        await loadWhitelist(); // 重新載入列表
    } catch (error) {
        console.error("新增 Email 失敗:", error);
        alert(`新增失敗: ${error.message}`);
    } finally {
        addButton.disabled = false;
        addButton.textContent = '新增';
    }
}

/**
 * 從白名單刪除 Email
 */
async function handleDeleteEmail(id, email) {
    const deleteButton = document.querySelector(`.delete-btn[data-id='${id}']`);
    if (deleteButton) deleteButton.disabled = true;
    
    try {
        if (!confirm(`確定要刪除 ${email} 嗎？`)) {
            return;
        }

        const { error } = await supabaseClient
            .from('whitelist')
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }
        await loadWhitelist(); // 重新載入列表
    } catch (error) {
        console.error("刪除 Email 失敗:", error);
        alert(`刪除失敗: ${error.message}`);
    } finally {
        // 重新載入後按鈕已不存在，無需恢復狀態
        // 但若 confirm 為 false，需恢復按鈕狀態
        if (deleteButton && deleteButton.disabled) {
            deleteButton.disabled = false;
        }
    }
}

// --- UI 更新函式 ---

function showAdminView() {
    loginView.classList.add('hidden');
    permissionDeniedView.classList.add('hidden');
    adminView.classList.remove('hidden');
    adminView.innerHTML = `
        <h1>管理者後台</h1>
        <p>管理可使用鐵捲門的 Email 白名單</p>
        <div class="add-form">
            <input type="email" id="new-email-input" placeholder="輸入要新增的 Email">
            <button id="add-email-btn" class="btn">新增</button>
        </div>
        <div id="whitelist-list"></div>
        <button id="logout-button" class="btn btn-logout">登出</button>
    `;
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

// --- 事件綁定與初始化 ---

document.addEventListener('DOMContentLoaded', () => {
    // 頁面初次載入時，檢查當前的 session 狀態
    document.getElementById('login-button').disabled = true; // 預設禁用，等待 JS 載入
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            currentUser = session.user;
            checkAdminStatus(currentUser);
        } else {
            loginView.classList.remove('hidden');
        }
        document.getElementById('login-button').disabled = false; // 檢查完畢，啟用按鈕
    });

    // 監聽登入/登出狀態
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        if (session && !currentUser) {
            currentUser = session.user;
            checkAdminStatus(currentUser);
        } else if (!session && currentUser) {
            window.location.reload(); // 登出後重新整理頁面
        }
    });

    // 使用事件委派來處理動態新增的按鈕
    document.body.addEventListener('click', (e) => {
        if (e.target.matches('#login-button, #login-button *')) {
            supabaseClient.auth.signInWithOAuth({ 
                provider: 'google',
                options: { redirectTo: `${window.location.origin}${window.location.pathname}` } 
            });
        }
        if (e.target.matches('#logout-button, #logout-button-denied')) supabaseClient.auth.signOut();
        if (e.target.matches('#add-email-btn')) handleAddEmail();
        
        const deleteButton = e.target.closest('.delete-btn');
        if (deleteButton) {
            const { id, email } = deleteButton.dataset;
            handleDeleteEmail(id, email);
        }
    });
});