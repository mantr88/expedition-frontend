<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import type { Message } from '../types/Message'
import { useAuthStore } from '../stores/auth'
import { useMessagesStore } from '../stores/messages'
import { useUnread } from '../composables/useUnread'
import { PhPencilSimple, PhTrash, PhSmiley, PhChatsCircle, PhCheck, PhX } from '@phosphor-icons/vue'
import AttachmentCard from './MessageAttachment.vue'
import ReactionBar from './ReactionBar.vue'
import EmojiPicker from './EmojiPicker.vue'

const props = defineProps<{
  message: Message
  isConsecutive: boolean
  highlighted?: boolean
}>()

const emit = defineEmits<{
  (e: 'edit', id: number, newBody: string): void
  (e: 'delete', id: number): void
}>()

const authStore = useAuthStore()
const messagesStore = useMessagesStore()

const isEditing = ref(false)
const editBody = ref(props.message.body_raw)
const showEmojiPicker = ref(false)

const isOwner = authStore.user?.id === props.message.user.id

const isMentioned = computed(() => {
  if (!authStore.user || props.message.user.id === authStore.user.id) return false
  const mentionPattern = new RegExp(`@${authStore.user.name}\\b`, 'i')
  return mentionPattern.test(props.message.body_raw)
})

const { handleMessageVisible } = useUnread()
const wrapperRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!wrapperRef.value) return
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          handleMessageVisible(props.message.channel_id, props.message.id)
        }
      })
    },
    { threshold: 0.5 },
  )
  observer.observe(wrapperRef.value)
})

onBeforeUnmount(() => {
  if (observer) {
    observer.disconnect()
  }
  document.removeEventListener('click', clickOutsideHandler)
})

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

function startEdit() {
  editBody.value = props.message.body_raw
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
}

function saveEdit() {
  if (editBody.value.trim() && editBody.value !== props.message.body_raw) {
    emit('edit', props.message.id, editBody.value.trim())
  }
  isEditing.value = false
}

function handleDelete() {
  if (confirm('Ви впевнені, що хочете видалити це повідомлення?')) {
    emit('delete', props.message.id)
  }
}

function handleAddReaction() {
  showEmojiPicker.value = !showEmojiPicker.value
}

function clickOutsideHandler(event: MouseEvent) {
  const pickerEl = wrapperRef.value?.querySelector('.emoji-picker-wrapper')
  if (pickerEl && !pickerEl.contains(event.target as Node)) {
    showEmojiPicker.value = false
  }
}

watch(showEmojiPicker, (isOpen) => {
  if (isOpen) {
    // Use capture or setTimeout to avoid immediate trigger during the click that opens it
    setTimeout(() => {
      document.addEventListener('click', clickOutsideHandler)
    }, 0)
  } else {
    document.removeEventListener('click', clickOutsideHandler)
  }
})

function selectEmoji(emoji: string) {
  showEmojiPicker.value = false
  messagesStore.toggleReaction(props.message.channel_id, props.message.id, emoji)
}

function toggleReaction(emoji: string) {
  messagesStore.toggleReaction(props.message.channel_id, props.message.id, emoji)
}

function openThread() {
  messagesStore.openThread(props.message)
}
</script>

<template>
  <div
    ref="wrapperRef"
    :class="[
      'message-item-wrapper',
      {
        consecutive: isConsecutive,
        'is-deleted': !!message.deleted_at,
        'is-mentioned': isMentioned,
        'picker-open': showEmojiPicker,
        'msg-highlighted': highlighted,
      },
    ]"
  >
    <!-- Avatar and Name for non-consecutive message -->
    <div v-if="!isConsecutive && !message.deleted_at" class="message-header-row">
      <div class="user-avatar">
        {{ message.user.name.charAt(0) }}
      </div>
      <div class="user-meta">
        <span class="user-name">{{ message.user.name }}</span>
        <span class="message-time mono">{{ formatTime(message.created_at) }}</span>
      </div>
    </div>

    <!-- Consecutive layout -->
    <div class="message-content-row">
      <div v-if="isConsecutive && !message.deleted_at" class="hover-time-cell mono">
        {{ formatTime(message.created_at) }}
      </div>

      <div class="message-body-container">
        <!-- Deleted message placeholder -->
        <div v-if="message.deleted_at" class="deleted-placeholder">Повідомлення видалено</div>

        <!-- Inline editor -->
        <div v-else-if="isEditing" class="inline-editor">
          <textarea v-model="editBody" rows="2" class="edit-textarea"></textarea>
          <div class="editor-actions">
            <button class="editor-btn cancel-btn" @click="cancelEdit">
              <PhX :size="14" />
            </button>
            <button class="editor-btn save-btn" @click="saveEdit">
              <PhCheck :size="14" />
            </button>
          </div>
        </div>

        <!-- Render html body -->
        <div v-else class="message-body" v-html="message.body_html"></div>

        <!-- Attachments -->
        <div v-if="message.attachments && message.attachments.length > 0" class="attachments-list">
          <AttachmentCard v-for="att in message.attachments" :key="att.id" :attachment="att" />
        </div>

        <!-- Reactions -->
        <ReactionBar
          v-if="message.reactions"
          :reactions="message.reactions"
          @toggle="toggleReaction"
          @add-reaction="handleAddReaction"
        />

        <!-- Thread replies indicator -->
        <div v-if="message.reply_count > 0" class="thread-replies-indicator" @click="openThread">
          <span class="reply-count">{{ message.reply_count }} відповідей</span>
          <span v-if="message.last_reply_at" class="last-reply mono"
            >· остання {{ formatTime(message.last_reply_at) }}</span
          >
        </div>

        <!-- Metadata signs (edited, sending, failed) -->
        <span v-if="message.edited_at && !message.deleted_at" class="edited-badge mono">
          (змінено)
        </span>
        <span v-if="message.sending" class="sending-badge mono"> Надсилання... </span>
        <span v-if="message.failed" class="failed-badge mono"> Помилка надсилання </span>
      </div>
    </div>

    <!-- Floating Actions Toolbar -->
    <div v-if="!message.deleted_at && !isEditing" class="floating-actions">
      <button class="action-btn" aria-label="Додати реакцію" @click.stop="handleAddReaction">
        <PhSmiley :size="18" />
      </button>
      <button class="action-btn" aria-label="Відповісти в треді" @click.stop="openThread">
        <PhChatsCircle :size="18" />
      </button>
      <button v-if="isOwner" class="action-btn" aria-label="Редагувати" @click="startEdit">
        <PhPencilSimple :size="18" />
      </button>
      <button v-if="isOwner" class="action-btn danger" aria-label="Видалити" @click="handleDelete">
        <PhTrash :size="18" />
      </button>
    </div>

    <!-- Emoji Picker Popover -->
    <div v-if="showEmojiPicker" class="emoji-picker-wrapper" @click.stop>
      <EmojiPicker @select="selectEmoji" />
    </div>
  </div>
