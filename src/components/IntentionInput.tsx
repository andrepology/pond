import * as THREE from 'three'
import React, { useEffect, useMemo, useRef } from 'react'
import { useAccount } from 'jazz-tools/react'
import type { Signal } from '@preact/signals-core'
import { Input } from '@react-three/uikit'
import { useBillboard } from '../hooks/useBillboard'
import { PondAccount, Intention } from '../schema'

interface IntentionInputProps {
  hasInputSignal?: Signal<boolean>
}

export const IntentionInput: React.FC<IntentionInputProps> = ({ hasInputSignal }) => {
  const inputGroupRef = useRef<THREE.Group>(null)

  // Load account with intentions list (shallow)
  const { me } = useAccount(PondAccount, {
    resolve: {
      root: { intentions: true }
    }
  })

  // Find current todo intention (only one exists at a time)
  const currentTodoIntention = useMemo(() => {
    if (!me?.root.intentions) return null
    return me.root.intentions.find(intention => intention && intention.status === "todo") || null
  }, [me?.root.intentions])

  // Billboard the input to face the camera (more weighty than markers)
  useBillboard(inputGroupRef, {
    damping: 0.98,      // Higher damping = more inertia/weight
    noiseSpeed: 0.3,    // Slower noise oscillation
    noiseScale: 0.05      // Reduced noise amplitude
  })

  // Handle input changes - create todo intention if needed, then update title
  const handleInputChange = (newValue: string) => {
    if (!me) return

    let intention = currentTodoIntention

    // Create new todo intention if none exists and user is typing
    if (!intention && newValue.trim().length > 0) {

      intention = Intention.create({
        title: newValue,
        status: "todo",
        createdAt: Date.now(),
        updatedAt: Date.now()
      }, { owner: me.$jazz.owner })

      // Add to user's intentions list
      me.root.intentions.$jazz.push(intention)
    }
    // Update existing intention's title
    else if (intention) {
      intention.$jazz.set("title", newValue)
      intention.$jazz.set("updatedAt", Date.now())
    }
  }

  // Update signal when input changes (now based on intention title)
  useEffect(() => {
    if (hasInputSignal) {
      const hasInput = currentTodoIntention?.title?.trim().length > 0
      hasInputSignal.value = Boolean(hasInput)
    }
  }, [currentTodoIntention?.title, hasInputSignal])

  return (
    <group ref={inputGroupRef} renderOrder={-2}>
      <Input
        value={currentTodoIntention?.title || ''}
        onValueChange={handleInputChange}
        placeholder="what is your intention?"
        width={200}
        sizeX={2}
        sizeY={0.75}
        fontSize={12}
        fontWeight="bold"
        // @ts-ignore
        multiline={true}
        opacity={0.4}
        letterSpacing={"-0.125rem"}
        borderRadius={12}
        padding={12}
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
        textAlign="center"
        zIndex={1000}
        caretBorderRadius={0.5}
        selectionColor="rgba(255,255,255,0.8)"
      />
    </group>
  )
}

export default IntentionInput
