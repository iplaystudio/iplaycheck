<template>
  <div class="admin-view">
    <AdminDashboard />
  </div>
</template>

<script>
import AdminDashboard from '@/components/admin/AdminDashboard.vue';

export default {
  name: 'AdminView',
  components: {
    AdminDashboard
  }
};
</script>

<style scoped>
.admin-view {
  width: 100%;
}
</style>
