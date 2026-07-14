<script setup lang="ts">
import { computed } from 'vue'
import { PhX } from '@phosphor-icons/vue'
import { useMessagesStore } from '../stores/messages'
import MessageItem from './MessageItem.vue'
import MessageList from './MessageList.vue'
import MessageInput from './MessageInput.vue'

const messagesStore = useMessagesStore()

const activeThreadMessage = computed(() => messagesStore.activeThreadMessage)
const threadReplies = computed(() => messagesStore.threadReplies)
const loading = computed(() => messagesStore.threadLoading)

function close() {
  messagesStore.closeThread()
}

async function loadOlder() {
  if (activeThreadMessage.value) {
    await messagesStore.loadReplies(activeThreadMessage.value.id, { loadMore: true })
  }
}

async function sendReply(text: string, files: File[]) {
  if (!activeThreadMessage.value) return
  await messagesStore.sendNewMessage(
    activeThreadMessage.value.channel_id,
    text,
    activeThreadMessage.value.id,
    files,
  )
}

function onEdit(messageId: number, body: string) {
  if (activeThreadMessage.value) {
    messagesStore.editMessage(activeThreadMessage.value.channel_id, messageId, body)
  }
}

function onDelete(messageId: number) {
  if (activeThreadMessage.value) {
    messagesStore.deleteMessage(activeThreadMessage.value.channel_id, messageId)
  }
}
</script>

<template>
  <div v-if="activeThreadMessage" class="thread-panel">
    <div class="thread-header">
      <h3 class="thread-title">Тред</h3>
      <span class="thread-meta mono">{{ activeThreadMessage.reply_count }} відповідей</span>
      <button class="close-btn" @click="close" aria-label="Закрити тред">
        <PhX :size="20" />
      </button>
    </div>

    <div class="thread-content">
      <div class="parent-message">
        <MessageItem
          :message="activeThreadMessage"
          :is-consecutive="false"
          @edit="onEdit"
          @delete="onDelete"
        />
      </div>

      <div class="replies-divider">
        <span class="divider-line"></span>
        <span class="divider-text mono">{{ activeThreadMessage.reply_count }} відповідей</span>
        <span class="divider-line"></span>
      </div>

      <MessageList
        :messages="threadReplies"
        :loading="loading"
        @load-older="loadOlder"
        @edit="onEdit"
        @delete="onDelete"
        class="thread-replies-list"
      />
    </div>

    <div class="thread-input">
      <MessageInput placeholder="Відповісти в треді..." @send="sendReply" />
    </div>
  </div>
</template>

<style scoped>
.thread-panel {
  width: 320px;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-app);
  border-left: 1px solid var(--border-subtle);
  height: 100%;
}

.thread-header {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
  background-color: var(--bg-app);
}

.thread-title {
  font-size: var(--text-md);
  font-weight: 500;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
}

.thread-meta {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  margin-right: var(--space-3);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: all var(--dur-fast) var(--ease);
}

.close-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.thread-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
}

.parent-message {
  padding-top: var(--space-2);
}

.replies-divider {
  display: flex;
  align-items: center;
  margin: var(--space-2) 0;
}

.divider-line {
  flex: 1;
  height: 1px;
  background-color: var(--border-subtle);
}

.divider-text {
  padding: 0 var(--space-2);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.thread-replies-list {
  flex: 1;
}

.thread-input {
  border-top: 1px solid var(--border-subtle);
  padding-top: var(--space-3);
}

.mono {
  font-family: var(--font-mono);
}
</style>
