import { apiClient, ensureCsrfCookie } from './client'
import type { User } from '../types/User'

export interface SetPasswordPayload {
  email: string
  token: string
  name: string
  password: string
  password_confirmation: string
}

export async function inviteByEmail(email: string, channelId?: number): Promise<User> {
  const response = await apiClient.post<User>('/api/invitations', {
    email,
    channel_id: channelId,
  })
  return response.data
}

export async function setPassword(payload: SetPasswordPayload): Promise<void> {
  await ensureCsrfCookie()
  await apiClient.post('/set-password', payload)
}
