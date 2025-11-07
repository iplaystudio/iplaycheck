<template>
  <div class="punch-clock">
    <!-- 大时钟显示 -->
    <div class="clock-section">
      <div class="current-time">{{ currentTime }}</div>
      <div class="current-date">{{ currentDate }}</div>
    </div>

    <!-- 工作状态卡片 -->
    <AppleCard variant="elevated" class="status-card-wrapper">
      <div class="status-card">
        <div class="status-indicator" :class="statusClass"></div>
        <div class="status-info">
          <div class="status-title">{{ statusText }}</div>
          <div class="status-subtitle">{{ statusSubtitle }}</div>
          <div v-if="autoBreakEnabled" class="auto-break-indicator">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            自动休息已启用
          </div>
        </div>
      </div>
    </AppleCard>

    <!-- 今日统计 -->
    <div class="stats-grid">
      <AppleCard variant="elevated" hoverable>
        <div class="stat-card">
          <div class="stat-value">{{ workDuration }}</div>
          <div class="stat-label">学习时长</div>
        </div>
      </AppleCard>
      <AppleCard variant="elevated" hoverable>
        <div class="stat-card">
          <div class="stat-value">{{ breakDuration }}</div>
          <div class="stat-label">休息时长</div>
        </div>
      </AppleCard>
    </div>

    <!-- 主打卡按钮 -->
    <div class="punch-action">
      <button 
        class="punch-button" 
        :class="buttonClass"
        @click="handlePunch"
        :disabled="loading || workStatus === 'break'"
      >
        <div class="button-content">
          <div class="button-icon">
            <div class="pulse-ring" v-if="workStatus === 'working'"></div>
            <svg width="40" height="40" viewBox="0 0 40 40" v-if="!loading">
              <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="2"/>
              <path d="M20 8 L20 20 L28 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            <AppleLoading v-else size="medium" />
          </div>
          <div class="button-text">{{ buttonText }}</div>
        </div>
      </button>
    </div>

    <!-- 快速操作 -->
    <div class="quick-actions" v-if="workStatus === 'working'">
      <AppleButton variant="secondary" size="large" @click="startBreak" :disabled="loading" class="flex-1">
        休息
      </AppleButton>
      <AppleButton variant="secondary" size="large" @click="handlePunchOut" :disabled="loading" class="flex-1">
        下班
      </AppleButton>
    </div>

    <div class="quick-actions" v-if="workStatus === 'break'">
      <AppleButton variant="secondary" size="large" @click="endBreak" :disabled="loading" class="full-width">
        歇够了
      </AppleButton>
    </div>

    <!-- 今日记录 -->
    <AppleCard variant="elevated" v-if="todayRecords.length > 0" class="records-section-wrapper">
      <div class="records-section">
        <div class="section-header">
          <h3>今日记录</h3>
          <span class="record-count">{{ todayRecords.length }}</span>
        </div>
        <div class="records-list">
          <div 
            class="record-item" 
            v-for="record in todayRecords" 
            :key="record.id"
          >
            <div class="record-type-icon" :class="record.type">
              <span v-if="record.type === 'in'">上班</span>
              <span v-else-if="record.type === 'out'">下班</span>
              <span v-else-if="record.type === 'break_start'">
                {{ record.autoTriggered ? '自动休息' : '开始休息' }}
              </span>
              <span v-else>{{ record.autoTriggered ? '自动结束休息' : '结束休息' }}</span>
            </div>
            <div class="record-time">{{ formatTime(record.timestamp) }}</div>
          </div>
        </div>
      </div>
    </AppleCard>

    <!-- 位置验证 Modal -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showLocation" @click="cancelPunch">
        <div class="modal-card" @click.stop>
          <div class="modal-header">
            <h3>验证位置</h3>
            <button class="close-button" @click="cancelPunch">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <LocationValidator 
            :allowed-locations="locationConfig.allowedLocations"
            :radius-meters="locationConfig.radiusMeters"
            @location-validated="handleLocationValidated" 
          />
        </div>
      </div>
    </Teleport>

    <!-- 拍照 Modal -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showCamera" @click="cancelPunch">
        <div class="modal-card camera-modal" @click.stop>
          <div class="modal-header">
            <h3>拍照打卡</h3>
            <button class="close-button" @click="cancelPunch">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
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
      @update:visible="error = ''"
      type="error"
      :message="error"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/services/firebase'
import { usePunchStore } from '@/store/punch'
import { useUserStore } from '@/store/user'
import LocationValidator from './LocationValidator.vue'
import CameraCapture from './CameraCapture.vue'
import AppleButton from '@/components/shared/AppleButton.vue'
import AppleCard from '@/components/shared/AppleCard.vue'
import AppleLoading from '@/components/shared/AppleLoading.vue'
import AppleToast from '@/components/shared/AppleToast.vue'
import { getPunchLocationConfig } from '@/config/locations'
import GeolocationService from '@/services/geolocation'

const punchStore = usePunchStore()
const userStore = useUserStore()

// 位置配置
const locationConfig = ref({
  enabled: false,
  radiusMeters: 200,
  allowedLocations: []
})

// 自动休息功能
const geolocationService = new GeolocationService()
const locationWatchId = ref(null)
const autoBreakEnabled = ref(false)
const lastInRangeTime = ref(null)

