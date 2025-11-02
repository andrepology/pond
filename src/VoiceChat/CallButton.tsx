import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useVoice } from './VoiceProvider'
import { Squircle } from '../components/Squircle'

interface CallButtonProps {
  className?: string
}

export const CallButton: React.FC<CallButtonProps> = ({ className = '' }) => {
  const { status, error, isConnected, volume, startConversation, stopConversation } = useVoice()

  const OUTER_RADIUS = 18
  const INNER_RADIUS = 15

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
          innerColor: 'var(--timestamp-color)',
          showRipples: false,
          disabled: true
        }
      case 'connected':
      case 'speaking':
      case 'listening':
        return {
          innerScale: 0.90,
          innerColor: 'var(--default-accent)',
          showRipples: true,
          disabled: false
        }
      case 'disconnecting':
        return {
          innerScale: 0.95,
          innerColor: 'var(--timestamp-color)',
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
          innerColor: 'var(--default-accent)',
          showRipples: false,
          disabled: false
        }
    }
  }

  const buttonState = getButtonState()

  // Ripple component for call state (CSS ring that scales out from inner)
  const Ripple = ({ delay = 0 }: { delay?: number }) => {
    // Volume-driven animation parameters
    const baseScale = 1.02
    const maxScale = Math.max(1.05, baseScale + volume * 0.3) // 1.05 to 1.32 based on volume
    const baseOpacity = Math.max(0.1, volume * 0.3) // 0.1 to 0.3 based on volume
    const peakOpacity = Math.max(0.2, volume * 0.5) // 0.2 to 0.7 based on volume
    const duration = Math.max(1.2, 3.0 - volume * 1.5) // 3.0s to 1.5s based on volume

    return (
      <motion.div
        className="absolute inset-1 pointer-events-none z-10"
        style={{
          borderRadius: `${INNER_RADIUS}px`,
          border: '1px solid rgba(255, 255, 255, 0.35)'
        }}
        initial={{ scale: baseScale, opacity: 0 }}
        animate={{
          scale: [baseScale, maxScale],
          opacity: [baseOpacity, peakOpacity, 0]
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'easeOut',
          delay,
          times: [0, 0.4, 1]
        }}
      />
    )
  }

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
        {/* Main button container */}
        <motion.button
          onClick={handleClick}
          disabled={buttonState.disabled}
          className="relative mx-auto w-60 h-14 focus:outline-none"
        >
          {/* Outer shape - Squircle with subtle backdrop + inset outline to avoid clipping */}
          <div className="absolute inset-0">
            <Squircle radius={OUTER_RADIUS} className="w-full h-full" >
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.10)'
                }}
              />
            </Squircle>
          </div>

          {/* Ripples during call (emanate from inner, beneath label) */}
          <AnimatePresence>
            {buttonState.showRipples && (
              <>
                <Ripple delay={0} />
                <Ripple delay={0.7} />
                <Ripple delay={1.4} />
              </>
            )}
          </AnimatePresence>

          {/* Inner shape - solid color with label (only inner scales) */}
          <motion.div
            className="absolute inset-1 cursor-pointer flex items-center justify-center z-20"
            animate={{ scale: buttonState.innerScale }}
            whileHover={!buttonState.disabled ? { scale: buttonState.innerScale * 1.05 } : {}}
            whileTap={!buttonState.disabled ? { scale: buttonState.innerScale * 0.90 } : {}}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            initial={{ scale: 0.95 }}
          >
            <Squircle radius={INNER_RADIUS} className="w-full h-full flex items-center justify-center" >
              <div className="absolute inset-0" style={{ backgroundColor: buttonState.innerColor }} />
              <span className={`font-semibold tracking-wide text-white ${
                (status === 'connected' || status === 'speaking' || status === 'listening') ? 'text-lg md:text-xl' : 'text-base'
              }`}>
                {(status === 'connected' || status === 'speaking' || status === 'listening') ? 'end call' : 'call innio'}
              </span>
            </Squircle>
          </motion.div>

          {/* Connecting pulse animation - use inset outline instead of border to prevent clipping */}
          {status === 'connecting' && (
            <motion.div
              className="absolute inset-0"
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Squircle radius={OUTER_RADIUS} className="w-full h-full">
                <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)' }} />
              </Squircle>
            </motion.div>
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