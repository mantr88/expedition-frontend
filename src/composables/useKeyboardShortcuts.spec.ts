import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

function mountWithShortcuts() {
  const handlers = {
    openSearch: vi.fn(),
    nextChannel: vi.fn(),
    prevChannel: vi.fn(),
    closeOverlays: vi.fn(),
  }
  const wrapper = mount(
    defineComponent({
      setup() {
        useKeyboardShortcuts(handlers)
        return () => null
      },
    }),
  )
  return { handlers, wrapper }
}

describe('useKeyboardShortcuts', () => {
  it('Ctrl+K відкриває пошук', () => {
    const { handlers, wrapper } = mountWithShortcuts()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    expect(handlers.openSearch).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('Alt+ArrowDown / Alt+ArrowUp перемикають канали', () => {
    const { handlers, wrapper } = mountWithShortcuts()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true }))
    expect(handlers.nextChannel).toHaveBeenCalled()
    expect(handlers.prevChannel).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('Escape закриває оверлеї', () => {
    const { handlers, wrapper } = mountWithShortcuts()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(handlers.closeOverlays).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('знімає лісенер після unmount', () => {
    const { handlers, wrapper } = mountWithShortcuts()
    wrapper.unmount()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    expect(handlers.openSearch).not.toHaveBeenCalled()
  })
})
