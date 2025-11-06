export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'disconnecting' | 'error'

export interface VoiceError {
  type: 'permission' | 'network' | 'agent' | 'unknown'
  message: string
}

export interface VoiceMessage {
  id: string
  content: string
  timestamp: number
  source: 'user' | 'agent'
}

export interface ConversationConfig {
  agentId: string
  onConnect?: () => void
  onDisconnect?: () => void
  onMessage?: (message: VoiceMessage) => void
  onError?: (error: VoiceError) => void
  onStatusChange?: (status: VoiceStatus) => void
} 