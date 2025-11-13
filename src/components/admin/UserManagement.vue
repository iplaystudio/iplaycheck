<template>
  <div class="user-management">
    <div class="management-header">
      <h2>用户管理</h2>
      <AppleButton
        variant="primary"
        @click="showAddUserModal = true"
      >
        添加用户
      </AppleButton>
    </div>

    <div class="users-container">
      <!-- 桌面端表格视图 -->
      <AppleCard
        v-if="!isMobile"
        class="users-table"
      >
        <table>
          <thead>
            <tr>
              <th>用户ID</th>
              <th>姓名</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in users"
              :key="user.id"
            >
              <td>{{ user.id }}</td>
              <td>{{ user.name }}</td>
              <td>{{ user.email }}</td>
              <td>
                <span
                  class="role-badge"
                  :class="`role-${user.role}`"
                >
                  {{ getRoleName(user.role) }}
                </span>
              </td>
              <td>{{ formatDate(user.created_at) }}</td>
              <td class="action-cell">
                <AppleButton
                  variant="secondary"
                  size="small"
                  @click="editUser(user)"
                >
                  编辑
                </AppleButton>
              </td>
            </tr>
          </tbody>
        </table>
      </AppleCard>

      <!-- 移动端卡片视图 -->
      <div
        v-else
        class="users-cards"
      >
        <AppleCard
          v-for="user in users"
          :key="user.id"
          class="user-card"
          hoverable
        >
          <div class="card-header">
            <div class="card-name">{{ user.name }}</div>
            <span
              class="role-badge"
              :class="`role-${user.role}`"
            >
              {{ getRoleName(user.role) }}
            </span>
          </div>
          <div class="card-content">
            <div class="card-info">
              <div class="card-email">{{ user.email }}</div>
              <div class="card-id">ID: {{ user.id }}</div>
              <div class="card-date">创建时间: {{ formatDate(user.created_at) }}</div>
            </div>
            <div class="card-actions">
              <AppleButton
                variant="secondary"
                size="small"
                @click="editUser(user)"
              >
                编辑
              </AppleButton>
            </div>
          </div>
        </AppleCard>
      </div>
    </div>

    <!-- 添加/编辑用户对话框 -->
    <Teleport to="body">
      <div
        v-if="showAddUserModal || showEditUserModal"
        class="modal-overlay"
        @click.self="closeModals"
      >
        <AppleCard class="modal-content">
          <h3>{{ showEditUserModal ? '编辑用户' : '添加用户' }}</h3>
          <form @submit.prevent="saveUser">
            <div class="form-group">
              <label>姓名</label>
              <input
                v-model="userForm.name"
                type="text"
                required
              >
            </div>
            <div class="form-group">
              <label>邮箱</label>
              <input
                v-model="userForm.email"
                type="email"
                required
              >
            </div>
            <div
              v-if="!showEditUserModal"
              class="form-group"
            >
              <label>密码</label>
              <input
                v-model="userForm.password"
                type="password"
                required
              >
            </div>
            <div class="form-group">
              <label>角色</label>
              <select
                v-model="userForm.role"
                required
              >
                <option value="user">
                  普通用户
                </option>
                <option value="admin">
                  管理员
                </option>
              </select>
            </div>
            <div class="form-actions">
              <AppleButton
                variant="primary"
                type="submit"
              >
                保存
              </AppleButton>
              <AppleButton
                variant="secondary"
                type="button"
                @click="closeModals"
              >
                取消
              </AppleButton>
            </div>
          </form>
        </AppleCard>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/services/supabase';
import AppleButton from '@/components/shared/AppleButton.vue';
import AppleCard from '@/components/shared/AppleCard.vue';

