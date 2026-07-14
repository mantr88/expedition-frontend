<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { searchMessages, type SearchResult } from '../api/search'
import { getRetryAfterSeconds } from '../api/client'
import { useMessagesStore } from '../stores/messages'
import { useToastsStore } from '../stores/toasts'
import { PhMagnifyingGlass, PhHash, PhChat } from '@phosphor-icons/vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const messagesStore = useMessagesStore()

const query = ref('')
const results = ref<SearchResult[]>([])
const loading = ref(false)
const searched = ref(false)
const cooldownUntil = ref(0)
const cooldownText = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.open,
  (open) => {
    if (open) {
      query.value = ''
      results.value = []
      searched.value = false
      setTimeout(() => inputRef.value?.focus(), 50)
    }
  },
)

watch(query, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(runSearch, 300)
})

async function runSearch() {
  const q = query.value.trim()
  if (q.length < 2) {
    results.value = []
    searched.value = false
    return
  }
  if (Date.now() < cooldownUntil.value) return

  loading.value = true
  try {
    const response = await searchMessages(q)
    results.value = response.data
    searched.value = true
    cooldownText.value = ''
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } }).response?.status
    if (status === 429) {
      const seconds = getRetryAfterSeconds(err)
      cooldownUntil.value = Date.now() + seconds * 1000
      cooldownText.value = `Забагато запитів пошуку. Повторіть через ${seconds} с.`
    } else {
      useToastsStore().push('error', 'Пошук не виконано. Перевірте зʼєднання і спробуйте ще раз.')
    }
  } finally {
    loading.value = false
  }
}

async function openResult(result: SearchResult) {
  emit('close')
  try {
    await messagesStore.jumpToMessage(result.channel.id, result.id)
  } catch {
    useToastsStore().push('error', 'Не вдалося відкрити повідомлення. Спробуйте ще раз.')
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  if (props.open) inputRef.value?.focus()
})

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="search-overlay" @click.self="emit('close')" @keydown="onKeydown">
      <div class="search-modal" role="dialog" aria-modal="true" aria-label="Пошук повідомлень">
        <div class="search-input-row">
          <PhMagnifyingGlass :size="18" class="search-icon" />
          <input
            ref="inputRef"
            v-model="query"
            class="search-input"
            type="text"
            placeholder="Пошук повідомлень…"
            aria-label="Пошуковий запит"
          />
        </div>

        <p v-if="cooldownText" class="search-cooldown">{{ cooldownText }}</p>

        <div class="search-results">
          <div v-if="loading" class="search-status">Шукаємо…</div>
          <div v-else-if="searched && results.length === 0" class="search-status">
            Нічого не знайдено. Спробуйте інший запит.
          </div>
          <button
            v-for="result in results"
            :key="result.id"
            class="search-result"
            @click="openResult(result)"
          >
            <span class="result-channel">
              <component :is="result.channel.type === 'dm' ? PhChat : PhHash" :size="14" />
              {{ result.channel.name }}
            </span>
            <span class="result-author">{{ result.user.name }}</span>
            <span class="result-body">{{ result.body_raw }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(20, 24, 31, 0.4);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 12vh;
  z-index: 900;
}

.search-modal {
  width: min(560px, 92vw);
  background-color: var(--bg-elevated);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-modal);
  display: flex;
  flex-direction: column;
  max-height: 60vh;
}

.search-input-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}

.search-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 15px;
}

.search-cooldown {
  margin: 0;
  padding: var(--space-2) var(--space-4);
  color: var(--danger);
  font-size: 13px;
}

.search-results {
  overflow-y: auto;
  padding: var(--space-2);
}

.search-status {
  padding: var(--space-4);
  color: var(--text-secondary);
  text-align: center;
  font-size: 14px;
}

.search-result {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
}

.search-result:hover {
  background-color: var(--bg-hover);
}

.result-channel {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
}

.result-author {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.result-body {
  font-size: 14px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
</style>
