<template>
  <div class="location-validator">
    <AppleCard class="location-status" :class="statusClass">
      <div class="status-icon">
        <svg v-if="!validationResult" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
        <svg v-else-if="validationResult.valid" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </div>
      <div class="status-text">
        <h3>{{ statusTitle }}</h3>
        <p>{{ statusMessage }}</p>
      </div>
    </AppleCard>

    <div v-if="loading" class="loading-section">
      <AppleLoading size="large" text="正在获取位置信息..." />
    </div>

    <AppleCard v-if="currentPosition" class="location-info">
      <h4>当前位置</h4>
      <div class="info-row">
        <span class="label">坐标:</span>
        <span class="value">
          {{ currentPosition.latitude.toFixed(6) }},
          {{ currentPosition.longitude.toFixed(6) }}
        </span>
      </div>
      <div class="info-row">
        <span class="label">精度:</span>
        <span class="value">
          {{ currentPosition.accuracy.toFixed(0) }}米
          ({{ accuracyDescription }})
        </span>
      </div>
      <div v-if="currentPosition.address" class="info-row">
        <span class="label">地址:</span>
        <span class="value">{{ currentPosition.address }}</span>
      </div>
    </AppleCard>

    <AppleCard v-if="validationResult && !validationResult.valid" class="validation-error">
      <div class="error-header">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>
        <h4>位置验证失败</h4>
      </div>
      <p>您不在允许的打卡范围内</p>
      <p v-if="nearestLocation" class="distance-info">
        最近的打卡点距离您 {{ validationResult.distance?.toFixed(0) }} 米
      </p>
    </AppleCard>

    <AppleToast v-if="error" type="error" :message="error" @close="error = null" />

    <AppleCard v-if="permissionDenied" class="permission-guide">
      <h3>需要位置权限</h3>
      <p>请在浏览器设置中允许位置访问:</p>
      <ol>
        <li>点击地址栏的锁图标或设置图标</li>
        <li>找到"位置"权限设置</li>
        <li>选择"允许"</li>
        <li>刷新页面</li>
      </ol>
    </AppleCard>

    <div class="location-actions">
      <AppleButton
        variant="primary"
        size="large"
        @click="validateLocation"
        :disabled="loading || validating"
        :loading="validating"
        class="flex-1"
      >
        {{ validating ? '验证中...' : '验证位置' }}
      </AppleButton>

      <AppleButton
        v-if="currentPosition"
        variant="secondary"
        size="large"
        @click="refreshLocation"
        :disabled="loading"
        class="flex-1"
      >
        刷新
      </AppleButton>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import GeolocationService from '@/services/geolocation';
import AppleButton from '@/components/shared/AppleButton.vue';
import AppleCard from '@/components/shared/AppleCard.vue';
import AppleLoading from '@/components/shared/AppleLoading.vue';
import AppleToast from '@/components/shared/AppleToast.vue';

export default {
  name: 'LocationValidator',

  components: {
    AppleButton,
    AppleCard,
    AppleLoading,
    AppleToast
  },

  props: {
    allowedLocations: {
      type: Array,
      default: () => []
    },
    radiusMeters: {
      type: Number,
      default: 100
    },
    autoValidate: {
      type: Boolean,
      default: true
    }
  },

  emits: ['location-validated', 'location-error'],

  setup(props, { emit }) {
    const geolocationService = new GeolocationService();

    const loading = ref(false);
    const validating = ref(false);
    const currentPosition = ref(null);
    const validationResult = ref(null);
    const error = ref(null);
    const permissionDenied = ref(false);

    const statusClass = computed(() => {
      if (!validationResult.value) return 'status-pending';
      return validationResult.value.valid ? 'status-success' : 'status-error';
    });

    const statusIcon = computed(() => {
      if (!validationResult.value) return '⏳';
      return validationResult.value.valid ? '✓' : '✗';
    });

    const statusTitle = computed(() => {
      if (!validationResult.value) return '等待验证';
      return validationResult.value.valid ? '位置验证通过' : '位置验证失败';
    });

    const statusMessage = computed(() => {
      if (!validationResult.value) return '请点击验证位置按钮';
      if (validationResult.value.valid) {
        return '您在允许的打卡范围内';
      }
      return '您不在允许的打卡范围内';
    });

    const accuracyDescription = computed(() => {
      if (!currentPosition.value) return '';
      return geolocationService.getAccuracyDescription(
        currentPosition.value.accuracy
      );
    });

    const nearestLocation = computed(() => {
      if (!validationResult.value || !props.allowedLocations.length) return null;
      return props.allowedLocations[0]; // 简化版本
    });

    // 获取当前位置
    const getCurrentPosition = async () => {
      loading.value = true;
      error.value = null;
      permissionDenied.value = false;

      try {
        if (!GeolocationService.isSupported()) {
          throw new Error('您的浏览器不支持地理位置功能');
        }

        const position = await geolocationService.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });

        currentPosition.value = position;

        // 获取地址信息
        try {
          const address = await geolocationService.reverseGeocode(
            position.latitude,
            position.longitude
          );
          currentPosition.value.address = address.address;
        } catch (err) {
          console.error('Reverse geocoding error:', err);
        }

        return position;
      } catch (err) {
        error.value = err.message;
        if (err.message.includes('权限被拒绝')) {
          permissionDenied.value = true;
        }
        emit('location-error', err);
        throw err;
      } finally {
        loading.value = false;
      }
    };

    // 验证位置
    const validateLocation = async () => {
      validating.value = true;
      error.value = null;

      try {
        // 获取当前位置
        const position = await getCurrentPosition();

        // 如果没有设置允许的位置,则自动通过
        if (!props.allowedLocations || props.allowedLocations.length === 0) {
          validationResult.value = {
            valid: true,
            distance: 0,
            location: null,
            position
          };
          emit('location-validated', validationResult.value);
          return validationResult.value;
        }

        // 验证位置
        const result = geolocationService.validateLocation(
          position,
          props.allowedLocations,
          props.radiusMeters
        );

        validationResult.value = {
          ...result,
          position
        };

        emit('location-validated', validationResult.value);
        return validationResult.value;
      } catch (err) {
        console.error('Validation error:', err);
        throw err;
      } finally {
        validating.value = false;
      }
    };

    // 刷新位置
    const refreshLocation = async () => {
      validationResult.value = null;
      await getCurrentPosition();
    };

    // 组件挂载时自动验证
    onMounted(() => {
      if (props.autoValidate) {
        validateLocation();
      }
    });

    return {
      loading,
      validating,
      currentPosition,
      validationResult,
      error,
      permissionDenied,
      statusClass,
      statusIcon,
      statusTitle,
      statusMessage,
      accuracyDescription,
      nearestLocation,
      validateLocation,
      refreshLocation
    };
  }
};
</script>

