<template>
  <transition name="slide-up">
    <div
      v-if="showPrompt"
      class="install-prompt"
    >
      <div class="prompt-card">
        <div class="prompt-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill="currentColor"
            />
          </svg>
        </div>
        <h3>安装应用</h3>
        <p>将工作室打卡安装到您的设备，享受更好的体验和离线功能。</p>
        <div class="prompt-actions">
          <button
            class="btn-secondary"
            @click="dismiss"
          >
            稍后
          </button>
          <button
            class="btn-primary"
            @click="install"
          >
            安装
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const showPrompt = ref(false);
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
    // 用户响应安装提示 - removed console.log for production
    deferredPrompt.value = null;
    showPrompt.value = false;

    if (outcome === 'accepted') {
      localStorage.setItem('pwa-installed', 'true');
    }
  } else if (import.meta.env.DEV) {
    // 在开发环境中显示提示信息
    alert('在开发环境中，无法实际安装PWA应用。但在生产环境中，用户会看到浏览器的安装提示。');
    showPrompt.value = false;
  } else {
    // 在生产环境中，检查兼容性并提供相应指导
    const compatible = isPWACompatible();

    if (compatible) {
      alert('您的浏览器支持PWA安装。请尝试刷新页面或清除缓存后重试。\n\n如果仍然无法安装，请尝试：\n1. 在地址栏右侧查找安装图标\n2. 或按 F12 打开开发者工具，查看控制台错误信息');
    } else {
      alert('您的浏览器可能不完全支持PWA安装。请尝试使用以下方法：\n\n1. Chrome/Edge: 在地址栏右侧点击安装图标\n2. Safari: 分享 > 添加到主屏幕\n3. Firefox: 菜单 > 安装此应用\n\n如果您的浏览器不支持PWA，您仍然可以使用网页版应用。');
    }

    showPrompt.value = false;
    localStorage.setItem('pwa-install-dismissed', 'true');
  }
};

const dismiss = () => {
  showPrompt.value = false;
  // 在所有环境中都记录用户选择，防止重复提示
  localStorage.setItem('pwa-install-dismissed', 'true');
};

const showInstallPrompt = () => {
  // 如果已经在 PWA 独立模式下运行，不显示提示
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return;
  }

  // 移除 dismissed 和 installed 检查，让每次刷新都显示提示
  if (import.meta.env.DEV) {
    showPrompt.value = true;
  } else if (deferredPrompt.value) {
    showPrompt.value = true;
  } else {
    // 在生产环境中，即使没有deferredPrompt也显示提示
    showPrompt.value = true;
  }
};

onMounted(() => {
  // PWA 兼容性检查 - removed console.log for production

  // 在所有环境中都延迟显示安装提示，给页面加载时间
  setTimeout(() => {
    showInstallPrompt();
  }, 3000); // 延迟3秒显示

  // 监听 beforeinstallprompt 事件
  const handleBeforeInstallPrompt = (e) => {
    // 收到 beforeinstallprompt 事件 - removed console.log for production
    e.preventDefault();
    deferredPrompt.value = e;
    showInstallPrompt();
  };

  // 监听 appinstalled 事件
  const handleAppInstalled = () => {
    // PWA 已安装 - removed console.log for production
    showPrompt.value = false;
    deferredPrompt.value = null;
    localStorage.setItem('pwa-installed', 'true');
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
/* PWA 安装提示 */
.install-prompt {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: calc(var(--z-web-chrome) + 1);
  max-width: 420px;
  width: calc(100% - 32px);
}

.prompt-card {
  background: var(--systemPrimary-onDark);
  border-radius: var(--global-border-radius-xlarge);
  padding: 24px;
  box-shadow: var(--shadow-large);
  text-align: center;
}

@media (prefers-color-scheme: dark) {
  .prompt-card {
    background: var(--systemQuaternary);
    border: 1px solid var(--systemQuaternary-onDark);
  }
}

.prompt-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, var(--keyColor) 0%, #0051d5 100%);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(var(--keyColor-rgb), 0.3);
}

.prompt-icon svg {
  width: 28px;
  height: 28px;
}

.prompt-card h3 {
  margin: 0 0 8px 0;
  font: var(--title-2-emphasized);
  color: var(--systemPrimary);
}

.prompt-card p {
  margin: 0 0 20px 0;
  font: var(--body);
  color: var(--systemSecondary);
  line-height: 1.5;
}

.prompt-actions {
  display: flex;
  gap: 12px;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: var(--global-border-radius-small);
  font: var(--body-emphasized);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: var(--font-family);
}

.btn-primary {
  background: var(--keyColor);
  color: white;
  box-shadow: 0 2px 8px rgba(var(--keyColor-rgb), 0.3);
}

.btn-primary:hover {
  background: #0051d5;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--keyColor-rgb), 0.4);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-secondary {
  background: var(--systemQuinary);
  color: var(--systemPrimary);
}

.btn-secondary:hover {
  background: var(--systemQuaternary);
}

/* 过渡动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>