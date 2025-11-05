import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useVoice } from './VoiceProvider'

interface CallButtonProps {
  className?: string
}

export const CallButton: React.FC<CallButtonProps> = ({ className = '' }) => {
  const { status, error, isConnected, isSpeaking, startConversation, stopConversation } = useVoice()

  const handleClick = async () => {
    if (isConnected || status === 'connecting' || status === 'disconnecting') {
      await stopConversation()
    } else {
      await startConversation()
    }
  }

  // Get colors and states based on status
  const getButtonState = () => {
    switch (status) {
      case 'connecting':
        return {
          innerScale: 0.89,
          innerColor: 'rgba(123, 144, 137, 0.6)',
          showRipples: false,
          disabled: true
        }
      case 'connected':
      case 'speaking':
      case 'listening':
        return {
          innerScale: 0.90,
          innerColor: '#7B9089',
          showRipples: isSpeaking,
          disabled: false
        }
      case 'disconnecting':
        return {
          innerScale: 0.95,
          innerColor: 'rgba(123, 144, 137, 0.6)',
          showRipples: false,
          disabled: true
        }
      case 'error':
        return {
          innerScale: 0.95,
          innerColor: '#ef4444',
          showRipples: false,
          disabled: false
        }
      default:
        return {
          innerScale: 0.99,
          innerColor: '#7B9089',
          showRipples: false,
          disabled: false
        }
    }
  }

  const buttonState = getButtonState()

  // Ripple component for call state
  const Ripple = ({ delay = 0 }: { delay?: number }) => (
    <motion.div
      className="absolute pointer-events-none z-10"
      style={{
        inset: 4,
        borderRadius: '50%',
        border: '1px solid rgba(255, 255, 255, 0.35)'
      }}
      initial={{ scale: 1.02, opacity: 0 }}
      animate={{ scale: [1.02, 1.16], opacity: [0.35, 0.6, 0] }}
      transition={{ duration: 2.0, repeat: Infinity, ease: 'easeOut', delay, times: [0, 0.4, 1] }}
    />
  )

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        className={`relative w-full pointer-events-auto flex items-center justify-center ${className}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
          duration: 0.3
        }}
      >
        {/* Main button container - circular */}
        <motion.button
          onClick={handleClick}
          disabled={buttonState.disabled}
          className="relative focus:outline-none"
          style={{
            width: 80,
            height: 80,
          }}
        >
          {/* Outer circle - subtle backdrop */}
          <div 
            className="absolute inset-0"
            style={{
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.10)'
            }}
          />

          {/* Ripples during call */}
          <AnimatePresence>
            {buttonState.showRipples && (
              <>
                <Ripple delay={0} />
                <Ripple delay={0.7} />
                <Ripple delay={1.4} />
              </>
            )}
          </AnimatePresence>

          {/* Inner circle - solid color with label */}
          <motion.div
            className="absolute cursor-pointer flex items-center justify-center z-20"
            style={{
              inset: 4,
              borderRadius: '50%',
              backgroundColor: buttonState.innerColor
            }}
            animate={{ scale: buttonState.innerScale }}
            whileHover={!buttonState.disabled ? { scale: buttonState.innerScale * 1.05 } : {}}
            whileTap={!buttonState.disabled ? { scale: buttonState.innerScale * 0.90 } : {}}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            initial={{ scale: 0.95 }}
          >
            <span className="font-semibold tracking-wide text-white text-xs z-10 relative">
              {(status === 'connected' || status === 'speaking' || status === 'listening') ? 'end' : 'call'}
            </span>
          </motion.div>

          {/* Connecting pulse animation */}
          {status === 'connecting' && (
            <motion.div
              className="absolute inset-0"
              style={{
                borderRadius: '50%',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)'
              }}
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </motion.button>

        {/* Error display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-xs text-red-300 bg-black/20 px-3 py-1 rounded-full whitespace-nowrap"
            >
              {error.message}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
} 