<style scoped>
.location-validator {
  padding: 24px;
}

.location-status {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: var(--bodyGutter);
  margin-bottom: 24px;
  transition: all 0.3s var(--ease-out);
}

.status-pending {
  border-left: 4px solid var(--keyColor);
}

.status-success {
  border-left: 4px solid var(--systemGreen);
}

.status-error {
  border-left: 4px solid var(--systemRed);
}

.status-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-pending .status-icon {
  color: var(--keyColor);
}

.status-success .status-icon {
  color: var(--systemGreen);
}

.status-error .status-icon {
  color: var(--systemRed);
}

.status-text {
  flex: 1;
  min-width: 0;
}

.status-text h3 {
  font: var(--title-2-emphasized);
  color: var(--systemPrimary);
  margin: 0 0 4px 0;
}

.status-text p {
  font: var(--body);
  color: var(--systemSecondary);
  margin: 0;
}

.loading-section {
  text-align: center;
  padding: 40px 0;
  margin-bottom: 24px;
}

.location-info {
  padding: 24px;
  margin-bottom: 24px;
}

.location-info h4 {
  font: var(--title-2-emphasized);
  color: var(--systemPrimary);
  margin: 0 0 16px 0;
}

.info-row {
  display: flex;
  padding: 12px 0;
  border-bottom: 1px solid var(--systemFill);
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .label {
  font: var(--body-emphasized);
  color: var(--systemSecondary);
  min-width: 80px;
  flex-shrink: 0;
}

.info-row .value {
  font: var(--body);
  color: var(--systemPrimary);
  word-break: break-all;
}

.validation-error {
  padding: 24px;
  margin-bottom: 24px;
  border-left: 4px solid var(--systemOrange);
}

.error-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.error-header svg {
  color: var(--systemOrange);
  flex-shrink: 0;
}

.error-header h4 {
  font: var(--title-2-emphasized);
  color: var(--systemOrange);
  margin: 0;
}

.validation-error p {
  font: var(--body);
  color: var(--systemPrimary);
  margin: 8px 0 0 0;
}

.distance-info {
  color: var(--systemSecondary) !important;
}

.permission-guide {
  padding: 24px;
  margin-bottom: 24px;
}

.permission-guide h3 {
  font: var(--title-2-emphasized);
  color: var(--systemPrimary);
  margin: 0 0 12px 0;
}

.permission-guide p {
  font: var(--body);
  color: var(--systemSecondary);
  margin: 0 0 16px 0;
}

.permission-guide ol {
  font: var(--body);
  color: var(--systemPrimary);
  padding-left: 24px;
  margin: 0;
}

.permission-guide li {
  margin-bottom: 8px;
}

.permission-guide li:last-child {
  margin-bottom: 0;
}

.location-actions {
  display: flex;
  gap: 12px;
}

.flex-1 {
  flex: 1;
}

/* 响应式 */
@media (max-width: 480px) {
  .location-validator {
    padding: 16px;
  }

  .location-status {
    padding: 16px;
  }

  .status-icon svg {
    width: 24px;
    height: 24px;
  }

  .info-row {
    flex-direction: column;
    gap: 4px;
  }

  .info-row .label {
    min-width: auto;
  }
}
</style>
