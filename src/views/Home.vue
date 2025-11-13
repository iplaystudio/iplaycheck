<template>
  <div class="home">
    <!-- 欢迎区域 -->
    <div class="welcome-section">
      <div class="welcome-content">
        <h1>欢迎回来</h1>
        <p class="user-name">
          {{ userName }}
        </p>
      </div>
    </div>

    <!-- 公告区域 -->
    <Announcements />

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <AppleCard 
        v-for="action in actions" 
        :key="action.to"
        class="action-card" 
        hoverable
        clickable
        @click="$router.push(action.to)"
      >
        <div class="card-content">
          <h3>{{ action.title }}</h3>
          <p>{{ action.description }}</p>
        </div>
        <div class="card-arrow">
          <svg
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M9 18l6-6-6-6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
      </AppleCard>
    </div>

    <!-- 信息区域 -->
    <div class="info-section">
      <AppleCard class="info-card">
        <h3>系统状态</h3>
        <div class="status-list">
          <div class="status-item">
            <span class="status-label">网络</span>
            <div class="status-value">
              <span :class="['status-dot', isOnline ? 'online' : 'offline']" />
              <span>{{ isOnline ? '在线' : '离线' }}</span>
            </div>
          </div>
        </div>
      </AppleCard>

      <AppleCard class="info-card">
        <h3>使用提示</h3>
        <ul class="guide-list">
          <li>每天上班前打卡记录时间</li>
          <li>支持离线打卡自动同步</li>
          <li>打卡时需拍照确认</li>
          <li>可记录统计工时</li>
        </ul>
      </AppleCard>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/store/user'
import { usePunchStore } from '@/store/punch'
import AppleCard from '@/components/shared/AppleCard.vue'
import Announcements from '@/components/shared/Announcements.vue'

const userStore = useUserStore()
const punchStore = usePunchStore()

const isOnline = ref(navigator.onLine)
const pendingSync = ref(0)

const userName = computed(() => userStore.userName)
const isAdmin = computed(() => userStore.isAdmin)

// 动态生成操作卡片
const actions = computed(() => {
  const baseActions = [
    {
      to: '/punch',
      title: '工作室打卡',
      description: '上班打卡、下班打卡'
    }
  ]

  if (isAdmin.value) {
    baseActions.push({
      to: '/admin',
      title: '管理',
      description: '查看记录、数据分析'
    })
  }

  baseActions.push({
    to: '/profile',
    title: '个人中心',
    description: '个人信息、历史记录'
  })

  return baseActions
})

const updateOnlineStatus = () => {
  isOnline.value = navigator.onLine
}

const loadPendingSync = async () => {
  try {
    pendingSync.value = await punchStore.getUnsyncedCount()
  } catch (error) {
    console.error('加载待同步数据失败:', error)
    pendingSync.value = 0
  }
}

onMounted(async () => {
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
  await loadPendingSync()
})

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--bodyGutter) 40px;
}

/* 欢迎区域 */
.welcome-section {
  padding: 60px 0 40px;
  text-align: center;
}

.welcome-content h1 {
  margin: 0 0 12px 0;
  font: var(--largeTitle-emphasized);
  color: var(--systemPrimary);
}

.user-name {
  margin: 0;
  font: var(--title-1-emphasized);
  color: var(--keyColor);
}

/* 快捷操作卡片 */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 40px;
}

.action-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s var(--ease-out);
  text-align: center;
}

.card-content {
  flex: 1;
  text-align: center;
}

.card-content h3 {
  margin: 0 0 4px 0;
  font: var(--title-3-emphasized);
  color: var(--systemPrimary);
}

.card-content p {
  margin: 0;
  font: var(--body);
  color: var(--systemSecondary);
}

.card-arrow {
  width: 24px;
  height: 24px;
  color: var(--systemTertiary);
  flex-shrink: 0;
}

.card-arrow svg {
  width: 100%;
  height: 100%;
}

/* 信息区域 */
.info-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.info-card {
  padding: 24px;
}

.info-card h3 {
  margin: 0 0 20px 0;
  font: var(--title-3-emphasized);
  color: var(--systemPrimary);
}

/* 状态列表 */
.status-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 0.5px solid var(--systemFill);
}

.status-item:last-child {
  border-bottom: none;
}

.status-label {
  font: var(--body-emphasized);
  color: var(--systemPrimary);
}

.status-value {
  display: flex;
  align-items: center;
  gap: 8px;
  font: var(--body);
  color: var(--systemSecondary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: var(--systemGreen);
  box-shadow: 0 0 0 2px rgba(52, 199, 89, 0.2);
}

.status-dot.offline {
  background: var(--systemGray);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  border-radius: 12px;
  background: var(--keyColor);
  color: white;
  font: var(--caption-1-emphasized);
}

/* 使用指南 */
.guide-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guide-list li {
  position: relative;
  padding-left: 24px;
  font: var(--body);
  line-height: 1.6;
  color: var(--systemSecondary);
}

.guide-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--keyColor);
}

/* 响应式 */
@media (max-width: 768px) {
  .home {
    padding: 0 16px 32px;
  }

  .welcome-section {
    padding: 40px 0 32px;
  }

  .welcome-content h1 {
    font: var(--title-1-emphasized);
  }

  .user-name {
    font: var(--title-3);
  }

  .quick-actions {
    gap: 12px;
  }

  .action-card {
    padding: 16px;
  }

  .card-content h3 {
    font: var(--body-emphasized);
  }

  .card-content p {
    font: var(--caption-1);
  }

  .info-section {
    gap: 12px;
  }

  .info-card {
    padding: 16px;
  }

  .info-card h3 {
    font: var(--body-emphasized);
    margin-bottom: 12px;
  }
}

@media (max-width: 480px) {
  .welcome-section {
    padding: 32px 0 24px;
  }

  .welcome-content h1 {
    font: var(--title-2-emphasized);
  }

  .quick-actions {
    grid-template-columns: 1fr;
  }

  .info-section {
    grid-template-columns: 1fr;
  }
}
</style>
