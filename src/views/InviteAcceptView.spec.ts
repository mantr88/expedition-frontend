import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import InviteAcceptView from './InviteAcceptView.vue'
import { setPassword } from '../api/invitations'
import { useRoute, useRouter } from 'vue-router'

vi.mock('../api/invitations', () => ({
  setPassword: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: vi.fn(),
  useRouter: vi.fn(),
}))

describe('InviteAcceptView.vue', () => {
  const mockPush = vi.fn()

  const mountOptions = {
    global: {
      stubs: {
        RouterLink: true,
      },
    },
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as unknown as ReturnType<
      typeof useRouter
    >)
  })

  it('shows error if email or token are missing', async () => {
    vi.mocked(useRoute).mockReturnValue({ query: {} } as unknown as ReturnType<typeof useRoute>)
    const wrapper = mount(InviteAcceptView, mountOptions)

    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Посилання некоректне')
  })

  it('submits form and redirects on success', async () => {
    vi.mocked(useRoute).mockReturnValue({
      query: { email: 'a@b.com', token: '123' },
    } as unknown as ReturnType<typeof useRoute>)
    const mockSetPassword = vi.mocked(setPassword).mockResolvedValue()

    const wrapper = mount(InviteAcceptView, mountOptions)
    await wrapper.vm.$nextTick()

    await wrapper.find('input#name').setValue('Ivan')
    await wrapper.find('input#password').setValue('password123')
    await wrapper.find('input#password_confirmation').setValue('password123')

    await wrapper.find('form').trigger('submit.prevent')

    expect(mockSetPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      token: '123',
      name: 'Ivan',
      password: 'password123',
      password_confirmation: 'password123',
    })

    await wrapper.vm.$nextTick()
    await new Promise<void>((resolve) => queueMicrotask(() => resolve()))
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Пароль встановлено')

    vi.advanceTimersByTime(1500)
    expect(mockPush).toHaveBeenCalledWith({ name: 'login' })
  })

  it('shows error if passwords do not match', async () => {
    vi.mocked(useRoute).mockReturnValue({
      query: { email: 'a@b.com', token: '123' },
    } as unknown as ReturnType<typeof useRoute>)
    const wrapper = mount(InviteAcceptView, mountOptions)
    await wrapper.vm.$nextTick()

    await wrapper.find('input#name').setValue('Ivan')
    await wrapper.find('input#password').setValue('password123')
    await wrapper.find('input#password_confirmation').setValue('different')

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('Паролі не співпадають')
    expect(setPassword).not.toHaveBeenCalled()
  })
})
