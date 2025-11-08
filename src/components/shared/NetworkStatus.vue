<template>
  <div v-if="networkStatus !== 'online'" class="network-status">
    <div class="status-indicator" :class="networkStatus">
      <svg v-if="networkStatus === 'offline'" viewBox="0 0 24 24" fill="none">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="status-text">
        {{ networkStatus === 'offline' ? '网络连接失败' : '检查网络连接...' }}
      </span>
    </div>
    <div v-if="networkStatus === 'offline'" class="status-message">
      Firebase服务在中国大陆可能需要使用VPN访问
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();
const networkStatus = computed(() => userStore.networkStatus);
</script>

<style scoped>
.network-status {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  max-width: 300px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: var(--global-border-radius-large);
  font-size: 14px;
  font-weight: 500;
  box-shadow: var(--shadow-medium);
}

.status-indicator.offline {
  background: var(--systemRed-onDark);
  color: white;
}

.status-indicator.checking {
  background: var(--systemOrange-onDark);
  color: white;
}

.status-text {
  flex: 1;
}

.status-message {
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--systemGray6);
  border-radius: var(--global-border-radius-medium);
  font-size: 12px;
  color: var(--systemGray);
  text-align: center;
}

@media (max-width: 768px) {
  .network-status {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
}
</style>