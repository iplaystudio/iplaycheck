/* eslint-disable no-console */

import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('新版本可用,是否立即更新?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
  onRegistered(registration) {
    console.log('Service worker has been registered.');
    // 每小时检查一次更新
    setInterval(() => {
      registration?.update();
    }, 60 * 60 * 1000);
  },
  onRegisterError(error) {
    console.error('SW registration error', error);
  }
});

// 监听Service Worker控制器变化
let refreshing = false;
if (navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
