import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useVoice } from './VoiceProvider'

interface CallButtonProps {
  className?: string
  color?: string
}

export const CallButton: React.FC<CallButtonProps> = ({ className = '', color = '#7B9089' }) => {
  const { status, error, isConnected, startConversation, stopConversation } = useVoice()
  const isSpeaking = status === 'speaking'

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log('CallButton clicked, status:', status)
    if (isConnected || status === 'connecting' || status === 'disconnecting') {
      await stopConversation()
    } else {
      await startConversation()
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // Helper to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // Get colors and states based on status
  const getButtonState = () => {
    switch (status) {
      case 'connecting':
        return {
          innerScale: 1.25,
          ringColor: hexToRgba(color, 0.6),
          showRipples: false,
          disabled: true
        }
      case 'connected':
      case 'speaking':
      case 'listening':
        return {
          innerScale: 1.40,
          ringColor: color,
          showRipples: isSpeaking,
          disabled: false
        }
      case 'disconnecting':
        return {
          innerScale: 1.2,
          ringColor: hexToRgba(color, 0.6),
          showRipples: false,
          disabled: true
        }
      case 'error':
        return {
          innerScale: 1.02,
          ringColor: '#ef4444',
          showRipples: false,
          disabled: false
        }
      default:
        return {
          innerScale: 1.2,
          ringColor: color,
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
        inset: 0,
        borderRadius: '50%',
        border: `1px solid ${hexToRgba(color, 0.35)}`
      }}
      initial={{ scale: 1.0, opacity: 0 }}
      animate={{ scale: [1.0, 1.3], opacity: [0.5, 0.7, 0] }}
      transition={{ duration: 2.0, repeat: Infinity, ease: 'easeOut', delay, times: [0, 0.4, 1] }}
    />
  )

  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      style={{ 
        pointerEvents: 'auto',
        position: 'relative',
        zIndex: 50
      }}
    >
      {/* Main button container - circular */}
      <motion.button
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        disabled={buttonState.disabled}
        type="button"
        className="relative focus:outline-none"
        style={{
          width: 60,
          height: 60,
          cursor: buttonState.disabled ? 'not-allowed' : 'pointer',
          border: 'none',
          background: 'transparent',
          padding: 0,
          zIndex: 50,
          pointerEvents: 'auto',
          position: 'relative',
          WebkitTapHighlightColor: 'transparent'
        }}
        whileHover={!buttonState.disabled ? { scale: 1.1 } : {}}
        whileTap={!buttonState.disabled ? { scale: 0.9 } : {}}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        initial={{ opacity: 1, scale: 1 }}
      >
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

          {/* Inner circle - white background with label */}
          <motion.div
            className="absolute flex items-center justify-center z-20"
            style={{
              inset: 0,
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              pointerEvents: 'none',
              zIndex: 20
            }}
            animate={{ scale: buttonState.innerScale }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            initial={{ scale: 0.95 }}
          >
            <span 
              className="font-semibold tracking-wide z-10 relative"
              style={{ 
                color: buttonState.ringColor,
                fontSize: '13px',
                pointerEvents: 'none'
              }}
            >
              {(status === 'connected' || status === 'speaking' || status === 'listening') ? 'end' : 'call'}
            </span>
          </motion.div>

          {/* Connecting pulse animation */}
          {status === 'connecting' && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                borderRadius: '50%',
                border: `2px solid ${hexToRgba(color, 0.3)}`,
                zIndex: 10
              }}
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </motion.button>

        {/* Error display */}
        {error && (
          <div
            className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 text-xs text-red-300 bg-black/20 px-3 py-1 rounded-full whitespace-nowrap pointer-events-none"
            style={{ zIndex: 100 }}
          >
            {error.message}
          </div>
        )}
    </div>
  )
} 