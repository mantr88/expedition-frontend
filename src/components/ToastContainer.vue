<script setup lang="ts">
import { useToastsStore } from '../stores/toasts'
import { PhX } from '@phosphor-icons/vue'

const toastsStore = useToastsStore()
</script>

<template>
  <div class="toast-container" aria-live="polite">
    <div
      v-for="toast in toastsStore.toasts"
      :key="toast.id"
      :class="['toast', `toast-${toast.kind}`]"
      role="status"
    >
      <span class="toast-text">{{ toast.text }}</span>
      <button class="toast-close" aria-label="Закрити" @click="toastsStore.dismiss(toast.id)">
        <PhX :size="14" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: var(--space-4);
  right: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  z-index: 1000;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background-color: var(--bg-elevated);
  box-shadow: var(--shadow-popover);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  max-width: 360px;
  font-size: 14px;
  color: var(--text-primary);
  border-left: 3px solid transparent;
}

.toast-error {
  border-left-color: var(--danger);
}

.toast-success {
  border-left-color: var(--success);
}

.toast-info {
  border-left-color: var(--info);
}

.toast-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
}

.toast-close:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}
</style>
