import React, { createContext, useContext, useCallback, useState, useEffect, useRef, useMemo } from 'react'
import { useConversation } from '@elevenlabs/react'
import { useAccount } from 'jazz-tools/react'
import { co } from 'jazz-tools'
import type { VoiceStatus, VoiceError, VoiceMessage, ConversationConfig } from './types'
import { PondAccount, Conversation, ConversationMessage } from '../schema'
import { processConversationAI } from '../services/conversationAIProcessing'

// Global refs that persist across component re-mounts
const globalMessagesRef = { current: [] as VoiceMessage[] }
const globalCallStartTimeRef = { current: null as number | null }

interface VoiceContextValue {
  status: VoiceStatus
  error: VoiceError | null
  isConnected: boolean
  volume: number // 0-1, current audio volume level
  startConversation: () => Promise<void>
  stopConversation: () => Promise<void>
  messages: VoiceMessage[]
}

const VoiceContext = createContext<VoiceContextValue | undefined>(undefined)

interface VoiceProviderProps {
  children: React.ReactNode
  config: ConversationConfig
}

export const VoiceProvider: React.FC<VoiceProviderProps> = ({ children, config }) => {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [error, setError] = useState<VoiceError | null>(null)
  const [volume, setVolume] = useState<number>(0)

  // Local ref for timeout (doesn't need to persist)
  const activityResetTimeoutRef = useRef<number | null>(null)

  // Use global refs for persistence data
  const messages = globalMessagesRef.current
  const callStartTime = globalCallStartTimeRef.current

  // Access Jazz user data with deep loading for conversations and intentions
  const { me } = useAccount(PondAccount, {
    resolve: {
      profile: true,
      root: {
        conversations: { $each: true }, // Load all conversations
        intentions: { $each: true },    // Load all intentions
        fieldNotes: { $each: true },     // Load all field notes for AI processing
        worldModel: true                // Load world model
      }
    }
  })

  // Helper function to get recent conversations (last 5)
  const getRecentConversations = useCallback(() => {
    if (!me?.root?.conversations) {
      return []
    }

    // Get last 5 conversations, sorted by start time
    const recentConversations = me.root.conversations
      .filter((conv): conv is NonNullable<typeof conv> => conv != null)
      .sort((a, b) => (b?.startTime ?? 0) - (a?.startTime ?? 0))
      .slice(0, 5)
      .map(conv => ({
        id: conv.$jazz.id,
        content: conv.summary || '',
        createdAt: new Date(conv.startTime).toISOString().split('T')[0] // Just the date
      }))

    return recentConversations
  }, [me?.root?.conversations])

  // Helper function to format dynamic variables
  const getDynamicVariables = useCallback(() => {
    const variables: Record<string, any> = {}

    // Current timestamp - formatted as readable date/time
    const now = new Date();
    variables.now_timestamp = now.toLocaleString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // User name
    if (me?.profile?.name) {
      variables.first_name = me.profile.name
    }

    // User pronouns
    if (me?.profile?.pronouns) {
      variables.pronouns = me.profile.pronouns
    }

    // User bio (not in current schema, but could be added later)
    // if (me?.profile?.bio) {
    //   variables.user_bio = me.profile.bio
    // }

    // World model - co.plainText() content is accessed directly as string
    if (me?.root?.worldModel) {
      variables.world_model = me.root.worldModel.toString()
    }

    // Recent conversations
    const recentConversations = getRecentConversations()
    if (recentConversations.length > 0) {
      variables.recent_conversations = recentConversations
        .map(conv => `${conv.createdAt}: ${conv.content}`)
        .join('\n\n')
    }

    // Active intentions
    const activeIntentions = me?.root?.intentions?.filter(i => i?.status === 'active' || i?.status === 'todo') || []
    if (activeIntentions.length > 0) {
      variables.current_intention = activeIntentions
        .filter(i => i != null)
        .map(i => i.title)
        .join(', ')
    }

    // Intention count
    const intentionCount = Array.isArray(me?.root?.intentions)
      ? me.root.intentions.filter(Boolean).length
      : 0
    variables.intention_count = intentionCount

    // Conversation count
    const conversationCount = Array.isArray(me?.root?.conversations)
      ? me.root.conversations.filter(Boolean).length
      : 0
    variables.conversation_count = conversationCount

    return variables
  }, [me?.profile?.name, me?.profile?.pronouns, me?.root?.worldModel, getRecentConversations, me?.root?.intentions, me?.root?.conversations])

  // Persist conversation to Jazz when call ends
  const persistConversationToJazz = (endTime: number) => {
    // Get current values from global refs
    const currentCallStartTime = globalCallStartTimeRef.current
    const currentMessages = globalMessagesRef.current

    if (!me?.root?.conversations || !currentCallStartTime || currentMessages.length === 0) {
      return
    }

    try {
      // Create Conversation covalue with empty messages list
      const conversation = Conversation.create({
        agentId: config.agentId,
        startTime: currentCallStartTime,
        endTime: endTime,
        messages: co.list(ConversationMessage).create([]),
        createdAt: Date.now(),
      })

      // Add messages to the conversation
      currentMessages.forEach((msg) => {
        const conversationMessage = ConversationMessage.create({
          role: msg.source === 'agent' ? 'agent' : 'user',
          content: msg.content,
          timestamp: msg.timestamp
        })
        conversation.messages.$jazz.push(conversationMessage)
      })

      // Add to user's conversations list
      me.root.conversations.$jazz.push(conversation)

      // Trigger AI processing after successful save (fire and forget)
      processConversationAI(conversation.$jazz.id, me).catch(error => {
        console.warn('AI processing failed:', error)
        // Don't break the UI - conversation still worked
      })

    } catch (error) {
      console.error('Failed to persist conversation:', error)
      // Don't break the UI - conversation still worked
    }
  }

  // Initialize ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      setStatus('connected')
      setError(null)
      config.onConnect?.()
    },
    onDisconnect: () => {
      setStatus('idle')
      setVolume(0) // Reset volume on disconnect

      // Persist conversation to Jazz - access global refs directly
      const currentCallStartTime = globalCallStartTimeRef.current
      const currentMessages = globalMessagesRef.current

      if (currentCallStartTime && currentMessages.length > 0) {
        persistConversationToJazz(Date.now())
      }

      // Reset call state
      globalCallStartTimeRef.current = null
      globalMessagesRef.current = []

      config.onDisconnect?.()
    },
    onVolumeUpdate: (volumeLevel: number) => {
      console.log('Volume update:', volumeLevel)
      setVolume(volumeLevel)
    },
    onMessage: (message: any) => {
      // Create our message format - be defensive about the message structure
      const voiceMessage: VoiceMessage = {
        id: Date.now().toString(),
        content: (typeof message === 'string' ? message : message?.message || message?.content || ''),
        timestamp: Date.now(),
        source: (message?.source === 'ai' || message?.source === 'agent') ? 'agent' : 'user'
      }


      const newMessages = [...globalMessagesRef.current, voiceMessage]
      globalMessagesRef.current = newMessages
      // Update high-level status to reflect current activity
      if (voiceMessage.source === 'agent') {
        setStatus('speaking')
      } else {
        setStatus('listening')
      }
      // Reset back to connected shortly after activity ends
      if (activityResetTimeoutRef.current) {
        window.clearTimeout(activityResetTimeoutRef.current)
      }
      activityResetTimeoutRef.current = window.setTimeout(() => {
        setStatus('connected')
      }, 1200)
      config.onMessage?.(voiceMessage)
    },
    onError: (errorData: any) => {
      // Parse error into our format - be defensive about error structure
      const errorMessage = typeof errorData === 'string' 
        ? errorData 
        : errorData?.message || errorData?.error || 'An unknown error occurred'
      
      const voiceError: VoiceError = {
        type: 'unknown',
        message: errorMessage
      }
      
      // Determine error type based on message content
      if (errorMessage.includes('permission')) {
        voiceError.type = 'permission'
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        voiceError.type = 'network'
      } else if (errorMessage.includes('agent')) {
        voiceError.type = 'agent'
      }
      
      setError(voiceError)
      setStatus('error')
      config.onError?.(voiceError)
    },
  })

  // Update status when conversation state changes
  useEffect(() => {
    config.onStatusChange?.(status)
  }, [status, config])


  const startConversation = useCallback(async () => {
    try {
      setStatus('connecting')
      setError(null)
      globalCallStartTimeRef.current = Date.now() // Track when call started

      // Request microphone permission first (ElevenLabs best practice)
      await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Get dynamic variables from Jazz data
      const dynamicVariables = getDynamicVariables()
      
      // Start the ElevenLabs session with dynamic variables
      await conversation.startSession({
        agentId: config.agentId,
        connectionType: "webrtc",
        dynamicVariables: dynamicVariables
      })
      
      // Status will be updated via onConnect callback
    } catch (error) {
      let voiceError: VoiceError
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.message.includes('permission')) {
          voiceError = {
            type: 'permission',
            message: 'Microphone permission is required to start a voice conversation.'
          }
        } else {
          voiceError = {
            type: 'unknown',
            message: error.message
          }
        }
      } else {
        voiceError = {
          type: 'unknown',
          message: 'Failed to start conversation'
        }
      }
      
      setError(voiceError)
      setStatus('error')
      config.onError?.(voiceError)
    }
  }, [conversation, config, me, getDynamicVariables])

  const stopConversation = useCallback(async () => {
    try {
      setStatus('disconnecting')
      await conversation.endSession()
      // Status will be updated to 'idle' via onDisconnect callback
    } catch (error) {
      // Even if ending fails, reset to idle state
      setStatus('idle')
    }
  }, [conversation])

  const value: VoiceContextValue = {
    status,
    error,
    isConnected: status === 'connected' || status === 'speaking' || status === 'listening',
    volume,
    startConversation,
    stopConversation,
    messages,
  }

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  )
}

export const useVoice = () => {
  const context = useContext(VoiceContext)
  if (context === undefined) {
    throw new Error('useVoice must be used within a VoiceProvider')
  }
  return context
} 

