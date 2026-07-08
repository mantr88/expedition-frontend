import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MessageInput from './MessageInput.vue'

describe('MessageInput', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  it('disables send button when text is empty', () => {
    const wrapper = mount(MessageInput)
    const sendBtn = wrapper.find('.send-btn')
    expect(sendBtn.attributes('disabled')).toBeDefined()
  })

  it('enables send button when text is typed', async () => {
    const wrapper = mount(MessageInput)
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Hello world')

    const sendBtn = wrapper.find('.send-btn')
    expect(sendBtn.attributes('disabled')).toBeUndefined()
  })

  it('emits send event and clears textarea on submit', async () => {
    const wrapper = mount(MessageInput)
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Hello world')

    const sendBtn = wrapper.find('.send-btn')
    await sendBtn.trigger('click')

    expect(wrapper.emitted('send')).toBeTruthy()
    expect(wrapper.emitted('send')![0]).toEqual(['Hello world'])
    expect(textarea.element.value).toBe('')
  })

  it('emits send event on Enter key without shift', async () => {
    const wrapper = mount(MessageInput)
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Test keydown')

    await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })

    expect(wrapper.emitted('send')).toBeTruthy()
    expect(wrapper.emitted('send')![0]).toEqual(['Test keydown'])
    expect(textarea.element.value).toBe('')
  })

  it('does not emit send event on Enter key with shift', async () => {
    const wrapper = mount(MessageInput)
    const textarea = wrapper.find('textarea')
    await textarea.setValue('Test keydown')

    await textarea.trigger('keydown', { key: 'Enter', shiftKey: true })

    expect(wrapper.emitted('send')).toBeFalsy()
  })
})
