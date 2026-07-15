<script setup lang="ts">
import { computed } from 'vue'
import { PhFile, PhDownloadSimple } from '@phosphor-icons/vue'
import type { Attachment } from '../types/Message'

const props = defineProps<{
  attachment: Attachment
}>()

const isImage = computed(() => {
  return props.attachment.mime.startsWith('image/')
})

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  const kb = bytes / 1024
  if (kb < 1024) return kb.toFixed(1) + ' KB'
  const mb = kb / 1024
  return mb.toFixed(2) + ' MB'
}
</script>

<template>
  <a :href="attachment.url" target="_blank" rel="noopener noreferrer" class="attachment-card">
    <div v-if="isImage && attachment.thumb_url" class="image-preview">
      <img :src="attachment.thumb_url" :alt="attachment.original_name" loading="lazy" />
      <div class="image-overlay">
        <span class="file-name mono">{{ attachment.original_name }}</span>
      </div>
    </div>

    <div v-else class="file-preview">
      <div class="file-icon">
        <PhFile :size="32" weight="regular" />
      </div>
      <div class="file-info">
        <div class="file-name">{{ attachment.original_name }}</div>
        <div class="file-meta mono">{{ formatSize(attachment.size) }}</div>
      </div>
      <div class="download-icon">
        <PhDownloadSimple :size="20" />
      </div>
    </div>
  </a>
</template>

<style scoped>
.attachment-card {
  display: block;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  text-decoration: none;
  background-color: var(--bg-elevated);
  transition:
    border-color var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease);
  width: fit-content;
  max-width: 320px;
}

.attachment-card:hover {
  border-color: var(--border-strong);
  box-shadow: 0 4px 12px rgba(20, 24, 31, 0.05);
}

.attachment-card:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

/* Image preview */
.image-preview {
  position: relative;
  display: flex;
  background-color: var(--bg-hover);
}

.image-preview img {
  max-width: 100%;
  max-height: 240px;
  object-fit: cover;
  display: block;
}

.image-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
  padding: var(--space-2);
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease);
}

.image-preview:hover .image-overlay {
  opacity: 1;
}

.image-overlay .file-name {
  color: #fff;
  font-size: var(--text-xs);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

/* File preview */
.file-preview {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
}

.file-icon {
  color: var(--indigo-600);
  background-color: var(--indigo-50);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: var(--text-sm);
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-top: 2px;
}

.download-icon {
  color: var(--text-muted);
  opacity: 0;
  transition:
    opacity var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.attachment-card:hover .download-icon {
  opacity: 1;
  color: var(--text-primary);
}

.mono {
  font-family: var(--font-mono);
}
</style>
