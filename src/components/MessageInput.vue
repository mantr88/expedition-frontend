<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { PhPaperPlaneTilt, PhPaperclip, PhSmiley, PhAt, PhFile, PhX } from '@phosphor-icons/vue'
import { useMentions } from '../composables/useMentions'
import EmojiPicker from './EmojiPicker.vue'
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
const showEmojiPicker = ref(false)
const emojiPickerWrapperRef = ref<HTMLElement | null>(null)

// --- Cursor position tracking ---
const lastCursorPos = ref(0)

function saveCursorPos() {
  if (textareaRef.value) {
    lastCursorPos.value = textareaRef.value.selectionStart
  }
}

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
  if (isMentioning.value) {
    if (e.key === 'ArrowUp' && mentionSuggestions.value.length > 0) {
      e.preventDefault()
      navigateMentions(-1)
      return
    } else if (e.key === 'ArrowDown' && mentionSuggestions.value.length > 0) {
      e.preventDefault()
      navigateMentions(1)
      return
    } else if (e.key === 'Enter' && !e.shiftKey && mentionSuggestions.value.length > 0) {
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
    if (isMentioning.value) {
      updateMentionsPopupPosition()
    }
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
  showEmojiPicker.value = false
}

const mentionsPopupStyle = ref<Record<string, string>>({})

function updateMentionsPopupPosition() {
  const container = textareaRef.value || (document.querySelector('.input-wrapper') as HTMLElement)
  if (container) {
    const rect = container.getBoundingClientRect()
    const isMobile = window.innerWidth <= 480
    if (isMobile) {
      mentionsPopupStyle.value = {
        position: 'fixed',
        bottom: `${Math.max(10, window.innerHeight - rect.top + 8)}px`,
        left: '12px',
        right: '12px',
        maxWidth: 'calc(100vw - 24px)',
        zIndex: '9999',
      }
    } else {
      mentionsPopupStyle.value = {
        position: 'fixed',
        bottom: `${window.innerHeight - rect.top + 8}px`,
        left: `${Math.max(12, rect.left)}px`,
        zIndex: '9999',
      }
    }
  }
}

// --- @ button handler ---
function insertAtSymbol() {
  if (props.disabled) return

  const textarea = textareaRef.value
  const pos = textarea ? textarea.selectionStart : text.value.length

  // Insert @ at cursor position, preceded by space if needed
  const before = text.value.slice(0, pos)
  const after = text.value.slice(pos)
  const needsSpace = before.length > 0 && before[before.length - 1] !== ' ' && before[before.length - 1] !== '\n'
  const insert = (needsSpace ? ' ' : '') + '@'
  text.value = before + insert + after

  const newPos = pos + insert.length
  lastCursorPos.value = newPos

  // Immediately activate mention logic synchronously
  processMentionsInput(text.value, newPos)
  updateMentionsPopupPosition()

  nextTick(() => {
    if (textarea) {
      textarea.focus()
      textarea.setSelectionRange(newPos, newPos)
      processMentionsInput(text.value, newPos)
      updateMentionsPopupPosition()
    }
  })
}

const emojiPickerStyle = ref<Record<string, string>>({})

// --- Emoji picker handlers ---
function toggleEmojiPicker(e?: MouseEvent) {
  if (props.disabled) return
  saveCursorPos()

  if (!showEmojiPicker.value) {
    const target = (e?.currentTarget as HTMLElement) || textareaRef.value
    if (target) {
      const rect = target.getBoundingClientRect()
      const isMobile = window.innerWidth <= 480
      if (isMobile) {
        emojiPickerStyle.value = {
          position: 'fixed',
          bottom: `${Math.max(10, window.innerHeight - rect.top + 8)}px`,
          left: '12px',
          right: '12px',
          maxWidth: 'calc(100vw - 24px)',
          zIndex: '9999',
        }
      } else {
        const left = Math.min(rect.left, window.innerWidth - 364)
        emojiPickerStyle.value = {
          position: 'fixed',
          bottom: `${window.innerHeight - rect.top + 8}px`,
          left: `${Math.max(12, left)}px`,
          zIndex: '9999',
        }
      }
    }
    showEmojiPicker.value = true
  } else {
    showEmojiPicker.value = false
  }
}

function insertEmoji(emoji: string) {
  const pos = lastCursorPos.value
  const before = text.value.slice(0, pos)
  const after = text.value.slice(pos)
  text.value = before + emoji + after

  const newPos = pos + emoji.length
  lastCursorPos.value = newPos

  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus()
      textareaRef.value.setSelectionRange(newPos, newPos)
    }
  })
}

