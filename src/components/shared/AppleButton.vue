/**
 * 通用按钮组件 - Apple 风格
 */
<template>
  <button 
    :class="[
      'apple-button',
      variant,
      size,
      {
        'loading': loading,
        'disabled': disabled,
        'full-width': fullWidth
      }
    ]"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <span v-if="loading" class="spinner"></span>
    <slot v-else />
  </button>
</template>

<script setup>
const props = defineProps({
  variant: {
    type: String,
    default: 'primary', // primary, secondary, tertiary, danger
    validator: (value) => ['primary', 'secondary', 'tertiary', 'danger'].includes(value)
  },
  size: {
    type: String,
    default: 'medium', // small, medium, large
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  loading: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  fullWidth: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const handleClick = (event) => {
  if (!props.loading && !props.disabled) {
    emit('click', event)
  }
}
</script>

<style scoped>
.apple-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: var(--global-border-radius-small);
  font: var(--body-emphasized);
  font-family: var(--font-family);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

/* 尺寸变体 */
.apple-button.small {
  padding: 8px 16px;
  font: var(--callout-emphasized);
  min-height: 32px;
}

.apple-button.medium {
  padding: 12px 20px;
  font: var(--body-emphasized);
  min-height: 44px;
}

.apple-button.large {
  padding: 16px 24px;
  font: var(--title-3-emphasized);
  min-height: 52px;
}

/* 样式变体 */
.apple-button.primary {
  background: var(--keyColor);
  color: white;
  box-shadow: 0 2px 8px rgba(var(--keyColor-rgb), 0.3);
}

.apple-button.primary:hover:not(:disabled) {
  background: #0051d5;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--keyColor-rgb), 0.4);
}

.apple-button.primary:active:not(:disabled) {
  transform: translateY(0);
}

.apple-button.secondary {
  background: var(--systemQuinary);
  color: var(--systemPrimary);
}

.apple-button.secondary:hover:not(:disabled) {
  background: var(--systemQuaternary);
}

.apple-button.tertiary {
  background: transparent;
  border: 1.5px solid var(--keyColor);
  color: var(--keyColor);
}

.apple-button.tertiary:hover:not(:disabled) {
  background: rgba(var(--keyColor-rgb), 0.08);
}

.apple-button.danger {
  background: var(--systemRed);
  color: white;
  box-shadow: 0 2px 8px rgba(255, 59, 48, 0.3);
}

.apple-button.danger:hover:not(:disabled) {
  background: #d70015;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 59, 48, 0.4);
}

/* 状态 */
.apple-button:disabled,
.apple-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.apple-button.loading {
  cursor: wait;
}

.apple-button.full-width {
  width: 100%;
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

/* 暗色模式优化 */
@media (prefers-color-scheme: dark) {
  .apple-button.primary {
    background: var(--keyColor);
  }
  
  .apple-button.primary:hover:not(:disabled) {
    background: #0077ed;
  }
  
  .apple-button.secondary {
    background: var(--systemQuaternary);
  }
  
  .apple-button.tertiary {
    border-color: var(--keyColor);
  }
}
</style>
