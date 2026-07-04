import type { User } from './User'

export interface Channel {
  id: number
  name: string
  type: 'public' | 'private' | 'dm'
  topic: string | null
  archived_at: string | null
  members_count: number
  unread_count?: number
  my_membership?: {
    role: 'owner' | 'admin' | 'member'
    last_read_message_id: number | null
    notifications_level: 'all' | 'mentions' | 'mute'
  }
}

export interface ChannelMember {
  user: User
  role: 'owner' | 'admin' | 'member'
  last_read_message_id: number | null
  notifications_level: 'all' | 'mentions' | 'mute'
}
