import { watch, onUnmounted } from 'vue'
import { getEcho } from '../api/echo'
import { useChannelsStore } from '../stores/channels'
import { useMessagesStore } from '../stores/messages'
import { usePresenceStore } from '../stores/presence'
import type { Message } from '../types/Message'
import type { Channel } from '../types/Channel'
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
  }
}

export function useEcho() {
  const channelsStore = useChannelsStore()
  const messagesStore = useMessagesStore()
  const presenceStore = usePresenceStore()
  const echo = getEcho()

  // Bind reconnect listener once
  if (!isConnectionListenerBound) {
    isConnectionListenerBound = true
    let wasDisconnected = false

    const connection = (echo.connector as unknown as PusherConnector).connection
    if (connection) {
      connection.bind('state_change', (states: StateChangeDetails) => {
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
      })
    }
  }

  // Watch channel selection
  watch(
    () => channelsStore.currentChannelId,
    (newChanId, oldChanId) => {
      if (oldChanId !== null) {
        echo.leave(`channel.${oldChanId}`)
      }

      if (newChanId !== null) {
        // Subscribe to private channel
        const privateChan = echo.private(`channel.${newChanId}`)
        privateChan.listen('.MessageSent', (payload: Message) => {
          messagesStore.handleMessageSent(newChanId, payload)
        })
        privateChan.listen('.MessageUpdated', (payload: Message) => {
          messagesStore.handleMessageUpdated(newChanId, payload)
        })
        privateChan.listen('.MessageDeleted', (payload: MessageDeletedEvent) => {
          messagesStore.handleMessageDeleted(newChanId, payload)
        })
        privateChan.listen('.ChannelUpdated', (payload: Channel) => {
          channelsStore.handleChannelUpdated(payload)
        })

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
    { immediate: true }
  )

  onUnmounted(() => {
    if (channelsStore.currentChannelId !== null) {
      echo.leave(`channel.${channelsStore.currentChannelId}`)
    }
  })
}
