import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import AddMemberPopover from './AddMemberPopover.vue'
import { useChannelsStore } from '../stores/channels'
import { searchUsers } from '../api/users'
import { inviteByEmail } from '../api/invitations'

vi.mock('../api/users', () => ({
  searchUsers: vi.fn(),
}))

vi.mock('../api/invitations', () => ({
  inviteByEmail: vi.fn(),
}))

describe('AddMemberPopover.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('filters out existing members and invites a new user', async () => {
    const mockSearch = vi.mocked(searchUsers).mockResolvedValue([
      {
        id: 1,
        name: 'Alice',
        email: 'alice@test.com',
        avatar_url: null,
        status: 'active',
        last_seen_at: null,
      },
      {
        id: 2,
        name: 'Bob',
        email: 'bob@test.com',
        avatar_url: null,
        status: 'active',
        last_seen_at: null,
      },
    ])

    const channelsStore = useChannelsStore()
    Object.defineProperty(channelsStore, 'activeChannelMembers', {
      get: () => [{ user: { id: 1, name: 'Alice' } }],
    })
    Object.defineProperty(channelsStore, 'currentChannelId', {
      get: () => 10,
    })
    channelsStore.inviteMember = vi.fn()

    const wrapper = mount(AddMemberPopover)

    const input = wrapper.find('input')
    await input.setValue('b')

    vi.advanceTimersByTime(300)
    await wrapper.vm.$nextTick()
    await new Promise<void>((resolve) => queueMicrotask(() => resolve()))
    await wrapper.vm.$nextTick()

    expect(mockSearch).toHaveBeenCalledWith('b')

    const items = wrapper.findAll('.user-item')
    expect(items).toHaveLength(1)
    expect(items[0].text()).toContain('Bob')

    await items[0].trigger('click')

    expect(channelsStore.inviteMember).toHaveBeenCalledWith(10, 2)
  })

  it('shows invite by email button if no users found and query is a valid email', async () => {
    const mockSearch = vi.mocked(searchUsers).mockResolvedValue([])
    const mockInvite = vi.mocked(inviteByEmail).mockResolvedValue({
      id: 99,
      name: 'new',
      email: 'new@test.com',
      status: 'offline',
      avatar_url: null,
      last_seen_at: null,
      is_pending: true,
    })

    const channelsStore = useChannelsStore()
    Object.defineProperty(channelsStore, 'currentChannelId', { get: () => 10 })

    const wrapper = mount(AddMemberPopover)

    const input = wrapper.find('input')
    await input.setValue('new@test.com')

    vi.advanceTimersByTime(300)
    await wrapper.vm.$nextTick()
    await new Promise<void>((resolve) => queueMicrotask(() => resolve()))
    await wrapper.vm.$nextTick()

    expect(mockSearch).toHaveBeenCalledWith('new@test.com')

    const inviteBtn = wrapper.find('.invite-action')
    expect(inviteBtn.exists()).toBe(true)
    expect(inviteBtn.text()).toContain('new@test.com')

    await inviteBtn.trigger('click')

    expect(mockInvite).toHaveBeenCalledWith('new@test.com', 10)

    await wrapper.vm.$nextTick()
    await new Promise<void>((resolve) => queueMicrotask(() => resolve()))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Запрошення надіслано')
  })
})
