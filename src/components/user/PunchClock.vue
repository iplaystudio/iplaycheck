<template>
  <div class="punch-clock">
    <!-- 大时钟显示 -->
    <div class="clock-section">
      <div class="current-time">
        {{ currentTime }}
      </div>
      <div class="current-date">
        {{ currentDate }}
      </div>
    </div>

    <!-- 工作状态卡片 -->
    <AppleCard
      variant="elevated"
      class="status-card-wrapper"
    >
      <div class="status-card">
        <div
          class="status-indicator"
          :class="statusClass"
        />
        <div class="status-info">
          <div class="status-title">
            {{ statusText }}
          </div>
          <div class="status-subtitle">
            {{ statusSubtitle }}
          </div>
          <div
            v-if="autoBreakEnabled"
            class="auto-break-indicator"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            自动休息已启用
          </div>
        </div>
      </div>
    </AppleCard>

    <!-- 同步状态 -->
    <div
      v-if="isSyncing || syncMessage"
      class="sync-status"
    >
      <AppleCard variant="elevated">
        <div class="sync-content">
          <div
            v-if="isSyncing"
            class="sync-indicator"
          >
            <AppleLoading size="small" />
          </div>
          <div class="sync-message">
            {{ syncMessage || '正在同步...' }}
          </div>
        </div>
      </AppleCard>
    </div>

    <!-- 今日统计 -->
    <div class="stats-grid">
      <AppleCard
        variant="elevated"
        hoverable
      >
        <div class="stat-card">
          <div class="stat-value">
            {{ workDuration }}
          </div>
          <div class="stat-label">
            学习时长
          </div>
        </div>
      </AppleCard>
      <AppleCard
        variant="elevated"
        hoverable
      >
        <div class="stat-card">
          <div class="stat-value">
            {{ breakDuration }}
          </div>
          <div class="stat-label">
            休息时长
          </div>
        </div>
      </AppleCard>
    </div>

    <!-- 主打卡按钮 -->
    <div class="punch-action">
      <button 
        class="punch-button" 
        :class="buttonClass"
        :disabled="loading || workStatus === 'break'"
        @click="handlePunch"
      >
        <div class="button-content">
          <div class="button-icon">
            <div
              v-if="workStatus === 'working'"
              class="pulse-ring"
            />
            <svg
              v-if="!loading"
              width="40"
              height="40"
              viewBox="0 0 40 40"
            >
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              />
              <path
                d="M20 8 L20 20 L28 20"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
              />
            </svg>
            <AppleLoading
              v-else
              size="medium"
            />
          </div>
          <div class="button-text">
            {{ buttonText }}
          </div>
        </div>
      </button>
    </div>

    <!-- 快速操作 -->
    <div
      v-if="workStatus === 'working'"
      class="quick-actions"
    >
      <AppleButton
        variant="secondary"
        size="large"
        :disabled="loading"
        class="flex-1"
        @click="startBreak"
      >
        休息
      </AppleButton>
      <AppleButton
        variant="secondary"
        size="large"
        :disabled="loading"
        class="flex-1"
        @click="handlePunchOut"
      >
        下班
      </AppleButton>
    </div>

    <div
      v-if="workStatus === 'break'"
      class="quick-actions"
    >
      <AppleButton
        variant="secondary"
        size="large"
        :disabled="loading"
        class="full-width"
        @click="endBreak"
      >
        歇够了
      </AppleButton>
    </div>

    <!-- 今日记录 -->
    <AppleCard
      v-if="todayRecords.length > 0"
      variant="elevated"
      class="records-section-wrapper"
    >
      <div class="records-section">
        <div class="section-header">
          <h3>今日记录</h3>
          <span class="record-count">{{ todayRecords.length }}</span>
        </div>
        <div class="records-list">
          <div 
            v-for="record in todayRecords" 
            :key="record.id" 
            class="record-item"
          >
            <div
              class="record-type-icon"
              :class="record.type"
            >
              <span v-if="record.type === 'in'">上班</span>
              <span v-else-if="record.type === 'out'">下班</span>
              <span v-else-if="record.type === 'break_start'">
                {{ record.autoTriggered ? '自动休息' : '开始休息' }}
              </span>
              <span v-else>{{ record.autoTriggered ? '自动结束休息' : '结束休息' }}</span>
            </div>
            <div class="record-time">
              {{ formatTime(record.timestamp) }}
            </div>
          </div>
        </div>
      </div>
    </AppleCard>

    <!-- 拍照 Modal -->
    <Teleport to="body">
      <div
        v-if="showCamera"
        class="modal-overlay"
        @click="cancelPunch"
      >
        <div
          class="modal-card camera-modal"
          @click.stop
        >
          <div class="modal-header">
            <h3>拍照打卡</h3>
            <button
              class="close-button"
              @click="cancelPunch"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M15 5L5 15M5 5l10 10"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>
          <CameraCapture @photo-confirmed="handlePhotoConfirmed" />
        </div>
      </div>
    </Teleport>

    <!-- Toast 通知 -->
    <AppleToast 
      :visible="!!error"
      type="error"
      :message="error"
      @update:visible="error = ''"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePunchStore } from '@/store/punch'