</template>

<style scoped>
.message-item-wrapper {
  position: relative;
  padding: var(--space-2) var(--space-4);
  transition: background-color var(--dur-fast) var(--ease);
}

.message-item-wrapper:hover,
.message-item-wrapper.picker-open {
  background-color: var(--bg-hover);
}

.message-item-wrapper.picker-open {
  z-index: 50;
}

.message-item-wrapper.picker-open .floating-actions {
  opacity: 1;
  pointer-events: auto;
}

.message-item-wrapper.is-mentioned {
  background-color: var(--mention-bg);
}

.message-item-wrapper.is-mentioned::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: var(--rail-active);
}

.msg-highlighted {
  background-color: var(--mention-bg);
  transition: background-color var(--dur-base) var(--ease);
}

.message-header-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-1);
}

.user-avatar {
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
  flex-shrink: 0;
}

.user-meta {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.user-name {
  font-size: var(--text-md);
  font-weight: 500;
  color: var(--text-primary);
}

.message-time {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.mono {
  font-family: var(--font-mono);
}

.message-content-row {
  display: flex;
  padding-left: 48px; /* Alignment under name when avatar is present */
}

.consecutive {
  padding-top: 2px;
  padding-bottom: 2px;
}

.consecutive .message-content-row {
  padding-left: 48px;
}

.hover-time-cell {
  width: 48px;
  margin-left: -48px;
  font-size: var(--text-xs);
  color: var(--text-muted);
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease);
  display: flex;
  align-items: center;
}

.message-item-wrapper:hover .hover-time-cell {
  opacity: 1;
}

.message-body-container {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-2);
  width: 100%;
}

.message-body {
  font-size: var(--text-base);
  color: var(--text-primary);
  word-break: break-word;
}

/* Style raw markdown blocks from safe v-html */
.message-body :deep(strong) {
  font-weight: 600;
}

.message-body :deep(em) {
  font-style: italic;
}

.message-body :deep(code) {
  font-family: var(--font-mono);
  background-color: var(--bg-hover);
  padding: 2px 4px;
  border-radius: var(--radius-sm);
  font-size: 0.9em;
}

.message-body :deep(a) {
  color: var(--text-link);
  text-decoration: none;
}

.message-body :deep(a:hover) {
  text-decoration: underline;
}

.deleted-placeholder {
  font-style: italic;
  color: var(--text-muted);
}

.edited-badge {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.sending-badge {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-style: italic;
}

.failed-badge {
  font-size: var(--text-xs);
  color: var(--danger);
  font-weight: 500;
}

/* Floating Actions */
.floating-actions {
  position: absolute;
  right: var(--space-4);
  top: 0;
  transform: translateY(-50%);
  background-color: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-popover);
  display: flex;
  gap: 2px;
  padding: 2px;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--dur-fast) var(--ease);
  z-index: 10;
}

.message-item-wrapper:hover .floating-actions {
  opacity: 1;
  pointer-events: auto;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
}

.action-btn.danger:hover {
  background-color: var(--danger);
  color: var(--text-onbrand);
}

/* Inline Editor */
.inline-editor {
  display: flex;
  gap: var(--space-2);
  width: 100%;
  margin-top: var(--space-1);
}

.edit-textarea {
  flex: 1;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  background-color: var(--bg-app);
  color: var(--text-primary);
  padding: var(--space-2);
  resize: vertical;
}

.edit-textarea:focus {
  outline: none;
  border-color: var(--indigo-600);
}

.editor-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.editor-btn {
  border: none;
  cursor: pointer;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cancel-btn {
  background-color: var(--bg-hover);
  color: var(--text-secondary);
}

.save-btn {
  background-color: var(--indigo-600);
  color: var(--text-onbrand);
}

.attachments-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-1);
  width: 100%;
}

.thread-replies-indicator {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-1);
  padding: 4px 8px;
  background-color: var(--bg-hover);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease);
  width: fit-content;
}

.thread-replies-indicator:hover {
  background-color: var(--bg-active);
}

.reply-count {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--indigo-600);
}

.last-reply {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.emoji-picker-wrapper {
  position: absolute;
  right: var(--space-4);
  top: 12%;
  margin-top: 4px;
  z-index: 50;
}
</style>
