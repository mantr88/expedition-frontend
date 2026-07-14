import { http, HttpResponse } from 'msw'
import type { User } from '../types/User'
import type { Channel, ChannelMember } from '../types/Channel'
import type { Message } from '../types/Message'

const mockUsers: User[] = [
  {
    id: 1,
    name: 'Anna Petrenko',
    email: 'anna@example.com',
    avatar_url: null,
    status: 'active',
    last_seen_at: '2026-07-03T12:00:00Z',
  },
  {
    id: 2,
    name: 'Ihor Franko',
    email: 'ihor@example.com',
    avatar_url: null,
    status: 'active',
    last_seen_at: '2026-07-03T12:05:00Z',
  },
  {
    id: 3,
    name: 'Mariya Kovach',
    email: 'mariya@example.com',
    avatar_url: null,
    status: 'away',
    last_seen_at: '2026-07-03T11:50:00Z',
  },
  {
    id: 4,
    name: 'Dmytro Lysenko',
    email: 'dmytro@example.com',
    avatar_url: null,
    status: 'offline',
    last_seen_at: '2026-07-02T18:30:00Z',
  },
]

const currentUser = mockUsers[0]
let isAuthenticated = false

const channels: Channel[] = [
  {
    id: 1,
    name: 'general',
    type: 'public',
    topic: 'Загальні обговорення',
    archived_at: null,
    members_count: 4,
    unread_count: 0,
    my_membership: {
      role: 'owner',
      last_read_message_id: null,
      notifications_level: 'all',
    },
  },
  {
    id: 2,
    name: 'design',
    type: 'public',
    topic: 'Дизайн-система та макети',
    archived_at: null,
    members_count: 3,
    unread_count: 0,
    my_membership: {
      role: 'member',
      last_read_message_id: null,
      notifications_level: 'all',
    },
  },
  {
    id: 3,
    name: 'random',
    type: 'public',
    topic: 'Різне та флуд',
    archived_at: null,
    members_count: 2,
    unread_count: 0,
    my_membership: {
      role: 'member',
      last_read_message_id: null,
      notifications_level: 'all',
    },
  },
]

// Seed messages
const messages: Message[] = []
let msgIdCounter = 1

function generateSeededMessages() {
  const channelIds = [1, 2, 3]
  channelIds.forEach((channelId) => {
    const count = channelId === 1 ? 120 : channelId === 2 ? 30 : 5
    const baseTime = new Date('2026-07-01T10:00:00Z').getTime()

    for (let i = 1; i <= count; i++) {
      const user = mockUsers[(i + channelId) % mockUsers.length]
      const id = msgIdCounter++
      const rawText = `Це повідомлення #${i} у каналі #${channelId}. Тут може бути **жирний текст**, *курсив*, або \`код\`.`
      const htmlText = `Це повідомлення #${i} у каналі #${channelId}. Тут може бути <strong>жирний текст</strong>, <em>курсив</em>, або <code>код</code>.`

      messages.push({
        id,
        client_message_id: crypto.randomUUID(),
        channel_id: channelId,
        user,
        parent_id: null,
        body_raw: rawText,
        body_html: htmlText,
        type: 'text',
        edited_at: null,
        deleted_at: null,
        created_at: new Date(baseTime + i * 60 * 1000).toISOString(),
        reactions: [],
        attachments: [],
        reply_count: 0,
        last_reply_at: null,
      })
    }
  })
}

generateSeededMessages()

function mockMarkdownToHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
}

