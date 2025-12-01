<template>
  <div class="progress-submissions">
    <div class="header">
      <h2>提交进度列表</h2>
      <div class="controls">
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <input v-model="search" placeholder="搜索用户或内容" class="search-input" />
        </div>
        <input v-model="filterDate" type="date" class="date-input" />
        <button class="refresh-btn" @click="loadSubmissions">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          刷新
        </button>
      </div>
    </div>

    <div v-if="filtered.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
        <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2"/>
      </svg>
      <p>暂无提交记录</p>
    </div>

    <div v-else class="list">
      <AppleCard 
        v-for="item in filtered" 
        :key="item.id" 
        class="submission-card" 
        hoverable 
        @click="openDetail(item)"
      >
        <div class="card-content">
          <div class="card-left">
            <div class="avatar">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/>
                <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
              </svg>
            </div>
            <div class="meta">
              <div class="user">{{ getUserName(item.user_id) }}</div>
              <div class="time">{{ formatDate(item.created_at) }}</div>
            </div>
          </div>
          <div class="card-right">
            <div class="content-preview">
              <span v-if="item.image_url" class="has-image-badge">
                <svg viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                  <polyline points="21 15 16 10 5 21" stroke="currentColor" stroke-width="2"/>
                </svg>
              </span>
              {{ item.content ? item.content.slice(0,80) + (item.content.length > 80 ? '...' : '') : (item.image_url ? '图片提交' : '-') }}
            </div>
            <svg class="arrow-icon" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </AppleCard>
    </div>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDetail" class="modal-overlay" @click="showDetail = false">
          <div class="modal-card" @click.stop>
            <div class="modal-header">
              <h3>提交详情</h3>
              <button class="close-btn" @click="showDetail = false">
                <svg viewBox="0 0 24 24" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="info-section">
                <div class="info-row">
                  <div class="info-item">
                    <span class="info-label">用户</span>
                    <span class="info-value">{{ getUserName(detail.user_id) }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">提交时间</span>
                    <span class="info-value">{{ formatDate(detail.created_at) }}</span>
                  </div>
                </div>
              </div>
              <div v-if="detail.content" class="detail-section">
                <h4>文字内容</h4>
                <div class="detail-text-content">
                  <p>{{ detail.content }}</p>
                </div>
              </div>
              <div v-if="detail.image_url" class="detail-section">
                <h4>图片附件</h4>
                <div class="detail-image">
                  <img :src="detail.image_url" alt="提交图片" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import AppleCard from '@/components/shared/AppleCard.vue';
import { supabase } from '@/services/supabase';
import { useUserStore } from '@/store/user';

export default {
  name: 'ProgressSubmissions',
  components: { AppleCard },
  setup() {
    const submissions = ref([]);
    const usersMap = ref(new Map());
    const search = ref('');
    const filterDate = ref('');
    const showDetail = ref(false);
    const detail = ref({});

    const loadUsers = async () => {
      try {
        const { data } = await supabase.from('users').select('*');
        const m = new Map();
        (data || []).forEach(u => m.set(u.id, u));
        usersMap.value = m;
      } catch (e) {}
    };

    const loadSubmissions = async () => {
      try {
        const { data } = await supabase
          .from('progress_submissions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);
        submissions.value = data || [];
      } catch (e) {
        // ignore
      }
    };

    const getUserName = (id) => {
      const u = usersMap.value.get(id);
      return u ? (u.name || u.email) : (id || '未知');
    };

    const formatDate = (ts) => ts ? new Date(ts).toLocaleString('zh-CN') : '-';

    const openDetail = (item) => {
      detail.value = item;
      showDetail.value = true;
    };

    const filtered = computed(() => {
      return submissions.value.filter(s => {
        const matchesSearch = !search.value || (s.content && s.content.toLowerCase().includes(search.value.toLowerCase())) || (getUserName(s.user_id).toLowerCase().includes(search.value.toLowerCase()));
        const matchesDate = !filterDate.value || new Date(s.created_at).toDateString() === new Date(filterDate.value).toDateString();
        return matchesSearch && matchesDate;
      });
    });

    onMounted(async () => {
      await loadUsers();
      await loadSubmissions();
    });

    return {
      submissions,
      search,
      filterDate,
      showDetail,
      detail,
      loadSubmissions,
      getUserName,
      formatDate,
      filtered,
      openDetail
    };
  }
};
</script>

<style scoped>
.progress-submissions {
  width: 100%;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.header h2 {
  margin: 0;
  font: var(--title-2-emphasized);
  color: var(--systemPrimary);
}

.controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  width: 18px;
  height: 18px;
  color: var(--systemTertiary);
  pointer-events: none;
}

.search-input {
  padding: 10px 12px 10px 40px;
  border: 1px solid var(--systemFill);
  border-radius: var(--global-border-radius-medium);
  font: var(--body);
  background: var(--surface);
  color: var(--systemPrimary);
  min-width: 200px;
  transition: all 0.2s var(--ease-out);
}

.search-input:focus {
  outline: none;
  border-color: var(--keyColor);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.date-input {
  padding: 10px 12px;
  border: 1px solid var(--systemFill);
  border-radius: var(--global-border-radius-medium);
  font: var(--body);
  background: var(--surface);
  color: var(--systemPrimary);
  transition: all 0.2s var(--ease-out);
}

.date-input:focus {
  outline: none;
  border-color: var(--keyColor);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: var(--global-border-radius-medium);
  background: var(--keyColor);
  color: white;
  font: var(--body-emphasized);
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
}

.refresh-btn svg {
  width: 16px;
  height: 16px;
}

.refresh-btn:hover {
  background: #0051d5;
  transform: translateY(-1px);
}

.refresh-btn:active {
  transform: translateY(0);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--systemTertiary);
}

.empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  font: var(--body);
  margin: 0;
}

/* List */
.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.submission-card {
  cursor: pointer;
  transition: all 0.2s var(--ease-out);
}

.submission-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  gap: 16px;
}

