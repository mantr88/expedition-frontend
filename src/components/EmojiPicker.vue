<script setup lang="ts">
const EMOJIS = ['👍', '👎', '😄', '🎉', '😕', '❤️', '🚀', '👀']

const emit = defineEmits<{
  (e: 'select', emoji: string): void
}>()
</script>

<template>
  <div class="emoji-picker">
    <button v-for="emoji in EMOJIS" :key="emoji" class="emoji-btn" @click="emit('select', emoji)">
      {{ emoji }}
    </button>
  </div>
</template>

<style scoped>
.emoji-picker {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-1);
  padding: var(--space-2);
  background-color: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-popover);
}

.emoji-btn {
  background: none;
  border: none;
  font-size: 20px;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--dur-fast) var(--ease);
}

.emoji-btn:hover {
  background-color: var(--bg-hover);
}
</style>
