import { defineStore } from 'pinia'
import {
  login as apiLogin,
  logout as apiLogout,
  fetchCurrentUser,
  type LoginPayload,
} from '../api/auth'
import type { User } from '../types/User'

interface AuthState {
  user: User | null
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
  error: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    status: 'idle',
    error: null,
  }),

  getters: {
    isAuthenticated: (state) => state.status === 'authenticated',
  },

  actions: {
    async login(payload: LoginPayload) {
      this.status = 'loading'
      this.error = null
      try {
        await apiLogin(payload)
        await this.fetchUser()
      } catch (err) {
        this.status = 'unauthenticated'
        this.error = 'Не вдалося увійти. Перевірте email і пароль.'
        throw err
      }
    },

    async logout() {
      try {
        await apiLogout()
      } finally {
        this.reset()
      }
    },

    async fetchUser() {
      this.status = 'loading'
      try {
        this.user = await fetchCurrentUser()
        this.status = 'authenticated'
      } catch (err) {
        this.reset()
        throw err
      }
    },

    reset() {
      this.user = null
      this.status = 'unauthenticated'
      this.error = null
    },
  },
})
