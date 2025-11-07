/**
 * Toast 通知组件 - Apple 风格
 */
<template>
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="visible" :class="['apple-toast', type]" @click="hide">
        <div class="toast-icon">
          <svg v-if="type === 'success'" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M8 12l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="type === 'error'" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <svg v-else-if="type === 'warning'" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 20h20L12 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="toast-message">{{ message }}</div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  message: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'info', // success, error, warning, info
    validator: (value) => ['success', 'error', 'warning', 'info'].includes(value)
  },
  duration: {
    type: Number,
    default: 3000
  },
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible'])

let timer = null

const hide = () => {
  emit('update:visible', false)
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      hide()
    }, props.duration)
  }
})
</script>

<style scoped>
.apple-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-radius: var(--global-border-radius-large);
  background: var(--systemPrimary-onDark);
  box-shadow: var(--shadow-large);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  max-width: 90%;
  cursor: pointer;
}

@media (prefers-color-scheme: dark) {
  .apple-toast {
    background: rgba(28, 28, 30, 0.95);
  }
}

.toast-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.apple-toast.success {
  border-left: 4px solid var(--systemGreen);
}

.apple-toast.success .toast-icon {
  color: var(--systemGreen);
}

.apple-toast.error {
  border-left: 4px solid var(--systemRed);
}

.apple-toast.error .toast-icon {
  color: var(--systemRed);
}

.apple-toast.warning {
  border-left: 4px solid var(--systemOrange);
}

.apple-toast.warning .toast-icon {
  color: var(--systemOrange);
}

.apple-toast.info {
  border-left: 4px solid var(--keyColor);
}

.apple-toast.info .toast-icon {
  color: var(--keyColor);
}

.toast-message {
  font: var(--body);
  color: var(--systemPrimary);
  line-height: 1.4;
}

/* 过渡动画 */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

@media (max-width: 767px) {
  .apple-toast {
    top: 70px;
    padding: 12px 16px;
  }
}
</style>
