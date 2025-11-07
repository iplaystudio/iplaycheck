<template>
  <div id="app" class="app-container">
    <div v-if="isAuthenticated" class="app-layout">
      <nav class="app-nav glass">
        <div class="nav-container">
          <div class="nav-brand">
            <span class="brand-text">工作室打卡</span>
          </div>
          
          <div class="nav-menu">
            <router-link to="/" class="nav-link" exact-active-class="active">
              <svg viewBox="0 0 24 24" fill="none" class="nav-icon">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>首页</span>
            </router-link>
            <router-link to="/punch" class="nav-link" exact-active-class="active">
              <svg viewBox="0 0 24 24" fill="none" class="nav-icon">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>打卡</span>
            </router-link>
            <router-link v-if="isAdmin" to="/admin" class="nav-link" exact-active-class="active">
              <svg viewBox="0 0 24 24" fill="none" class="nav-icon">
                <rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <rect x="14" y="3" width="7" height="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <rect x="14" y="14" width="7" height="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>管理</span>
            </router-link>
            <router-link to="/profile" class="nav-link" exact-active-class="active">
              <svg viewBox="0 0 24 24" fill="none" class="nav-icon">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>我的</span>
            </router-link>
          </div>
        </div>
      </nav>

      <!-- 主内容区 -->
      <main class="app-main">
        <div class="main-container">
          <router-view />
        </div>
      </main>
    </div>

    <!-- 未登录显示登录页 -->
    <router-view v-else />

    <!-- PWA安装提示 -->
    <PWAInstallPrompt />
  </div>
</template>

<script>
import { computed } from 'vue';
import { useUserStore } from '@/store/user';
import syncService from '@/services/sync';
import { requestNotificationPermission } from '@/services/firebase';
import PWAInstallPrompt from '@/components/shared/PWAInstallPrompt.vue';

export default {
  name: 'App',

  components: {
    PWAInstallPrompt
  },

  setup() {
    const userStore = useUserStore();

    const isAuthenticated = computed(() => userStore.isAuthenticated);
    const isAdmin = computed(() => userStore.isAdmin);

    // 初始化应用
    const initApp = async () => {
      // 初始化认证
      await userStore.initAuth();

      // 启动自动同步
      if (userStore.isAuthenticated) {
        syncService.startAutoSync(60000); // 每分钟同步一次

        // 请求通知权限
        try {
          await requestNotificationPermission();
        } catch (error) {
          console.error('通知权限请求失败:', error);
        }
      }
    };

    // 页面加载时初始化
    if (typeof window !== 'undefined') {
      initApp();
    }

    return {
      isAuthenticated,
      isAdmin
    };
  }
};
</script>

<style>
/* 导入 Apple 设计系统 */
@import '@/styles/apple-design-system.css';

/* App容器 */
.app-container {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

/* 导航栏样式 */
.app-nav {
  position: sticky;
  top: 0;
  z-index: var(--z-web-chrome);
  border-bottom: 0.5px solid var(--defaultLine);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.nav-container {
  max-width: 1680px;
  margin: 0 auto;
  padding: 0 var(--bodyGutter);
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font: var(--title-3-emphasized);
  color: var(--keyColor);
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.nav-brand:hover {
  opacity: 0.8;
}

.brand-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.brand-text {
  font: var(--title-3-emphasized);
}

.nav-menu {
  display: flex;
  gap: 4px;
  align-items: center;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--global-border-radius-small);
  font: var(--body-semibold-tall);
  color: var(--systemPrimary);
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  white-space: nowrap;
}

.nav-link .nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-link:hover {
  background: var(--systemQuaternary);
  text-decoration: none;
}

.nav-link.active {
  background: rgba(var(--keyColor-rgb), 0.12);
  color: var(--keyColor);
}

/* 主内容区 */
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.main-container {
  flex: 1;
  max-width: 1680px;
  width: 100%;
  margin: 0 auto;
  padding: 24px var(--bodyGutter);
}

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

/* 响应式调整 */
@media (max-width: 767px) {
  .nav-container {
    height: 52px;
  }

  .nav-brand {
    font-size: 18px;
  }

  .brand-icon {
    width: 24px;
    height: 24px;
  }
  
  .brand-text {
    display: none;
  }

  .nav-menu {
    gap: 2px;
  }

  .nav-link {
    padding: 6px 12px;
    font-size: 14px;
  }
  
  .nav-link span {
    display: none;
  }
  
  .nav-link .nav-icon {
    width: 22px;
    height: 22px;
  }

  .main-container {
    padding: 16px var(--bodyGutter);
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .nav-link span {
    font-size: 15px;
  }
}
</style>

