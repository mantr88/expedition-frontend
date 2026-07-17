<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import { searchUsers } from '../api/users'
import { inviteByEmail } from '../api/invitations'
import type { User } from '../types/User'
import { useChannelsStore } from '../stores/channels'
import { PhX, PhCheck, PhPaperPlaneTilt } from '@phosphor-icons/vue'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const channelsStore = useChannelsStore()

const query = ref('')
const results = ref<User[]>([])
const loading = ref(false)
const errorMsg = ref('')
const addedUserIds = ref<Set<number>>(new Set())
const searchInput = ref<HTMLInputElement | null>(null)
const invitedEmail = ref('')

const isValidEmail = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(query.value)
})

let debounceTimeout: ReturnType<typeof setTimeout> | null = null

watch(query, (newVal) => {
  invitedEmail.value = ''
  if (debounceTimeout) clearTimeout(debounceTimeout)
  if (!newVal.trim()) {
    results.value = []
    loading.value = false
    return
  }

  loading.value = true
  errorMsg.value = ''

  debounceTimeout = setTimeout(async () => {
    try {
      const allUsers = await searchUsers(newVal)
      // Filter out existing members
      const existingMembers = new Set(channelsStore.activeChannelMembers.map((m) => m.user.id))
      results.value = allUsers.filter((u) => !existingMembers.has(u.id))
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { message?: string } } }
      if (error.response?.status === 403) {
        errorMsg.value = 'Недостатньо прав'
      } else {
        errorMsg.value = 'Помилка пошуку'
      }
    } finally {
      loading.value = false
    }
  }, 300)
})

async function invite(user: User) {
  if (!channelsStore.currentChannelId || addedUserIds.value.has(user.id)) return

  try {
    errorMsg.value = ''
    await channelsStore.inviteMember(channelsStore.currentChannelId, user.id)
    addedUserIds.value.add(user.id)
  } catch (err: unknown) {
    const error = err as { response?: { status?: number; data?: { message?: string } } }
    if (error.response?.status === 403) {
      errorMsg.value = 'Недостатньо прав для запрошення'
    } else {
      errorMsg.value = 'Помилка при додаванні учасника'
    }
  }
}

async function inviteNewUser() {
  if (!channelsStore.currentChannelId || !isValidEmail.value) return

  loading.value = true
  errorMsg.value = ''

  try {
    await inviteByEmail(query.value, channelsStore.currentChannelId)
    invitedEmail.value = query.value
  } catch (err: unknown) {
    const error = err as { response?: { status?: number; data?: { message?: string } } }
    if (error.response?.status === 422) {
      errorMsg.value = 'Невірний email'
    } else if (error.response?.status === 429) {
      errorMsg.value = 'Забагато запрошень, спробуйте пізніше'
    } else {
      errorMsg.value = 'Помилка при надсиланні запрошення'
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  nextTick(() => {
    searchInput.value?.focus()
  })
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  }
}
</script>

<template>
  <div class="popover" @keydown="onKeydown">
    <div class="popover-header">
      <h4>Додати учасника</h4>
      <button class="close-btn" @click="emit('close')" aria-label="Закрити">
        <PhX :size="16" />
      </button>
    </div>
    <div class="popover-body">
      <div class="search-input-wrapper">
        <input
          ref="searchInput"
          v-model="query"
          type="text"
          placeholder="Введіть ім'я або email..."
          aria-label="Пошук користувачів"
        />
      </div>

      <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

      <div class="results" role="listbox">
        <div v-if="loading" class="status-msg">Пошук...</div>
        <div v-else-if="invitedEmail" class="status-msg success">
          <PhCheck :size="16" /> Запрошення надіслано
        </div>
        <div v-else-if="query && results.length === 0 && !errorMsg">
          <div v-if="isValidEmail" class="invite-action" @click="inviteNewUser">
            <div class="icon-wrapper">
              <PhPaperPlaneTilt :size="20" />
            </div>
            <div class="invite-text">
              Запросити <strong>{{ query }}</strong> у месенджер
            </div>
          </div>
          <div v-else class="status-msg">Нікого не знайдено</div>
        </div>

        <div
          v-for="user in results"
          :key="user.id"
          class="user-item"
          :class="{ added: addedUserIds.has(user.id) }"
          @click="invite(user)"
        >
          <div class="user-avatar-placeholder sm">
            {{ user.name.charAt(0) }}
          </div>
          <div class="user-details">
            <span class="user-name">{{ user.name }}</span>
            <span class="user-email">{{ user.email }}</span>
          </div>
          <div v-if="addedUserIds.has(user.id)" class="added-indicator">
            <PhCheck :size="16" /> Доданий
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.popover {
  position: absolute;
  top: 60px;
  right: 16px;
  width: 320px;
  background-color: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-modal);
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}

.popover-header h4 {
  margin: 0;
  font-size: var(--text-sm);
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
}

.close-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.popover-body {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.search-input-wrapper input {
  width: 100%;
  height: 36px;
  padding: 0 var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background-color: var(--bg-app);
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.search-input-wrapper input:focus {
  outline: none;
  border-color: var(--indigo-600);
}

.error-msg {
  color: var(--danger);
  font-size: var(--text-xs);
}

.status-msg {
  color: var(--text-muted);
  font-size: var(--text-sm);
  text-align: center;
  padding: var(--space-4) 0;
}

.results {
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.user-item:not(.added):hover {
  background-color: var(--bg-hover);
}

.user-item.added {
  cursor: default;
  opacity: 0.7;
}

.user-avatar-placeholder.sm {
  width: 32px;
  height: 32px;
  background-color: var(--indigo-100);
  color: var(--indigo-800);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  text-transform: uppercase;
  font-size: 14px;
}

.user-details {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.user-name {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.added-indicator {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--success);
  font-size: var(--text-xs);
  font-weight: 500;
}

.invite-action {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  margin: var(--space-2);
  border-radius: var(--radius-md);
  background-color: var(--indigo-50);
  color: var(--indigo-700);
  cursor: pointer;
  border: 1px solid var(--indigo-100);
}

[data-theme='dark'] .invite-action {
  background-color: rgba(79, 70, 229, 0.1);
  border-color: rgba(79, 70, 229, 0.2);
  color: var(--indigo-300);
}

.invite-action:hover {
  background-color: var(--indigo-100);
}

[data-theme='dark'] .invite-action:hover {
  background-color: rgba(79, 70, 229, 0.2);
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.invite-text {
  font-size: var(--text-sm);
}

.status-msg.success {
  color: var(--success);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}
</style>
