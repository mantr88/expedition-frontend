import { apiClient } from './client'
import type { Channel, ChannelMember } from '../types/Channel'

export interface CreateChannelPayload {
  name: string
  type: 'public' | 'private'
  topic?: string
}

export interface UpdateChannelPayload {
  name?: string
  topic?: string
}

export async function fetchChannels(): Promise<Channel[]> {
  const response = await apiClient.get<{ data: Channel[] }>('/api/channels')
  return response.data.data
}

export async function createChannel(payload: CreateChannelPayload): Promise<Channel> {
  const response = await apiClient.post<Channel>('/api/channels', payload)
  return response.data
}

export async function fetchChannel(channelId: number): Promise<Channel> {
  const response = await apiClient.get<Channel>(`/api/channels/${channelId}`)
  return response.data
}

export async function updateChannel(
  channelId: number,
  payload: UpdateChannelPayload,
): Promise<Channel> {
  const response = await apiClient.patch<Channel>(`/api/channels/${channelId}`, payload)
  return response.data
}

export async function archiveChannel(channelId: number): Promise<void> {
  await apiClient.delete(`/api/channels/${channelId}`)
}

export async function fetchChannelMembers(channelId: number): Promise<ChannelMember[]> {
  const response = await apiClient.get<{ data: ChannelMember[] }>(
    `/api/channels/${channelId}/members`,
  )
  return response.data.data
}

export async function inviteMember(channelId: number, userId: number): Promise<ChannelMember> {
  const response = await apiClient.post<ChannelMember>(`/api/channels/${channelId}/members`, {
    user_id: userId,
  })
  return response.data
}

export async function removeMember(channelId: number, userId: number): Promise<void> {
  await apiClient.delete(`/api/channels/${channelId}/members/${userId}`)
}