function closeEmojiPicker() {
  showEmojiPicker.value = false
}

function emojiClickOutsideHandler(event: MouseEvent) {
  const wrapper = emojiPickerWrapperRef.value
  if (wrapper && !wrapper.contains(event.target as Node)) {
    showEmojiPicker.value = false
  }
}

function mentionsClickOutsideHandler(event: MouseEvent) {
  if (!isMentioning.value) return
  const popupEl = document.querySelector('.mentions-popup')
  const textareaEl = textareaRef.value
  if (
    popupEl &&
    !popupEl.contains(event.target as Node) &&
    textareaEl &&
    !textareaEl.contains(event.target as Node)
  ) {
    isMentioning.value = false
  }
}

watch(isMentioning, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      updateMentionsPopupPosition()
    })
    setTimeout(() => {
      document.addEventListener('click', mentionsClickOutsideHandler)
    }, 0)
  } else {
    document.removeEventListener('click', mentionsClickOutsideHandler)
  }
})

watch(showEmojiPicker, (isOpen) => {
  if (isOpen) {
    setTimeout(() => {
      document.addEventListener('click', emojiClickOutsideHandler)
    }, 0)
  } else {
    document.removeEventListener('click', emojiClickOutsideHandler)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', emojiClickOutsideHandler)
  document.removeEventListener('click', mentionsClickOutsideHandler)
})

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
      <Teleport to="body">
        <div v-if="isMentioning" class="mentions-popup" :style="mentionsPopupStyle">
          <template v-if="mentionSuggestions.length > 0">
            <div
              v-for="(user, idx) in mentionSuggestions"
              :key="user.id"
              :class="['mention-item', { active: idx === selectedMentionIndex }]"
              @click="selectMention(user)"
            >
              <div class="user-avatar-placeholder sm">{{ user.name.charAt(0) }}</div>
              <span class="mention-name">{{ user.name }}</span>
            </div>
            <div class="mentions-footer">
              <span>↑↓ навігація</span>
              <span>↵ обрати</span>
              <span>esc закрити</span>
            </div>
          </template>
          <div v-else class="mentions-empty">Нічого не знайдено</div>
        </div>
      </Teleport>

      <!-- Emoji Picker Popup -->
      <Teleport to="body">
        <div
          v-if="showEmojiPicker"
          ref="emojiPickerWrapperRef"
          class="emoji-picker-popup"
          :style="emojiPickerStyle"
          @click.stop
        >
          <EmojiPicker @select="insertEmoji" @close="closeEmojiPicker" />
        </div>
      </Teleport>

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
        @blur="saveCursorPos"
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
          <button
            :class="['tool-btn', { 'tool-btn-active': showEmojiPicker }]"
            type="button"
            aria-label="Додати емодзі"
            :disabled="disabled"
            @click.stop="toggleEmojiPicker($event)"
          >
            <PhSmiley :size="20" />
          </button>
          <button
            class="tool-btn"
            type="button"
            aria-label="Згадати когось"
            :disabled="disabled"
            @click="insertAtSymbol"
          >
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
  position: relative;
  background-color: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-popover);
  max-height: 240px;
  overflow-y: auto;
  z-index: 9999;
  min-width: 240px;
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

.mentions-footer {
  position: sticky;
  bottom: 0;
  left: 0;
  display: flex;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--border-subtle);
  font-size: 11px;
  color: var(--text-muted);
  background-color: #fff;
}

.mentions-empty {
  padding: var(--space-3) var(--space-4);
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
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

/* Emoji picker popup */
.emoji-picker-popup {
  z-index: 9999;
}

.tool-btn-active {
  background-color: var(--bg-active);
  color: var(--text-primary);
}
</style>
