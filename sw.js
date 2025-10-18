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
  // 強制新的 Service Worker 立即控制頁面
  event.waitUntil(clients.claim());

  // 清理所有舊的快取
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 在這裡可以加入邏輯，只刪除特定前綴的快取，但為了徹底解決問題，我們先全部刪除
          console.log('Service Worker: Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // 目前我們不攔截任何網路請求，讓它們正常發送
});