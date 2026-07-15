import { defineStore } from 'pinia'
import type { User } from '../types/User'

interface PresenceState {
  onlineUsers: Record<number, User>
  typingUsers: Record<number, Record<number, { name: string; timestamp: number }>>
}

const typingTimeouts: Record<string, ReturnType<typeof setTimeout>> = {}

export const usePresenceStore = defineStore('presence', {
  state: (): PresenceState => ({
    onlineUsers: {},
    typingUsers: {},
  }),

  getters: {
    isUserOnline: (state) => (userId: number) => {
      return !!state.onlineUsers[userId]
    },

    getTypingUsersInChannel: (state) => (channelId: number) => {
      const channelTyping = state.typingUsers[channelId] ?? {}
      const now = Date.now()

      // Filter out typing whispers older than 3 seconds (fallback if they stop typing without notice)
      return Object.entries(channelTyping)
        .filter(([, info]) => now - info.timestamp < 3000)
        .map(([id, info]) => ({
          id: Number(id),
          name: info.name,
        }))
    },
  },

  actions: {
    setOnlineUsers(users: User[]) {
      this.onlineUsers = {}
      users.forEach((user) => {
        this.onlineUsers[user.id] = user
      })
    },

    addUserOnline(user: User) {
      this.onlineUsers[user.id] = user
    },

    removeUserOffline(userId: number) {
      delete this.onlineUsers[userId]
    },

    setUserTyping(channelId: number, userId: number, userName: string) {
      if (!this.typingUsers[channelId]) {
        this.typingUsers[channelId] = {}
      }
      this.typingUsers[channelId][userId] = {
        name: userName,
        timestamp: Date.now(),
      }

      const key = `${channelId}-${userId}`
      if (typingTimeouts[key]) {
        clearTimeout(typingTimeouts[key])
      }

      typingTimeouts[key] = setTimeout(() => {
        this.clearUserTyping(channelId, userId)
        delete typingTimeouts[key]
      }, 3000)
    },

    clearUserTyping(channelId: number, userId: number) {
      if (this.typingUsers[channelId]) {
        delete this.typingUsers[channelId][userId]
      }
      const key = `${channelId}-${userId}`
      if (typingTimeouts[key]) {
        clearTimeout(typingTimeouts[key])
        delete typingTimeouts[key]
      }
    },

    clearChannelTyping(channelId: number) {
      const channelTyping = this.typingUsers[channelId]
      if (channelTyping) {
        Object.keys(channelTyping).forEach((userId) => {
          const key = `${channelId}-${userId}`
          if (typingTimeouts[key]) {
            clearTimeout(typingTimeouts[key])
            delete typingTimeouts[key]
          }
        })
        delete this.typingUsers[channelId]
      }
    },

    reset() {
      Object.keys(typingTimeouts).forEach((key) => {
        clearTimeout(typingTimeouts[key])
        delete typingTimeouts[key]
      })
      this.typingUsers = {}
      this.onlineUsers = {}
    },
  },
})
