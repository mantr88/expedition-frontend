<script setup lang="ts">
import { ref } from 'vue'
import { PhPaperPlaneTilt, PhPaperclip, PhSmiley, PhAt } from '@phosphor-icons/vue'

const props = defineProps<{
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'send', text: string): void
}>()

const text = ref('')

function handleKeyDown(e: KeyboardEvent) {
  // Enter sends message, Shift+Enter inserts newline
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

function submit() {
  const content = text.value.trim()
  if (!content || props.disabled) return

  emit('send', content)
  text.value = ''
}
</script>

<template>
  <div class="message-input-container">
    <div class="input-wrapper">
      <textarea
        v-model="text"
        rows="2"
        :placeholder="placeholder || 'Напишіть повідомлення...'"
        :disabled="disabled"
        class="message-textarea"
        @keydown="handleKeyDown"
      ></textarea>

      <div class="toolbar">
        <div class="toolbar-left">
          <button class="tool-btn" type="button" aria-label="Додати файли" :disabled="disabled">
            <PhPaperclip :size="20" />
          </button>
          <button class="tool-btn" type="button" aria-label="Додати емодзі" :disabled="disabled">
            <PhSmiley :size="20" />
          </button>
          <button class="tool-btn" type="button" aria-label="Згадати когось" :disabled="disabled">
            <PhAt :size="20" />
          </button>
        </div>

        <button
          class="send-btn"
          type="button"
          aria-label="Надіслати"
          :disabled="!text.trim() || disabled"
          @click="submit"
        >
          <PhPaperPlaneTilt :size="20" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-input-container {
  padding: 0 var(--space-4) var(--space-4) var(--space-4);
  background-color: var(--bg-app);
}

.input-wrapper {
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  background-color: var(--bg-app);
  overflow: hidden;
  transition: border-color var(--dur-fast) var(--ease);
}

.input-wrapper:focus-within {
  border-color: var(--indigo-600);
}

.message-textarea {
  border: none;
  background: none;
  color: var(--text-primary);
  padding: var(--space-3);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: 1.45;
  resize: none;
  min-height: 56px;
  width: 100%;
}

.message-textarea:focus {
  outline: none;
}

.message-textarea:disabled {
  color: var(--text-muted);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background-color: var(--bg-app);
  border-top: 1px solid var(--border-subtle);
}

.toolbar-left {
  display: flex;
  gap: var(--space-1);
}

.tool-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.tool-btn:hover:not(:disabled) {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn {
  background-color: var(--indigo-600);
  color: var(--text-onbrand);
  border: none;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--dur-fast) var(--ease);
}

.send-btn:hover:not(:disabled) {
  background-color: var(--indigo-700);
}

.send-btn:disabled {
  background-color: var(--bg-hover);
  color: var(--text-muted);
  cursor: not-allowed;
}
</style>
