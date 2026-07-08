import { defineStore } from 'pinia'
import {
  fetchChannels,
  createChannel as apiCreateChannel,
  fetchChannelMembers,
  openDirectMessage as apiOpenDirectMessage,
  markChannelAsRead as apiMarkChannelAsRead,
  type CreateChannelPayload,
} from '../api/channels'
import type { Channel, ChannelMember } from '../types/Channel'

interface ChannelsState {
  channels: Channel[]
  currentChannelId: number | null
  members: Record<number, ChannelMember[]>
  loading: boolean
  error: string | null
}

export const useChannelsStore = defineStore('channels', {
  state: (): ChannelsState => ({
    channels: [],
    currentChannelId: null,
    members: {},
    loading: false,
    error: null,
  }),

  getters: {
    activeChannel: (state) => state.channels.find((c) => c.id === state.currentChannelId) ?? null,
    activeChannelMembers: (state) =>
      state.currentChannelId ? (state.members[state.currentChannelId] ?? []) : [],
    publicChannels: (state) => state.channels.filter((c) => c.type !== 'dm'),
    directMessages: (state) => state.channels.filter((c) => c.type === 'dm'),
  },

  actions: {
    async loadChannels() {
      this.loading = true
      this.error = null
      try {
        const data = await fetchChannels()
        this.channels = data
        if (data.length > 0 && this.currentChannelId === null) {
          await this.selectChannel(data[0].id)
        }
      } catch (err) {
        this.error = 'Не вдалося завантажити канали.'
        throw err
      } finally {
        this.loading = false
      }
    },

    async selectChannel(channelId: number) {
      this.currentChannelId = channelId
      if (!this.members[channelId]) {
        await this.loadChannelMembers(channelId)
      }
    },

    async createChannel(payload: CreateChannelPayload) {
      this.loading = true
      this.error = null
      try {
        const newChan = await apiCreateChannel(payload)
        this.channels.push(newChan)
        await this.selectChannel(newChan.id)
        return newChan
      } catch (err) {
        this.error = 'Не вдалося створити канал.'
        throw err
      } finally {
        this.loading = false
      }
    },

    async loadChannelMembers(channelId: number) {
      try {
        const membersList = await fetchChannelMembers(channelId)
        this.members[channelId] = membersList
      } catch (err) {
        console.error('Failed to load channel members:', err)
      }
    },

    handleChannelUpdated(channel: Channel) {
      const idx = this.channels.findIndex((c) => c.id === channel.id)
      if (idx !== -1) {
        this.channels[idx] = {
          ...this.channels[idx],
          ...channel,
        }
      }
    },

    async openDirectMessage(userId: number) {
      this.loading = true
      this.error = null
      try {
        const dmChannel = await apiOpenDirectMessage(userId)
        const exists = this.channels.some((c) => c.id === dmChannel.id)
        if (!exists) {
          this.channels.push(dmChannel)
        }
        await this.selectChannel(dmChannel.id)
        return dmChannel
      } catch (err) {
        this.error = 'Не вдалося відкрити особисті повідомлення.'
        throw err
      } finally {
        this.loading = false
      }
    },

    async markAsRead(channelId: number, messageId: number) {
      const channel = this.channels.find((c) => c.id === channelId)
      if (!channel || !channel.my_membership) return

      // Optimistic update
      const currentRead = channel.my_membership.last_read_message_id ?? 0
      if (messageId > currentRead) {
        channel.my_membership.last_read_message_id = messageId
        channel.unread_count = 0
        try {
          await apiMarkChannelAsRead(channelId, messageId)
        } catch (err) {
          console.error('Failed to mark channel as read', err)
          // Ideally rollback, but since it's just unread markers it's not critical
        }
      }
    },

    incrementUnread(channelId: number) {
      const channel = this.channels.find((c) => c.id === channelId)
      if (channel) {
        channel.unread_count = (channel.unread_count || 0) + 1
      }
    },
  },
})
