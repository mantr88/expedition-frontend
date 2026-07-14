import { apiClient } from './client'
import type { Message, Attachment } from '../types/Message'

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

export async function fetchReplies(
  messageId: number,
  params: { after?: number; limit?: number } = {},
): Promise<PaginatedMessages> {
  const response = await apiClient.get<PaginatedMessages>(`/api/messages/${messageId}/replies`, {
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

export interface ToggleReactionResponse {
  action: 'added' | 'removed'
  count: number
}

export async function toggleReaction(
  messageId: number,
  emoji: string,
): Promise<ToggleReactionResponse> {
  const response = await apiClient.post<ToggleReactionResponse>(
    `/api/messages/${messageId}/reactions`,
    {
      emoji,
    },
  )
  return response.data
}

export async function uploadAttachment(
  channelId: number,
  messageId: number,
  file: File,
): Promise<Attachment> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post<Attachment>(
    `/api/channels/${channelId}/messages/${messageId}/attachments`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  )
  return response.data
}
