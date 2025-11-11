// Web Push API Service Worker for Supabase

// 处理推送消息
self.addEventListener('push', (event) => {
  // Received push message - removed console.log for production

  let data = {};
  if (event.data) {
    data = event.data.json();
  }

  // 获取正确的图标路径
  const getIconPath = () => {
    const isProduction = self.location.hostname !== 'localhost' && self.location.hostname !== '127.0.0.1';
    return isProduction ? '/iplaycheck/icon.jpg' : '/icon.jpg';
  };

  const options = {
    body: data.notification?.body || data.body || '您有新的消息',
    icon: data.notification?.icon || getIconPath(),
    badge: data.notification?.badge || getIconPath(),
    tag: data.notification?.tag || data.data?.announcementId || 'time-tracking-notification',
    requireInteraction: data.notification?.requireInteraction || false,
    data: data.data || data,
    actions: [
      {
        action: 'view',
        title: '查看'
      },
      {
        action: 'close',
        title: '关闭'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(
      data.notification?.title || data.title || '打卡系统通知',
      options
    )
  );
});

// 处理通知点击
self.addEventListener('notificationclick', (event) => {
  // Notification clicked - removed console.log for production
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/';

  // 根据通知类型决定跳转页面
  if (data.type === 'announcement' && data.announcementId) {
    targetUrl = '/'; // 公告显示在首页
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 如果已有打开的窗口,聚焦到该窗口
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (targetUrl !== '/' || client.url.includes(targetUrl)) {
            return client.focus();
          }
        }
      }
      // 否则打开新窗口
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 处理service worker安装
self.addEventListener('install', (event) => {
  // Service Worker installing - removed console.log for production
  self.skipWaiting();
});

// 处理service worker激活
self.addEventListener('activate', (event) => {
  // Service Worker activating - removed console.log for production
  event.waitUntil(clients.claim());
});
