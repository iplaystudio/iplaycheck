// 公告状态管理
import { defineStore } from 'pinia';
import { announcementsService } from '@/services/supabase';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';

const LAST_NOTIFIED_KEY = 'lastNotifiedAnnouncementId';

export const useAnnouncementsStore = defineStore('announcements', {
  state: () => ({
    announcements: [],
    loading: false,
    error: null,
    notificationPermissionChecked: false,
    initialized: false,
    lastNotifiedAnnouncementId: null
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
        await this.ensureNotificationPermission();
        await this.checkAndNotifyLatest();
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    // 初始化：保证只订阅/加载一次
    async init() {
      if (this.initialized) return;
      this.initialized = true;
      await this.loadAnnouncements();
      this.subscribeToUpdates();
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
            this.triggerAnnouncementNotification(newRecord);
          }
          break;
        case 'UPDATE': {
          const index = this.announcements.findIndex(ann => ann.id === newRecord.id);
          if (index !== -1) {
            this.announcements[index] = newRecord;
          }
          break;
        }
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
    },

    // ---------------- 通知 ----------------
    async ensureNotificationPermission() {
      // 仅在原生 Capacitor 或 PWA 安装环境有意义；浏览器可继续运行但不会强求权限
      if (this.notificationPermissionChecked) return;
      this.notificationPermissionChecked = true;
      try {
        const status = await LocalNotifications.checkPermissions();
        if (status.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          if (req.display !== 'granted') {
            return;
          }
        }

        // Android 8+ 需要通知渠道
        try {
          await LocalNotifications.createChannel({
            id: 'announcements',
            name: 'Announcements',
            description: '实时公告通知',
            importance: 5,
            sound: 'default',
            vibration: true,
            lights: true
          });
        } catch (e) {
          // ignore
        }
      } catch (err) {
        // 如果环境不支持本地通知则忽略
      }
    },

    async recordLastNotifiedId(id) {
      this.lastNotifiedAnnouncementId = id;
      try {
        await Preferences.set({ key: LAST_NOTIFIED_KEY, value: String(id) });
      } catch (e) {
        // ignore persistence errors
      }
    },

    async loadLastNotifiedId() {
      if (this.lastNotifiedAnnouncementId) return this.lastNotifiedAnnouncementId;
      try {
        const { value } = await Preferences.get({ key: LAST_NOTIFIED_KEY });
        if (value) {
          this.lastNotifiedAnnouncementId = value;
        }
      } catch (e) {
        // ignore
      }
      return this.lastNotifiedAnnouncementId;
    },

    async checkAndNotifyLatest() {
      if (!this.announcements.length) return;
      const latest = this.announcements.find(a => a.is_active);
      if (!latest) return;

      const lastId = await this.loadLastNotifiedId();
      if (lastId && String(lastId) === String(latest.id)) return;

      await this.triggerAnnouncementNotification(latest);
    },

    async triggerAnnouncementNotification(announcement) {
      try {
        const status = await LocalNotifications.checkPermissions();
        if (status.display !== 'granted') {
          const req = await LocalNotifications.requestPermissions();
          if (req.display !== 'granted') return;
        }

        const title = announcement.title || '新公告';
        const body = announcement.content || announcement.summary || '有新的公告，请查看。';

        await LocalNotifications.schedule({
          notifications: [
            {
              id: Date.now() % 2147483647,
              title,
              body,
              smallIcon: 'iplaycheckicon',
              channelId: 'announcements',
              sound: 'default',
              iconColor: '#0f172a',
              // 去掉 largeIcon，避免路径解析失败
              extra: { announcementId: announcement.id }
            }
          ]
        });

        await this.recordLastNotifiedId(announcement.id);
      } catch (err) {
        // 忽略通知失败
      }
    }
  }
});