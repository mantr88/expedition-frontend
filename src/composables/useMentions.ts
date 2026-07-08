import { ref, computed } from 'vue'
import { useChannelsStore } from '../stores/channels'
import type { User } from '../types/User'

export function useMentions() {
  const channelsStore = useChannelsStore()

  const isMentioning = ref(false)
  const mentionQuery = ref('')
  const mentionStartIndex = ref(-1)
  const selectedMentionIndex = ref(0)

  const mentionSuggestions = computed<User[]>(() => {
    if (!isMentioning.value) return []

    const members = channelsStore.activeChannelMembers.map((m) => m.user)
    const query = mentionQuery.value.toLowerCase()

    if (!query) return members
    return members.filter((u) => u.name.toLowerCase().includes(query))
  })

  const handleInput = (text: string, cursorPosition: number) => {
    // Find the last '@' before the cursor
    const textBeforeCursor = text.slice(0, cursorPosition)
    const atIndex = textBeforeCursor.lastIndexOf('@')

    if (atIndex !== -1) {
      // Check if '@' is at the beginning or preceded by a space
      if (
        atIndex === 0 ||
        textBeforeCursor[atIndex - 1] === ' ' ||
        textBeforeCursor[atIndex - 1] === '\n'
      ) {
        const query = textBeforeCursor.slice(atIndex + 1)
        // Check if query contains spaces (if so, we probably stopped mentioning)
        if (!query.includes(' ') && !query.includes('\n')) {
          isMentioning.value = true
          mentionQuery.value = query
          mentionStartIndex.value = atIndex
          // Reset selection if query changes significantly
          if (selectedMentionIndex.value >= mentionSuggestions.value.length) {
            selectedMentionIndex.value = 0
          }
          return
        }
      }
    }

    isMentioning.value = false
  }

  const navigateMentions = (direction: 1 | -1) => {
    if (!isMentioning.value || mentionSuggestions.value.length === 0) return

    let nextIndex = selectedMentionIndex.value + direction
    if (nextIndex < 0) nextIndex = mentionSuggestions.value.length - 1
    if (nextIndex >= mentionSuggestions.value.length) nextIndex = 0

    selectedMentionIndex.value = nextIndex
  }

  const insertMention = (text: string, user: User) => {
    if (!isMentioning.value || mentionStartIndex.value === -1) return text

    const beforeMention = text.slice(0, mentionStartIndex.value)
    // Find where the mention ends
    let afterMentionStart = mentionStartIndex.value + 1 + mentionQuery.value.length
    const afterMention = text.slice(afterMentionStart)

    const newText = `${beforeMention}@${user.name} ${afterMention}`

    isMentioning.value = false
    mentionQuery.value = ''
    mentionStartIndex.value = -1

    return newText
  }

  return {
    isMentioning,
    mentionSuggestions,
    selectedMentionIndex,
    handleInput,
    navigateMentions,
    insertMention,
  }
}
