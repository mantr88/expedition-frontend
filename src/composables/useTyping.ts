import { getEcho } from '../api/echo'
import { useAuthStore } from '../stores/auth'

export function useTyping() {
  const authStore = useAuthStore()
  const echo = getEcho()
  let lastWhisperTime = 0

  function sendTypingWhisper(channelId: number) {
    if (!authStore.user) return
    const now = Date.now()
    if (now - lastWhisperTime > 1500) {
      lastWhisperTime = now
      try {
        echo.join(`channel.${channelId}`).whisper('typing', {
          user_id: authStore.user.id,
          name: authStore.user.name,
        })
      } catch (err) {
        console.error('Failed to send typing whisper:', err)
      }
    }
  }

  return {
    sendTypingWhisper,
  }
}
