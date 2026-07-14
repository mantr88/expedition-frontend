import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMessagesStore } from './messages'
import { useChannelsStore } from './channels'
import type { Message } from '../types/Message'
import * as messagesApi from '../api/messages'

vi.mock('../api/messages')
vi.mock('../api/channels')

function makeMessage(id: number, channelId: number): Message {
  return {
    id,
    client_message_id: `cmid-${id}`,
    channel_id: channelId,
    user: {
      id: 1,
      name: 'A',
      email: 'a@a.a',
      avatar_url: null,
      status: 'active',
      last_seen_at: null,
    },
    parent_id: null,
    body_raw: `msg ${id}`,
    body_html: `msg ${id}`,
    type: 'text',
    edited_at: null,
    deleted_at: null,
    created_at: new Date().toISOString(),
    reactions: [],
    attachments: [],
    reply_count: 0,
    last_reply_at: null,
  }
}

describe('messages store: jumpToMessage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('довантажує старіші сторінки, поки не знайде повідомлення, і підсвічує його', async () => {
    const channelsStore = useChannelsStore()
    channelsStore.channels = [
      { id: 1, name: 'general', type: 'public', topic: null, archived_at: null, members_count: 1 },
    ]
    channelsStore.members[1] = []

    // Перша сторінка: 51..100, друга (older): 1..50
    vi.mocked(messagesApi.fetchMessages).mockImplementation(async (_chanId, params) => {
      if (params?.before === undefined) {
        return {
          data: Array.from({ length: 50 }, (_, i) => makeMessage(51 + i, 1)),
          meta: { has_more: true, next_cursor: 51 },
        }
      }
      return {
        data: Array.from({ length: 50 }, (_, i) => makeMessage(1 + i, 1)),
        meta: { has_more: false, next_cursor: null },
      }
    })

    const store = useMessagesStore()
    await store.jumpToMessage(1, 10)

    expect(store.messages[1].some((m) => m.id === 10)).toBe(true)
    expect(store.highlightMessageId).toBe(10)
  })

  it('не зациклюється, якщо повідомлення не існує', async () => {
    const channelsStore = useChannelsStore()
    channelsStore.channels = [
      { id: 1, name: 'general', type: 'public', topic: null, archived_at: null, members_count: 1 },
    ]
    channelsStore.members[1] = []

    vi.mocked(messagesApi.fetchMessages).mockResolvedValue({
      data: [makeMessage(5, 1)],
      meta: { has_more: false, next_cursor: null },
    })

    const store = useMessagesStore()
    await store.jumpToMessage(1, 99999)
    expect(store.highlightMessageId).toBeNull()
  })
})
