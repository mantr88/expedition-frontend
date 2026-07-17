import { watch, onUnmounted } from 'vue'
import { getEcho } from '../api/echo'
import { useChannelsStore } from '../stores/channels'
import { useMessagesStore } from '../stores/messages'
import { usePresenceStore } from '../stores/presence'
import { useAuthStore } from '../stores/auth'
import { useNotificationsStore } from '../stores/notifications'
import type { Message } from '../types/Message'
import type { Channel, ChannelMember } from '../types/Channel'
import type { User } from '../types/User'
import type { StateChangeDetails } from '../api/echo'

let isConnectionListenerBound = false

interface WhisperTypingEvent {
  user_id: number
  name: string
}

interface MessageDeletedEvent {
  id: number
  channel_id: number
}

interface PusherConnector {
  connection?: {
    bind: (event: string, callback: (states: StateChangeDetails) => void) => void
    unbind?: (event: string, callback: (states: StateChangeDetails) => void) => void
  }
}

export function useEcho() {
  const channelsStore = useChannelsStore()
  const messagesStore = useMessagesStore()
  const presenceStore = usePresenceStore()
  const authStore = useAuthStore()
  const notificationsStore = useNotificationsStore()
  const echo = getEcho()

  // Bind reconnect listener once
  const connection = (echo.connector as unknown as PusherConnector).connection
  let stateChangeCallback: ((states: StateChangeDetails) => void) | null = null

  if (!isConnectionListenerBound && connection) {
    isConnectionListenerBound = true
    let wasDisconnected = false
    stateChangeCallback = (states: StateChangeDetails) => {
      if (states.current === 'connected') {
        if (wasDisconnected) {
          wasDisconnected = false
          if (channelsStore.currentChannelId !== null) {
            messagesStore.reconnectAndSync(channelsStore.currentChannelId)
          }
        }
      } else if (states.current === 'disconnected' || states.current === 'unavailable') {
        wasDisconnected = true
      }
    }
    connection.bind('state_change', stateChangeCallback)
  }

  // Watch user to subscribe to personal notifications
  watch(
    () => authStore.user?.id,
    (newUserId, oldUserId) => {
      if (oldUserId) {
        echo.leaveChannel(`private-user.${oldUserId}`)
      }

      if (newUserId) {
        const userChan = echo.private(`user.${newUserId}`)
        userChan.listen('.Mentioned', (payload: { message: Message; channel: Channel }) => {
          const current = channelsStore.channels.find((c) => c.id === payload.channel.id)
          if (current?.my_membership?.notifications_level === 'mute') return
          notificationsStore.showNotification(`Нова згадка у ${payload.channel.name}`, {
            body: payload.message.body_raw,
          })
        })
        userChan.listen('.AddedToChannel', (payload: { channel: Channel }) => {
          const exists = channelsStore.channels.some((c) => c.id === payload.channel.id)
          if (!exists) {
            channelsStore.channels.push(payload.channel)
          }
        })
      }
    },
    { immediate: true },
  )

  const subscribedPrivateChannels = new Set<number>()

  // Watch all channels to subscribe to private channels
  watch(
    () => channelsStore.channels,
    (channels) => {
      channels.forEach((channel) => {
        if (!subscribedPrivateChannels.has(channel.id)) {
          subscribedPrivateChannels.add(channel.id)
          const privateChan = echo.private(`channel.${channel.id}`)

          privateChan.listen('.MessageSent', (payload: Message) => {
            messagesStore.handleMessageSent(channel.id, payload)

            if (channelsStore.currentChannelId === channel.id) {
              channelsStore.markAsRead(channel.id, payload.id)
            } else if (channel.type === 'dm') {
              // Show notification for DM if it's not the active channel
              const current = channelsStore.channels.find((c) => c.id === channel.id)
              const level = current?.my_membership?.notifications_level ?? 'all'
              if (level === 'all') {
                notificationsStore.showNotification(`Нове повідомлення від ${channel.name}`, {
                  body: payload.body_raw,
                })
              }
            }
          })
          privateChan.listen('.MessageUpdated', (payload: Message) => {
            messagesStore.handleMessageUpdated(channel.id, payload)
          })
          privateChan.listen('.MessageDeleted', (payload: MessageDeletedEvent) => {
            messagesStore.handleMessageDeleted(channel.id, payload)
          })
          privateChan.listen('.ChannelUpdated', (payload: Channel) => {
            channelsStore.handleChannelUpdated(payload)
          })
          privateChan.listen(
            '.ReactionToggled',
            (payload: { message_id: number; emoji: string; count: number; user_id: number }) => {
              messagesStore.handleReactionToggled(channel.id, payload)
            },
          )
          privateChan.listen('.MemberAdded', (payload: ChannelMember) => {
            const list =
              channelsStore.members[channel.id] ?? (channelsStore.members[channel.id] = [])
            if (!list.some((m) => m.user.id === payload.user.id)) {
              list.push(payload)
              const c = channelsStore.channels.find((ch) => ch.id === channel.id)
              if (c) c.members_count += 1
            }
          })
          privateChan.listen(
            '.MemberRemoved',
            (payload: { channel_id: number; user_id: number }) => {
              const list = channelsStore.members[channel.id]
              if (list) {
                const idx = list.findIndex((m) => m.user.id === payload.user_id)
                if (idx !== -1) {
                  list.splice(idx, 1)
                  const c = channelsStore.channels.find((ch) => ch.id === channel.id)
                  if (c) c.members_count -= 1
                }
              }
              if (authStore.user?.id === payload.user_id) {
                const cIdx = channelsStore.channels.findIndex((ch) => ch.id === channel.id)
                if (cIdx !== -1) {
                  channelsStore.channels.splice(cIdx, 1)
                  if (channelsStore.currentChannelId === channel.id) {
                    if (channelsStore.channels.length > 0) {
                      channelsStore.selectChannel(channelsStore.channels[0].id)
                    } else {
                      channelsStore.currentChannelId = null
                    }
                  }
                }
              }
            },
          )
        }
      })
    },
    { immediate: true, deep: true },
  )

  // Watch active channel and manage presence
  watch(
    () => channelsStore.currentChannelId,
    (newChanId, oldChanId) => {
      if (oldChanId !== null) {
        echo.leaveChannel(`presence-channel.${oldChanId}`)
        if (typeof oldChanId === 'number') {
          presenceStore.clearChannelTyping(oldChanId)
        }
      }

      if (newChanId !== null) {
        // Subscribe to presence channel
        const presenceChan = echo.join(`channel.${newChanId}`)
        presenceChan.here((users: User[]) => {
          presenceStore.setOnlineUsers(users)
        })
        presenceChan.joining((user: User) => {
          presenceStore.addUserOnline(user)
        })
        presenceChan.leaving((user: User) => {
          presenceStore.removeUserOffline(user.id)
          presenceStore.clearUserTyping(newChanId, user.id)
        })
        presenceChan.listenForWhisper('typing', (e: WhisperTypingEvent) => {
          presenceStore.setUserTyping(newChanId, e.user_id, e.name)
        })
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    if (authStore.user) {
      echo.leaveChannel(`private-user.${authStore.user.id}`)
    }

    subscribedPrivateChannels.forEach((id) => {
      echo.leaveChannel(`private-channel.${id}`)
    })
    subscribedPrivateChannels.clear()

    if (channelsStore.currentChannelId !== null) {
      echo.leaveChannel(`presence-channel.${channelsStore.currentChannelId}`)
    }

    if (stateChangeCallback && connection?.unbind) {
      connection.unbind('state_change', stateChangeCallback)
      isConnectionListenerBound = false
    }
    presenceStore.reset()
  })
}
