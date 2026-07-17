<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const submitting = ref(false)
const showPassword = ref(false)

const emailInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  emailInput.value?.focus()
})

async function handleSubmit() {
  submitting.value = true
  try {
    await authStore.login({ email: email.value, password: password.value })

    const redirect = route.query.redirect as string
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      await router.push(redirect)
    } else {
      await router.push({ name: 'workspace' })
    }
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
      <div class="brand-header">
        <span class="wordmark">Expedition<span class="accent">.</span></span>
      </div>

      <div class="titles">
        <h1>Вхід</h1>
        <p class="subtitle">Увійдіть, щоб продовжити роботу</p>
      </div>

      <div v-if="authStore.error" class="error-alert" role="alert">
        {{ authStore.error }}
      </div>

      <label class="field">
        <span class="label-text">Email</span>
        <input
          ref="emailInput"
          v-model="email"
          type="email"
          name="email"
          autocomplete="username"
          required
          :aria-invalid="!!authStore.errors?.email"
        />
        <span v-if="authStore.errors?.email" class="field-error" role="alert">
          {{ authStore.errors.email[0] }}
        </span>
      </label>

      <label class="field">
        <span class="label-text">Пароль</span>
        <div class="password-wrapper">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            name="password"
            autocomplete="current-password"
            required
            :aria-invalid="!!authStore.errors?.password"
          />
          <button
            type="button"
            class="toggle-password"
            @click="showPassword = !showPassword"
            :aria-label="showPassword ? 'Сховати пароль' : 'Показати пароль'"
          >
            {{ showPassword ? 'Сховати' : 'Показати' }}
          </button>
        </div>
        <span v-if="authStore.errors?.password" class="field-error" role="alert">
          {{ authStore.errors.password[0] }}
        </span>
      </label>

      <button type="submit" class="submit-btn" :disabled="submitting">
        <span v-if="submitting" class="spinner"></span>
        <span v-else>Увійти</span>
      </button>

      <div class="footer">v0.x</div>
    </form>
  </div>
</template>

<style scoped>
.login-view {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: var(--bg-app);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: min(400px, 92vw);
  background-color: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-8);
  animation: fade-in var(--dur-fast) var(--ease);
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-form {
    animation: none;
  }
}

.brand-header {
  margin-bottom: var(--space-4);
}

.wordmark {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.accent {
  color: var(--indigo-600);
}

.titles {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
}

.titles h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 300;
  color: var(--text-primary);
}

.subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}

.error-alert {
  background-color: var(--bg-elevated);
  border-left: 2px solid var(--danger);
  padding: var(--space-2) var(--space-3);
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.label-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

input {
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background-color: var(--bg-app);
  color: var(--text-primary);
  padding: 0 var(--space-2);
}

input::placeholder {
  color: var(--text-muted);
}

input:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

input[aria-invalid='true'] {
  border-color: var(--danger);
}

.password-wrapper {
  display: flex;
  position: relative;
}

.password-wrapper input {
  width: 100%;
  padding-right: 70px;
}

.toggle-password {
  position: absolute;
  right: var(--space-2);
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-link);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.field-error {
  font-size: 14px;
  color: var(--danger);
}

.submit-btn {
  height: 36px;
  border-radius: var(--radius-md);
  background-color: var(--indigo-600);
  color: var(--text-onbrand);
  font-weight: 500;
  border: none;
  cursor: pointer;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--dur-fast) var(--ease);
  margin-top: var(--space-2);
}

.submit-btn:hover:not(:disabled) {
  background-color: var(--indigo-700);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.footer {
  margin-top: var(--space-4);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}
</style>
