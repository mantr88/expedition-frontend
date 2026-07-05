import { defineStore } from 'pinia'
import {
  fetchChannels,
  createChannel as apiCreateChannel,
  fetchChannelMembers,
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
  },
})
