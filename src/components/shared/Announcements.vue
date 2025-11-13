<template>
  <div class="announcements">
    <AppleCard class="announcements-card">
      <div class="announcements-header">
        <h3>公告</h3>
        <div v-if="announcementsStore.loading" class="loading">
          <AppleLoading size="small" />
        </div>
      </div>

      <div v-if="announcementsStore.error" class="error-message">
        {{ announcementsStore.error }}
      </div>

      <div v-else-if="announcementsStore.announcements.length === 0" class="no-announcements">
        暂无公告
      </div>

      <div v-else class="announcements-list">
        <div
          v-for="announcement in announcementsStore.announcements.slice(0, showAll ? undefined : 3)"
          :key="announcement.id"
          class="announcement-item"
          :class="{ 'new': isNew(announcement) }"
        >
          <div class="announcement-header">
            <h4>{{ announcement.title }}</h4>
            <span class="announcement-date">
              {{ formatDate(announcement.created_at) }}
            </span>
          </div>
          <div class="announcement-content">
            {{ truncateContent(announcement.content) }}
          </div>
          <div v-if="announcement.content.length > 100" class="read-more">
            <button @click="toggleExpanded(announcement.id)" class="read-more-btn">
              {{ expandedAnnouncements.includes(announcement.id) ? '收起' : '展开' }}
            </button>
          </div>
        </div>

        <div v-if="announcementsStore.announcements.length > 3 && !showAll" class="show-more">
          <AppleButton @click="showAll = true" variant="secondary" size="small">
            查看更多公告
          </AppleButton>
        </div>
      </div>
    </AppleCard>
  </div>
</template>

<script>
import { useAnnouncementsStore } from '@/store/announcements';
import AppleCard from './AppleCard.vue';
import AppleLoading from './AppleLoading.vue';
import AppleButton from './AppleButton.vue';

export default {
  name: 'Announcements',
  components: {
    AppleCard,
    AppleLoading,
    AppleButton
  },
  data() {
    return {
      showAll: false,
      expandedAnnouncements: []
    };
  },
  computed: {
    announcementsStore() {
      return useAnnouncementsStore();
    }
  },
  mounted() {
    // 加载公告并订阅更新
    this.announcementsStore.loadAnnouncements();
    this.announcementsStore.subscribeToUpdates();
  },
  beforeUnmount() {
    // 取消订阅
    this.announcementsStore.unsubscribe();
  },
  methods: {
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    },

    truncateContent(content) {
      if (this.expandedAnnouncements.includes(content.id) || content.length <= 100) {
        return content;
      }
      return content.substring(0, 100) + '...';
    },

    toggleExpanded(id) {
      const index = this.expandedAnnouncements.indexOf(id);
      if (index > -1) {
        this.expandedAnnouncements.splice(index, 1);
      } else {
        this.expandedAnnouncements.push(id);
      }
    },

    isNew(announcement) {
      const announcementDate = new Date(announcement.created_at);
      const now = new Date();
      const diffInHours = (now - announcementDate) / (1000 * 60 * 60);
      return diffInHours < 24; // 24小时内为新公告
    }
  }
};
</script>

<style scoped>
.announcements {
  margin-bottom: 20px;
}

.announcements-card {
  padding: 16px;
}

.announcements-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.announcements-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
}

.error-message {
  color: #ff3b30;
  font-size: 14px;
  text-align: center;
  padding: 16px;
}

.no-announcements {
  text-align: center;
  color: #8e8e93;
  padding: 32px;
  font-size: 16px;
}

.announcements-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.announcement-item {
  padding: 12px;
  border-radius: 8px;
  background: #f2f2f7;
  transition: background-color 0.2s;
}

.announcement-item.new {
  background: #e3f2fd;
  border-left: 4px solid #007aff;
}

.announcement-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.announcement-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  flex: 1;
}

.announcement-date {
  font-size: 12px;
  color: #8e8e93;
  margin-left: 8px;
  flex-shrink: 0;
}

.announcement-content {
  font-size: 14px;
  line-height: 1.4;
  color: #1c1c1e;
  margin-bottom: 8px;
}

.read-more {
  text-align: right;
}

.read-more-btn {
  background: none;
  border: none;
  color: #007aff;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.read-more-btn:hover {
  background: rgba(0, 122, 255, 0.1);
}

.show-more {
  text-align: center;
  margin-top: 16px;
}
</style>