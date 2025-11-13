// 公告状态管理
import { defineStore } from 'pinia';
import { announcementsService } from '@/services/supabase';
import { supabase } from '@/services/supabase';

// 获取正确的图标路径
const getIconPath = () => {
  // 检查是否在浏览器环境中
  if (typeof window === 'undefined') {
    return '/icon.jpg'; // 服务端默认路径
  }

  // 生产环境使用 /iplaycheck/icon.jpg，开发环境使用 /icon.jpg
  const isProduction = window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';
  return isProduction ? '/iplaycheck/icon.jpg' : '/icon.jpg';
};

export const useAnnouncementsStore = defineStore('announcements', {
  state: () => ({
    announcements: [],
    loading: false,
    error: null
  }),

  getters: {
    // 获取最新公告
    latestAnnouncement: (state) => {
      return state.announcements.length > 0 ? state.announcements[0] : null;
    },

    // 获取活跃公告数量
    activeCount: (state) => {
      return state.announcements.filter(ann => ann.is_active).length;
    },

    // 暴露announcementsService供组件使用
    announcementsService: () => announcementsService
  },

  actions: {
    // 加载公告
    async loadAnnouncements() {
      this.loading = true;
      this.error = null;
      try {
        const data = await announcementsService.getAnnouncements();
        this.announcements = data;
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    // 订阅实时更新
    subscribeToUpdates() {
      if (this.subscription) {
        this.subscription.unsubscribe();
      }

      this.subscription = announcementsService.subscribeToAnnouncements((payload) => {
        this.handleRealtimeUpdate(payload);
      });
    },

    // 处理实时更新
    handleRealtimeUpdate(payload) {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      switch (eventType) {
        case 'INSERT':
          if (newRecord.is_active) {
            this.announcements.unshift(newRecord);
          }
          break;
        case 'UPDATE':
          const index = this.announcements.findIndex(ann => ann.id === newRecord.id);
          if (index !== -1) {
            this.announcements[index] = newRecord;
          }
          break;
        case 'DELETE':
          this.announcements = this.announcements.filter(ann => ann.id !== oldRecord.id);
          break;
      }
    },

    // 创建公告（管理员）
    async createAnnouncement(announcement) {
      try {
        const newAnn = await announcementsService.createAnnouncement(announcement);
        return newAnn;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    // 更新公告
    async updateAnnouncement(id, updates) {
      try {
        const updatedAnn = await announcementsService.updateAnnouncement(id, updates);
        return updatedAnn;
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    // 删除公告
    async deleteAnnouncement(id) {
      try {
        await announcementsService.deleteAnnouncement(id);
      } catch (error) {
        this.error = error.message;
        throw error;
      }
    },

    // 取消订阅实时更新
    unsubscribe() {
      if (this.subscription) {
        this.subscription.unsubscribe();
        this.subscription = null;
      }
    }
  }
});