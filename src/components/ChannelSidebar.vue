<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useChannelsStore } from '../stores/channels'
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'
import { searchUsers } from '../api/users'
import type { User } from '../types/User'
import { PhHash, PhLock, PhPlus, PhSignOut, PhChat, PhMoon, PhSun } from '@phosphor-icons/vue'

const channelsStore = useChannelsStore()
const authStore = useAuthStore()
const uiStore = useUiStore()
const router = useRouter()

const showModal = ref(false)
const newChannelName = ref('')
const newChannelType = ref<'public' | 'private'>('public')
const newChannelTopic = ref('')
const errorMsg = ref('')

async function handleCreateChannel() {
  if (!newChannelName.value.trim()) {
    errorMsg.value = 'Назва каналу обов’язкова'
    return
  }
  try {
    errorMsg.value = ''
    await channelsStore.createChannel({
      name: newChannelName.value.trim(),
      type: newChannelType.value,
      topic: newChannelTopic.value.trim() || undefined,
    })
    // Reset form and close
    newChannelName.value = ''
    newChannelType.value = 'public'
    newChannelTopic.value = ''
    showModal.value = false
  } catch (err: unknown) {
    const error = err as { response?: { data?: { message?: string } } }
    errorMsg.value = error.response?.data?.message || 'Не вдалося створити канал'
  }
}

function handleSelectChannel(channelId: number) {
  channelsStore.selectChannel(channelId)
  uiStore.sidebarOpen = false
}

async function handleLogout() {
  await authStore.logout()
  await router.push({ name: 'login' })
}

// DM Search state
const showDmModal = ref(false)
const dmSearchQuery = ref('')
const dmSearchResults = ref<User[]>([])
const isSearching = ref(false)

async function handleSearchUsers() {
  if (!dmSearchQuery.value.trim()) {
    dmSearchResults.value = []
    return
  }
  isSearching.value = true
  try {
    dmSearchResults.value = await searchUsers(dmSearchQuery.value)
  } catch (err) {
    console.error('Search failed:', err)
  } finally {
    isSearching.value = false
  }
}

async function startDirectMessage(userId: number) {
  try {
    await channelsStore.openDirectMessage(userId)
    showDmModal.value = false
    dmSearchQuery.value = ''
    dmSearchResults.value = []
    uiStore.sidebarOpen = false
  } catch (err) {
    console.error('Failed to start DM', err)
  }
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <span class="workspace-title">Expedition Workspace</span>
      <button
        class="theme-btn"
        :aria-label="uiStore.theme === 'dark' ? 'Світла тема' : 'Темна тема'"
        @click="uiStore.toggleTheme()"
      >
        <component :is="uiStore.theme === 'dark' ? PhSun : PhMoon" :size="16" />
      </button>
    </div>

    <div class="sidebar-section">
      <div class="section-header">
        <span class="section-title">Канали</span>
        <button class="add-btn" aria-label="Створити канал" @click="showModal = true">
          <PhPlus :size="16" />
        </button>
      </div>

      <div v-if="channelsStore.error" class="sidebar-error">
        <p>{{ channelsStore.error }}</p>
        <button class="retry-btn" @click="channelsStore.loadChannels()">Повторити</button>
      </div>

      <div class="channel-list">
        <button
          v-for="channel in channelsStore.publicChannels"
          :key="channel.id"
          type="button"
          :class="[
            'channel-item',
            {
              active: channel.id === channelsStore.currentChannelId,
              unread: channel.unread_count && channel.unread_count > 0,
            },
          ]"
          @click="handleSelectChannel(channel.id)"
        >
          <component
            :is="channel.type === 'private' ? PhLock : PhHash"
            :size="16"
            class="channel-icon"
          />
          <span class="channel-name">{{ channel.name }}</span>

          <button
            v-if="!channel.my_membership"
            class="join-btn"
            @click.stop="channelsStore.joinChannel(channel.id)"
          >
            Приєднатися
          </button>

          <span
            v-else-if="channel.unread_count && channel.unread_count > 0"
            class="unread-badge"
            :aria-label="`${channel.unread_count} непрочитаних`"
          >
            {{ channel.unread_count }}
          </span>
        </button>
      </div>
    </div>

    <div class="sidebar-section">
      <div class="section-header">
        <span class="section-title">Особисті повідомлення</span>
        <button class="add-btn" aria-label="Почати бесіду" @click="showDmModal = true">
          <PhPlus :size="16" />
        </button>
      </div>

      <div class="channel-list">
        <button
          v-for="channel in channelsStore.directMessages"
          :key="channel.id"
          type="button"
          :class="[
            'channel-item',
            {
              active: channel.id === channelsStore.currentChannelId,
              unread: channel.unread_count && channel.unread_count > 0,
            },
          ]"
          @click="handleSelectChannel(channel.id)"
        >
          <PhChat :size="16" class="channel-icon" />
          <span class="channel-name">{{ channel.name }}</span>
          <span
            v-if="channel.unread_count && channel.unread_count > 0"
            class="unread-badge"
            :aria-label="`${channel.unread_count} непрочитаних`"
          >
            {{ channel.unread_count }}
          </span>
        </button>
      </div>
    </div>

    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar-placeholder">
          {{ authStore.user?.name.charAt(0) }}
          <span class="presence-indicator online"></span>
        </div>
        <div class="user-details">
          <div class="user-name">{{ authStore.user?.name }}</div>
          <div class="user-email">{{ authStore.user?.email }}</div>
        </div>
      </div>
      <button class="logout-btn" aria-label="Вийти" @click="handleLogout">
        <PhSignOut :size="20" />
      </button>
    </div>

    <!-- Create Channel Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content">
        <h3 class="modal-title">Створити канал</h3>
        <form @submit.prevent="handleCreateChannel">
          <div class="form-group">
            <label for="chan-name">Назва каналу</label>
            <input
              id="chan-name"
              v-model="newChannelName"
              type="text"
              placeholder="наприклад: маркетинг"
              required
            />
          </div>

          <div class="form-group">
            <label for="chan-type">Тип каналу</label>
            <select id="chan-type" v-model="newChannelType">
              <option value="public">Публічний</option>
              <option value="private">Приватний</option>
            </select>
          </div>

          <div class="form-group">
            <label for="chan-topic">Тема каналу (опціонально)</label>
            <input
              id="chan-topic"
              v-model="newChannelTopic"
              type="text"
              placeholder="Про що цей канал"
            />
          </div>

          <div v-if="errorMsg" class="error-text">{{ errorMsg }}</div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="showModal = false">
              Скасувати
            </button>
            <button type="submit" class="btn btn-primary">Створити</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Start DM Modal -->
    <div v-if="showDmModal" class="modal-overlay" @click.self="showDmModal = false">
      <div class="modal-content">
        <h3 class="modal-title">Нове повідомлення</h3>
        <div class="form-group">
          <label for="dm-search">Знайти колегу</label>
          <input
            id="dm-search"
            v-model="dmSearchQuery"
            type="text"
            placeholder="Введіть ім'я..."
            @input="handleSearchUsers"
          />
        </div>

        <div class="dm-results">
          <div v-if="isSearching" class="search-status">Шукаємо...</div>
          <div v-else-if="dmSearchResults.length === 0 && dmSearchQuery" class="search-status">
            Нікого не знайдено
          </div>
          <div
            v-for="user in dmSearchResults"
            :key="user.id"
            class="dm-user-item"
            @click="startDirectMessage(user.id)"
          >
            <div class="user-avatar-placeholder sm">
              {{ user.name.charAt(0) }}
            </div>
            <div class="user-name">{{ user.name }}</div>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="showDmModal = false">
            Скасувати
          </button>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-subtle);
  height: 100%;
}

