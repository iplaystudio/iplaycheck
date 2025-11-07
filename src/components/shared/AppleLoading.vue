/**
 * Loading 加载指示器 - Apple 风格
 */
<template>
  <div :class="['apple-loading', size]">
    <div class="loading-spinner">
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
      <div class="spinner-ring"></div>
    </div>
    <p v-if="text" class="loading-text">{{ text }}</p>
  </div>
</template>

<script setup>
defineProps({
  size: {
    type: String,
    default: 'medium', // small, medium, large
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  text: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.apple-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.loading-spinner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 设置容器尺寸 */
.apple-loading.small .loading-spinner {
  width: 20px;
  height: 20px;
}

.apple-loading.medium .loading-spinner {
  width: 32px;
  height: 32px;
}

.apple-loading.large .loading-spinner {
  width: 48px;
  height: 48px;
}

.spinner-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: var(--systemPrimary);
  animation: spin 0.8s linear infinite;
}

.spinner-ring:nth-child(1) { animation-delay: 0s; opacity: 1; }
.spinner-ring:nth-child(2) { animation-delay: 0.1s; opacity: 0.9; }
.spinner-ring:nth-child(3) { animation-delay: 0.2s; opacity: 0.8; }
.spinner-ring:nth-child(4) { animation-delay: 0.3s; opacity: 0.7; }
.spinner-ring:nth-child(5) { animation-delay: 0.4s; opacity: 0.6; }
.spinner-ring:nth-child(6) { animation-delay: 0.5s; opacity: 0.5; }
.spinner-ring:nth-child(7) { animation-delay: 0.6s; opacity: 0.4; }
.spinner-ring:nth-child(8) { animation-delay: 0.7s; opacity: 0.3; }

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  margin: 0;
  font: var(--body);
  color: var(--systemSecondary);
}

@media (prefers-color-scheme: dark) {
  .spinner-ring {
    border-top-color: var(--systemPrimary);
  }
}
</style>
