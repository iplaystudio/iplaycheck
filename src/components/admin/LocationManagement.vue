<template>
  <div class="location-management">
    <div class="section-header">
      <h2>打卡位置管理</h2>
      <button @click="showAddDialog = true" class="btn-add">
        <span>+</span> 添加位置
      </button>
    </div>

    <!-- 全局设置 -->
    <div class="settings-card">
      <h3>全局设置</h3>
      <div class="setting-row">
        <div class="setting-info">
          <label>启用位置验证</label>
          <p class="hint">关闭后允许在任何位置打卡</p>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="config.enabled" @change="saveConfig">
          <span class="slider"></span>
        </label>
      </div>
      <div class="setting-row">
        <div class="setting-info">
          <label>允许打卡半径</label>
          <p class="hint">{{ config.radiusMeters }} 米</p>
        </div>
        <input 
          type="range" 
          v-model.number="config.radiusMeters" 
          min="50" 
          max="1000" 
          step="50"
          @change="saveConfig"
          class="radius-slider"
        >
      </div>
    </div>

    <!-- 位置列表 -->
    <div class="locations-list">
      <div 
        v-for="location in locations" 
        :key="location.id"
        class="location-card"
      >
        <div class="location-icon">📍</div>
        <div class="location-info">
          <h4>{{ location.name }}</h4>
          <p class="location-coords">
            {{ location.latitude.toFixed(6) }}, {{ location.longitude.toFixed(6) }}
          </p>
          <p class="location-address" v-if="location.address">
            {{ location.address }}
          </p>
          <p class="location-desc" v-if="location.description">
            {{ location.description }}
          </p>
        </div>
        <div class="location-actions">
          <button @click="editLocation(location)" class="btn-icon" title="编辑">
            ✏️
          </button>
          <button @click="deleteLocation(location.id)" class="btn-icon" title="删除">
            🗑️
          </button>
        </div>
      </div>

      <div v-if="locations.length === 0" class="empty-state">
        <div class="empty-icon">📍</div>
        <p>还没有配置打卡位置</p>
        <button @click="showAddDialog = true" class="btn-primary">
          添加第一个位置
        </button>
      </div>
    </div>

    <!-- 添加/编辑对话框 -->
    <Teleport to="body">
      <div v-if="showAddDialog" class="modal-overlay" @click="closeDialog">
        <div class="modal-card" @click.stop>
          <div class="modal-header">
            <h3>{{ editingLocation ? '编辑位置' : '添加位置' }}</h3>
            <button class="close-button" @click="closeDialog">×</button>
          </div>
          
          <div class="modal-body">
            <div class="form-group">
              <label>位置名称 *</label>
              <input 
                v-model="form.name" 
                type="text" 
                placeholder="例如: 公司总部"
                class="form-input"
              >
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>纬度 *</label>
                <input 
                  v-model.number="form.latitude" 
                  type="number" 
                  step="0.000001"
                  placeholder="39.904200"
                  class="form-input"
                >
              </div>
              <div class="form-group">
                <label>经度 *</label>
                <input 
                  v-model.number="form.longitude" 
                  type="number" 
                  step="0.000001"
                  placeholder="116.407400"
                  class="form-input"
                >
              </div>
            </div>

            <div class="form-group">
              <label>地址</label>
              <input 
                v-model="form.address" 
                type="text" 
                placeholder="北京市东城区"
                class="form-input"
              >
            </div>

            <div class="form-group">
              <label>描述</label>
              <textarea 
                v-model="form.description" 
                placeholder="例如: 主办公区、研发中心等"
                class="form-textarea"
                rows="3"
              ></textarea>
            </div>

            <div class="help-section">
              <details>
                <summary>💡 如何获取坐标?</summary>
                <div class="help-content">
                  <p><strong>方法1: 使用当前位置</strong></p>
                  <button @click="useCurrentLocation" class="btn-secondary" :disabled="gettingLocation">
                    {{ gettingLocation ? '获取中...' : '📍 使用当前位置' }}
                  </button>
                  
                  <p><strong>方法2: 在线地图</strong></p>
                  <ul>
                    <li><a href="https://lbs.amap.com/tools/picker" target="_blank">高德地图拾取坐标</a></li>
                    <li><a href="https://api.map.baidu.com/lbsapi/getpoint/index.html" target="_blank">百度地图拾取坐标</a></li>
                  </ul>
                </div>
              </details>
            </div>

            <div v-if="error" class="error-message">
              {{ error }}
            </div>
          </div>

          <div class="modal-footer">
            <button @click="closeDialog" class="btn-cancel">取消</button>
            <button @click="saveLocation" class="btn-save" :disabled="!isFormValid">
              {{ editingLocation ? '保存' : '添加' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 成功提示 -->
    <Teleport to="body">
      <div v-if="successMessage" class="toast success-toast">
        ✓ {{ successMessage }}
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/services/firebase'
import GeolocationService from '@/services/geolocation'

const config = reactive({
  enabled: false,
  radiusMeters: 200
})

const locations = ref([])
const showAddDialog = ref(false)
const editingLocation = ref(null)
const gettingLocation = ref(false)
const error = ref('')
const successMessage = ref('')

const form = reactive({
  id: '',
  name: '',
  latitude: null,
  longitude: null,
  address: '',
  description: ''
})

const isFormValid = computed(() => {
  return form.name && 
         form.latitude !== null && 
         form.longitude !== null &&
         form.latitude >= -90 && form.latitude <= 90 &&
         form.longitude >= -180 && form.longitude <= 180
})

// 加载配置
const loadConfig = async () => {
  try {
    const docRef = doc(db, 'config', 'punchLocations')
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data()
      config.enabled = data.enabled || false
      config.radiusMeters = data.radiusMeters || 200
      locations.value = data.allowedLocations || []
    }
  } catch (err) {
    console.error('加载配置失败:', err)
    showError('加载配置失败: ' + err.message)
  }
}

// 保存配置
const saveConfig = async () => {
  try {
    const docRef = doc(db, 'config', 'punchLocations')
    await setDoc(docRef, {
      enabled: config.enabled,
      radiusMeters: config.radiusMeters,
      allowedLocations: locations.value,
      updatedAt: new Date().toISOString()
    })
    showSuccess('配置已保存')
  } catch (err) {
    console.error('保存配置失败:', err)
    showError('保存配置失败: ' + err.message)
  }
}

// 使用当前位置
const useCurrentLocation = async () => {
  gettingLocation.value = true
  error.value = ''
  
  try {
    const geolocation = new GeolocationService()
    const position = await geolocation.getCurrentPosition()
    
    form.latitude = position.latitude
    form.longitude = position.longitude
    
    // 尝试获取地址
    try {
      const address = await geolocation.reverseGeocode(position.latitude, position.longitude)
      form.address = address.address
    } catch (err) {
      console.log('获取地址失败:', err)
    }
    
    showSuccess('已获取当前位置')
  } catch (err) {
    error.value = '获取位置失败: ' + err.message
  } finally {
    gettingLocation.value = false
  }
}

// 编辑位置
const editLocation = (location) => {
  editingLocation.value = location
  form.id = location.id
  form.name = location.name
  form.latitude = location.latitude
  form.longitude = location.longitude
  form.address = location.address || ''
  form.description = location.description || ''
  showAddDialog.value = true
}

// 保存位置
const saveLocation = async () => {
  if (!isFormValid.value) return
  
  try {
    const locationData = {
      id: form.id || `loc-${Date.now()}`,
      name: form.name,
      latitude: form.latitude,
      longitude: form.longitude,
      address: form.address,
      description: form.description
    }
    
    if (editingLocation.value) {
      // 更新现有位置
      const index = locations.value.findIndex(l => l.id === editingLocation.value.id)
      if (index !== -1) {
        locations.value[index] = locationData
      }
    } else {
      // 添加新位置
      locations.value.push(locationData)
    }
    
    await saveConfig()
    closeDialog()
    showSuccess(editingLocation.value ? '位置已更新' : '位置已添加')
  } catch (err) {
    error.value = '保存失败: ' + err.message
  }
}

// 删除位置
const deleteLocation = async (id) => {
  if (!confirm('确定要删除这个位置吗?')) return
  
  try {
    locations.value = locations.value.filter(l => l.id !== id)
    await saveConfig()
    showSuccess('位置已删除')
  } catch (err) {
    showError('删除失败: ' + err.message)
  }
}

// 关闭对话框
const closeDialog = () => {
  showAddDialog.value = false
  editingLocation.value = null
  error.value = ''
  form.id = ''
  form.name = ''
  form.latitude = null
  form.longitude = null
  form.address = ''
  form.description = ''
}

// 显示成功消息
const showSuccess = (message) => {
  successMessage.value = message
  setTimeout(() => {
    successMessage.value = ''
  }, 3000)
}

// 显示错误消息
const showError = (message) => {
  error.value = message
  setTimeout(() => {
    error.value = ''
  }, 5000)
}

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.location-management {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin: 0;
}

.btn-add {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #007aff 0%, #0051d5 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

.btn-add span {
  font-size: 20px;
}

/* 设置卡片 */
.settings-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04),
              0 4px 12px rgba(0, 0, 0, 0.08);
}

