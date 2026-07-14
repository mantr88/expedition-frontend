import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useChannelsStore } from './channels'
import * as channelsApi from '../api/channels'
import type { Channel } from '../types/Channel'

vi.mock('../api/channels')

function makeChannel(): Channel {
  return {
    id: 1,
    name: 'general',
    type: 'public',
    topic: null,
    archived_at: null,
    members_count: 2,
    unread_count: 0,
    my_membership: { role: 'member', last_read_message_id: null, notifications_level: 'all' },
  }
}

describe('channels store: setNotificationsLevel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('оптимістично оновлює рівень', async () => {
    vi.mocked(channelsApi.updateNotificationsLevel).mockResolvedValue()
    const store = useChannelsStore()
    store.channels = [makeChannel()]

    await store.setNotificationsLevel(1, 'mute')
    expect(store.channels[0].my_membership!.notifications_level).toBe('mute')
    expect(channelsApi.updateNotificationsLevel).toHaveBeenCalledWith(1, 'mute')
  })

  it('відкочує при помилці', async () => {
    vi.mocked(channelsApi.updateNotificationsLevel).mockRejectedValue(new Error('fail'))
    const store = useChannelsStore()
    store.channels = [makeChannel()]

    await expect(store.setNotificationsLevel(1, 'mute')).rejects.toThrow()
    expect(store.channels[0].my_membership!.notifications_level).toBe('all')
  })
})
