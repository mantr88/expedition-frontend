import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import WorkspaceView from '../views/WorkspaceView.vue'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginView },
    { path: '/', name: 'workspace', component: WorkspaceView, meta: { requiresAuth: true } },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (authStore.status === 'idle') {
    try {
      await authStore.fetchUser()
    } catch {
      // session not valid, treated as unauthenticated below
    }
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'login' && authStore.isAuthenticated) {
    return { name: 'workspace' }
  }

  return true
})

export default router