import { useUserStore } from '@/store/user'
import CameraCapture from './CameraCapture.vue'
import AppleButton from '@/components/shared/AppleButton.vue'
import AppleCard from '@/components/shared/AppleCard.vue'
import AppleLoading from '@/components/shared/AppleLoading.vue'
import AppleToast from '@/components/shared/AppleToast.vue'
import syncService from '@/services/sync'

const punchStore = usePunchStore()
const userStore = useUserStore()

// 自动休息功能
const autoBreakEnabled = ref(false)

// 触发自动休息
const currentTime = ref('')
const currentDate = ref('')
const loading = ref(false)
const error = ref('')
const showCamera = ref(false)
const currentPunchType = ref('')
const photoData = ref(null) // 添加照片数据ref
const isSyncing = ref(false) // 同步状态
const syncMessage = ref('') // 同步消息
let timeInterval = null

// 更新时间
const updateTime = () => {
  const now = new Date()
  
  // 更新时钟显示
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  currentTime.value = `${hours}:${minutes}:${seconds}`
  
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const date = String(now.getDate()).padStart(2, '0')
  const weekday = weekdays[now.getDay()]
  currentDate.value = `${year}年${month}月${date}日 ${weekday}`

  // 更新 punchStore 的当前时间以触发工作时长重新计算
  punchStore.$patch({ currentTime: now })
}

// 工作状态
const workStatus = computed(() => punchStore.workStatus)

// 状态样式类
const statusClass = computed(() => {
  return {
    'off-work': workStatus.value === 'idle',
    'working': workStatus.value === 'working',
    'break': workStatus.value === 'break'
  }
})

// 状态文本
const statusText = computed(() => {
  const statusMap = {
    idle: '未上班',
    working: '学习中',
    break: '休息中'
  }
  return statusMap[workStatus.value] || '未知状态'
})

// 获取最后的上班时间
const lastPunchInRecord = computed(() => {
  return punchStore.todayRecords.find(r => r.type === 'in')
})

// 获取最后的休息开始时间
const lastBreakStartRecord = computed(() => {
  const records = [...punchStore.todayRecords].reverse()
  return records.find(r => r.type === 'break_start')
})

const statusSubtitle = computed(() => {
  if (workStatus.value === 'working' && lastPunchInRecord.value) {
    const time = formatTime(lastPunchInRecord.value.timestamp)
    return `上班时间: ${time}`
  }
  if (workStatus.value === 'break' && lastBreakStartRecord.value) {
    const time = formatTime(lastBreakStartRecord.value.timestamp)
    return `休息开始: ${time}`
  }
  return '准备开始新的一天'
})

// 按钮样式类
const buttonClass = computed(() => {
  return {
    'punch-in': workStatus.value === 'idle',
    'punch-out': workStatus.value === 'working',
    'loading': loading.value
  }
})

// 按钮文本
const buttonText = computed(() => {
  if (loading.value) return '处理中...'
  if (workStatus.value === 'idle') return '上班打卡'
  if (workStatus.value === 'working') return '下班打卡'
  if (workStatus.value === 'break') return '休息中'
  return '打卡'
})

// 今日记录
const todayRecords = computed(() => punchStore.todayRecords || [])

// 工作时长
const workDuration = computed(() => {
  const duration = punchStore.todayWorkDuration || 0
  const hours = Math.floor(duration / 60)
  const minutes = duration % 60
  return `${hours}小时${minutes}分钟`
})

