import { createRouter, createWebHistory } from 'vue-router';
import { useUserStore } from '@/store/user';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue')
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/ResetPassword.vue')
  },
  {
    path: '/punch',
    name: 'Punch',
    component: () => import('@/views/PunchView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();

  // 初始化认证状态
  if (!userStore.user) {
    await userStore.initAuth();
  }

  // 检查是否需要认证
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!userStore.isAuthenticated) {
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      });
      return;
    }

    // 检查是否需要管理员权限
    if (to.matched.some(record => record.meta.requiresAdmin)) {
      if (!userStore.isAdmin) {
        next({ path: '/' });
        return;
      }
    }
  }

  next();
});

export default router;
