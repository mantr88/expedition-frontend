import { onBeforeUnmount } from 'vue'
import { useChannelsStore } from '../stores/channels'

export function useUnread() {
  const channelsStore = useChannelsStore()
  
  let timeoutId: number | null = null

  const markAsReadDebounced = (channelId: number, messageId: number) => {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
    }
    
    timeoutId = window.setTimeout(() => {
      channelsStore.markAsRead(channelId, messageId)
    }, 1000) // 1 second debounce
  }

  const handleMessageVisible = (channelId: number, messageId: number) => {
    const channel = channelsStore.channels.find(c => c.id === channelId)
    if (!channel || !channel.my_membership) return

    const lastRead = channel.my_membership.last_read_message_id || 0
    if (messageId > lastRead) {
      markAsReadDebounced(channelId, messageId)
    }
  }

  onBeforeUnmount(() => {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
    }
  })

  return {
    handleMessageVisible
  }
}
