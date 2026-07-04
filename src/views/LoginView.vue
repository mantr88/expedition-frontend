<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const submitting = ref(false)

async function handleSubmit() {
  submitting.value = true
  try {
    await authStore.login({ email: email.value, password: password.value })
    await router.push({ name: 'workspace' })
  } catch {
    // authStore.error already set for display
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="login-view">
    <form class="login-form" @submit.prevent="handleSubmit">
      <h1>Вхід</h1>
      <label>
        Email
        <input v-model="email" type="email" name="email" autocomplete="username" required />
      </label>
      <label>
        Пароль
        <input
          v-model="password"
          type="password"
          name="password"
          autocomplete="current-password"
          required
        />
      </label>
      <p v-if="authStore.error" class="error">{{ authStore.error }}</p>
      <button type="submit" :disabled="submitting">Увійти</button>
    </form>
  </div>
</template>

<style scoped>
.login-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 320px;
}

.error {
  color: #d33;
  margin: 0;
}
</style>