// 休息时长
const breakDuration = computed(() => {
  const duration = punchStore.todayBreakDuration || 0
  const hours = Math.floor(duration / 60)
  const minutes = duration % 60
  return `${hours}小时${minutes}分钟`
})

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// 处理打卡
const handlePunch = async () => {
  if (!userStore.isAuthenticated) {
    error.value = '用户未登录，请先登录后再打卡';
    return;
  }

  try {
    loading.value = true;
    const punchType = workStatus.value === 'working' ? 'out' : 'in';

    // 检查是否需要拍照
    const needPhoto = punchType === 'in'; // 只有上班打卡需要拍照
    if (needPhoto && !photoData.value) {
      // 显示拍照界面
      currentPunchType.value = punchType;
      showCamera.value = true;
      return;
    }

    // 保存打卡记录
    await punchStore.createPunchRecord(punchType, userStore.userId, {
      photo: photoData.value,
      requirePhoto: true
    });

    // 清理状态
    photoData.value = null;
    currentPunchType.value = '';

    // 更新记录
    await punchStore.loadRecords(userStore.userId);
  } catch (err) {
    console.error('Punch error:', err);
    error.value = '打卡失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}

// 上班打卡
const startPunchIn = () => {
  currentPunchType.value = 'in'
  showCamera.value = true
}

// 下班打卡
const handlePunchOut = () => {
  currentPunchType.value = 'out'
  submitPunch(null, false)
}

// 开始休息
const startBreak = () => {
  currentPunchType.value = 'break_start'
  submitPunch(null, false)
}

// 结束休息
const endBreak = () => {
  currentPunchType.value = 'break_end'
  showCamera.value = true
}

// 拍照完成
const handlePhotoConfirmed = async (photo) => {
  try {
    loading.value = true;

    // 保存照片数据
    photoData.value = photo;

    // 执行打卡
    await punchStore.createPunchRecord(currentPunchType.value, userStore.userId, {
      photo: photoData.value,
      requirePhoto: true
    });

    // 清理状态
    showCamera.value = false;
    photoData.value = null;
    currentPunchType.value = '';

    // 更新记录
    await punchStore.loadRecords(userStore.userId);
  } catch (err) {
    console.error('Punch error:', err);
    error.value = '打卡失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}

// 提交打卡
const submitPunch = async (photo, requirePhoto = true) => {
  loading.value = true
  error.value = ''
  
  try {
    // 获取用户ID
    const userId = userStore.userId
    if (!userId) {
      throw new Error('用户未登录')
    }
    
    const options = {
      photo: photo,
      requirePhoto: requirePhoto
    }

    switch (currentPunchType.value) {
      case 'in':
        await punchStore.punchIn(userId, options)
        break
      case 'out':
        await punchStore.punchOut(userId, options)
        break
      case 'break_start':
        await punchStore.startBreak(userId, options)
        break
      case 'break_end':
        await punchStore.endBreak(userId, options)
        break
    }

    currentPunchType.value = ''
  } catch (err) {
    console.error('打卡错误:', err)
    error.value = err.message || '打卡失败,请重试'
    setTimeout(() => {
      error.value = ''
    }, 3000)
  } finally {
    loading.value = false
  }
}

// 取消打卡
const cancelPunch = () => {
  showCamera.value = false
  currentPunchType.value = ''
}

// 同步状态监听器
const syncListener = (event, data) => {
  if (event === 'sync_started') {
    isSyncing.value = true
    syncMessage.value = '正在同步到云端...'
  } else if (event === 'sync_completed') {
    isSyncing.value = false
    syncMessage.value = '同步完成'
    // 3秒后清除消息
    setTimeout(() => {
      syncMessage.value = ''
    }, 3000)
  } else if (event === 'sync_error') {
    isSyncing.value = false
    syncMessage.value = '同步失败，请检查网络连接'
    // 5秒后清除消息
    setTimeout(() => {
      syncMessage.value = ''
    }, 5000)
  }
}

onMounted(async () => {
  // 初始化时间显示
  updateTime()
  
  // 启动定时器，每秒更新一次时间和工作时长
  timeInterval = setInterval(updateTime, 1000)
  
  // 设置同步监听器
  syncService.addListener(syncListener)
  
  try {
    await punchStore.loadRecords(userStore.userId);
  } catch (error) {
    console.error('Failed to load punch records:', error);
  }
});

onUnmounted(() => {
  // 清理同步监听器
  syncService.removeListener(syncListener)
  
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style scoped>
.punch-clock {
  max-width: 640px;
  margin: 0 auto;
  padding: var(--bodyGutter) 16px 100px;
}

/* 时钟显示 */
.clock-section {
  text-align: center;
  padding: 48px 0 32px;
}

.current-time {
  font: var(--header);
  font-size: 64px;
  color: var(--systemPrimary);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.current-date {
  margin-top: 12px;
  font: var(--body-emphasized);
  color: var(--systemSecondary);
  letter-spacing: -0.01em;
}

/* 状态卡片 */
.status-card-wrapper {
  margin-bottom: 24px;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: var(--bodyGutter);
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 4px rgba(var(--keyColor-rgb), 0.12);
  transition: all 0.3s var(--ease-out);
}

.status-indicator.off-work {
  background: var(--systemSecondary);
  box-shadow: 0 0 0 4px rgba(var(--systemSecondary-rgb), 0.12);
}

.status-indicator.working {
  background: var(--systemGreen);
  box-shadow: 0 0 0 4px rgba(var(--systemGreen-rgb), 0.16);
  animation: pulse 2s ease-in-out infinite;
}

.status-indicator.break {
  background: var(--systemOrange);
  box-shadow: 0 0 0 4px rgba(var(--systemOrange-rgb), 0.16);
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 4px rgba(var(--systemGreen-rgb), 0.16);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(var(--systemGreen-rgb), 0.24);
  }
}

.status-info {
  flex: 1;
  min-width: 0;
}

.status-title {
  font: var(--title-2-emphasized);
  color: var(--systemPrimary);
  margin-bottom: 4px;
}

.status-subtitle {
  font: var(--body);
  color: var(--systemSecondary);
}

.auto-break-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font: var(--caption-1);
  color: var(--systemGreen);
  margin-top: 4px;
}

.auto-break-indicator svg {
  flex-shrink: 0;
}

/* 同步状态 */
.sync-status {
  margin-bottom: 24px;
}

.sync-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.sync-indicator {
  flex-shrink: 0;
}

.sync-message {
  font: var(--body);
  color: var(--systemSecondary);
}

/* 统计网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 32px;
}

.stat-card {
  padding: var(--bodyGutter);
  text-align: center;
}

.stat-value {
  font: var(--title-2-emphasized);
  color: var(--systemPrimary);
  margin-bottom: 4px;
}

.stat-label {
  font: var(--caption-1);
  color: var(--systemSecondary);
}

/* 打卡按钮 */
.punch-action {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.punch-button {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: none;
  background: white;
  color: var(--systemPrimary);
  font: var(--body-emphasized);
  cursor: pointer;
  box-shadow: var(--shadow-large);
  transition: all 0.3s var(--ease-out);
  position: relative;
  overflow: visible;
}

.punch-button:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(var(--keyColor-rgb), 0.32),
              0 12px 48px rgba(var(--keyColor-rgb), 0.24);
}

.punch-button:active:not(:disabled) {
  transform: scale(0.98);
}

.punch-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.punch-button.punch-out {
  background: white;
  color: var(--systemPrimary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08),
              0 8px 32px rgba(0, 0, 0, 0.04);
}

.punch-button.punch-out:hover:not(:disabled) {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12),
              0 12px 48px rgba(0, 0, 0, 0.08);
}

.button-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.button-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-ring {
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.6);
  animation: pulse-ring 2s ease-out infinite;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

/* 快速操作 */
.quick-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
}

.flex-1 {
  flex: 1;
}

.full-width {
  width: 100%;
}

/* 记录列表 */
.records-section-wrapper {
  margin-bottom: 32px;
}

.records-section {
  padding: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header h3 {
  font: var(--title-2-emphasized);
  color: var(--systemPrimary);
  margin: 0;
}

.record-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: rgba(var(--keyColor-rgb), 0.12);
  color: var(--keyColor);
  font: var(--caption-1-emphasized);
  border-radius: 12px;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--systemFill);
  border-radius: var(--global-border-radius-medium);
  transition: background 0.2s var(--ease-out);
}

.record-item:hover {
  background: var(--systemFill-hover);
}

.record-type-icon {
  font: var(--body-emphasized);
  color: var(--systemPrimary);
}

.record-type-icon.in {
  color: var(--systemGreen);
}

.record-type-icon.out {
  color: var(--systemRed);
}

.record-type-icon.break_start {
  color: var(--systemOrange);
}

.record-type-icon.break_end {
  color: var(--keyColor);
}

.record-time {
  font: var(--body-emphasized);
  color: var(--systemSecondary);
  font-variant-numeric: tabular-nums;
}

/* Modal 样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--bodyGutter);
  animation: fadeIn 0.2s var(--ease-out);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-card {
  background: var(--systemBackground);
  border-radius: var(--global-border-radius-large);
  width: 100%;
  max-width: 480px;
  box-shadow: var(--shadow-large);
  animation: slideUp 0.3s var(--ease-out);
}

.modal-card.camera-modal {
  max-width: 640px;
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

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--bodyGutter) 24px;
  border-bottom: 1px solid var(--systemFill);
}

.modal-header h3 {
  font: var(--title-2-emphasized);
  color: var(--systemPrimary);
  margin: 0;
}

.close-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--systemFill);
  color: var(--systemSecondary);
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.close-button:hover {
  background: var(--systemFill-hover);
  color: var(--systemPrimary);
}

/* 响应式 */
@media (max-width: 768px) {
  .punch-clock {
    padding: 20px 12px;
  }

  .stats-grid {
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .punch-clock {
    padding: 16px;
  }

  .current-time {
    font-size: 48px;
  }
  
  .punch-button {
    width: 140px;
    height: 140px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .stat-card {
    padding: 16px;
  }

  .quick-actions {
    flex-direction: column;
    gap: 10px;
  }

  .quick-actions .flex-1,
  .quick-actions .full-width {
    width: 100%;
  }

  .modal-card {
    width: 95%;
    max-width: none;
  }

  .modal-card.camera-modal {
    width: 100%;
    height: 100vh;
    border-radius: 0;
  }
}
</style>
