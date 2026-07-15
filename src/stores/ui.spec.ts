import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUiStore } from './ui'

describe('ui store: theme', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('initTheme читає збережену тему з localStorage', () => {
    localStorage.setItem('theme', 'dark')
    const store = useUiStore()
    store.initTheme()
    expect(store.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('toggleTheme перемикає і зберігає', () => {
    const store = useUiStore()
    store.initTheme()
    const before = store.theme
    store.toggleTheme()
    expect(store.theme).not.toBe(before)
    expect(localStorage.getItem('theme')).toBe(store.theme)
    expect(document.documentElement.dataset.theme).toBe(store.theme)
  })
})
