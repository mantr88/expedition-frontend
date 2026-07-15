import { onMounted, onUnmounted } from 'vue'

export interface ShortcutHandlers {
  openSearch: () => void
  nextChannel: () => void
  prevChannel: () => void
  closeOverlays: () => void
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  function onKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      handlers.openSearch()
      return
    }
    if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault()
      handlers.nextChannel()
      return
    }
    if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault()
      handlers.prevChannel()
      return
    }
    if (e.key === 'Escape') {
      handlers.closeOverlays()
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
}
