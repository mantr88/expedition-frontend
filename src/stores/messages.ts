import { defineStore } from 'pinia'
import {
  fetchMessages,
  sendMessage as apiSendMessage,
  editMessage as apiEditMessage,
  deleteMessage as apiDeleteMessage,
  toggleReaction as apiToggleReaction,
  fetchReplies as apiFetchReplies,
  uploadAttachment as apiUploadAttachment,
} from '../api/messages'
import type { Message } from '../types/Message'
import { useAuthStore } from './auth'
import { useChannelsStore } from './channels'

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
  activeThreadMessage: Message | null
  threadReplies: Message[]
  threadPagination: { hasMore: boolean; nextCursor: number | null }
  threadLoading: boolean
  highlightMessageId: number | null
}

export const useMessagesStore = defineStore('messages', {
  state: (): MessagesState => ({
    messages: {},
    pagination: {},
    loading: {},
    activeThreadMessage: null,
    threadReplies: [],
    threadPagination: { hasMore: false, nextCursor: null },
    threadLoading: false,
    highlightMessageId: null,
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

    async openThread(message: Message) {
      this.activeThreadMessage = message
      this.threadReplies = []
      this.threadPagination = { hasMore: false, nextCursor: null }
      await this.loadReplies(message.id)
    },

    closeThread() {
      this.activeThreadMessage = null
      this.threadReplies = []
    },

    async loadReplies(messageId: number, options: { loadMore?: boolean } = {}) {
      if (this.threadLoading) return

      const pag = this.threadPagination
      if (options.loadMore && pag && !pag.hasMore) return

      this.threadLoading = true

      try {
        const after = options.loadMore && pag ? (pag.nextCursor ?? undefined) : undefined
        const result = await apiFetchReplies(messageId, { after, limit: 50 })

        if (options.loadMore) {
          this.threadReplies = [...this.threadReplies, ...result.data]
        } else {
          this.threadReplies = result.data
        }

        this.threadPagination = {
          hasMore: result.meta.has_more,
          nextCursor: result.meta.next_cursor,
        }
      } catch (err) {
        console.error('Failed to load replies:', err)
        throw err
      } finally {
        this.threadLoading = false
      }
    },

    async sendNewMessage(
      channelId: number,
      body: string,
      parentId: number | null = null,
      files: File[] = [],
    ) {
      const authStore = useAuthStore()
      if (!authStore.user) throw new Error('Not authenticated')

      const clientMsgId = crypto.randomUUID()

      // Optimistic message
      const optimisticMessage: Message = {
        id: -Date.now(),
        client_message_id: clientMsgId,
        channel_id: channelId,
        user: authStore.user,
        parent_id: parentId,
        body_raw: body,
        body_html: body,
        type: files.length > 0 ? 'file' : 'text',
        edited_at: null,
        deleted_at: null,
        created_at: new Date().toISOString(),
        reactions: [],
        attachments: [],
        reply_count: 0,
        last_reply_at: null,
        sending: true,
      }

      if (parentId && this.activeThreadMessage?.id === parentId) {
        this.threadReplies.push(optimisticMessage)
      } else if (!parentId) {
        if (!this.messages[channelId]) {
          this.messages[channelId] = []
        }
        this.messages[channelId].push(optimisticMessage)
      }

      try {
        const realMessage = await apiSendMessage(channelId, {
          body,
          client_message_id: clientMsgId,
          parent_id: parentId,
        })

        if (files.length > 0) {
          for (const file of files) {
            const attachment = await apiUploadAttachment(channelId, realMessage.id, file)
            realMessage.attachments.push(attachment)
          }
        }

        if (parentId && this.activeThreadMessage?.id === parentId) {
          const idx = this.threadReplies.findIndex((m) => m.client_message_id === clientMsgId)
          if (idx !== -1) {
            this.threadReplies[idx] = realMessage
          }
        } else if (!parentId) {
          const idx = this.messages[channelId].findIndex((m) => m.client_message_id === clientMsgId)
          if (idx !== -1) {
            this.messages[channelId][idx] = realMessage
          }
        }
      } catch (err) {
        console.error('Failed to send message:', err)
        if (parentId && this.activeThreadMessage?.id === parentId) {
          const idx = this.threadReplies.findIndex((m) => m.client_message_id === clientMsgId)
          if (idx !== -1) {
            this.threadReplies[idx].sending = false
            this.threadReplies[idx].failed = true
          }
        } else if (!parentId) {
          const idx = this.messages[channelId].findIndex((m) => m.client_message_id === clientMsgId)
          if (idx !== -1) {
            this.messages[channelId][idx].sending = false
            this.messages[channelId][idx].failed = true
          }
        }
        throw err
      }
    },

    async toggleReaction(channelId: number, messageId: number, emoji: string) {
      // Optimistic update
      const msg = this.findMessageAnywhere(channelId, messageId)
      if (!msg) return

      const reaction = msg.reactions.find((r) => r.emoji === emoji)
      const previousState = reaction ? { ...reaction } : null

      if (reaction) {
        if (reaction.reacted_by_me) {
          reaction.count = Math.max(0, reaction.count - 1)
          reaction.reacted_by_me = false
          if (reaction.count === 0) {
            msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji)
          }
        } else {
          reaction.count++
          reaction.reacted_by_me = true
        }
      } else {
        msg.reactions.push({ emoji, count: 1, reacted_by_me: true })
      }

      try {
        const result = await apiToggleReaction(messageId, emoji)
        const currentMsg = this.findMessageAnywhere(channelId, messageId)
        if (currentMsg) {
          const idx = currentMsg.reactions.findIndex((r) => r.emoji === emoji)
          if (result.count > 0) {
            const updatedReaction = {
              emoji,
              count: result.count,
              reacted_by_me: result.action === 'added',
            }
            if (idx !== -1) {
              currentMsg.reactions[idx] = updatedReaction
            } else {
              currentMsg.reactions.push(updatedReaction)
            }
          } else if (idx !== -1) {
            currentMsg.reactions.splice(idx, 1)
          }
        }
      } catch (err) {
        console.error('Failed to toggle reaction', err)
        const currentMsg = this.findMessageAnywhere(channelId, messageId)
        if (currentMsg) {
          // Revert optimistic update
          if (previousState) {
            const idx = currentMsg.reactions.findIndex((r) => r.emoji === emoji)
            if (idx !== -1) {
              currentMsg.reactions[idx] = previousState
            } else {
              currentMsg.reactions.push(previousState)
            }
          } else {
            currentMsg.reactions = currentMsg.reactions.filter((r) => r.emoji !== emoji)
          }
        }
      }
    },

    findMessageAnywhere(channelId: number, messageId: number): Message | undefined {
      let msg = this.messages[channelId]?.find((m) => m.id === messageId)
      if (!msg && this.activeThreadMessage?.id === messageId) {
        msg = this.activeThreadMessage
      }
      if (!msg) {
        msg = this.threadReplies.find((m) => m.id === messageId)
      }
      return msg
    },

    async editMessage(channelId: number, messageId: number, body: string) {
      const msg = this.findMessageAnywhere(channelId, messageId)
      if (!msg) return

      const oldBodyRaw = msg.body_raw
      const oldBodyHtml = msg.body_html

      msg.body_raw = body
      msg.body_html = body
      msg.edited_at = new Date().toISOString()

      try {
        const updatedMessage = await apiEditMessage(messageId, body)
        const currentMsg = this.findMessageAnywhere(channelId, messageId)
        if (currentMsg) {
          Object.assign(currentMsg, updatedMessage)
        }
      } catch (err) {
        console.error('Failed to edit message:', err)
        const currentMsg = this.findMessageAnywhere(channelId, messageId)
        if (currentMsg) {
          currentMsg.body_raw = oldBodyRaw
          currentMsg.body_html = oldBodyHtml
          currentMsg.edited_at = null
        }
        throw err
      }
    },

    async deleteMessage(channelId: number, messageId: number) {
      const msg = this.findMessageAnywhere(channelId, messageId)
      if (!msg) return

      const oldDeletedAt = msg.deleted_at
      msg.deleted_at = new Date().toISOString()

      try {
        await apiDeleteMessage(messageId)
      } catch (err) {
        console.error('Failed to delete message:', err)
        const currentMsg = this.findMessageAnywhere(channelId, messageId)
        if (currentMsg) {
          currentMsg.deleted_at = oldDeletedAt
        }
        throw err
      }
    },

    handleMessageSent(channelId: number, message: Message) {
      if (message.parent_id) {
        // Handle thread reply
        if (this.activeThreadMessage && this.activeThreadMessage.id === message.parent_id) {
          const exists = this.threadReplies.some((m) => m.id === message.id)
          if (!exists) {
            const optIdx = this.threadReplies.findIndex(
              (m) => m.client_message_id === message.client_message_id,
            )
            if (optIdx !== -1) {
              this.threadReplies[optIdx] = message
            } else {
              this.threadReplies.push(message)
              this.threadReplies.sort((a, b) => a.id - b.id)
            }
          }
        }
        // Update parent message reply_count and last_reply_at
        const parentMsg = this.messages[channelId]?.find((m) => m.id === message.parent_id)
        if (parentMsg) {
          parentMsg.reply_count = message.reply_count || parentMsg.reply_count + 1
          parentMsg.last_reply_at = message.created_at
        }
        return
      }

      if (!this.messages[channelId]) {
        this.messages[channelId] = []
      }

      const currentMsgs = this.messages[channelId]

      const exists = currentMsgs.some((m) => m.id === message.id)
      if (exists) return

      const optIdx = currentMsgs.findIndex((m) => m.client_message_id === message.client_message_id)

      if (optIdx !== -1) {
        currentMsgs[optIdx] = message
      } else {
        currentMsgs.push(message)
        currentMsgs.sort((a, b) => a.id - b.id)

        const channelsStore = useChannelsStore()
        if (channelsStore.currentChannelId !== channelId) {
          channelsStore.incrementUnread(channelId)
        }
      }
    },

    handleMessageUpdated(channelId: number, message: Message) {
      const msg = this.findMessageAnywhere(channelId, message.id)
      if (msg) {
        Object.assign(msg, message)
      }
    },

    handleMessageDeleted(channelId: number, payload: { id: number; channel_id: number }) {
      const msg = this.findMessageAnywhere(channelId, payload.id)
      if (msg) {
        msg.deleted_at = new Date().toISOString()
      }
    },

    handleReactionToggled(
      channelId: number,
      payload: { message_id: number; emoji: string; count: number; user_id: number },
    ) {
      const authStore = useAuthStore()
      if (authStore.user?.id === payload.user_id) return // We already handled this via optimistic update

      const msg = this.findMessageAnywhere(channelId, payload.message_id)
      if (!msg) return

      const idx = msg.reactions.findIndex((r) => r.emoji === payload.emoji)
      if (payload.count > 0) {
        if (idx !== -1) {
          msg.reactions[idx].count = payload.count
        } else {
          msg.reactions.push({ emoji: payload.emoji, count: payload.count, reacted_by_me: false })
        }
      } else if (idx !== -1) {
        msg.reactions.splice(idx, 1)
      }
    },

    async reconnectAndSync(channelId: number) {
      if (this.loading[channelId]) return

      const currentMsgs = this.messages[channelId] ?? []

      this.loading[channelId] = true

      try {
        const result = await fetchMessages(channelId, { limit: 50 })

        const existingIds = new Set(currentMsgs.map((m) => m.id))
        const existingClientIds = new Set(
          currentMsgs.map((m) => m.client_message_id).filter(Boolean),
        )

        const newMessagesToMerge = result.data.filter((m) => {
          return !existingIds.has(m.id) && !existingClientIds.has(m.client_message_id)
        })

        if (newMessagesToMerge.length > 0) {
          this.messages[channelId] = [...currentMsgs, ...newMessagesToMerge].sort(
            (a, b) => a.id - b.id,
          )
        }

        if (this.activeThreadMessage) {
          await this.loadReplies(this.activeThreadMessage.id)
        }
      } catch (err) {
        console.error('Failed to sync messages on reconnect:', err)
      } finally {
        this.loading[channelId] = false
      }
    },

    async jumpToMessage(channelId: number, messageId: number) {
      const channelsStore = useChannelsStore()
      if (channelsStore.currentChannelId !== channelId) {
        await channelsStore.selectChannel(channelId)
      }

      // WorkspaceView watcher може вже вантажити цей канал — дочекатись
      await this.waitForIdle(channelId)

      if (!this.messages[channelId] || this.messages[channelId].length === 0) {
        await this.loadMessages(channelId)
      }

      let attempts = 0
      const MAX_PAGES = 20
      while (
        !this.messages[channelId]?.some((m) => m.id === messageId) &&
        this.pagination[channelId]?.hasMore &&
        attempts < MAX_PAGES
      ) {
        await this.loadMessages(channelId, { loadMore: true })
        await this.waitForIdle(channelId)
        attempts++
      }

      if (this.messages[channelId]?.some((m) => m.id === messageId)) {
        this.highlightMessageId = messageId
      } else {
        this.highlightMessageId = null
      }
    },

    async waitForIdle(channelId: number) {
      while (this.loading[channelId]) {
        await new Promise((resolve) => setTimeout(resolve, 30))
      }
    },

    clearHighlight() {
      this.highlightMessageId = null
    },
  },
})
