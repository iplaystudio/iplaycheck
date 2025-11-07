<template>
  <transition name="slide-up">
    <div v-if="showPrompt" class="install-prompt">
      <div class="prompt-card">
        <div class="prompt-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
          </svg>
        </div>
        <h3>安装应用</h3>
        <p>将工作室打卡安装到您的设备，享受更好的体验和离线功能。</p>
        <div class="prompt-actions">
          <button class="btn-secondary" @click="dismiss">稍后</button>
          <button class="btn-primary" @click="install">安装</button>
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
  if (deferredPrompt.value) {
    deferredPrompt.value.prompt();
    const { outcome } = await deferredPrompt.value.userChoice;
    console.log(`用户响应安装提示: ${outcome}`);
    deferredPrompt.value = null;
    showPrompt.value = false;
  }
};

const dismiss = () => {
  showPrompt.value = false;
  localStorage.setItem('pwa-install-dismissed', 'true');
};

const showInstallPrompt = () => {
  const dismissed = localStorage.getItem('pwa-install-dismissed');
  if (!dismissed && deferredPrompt.value) {
    showPrompt.value = true;
  }
};

onMounted(() => {
  // 监听 beforeinstallprompt 事件
  const handleBeforeInstallPrompt = (e) => {
    e.preventDefault();
    deferredPrompt.value = e;
    showInstallPrompt();
  };

  // 监听 appinstalled 事件
  const handleAppInstalled = () => {
    console.log('PWA 已安装');
    showPrompt.value = false;
    deferredPrompt.value = null;
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