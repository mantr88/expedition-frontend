import { apiClient } from './client'
import type { Message } from '../types/Message'
import type { Channel } from '../types/Channel'

export type SearchResult = Message & {
  channel: {
    id: number
    name: string
    type: Channel['type']
  }
}

export interface SearchResponse {
  data: SearchResult[]
  meta: { total: number }
}

export async function searchMessages(query: string, channelId?: number): Promise<SearchResponse> {
  const response = await apiClient.get<SearchResponse>('/api/search/messages', {
    params: { q: query, ...(channelId ? { channel_id: channelId } : {}) },
  })
  return response.data
}
