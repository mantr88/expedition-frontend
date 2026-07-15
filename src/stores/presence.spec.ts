import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePresenceStore } from './presence'
import type { User } from '../types/User'

const mockUser1: User = {
  id: 1,
  name: 'Anna Petrenko',
  email: 'anna@example.com',
  avatar_url: null,
  status: 'active',
  last_seen_at: null,
}

const mockUser2: User = {
  id: 2,
  name: 'Ihor Franko',
  email: 'ihor@example.com',
  avatar_url: null,
  status: 'away',
  last_seen_at: null,
}

describe('Presence Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  it('manages online users', () => {
    const store = usePresenceStore()

    expect(store.isUserOnline(1)).toBe(false)

    store.setOnlineUsers([mockUser1])
    expect(store.isUserOnline(1)).toBe(true)
    expect(store.isUserOnline(2)).toBe(false)

    store.addUserOnline(mockUser2)
    expect(store.isUserOnline(2)).toBe(true)

    store.removeUserOffline(1)
    expect(store.isUserOnline(1)).toBe(false)
    expect(store.isUserOnline(2)).toBe(true)
  })

  it('manages typing status with timeout', () => {
    const store = usePresenceStore()
    const channelId = 12

    expect(store.getTypingUsersInChannel(channelId)).toEqual([])

    store.setUserTyping(channelId, 1, 'Anna')
    expect(store.getTypingUsersInChannel(channelId)).toEqual([{ id: 1, name: 'Anna' }])

    // Simulate time forward by 1 second (should still be typing)
    vi.advanceTimersByTime(1000)
    expect(store.getTypingUsersInChannel(channelId)).toEqual([{ id: 1, name: 'Anna' }])

    // Simulate time forward by 2.1 seconds (exceeding 3 seconds total, typing should clear automatically)
    vi.advanceTimersByTime(2100)
    expect(store.getTypingUsersInChannel(channelId)).toEqual([])
  })

  it('explicitly clears typing status', () => {
    const store = usePresenceStore()
    const channelId = 12

    store.setUserTyping(channelId, 1, 'Anna')
    expect(store.getTypingUsersInChannel(channelId)).toEqual([{ id: 1, name: 'Anna' }])

    store.clearUserTyping(channelId, 1)
    expect(store.getTypingUsersInChannel(channelId)).toEqual([])
  })
})

describe('presence store: cleanup', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  it('clearChannelTyping чистить typing-стан каналу і його таймери', () => {
    const store = usePresenceStore()
    store.setUserTyping(1, 10, 'Anna')
    store.setUserTyping(1, 11, 'Ihor')
    store.setUserTyping(2, 10, 'Anna')

    store.clearChannelTyping(1)

    expect(store.getTypingUsersInChannel(1)).toHaveLength(0)
    expect(store.getTypingUsersInChannel(2)).toHaveLength(1)
    // Таймери каналу 1 зняті — advance не має падати чи щось міняти
    vi.advanceTimersByTime(5000)
    expect(store.getTypingUsersInChannel(2)).toHaveLength(0)
  })

  it('reset чистить усе', () => {
    const store = usePresenceStore()
    store.addUserOnline({
      id: 1,
      name: 'A',
      email: 'a@a.a',
      avatar_url: null,
      status: 'active',
      last_seen_at: null,
    })
    store.setUserTyping(1, 10, 'Anna')

    store.reset()

    expect(store.onlineUsers).toEqual({})
    expect(store.getTypingUsersInChannel(1)).toHaveLength(0)
  })
})