.settings-card h3 {
  font-size: 18px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin: 0 0 20px 0;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-info label {
  font-size: 15px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
  display: block;
  margin-bottom: 4px;
}

.setting-info .hint {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.56);
  margin: 0;
}

/* 开关 */
.switch {
  position: relative;
  display: inline-block;
  width: 51px;
  height: 31px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.16);
  transition: 0.3s;
  border-radius: 31px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 27px;
  width: 27px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input:checked + .slider {
  background-color: #34c759;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

/* 滑块 */
.radius-slider {
  width: 200px;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to right, #007aff, #34c759);
  outline: none;
  -webkit-appearance: none;
}

.radius-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  border: 3px solid #007aff;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

/* 位置列表 */
.locations-list {
  display: grid;
  gap: 16px;
}

.location-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: white;
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04),
              0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.2s;
}

.location-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.location-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.location-info {
  flex: 1;
  min-width: 0;
}

.location-info h4 {
  font-size: 17px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin: 0 0 8px 0;
}

.location-coords {
  font-size: 14px;
  color: #007aff;
  font-family: 'SF Mono', Monaco, monospace;
  margin: 4px 0;
}

.location-address,
.location-desc {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.56);
  margin: 4px 0;
}

.location-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: rgba(0, 0, 0, 0.08);
  transform: scale(1.1);
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-state p {
  font-size: 15px;
  color: rgba(0, 0, 0, 0.56);
  margin-bottom: 20px;
}

