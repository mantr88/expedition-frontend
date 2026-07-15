<script setup lang="ts">
import { onMounted, watch, ref, computed } from 'vue'
import { useChannelsStore } from '../stores/channels'
import { useMessagesStore } from '../stores/messages'
import { usePresenceStore } from '../stores/presence'
import { useNotificationsStore } from '../stores/notifications'
import { useUiStore } from '../stores/ui'
import { useEcho } from '../composables/useEcho'
import { useTyping } from '../composables/useTyping'
import ChannelSidebar from '../components/ChannelSidebar.vue'
import MessageList from '../components/MessageList.vue'
import MessageInput from '../components/MessageInput.vue'
import MemberList from '../components/MemberList.vue'
import ThreadPanel from '../components/ThreadPanel.vue'
import SearchModal from '../components/SearchModal.vue'
import ChannelNotificationsMenu from '../components/ChannelNotificationsMenu.vue'
import {
  PhHash,
  PhLock,
  PhUsers,
  PhArrowClockwise,
  PhMagnifyingGlass,
  PhList,
} from '@phosphor-icons/vue'

const channelsStore = useChannelsStore()
const messagesStore = useMessagesStore()
const presenceStore = usePresenceStore()
const notificationsStore = useNotificationsStore()
const uiStore = useUiStore()

// Initialize Laravel Echo / Reverb integration
useEcho()

const { sendTypingWhisper } = useTyping()

const loadingOlder = ref(false)
const showMembers = ref(false)
const showSearch = ref(false)

onMounted(async () => {
  try {
    notificationsStore.init()
    notificationsStore.requestPermission()
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
        const msgs = messagesStore.messages[newChanId]
        if (msgs && msgs.length > 0) {
          const maxId = Math.max(...msgs.map((m) => m.id))
          channelsStore.markAsRead(newChanId, maxId)
        }
      } catch (err) {
        console.error('Failed to load channel messages:', err)
      }
    }
  },
)

async function handleSendMessage(text: string, files: File[] = []) {
  if (channelsStore.currentChannelId !== null) {
    try {
      await messagesStore.sendNewMessage(channelsStore.currentChannelId, text, null, files)
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

function handleUserTyping() {
  if (channelsStore.currentChannelId !== null) {
    sendTypingWhisper(channelsStore.currentChannelId)
  }
}

const typingUsers = computed(() => {
  if (channelsStore.currentChannelId === null) return []
  return presenceStore.getTypingUsersInChannel(channelsStore.currentChannelId)
})

const typingText = computed(() => {
  const users = typingUsers.value
  if (users.length === 0) return ''
  if (users.length === 1) return `${users[0].name} пише...`
  if (users.length === 2) return `${users[0].name} та ${users[1].name} пишуть...`
  return 'Кілька людей пишуть...'
})
</script>

<template>
  <div class="workspace-layout">
    <!-- Sidebar Panel (260px) -->
    <ChannelSidebar :class="['layout-sidebar', { 'sidebar-open': uiStore.sidebarOpen }]" />

    <!-- Backdrop for slide-in sidebar on narrow screens -->
    <div
      v-if="uiStore.sidebarOpen"
      class="sidebar-backdrop"
      @click="uiStore.sidebarOpen = false"
    ></div>

    <!-- Active Channel Panel -->
    <main class="channel-area">
      <!-- Channel Header (56px) -->
      <header v-if="channelsStore.activeChannel" class="channel-header">
        <div class="header-left">
          <button
            class="sidebar-toggle"
            aria-label="Показати канали"
            @click="uiStore.sidebarOpen = true"
          >
            <PhList :size="20" />
          </button>
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
          <ChannelNotificationsMenu />

          <button
            class="refetch-btn"
            aria-label="Пошук повідомлень (Ctrl+K)"
            @click="showSearch = true"
          >
            <PhMagnifyingGlass :size="18" />
          </button>

          <button
            :class="['members-badge', { active: showMembers }]"
            aria-label="Показати учасників"
            @click="showMembers = !showMembers"
          >
            <PhUsers :size="18" />
            <span class="mono">{{ channelsStore.activeChannel.members_count }}</span>
          </button>

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

      <!-- Typing indicator bar -->
      <div v-if="channelsStore.currentChannelId !== null" class="typing-status-bar">
        <span v-if="typingText" class="typing-text">{{ typingText }}</span>
      </div>

      <!-- Message Input -->
      <MessageInput
        v-if="channelsStore.currentChannelId !== null"
        :disabled="messagesStore.loading[channelsStore.currentChannelId] || false"
        @send="handleSendMessage"
        @typing="handleUserTyping"
      />
    </main>

    <!-- Collapsible Member List Panel -->
    <MemberList
      v-if="showMembers && channelsStore.currentChannelId !== null"
      @close="showMembers = false"
    />

    <!-- Thread Panel -->
    <ThreadPanel v-if="messagesStore.activeThreadMessage" />

    <!-- Search Modal -->
    <SearchModal :open="showSearch" @close="showSearch = false" />
  </div>
</template>

<style scoped>
.workspace-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.layout-sidebar {
  width: 260px;
  flex-shrink: 0;
  height: 100%;
}

.channel-area {
  flex: 1;
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
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-xs);
  color: var(--text-secondary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  transition:
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.members-badge:hover,
.members-badge.active {
  background-color: var(--bg-hover);
  color: var(--text-primary);
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
  transition:
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
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

.typing-status-bar {
  height: 20px;
  padding: 0 var(--space-4);
  margin-bottom: var(--space-1);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.typing-text {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  font-style: italic;
  animation: pulse 1.5s infinite ease-in-out;
}

.mono {
  font-family: var(--font-mono);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

.sidebar-toggle {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: var(--space-1);
  border-radius: var(--radius-sm);
}

.sidebar-backdrop {
  display: none;
}

@media (max-width: 900px) {
  .sidebar-toggle {
    display: flex;
  }

  .layout-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 700;
    transform: translateX(-100%);
    transition: transform var(--dur-base) var(--ease);
  }

  .layout-sidebar.sidebar-open {
    transform: translateX(0);
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background-color: rgba(20, 24, 31, 0.4);
    z-index: 600;
  }

  .channel-area {
    min-width: 0;
  }
}
</style>
