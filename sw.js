// sw.js

// 這個 Service Worker 檔案目前是空的，只為了滿足 PWA 的安裝需求。
// 未來可以擴充它來實現離線快取等功能。

self.addEventListener('install', (event) => {
  // console.log('Service Worker installing.');
  // event.waitUntil(self.skipWaiting()); // 如果需要立即啟用新的 Service Worker
});

self.addEventListener('activate', (event) => {
  // console.log('Service Worker activating.');
});