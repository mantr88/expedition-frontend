import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './auth'
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

describe('stores/auth', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('logs in and stores the current user', async () => {
    vi.mocked(authApi.login).mockResolvedValue(undefined)
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(mockUser)

    const store = useAuthStore()
    await store.login({ email: mockUser.email, password: 'secret' })

    expect(store.isAuthenticated).toBe(true)
    expect(store.user).toEqual(mockUser)
  })

  it('sets an error and stays unauthenticated when login fails', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('invalid credentials'))

    const store = useAuthStore()
    await expect(store.login({ email: mockUser.email, password: 'wrong' })).rejects.toThrow()

    expect(store.isAuthenticated).toBe(false)
    expect(store.error).toBeTruthy()
  })

  it('resets state on logout', async () => {
    vi.mocked(authApi.login).mockResolvedValue(undefined)
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(mockUser)
    vi.mocked(authApi.logout).mockResolvedValue(undefined)

    const store = useAuthStore()
    await store.login({ email: mockUser.email, password: 'secret' })
    await store.logout()

    expect(store.isAuthenticated).toBe(false)
    expect(store.user).toBeNull()
  })
})
