<script setup lang="ts">
import type { Reaction } from '../types/Message'
import { PhSmiley } from '@phosphor-icons/vue'

defineProps<{
  reactions: Reaction[]
}>()

const emit = defineEmits<{
  (e: 'toggle', emoji: string): void
  (e: 'add-reaction', event: MouseEvent): void
}>()
</script>

<template>
  <div v-if="reactions.length > 0" class="reaction-bar">
    <button
      v-for="reaction in reactions"
      :key="reaction.emoji"
      :class="['reaction-pill', { 'reacted-by-me': reaction.reacted_by_me }]"
      :title="reaction.users?.join(', ') || ''"
      @click="emit('toggle', reaction.emoji)"
    >
      <span class="emoji">{{ reaction.emoji }}</span>
      <span class="count mono">{{ reaction.count }}</span>
    </button>
    <button class="add-reaction-btn" @click="emit('add-reaction', $event)">
      <PhSmiley :size="16" />
    </button>
  </div>
</template>

<style scoped>
.reaction-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-1);
}

.reaction-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: var(--bg-hover);
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  padding: 2px 8px;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease);
}

.reaction-pill:hover {
  background-color: var(--bg-active);
}

.reaction-pill.reacted-by-me {
  background-color: var(--mention-bg);
  border-color: var(--indigo-600);
}

.reaction-pill.reacted-by-me .count {
  color: var(--indigo-700);
}

.emoji {
  font-size: 14px;
}

.count {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.add-reaction-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: none;
  border: none;
  border-radius: var(--radius-full);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease);
}

.add-reaction-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.mono {
  font-family: var(--font-mono);
}
</style>
