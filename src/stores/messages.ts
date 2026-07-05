import { defineStore } from 'pinia'
import {
  fetchMessages,
  sendMessage as apiSendMessage,
  editMessage as apiEditMessage,
  deleteMessage as apiDeleteMessage,
} from '../api/messages'
import type { Message } from '../types/Message'
import { useAuthStore } from './auth'

interface MessagesState {
  messages: Record<number, Message[]>
  pagination: Record<
    number,
    {
      hasMore: boolean
      nextCursor: number | null
    }
  >
  loading: Record<number, boolean>
}

export const useMessagesStore = defineStore('messages', {
  state: (): MessagesState => ({
    messages: {},
    pagination: {},
    loading: {},
  }),

  actions: {
    async loadMessages(channelId: number, options: { loadMore?: boolean } = {}) {
      if (this.loading[channelId]) return

      const pag = this.pagination[channelId]
      if (options.loadMore && pag && !pag.hasMore) return

      this.loading[channelId] = true

      try {
        const before = options.loadMore && pag ? (pag.nextCursor ?? undefined) : undefined
        const result = await fetchMessages(channelId, { before, limit: 50 })

        const currentMsgs = this.messages[channelId] ?? []

        if (options.loadMore) {
          // Prepend older messages (returned sorted chronologically, so we append currentMsgs to them)
          this.messages[channelId] = [...result.data, ...currentMsgs]
        } else {
          this.messages[channelId] = result.data
        }

        this.pagination[channelId] = {
          hasMore: result.meta.has_more,
          nextCursor: result.meta.next_cursor,
        }
      } catch (err) {
        console.error('Failed to load messages:', err)
        throw err
      } finally {
        this.loading[channelId] = false
      }
    },

    async sendNewMessage(channelId: number, body: string) {
      const authStore = useAuthStore()
      if (!authStore.user) throw new Error('Not authenticated')

      const clientMsgId = crypto.randomUUID()

      // Optimistic message
      const optimisticMessage: Message = {
        id: -Date.now(), // negative temporary ID
        client_message_id: clientMsgId,
        channel_id: channelId,
        user: authStore.user,
        parent_id: null,
        body_raw: body,
        body_html: body, // will be rendered as raw text initially
        type: 'text',
        edited_at: null,
        deleted_at: null,
        created_at: new Date().toISOString(),
        reactions: [],
        attachments: [],
        reply_count: 0,
        last_reply_at: null,
        sending: true,
      }

      if (!this.messages[channelId]) {
        this.messages[channelId] = []
      }
      this.messages[channelId].push(optimisticMessage)

      try {
        const realMessage = await apiSendMessage(channelId, {
          body,
          client_message_id: clientMsgId,
        })

        // Replace optimistic message
        const idx = this.messages[channelId].findIndex((m) => m.client_message_id === clientMsgId)
        if (idx !== -1) {
          this.messages[channelId][idx] = realMessage
        }
      } catch (err) {
        console.error('Failed to send message:', err)
        const idx = this.messages[channelId].findIndex((m) => m.client_message_id === clientMsgId)
        if (idx !== -1) {
          this.messages[channelId][idx].sending = false
          this.messages[channelId][idx].failed = true
        }
        throw err
      }
    },

    async editMessage(channelId: number, messageId: number, body: string) {
      // Optimistic edit
      const currentMsgs = this.messages[channelId] ?? []
      const idx = currentMsgs.findIndex((m) => m.id === messageId)
      let oldBody = ''
      if (idx !== -1) {
        oldBody = currentMsgs[idx].body_raw
        currentMsgs[idx].body_raw = body
        currentMsgs[idx].body_html = body
        currentMsgs[idx].edited_at = new Date().toISOString()
      }

      try {
        const updatedMessage = await apiEditMessage(messageId, body)
        if (idx !== -1) {
          this.messages[channelId][idx] = updatedMessage
        }
      } catch (err) {
        console.error('Failed to edit message:', err)
        // Rollback
        if (idx !== -1) {
          currentMsgs[idx].body_raw = oldBody
          currentMsgs[idx].body_html = oldBody
          currentMsgs[idx].edited_at = null
        }
        throw err
      }
    },

    async deleteMessage(channelId: number, messageId: number) {
      // Optimistic delete
      const currentMsgs = this.messages[channelId] ?? []
      const idx = currentMsgs.findIndex((m) => m.id === messageId)
      let oldDeletedAt: string | null = null
      if (idx !== -1) {
        oldDeletedAt = currentMsgs[idx].deleted_at
        currentMsgs[idx].deleted_at = new Date().toISOString()
      }

      try {
        await apiDeleteMessage(messageId)
        // Set deleted_at for real
        if (idx !== -1) {
          currentMsgs[idx].deleted_at = new Date().toISOString()
        }
      } catch (err) {
        console.error('Failed to delete message:', err)
        // Rollback
        if (idx !== -1) {
          currentMsgs[idx].deleted_at = oldDeletedAt
        }
        throw err
      }
    },

    handleMessageSent(channelId: number, message: Message) {
      if (!this.messages[channelId]) {
        this.messages[channelId] = []
      }

      const currentMsgs = this.messages[channelId]

      // 1. Check if we already have this message by server ID
      const exists = currentMsgs.some((m) => m.id === message.id)
      if (exists) return

      // 2. Check if we have an optimistic message with the same client_message_id
      const optIdx = currentMsgs.findIndex(
        (m) => m.client_message_id === message.client_message_id
      )

      if (optIdx !== -1) {
        // Replace optimistic message
        currentMsgs[optIdx] = message
      } else {
        // Just push and sort (or push since it's newer)
        currentMsgs.push(message)
        currentMsgs.sort((a, b) => a.id - b.id)
      }
    },

    handleMessageUpdated(channelId: number, message: Message) {
      const currentMsgs = this.messages[channelId] ?? []
      const idx = currentMsgs.findIndex((m) => m.id === message.id)
      if (idx !== -1) {
        currentMsgs[idx] = message
      }
    },

    handleMessageDeleted(channelId: number, payload: { id: number; channel_id: number }) {
      const currentMsgs = this.messages[channelId] ?? []
      const idx = currentMsgs.findIndex((m) => m.id === payload.id)
      if (idx !== -1) {
        currentMsgs[idx].deleted_at = new Date().toISOString()
      }
    },

    async reconnectAndSync(channelId: number) {
      if (this.loading[channelId]) return

      const currentMsgs = this.messages[channelId] ?? []

      this.loading[channelId] = true

      try {
        // We load messages. Since we don't have an explicit ?after parameter,
        // we fetch the latest 50 messages and do an idempotent merge.
        const result = await fetchMessages(channelId, { limit: 50 })

        const existingIds = new Set(currentMsgs.map((m) => m.id))
        const existingClientIds = new Set(
          currentMsgs.map((m) => m.client_message_id).filter(Boolean)
        )

        const newMessagesToMerge = result.data.filter((m) => {
          return !existingIds.has(m.id) && !existingClientIds.has(m.client_message_id)
        })

        if (newMessagesToMerge.length > 0) {
          this.messages[channelId] = [...currentMsgs, ...newMessagesToMerge].sort(
            (a, b) => a.id - b.id
          )
        }
      } catch (err) {
        console.error('Failed to sync messages on reconnect:', err)
      } finally {
        this.loading[channelId] = false
      }
    },
  },
})
