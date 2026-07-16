import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import AddMemberPopover from './AddMemberPopover.vue'
import { useChannelsStore } from '../stores/channels'
import { searchUsers } from '../api/users'

vi.mock('../api/users', () => ({
  searchUsers: vi.fn()
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
      { id: 1, name: 'Alice', email: 'alice@test.com' },
      { id: 2, name: 'Bob', email: 'bob@test.com' }
    ] as any)

    const channelsStore = useChannelsStore()
    Object.defineProperty(channelsStore, 'activeChannelMembers', {
      get: () => [{ user: { id: 1, name: 'Alice' } }]
    })
    Object.defineProperty(channelsStore, 'currentChannelId', {
      get: () => 10
    })
    channelsStore.inviteMember = vi.fn()

    const wrapper = mount(AddMemberPopover)

    const input = wrapper.find('input')
    await input.setValue('b')
    
    vi.advanceTimersByTime(300)
    await wrapper.vm.$nextTick()
    await new Promise(resolve => process.nextTick(resolve))
    await wrapper.vm.$nextTick()

    expect(mockSearch).toHaveBeenCalledWith('b')

    const items = wrapper.findAll('.user-item')
    expect(items).toHaveLength(1)
    expect(items[0].text()).toContain('Bob')

    await items[0].trigger('click')
    
    expect(channelsStore.inviteMember).toHaveBeenCalledWith(10, 2)
  })
})