export default {
  name: 'UserManagement',

  components: {
    AppleButton,
    AppleCard
  },

  setup() {
    const users = ref([]);
    const showAddUserModal = ref(false);
    const showEditUserModal = ref(false);
    const userForm = ref({
      name: '',
      email: '',
      password: '',
      role: 'user'
    });
  const editingUserId = ref(null);
    const loadUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        users.value = data || [];
      } catch (error) {
        console.error('Load users error:', error);
      }
    };

    const getRoleName = (role) => {
      return role === 'admin' ? '管理员' : '普通用户';
    };

    const isMobile = computed(() => {
      return window.innerWidth <= 768;
    });

    const formatDate = (timestamp) => {
      if (!timestamp) return '未知时间';
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? '无效时间' : date.toLocaleDateString('zh-CN');
    };

    const editUser = (user) => {
      editingUserId.value = user.id;
      userForm.value = {
        name: user.name,
        email: user.email,
        role: user.role
      };
      showEditUserModal.value = true;
    };

    const saveUser = async () => {
      try {
        if (showEditUserModal.value) {
          // 更新用户
          const { error } = await supabase
            .from('users')
            .update({
              name: userForm.value.name,
              email: userForm.value.email,
              role: userForm.value.role
            })
            .eq('id', editingUserId.value);

          if (error) {
            console.error('Update user error:', error);
            throw new Error('更新用户失败，请检查输入信息');
          }
        } else {
          // 创建新用户 - 管理员操作
          console.log('Admin creating new user:', userForm.value);

          // 首先检查当前用户是否是管理员
          const currentUser = await supabase.auth.getUser();
          if (!currentUser.data?.user) {
            throw new Error('请先登录');
          }

          // 检查管理员权限（通过查询用户表）
          const { data: adminCheck, error: adminError } = await supabase
            .from('users')
            .select('role')
            .eq('id', currentUser.data.user.id)
            .single();

          if (adminError || adminCheck?.role !== 'admin') {
            throw new Error('只有管理员可以添加用户');
          }

          // 创建认证用户 - 直接确认，无需邮箱验证
          const { data, error } = await supabase.auth.signUp({
            email: userForm.value.email,
            password: userForm.value.password,
            options: {
              data: {
                name: userForm.value.name,
                role: userForm.value.role
              }
            }
          });

          if (error) {
            console.error('Sign up error:', error);
            throw new Error('创建用户失败，请检查邮箱是否已存在');
          }

          if (data?.user?.id) {
            // 管理员直接创建用户资料到users表
            const { error: profileError } = await supabase
              .from('users')
              .insert({
                id: data.user.id,
                name: userForm.value.name,
                email: userForm.value.email,
                role: userForm.value.role,
                created_at: new Date().toISOString()
              });

            if (profileError) {
              console.error('Profile creation error:', profileError);
              // 注意：无法在客户端删除认证用户，需要手动清理
              throw new Error('用户资料创建失败，但认证账户已创建。请联系技术支持清理。');
            }

            alert(`用户 ${userForm.value.name} 已成功创建！用户可以使用邮箱 ${userForm.value.email} 和设置的密码登录。`);

            // 清理表单
            userForm.value = {
              name: '',
              email: '',
              password: '',
              role: 'user'
            };
          } else {
            console.error('Sign-up succeeded but user ID is missing:', data);
            throw new Error('用户创建失败，请稍后重试');
          }
        }

        console.log('User saved successfully');
        closeModals();
        await loadUsers();
      } catch (error) {
        console.error('Save user error:', error);
        alert(error.message || '保存失败');
      }
    };

    const closeModals = () => {
      showAddUserModal.value = false;
      showEditUserModal.value = false;
      userForm.value = {
        name: '',
        email: '',
        password: '',
        role: 'user'
      };
      editingUserId.value = null;
    };

    onMounted(() => {
      loadUsers();
    });

    return {
      users,
      isMobile,
      showAddUserModal,
      showEditUserModal,
      userForm,
      getRoleName,
      formatDate,
      editUser,
      saveUser,
      closeModals
    };
  }
};
</script>

<style scoped>
.user-management {
  width: 100%;
}

.users-container {
  width: 100%;
}

.users-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-card {
  transition: transform 0.2s ease;
}

.user-card:hover {
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.card-name {
  font: var(--title-3-emphasized);
  color: var(--systemPrimary);
}

.card-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.card-info {
  flex: 1;
}

.card-email {
  font: var(--body);
  color: var(--systemPrimary);
  margin-bottom: 4px;
}

.card-id {
  font: var(--caption-1);
  color: var(--systemSecondary);
  margin-bottom: 4px;
}

.card-date {
  font: var(--caption-1);
  color: var(--systemSecondary);
}

.card-actions {
  margin-left: 16px;
}

.management-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.management-header h2 {
  margin: 0;
  font: var(--title-1-emphasized);
  color: var(--systemPrimary);
}

.users-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: var(--systemFill);
}

th,
td {
  padding: 16px;
  text-align: left;
  border-bottom: 1px solid var(--systemFill);
}

th {
  font: var(--body-emphasized);
  color: var(--systemSecondary);
}

td {
  font: var(--body);
  color: var(--systemPrimary);
}

.action-cell {
  display: flex;
  gap: 8px;
}

.role-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font: var(--caption-1-emphasized);
}

.role-admin {
  background: linear-gradient(135deg, var(--systemGreen) 0%, #00b894 100%);
  color: white;
}

.role-user {
  background: linear-gradient(135deg, var(--keyColor) 0%, #00d4ff 100%);
  color: white;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  max-width: 500px;
  width: 90%;
  padding: 32px;
}

.modal-content h3 {
  margin: 0 0 24px 0;
  font: var(--title-2-emphasized);
  color: var(--systemPrimary);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font: var(--body-emphasized);
  color: var(--systemPrimary);
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--systemFill);
  border-radius: var(--global-border-radius-medium);
  font: var(--body);
  color: var(--systemPrimary);
  background: white;
  transition: all 0.2s var(--ease-out);
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--keyColor);
  box-shadow: 0 0 0 4px rgba(0, 125, 250, 0.1);
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

@media (max-width: 768px) {
  .user-management {
    padding: 16px;
  }

  .management-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .management-header h2 {
    font-size: 20px;
  }

  .search-bar {
    width: 100%;
  }

  .users-table {
    font-size: 14px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  table {
    min-width: 650px;
  }

  th,
  td {
    padding: 12px 8px;
  }

  th:first-child,
  td:first-child {
    position: sticky;
    left: 0;
    background: white;
    z-index: 1;
  }

  .modal-card {
    width: 95%;
    max-width: none;
  }

  .form-actions {
    flex-direction: column;
    gap: 10px;
  }

  .form-actions button {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .role-badge {
    font-size: 11px;
    padding: 3px 8px;
  }

  .actions {
    gap: 6px;
  }
}
</style>
