import { apiClient } from './client'
import type { Message } from '../types/Message'

export interface FetchMessagesParams {
  before?: number
  limit?: number
}

export interface SendMessagePayload {
  body: string
  client_message_id: string
  parent_id?: number | null
}

export interface PaginatedMessages {
  data: Message[]
  meta: {
    has_more: boolean
    next_cursor: number | null
  }
}

export async function fetchMessages(
  channelId: number,
  params: FetchMessagesParams = {},
): Promise<PaginatedMessages> {
  const response = await apiClient.get<PaginatedMessages>(`/api/channels/${channelId}/messages`, {
    params,
  })
  return response.data
}

export async function sendMessage(
  channelId: number,
  payload: SendMessagePayload,
): Promise<Message> {
  const response = await apiClient.post<Message>(`/api/channels/${channelId}/messages`, payload)
  return response.data
}

export async function editMessage(messageId: number, body: string): Promise<Message> {
  const response = await apiClient.patch<Message>(`/api/messages/${messageId}`, {
    body,
  })
  return response.data
}

export async function deleteMessage(messageId: number): Promise<void> {
  await apiClient.delete(`/api/messages/${messageId}`)
}
