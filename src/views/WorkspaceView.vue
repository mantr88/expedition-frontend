<script setup lang="ts">
import { onMounted, watch, ref } from 'vue'
import { useChannelsStore } from '../stores/channels'
import { useMessagesStore } from '../stores/messages'
import ChannelSidebar from '../components/ChannelSidebar.vue'
import MessageList from '../components/MessageList.vue'
import MessageInput from '../components/MessageInput.vue'
import { PhHash, PhLock, PhUsers, PhArrowClockwise } from '@phosphor-icons/vue'

const channelsStore = useChannelsStore()
const messagesStore = useMessagesStore()

const loadingOlder = ref(false)

onMounted(async () => {
  try {
    await channelsStore.loadChannels()
  } catch (err) {
    console.error('Failed to load initial workspace data:', err)
  }
})

// Watch active channel and load its messages
watch(
  () => channelsStore.currentChannelId,
  async (newChanId) => {
    if (newChanId !== null) {
      try {
        await messagesStore.loadMessages(newChanId)
      } catch (err) {
        console.error('Failed to load channel messages:', err)
      }
    }
  },
)

async function handleSendMessage(text: string) {
  if (channelsStore.currentChannelId !== null) {
    try {
      await messagesStore.sendNewMessage(channelsStore.currentChannelId, text)
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }
}

async function handleLoadOlder() {
  if (channelsStore.currentChannelId !== null && !loadingOlder.value) {
    loadingOlder.value = true
    try {
      await messagesStore.loadMessages(channelsStore.currentChannelId, { loadMore: true })
    } catch (err) {
      console.error('Failed to load older messages:', err)
    } finally {
      loadingOlder.value = false
    }
  }
}

async function handleEditMessage(messageId: number, body: string) {
  if (channelsStore.currentChannelId !== null) {
    try {
      await messagesStore.editMessage(channelsStore.currentChannelId, messageId, body)
    } catch (err) {
      console.error('Failed to edit message:', err)
    }
  }
}

async function handleDeleteMessage(messageId: number) {
  if (channelsStore.currentChannelId !== null) {
    try {
      await messagesStore.deleteMessage(channelsStore.currentChannelId, messageId)
    } catch (err) {
      console.error('Failed to delete message:', err)
    }
  }
}

async function handleManualRefetch() {
  if (channelsStore.currentChannelId !== null) {
    try {
      await messagesStore.loadMessages(channelsStore.currentChannelId)
    } catch (err) {
      console.error('Failed to refetch messages:', err)
    }
  }
}
</script>

<template>
  <div class="workspace-layout">
    <!-- Sidebar Panel (260px) -->
    <ChannelSidebar class="layout-sidebar" />

    <!-- Active Channel Panel -->
    <main class="channel-area">
      <!-- Channel Header (56px) -->
      <header v-if="channelsStore.activeChannel" class="channel-header">
        <div class="header-left">
          <component
            :is="channelsStore.activeChannel.type === 'private' ? PhLock : PhHash"
            :size="20"
            class="channel-type-icon"
          />
          <div class="channel-info">
            <h2 class="channel-title">{{ channelsStore.activeChannel.name }}</h2>
            <p v-if="channelsStore.activeChannel.topic" class="channel-topic">
              {{ channelsStore.activeChannel.topic }}
            </p>
          </div>
        </div>

        <div class="header-right">
          <div class="members-badge">
            <PhUsers :size="18" />
            <span class="mono">{{ channelsStore.activeChannel.members_count }}</span>
          </div>

          <button
            class="refetch-btn"
            aria-label="Оновити повідомлення"
            @click="handleManualRefetch"
          >
            <PhArrowClockwise :size="18" />
          </button>
        </div>
      </header>

      <!-- Message List (virtualized) -->
      <MessageList
        v-if="channelsStore.currentChannelId !== null"
        :messages="messagesStore.messages[channelsStore.currentChannelId] || []"
        :loading="messagesStore.loading[channelsStore.currentChannelId] || false"
        @load-older="handleLoadOlder"
        @edit="handleEditMessage"
        @delete="handleDeleteMessage"
      />

      <div v-else class="no-channel-selected">
        <p>Оберіть канал зі списку ліворуч, щоб почати спілкування.</p>
      </div>

      <!-- Message Input -->
      <MessageInput
        v-if="channelsStore.currentChannelId !== null"
        :disabled="messagesStore.loading[channelsStore.currentChannelId] || false"
        @send="handleSendMessage"
      />
    </main>
  </div>
</template>

<style scoped>
.workspace-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.layout-sidebar {
  grid-column: 1;
  height: 100%;
}

.channel-area {
  grid-column: 2;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 480px;
  background-color: var(--bg-app);
}

.channel-header {
  height: 56px;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--bg-app);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.channel-type-icon {
  color: var(--text-secondary);
}

.channel-info {
  display: flex;
  flex-direction: column;
}

.channel-title {
  margin: 0;
  font-size: var(--text-md);
  font-weight: 500;
  color: var(--text-primary);
}

.channel-topic {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.members-badge {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.refetch-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
}

.refetch-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.no-channel-selected {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: var(--text-base);
}

.mono {
  font-family: var(--font-mono);
}
</style>
