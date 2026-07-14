import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import SearchModal from './SearchModal.vue'
import * as searchApi from '../api/search'

// Компонент рендериться через Teleport to="body", тому DOM-вузли не є
// нащадками wrapper.element — шукаємо їх напряму в document.body.
const body = () => new DOMWrapper(document.body)

vi.mock('../api/search')

describe('SearchModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('дебаунсить запит і показує результати', async () => {
    vi.mocked(searchApi.searchMessages).mockResolvedValue({
      data: [
        {
          id: 7,
          client_message_id: 'x',
          channel_id: 1,
          user: {
            id: 2,
            name: 'Ihor Franko',
            email: 'i@i.i',
            avatar_url: null,
            status: 'active',
            last_seen_at: null,
          },
          parent_id: null,
          body_raw: 'знайдене повідомлення',
          body_html: 'знайдене повідомлення',
          type: 'text',
          edited_at: null,
          deleted_at: null,
          created_at: new Date().toISOString(),
          reactions: [],
          attachments: [],
          reply_count: 0,
          last_reply_at: null,
          channel: { id: 1, name: 'general', type: 'public' },
        },
      ],
      meta: { total: 1 },
    })

    const wrapper = mount(SearchModal, { props: { open: true } })
    await body().find('input').setValue('знайдене')

    expect(searchApi.searchMessages).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(350)
    await flushPromises()

    expect(searchApi.searchMessages).toHaveBeenCalledWith('знайдене')
    expect(document.body.textContent).toContain('знайдене повідомлення')
    expect(document.body.textContent).toContain('general')
    wrapper.unmount()
  })

  it('emit close на Escape', async () => {
    const wrapper = mount(SearchModal, { props: { open: true } })
    await body().find('.search-overlay').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })
})
