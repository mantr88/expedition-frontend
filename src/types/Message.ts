import type { User } from './User'

export interface Reaction {
  emoji: string
  count: number
  reacted_by_me: boolean
  users?: string[]
}

export interface Attachment {
  id: number
  url: string
  thumb_url: string | null
  mime: string
  size: number
  original_name: string
}

export interface Message {
  id: number
  client_message_id: string
  channel_id: number
  user: User
  parent_id: number | null
  body_raw: string
  body_html: string
  type: 'text' | 'system' | 'file'
  edited_at: string | null
  deleted_at: string | null
  created_at: string
  reactions: Reaction[]
  attachments: Attachment[]
  reply_count: number
  last_reply_at: string | null
  sending?: boolean
  failed?: boolean
}
