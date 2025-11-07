<template>
  <div class="profile">
    <!-- 个人信息卡片 -->
    <AppleCard variant="secondary" class="profile-card">
      <div class="profile-header">
        <div class="avatar">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="5" stroke="currentColor" stroke-width="2"/>
            <path d="M4 21c0-4 3-7 8-7s8 3 8 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <h1>{{ profile?.name }}</h1>
        <p class="role-badge">{{ profile?.role === 'admin' ? '管理员' : '用户' }}</p>
      </div>
    </AppleCard>

    <!-- 信息列表 -->
    <AppleCard class="info-card">
      <div class="info-section">
        <h3>账户信息</h3>
        <div class="info-list">
          <div class="info-item">
            <span class="info-label">邮箱</span>
            <span class="info-value">{{ profile?.email }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">注册时间</span>
            <span class="info-value">{{ formatDate(profile?.createdAt) }}</span>
          </div>
        </div>
      </div>
    </AppleCard>

    <!-- 统计卡片 -->
    <AppleCard class="stats-card">
      <h3>打卡统计</h3>
      <div class="stats-grid">
        <AppleCard variant="elevated" hoverable class="stat-item">
          <div class="stat-content">
            <div class="stat-value">{{ totalRecords }}</div>
            <div class="stat-label">总打卡</div>
          </div>
        </AppleCard>
        <AppleCard variant="elevated" hoverable class="stat-item">
          <div class="stat-content">
            <div class="stat-value">{{ todayRecords }}</div>
            <div class="stat-label">今日打卡</div>
          </div>
        </AppleCard>
      </div>
    </AppleCard>

    <!-- 操作按钮 -->
    <div class="actions">
      <AppleButton 
        variant="secondary" 
        size="large" 
        @click="showChangePwdModal = true"
        class="change-pwd-btn"
      >
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
          <circle cx="12" cy="16" r="1" fill="currentColor"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2"/>
        </svg>
        修改密码
      </AppleButton>
      <AppleButton 
        variant="danger" 
        size="large" 
        @click="logout"
        class="logout-btn"
      >
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        退出登录
      </AppleButton>
    </div>

    <!-- 修改密码模态框 -->
    <Teleport to="body">
      <div v-if="showChangePwdModal" class="modal-overlay" @click.self="closePwdModal">
        <AppleCard class="modal-content">
          <h3>修改密码</h3>
          <form @submit.prevent="changePassword">
            <div class="form-group">
              <label>当前密码</label>
              <input v-model="oldPassword" type="password" required />
            </div>
            <div class="form-group">
              <label>新密码</label>
              <input v-model="newPassword" type="password" required minlength="6" />
            </div>
            <div class="form-group">
              <label>确认新密码</label>
              <input v-model="confirmPassword" type="password" required minlength="6" />
            </div>
            <div class="form-actions">
              <AppleButton variant="primary" type="submit" :disabled="loading">保存</AppleButton>
              <AppleButton variant="secondary" type="button" @click="closePwdModal">取消</AppleButton>
            </div>
            <div v-if="pwdError" class="error-msg">{{ pwdError }}</div>
            <div v-if="pwdSuccess" class="success-msg">{{ pwdSuccess }}</div>
          </form>
        </AppleCard>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';
import { usePunchStore } from '@/store/punch';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '@/services/firebase';
import AppleCard from '@/components/shared/AppleCard.vue';
import AppleButton from '@/components/shared/AppleButton.vue';

export default {
  name: 'Profile',

  components: {
    AppleCard,
    AppleButton
  },

  setup() {
    const router = useRouter();
    const userStore = useUserStore();
    const punchStore = usePunchStore();

    const profile = computed(() => userStore.profile);
    
    // 修改密码相关状态
    const showChangePwdModal = ref(false);
    const oldPassword = ref('');
    const newPassword = ref('');
    const confirmPassword = ref('');
    const loading = ref(false);
    const pwdError = ref('');
    const pwdSuccess = ref('');
    
    // 统计所有的上班打卡次数（只计算 'in' 类型）
    const totalRecords = computed(() => {
      return punchStore.records.filter(r => r.type === 'in').length;
    });
    
    // 统计今天的上班打卡次数（只计算 'in' 类型）
    const todayRecords = computed(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return punchStore.records.filter(record => {
        const recordDate = new Date(record.timestamp);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate.getTime() === today.getTime() && record.type === 'in';
      }).length;
    });

    const formatDate = (timestamp) => {
      if (!timestamp) return '-';
      return new Date(timestamp).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const logout = async () => {
      await userStore.logout();
      router.push('/login');
    };

    // 修改密码相关函数
    const closePwdModal = () => {
      showChangePwdModal.value = false;
      oldPassword.value = '';
      newPassword.value = '';
      confirmPassword.value = '';
      pwdError.value = '';
      pwdSuccess.value = '';
    };

    const changePassword = async () => {
      pwdError.value = '';
      pwdSuccess.value = '';
      
      // 验证新密码一致性
      if (newPassword.value !== confirmPassword.value) {
        pwdError.value = '新密码和确认密码不一致';
        return;
      }
      
      if (newPassword.value.length < 6) {
        pwdError.value = '新密码至少需要6个字符';
        return;
      }
      
      loading.value = true;
      
      try {
        const user = auth.currentUser;
        if (!user || !user.email) {
          throw new Error('用户未登录');
        }
        
        // 先用旧密码重新认证
        const credential = EmailAuthProvider.credential(user.email, oldPassword.value);
        await reauthenticateWithCredential(user, credential);
        
        // 重新认证成功后，更新密码
        await updatePassword(user, newPassword.value);
        
        pwdSuccess.value = '密码修改成功';
        setTimeout(() => {
          closePwdModal();
        }, 1500);
        
      } catch (error) {
        console.error('修改密码失败:', error);
        if (error.code === 'auth/wrong-password') {
          pwdError.value = '当前密码错误';
        } else if (error.code === 'auth/weak-password') {
          pwdError.value = '新密码强度不足';
        } else {
          pwdError.value = error.message || '修改密码失败';
        }
      } finally {
        loading.value = false;
      }
    };

    onMounted(async () => {
      await punchStore.loadRecords(userStore.userId);
    });

    return {
      profile,
      totalRecords,
      todayRecords,
      formatDate,
      logout,
      showChangePwdModal,
      oldPassword,
      newPassword,
      confirmPassword,
      loading,
      pwdError,
      pwdSuccess,
      closePwdModal,
      changePassword
    };
  }
};
</script>

<style scoped>
.profile {
  max-width: 600px;
  margin: 0 auto;
  padding: 0 var(--bodyGutter) 40px;
}

/* 个人信息卡片 */
.profile-card {
  margin: 20px 0;
}

.profile-header {
  text-align: center;
}

.avatar {
  width: 100px;
  height: 100px;
  margin: 0 auto 20px;
  background: var(--systemQuaternary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid var(--systemQuinary);
}

.avatar svg {
  width: 50px;
  height: 50px;
  color: var(--systemSecondary);
}

.profile-header h1 {
  margin: 0 0 12px 0;
  font: var(--largeTitle-emphasized);
  color: var(--systemPrimary);
  letter-spacing: -0.5px;
}

.role-badge {
  display: inline-block;
  margin: 0;
  padding: 6px 16px;
  background: var(--systemQuaternary);
  border-radius: 16px;
  font: var(--body-emphasized);
  color: var(--systemPrimary);
}

/* 信息卡片 */
.info-card {
  margin-bottom: 16px;
}

.info-section {
  padding: 24px;
}

.info-section h3 {
  margin: 0 0 20px 0;
  font: var(--title-3-emphasized);
  color: var(--systemPrimary);
}

.info-list {
  display: flex;
  flex-direction: column;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 0.5px solid var(--systemFill);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font: var(--body-emphasized);
  color: var(--systemPrimary);
}

.info-value {
  font: var(--body);
  color: var(--systemSecondary);
  text-align: right;
}

/* 统计卡片 */
.stats-card {
  padding: 24px;
  margin-bottom: 16px;
}

.stats-card h3 {
  margin: 0 0 20px 0;
  font: var(--title-3-emphasized);
  color: var(--systemPrimary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 20px;
  text-align: center;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--keyColor) 0%, #0051d5 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.stat-icon.today {
  background: linear-gradient(135deg, var(--systemGreen) 0%, #248a3d 100%);
}

.stat-icon svg {
  width: 24px;
  height: 24px;
}

.stat-content {
  flex: 1;
  text-align: center;
}

.stat-value {
  font: var(--title-1-emphasized);
  color: var(--systemPrimary);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font: var(--caption-1);
  color: var(--systemSecondary);
}

/* 操作按钮 */
.actions {
  margin-top: 24px;
}

.logout-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.logout-btn svg {
  width: 20px;
  height: 20px;
}

.change-pwd-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
}

.change-pwd-btn svg {
  width: 20px;
  height: 20px;
}

/* 响应式 */
@media (max-width: 480px) {
  .profile {
    padding: 0 16px 32px;
  }

  .profile-card {
    margin: 16px 0;
  }

  .avatar {
    width: 80px;
    height: 80px;
  }

  .avatar svg {
    width: 40px;
    height: 40px;
  }

  .profile-header h1 {
    font: var(--title-1-emphasized);
  }

  .role-badge {
    font: var(--footnote);
  }

  .info-card,
  .stats-card {
    padding: 16px;
  }

  .info-section h3,
  .stats-card h3 {
    font: var(--body-emphasized);
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .stat-item {
    padding: 14px;
  }

  .stat-value {
    font: var(--title-1-emphasized);
  }

  .stat-label {
    font: var(--caption-1);
  }
}

/* 修改密码模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  width: 100%;
  max-width: 400px;
  padding: 32px;
}

.modal-content h3 {
  margin: 0 0 24px 0;
  font: var(--title-2-emphasized);
  color: var(--systemPrimary);
  text-align: center;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font: var(--body-emphasized);
  color: var(--systemPrimary);
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--systemFill);
  border-radius: var(--global-border-radius-medium);
  font: var(--body);
  background: white;
  color: var(--systemPrimary);
  transition: all 0.2s var(--ease-out);
}

.form-group input:focus {
  outline: none;
  border-color: var(--keyColor);
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.form-actions button {
  flex: 1;
}

.error-msg {
  margin-top: 16px;
  padding: 12px;
  background: var(--systemRed-light);
  color: var(--systemRed);
  border-radius: var(--global-border-radius-medium);
  font: var(--caption-1);
  text-align: center;
}

.success-msg {
  margin-top: 16px;
  padding: 12px;
  background: var(--systemGreen-light);
  color: var(--systemGreen);
  border-radius: var(--global-border-radius-medium);
  font: var(--caption-1);
  text-align: center;
}
</style>
