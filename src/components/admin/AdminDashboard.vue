<template>
  <div class="admin-dashboard">
    <div class="dashboard-header">
      <h1>管理员控制台</h1>
      <div class="header-actions">
        <AppleButton
          variant="danger"
          size="medium"
          fullWidth
          @click="showClearConfirm = true"
        >
          清空记录
        </AppleButton>
        <AppleButton
          variant="primary"
          size="medium"
          :disabled="loading"
          :loading="loading"
          fullWidth
          @click="refreshData"
        >
          刷新
        </AppleButton>
      </div>
    </div>

    <div class="dashboard-stats">
      <AppleCard
        class="stat-card"
        hoverable
      >
        <div class="stat-content">
          <div class="stat-icon users">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">
              {{ stats.totalUsers }}
            </div>
            <div class="stat-label">
              总用户数
            </div>
          </div>
        </div>
      </AppleCard>

      <AppleCard
        class="stat-card"
        hoverable
      >
        <div class="stat-content">
          <div class="stat-icon records">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">
              {{ stats.totalRecords }}
            </div>
            <div class="stat-label">
              总打卡记录
            </div>
          </div>
        </div>
      </AppleCard>

      <AppleCard
        class="stat-card"
        hoverable
      >
        <div class="stat-content">
          <div class="stat-icon today">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" />
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">
              {{ stats.todayRecords }}
            </div>
            <div class="stat-label">
              今日上班打卡人数
            </div>
          </div>
        </div>
      </AppleCard>

      <AppleCard
        class="stat-card"
        hoverable
      >
        <div class="stat-content">
          <div class="stat-icon pending">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z" />
            </svg>
          </div>
          <div class="stat-info">
            <div class="stat-value">
              {{ stats.pendingSync }}
            </div>
            <div class="stat-label">
              待同步
            </div>
          </div>
        </div>
      </AppleCard>
    </div>

    <div class="dashboard-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <AppleCard class="dashboard-content">
      <RecordsList v-if="activeTab === 'records'" />
      <UserManagement v-if="activeTab === 'users'" />
      <AnnouncementsManagement v-if="activeTab === 'announcements'" />
      <DataAnalytics v-if="activeTab === 'analytics'" />
    </AppleCard>

    <div
      v-if="loading"
      class="loading-overlay"
    >
      <AppleLoading
        size="large"
        text="加载中..."
      />
    </div>

    <!-- 清空确认对话框 -->
    <Teleport to="body">
      <div
        v-if="showClearConfirm"
        class="modal-overlay"
        @click="showClearConfirm = false"
      >
        <AppleCard
          class="modal-card confirm-modal"
          @click.stop
        >
          <div class="modal-header">
            <h3>确认清空所有记录</h3>
          </div>
          <div class="modal-body">
            <p class="warning-text">
              ⚠️ 此操作将清空所有打卡记录数据，包括：
            </p>
            <ul class="warning-list">
              <li>所有用户的打卡记录</li>
              <li>Supabase 云端数据</li>
              <li>本地 IndexedDB 数据</li>
            </ul>
            <p class="warning-text danger">
              此操作不可恢复！请谨慎操作！
            </p>
          </div>
          <div class="modal-actions">
            <AppleButton 
              variant="secondary" 
              :disabled="clearing"
              @click="showClearConfirm = false"
            >
              取消
            </AppleButton>
            <AppleButton 
              variant="danger" 
              :disabled="clearing"
              @click="clearAllRecords"
            >
              {{ clearing ? '清空中...' : '确认清空' }}
            </AppleButton>
          </div>
        </AppleCard>
      </div>
    </Teleport>

    <!-- 成功提示 -->
    <AppleToast
      :visible="showSuccessToast"
      type="success"
      message="所有记录已成功清空"
      @update:visible="showSuccessToast = $event"
    />

    <!-- 错误提示 -->
    <AppleToast
      :visible="showErrorToast"
      type="error"
      :message="errorMessage"
      @update:visible="showErrorToast = $event"
    />
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue';
import { supabase } from '@/services/supabase';
import { getDBStats, clearAllData } from '@/services/indexedDB';
import AppleButton from '@/components/shared/AppleButton.vue';
import AppleCard from '@/components/shared/AppleCard.vue';
import AppleLoading from '@/components/shared/AppleLoading.vue';
import AppleToast from '@/components/shared/AppleToast.vue';
import RecordsList from './RecordsList.vue';
import UserManagement from './UserManagement.vue';
import AnnouncementsManagement from './AnnouncementsManagement.vue';
import DataAnalytics from './DataAnalytics.vue';

