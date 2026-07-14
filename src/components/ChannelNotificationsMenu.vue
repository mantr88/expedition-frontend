<script setup lang="ts">
import { ref } from 'vue'
import { useChannelsStore } from '../stores/channels'
import { useToastsStore } from '../stores/toasts'
import type { NotificationsLevel } from '../types/Channel'
import { PhBell, PhBellSlash, PhAt, PhCheck } from '@phosphor-icons/vue'

const channelsStore = useChannelsStore()
const toastsStore = useToastsStore()
const open = ref(false)

const options: { value: NotificationsLevel; label: string }[] = [
  { value: 'all', label: 'Усі повідомлення' },
  { value: 'mentions', label: 'Лише згадки' },
  { value: 'mute', label: 'Без сповіщень' },
]

async function select(level: NotificationsLevel) {
  open.value = false
  const channelId = channelsStore.currentChannelId
  if (channelId === null) return
  try {
    await channelsStore.setNotificationsLevel(channelId, level)
  } catch {
    toastsStore.push('error', 'Не вдалося зберегти налаштування сповіщень. Спробуйте ще раз.')
  }
}
</script>

<template>
  <div class="notif-menu">
    <button
      class="notif-btn"
      :aria-label="`Сповіщення: ${options.find((o) => o.value === channelsStore.activeChannel?.my_membership?.notifications_level)?.label ?? 'Усі повідомлення'}`"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="open = !open"
    >
      <component
        :is="
          channelsStore.activeChannel?.my_membership?.notifications_level === 'mute'
            ? PhBellSlash
            : PhBell
        "
        :size="18"
      />
    </button>

    <div v-if="open" class="notif-popover" role="menu">
      <button
        v-for="option in options"
        :key="option.value"
        class="notif-option"
        role="menuitemradio"
        :aria-checked="
          channelsStore.activeChannel?.my_membership?.notifications_level === option.value
        "
        @click="select(option.value)"
      >
        <component
          :is="option.value === 'mute' ? PhBellSlash : option.value === 'mentions' ? PhAt : PhBell"
          :size="16"
        />
        <span class="option-label">{{ option.label }}</span>
        <PhCheck
          v-if="channelsStore.activeChannel?.my_membership?.notifications_level === option.value"
          :size="14"
          class="option-check"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.notif-menu {
  position: relative;
}

.notif-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  transition:
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.notif-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.notif-popover {
  position: absolute;
  top: calc(100% + var(--space-1));
  right: 0;
  background-color: var(--bg-elevated);
  box-shadow: var(--shadow-popover);
  border-radius: var(--radius-md);
  padding: var(--space-1);
  min-width: 200px;
  z-index: 500;
}

.notif-option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  height: 32px;
  padding: 0 var(--space-2);
  background: none;
  border: none;
  cursor: pointer;
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 14px;
  text-align: left;
}

.notif-option:hover {
  background-color: var(--bg-hover);
}

.option-label {
  flex: 1;
}

.option-check {
  color: var(--rail-active);
}
</style>
