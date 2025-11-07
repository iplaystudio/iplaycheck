<template>
  <div class="punch-view">
    <PunchClock />
  </div>
</template>

<script setup>
import PunchClock from '@/components/user/PunchClock.vue'
</script>

<style scoped>
.punch-view {
  width: 100%;
  min-height: 100vh;
  background: #f2f2f7;
}

@media (prefers-color-scheme: dark) {
  .punch-view {
    background: #000;
  }
}

@media (max-width: 768px) {
  .punch-view {
    padding: 16px 0;
  }
}

@media (max-width: 480px) {
  .punch-view {
    padding: 12px 0;
  }
}
</style>
