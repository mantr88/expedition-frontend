<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { VList } from 'virtua/vue'
import type { Message } from '../types/Message'
import MessageItem from './MessageItem.vue'
import { useInfiniteScroll } from '../composables/useInfiniteScroll'
import { useChannelsStore } from '../stores/channels'
import { computed } from 'vue'

const props = defineProps<{
  messages: Message[]
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'load-older'): Promise<void>
  (e: 'edit', messageId: number, body: string): void
  (e: 'delete', messageId: number): void
}>()

const vListRef = ref<null | {
  scrollElement?: HTMLElement
  scrollToIndex?: (index: number) => void
}>(null)
const { handleScrollUp } = useInfiniteScroll()

const channelsStore = useChannelsStore()
const lastReadMessageId = computed(() => {
  return channelsStore.activeChannel?.my_membership?.last_read_message_id ?? Number.MAX_SAFE_INTEGER
})

function checkConsecutive(msg: Message, index: number) {
  if (index === 0) return false
  const prevMsg = props.messages[index - 1]
  if (!prevMsg) return false
  if (prevMsg.user.id !== msg.user.id) return false

  // Check if both are normal messages (not system, deleted, etc.)
  if (prevMsg.deleted_at || msg.deleted_at) return false

  const timeDiff = new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()
  return timeDiff < 120000 // 2 minutes
}

function scrollToBottom() {
  nextTick(() => {
    if (
      vListRef.value &&
      typeof vListRef.value.scrollToIndex === 'function' &&
      props.messages.length > 0
    ) {
      vListRef.value.scrollToIndex(props.messages.length - 1)
    }
  })
}

// Watch messages changes to trigger scroll to bottom when loading new channel or sending message
watch(
  () => props.messages,
  (newMsgs, oldMsgs) => {
    if (!newMsgs || newMsgs.length === 0) return

    // If channel changed or we sent a message (first message ID is same)
    if (
      !oldMsgs ||
      oldMsgs.length === 0 ||
      (newMsgs.length > oldMsgs.length && newMsgs[0]?.id === oldMsgs[0]?.id)
    ) {
      scrollToBottom()
    }
  },
  { immediate: true, deep: false },
)

function onScroll() {
  const scrollElement = vListRef.value?.scrollElement
  if (!scrollElement) return

  handleScrollUp(scrollElement, async () => {
    await emit('load-older')
  })
}

function onEdit(messageId: number, body: string) {
  emit('edit', messageId, body)
}

function onDelete(messageId: number) {
  emit('delete', messageId)
}
</script>

<template>
  <div class="message-list-container">
    <div v-if="loading && messages.length === 0" class="loading-state">
      <span class="spinner"></span>
      Завантаження повідомлень...
    </div>

    <div v-else-if="messages.length === 0" class="empty-state">
      <p class="empty-title">Ще немає повідомлень</p>
      <p class="empty-subtitle">Напишіть перше 👋</p>
    </div>

    <VList v-else ref="vListRef" :data="messages" class="scroll-container" @scroll="onScroll">
      <template #default="{ item: msg, index }">
        <div v-if="msg.id > lastReadMessageId && (index === 0 || messages[index - 1].id <= lastReadMessageId)" class="new-messages-divider">
          <span class="divider-text">Нові повідомлення</span>
        </div>
        <MessageItem
          :key="msg.id"
          :message="msg"
          :is-consecutive="checkConsecutive(msg, index)"
          @edit="onEdit"
          @delete="onDelete"
        />
      </template>
    </VList>
  </div>
</template>

<style scoped>
.message-list-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Important for scroll container to work under flex layout */
  background-color: var(--bg-app);
}

.scroll-container {
  flex: 1;
  overflow-y: auto;
  height: 100%;
}

.loading-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  gap: var(--space-2);
}

.empty-title {
  font-size: var(--text-xl);
  font-weight: 300;
  color: var(--text-primary);
  margin: 0;
}

.empty-subtitle {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin: 0;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-strong);
  border-top-color: var(--indigo-600);
  border-radius: var(--radius-full);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.new-messages-divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: var(--space-4) 0;
}

.new-messages-divider::before,
.new-messages-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--indigo-300);
}

.divider-text {
  padding: 0 var(--space-3);
  color: var(--indigo-600);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 500;
}
</style>
