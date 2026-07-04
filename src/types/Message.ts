import type { User } from './User'

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
  reactions: unknown[]
  attachments: unknown[]
  reply_count: number
  last_reply_at: string | null
  sending?: boolean
  failed?: boolean
}
