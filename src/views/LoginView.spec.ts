import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import LoginView from './LoginView.vue'
import WorkspaceView from './WorkspaceView.vue'
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

describe('LoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('logs in and navigates to the workspace on submit', async () => {
    vi.mocked(authApi.login).mockResolvedValue(undefined)
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(mockUser)

    const router = makeRouter()
    await router.push({ name: 'login' })
    await router.isReady()

    const wrapper = mount(LoginView, {
      global: { plugins: [router] },
    })

    await wrapper.find('input[type="email"]').setValue(mockUser.email)
    await wrapper.find('input[type="password"]').setValue('secret')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(authApi.login).toHaveBeenCalledWith({ email: mockUser.email, password: 'secret' })
    expect(router.currentRoute.value.name).toBe('workspace')
  })
})

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
