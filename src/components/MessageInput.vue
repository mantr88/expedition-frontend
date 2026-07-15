<script setup lang="ts">
import { ref } from 'vue'
import { PhPaperPlaneTilt, PhPaperclip, PhSmiley, PhAt, PhFile, PhX } from '@phosphor-icons/vue'
import { useMentions } from '../composables/useMentions'
import type { User } from '../types/User'

const props = defineProps<{
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'send', text: string, files: File[]): void
  (e: 'typing'): void
}>()

const text = ref('')
const files = ref<File[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const ALLOWED_EXTENSIONS = [
  'jpeg',
  'jpg',
  'png',
  'gif',
  'webp',
  'pdf',
  'txt',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'zip',
]
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

const {
  isMentioning,
  mentionSuggestions,
  selectedMentionIndex,
  handleInput: processMentionsInput,
  navigateMentions,
  insertMention,
} = useMentions()

function addFiles(newFiles: FileList | File[]) {
  for (let i = 0; i < newFiles.length; i++) {
    const file = newFiles[i]
    if (file.size > MAX_FILE_SIZE) {
      alert(`Файл ${file.name} занадто великий (макс 5MB).`)
      continue
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      alert(`Формат файлу ${file.name} не підтримується.`)
      continue
    }
    files.value.push(file)
  }
}

function removeFile(index: number) {
  files.value.splice(index, 1)
}

function onFileInputChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files) {
    addFiles(target.files)
  }
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function onDrop(e: DragEvent) {
  if (props.disabled) return
  if (e.dataTransfer?.files) {
    addFiles(e.dataTransfer.files)
  }
}

function onPaste(e: ClipboardEvent) {
  if (props.disabled) return
  if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
    addFiles(e.clipboardData.files)
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (isMentioning.value && mentionSuggestions.value.length > 0) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      navigateMentions(-1)
      return
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      navigateMentions(1)
      return
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      selectMention(mentionSuggestions.value[selectedMentionIndex.value])
      return
    } else if (e.key === 'Escape') {
      isMentioning.value = false
      e.stopPropagation()
      return
    }
  }

  // Enter sends message, Shift+Enter inserts newline
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

function onTextareaInput() {
  emit('typing')
  if (textareaRef.value) {
    processMentionsInput(text.value, textareaRef.value.selectionStart)
  }
}

function selectMention(user: User) {
  text.value = insertMention(text.value, user)
  if (textareaRef.value) {
    textareaRef.value.focus()
  }
}

function submit() {
  const content = text.value.trim()
  if ((!content && files.value.length === 0) || props.disabled) return

  emit('send', content, [...files.value])
  text.value = ''
  files.value = []
  isMentioning.value = false
}

function openFileDialog() {
  fileInputRef.value?.click()
}

function isImage(file: File) {
  return file.type.startsWith('image/')
}

function getObjectURL(file: File) {
  return URL.createObjectURL(file)
}
</script>

<template>
  <div class="message-input-container">
    <div class="input-wrapper" @drop.prevent="onDrop" @dragover.prevent>
      <!-- Mentions Popup -->
      <div v-if="isMentioning && mentionSuggestions.length > 0" class="mentions-popup">
        <div
          v-for="(user, idx) in mentionSuggestions"
          :key="user.id"
          :class="['mention-item', { active: idx === selectedMentionIndex }]"
          @click="selectMention(user)"
        >
          <div class="user-avatar-placeholder sm">{{ user.name.charAt(0) }}</div>
          <span class="mention-name">{{ user.name }}</span>
        </div>
      </div>

      <input
        type="file"
        ref="fileInputRef"
        multiple
        style="display: none"
        @change="onFileInputChange"
      />

      <div v-if="files.length > 0" class="file-previews">
        <div v-for="(file, index) in files" :key="index" class="file-preview-item">
          <div v-if="isImage(file)" class="image-preview">
            <img :src="getObjectURL(file)" :alt="file.name" />
          </div>
          <div v-else class="generic-preview">
            <PhFile :size="24" />
            <span class="file-name-sm">{{ file.name }}</span>
          </div>
          <button class="remove-file-btn" @click.stop="removeFile(index)">
            <PhX :size="12" />
          </button>
        </div>
      </div>

      <textarea
        ref="textareaRef"
        v-model="text"
        rows="2"
        :placeholder="placeholder || 'Напишіть повідомлення...'"
        :disabled="disabled"
        class="message-textarea"
        @keydown="handleKeyDown"
        @input="onTextareaInput"
        @click="onTextareaInput"
        @keyup="onTextareaInput"
        @paste="onPaste"
      ></textarea>

      <div class="toolbar">
        <div class="toolbar-left">
          <button
            class="tool-btn"
            type="button"
            aria-label="Додати файли"
            :disabled="disabled"
            @click="openFileDialog"
          >
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
          :disabled="(!text.trim() && files.length === 0) || disabled"
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
  position: relative;
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

.file-previews {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-3) 0 var(--space-3);
  overflow-x: auto;
}

.file-preview-item {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background-color: var(--bg-hover);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius-md);
}

.generic-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px;
  color: var(--text-secondary);
}

.file-name-sm {
  font-size: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 50px;
}

.remove-file-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  background-color: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--shadow-popover);
}

.remove-file-btn:hover {
  background-color: var(--danger);
  color: var(--text-onbrand);
  border-color: var(--danger);
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

.mentions-popup {
  position: absolute;
  bottom: calc(100% + var(--space-2));
  left: 0;
  background-color: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-popover);
  max-height: 200px;
  overflow-y: auto;
  z-index: 50;
  min-width: 200px;
}

.mention-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
}

.mention-item:hover,
.mention-item.active {
  background-color: var(--bg-hover);
}

.mention-item.active {
  background-color: var(--bg-active);
  position: relative;
}

.mention-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background-color: var(--rail-active);
}

.mention-name {
  font-size: 13px;
  color: var(--text-primary);
}

.user-avatar-placeholder.sm {
  width: 20px;
  height: 20px;
  font-size: 10px;
  background-color: var(--indigo-100);
  color: var(--indigo-800);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  text-transform: uppercase;
}
</style>
