import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia, storeToRefs } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LoginView from './LoginView.vue'
import WorkspaceView from './WorkspaceView.vue'
import { useAuthStore } from '../stores/auth'
import * as authApi from '../api/auth'
import type { User } from '../types/User'

vi.mock('../api/auth')

const mockUser: User = {
  id: 1,
  name: 'Anna Petrenko',
  email: 'anna@example.com',
  avatar_url: null,
  status: 'active',
  last_seen_at: '2026-07-03T12:00:00Z',
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: LoginView },
      { path: '/', name: 'workspace', component: WorkspaceView },
    ],
  })
}

describe('WorkspaceView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('navigates back to login after logout', async () => {
    vi.mocked(authApi.logout).mockResolvedValue(undefined)

    const authStore = useAuthStore()
    const { user, status } = storeToRefs(authStore)
    user.value = mockUser
    status.value = 'authenticated'

    const router = makeRouter()
    await router.push({ name: 'workspace' })
    await router.isReady()

    const wrapper = mount(WorkspaceView, {
      global: { plugins: [router] },
    })

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(authApi.logout).toHaveBeenCalled()
    expect(authStore.isAuthenticated).toBe(false)
    expect(router.currentRoute.value.name).toBe('login')
  })
})

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
