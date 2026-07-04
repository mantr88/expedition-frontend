import { apiClient, ensureCsrfCookie } from './client'
import type { User } from '../types/User'

export interface LoginPayload {
  email: string
  password: string
}

export async function login(payload: LoginPayload): Promise<void> {
  await ensureCsrfCookie()
  await apiClient.post('/login', payload)
}

export async function logout(): Promise<void> {
  await apiClient.post('/logout')
}

export async function fetchCurrentUser(): Promise<User> {
  const response = await apiClient.get<User>('/api/user')
  return response.data
}
