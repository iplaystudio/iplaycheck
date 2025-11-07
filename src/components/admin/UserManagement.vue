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

    <AppleCard class="users-table">
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
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.id }}</td>
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>
              <span class="role-badge" :class="`role-${user.role}`">
                {{ getRoleName(user.role) }}
              </span>
            </td>
            <td>{{ formatDate(user.createdAt) }}</td>
            <td class="action-cell">
              <AppleButton
                variant="secondary"
                size="small"
                @click="editUser(user)"
              >
                编辑
              </AppleButton>
              <AppleButton
                variant="tertiary"
                size="small"
                @click="openChangePwd(user)"
              >
                修改密码
              </AppleButton>
              <AppleButton
                variant="danger"
                size="small"
                @click="deleteUser(user)"
              >
                删除
              </AppleButton>
    <!-- 修改密码对话框 -->
    <Teleport to="body">
      <div v-if="showChangePwdModal" class="modal-overlay" @click.self="closePwdModal">
        <AppleCard class="modal-content">
          <h3>修改密码</h3>
          <form @submit.prevent="changePassword">
            <div class="form-group">
              <label>新密码</label>
              <input v-model="newPassword" type="password" required minlength="6" />
            </div>
            <div class="form-actions">
              <AppleButton variant="primary" type="submit">保存</AppleButton>
              <AppleButton variant="secondary" type="button" @click="closePwdModal">取消</AppleButton>
            </div>
            <div v-if="pwdError" class="error-msg">{{ pwdError }}</div>
            <div v-if="pwdSuccess" class="success-msg">{{ pwdSuccess }}</div>
          </form>
        </AppleCard>
      </div>
    </Teleport>
            </td>
          </tr>
        </tbody>
      </table>
    </AppleCard>

    <!-- 添加/编辑用户对话框 -->
    <Teleport to="body">
      <div v-if="showAddUserModal || showEditUserModal" class="modal-overlay" @click.self="closeModals">
        <AppleCard class="modal-content">
          <h3>{{ showEditUserModal ? '编辑用户' : '添加用户' }}</h3>
          <form @submit.prevent="saveUser">
            <div class="form-group">
              <label>姓名</label>
              <input v-model="userForm.name" type="text" required />
            </div>
            <div class="form-group">
              <label>邮箱</label>
              <input v-model="userForm.email" type="email" required />
            </div>
            <div class="form-group" v-if="!showEditUserModal">
              <label>密码</label>
              <input v-model="userForm.password" type="password" required />
            </div>
            <div class="form-group">
              <label>角色</label>
              <select v-model="userForm.role" required>
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            <div class="form-actions">
              <AppleButton variant="primary" type="submit">保存</AppleButton>
              <AppleButton variant="secondary" type="button" @click="closeModals">取消</AppleButton>
            </div>
          </form>
        </AppleCard>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updatePassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '@/services/firebase';
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
  const showChangePwdModal = ref(false);
  const changePwdUser = ref(null);
  const newPassword = ref('');
  const pwdError = ref('');
  const pwdSuccess = ref('');
    const openChangePwd = (user) => {
      changePwdUser.value = user;
      newPassword.value = '';
      pwdError.value = '';
      pwdSuccess.value = '';
      showChangePwdModal.value = true;
    };

    const closePwdModal = () => {
      showChangePwdModal.value = false;
      changePwdUser.value = null;
      newPassword.value = '';
      pwdError.value = '';
      pwdSuccess.value = '';
    };

    // 管理员修改用户密码（需先用该用户账号登录一次）
    const changePassword = async () => {
      pwdError.value = '';
      pwdSuccess.value = '';
      try {
        if (!changePwdUser.value?.email) {
          pwdError.value = '无效用户';
          return;
        }
        // 管理员用用户邮箱和临时密码登录
        const tempPwd = 'Temp1234!'; // 可改为随机生成
        const userCredential = await signInWithEmailAndPassword(auth, changePwdUser.value.email, tempPwd);
        await updatePassword(userCredential.user, newPassword.value);
        pwdSuccess.value = '密码修改成功';
        setTimeout(closePwdModal, 1500);
      } catch (err) {
        pwdError.value = err.message || '修改失败';
      }
    };

    const loadUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        users.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error('Load users error:', error);
      }
    };

    const getRoleName = (role) => {
      return role === 'admin' ? '管理员' : '普通用户';
    };

    const formatDate = (timestamp) => {
      return new Date(timestamp).toLocaleDateString('zh-CN');
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

    const deleteUser = async (user) => {
      if (confirm(`确定要删除用户 ${user.name} 吗?`)) {
        try {
          await deleteDoc(doc(db, 'users', user.id));
          await loadUsers();
        } catch (error) {
          console.error('Delete user error:', error);
          alert('删除失败');
        }
      }
    };

    const saveUser = async () => {
      try {
        if (showEditUserModal.value) {
          // 更新用户
          await setDoc(doc(db, 'users', editingUserId.value), {
            name: userForm.value.name,
            email: userForm.value.email,
            role: userForm.value.role
          }, { merge: true });
        } else {
          // 创建新用户
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            userForm.value.email,
            userForm.value.password
          );

          await setDoc(doc(db, 'users', userCredential.user.uid), {
            name: userForm.value.name,
            email: userForm.value.email,
            role: userForm.value.role,
            createdAt: new Date().toISOString()
          });
        }

        closeModals();
        await loadUsers();
      } catch (error) {
        console.error('Save user error:', error);
        alert('保存失败');
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
      showAddUserModal,
      showEditUserModal,
      userForm,
      getRoleName,
      formatDate,
      editUser,
      deleteUser,
      saveUser,
      closeModals,
      showChangePwdModal,
      openChangePwd,
      closePwdModal,
      newPassword,
      changePassword,
      pwdError,
      pwdSuccess
    };
  }
};
</script>

<style scoped>
.user-management {
  width: 100%;
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
