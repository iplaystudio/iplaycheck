<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-card">
        <!-- Logo 区域 -->
        <div class="login-logo">
          <div class="logo-icon">
            <img v-if="webIconSrc" :src="webIconSrc" alt="打卡" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block;" />
            <div v-else style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.9);">📱</div>
          </div>
          <h1>打卡</h1>
          <p class="subtitle">
            登录你的账户
          </p>
        </div>

        <!-- 登录表单 -->
        <form
          class="auth-form"
          @submit.prevent="handleLogin"
        >
          <div class="input-group">
            <label for="login-email">邮箱</label>
            <input
              id="login-email"
              v-model="email"
              type="email"
              placeholder="your@email.com"
              required
              autocomplete="email"
              autofocus
            >
          </div>

          <div class="input-group">
            <label for="login-password">密码</label>
            <div class="input-with-icon">
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="至少6位"
                required
                minlength="6"
              >
              <button
                type="button"
                class="password-toggle password-toggle--icon"
                @click="showPassword = !showPassword"
                :aria-pressed="showPassword"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              >
                <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M17.94 17.94A10.27 10.27 0 0 1 12 20c-7 0-11-8-11-8 1.73-3.2 4.21-5.72 7.06-7.06"></path>
                  <path d="M1 1l22 22"></path>
                  <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24"></path>
                </svg>
              </button>
            </div>
          </div>

          <div
            v-if="error"
            class="error-alert"
          >
            {{ error }}
          </div>

          <AppleButton
            type="submit"
            :loading="loading"
            variant="primary"
            size="large"
            fullWidth
            :disabled="loading"
          >
            登录
          </AppleButton>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import AppleButton from '@/components/shared/AppleButton.vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';

export default {
  components: { AppleButton },
  setup() {
    const email = ref('');
    const password = ref('');
    const showPassword = ref(false);
    const loading = ref(false);
    const error = ref('');

    const router = useRouter();
    const userStore = useUserStore();

    const handleLogin = async () => {
      if (!email.value || !password.value) {
        error.value = '请填写完整信息';
        return;
      }

      try {
        loading.value = true;
        error.value = '';
        await userStore.login(email.value, password.value);
        router.push('/');
      } catch (err) {
        // 登录失败 - 调试信息已移除
        error.value = err.message || '登录失败,请重试';
      } finally {
        loading.value = false;
      }
    };

    const webIconSrc = ref(null);

    // Directly use the user's image in public/icon.png, but respect Vite base in production
    const loadWebIcon = () => {
      const base = import.meta.env.BASE_URL || '/'
      // remove trailing slash then add one to ensure single slash
      const normalizedBase = base.replace(/\/$/, '')
      webIconSrc.value = `${normalizedBase}/icon-512.png`
    }

    loadWebIcon();

    return {
      email,
      password,
      loading,
      error,
      showPassword,
      handleLogin,
      webIconSrc,
    };
  }
};
</script>

<style scoped>
/* Apple 风格设计系统 */
:root {
  --apple-blue: #007aff;
  --apple-red: #ff3b30;
  --apple-green: #34c759;
  --apple-gray: #8e8e93;
  --apple-gray2: #aeaeb2;
  --apple-gray3: #c7c7cc;
  --apple-gray4: #d1d1d6;
  --apple-gray5: #e5e5ea;
  --apple-gray6: #f2f2f7;
  --system-background: #ffffff;
  --secondary-background: #f2f2f7;
  --tertiary-background: #ffffff;
  --grouped-background: #f2f2f7;
  --label-primary: rgba(0, 0, 0, 0.88);
  --label-secondary: rgba(0, 0, 0, 0.56);
  --label-tertiary: rgba(0, 0, 0, 0.28);
  --separator: rgba(60, 60, 67, 0.29);
  --fill-primary: rgba(120, 120, 128, 0.2);
  --fill-secondary: rgba(120, 120, 128, 0.16);
  --fill-tertiary: rgba(118, 118, 128, 0.12);
}

@media (prefers-color-scheme: dark) {
  :root {
    --apple-blue: #0a84ff;
    --apple-red: #ff453a;
    --apple-green: #30d158;
    --system-background: #000000;
    --secondary-background: #1c1c1e;
    --tertiary-background: #2c2c2e;
    --grouped-background: #000000;
    --label-primary: rgba(255, 255, 255, 0.92);
    --label-secondary: rgba(235, 235, 245, 0.6);
    --label-tertiary: rgba(235, 235, 245, 0.3);
    --separator: rgba(84, 84, 88, 0.6);
    --fill-primary: rgba(120, 120, 128, 0.36);
    --fill-secondary: rgba(120, 120, 128, 0.32);
    --fill-tertiary: rgba(118, 118, 128, 0.24);
  }
}

