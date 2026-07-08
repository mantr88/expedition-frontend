import Echo from 'laravel-echo'
import Pusher from 'pusher-js'
import { apiClient } from './client'

interface PusherModule {
  Pusher?: unknown
  default?: {
    Pusher?: unknown
  }
}

const PusherClass =
  (Pusher as unknown as PusherModule).Pusher ||
  (Pusher as unknown as PusherModule).default?.Pusher ||
  (Pusher as unknown as { default: unknown }).default ||
  Pusher

// Expose Pusher globally as required by laravel-echo
if (typeof window !== 'undefined') {
  ;(window as unknown as { Pusher: unknown }).Pusher = PusherClass
}

export type ConnectionState = 'initialized' | 'connecting' | 'connected' | 'unavailable' | 'disconnected'

export interface StateChangeDetails {
  previous: ConnectionState
  current: ConnectionState
}

export type StateChangeCallback = (states: StateChangeDetails) => void
export type EventCallback = (data: any) => void
export type WhisperCallback = (data: Record<string, unknown> & { user_id: number; name: string }) => void
export type MemberCallback = (member: any) => void
export type MembersCallback = (members: any[]) => void

interface EchoChannel {
  name: string
}

// Custom Mock Connection for MockEcho
class MockConnection {
  private listeners: Record<string, StateChangeCallback[]> = {}
  public state: ConnectionState = 'connected'

  bind(event: string, callback: StateChangeCallback) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
    return this
  }

  unbind(event: string) {
    delete this.listeners[event]
    return this
  }

  trigger(event: string, states: StateChangeDetails) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(states))
    }
  }
}

class MockPusher {
  connection = new MockConnection()
}

class MockConnector {
  pusher = new MockPusher()
}

class MockChannel {
  name: string
  listeners: Record<string, EventCallback[]> = {}
  whisperListeners: Record<string, WhisperCallback[]> = {}

  constructor(name: string) {
    this.name = name
  }

  listen(event: string, callback: EventCallback) {
    const eventName = event.startsWith('.') ? event.slice(1) : event
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = []
    }
    this.listeners[eventName].push(callback)
    return this
  }

  stopListening(event: string) {
    const eventName = event.startsWith('.') ? event.slice(1) : event
    delete this.listeners[eventName]
    return this
  }

  whisper(event: string, data: Record<string, unknown> & { user_id: number; name: string }) {
    window.dispatchEvent(
      new CustomEvent('mock-echo-whisper', {
        detail: { channel: this.name, event, data },
      })
    )
    return this
  }

  listenForWhisper(event: string, callback: WhisperCallback) {
    if (!this.whisperListeners[event]) {
      this.whisperListeners[event] = []
    }
    this.whisperListeners[event].push(callback)
    return this
  }

  trigger(event: string, data: unknown) {
    const eventName = event.startsWith('.') ? event.slice(1) : event
    if (this.listeners[eventName]) {
      this.listeners[eventName].forEach((cb) => cb(data))
    }
  }

  triggerWhisper(event: string, data: Record<string, unknown> & { user_id: number; name: string }) {
    if (this.whisperListeners[event]) {
      this.whisperListeners[event].forEach((cb) => cb(data))
    }
  }
}

class MockPresenceChannel extends MockChannel {
  private members: Array<Record<string, unknown> & { id: number; name: string }> = []
  private hereCallback: MembersCallback = () => {}
  private joiningCallback: MemberCallback = () => {}
  private leavingCallback: MemberCallback = () => {}

  here(callback: MembersCallback) {
    this.hereCallback = callback
    setTimeout(() => {
      callback(this.members)
    }, 10)
    return this
  }

  joining(callback: MemberCallback) {
    this.joiningCallback = callback
    return this
  }

  leaving(callback: MemberCallback) {
    this.leavingCallback = callback
    return this
  }

  setMembers(members: Array<Record<string, unknown> & { id: number; name: string }>) {
    this.members = members
    if (this.hereCallback) {
      this.hereCallback(members)
    }
  }

  triggerJoin(member: Record<string, unknown> & { id: number; name: string }) {
    if (!this.members.some((m) => m.id === member.id)) {
      this.members.push(member)
    }
    if (this.joiningCallback) {
      this.joiningCallback(member)
    }
  }

