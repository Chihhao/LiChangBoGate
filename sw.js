/**
 * 基本的 Service Worker 檔案
 *
 * 這個檔案的目的是讓 PWA 註冊成功，避免 404 錯誤。
 * 目前它只包含基本的安裝 (install) 和啟用 (activate) 事件監聽，
 * 以及一個空的 fetch 事件處理器。
 *
 * self.skipWaiting() 會強制新的 Service Worker 立即取代舊的，
 * 確保使用者總是能用到最新版本。
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // 在這裡可以清理舊的快取
});

self.addEventListener('fetch', (event) => {
  // 目前我們不攔截任何網路請求，讓它們正常發送
});