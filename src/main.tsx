import { createRoot } from 'react-dom/client'
import { JazzReactProvider } from "jazz-tools/react"
import { AuthProvider } from "jazz-tools/better-auth/auth/react"
import './index.css'
import App from './App.tsx'
import { PondAccount } from './schema'
import { betterAuthClient } from './lib/auth-client'
import { VoiceProvider } from './VoiceChat'

const JAZZ_PEER = import.meta.env.VITE_JAZZ_SYNC_PEER

createRoot(document.getElementById('root')!).render(
  <JazzReactProvider
    AccountSchema={PondAccount}
    sync={{
      peer: JAZZ_PEER,
      when: "always"
    }}
  >
    <AuthProvider betterAuthClient={betterAuthClient}>
      <VoiceProvider config={{ agentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID }}>
        <App />
      </VoiceProvider>
    </AuthProvider>
  </JazzReactProvider>
)