export const handlers = [
  http.get('*/sanctum/csrf-cookie', () => new HttpResponse(null, { status: 204 })),

  http.post('*/login', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string }
    if (!body.email || !body.password) {
      return HttpResponse.json({ message: 'Validation failed' }, { status: 422 })
    }
    isAuthenticated = true
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/logout', () => {
    isAuthenticated = false
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/user', () => {
    if (!isAuthenticated) {
      return HttpResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    }
    return HttpResponse.json(currentUser)
  }),

  http.get('*/api/users', ({ request }) => {
    if (!isAuthenticated) {
      return HttpResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    }
    const url = new URL(request.url)
    const query = (url.searchParams.get('query') || '').toLowerCase()

    let results = mockUsers.filter((u) => u.id !== currentUser.id)
    if (query) {
      results = results.filter((u) => u.name.toLowerCase().includes(query))
    }

    return HttpResponse.json({ data: results })
  }),

  // Channels endpoints
  http.get('*/api/channels', () => {
    if (!isAuthenticated) {
      return HttpResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    }
    return HttpResponse.json({ data: channels })
  }),

  http.post('*/api/channels', async ({ request }) => {
    if (!isAuthenticated) {
      return HttpResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    }
    const body = (await request.json()) as {
      name: string
      type: 'public' | 'private'
      topic?: string
    }
    if (!body.name || !body.type) {
      return HttpResponse.json({ message: 'Validation failed' }, { status: 422 })
    }

    const newChannel: Channel = {
      id: channels.length + 1,
      name: body.name.toLowerCase().replace(/\s+/g, '-'),
      type: body.type,
      topic: body.topic ?? null,
      archived_at: null,
      members_count: 1,
      unread_count: 0,
      my_membership: {
        role: 'owner',
        last_read_message_id: null,
        notifications_level: 'all',
      },
    }
    channels.push(newChannel)
    return HttpResponse.json(newChannel)
  }),

  http.post('*/api/channels/dm', async ({ request }) => {
    if (!isAuthenticated) {
      return HttpResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    }
    const body = (await request.json()) as { user_id: number }
    if (!body.user_id) {
      return HttpResponse.json({ message: 'Validation failed' }, { status: 422 })
    }

    const targetUser = mockUsers.find((u) => u.id === body.user_id)
    if (!targetUser) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Find if DM channel already exists
    const existingDm = channels.find((c) => c.type === 'dm' && c.name === targetUser.name)
    if (existingDm) {
      return HttpResponse.json(existingDm)
    }

    const newChannel: Channel = {
      id: channels.length + 1,
      name: targetUser.name, // in DM, the channel name is usually the other person's name
      type: 'dm',
      topic: null,
      archived_at: null,
      members_count: 2,
      unread_count: 0,
      my_membership: {
        role: 'member',
        last_read_message_id: null,
        notifications_level: 'all',
      },
    }
    channels.push(newChannel)
    return HttpResponse.json(newChannel)
  }),

  http.post('*/api/channels/:channelId/read', async ({ request, params }) => {
    if (!isAuthenticated) {
      return HttpResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    }
    const channelId = Number(params.channelId)
    const body = (await request.json()) as { last_read_message_id: number }

    const channel = channels.find((c) => c.id === channelId)
    if (channel && channel.my_membership) {
      // update last read if it's greater than current
      if (
        !channel.my_membership.last_read_message_id ||
        body.last_read_message_id > channel.my_membership.last_read_message_id
      ) {
        channel.my_membership.last_read_message_id = body.last_read_message_id
        channel.unread_count = 0
      }
    }

    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/api/channels/:channelId/members', () => {
    if (!isAuthenticated) {
      return HttpResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    }
    // Return members
    const members: ChannelMember[] = mockUsers.map((user, idx) => ({
      user,
      role: idx === 0 ? 'owner' : 'member',
      last_read_message_id: null,
      notifications_level: 'all',
    }))
    return HttpResponse.json({ data: members })
  }),

  // Messages endpoints
  http.get('*/api/channels/:channelId/messages', ({ request, params }) => {
    if (!isAuthenticated) {
      return HttpResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    }
    const channelId = Number(params.channelId)
    const url = new URL(request.url)
    const before = url.searchParams.get('before') ? Number(url.searchParams.get('before')) : null
    const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 50

    let chanMessages = messages.filter((m) => m.channel_id === channelId)

    // Sort ascending by ID (oldest first)
    chanMessages.sort((a, b) => a.id - b.id)

    if (before !== null) {
      chanMessages = chanMessages.filter((m) => m.id < before)
    }

    // Grab the last `limit` messages (which are the most recent ones relative to the list)
    const sliced = chanMessages.slice(-limit)
    const nextCursor = sliced.length > 0 ? sliced[0].id : null
    const hasMore = nextCursor !== null ? chanMessages.some((m) => m.id < nextCursor) : false

    return HttpResponse.json({
      data: sliced,
      meta: {
        has_more: hasMore,
        next_cursor: hasMore ? nextCursor : null,
      },
    })
  }),

  http.post('*/api/channels/:channelId/messages', async ({ request, params }) => {
    if (!isAuthenticated) {
      return HttpResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    }
    const channelId = Number(params.channelId)
    const body = (await request.json()) as { body: string; client_message_id: string }

    const newMessage: Message = {
      id: msgIdCounter++,
      client_message_id: body.client_message_id,
      channel_id: channelId,
      user: currentUser,
      parent_id: null,
      body_raw: body.body,
      body_html: mockMarkdownToHtml(body.body),
      type: 'text',
      edited_at: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      reactions: [],
      attachments: [],
      reply_count: 0,
      last_reply_at: null,
    }

    messages.push(newMessage)
    return HttpResponse.json(newMessage)
  }),

  http.patch('*/api/messages/:messageId', async ({ request, params }) => {
    if (!isAuthenticated) {
      return HttpResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    }
    const messageId = Number(params.messageId)
    const body = (await request.json()) as { body: string }

    const msg = messages.find((m) => m.id === messageId)
    if (!msg) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }

    msg.body_raw = body.body
    msg.body_html = mockMarkdownToHtml(body.body)
    msg.edited_at = new Date().toISOString()

    return HttpResponse.json(msg)
  }),

  http.delete('*/api/messages/:messageId', ({ params }) => {
    if (!isAuthenticated) {
      return HttpResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    }
    const messageId = Number(params.messageId)
    const msg = messages.find((m) => m.id === messageId)
    if (!msg) {
      return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    }

    msg.deleted_at = new Date().toISOString()
    return new HttpResponse(null, { status: 204 })
  }),

  // Search endpoint
  http.get('*/api/search/messages', ({ request }) => {
    if (!isAuthenticated) {
      return HttpResponse.json({ message: 'Unauthenticated' }, { status: 401 })
    }
    const url = new URL(request.url)
    const q = (url.searchParams.get('q') || '').toLowerCase().trim()
    const channelIdParam = url.searchParams.get('channel_id')

    if (!q) {
      return HttpResponse.json({ data: [], meta: { total: 0 } })
    }

    let results = messages.filter((m) => !m.deleted_at && m.body_raw.toLowerCase().includes(q))
    if (channelIdParam) {
      results = results.filter((m) => m.channel_id === Number(channelIdParam))
    }
    // Найновіші перші, максимум 20
    results = [...results].sort((a, b) => b.id - a.id).slice(0, 20)

    const data = results.map((m) => {
      const channel = channels.find((c) => c.id === m.channel_id)
      return {
        ...m,
        channel: channel
          ? { id: channel.id, name: channel.name, type: channel.type }
          : { id: m.channel_id, name: 'невідомий', type: 'public' },
      }
    })

    return HttpResponse.json({ data, meta: { total: data.length } })
  }),
]
