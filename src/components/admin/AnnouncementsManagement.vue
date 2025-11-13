<template>
  <div class="announcements-management">
    <div class="management-header">
      <h3>公告管理</h3>
      <AppleButton
        variant="primary"
        size="medium"
        @click="openCreateModal"
      >
        发布新公告
      </AppleButton>
    </div>

    <div v-if="loading" class="loading-state">
      <AppleLoading size="large" text="加载公告中..." />
    </div>

    <div v-else-if="announcements.length === 0" class="empty-state">
      <div class="empty-icon">📢</div>
      <p>暂无公告</p>
      <AppleButton
        variant="secondary"
        @click="showCreateModal = true"
      >
        发布第一个公告
      </AppleButton>
    </div>

    <div v-else class="announcements-list">
      <div
        v-for="announcement in announcements"
        :key="announcement.id"
        class="announcement-item"
      >
        <div class="announcement-header">
          <div class="announcement-info">
            <h4>{{ announcement.title }}</h4>
            <div class="announcement-meta">
              <span class="date">{{ formatDate(announcement.created_at) }}</span>
              <span class="status" :class="{ active: announcement.is_active }">
                {{ announcement.is_active ? '已发布' : '已隐藏' }}
              </span>
              <span class="priority" v-if="announcement.priority > 0">
                优先级: {{ announcement.priority }}
              </span>
            </div>
          </div>
          <div class="announcement-actions">
            <AppleButton
              variant="secondary"
              size="small"
              @click="editAnnouncement(announcement)"
            >
              编辑
            </AppleButton>
            <AppleButton
              :variant="announcement.is_active ? 'danger' : 'primary'"
              size="small"
              @click="toggleAnnouncementStatus(announcement)"
            >
              {{ announcement.is_active ? '隐藏' : '发布' }}
            </AppleButton>
            <AppleButton
              variant="danger"
              size="small"
              @click="deleteAnnouncement(announcement)"
            >
              删除
            </AppleButton>
          </div>
        </div>
        <div class="announcement-content">
          {{ truncateContent(announcement.content) }}
          <button
            v-if="announcement.content.length > 100"
            class="expand-btn"
            @click="toggleExpanded(announcement.id)"
          >
            {{ expandedAnnouncements.includes(announcement.id) ? '收起' : '展开' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 创建/编辑公告模态框 -->
    <Teleport to="body">
      <div
        v-if="showCreateModal || editingAnnouncement"
        class="modal-overlay"
        @click.self="closeModal"
      >
        <AppleCard
          class="modal-card announcement-modal"
        >
          <div class="modal-header">
            <h3>{{ editingAnnouncement ? '编辑公告' : '发布新公告' }}</h3>
          </div>
          <div class="modal-body">
            <form @submit.prevent="submitAnnouncement">
              <div class="form-group">
                <label for="title">公告标题 *</label>
                <input
                  id="title"
                  v-model="form.title"
                  type="text"
                  required
                  placeholder="请输入公告标题"
                  maxlength="100"
                >
              </div>

              <div class="form-group">
                <label for="content">公告内容 *</label>
                <textarea
                  id="content"
                  v-model="form.content"
                  required
                  placeholder="请输入公告内容"
                  rows="6"
                  maxlength="2000"
                />
                <div class="char-count">
                  {{ form.content.length }}/2000
                </div>
              </div>

              <div class="form-group">
                <label for="priority">优先级</label>
                <select id="priority" v-model.number="form.priority">
                  <option :value="0">普通</option>
                  <option :value="1">重要</option>
                  <option :value="2">紧急</option>
                </select>
              </div>

              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input
                    :checked="form.is_active"
                    type="checkbox"
                    @change="form.is_active = $event.target.checked"
                  >
                  立即发布
                </label>
                <div style="margin-left: 10px; font-size: 12px; color: #666;">
                  当前状态: {{ form.is_active ? '立即发布' : '草稿' }}
                </div>
              </div>

              <div class="modal-actions">
                <AppleButton
                  variant="secondary"
                  type="button"
                  @click="closeModal"
                >
                  取消
                </AppleButton>
                <AppleButton
                  variant="primary"
                  type="submit"
                  :disabled="submitting"
                  :loading="submitting"
                >
                  {{ editingAnnouncement ? '更新公告' : '发布公告' }}
                </AppleButton>
              </div>
            </form>
          </div>
        </AppleCard>
      </div>
    </Teleport>

    <!-- 删除确认对话框 -->
    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        class="modal-overlay"
        @click="showDeleteConfirm = false"
      >
        <AppleCard
          class="modal-card confirm-modal"
          @click.stop
        >
          <div class="modal-header">
            <h3>确认删除公告</h3>
          </div>
          <div class="modal-body">
            <p>确定要删除公告 <strong>{{ deletingAnnouncement?.title }}</strong> 吗？</p>
            <p class="warning-text">此操作不可恢复！</p>
          </div>
          <div class="modal-actions">
            <AppleButton
              variant="secondary"
              @click="showDeleteConfirm = false"
            >
              取消
            </AppleButton>
            <AppleButton
              variant="danger"
              :disabled="deleting"
              @click="confirmDelete"
            >
              {{ deleting ? '删除中...' : '确认删除' }}
            </AppleButton>
          </div>
        </AppleCard>
      </div>
    </Teleport>

    <!-- 成功提示 -->
    <AppleToast
      :visible="showSuccessToast"
      type="success"
      :message="successMessage"
      @update:visible="showSuccessToast = $event"
    />

    <!-- 错误提示 -->
    <AppleToast
      :visible="showErrorToast"
      type="error"
      :message="errorMessage"
      @update:visible="showErrorToast = $event"
    />
  </div>
</template>

<script>
import { ref, reactive, onMounted, nextTick } from 'vue';
import { useAnnouncementsStore } from '@/store/announcements';
import { announcementsService } from '@/services/supabase';
import AppleButton from '@/components/shared/AppleButton.vue';
import AppleCard from '@/components/shared/AppleCard.vue';
import AppleLoading from '@/components/shared/AppleLoading.vue';
import AppleToast from '@/components/shared/AppleToast.vue';

export default {
  name: 'AnnouncementsManagement',
  components: {
    AppleButton,
    AppleCard,
    AppleLoading,
    AppleToast
  },
  setup() {
    const announcementsStore = useAnnouncementsStore();

    const loading = ref(false);
    const announcements = ref([]);
    const showCreateModal = ref(false);
    const editingAnnouncement = ref(null);
    const showDeleteConfirm = ref(false);
    const deletingAnnouncement = ref(null);
    const expandedAnnouncements = ref([]);
    const submitting = ref(false);
    const deleting = ref(false);
    const showSuccessToast = ref(false);
    const showErrorToast = ref(false);
    const successMessage = ref('');
    const errorMessage = ref('');

    const form = reactive({
      title: '',
      content: '',
      priority: 0,
      is_active: true
    });

    const loadAnnouncements = async () => {
      loading.value = true;
      try {
        // 获取所有公告（包括未发布的）
        const data = await announcementsService.getAllAnnouncements();
        announcements.value = data || [];
      } catch (error) {
        errorMessage.value = '加载公告失败：' + error.message;
        showErrorToast.value = true;
      } finally {
        loading.value = false;
      }
    };

    const submitAnnouncement = async () => {
      console.log('Submitting announcement with is_active:', form.is_active);
      if (!form.title.trim() || !form.content.trim()) {
        errorMessage.value = '请填写完整的公告信息';
        showErrorToast.value = true;
        return;
      }

      submitting.value = true;
      try {
        if (editingAnnouncement.value) {
          await announcementsStore.updateAnnouncement(editingAnnouncement.value.id, {
            title: form.title.trim(),
            content: form.content.trim(),
            priority: form.priority,
            is_active: form.is_active
          });
          successMessage.value = '公告更新成功';
        } else {
          await announcementsStore.createAnnouncement({
            title: form.title.trim(),
            content: form.content.trim(),
            priority: form.priority,
            is_active: form.is_active
          });
          successMessage.value = '公告发布成功';
        }

        showSuccessToast.value = true;
        await loadAnnouncements();
        closeModal();
      } catch (error) {
        errorMessage.value = '操作失败：' + error.message;
        showErrorToast.value = true;
      } finally {
        submitting.value = false;
      }
    };

    const editAnnouncement = (announcement) => {
      editingAnnouncement.value = announcement;
      form.title = announcement.title;
      form.content = announcement.content;
      form.priority = announcement.priority || 0;
      form.is_active = announcement.is_active;
    };

    const toggleAnnouncementStatus = async (announcement) => {
      try {
        await announcementsStore.updateAnnouncement(announcement.id, {
          is_active: !announcement.is_active
        });
        successMessage.value = announcement.is_active ? '公告已隐藏' : '公告已发布';
        showSuccessToast.value = true;
        await loadAnnouncements();
      } catch (error) {
        errorMessage.value = '操作失败：' + error.message;
        showErrorToast.value = true;
      }
    };

    const deleteAnnouncement = (announcement) => {
      deletingAnnouncement.value = announcement;
      showDeleteConfirm.value = true;
    };

    const confirmDelete = async () => {
      deleting.value = true;
      try {
        await announcementsStore.deleteAnnouncement(deletingAnnouncement.value.id);
        successMessage.value = '公告删除成功';
        showSuccessToast.value = true;
        await loadAnnouncements();
        showDeleteConfirm.value = false;
        deletingAnnouncement.value = null;
      } catch (error) {
        errorMessage.value = '删除失败：' + error.message;
        showErrorToast.value = true;
      } finally {
        deleting.value = false;
      }
    };

    const closeModal = () => {
      showCreateModal.value = false;
      editingAnnouncement.value = null;
      form.title = '';
      form.content = '';
      form.priority = 0;
      form.is_active = true;
    };

    const openCreateModal = () => {
      showCreateModal.value = true;
      editingAnnouncement.value = null;
      // 重置表单
      form.title = '';
      form.content = '';
      form.priority = 0;
      form.is_active = true;
      nextTick(() => {
        console.log('Modal opened, form.is_active:', form.is_active);
      });
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const truncateContent = (content) => {
      if (expandedAnnouncements.value.includes(content.id) || content.length <= 100) {
        return content;
      }
      return content.substring(0, 100) + '...';
    };

    const toggleExpanded = (id) => {
      const index = expandedAnnouncements.value.indexOf(id);
      if (index > -1) {
        expandedAnnouncements.value.splice(index, 1);
      } else {
        expandedAnnouncements.value.push(id);
      }
    };

    onMounted(() => {
      loadAnnouncements();
    });

    return {
      loading,
      announcements,
      showCreateModal,
      editingAnnouncement,
      showDeleteConfirm,
      deletingAnnouncement,
      expandedAnnouncements,
      submitting,
      deleting,
      showSuccessToast,
      showErrorToast,
      successMessage,
      errorMessage,
      form,
      submitAnnouncement,
      editAnnouncement,
      toggleAnnouncementStatus,
      deleteAnnouncement,
      confirmDelete,
      closeModal,
      openCreateModal,
      formatDate,
      truncateContent,
      toggleExpanded
    };
  }
};
</script>

<style scoped>
.announcements-management {
  padding: 20px 0;
}

.management-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.management-header h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.announcements-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.announcement-item {
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  background: #fff;
}

.announcement-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.announcement-info h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.announcement-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  font-size: 14px;
  color: #666;
}

.status.active {
  color: #34c759;
}

.priority {
  color: #ff9500;
}

.announcement-actions {
  display: flex;
  gap: 8px;
}

.announcement-content {
  color: #333;
  line-height: 1.5;
  position: relative;
}

.expand-btn {
  background: none;
  border: none;
  color: #007aff;
  cursor: pointer;
  font-size: 14px;
  margin-left: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.expand-btn:hover {
  background: rgba(0, 122, 255, 0.1);
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-card {
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.announcement-modal .modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #007aff;
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
}

.char-count {
  text-align: right;
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: normal;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin-right: 8px;
  -webkit-appearance: checkbox;
  appearance: checkbox;
  cursor: pointer;
  position: relative;
  z-index: 1;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.confirm-modal .modal-body {
  padding: 24px;
}

.warning-text {
  color: #ff3b30;
  font-weight: 500;
}

@media (max-width: 768px) {
  .announcement-header {
    flex-direction: column;
    gap: 12px;
  }

  .announcement-actions {
    flex-wrap: wrap;
  }

  .modal-card {
    margin: 20px;
  }
}
</style>