// Firebase Cloud Messaging Service Worker

importScripts('https://www.gstatic.com/firebasejs/10.4.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.4.0/firebase-messaging-compat.js');

// 从环境变量获取Firebase配置
const firebaseConfig = {
  apiKey: 'your_api_key_here',
  authDomain: 'your_project_id.firebaseapp.com',
  projectId: 'your_project_id',
  storageBucket: 'your_project_id.appspot.com',
  messagingSenderId: 'your_sender_id',
  appId: 'your_app_id'
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// 处理后台消息
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);

  const notificationTitle = payload.notification.title || '打卡系统通知';
  const notificationOptions = {
    body: payload.notification.body || '您有新的消息',
    icon: '/img/icons/android-chrome-192x192.png',
    badge: '/img/icons/badge-72x72.png',
    tag: 'time-tracking-notification',
    requireInteraction: false,
    data: payload.data
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 如果已有打开的窗口,聚焦到该窗口
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // 否则打开新窗口
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