export default {
  name: 'AdminDashboard',

  components: {
    AppleButton,
    AppleCard,
    AppleLoading,
    AppleToast,
    RecordsList,
    UserManagement,
    AnnouncementsManagement,
    DataAnalytics
  },

  setup() {
    const loading = ref(false);
    const activeTab = ref('records');
    const showClearConfirm = ref(false);
    const clearing = ref(false);
    const showSuccessToast = ref(false);
    const showErrorToast = ref(false);
    const errorMessage = ref('');

    const tabs = [
      { id: 'records', label: '打卡记录' },
      { id: 'users', label: '用户管理' },
      { id: 'announcements', label: '公告管理' },
      { id: 'analytics', label: '数据分析' }
    ];

    const stats = reactive({
      totalUsers: 0,
      totalRecords: 0,
      todayRecords: 0,
      pendingSync: 0
    });

    const loadStats = async () => {
      loading.value = true;

      try {
        // 获取用户统计
        const { count: userCount, error: userError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        if (userError) throw userError;
        stats.totalUsers = userCount || 0;

        // 获取记录统计
        const { count: recordCount, error: recordError } = await supabase
          .from('punch_records')
          .select('*', { count: 'exact', head: true });

        if (recordError) throw recordError;
        stats.totalRecords = recordCount || 0;

        // 获取今日上班打卡人数（去重）
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { data: todayRecords, error: todayError } = await supabase
          .from('punch_records')
          .select('user_id, type')
          .gte('timestamp', today.toISOString());

        if (todayError) throw todayError;

        // 只统计上班打卡的不同用户
        const todayPunchInUsers = new Set();
        todayRecords.forEach(record => {
          if (record.type === 'in') {
            todayPunchInUsers.add(record.user_id);
          }
        });
        stats.todayRecords = todayPunchInUsers.size;

        // 获取待同步记录
        const dbStats = await getDBStats();
        stats.pendingSync = dbStats.pendingSync;
      } catch (error) {
        console.error('Load stats error:', error);
      } finally {
        loading.value = false;
      }
    };

    const refreshData = async () => {
      await loadStats();
    };

    // 清空所有记录
    const clearAllRecords = async () => {
      clearing.value = true;
      
      try {
        // 1. 清空 Supabase 中的所有打卡记录
        const { error: deleteError } = await supabase
          .from('punch_records')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // 删除所有记录

        if (deleteError) throw deleteError;

        // 2. 清空本地 IndexedDB
        await clearAllData();

        // 3. 关闭对话框
        showClearConfirm.value = false;

        // 4. 显示成功提示
        showSuccessToast.value = true;

        // 5. 刷新统计数据
        await loadStats();
      } catch (error) {
        console.error('Clear records error:', error);
        errorMessage.value = '清空记录失败: ' + error.message;
        showErrorToast.value = true;
      } finally {
        clearing.value = false;
      }
    };

    onMounted(() => {
      loadStats();
    });

    return {
      loading,
      activeTab,
      tabs,
      stats,
      refreshData,
      showClearConfirm,
      clearing,
      clearAllRecords,
      showSuccessToast,
      showErrorToast,
      errorMessage
    };
  }
};
</script>

<style scoped>
.admin-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--bodyGutter);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.dashboard-header h1 {
  margin: 0;
  font: var(--largeTitle-emphasized);
  color: var(--systemPrimary);
}

.header-actions {
  display: flex;
  gap: 12px;
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  transition: transform 0.3s var(--ease-out);
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px;
}

.stat-icon {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon svg {
  width: 32px;
  height: 32px;
}

.stat-icon.users {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-icon.records {
  background: linear-gradient(135deg, var(--keyColor) 0%, #00d4ff 100%);
  color: white;
}

.stat-icon.today {
  background: linear-gradient(135deg, var(--systemGreen) 0%, #00b894 100%);
  color: white;
}

.stat-icon.pending {
  background: linear-gradient(135deg, var(--systemOrange) 0%, #fdcb6e 100%);
  color: white;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font: var(--largeTitle-emphasized);
  color: var(--systemPrimary);
  margin-bottom: 2px;
  line-height: 1;
}

.stat-label {
  font: var(--caption-1);
  color: var(--systemSecondary);
}

.dashboard-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  padding: 4px;
  background: var(--systemFill);
  border-radius: var(--global-border-radius-medium);
  width: fit-content;
}

.tab-btn {
  padding: 8px 20px;
  border: none;
  background: transparent;
  cursor: pointer;
  font: var(--body);
  color: var(--systemSecondary);
  border-radius: calc(var(--global-border-radius-medium) - 2px);
  transition: all 0.2s var(--ease-out);
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--systemPrimary);
}

.tab-btn.active {
  background: white;
  color: var(--keyColor);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.dashboard-content {
  min-height: 400px;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* 确认对话框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(10px);
}

.modal-card.confirm-modal {
  max-width: 500px;
  width: 90%;
  padding: 0;
  animation: slideUp 0.3s ease-out;
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid var(--defaultLine);
}

.modal-header h3 {
  margin: 0;
  font: var(--title-3-emphasized);
  color: var(--systemPrimary);
}

.modal-body {
  padding: 24px;
}

.warning-text {
  margin: 0 0 16px 0;
  font: var(--body);
  color: var(--systemPrimary);
}

.warning-text.danger {
  color: var(--systemRed);
  font: var(--body-emphasized);
  margin-top: 16px;
}

.warning-list {
  margin: 12px 0;
  padding-left: 20px;
  font: var(--body);
  color: var(--systemSecondary);
}

.warning-list li {
  margin: 8px 0;
}

.modal-actions {
  padding: 16px 24px;
  border-top: 1px solid var(--defaultLine);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
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

@media (max-width: 768px) {
  .admin-dashboard {
    padding: 16px;
  }

  .dashboard-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .dashboard-header h1 {
    font: var(--title-1-emphasized);
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
    gap: 8px;
  }

  .dashboard-stats {
    grid-template-columns: 1fr;
  }

  .stat-content {
    padding: 12px;
  }

  .stat-icon {
    width: 48px;
    height: 48px;
  }

  .stat-icon svg {
    width: 28px;
    height: 28px;
  }

  .stat-value {
    font: var(--title-1-emphasized);
  }

  .dashboard-tabs {
    width: 100%;
    flex-wrap: wrap;
  }

  .tab-btn {
    flex: 1;
    min-width: 100px;
  }

  .modal-card.confirm-modal {
    width: 95%;
    max-width: none;
  }
}
</style>
