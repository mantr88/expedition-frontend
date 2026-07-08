import { apiClient } from './client'
import type { User } from '../types/User'

export async function searchUsers(query: string): Promise<User[]> {
  const response = await apiClient.get<{ data: User[] }>('/api/users', {
    params: { query },
  })
  return response.data.data
}