.card-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--keyColor) 0%, #5856d6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.avatar svg {
  width: 22px;
  height: 22px;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta .user {
  font: var(--body-emphasized);
  color: var(--systemPrimary);
}

.meta .time {
  font: var(--caption-1);
  color: var(--systemSecondary);
}

.card-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  justify-content: flex-end;
}

.content-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  font: var(--body);
  color: var(--systemSecondary);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.has-image-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--systemGreen);
  color: white;
  flex-shrink: 0;
}

.has-image-badge svg {
  width: 14px;
  height: 14px;
}

.arrow-icon {
  width: 20px;
  height: 20px;
  color: var(--systemTertiary);
  flex-shrink: 0;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 2000;
}

.modal-card {
  background: var(--surface);
  border-radius: 20px;
  max-width: 700px;
  width: 100%;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--systemFill);
}

.modal-header h3 {
  margin: 0;
  font: var(--title-3-emphasized);
  color: var(--systemPrimary);
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--systemQuaternary);
  color: var(--systemSecondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s var(--ease-out);
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

.close-btn:hover {
  background: var(--systemTertiary);
  color: var(--systemPrimary);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.info-section {
  margin-bottom: 24px;
}

.info-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  background: var(--systemQuaternary);
  border-radius: var(--global-border-radius-medium);
}

.info-label {
  font: var(--caption-1);
  color: var(--systemSecondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font: var(--body-emphasized);
  color: var(--systemPrimary);
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  font: var(--body-emphasized);
  color: var(--systemPrimary);
  padding-bottom: 8px;
  border-bottom: 2px solid var(--keyColor);
  display: inline-block;
}

.detail-text-content {
  padding: 16px;
  background: var(--systemQuaternary);
  border-radius: var(--global-border-radius-medium);
}

.detail-text-content p {
  margin: 0;
  font: var(--body);
  color: var(--systemPrimary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.detail-image {
  border-radius: var(--global-border-radius-large);
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.detail-image img {
  width: 100%;
  display: block;
}

/* Modal Animation */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-card,
.modal-leave-to .modal-card {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  .modal-card {
    background: #1c1c1e;
  }
  
  .submission-card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .controls {
    width: 100%;
  }
  
  .search-input {
    min-width: 0;
    flex: 1;
  }
  
  .card-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .card-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .content-preview {
    max-width: none;
    text-align: left;
  }
  
  .info-row {
    grid-template-columns: 1fr;
  }
  
  .modal-card {
    max-height: 90vh;
  }
}
</style>