/* Modal 样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.2s;
}

.modal-card {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin: 0;
}

.close-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.56);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
}

.close-button:hover {
  background: rgba(0, 0, 0, 0.12);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 8px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  font-size: 15px;
  font-family: inherit;
  transition: all 0.2s;
  box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #007aff;
  box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1);
}

.help-section {
  margin: 20px 0;
  padding: 16px;
  background: rgba(0, 122, 255, 0.04);
  border-radius: 10px;
}

.help-section summary {
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #007aff;
  user-select: none;
}

.help-content {
  margin-top: 12px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.72);
}

.help-content ul {
  margin: 8px 0;
  padding-left: 20px;
}

.help-content a {
  color: #007aff;
  text-decoration: none;
}

.help-content a:hover {
  text-decoration: underline;
}

.btn-secondary {
  padding: 10px 16px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.02);
  border-color: #007aff;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  padding: 12px 16px;
  background: rgba(255, 59, 48, 0.1);
  border-radius: 8px;
  color: #ff3b30;
  font-size: 14px;
  margin-top: 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.btn-cancel,
.btn-save {
  padding: 10px 24px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.72);
}

.btn-cancel:hover {
  background: rgba(0, 0, 0, 0.12);
}

.btn-save {
  background: linear-gradient(135deg, #007aff 0%, #0051d5 100%);
  color: white;
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Toast */
.toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2000;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  animation: slideDown 0.3s;
}

.success-toast {
  background: #34c759;
  color: white;
  box-shadow: 0 4px 16px rgba(52, 199, 89, 0.3);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
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

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .section-header h2,
  .settings-card h3,
  .setting-info label,
  .location-info h4,
  .modal-header h3 {
    color: rgba(255, 255, 255, 0.92);
  }
  
  .settings-card,
  .location-card,
  .empty-state,
  .modal-card {
    background: #1c1c1e;
  }
  
  .setting-info .hint,
  .location-address,
  .location-desc,
  .empty-state p {
    color: rgba(255, 255, 255, 0.56);
  }
  
  .form-input,
  .form-textarea {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.92);
  }
}
</style>
