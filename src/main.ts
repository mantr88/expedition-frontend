import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler } from './api/client'
import { useAuthStore } from './stores/auth'
import { useUiStore } from './stores/ui'

async function enableMocking() {
  // Defaults to mocks on: the backend isn't always available (contract-first workflow).
  // Set VITE_USE_MOCKS=false to talk to a real backend.
  if (import.meta.env.VITE_USE_MOCKS === 'false') {
    return
  }
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

async function bootstrap() {
  await enableMocking()

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)

  useUiStore().initTheme()

  setUnauthorizedHandler(() => {
    const authStore = useAuthStore()
    authStore.reset()
    if (router.currentRoute.value.name !== 'login') {
      router.push({ name: 'login' })
    }
  })

  app.mount('#app')
}

bootstrap()