// 从 Firestore 加载配置
const loadLocationConfig = async () => {
  try {
    const docRef = doc(db, 'config', 'punchLocations')
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      locationConfig.value = {
        enabled: data.enabled || false,
        radiusMeters: data.radiusMeters || 200,
        allowedLocations: data.enabled ? (data.allowedLocations || []) : []
      }
    } else {
      // 使用本地配置作为后备
      locationConfig.value = getPunchLocationConfig()
    }
  } catch (error) {
    console.error('加载位置配置失败:', error)
    // 使用本地配置作为后备
    locationConfig.value = getPunchLocationConfig()
  }
}

// 开始监听位置变化（用于自动休息）
const startLocationMonitoring = () => {
  if (!locationConfig.value.enabled || !locationConfig.value.allowedLocations.length) {
    return
  }

  try {
    locationWatchId.value = geolocationService.watchPosition(
      (position, error) => {
        if (error) {
          console.error('位置监听错误:', error)
          return
        }

        handleLocationChange(position)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000 // 30秒内允许使用缓存位置
      }
    )

    autoBreakEnabled.value = true
    console.log('开始监听位置变化，用于自动休息')
  } catch (error) {
    console.error('启动位置监听失败:', error)
  }
}

// 停止监听位置变化
const stopLocationMonitoring = () => {
  if (locationWatchId.value) {
    geolocationService.clearWatch()
    locationWatchId.value = null
  }
  autoBreakEnabled.value = false
  lastInRangeTime.value = null
  console.log('停止监听位置变化')
}

// 处理位置变化
const handleLocationChange = (position) => {
  // 只在工作状态下才处理自动休息
  if (workStatus.value !== 'working') {
    return
  }

  const validation = geolocationService.validateLocation(
    position,
    locationConfig.value.allowedLocations,
    locationConfig.value.radiusMeters
  )

  if (validation.valid) {
    // 在范围内，重置离开时间
    lastInRangeTime.value = Date.now()
  } else {
    // 不在范围内，检查是否需要自动休息
    if (!lastInRangeTime.value) {
      lastInRangeTime.value = Date.now()
    }

    const timeOutOfRange = Date.now() - lastInRangeTime.value
    const autoBreakThreshold = 5 * 60 * 1000 // 5分钟

    if (timeOutOfRange >= autoBreakThreshold) {
      console.log(`用户已离开范围 ${Math.round(timeOutOfRange / 1000 / 60)} 分钟，自动开始休息`)
      triggerAutoBreak()
    }
  }
}

// 触发自动休息
const triggerAutoBreak = async () => {
  try {
    const userId = userStore.userId
    if (!userId) return

    await punchStore.startBreak(userId, { autoTriggered: true })
    
    // 显示通知
    error.value = '检测到您已离开工作范围，已自动开始休息'
    setTimeout(() => {
      error.value = ''
    }, 5000)

  } catch (err) {
    console.error('自动休息失败:', err)
  }
}

const currentTime = ref('')
const currentDate = ref('')
const loading = ref(false)
const error = ref('')
const showLocation = ref(false)
const showCamera = ref(false)
const currentPunchType = ref('')
let timeInterval = null

// 更新时间
const updateTime = () => {
  const now = new Date()
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
const handlePunch = () => {
  if (workStatus.value === 'idle') {
    startPunchIn()
  } else if (workStatus.value === 'working') {
    handlePunchOut()
  }
}

// 上班打卡
const startPunchIn = () => {
  currentPunchType.value = 'in'
  showLocation.value = true
}

// 下班打卡 - 需要位置验证
const handlePunchOut = () => {
  currentPunchType.value = 'out'
  showLocation.value = true
}

// 开始休息 - 需要位置验证
const startBreak = () => {
  currentPunchType.value = 'break_start'
  showLocation.value = true
}

// 结束休息 - 需要位置验证
const endBreak = () => {
  currentPunchType.value = 'break_end'
  showLocation.value = true
}

// 位置验证完成
const handleLocationValidated = (result) => {
  console.log('位置验证结果:', result)
  showLocation.value = false
  
  if (result.valid) {
    // 上班打卡需要拍照，其他打卡不需要
    if (currentPunchType.value === 'in') {
      console.log('位置验证通过,打开相机')
      showCamera.value = true
    } else {
      console.log('位置验证通过,直接提交打卡')
      submitPunch(null, false)
    }
  } else {
    console.log('位置验证失败:', result.message)
    error.value = result.message || '位置验证失败'
    setTimeout(() => {
      error.value = ''
    }, 3000)
  }
}

// 拍照完成
const handlePhotoConfirmed = (photo) => {
  console.log('拍照完成,照片大小:', photo?.length)
  showCamera.value = false
  submitPunch(photo)
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
  showLocation.value = false
  showCamera.value = false
  currentPunchType.value = ''
}

onMounted(async () => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
  
  // 加载位置配置
  await loadLocationConfig()
  
  // 加载记录和工作状态
  try {
    const userId = userStore.userId
    if (userId) {
      await punchStore.loadRecords(userId)
      
      // 如果正在工作，开始监听位置
      if (workStatus.value === 'working') {
        startLocationMonitoring()
      }
    }
  } catch (error) {
    console.error('加载打卡记录失败:', error)
  }
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
  stopLocationMonitoring()
})

// 监听工作状态变化，启动或停止位置监听
watch(workStatus, (newStatus, oldStatus) => {
  if (newStatus === 'working' && oldStatus !== 'working') {
    // 开始工作，启动位置监听
    startLocationMonitoring()
  } else if (newStatus !== 'working' && oldStatus === 'working') {
    // 停止工作或开始休息，停止位置监听
    stopLocationMonitoring()
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