/* 页面布局 */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--grouped-background);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.login-container {
  width: 100%;
  max-width: 380px;
}

/* 卡片样式 */
.login-card {
  background: var(--surface);
  border-radius: 18px;
  padding: 44px 32px 32px;
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 8px 16px rgba(0, 0, 0, 0.08);
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.password-toggle {
  padding: 6px 10px !important; /* override default small padding */
  min-height: 28px !important;
  font-size: 13px !important;
}

.password-toggle--icon svg {
  display: block;
  width: 14px;
  height: 14px;
  /* vertical alignment controlled by flexbox */
}

.password-toggle--icon {
  padding: 4px !important;
  min-width: 34px;
  min-height: 32px; /* ensure we match AppleButton.small min height */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent !important;
  border: none !important;
  color: var(--systemSecondary);
  overflow: visible; /* ensure svg not clipped */
  line-height: 1;
}

/* place the toggle inside the input */
.input-with-icon {
  position: relative;
}

.input-with-icon input {
  padding-right: 46px; /* leave space for icon */
}

.password-toggle {
  position: absolute !important;
  right: 8px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  padding: 6px !important;
  width: 34px !important;
  height: 34px !important;
  border-radius: 8px !important;
  background: transparent !important;
  border: none !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
}

.password-toggle:focus {
  outline: 2px solid rgba(var(--keyColor-rgb), 0.12);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Logo 区域 */
.login-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
  text-align: center;
}

.logo-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, var(--apple-blue) 0%, #0051d5 100%);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 
    0 2px 8px rgba(0, 122, 255, 0.25),
    0 8px 24px rgba(0, 122, 255, 0.15);
}

.logo-icon svg {
  width: 36px;
  height: 36px;
}

.login-logo h1 {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--label-primary);
}

.subtitle {
  margin: 0;
  font-size: 15px;
  font-weight: 400;
  color: var(--label-secondary);
}

/* 表单样式 */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-size: 13px;
  font-weight: 600;
  color: var(--label-primary);
  padding-left: 4px;
}

.input-group input {
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid var(--separator);
  border-radius: 10px;
  font-size: 16px;
  color: var(--label-primary);
  background: var(--surface);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
  font-family: inherit;
  -webkit-appearance: none;
  appearance: none;
}

.input-group input:focus {
  outline: none;
  border-color: var(--apple-blue);
  box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1);
}

.input-group input::placeholder {
  color: var(--label-tertiary);
}

/* 错误提示 */
.error-alert {
  padding: 12px 16px;
  background: rgba(255, 59, 48, 0.08);
  border: 1.5px solid rgba(255, 59, 48, 0.2);
  border-radius: 10px;
  color: var(--apple-red);
  font-size: 14px;
  font-weight: 500;
  animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

@keyframes shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-6px); }
  40%, 60% { transform: translateX(6px); }
}

/* 提交按钮 */
.btn-primary {
  width: 100%;
  padding: 14px 24px;
  margin-top: 8px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: var(--apple-blue);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.08),
    0 4px 12px rgba(0, 122, 255, 0.25);
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary:hover:not(:disabled) {
  background: #0051d5;
  transform: translateY(-1px);
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.12),
    0 8px 20px rgba(0, 122, 255, 0.3);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.08),
    0 4px 12px rgba(0, 122, 255, 0.2);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* 加载动画 */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 底部提示 */
.login-footer {
  margin-top: 24px;
  text-align: center;
}

.tip {
  font-size: 12px;
  color: var(--label-tertiary);
  margin: 0;
}

/* 响应式 */
@media (max-width: 480px) {
  .login-card {
    padding: 36px 24px 24px;
  }
  
  .login-logo h1 {
    font-size: 28px;
  }
  
  .logo-icon {
    width: 64px;
    height: 64px;
  }
  
  .logo-icon svg {
    width: 32px;
    height: 32px;
  }
}

/* 暗黑模式优化 */
@media (prefers-color-scheme: dark) {
  .login-card {
    box-shadow: 
      0 1px 2px rgba(0, 0, 0, 0.2),
      0 8px 16px rgba(0, 0, 0, 0.4);
  }
  
  .btn-primary {
    box-shadow: 
      0 1px 2px rgba(0, 0, 0, 0.3),
      0 4px 12px rgba(10, 132, 255, 0.4);
  }
  
  .btn-primary:hover:not(:disabled) {
    box-shadow: 
      0 2px 4px rgba(0, 0, 0, 0.4),
      0 8px 20px rgba(10, 132, 255, 0.5);
  }
}
</style>
