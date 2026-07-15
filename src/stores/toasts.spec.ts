import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useToastsStore } from './toasts'

describe('toasts store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  it('додає тост і повертає id', () => {
    const store = useToastsStore()
    const id = store.push('error', 'Занадто багато запитів. Спробуйте через 10 с.')
    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0]).toMatchObject({ id, kind: 'error' })
  })

  it('авто-закриває тост після таймауту', () => {
    const store = useToastsStore()
    store.push('info', 'test', 5000)
    expect(store.toasts).toHaveLength(1)
    vi.advanceTimersByTime(5001)
    expect(store.toasts).toHaveLength(0)
  })

  it('dismiss прибирає конкретний тост', () => {
    const store = useToastsStore()
    const a = store.push('info', 'a', 0)
    store.push('info', 'b', 0)
    store.dismiss(a)
    expect(store.toasts).toHaveLength(1)
    expect(store.toasts[0].text).toBe('b')
  })
})
