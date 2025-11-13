<template>
  <div class="records-list">
    <div class="list-header">
      <h2>打卡记录</h2>
      <div class="filters">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索用户..."
          class="search-input"
        >
        <select
          v-model="filterType"
          class="filter-select"
        >
          <option value="">
            所有类型
          </option>
          <option value="in">
            上班
          </option>
          <option value="out">
            下班
          </option>
          <option value="break_start">
            开始休息
          </option>
          <option value="break_end">
            结束休息
          </option>
        </select>
        <input
          v-model="filterDate"
          type="date"
          class="filter-date"
        >
      </div>
    </div>

    <div class="records-container">
      <!-- 桌面端表格视图 -->
      <div
        v-if="!isMobile"
        class="records-table"
      >
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>用户</th>
              <th>类型</th>
              <th>照片</th>
              <th>同步状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in filteredRecords"
              :key="record.id"
            >
              <td>{{ formatDateTime(record.timestamp) }}</td>
              <td>{{ getUserName(record.user_id) }}</td>
              <td>
                <span
                  class="type-badge"
                  :class="`type-${record.type}`"
                >
                  {{ getTypeName(record.type) }}
                </span>
              </td>
              <td>
                <button
                  class="btn-icon"
                  @click="viewPhoto(record)"
                >
                  📷
                </button>
              </td>
              <td>
                <span
                  class="sync-badge"
                  :class="record.synced ? 'synced' : 'pending'"
                >
                  {{ record.synced ? '已同步' : '待同步' }}
                </span>
              </td>
              <td>
                <button
                  class="btn-action"
                  @click="viewDetails(record)"
                >
                  查看
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 移动端卡片视图 -->
      <div
        v-else
        class="records-cards"
      >
        <AppleCard
          v-for="record in filteredRecords"
          :key="record.id"
          class="record-card"
          hoverable
          @click="viewDetails(record)"
        >
          <div class="card-header">
            <div class="card-time">{{ formatDateTime(record.timestamp) }}</div>
            <div class="card-actions">
              <span
                class="type-badge"
                :class="`type-${record.type}`"
              >
                {{ getTypeName(record.type) }}
              </span>
              <span
                class="sync-badge"
                :class="record.synced ? 'synced' : 'pending'"
              >
                {{ record.synced ? '已同步' : '待同步' }}
              </span>
            </div>
          </div>
          <div class="card-content">
            <div class="card-user">
              <strong>{{ getUserName(record.user_id) }}</strong>
            </div>
            <div class="card-buttons">
              <button
                class="btn-icon"
                @click.stop="viewPhoto(record)"
              >
                📷 照片
              </button>
              <button
                class="btn-action"
                @click.stop="viewDetails(record)"
              >
                查看详情
              </button>
            </div>
          </div>
        </AppleCard>
      </div>
    </div>

    <!-- 照片查看对话框 -->
    <Teleport to="body">
      <div
        v-if="showPhotoModal"
        class="modal-overlay"
        @click="showPhotoModal = false"
      >
        <div
          class="modal-card"
          @click.stop
        >
          <div class="modal-header">
            <h3>打卡照片</h3>
            <button
              class="close-button"
              @click="showPhotoModal = false"
            >
              ×
            </button>
          </div>
          <div class="modal-body">
            <img
              :src="selectedRecord?.photo"
              alt="打卡照片"
              class="photo-view"
            >
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 详情对话框 -->
    <Teleport to="body">
      <div
        v-if="showDetailsModal"
        class="modal-overlay"
        @click="showDetailsModal = false"
      >
        <div
          class="modal-card detail-modal"
          @click.stop
        >
          <div class="modal-header">
            <h3>打卡详情</h3>
            <button
              class="close-button"
              @click="showDetailsModal = false"
            >
              ×
            </button>
          </div>
          <div class="modal-body">
            <div class="detail-section">
              <h4>基本信息</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">打卡时间</span>
                  <span class="value">{{ formatDateTime(selectedRecord?.timestamp) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">用户ID</span>
                  <span class="value">{{ selectedRecord?.user_id }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">用户名称</span>
                  <span class="value">{{ getUserName(selectedRecord?.user_id) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">打卡类型</span>
                  <span class="value">
                    <span
                      class="type-badge"
                      :class="`type-${selectedRecord?.type}`"
                    >
                      {{ getTypeName(selectedRecord?.type) }}
                    </span>
                  </span>
                </div>
                <div class="detail-item">
                  <span class="label">同步状态</span>
                  <span class="value">
                    <span
                      class="sync-badge"
                      :class="selectedRecord?.synced ? 'synced' : 'pending'"
                    >
                      {{ selectedRecord?.synced ? '已同步' : '待同步' }}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div
              v-if="selectedRecord?.photo"
              class="detail-section"
            >
              <h4>打卡照片</h4>
              <div class="photo-container">
                <img
                  :src="selectedRecord.photo"
                  alt="打卡照片"
                  class="detail-photo"
                >
              </div>
            </div>

            <div
              v-if="selectedRecord?.syncedAt"
              class="detail-section"
            >
              <h4>同步信息</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">同步时间</span>
                  <span class="value">{{ formatDateTime(selectedRecord.syncedAt) }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">创建时间</span>
                  <span class="value">{{ formatDateTime(selectedRecord?.timestamp) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { supabase } from '@/services/supabase';

export default {
  name: 'RecordsList',

  setup() {
    const records = ref([]);
    const users = ref(new Map()); // 用户 ID -> 用户信息的映射
    const searchQuery = ref('');
    const filterType = ref('');
    const filterDate = ref('');
    const showPhotoModal = ref(false);
    const showDetailsModal = ref(false);
    const selectedRecord = ref(null);

    const filteredRecords = computed(() => {
      return records.value.filter(record => {
        const userName = getUserName(record.user_id);
        const matchesSearch = !searchQuery.value ||
          userName.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
          record.user_id.toLowerCase().includes(searchQuery.value.toLowerCase());
        
        const matchesType = !filterType.value || record.type === filterType.value;
        
        const matchesDate = !filterDate.value ||
          new Date(record.timestamp).toDateString() === new Date(filterDate.value).toDateString();

        return matchesSearch && matchesType && matchesDate;
      });
    });

    const isMobile = computed(() => {
      return window.innerWidth <= 768;
    });

    // 加载用户数据
    const loadUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*');

        if (error) throw error;

        const usersMap = new Map();
        data.forEach(user => {
          usersMap.set(user.id, user);
        });
        users.value = usersMap;
      } catch (error) {
        console.error('Load users error:', error);
      }
    };

    const loadRecords = async () => {
      try {
        const { data, error } = await supabase
          .from('punch_records')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(100);

        if (error) throw error;

        records.value = data.map(record => ({
          id: record.id,
          ...record,
          synced: true
        }));
      } catch (error) {
        console.error('Load records error:', error);
      }
    };

    // 获取用户昵称
    const getUserName = (userId) => {
      const user = users.value.get(userId);
      return user?.name || user?.email || userId;
    };

    const getTypeName = (type) => {
      const names = {
        'in': '上班',
        'out': '下班',
        'break_start': '开始休息',
        'break_end': '结束休息'
      };
      return names[type] || type;
    };

    const formatDateTime = (timestamp) => {
      return new Date(timestamp).toLocaleString('zh-CN');
    };

    const viewPhoto = (record) => {
      selectedRecord.value = record;
      showPhotoModal.value = true;
    };

    const viewDetails = (record) => {
      selectedRecord.value = record;
      showDetailsModal.value = true;
    };

    onMounted(async () => {
      await loadUsers();
      await loadRecords();
    });

    return {
      records,
      filteredRecords,
      isMobile,
      searchQuery,
      filterType,
      filterDate,
      showPhotoModal,
      showDetailsModal,
      selectedRecord,
      getUserName,
      getTypeName,
      formatDateTime,
      viewPhoto,
      viewDetails
    };
  }
};
</script>

<style scoped>
.records-list {
  width: 100%;
}

.records-container {
  width: 100%;
}

.records-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-card {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.record-card:hover {
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-time {
  font: var(--body-emphasized);
  color: var(--systemPrimary);
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-user {
  flex: 1;
}

.card-buttons {
  display: flex;
  gap: 8px;
}

.card-buttons .btn-icon,
.card-buttons .btn-action {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 6px;
}

.list-header {
  margin-bottom: 1.5rem;
}

.list-header h2 {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  color: #333;
}

.filters {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-input,
.filter-select,
.filter-date {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
}

.search-input {
  flex: 1;
  min-width: 200px;
}

.records-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #f8f9fa;
}

th,
td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

th {
  font-weight: 600;
  color: #495057;
}

.type-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.type-in {
  background: #d4edda;
  color: #155724;
}

.type-out {
  background: #f8d7da;
  color: #721c24;
}

.type-break_start {
  background: #d1ecf1;
  color: #0c5460;
}

.type-break_end {
  background: #d4edda;
  color: #155724;
}

.sync-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.sync-badge.synced {
  background: #d4edda;
  color: #155724;
}

.sync-badge.pending {
  background: #fff3cd;
  color: #856404;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
}

.btn-icon:hover {
  transform: scale(1.2);
}

.btn-action {
  padding: 0.5rem 1rem;
  border: none;
  background: #4DBA87;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-action:hover {
  background: #3da876;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content h3 {
  margin: 0 0 1rem 0;
}

.photo-view {
  width: 100%;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.location-info p {
  margin: 0.5rem 0;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

/* Apple 风格 Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.2s;
}

.modal-card {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-card.detail-modal {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin: 0;
}

.close-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.56);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background: rgba(0, 0, 0, 0.12);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

/* 详情样式 */
.detail-section {
  margin-bottom: 32px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section h4 {
  font-size: 17px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #007aff;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item .label {
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.56);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-item .value {
  font-size: 15px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
}

.detail-item .value.coord {
  font-family: 'SF Mono', Monaco, monospace;
  color: #007aff;
}

.photo-container {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.detail-photo {
  width: 100%;
  display: block;
}

.location-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.info-row .label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.72);
  min-width: 60px;
}

.info-row .value {
  color: rgba(0, 0, 0, 0.88);
  flex: 1;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 深色模式 */
@media (prefers-color-scheme: dark) {
  .modal-card {
    background: #1c1c1e;
  }
  
  .modal-header h3,
  .detail-section h4,
  .detail-item .value,
  .info-row .value {
    color: rgba(255, 255, 255, 0.92);
  }
  
  .detail-item .label,
  .info-row .label {
    color: rgba(255, 255, 255, 0.56);
  }
  
  .modal-header {
    border-bottom-color: rgba(255, 255, 255, 0.06);
  }
  
  .close-button {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
  }
  
  .close-button:hover {
    background: rgba(255, 255, 255, 0.16);
  }
  
  .info-row {
    background: rgba(255, 255, 255, 0.04);
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
    gap: 16px;
  }

  .list-header h2 {
    font: var(--title-2-emphasized);
  }

  .filters {
    flex-direction: column;
    width: 100%;
  }

  .search-input,
  .filter-select,
  .filter-date {
    width: 100%;
  }

  /* 表格卡片化 */
  .records-table {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  table {
    min-width: 800px;
  }

  th, td {
    padding: 12px 8px;
    font-size: 13px;
  }

  th:first-child,
  td:first-child {
    position: sticky;
    left: 0;
    background: white;
    z-index: 1;
  }

  @media (prefers-color-scheme: dark) {
    th:first-child,
    td:first-child {
      background: #000;
    }
  }

  .btn-icon,
  .btn-action {
    padding: 6px 10px;
    font-size: 12px;
  }

  .type-badge,
  .sync-badge {
    font-size: 11px;
    padding: 3px 8px;
  }

  .modal-card {
    width: 95%;
    max-width: none;
    margin: 0;
    max-height: 90vh;
  }

  .modal-header h3 {
    font: var(--body-emphasized);
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .photo-view {
    max-height: 50vh;
  }
}
</style>
