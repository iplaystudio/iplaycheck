 

import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('新版本可用,是否立即更新?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    // App ready to work offline: log removed
  },
  onRegistered(registration) {
    // Service worker has been registered: log removed
    // 每小时检查一次更新
    setInterval(() => {
      registration?.update();
    }, 60 * 60 * 1000);
  },
  onRegisterError(error) {
    // SW registration error: debug output removed
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
