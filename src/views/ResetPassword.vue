<template>
  <div class="reset-password">
    <div class="container">
      <AppleCard class="reset-card">
        <div class="reset-header">
          <h1>重置密码</h1>
          <p>请输入您的新密码</p>
        </div>

        <form
          class="reset-form"
          @submit.prevent="handleResetPassword"
        >
          <div class="form-group">
            <label for="password">新密码</label>
            <input
              id="password"
              v-model="password"
              type="password"
              placeholder="请输入新密码"
              required
              :disabled="loading"
            >
          </div>

          <div class="form-group">
            <label for="confirmPassword">确认密码</label>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              placeholder="请再次输入新密码"
              required
              :disabled="loading"
            >
          </div>

          <AppleButton
            type="submit"
            variant="primary"
            size="large"
            :loading="loading"
            :disabled="!password || !confirmPassword || password !== confirmPassword"
            class="reset-button"
          >
            {{ loading ? '重置中...' : '重置密码' }}
          </AppleButton>
        </form>

        <div
          v-if="error"
          class="error-message"
        >
          {{ error }}
        </div>

        <div
          v-if="success"
          class="success-message"
        >
          {{ success }}
        </div>
      </AppleCard>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/services/supabase'
import AppleCard from '@/components/shared/AppleCard.vue'
import AppleButton from '@/components/shared/AppleButton.vue'

const router = useRouter()
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

const handleResetPassword = async () => {
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }

  if (password.value.length < 6) {
    error.value = '密码至少需要6个字符'
    return
  }

  loading.value = true
  error.value = ''
  success.value = ''

  try {
    const { error: updateError } = await supabase.auth.updateUser({
      password: password.value
    })

    if (updateError) throw updateError

    success.value = '密码重置成功！正在跳转到登录页面...'

    // 3秒后跳转到登录页面
    setTimeout(() => {
      router.push('/login')
    }, 3000)

  } catch (err) {
    // Password reset error: debug output removed
    error.value = err.message || '密码重置失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 检查是否有有效的重置token
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !session) {
    error.value = '无效的重置链接，请重新申请密码重置'
  }
})
</script>

<style scoped>
.reset-password {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f2f2f7;
  padding: 20px;
}

.container {
  width: 100%;
  max-width: 400px;
}

.reset-card {
  padding: 2rem;
  text-align: center;
}

.reset-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: #333;
}

.reset-header p {
  margin: 0 0 2rem 0;
  color: #666;
  font-size: 0.9rem;
}

.reset-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #007aff;
}

.reset-button {
  margin-top: 1rem;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fee;
  color: #c33;
  border-radius: 8px;
  font-size: 0.9rem;
}

.success-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #efe;
  color: #363;
  border-radius: 8px;
  font-size: 0.9rem;
}

@media (prefers-color-scheme: dark) {
  .reset-password {
    background: #000;
  }

  .reset-header h1 {
    color: #fff;
  }

  .reset-header p {
    color: #ccc;
  }

  .form-group label {
    color: #fff;
  }

  .form-group input {
    background: #1c1c1e;
    border-color: #38383a;
    color: #fff;
  }

  .form-group input:focus {
    border-color: #007aff;
  }
}
</style>