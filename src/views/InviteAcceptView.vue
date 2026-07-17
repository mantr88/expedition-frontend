<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { setPassword } from '../api/invitations'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const token = ref('')
const name = ref('')
const password = ref('')
const passwordConfirmation = ref('')

const isInvalidLink = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const submitting = ref(false)

onMounted(() => {
  if (authStore.isAuthenticated) {
    errorMsg.value = 'Ви вже увійшли в систему'
    return
  }

  const queryEmail = route.query.email as string
  const queryToken = route.query.token as string

  if (!queryEmail || !queryToken) {
    isInvalidLink.value = true
  } else {
    email.value = queryEmail
    token.value = queryToken
  }
})

async function submit() {
  if (isInvalidLink.value || authStore.isAuthenticated || submitting.value) return

  errorMsg.value = ''

  if (password.value !== passwordConfirmation.value) {
    errorMsg.value = 'Паролі не співпадають'
    return
  }

  if (!name.value.trim() || password.value.length < 8) {
    errorMsg.value = "Будь ласка, заповніть ім'я та пароль (мінімум 8 символів)"
    return
  }

  submitting.value = true

  try {
    await setPassword({
      email: email.value,
      token: token.value,
      name: name.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })

    successMsg.value = 'Пароль встановлено, перенаправляємо на вхід...'

    setTimeout(() => {
      router.push({ name: 'login' })
    }, 1500)
  } catch (err: unknown) {
    const error = err as { response?: { status?: number; data?: { message?: string } } }
    if (error.response?.status === 422) {
      if (error.response.data?.message?.includes('token')) {
        errorMsg.value = 'Посилання застаріло, попросіть колегу надіслати запрошення ще раз'
      } else {
        errorMsg.value = 'Невірно заповнені поля'
      }
    } else {
      errorMsg.value = 'Помилка при встановленні пароля'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="invite-page">
    <div class="auth-card">
      <div class="product-brand">
        <div class="brand-icon"></div>
        <span class="brand-name">Expedition Corporate Messenger</span>
      </div>

      <h1 class="auth-title">Активація акаунту</h1>
      <p class="auth-subtitle">Встановіть ім'я та пароль для завершення реєстрації</p>

      <div v-if="isInvalidLink" class="alert-error" role="alert">
        Посилання некоректне. <router-link to="/login">Перейти до логіну</router-link>
      </div>

      <div v-else-if="authStore.isAuthenticated" class="alert-info">
        Ви вже увійшли в систему. <router-link to="/">Перейти в месенджер</router-link>
      </div>

      <form v-else @submit.prevent="submit" class="auth-form">
        <div v-if="errorMsg" class="alert-error" role="alert">
          {{ errorMsg }}
        </div>
        <div v-if="successMsg" class="alert-success" role="status">
          {{ successMsg }}
        </div>

        <div class="form-group">
          <label for="email">Email</label>
          <input id="email" type="email" v-model="email" readonly class="readonly-input" />
        </div>

        <div class="form-group">
          <label for="name">Ваше ім'я</label>
          <input
            id="name"
            type="text"
            v-model="name"
            placeholder="Іван Іваненко"
            required
            autofocus
            :disabled="submitting || !!successMsg"
          />
        </div>

        <div class="form-group">
          <label for="password">Новий пароль</label>
          <input
            id="password"
            type="password"
            v-model="password"
            placeholder="Мінімум 8 символів"
            required
            :disabled="submitting || !!successMsg"
          />
        </div>

        <div class="form-group">
          <label for="password_confirmation">Підтвердження пароля</label>
          <input
            id="password_confirmation"
            type="password"
            v-model="passwordConfirmation"
            placeholder="Повторіть пароль"
            required
            :disabled="submitting || !!successMsg"
          />
        </div>

        <button type="submit" class="submit-btn primary-btn" :disabled="submitting || !!successMsg">
          <span v-if="submitting" class="spinner"></span>
          <span v-else>Встановити пароль</span>
        </button>
      </form>

      <div class="auth-footer">v0.1</div>
    </div>
  </div>
</template>

<style scoped>
/* Common auth styles (could be extracted, but keeping here as requested) */
.invite-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: var(--bg-app);
}

.auth-card {
  width: min(400px, 92vw);
  background-color: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  display: flex;
  flex-direction: column;
  animation: fade-in 120ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .auth-card {
    animation: none;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.product-brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-6);
}

.brand-icon {
  width: 24px;
  height: 24px;
  background-color: var(--indigo-600);
  border-radius: var(--radius-full);
}

.brand-name {
  color: var(--text-primary);
  font-weight: 600;
  font-size: var(--text-md);
}

.auth-title {
  margin: 0 0 var(--space-2) 0;
  font-size: var(--text-xl);
  font-weight: 300;
  color: var(--text-primary);
}

.auth-subtitle {
  margin: 0 0 var(--space-6) 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
}

input {
  height: 36px;
  padding: 0 var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background-color: var(--bg-app);
  color: var(--text-primary);
  font-size: var(--text-sm);
}

input:focus {
  outline: none;
  border-color: var(--indigo-600);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
}

.readonly-input {
  background-color: var(--bg-hover);
  color: var(--text-secondary);
  cursor: not-allowed;
}
.readonly-input:focus {
  border-color: var(--border-strong);
  box-shadow: none;
}

.alert-error {
  padding: var(--space-3);
  background-color: var(--bg-elevated);
  border-left: 2px solid var(--danger);
  color: var(--danger);
  font-size: var(--text-sm);
  margin-bottom: var(--space-2);
}

.alert-error a {
  color: var(--danger);
  text-decoration: underline;
}

.alert-success {
  padding: var(--space-3);
  background-color: var(--bg-elevated);
  border-left: 2px solid var(--success);
  color: var(--success);
  font-size: var(--text-sm);
  margin-bottom: var(--space-2);
}

.alert-info {
  padding: var(--space-3);
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.primary-btn {
  height: 36px;
  background-color: var(--indigo-600);
  color: #ffffff; /* Explicitly white for primary button */
  border: none;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: var(--space-2);
}

.primary-btn:hover:not(:disabled) {
  background-color: var(--indigo-700);
}

.primary-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.auth-footer {
  margin-top: var(--space-6);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-align: right;
}
</style>
