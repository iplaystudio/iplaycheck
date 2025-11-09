<template>
  <div
    v-if="showInstallButton"
    class="pwa-install-button"
  >
    <AppleButton
      variant="primary"
      size="small"
      @click="install"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        class="install-icon"
      >
        <path
          d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          fill="currentColor"
        />
      </svg>
      安装程序
    </AppleButton>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import AppleButton from '@/components/shared/AppleButton.vue';

const showInstallButton = ref(false);
const deferredPrompt = ref(null);

const install = async () => {
  // 检查 PWA 兼容性
  const isPWACompatible = () => {
    return (
      'serviceWorker' in navigator &&
      'BeforeInstallPromptEvent' in window &&
      window.matchMedia('(display-mode: standalone)').matches === false
    );
  };

  if (deferredPrompt.value) {
    deferredPrompt.value.prompt();
    const { outcome } = await deferredPrompt.value.userChoice;
    console.log(`用户响应安装提示: ${outcome}`);
    deferredPrompt.value = null;

    // 不隐藏按钮，让它一直显示
    // if (outcome === 'accepted') {
    //   localStorage.setItem('pwa-installed', 'true');
    //   showInstallButton.value = false;
    // } else {
    //   showInstallButton.value = false;
    // }
  } else if (import.meta.env.DEV) {
    // 在开发环境中显示提示信息
    alert('在开发环境中，无法实际安装PWA应用。但在生产环境中，用户会看到浏览器的安装提示。');
    // 不隐藏按钮，让它一直显示
    // showInstallButton.value = false;
  } else {
    // 在生产环境中，检查兼容性并提供相应指导
    const compatible = isPWACompatible();

    if (compatible) {
      alert('您的浏览器支持PWA安装。请尝试刷新页面或清除缓存后重试。\n\n如果仍然无法安装，请尝试：\n1. 在地址栏右侧查找安装图标\n2. 或按 F12 打开开发者工具，查看控制台错误信息');
    } else {
      alert('您的浏览器可能不完全支持PWA安装。请尝试使用以下方法：\n\n1. Chrome/Edge: 在地址栏右侧点击安装图标\n2. Safari: 分享 > 添加到主屏幕\n3. Firefox: 菜单 > 安装此应用\n\n如果您的浏览器不支持PWA，您仍然可以使用网页版应用。');
    }

    // 不隐藏按钮，让它一直显示
    // showInstallButton.value = false;
    // localStorage.setItem('pwa-install-dismissed', 'true');
  }
};

const dismiss = () => {
  showInstallButton.value = false;
  // 在所有环境中都记录用户选择，防止重复提示
  localStorage.setItem('pwa-install-dismissed', 'true');
};

const showInstallPrompt = () => {
  const dismissed = localStorage.getItem('pwa-install-dismissed');

  // 只检查是否被手动关闭，在生产环境下总是显示
  if (!dismissed) {
    showInstallButton.value = true;
  }
};

onMounted(() => {
  // 调试 PWA 兼容性
  console.log('PWA 兼容性检查:');
  console.log('- Service Worker 支持:', 'serviceWorker' in navigator);
  console.log('- BeforeInstallPromptEvent 支持:', 'BeforeInstallPromptEvent' in window);
  console.log('- HTTPS:', location.protocol === 'https:');
  console.log('- 已在独立模式:', window.matchMedia('(display-mode: standalone)').matches);
  console.log('- Manifest URL:', document.querySelector('link[rel="manifest"]')?.href);
  console.log('- 当前 URL:', location.href);

  // 在所有环境中都延迟显示安装提示，给页面加载时间
  setTimeout(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (!dismissed) {
      showInstallButton.value = true;
      console.log('显示PWA安装按钮');
    } else {
      console.log('PWA安装按钮已被手动关闭，不显示');
    }
  }, 3000); // 延迟3秒显示

  // 监听 beforeinstallprompt 事件
  const handleBeforeInstallPrompt = (e) => {
    console.log('收到 beforeinstallprompt 事件');
    e.preventDefault();
    deferredPrompt.value = e;
    // 如果按钮还没显示，现在显示它
    if (!showInstallButton.value) {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        showInstallButton.value = true;
      }
    }
  };

  // 监听 appinstalled 事件
  const handleAppInstalled = () => {
    console.log('PWA 已安装');
    // 不隐藏按钮，让它一直显示
    // showInstallButton.value = false;
    deferredPrompt.value = null;
    // localStorage.setItem('pwa-installed', 'true');
  };

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  });
});
</script>

<style scoped>
.pwa-install-button {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  margin: 20px 0;
}

.install-icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
}

/* 覆盖AppleButton样式，使其有白色背景 */
:deep(.apple-button.primary) {
  background: white !important;
  color: var(--keyColor) !important;
  border: 1.5px solid var(--keyColor) !important;
  box-shadow: none !important;
}

:deep(.apple-button.primary:hover:not(:disabled)) {
  background: rgba(var(--keyColor-rgb), 0.08) !important;
  transform: none !important;
  box-shadow: none !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .pwa-install-button {
    padding: 12px;
    margin: 16px 0;
  }

  .install-icon {
    width: 14px;
    height: 14px;
    margin-right: 6px;
  }
}
</style>