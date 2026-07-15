<script setup lang="ts">
import { computed } from 'vue'
import { useChannelsStore } from '../stores/channels'
import { usePresenceStore } from '../stores/presence'
import { PhX } from '@phosphor-icons/vue'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const channelsStore = useChannelsStore()
const presenceStore = usePresenceStore()

const sortedMembers = computed(() => {
  const list = [...channelsStore.activeChannelMembers]
  return list.sort((a, b) => {
    const aOnline = presenceStore.isUserOnline(a.user.id)
    const bOnline = presenceStore.isUserOnline(b.user.id)

    if (aOnline && !bOnline) return -1
    if (!aOnline && bOnline) return 1

    // If both have the same online status, sort active first, then away
    if (aOnline && bOnline) {
      const aAway = a.user.status === 'away'
      const bAway = b.user.status === 'away'
      if (!aAway && bAway) return -1
      if (aAway && !bAway) return 1
    }

    return a.user.name.localeCompare(b.user.name)
  })
})

function getPresenceClass(userId: number, baseStatus: string) {
  const isOnline = presenceStore.isUserOnline(userId)
  if (!isOnline) return 'offline'
  return baseStatus === 'away' ? 'away' : 'online'
}

function getPresenceLabel(userId: number, baseStatus: string) {
  const isOnline = presenceStore.isUserOnline(userId)
  if (!isOnline) return 'офлайн'
  return baseStatus === 'away' ? 'немає на місці' : 'у мережі'
}
</script>

<template>
  <div class="member-list-panel">
    <header class="panel-header">
      <h3 class="panel-title">Учасники каналу ({{ channelsStore.activeChannelMembers.length }})</h3>
      <button class="close-btn" aria-label="Закрити панель учасників" @click="emit('close')">
        <PhX :size="20" />
      </button>
    </header>

    <div class="panel-content">
      <div v-if="sortedMembers.length === 0" class="empty-state">
        Немає учасників у цьому каналі
      </div>
      <div v-else class="member-items">
        <div v-for="member in sortedMembers" :key="member.user.id" class="member-item">
          <div class="member-avatar">
            {{ member.user.name.charAt(0) }}
            <span
              :class="['presence-indicator', getPresenceClass(member.user.id, member.user.status)]"
              :title="getPresenceLabel(member.user.id, member.user.status)"
            ></span>
          </div>

          <div class="member-info">
            <span class="member-name">{{ member.user.name }}</span>
            <span v-if="member.role === 'owner'" class="member-role owner">власник</span>
            <span v-else-if="member.role === 'admin'" class="member-role admin">адмін</span>
            <span class="member-email">{{ member.user.email }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.member-list-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-app);
  border-left: 1px solid var(--border-subtle);
  width: 320px;
  flex-shrink: 0;
}

.panel-header {
  height: 56px;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 var(--space-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.panel-title {
  margin: 0;
  font-size: var(--text-md);
  font-weight: 500;
  color: var(--text-primary);
}

.close-btn {
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

.close-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}

.empty-state {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  text-align: center;
  padding: var(--space-8) 0;
}

.member-items {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.member-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  transition: background-color var(--dur-fast) var(--ease);
}

.member-item:hover {
  background-color: var(--bg-hover);
}

.member-avatar {
  width: 36px;
  height: 36px;
  background-color: var(--indigo-100);
  color: var(--indigo-800);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  text-transform: uppercase;
  position: relative;
  flex-shrink: 0;
}

.presence-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  border: 2px solid var(--bg-app);
}

.presence-indicator.online {
  background-color: var(--success);
}

.presence-indicator.away {
  background-color: var(--warning);
}

.presence-indicator.offline {
  background-color: var(--text-muted);
}

.member-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.member-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.member-role {
  font-size: 10px;
  font-family: var(--font-mono);
  padding: 0px var(--space-1);
  border-radius: var(--radius-sm);
  width: fit-content;
  text-transform: uppercase;
  font-weight: 500;
}

.member-role.owner {
  background-color: var(--indigo-50);
  color: var(--indigo-700);
  border: 1px solid var(--indigo-200);
}

.member-role.admin {
  background-color: var(--gray-100);
  color: var(--text-secondary);
  border: 1px solid var(--border-strong);
}

.member-email {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 900px) {
  .member-list-panel {
    position: fixed;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 650;
    width: min(360px, 100vw);
    box-shadow: var(--shadow-modal);
  }
}
</style>
