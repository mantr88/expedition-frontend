import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MessageList from './MessageList.vue'
import { useAuthStore } from '../stores/auth'
import type { Message } from '../types/Message'

beforeAll(() => {
  class MockIntersectionObserver {
    observe = vi.fn()
    disconnect = vi.fn()
    unobserve = vi.fn()
  }
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

const mockScrollToIndex = vi.fn()

vi.mock('virtua/vue', () => {
  return {
    VList: {
      name: 'VList',
      props: ['data'],
      methods: {
        scrollToIndex(...args: unknown[]) {
          mockScrollToIndex(...args)
        },
      },
      template: `
        <div class="vlist-stub">
          <slot v-for="(item, index) in data" :item="item" :index="index" />
        </div>
      `,
    },
  }
})

const mockUser = {
  id: 1,
  name: 'Anna Petrenko',
  email: 'anna@example.com',
  avatar_url: null,
  status: 'active',
  last_seen_at: '2026-07-03T12:00:00Z',
}

const mockMessages: Message[] = [
  {
    id: 1,
    client_message_id: '1',
    channel_id: 1,
    user: mockUser,
    parent_id: null,
    body_raw: 'Hello 1',
    body_html: 'Hello 1',
    type: 'text',
    edited_at: null,
    deleted_at: null,
    created_at: '2026-07-03T12:00:00Z',
    reactions: [],
    attachments: [],
    reply_count: 0,
    last_reply_at: null,
  },
  {
    id: 2,
    client_message_id: '2',
    channel_id: 1,
    user: mockUser,
    parent_id: null,
    body_raw: 'Hello 2',
    body_html: 'Hello 2',
    type: 'text',
    edited_at: null,
    deleted_at: null,
    created_at: '2026-07-03T12:01:00Z',
    reactions: [],
    attachments: [],
    reply_count: 0,
    last_reply_at: null,
  },
]

describe('MessageList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const authStore = useAuthStore()
    authStore.user = mockUser
    mockScrollToIndex.mockClear()
  })

  it('renders loading state when loading and empty', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [],
        loading: true,
      },
    })
    expect(wrapper.text()).toContain('Завантаження повідомлень...')
  })

  it('renders empty state when empty and not loading', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: [],
        loading: false,
      },
    })
    expect(wrapper.text()).toContain('Ще немає повідомлень')
    expect(wrapper.text()).toContain('Напишіть перше 👋')
  })

  it('renders message items', () => {
    const wrapper = mount(MessageList, {
      props: {
        messages: mockMessages,
        loading: false,
      },
    })

    const items = wrapper.findAll('.message-item-wrapper')
    expect(items.length).toBe(2)
    expect(items[0].text()).toContain('Hello 1')
    expect(items[1].text()).toContain('Hello 2')

    expect(items[0].find('.user-avatar').exists()).toBe(true)
    expect(items[1].find('.user-avatar').exists()).toBe(false)
  })

  it('scrolls to bottom with align end when messages are provided', async () => {
    mount(MessageList, {
      props: {
        messages: mockMessages,
        loading: false,
      },
    })

    await new Promise((r) => setTimeout(r, 10))
    expect(mockScrollToIndex).toHaveBeenCalledWith(1, { align: 'end' })
  })
})
