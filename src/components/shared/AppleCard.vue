/**
 * 通用卡片组件 - Apple 风格
 */
<template>
  <div 
    :class="[
      'apple-card',
      variant,
      {
        'hoverable': hoverable,
        'clickable': clickable
      }
    ]"
    @click="handleClick"
  >
    <slot />
  </div>
</template>

<script setup>
const props = defineProps({
  variant: {
    type: String,
    default: 'default', // default, elevated, outlined
    validator: (value) => ['default', 'elevated', 'outlined'].includes(value)
  },
  hoverable: {
    type: Boolean,
    default: false
  },
  clickable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const handleClick = (event) => {
  if (props.clickable) {
    emit('click', event)
  }
}
</script>

<style scoped>
.apple-card {
  background: var(--surface);
  border-radius: var(--global-border-radius-large);
  padding: 20px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (prefers-color-scheme: dark) {
  .apple-card {
    background: var(--systemQuaternary);
  }
}

/* 变体 */
.apple-card.default {
  box-shadow: var(--shadow-small);
}

.apple-card.elevated {
  box-shadow: var(--shadow-medium);
}

.apple-card.outlined {
  box-shadow: none;
  border: 1px solid var(--defaultLine);
}

/* 交互状态 */
.apple-card.hoverable:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.apple-card.clickable {
  cursor: pointer;
}

.apple-card.clickable:active {
  transform: translateY(0);
}

@media (max-width: 767px) {
  .apple-card {
    padding: 16px;
  }
}
</style>