.sidebar-header {
  height: 56px;
  padding: 0 var(--space-4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-subtle);
}

.theme-btn {
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

.theme-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.workspace-title {
  font-weight: 500;
  font-size: 16px;
  color: var(--text-primary);
}

.sidebar-section {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4) var(--space-2);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--space-2) var(--space-2) var(--space-2);
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.add-btn {
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

.add-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.channel-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.channel-item {
  width: 100%;
  background: none;
  border: none;
  font: inherit;
  text-align: left;
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 var(--space-3);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  position: relative;
  border-radius: var(--radius-sm);
  transition:
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.channel-item:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.channel-item.active {
  background-color: var(--bg-active);
  color: var(--text-primary);
}

.channel-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background-color: var(--rail-active);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.channel-icon {
  margin-right: var(--space-2);
  flex-shrink: 0;
}

.channel-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.join-btn {
  background-color: var(--indigo-100);
  color: var(--indigo-700);
  border: none;
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  text-transform: uppercase;
  margin-left: auto;
  transition: background-color var(--dur-fast) var(--ease);
}

.join-btn:hover {
  background-color: var(--indigo-200);
}

.sidebar-footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--bg-sidebar);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.user-avatar-placeholder {
  width: 36px;
  height: 36px;
  background-color: var(--indigo-600);
  color: var(--text-onbrand);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  position: relative;
  text-transform: uppercase;
}

.presence-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  border: 2px solid var(--bg-sidebar);
}

.presence-indicator.online {
  background-color: var(--success);
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.user-email {
  font-size: 11px;
  color: var(--text-muted);
}

.logout-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-btn:hover {
  background-color: var(--bg-hover);
  color: var(--danger);
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(20, 24, 31, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background-color: var(--bg-elevated);
  box-shadow: var(--shadow-modal);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  width: min(480px, 92vw);
}

.modal-title {
  margin-top: 0;
  margin-bottom: var(--space-4);
  font-size: 18px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-group {
  margin-bottom: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.form-group label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-group input,
.form-group select {
  height: 36px;
  padding: 0 var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background-color: var(--bg-app);
  color: var(--text-primary);
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--indigo-600);
}

.error-text {
  color: var(--danger);
  font-size: 12px;
  margin-bottom: var(--space-4);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-6);
}

.btn {
  height: 36px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.btn-secondary {
  background-color: var(--bg-app);
  color: var(--text-primary);
  border: 1px solid var(--border-strong);
}

.btn-secondary:hover {
  background-color: var(--bg-hover);
}

.btn-primary {
  background-color: var(--indigo-600);
  color: var(--text-onbrand);
}

.btn-primary:hover {
  background-color: var(--indigo-700);
}

.unread-badge {
  margin-left: auto;
  background-color: var(--indigo-600);
  color: var(--text-onbrand);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  height: 18px;
  min-width: 18px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.channel-item.unread .channel-name {
  font-weight: 500;
  color: var(--text-primary);
}

.sidebar-error {
  padding: var(--space-2) var(--space-3);
  font-size: 13px;
  color: var(--danger);
}

.retry-btn {
  background: none;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  color: var(--text-primary);
  margin-top: var(--space-1);
}

.retry-btn:hover {
  background-color: var(--bg-hover);
}

.dm-results {
  max-height: 200px;
  overflow-y: auto;
  margin-top: var(--space-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-app);
}

.search-status {
  padding: var(--space-3);
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
}

.dm-user-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
}

.dm-user-item:hover {
  background-color: var(--bg-hover);
}

.user-avatar-placeholder.sm {
  width: 24px;
  height: 24px;
  font-size: 12px;
  border-radius: var(--radius-md);
}
</style>
