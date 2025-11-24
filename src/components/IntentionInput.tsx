import * as THREE from 'three'
import React, { useEffect, useMemo, useRef } from 'react'
import { useAccount } from 'jazz-tools/react'
import type { Signal } from '@preact/signals-core'
import { Input, Text } from '@react-three/uikit'
import { useBillboard } from '../hooks/useBillboard'
import { PondAccount, Intention } from '../schema'

interface IntentionInputProps {
  hasInputSignal?: Signal<boolean>
}

export const IntentionInput: React.FC<IntentionInputProps> = ({ hasInputSignal }) => {
  const inputGroupRef = useRef<THREE.Group>(null)

  // Load account with intentions list - deep load each intention
  const { me } = useAccount(PondAccount, {
    resolve: {
      root: { intentions: { $each: true } }
    }
  })

  // Find current active intention with a timer
  const activeIntention = useMemo(() => {
    if (!me?.root.intentions) return null
    return me.root.intentions.find(
      intention => intention && intention.status === "active" && intention.timerDuration
    ) || null
  }, [me?.root.intentions])

  // Billboard the display to face the camera (more weighty than markers)
  useBillboard(inputGroupRef, {
    damping: 0.98,      // Higher damping = more inertia/weight
    noiseSpeed: 0.3,    // Slower noise oscillation
    noiseScale: 0.05      // Reduced noise amplitude
  })

  // Update signal based on whether there's an active intention with timer
  useEffect(() => {
    if (hasInputSignal) {
      hasInputSignal.value = Boolean(activeIntention)
    }
  }, [activeIntention, hasInputSignal])

  // Don't render if no active intention or no timer
  if (!activeIntention) {
    return null
  }

  return (
    <group ref={inputGroupRef} renderOrder={-2}>
      <Input
        disabled={true}
        width={200}
        sizeX={2}
        sizeY={0.75}
        fontSize={8}
        fontWeight="bold"
        opacity={0.40}
        color="#F6F5F3"
        letterSpacing={"-0.125rem"}
        borderRadius={12}
        padding={12}
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
        textAlign="center"
        zIndex={1000}
        value={activeIntention.title}
      />
  
    </group>
  )
}

export default IntentionInput