  triggerLeave(member: Record<string, unknown> & { id: number; name: string }) {
    this.members = this.members.filter((m) => m.id !== member.id)
    if (this.leavingCallback) {
      this.leavingCallback(member)
    }
  }
}

export class MockEcho {
  connector = new MockConnector()
  private channels: Record<string, MockChannel | MockPresenceChannel> = {}

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('mock-echo-whisper', (e: Event) => {
        const customEvent = e as CustomEvent<{
          channel: string
          event: string
          data: Record<string, unknown> & { user_id: number; name: string }
        }>
        const { channel, event, data } = customEvent.detail
        // Forward whisper to listeners on that channel
        if (this.channels[channel]) {
          this.channels[channel].triggerWhisper(event, data)
        }
      })
    }
  }

  channel(name: string) {
    if (!this.channels[name]) {
      this.channels[name] = new MockChannel(name)
    }
    return this.channels[name]
  }

  privateChannel(name: string) {
    const key = `private-${name}`
    if (!this.channels[key]) {
      this.channels[key] = new MockChannel(key)
    }
    return this.channels[key]
  }

  private(name: string) {
    return this.privateChannel(name)
  }

  join(name: string) {
    const key = `presence-${name}`
    if (!this.channels[key]) {
      this.channels[key] = new MockPresenceChannel(key)
    }
    return this.channels[key] as MockPresenceChannel
  }

  leave(name: string) {
    delete this.channels[name]
    delete this.channels[`private-${name}`]
    delete this.channels[`presence-${name}`]
  }

  leaveChannel(name: string) {
    delete this.channels[name]
  }

  disconnect() {}
  connect() {}

  triggerEvent(channelName: string, eventName: string, payload: unknown) {
    const chans = [channelName, `private-${channelName}`, `presence-${channelName}`]
    chans.forEach((c) => {
      if (this.channels[c]) {
        this.channels[c].trigger(eventName, payload)
      }
    })
  }

  simulateDisconnect() {
    const prev = this.connector.pusher.connection.state
    this.connector.pusher.connection.state = 'disconnected'
    this.connector.pusher.connection.trigger('state_change', { previous: prev, current: 'disconnected' })
  }

  simulateConnect() {
    const prev = this.connector.pusher.connection.state
    this.connector.pusher.connection.state = 'connected'
    this.connector.pusher.connection.trigger('state_change', { previous: prev, current: 'connected' })
  }
}

let echoInstance: Echo<'reverb'> | MockEcho | null = null

export function getEcho(): Echo<'reverb'> | MockEcho {
  if (echoInstance) return echoInstance

  const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false'

  if (useMocks) {
    const mock = new MockEcho()
    echoInstance = mock
    if (typeof window !== 'undefined') {
      ;(window as unknown as { mockEcho: unknown }).mockEcho = mock
    }
    return mock
  }

  const appKey = import.meta.env.VITE_REVERB_APP_KEY ?? 'expedition-key'
  const host = import.meta.env.VITE_REVERB_HOST ?? window.location.hostname
  const port = import.meta.env.VITE_REVERB_PORT ? Number(import.meta.env.VITE_REVERB_PORT) : 8080
  const scheme = import.meta.env.VITE_REVERB_SCHEME ?? 'http'

  if (typeof window !== 'undefined') {
    ;(window as unknown as { Pusher: unknown }).Pusher = PusherClass
  }

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: appKey,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authorizer: (channel: EchoChannel) => {
      return {
        authorize: (socketId: string, callback: (error: Error | null, data: any) => void) => {
          apiClient
            .post('/api/broadcasting/auth', {
              socket_id: socketId,
              channel_name: channel.name,
            })
            .then((response) => {
              callback(null, response.data)
            })
            .catch((error) => {
              callback(error instanceof Error ? error : new Error(String(error)), null)
            })
        },
      }
    },
  })

  if (typeof window !== 'undefined') {
    ;(window as unknown as { echoInstance: unknown }).echoInstance = echoInstance
  }

  return echoInstance
}
