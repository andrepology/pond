# Pond Voice Call System Architecture

## Overview

Pond implements a real-time voice conversation system with ElevenLabs AI agents, integrated into a 3D React Three Fiber environment. The system uses WebRTC for low-latency audio streaming and persists conversations to Jazz's distributed data store.

## Core Components

### VoiceProvider (`src/VoiceChat/VoiceProvider.tsx`)

**Context Provider Architecture:**
- React Context managing global voice state across the application
- Uses `@elevenlabs/react` hook for ElevenLabs integration
- Integrates with Jazz account system for user data and conversation persistence

**Key Features:**
- **Dynamic Variables**: Injects user context (name, world model, recent conversations, active intentions) into ElevenLabs sessions
- **Message Accumulation**: Captures full conversation transcripts during calls
- **State Management**: 7-state system (`idle`, `connecting`, `connected`, `speaking`, `listening`, `disconnecting`, `error`)
- **Jazz Persistence**: Automatically creates `Conversation` covalue on call completion

**Data Flow:**
```
Jazz User Data → Dynamic Variables → ElevenLabs Agent → Real-time Audio ↔ Message Stream → Jazz Conversation
```

### CallButton (`src/VoiceChat/CallButton.tsx`)

**UI Component:**
- Squircle-based button with spring animations and ripple effects
- Status-driven visual states with color-coded feedback
- Positioned fixed at bottom center of screen (z-index: 1000)

**Interaction States:**
- **idle**: "call innio" (accent color, no ripples)
- **connecting**: Pulsing timestamp color, disabled
- **connected/speaking/listening**: "end call" (accent color, animated ripples)
- **disconnecting**: Timestamp color, disabled
- **error**: Red with error tooltip

### VoiceIndicator (Removed)

Previously provided status visualization with animated dots and waveform. Currently integrated into CallButton's ripple effects.

## Integration Architecture

### App-Level Setup (`src/main.tsx`)

```tsx
<JazzReactProvider>
  <AuthProvider>
    <VoiceProvider config={{ agentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID }}>
      <App />
    </VoiceProvider>
  </AuthProvider>
</JazzReactProvider>
```

### UI Positioning (`src/App.tsx`)

CallButton positioned as overlay:
```tsx
<div style={{
  position: 'fixed',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1000
}}>
  <CallButton />
</div>
```

## Data Schema

### Conversation Persistence (`src/schema/index.ts`)

```typescript
export const Conversation = co.map({
  // ElevenLabs metadata
  elevenLabsId: z.string(),     // Populated later via API
  agentId: z.string(),          // Immediate
  startTime: z.number(),        // Immediate
  endTime: z.number(),          // Populated later
  callSuccessful: z.boolean(),  // Populated later
  summary: z.string(),          // Populated later

  // Core data
  messages: co.list(ConversationMessage), // Immediate transcript
  intentionRef: co.optional(Intention),   // User-assigned later
  userReflection: z.string(),             // User-added later

  // Metadata
  createdAt: z.number() // Immediate
});
```

## Session Lifecycle

### Call Initiation
1. **Permission Request**: `navigator.mediaDevices.getUserMedia({ audio: true })`
2. **Dynamic Variables**: Compile user context from Jazz account
3. **Session Start**: `conversation.startSession({ agentId, dynamicVariables })`
4. **State Transition**: `connecting` → `connected`

### Active Conversation
1. **Message Handling**: Bidirectional audio with ElevenLabs WebRTC
2. **Status Updates**: `connected` ↔ `speaking`/`listening` (auto-reset after 1.2s)
3. **Volume Monitoring**: Real-time audio level tracking
4. **Transcript Accumulation**: All messages stored in global refs

### Call Termination
1. **Session End**: `conversation.endSession()`
2. **State Cleanup**: Reset volume, clear timeouts
3. **Jazz Persistence**: Create Conversation covalue with available data
4. **Data Reset**: Clear global message refs and call state

## Security Model

**Current Implementation:**
- API key stored as environment variable (`VITE_ELEVENLABS_AGENT_ID`)
- Client-side key exposure (planned to be replaced with backend signed URLs)
- Microphone permission required for session initiation

**Planned Enhancement:**
- Backend proxy for conversation data retrieval
- Signed URL pattern for conversation initiation
- Server-side API key management

## Error Handling

**Error Types:**
- `permission`: Microphone access denied
- `network`: Connection failures
- `agent`: ElevenLabs agent issues
- `unknown`: Unspecified errors

**Recovery Strategies:**
- Graceful degradation (calls work even if persistence fails)
- User-friendly error messages in button tooltip
- Automatic status reset on disconnect

## Performance Considerations

**Optimization Features:**
- Global refs for cross-component state sharing
- Message accumulation without re-renders
- Activity timeout auto-reset (1.2s)
- Minimal re-render footprint

**Memory Management:**
- Global message refs persist across component remounts
- Automatic cleanup on disconnect
- No memory leaks in long-running sessions

## Future Enhancements

**Short-term:**
- Backend API integration for full conversation data
- Conversation history UI
- Post-call user reflections

**Long-term:**
- Multi-agent conversations
- Voice activity detection
- Conversation branching/analysis
- Integration with intention tracking

