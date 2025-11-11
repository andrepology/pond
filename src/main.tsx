import { createRoot } from 'react-dom/client'
import { JazzReactProvider } from "jazz-tools/react"
import { AuthProvider } from "jazz-tools/better-auth/auth/react"
import './index.css'
import App from './App.tsx'
import { PondAccount } from './schema'
import { betterAuthClient } from './lib/auth-client'
import { VoiceProvider } from './VoiceChat'

const JAZZ_PEER = import.meta.env.VITE_JAZZ_SYNC_PEER

// Fix iOS PWA viewport calculation race condition
if ('standalone' in navigator && (navigator as any).standalone) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const root = document.getElementById('root')
      if (root) {
        // Force reflow without visual flash
        const current = root.style.transform
        root.style.transform = 'translateZ(0)'
        root.offsetHeight // Trigger layout recalculation
        root.style.transform = current
      }
    }, 50)
  })
}

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
