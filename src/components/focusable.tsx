import * as THREE from 'three'
import { useState, Suspense, useRef } from 'react'
import { useCursor, Text, Billboard, Center } from '@react-three/drei'
import { useRoute, useLocation } from 'wouter'
import { suspend } from 'suspend-react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import React from 'react'

// Types
interface InteractiveProps {
  hovered?: boolean
  active?: boolean
  color: string
}

interface FocusableProps {
  id: string
  name: string
  children: React.ReactElement<InteractiveProps>
  position: [number, number, number]
  inspectable?: boolean
}

interface FontModule {
  default: string
}

// Constants
const FADE_SPEED = 8
const LABEL_OFFSET = 0.3
const FONT_SIZE = 0.15
const TEXT_COLOR = '#cccccc' // 80 = 50% opacity in hex

// Font loading
// @ts-ignore
const boldFont = import('/fonts/AlteHaasGroteskBold.ttf') as Promise<FontModule>

// Custom hooks
function useFadeAnimation(isVisible: boolean) {
  const textRef = useRef<THREE.Mesh>(null)
  const targetOpacity = useRef(0)
  const currentOpacity = useRef(0)

  useFrame((_, delta) => {
    if (!textRef.current?.material) return

    targetOpacity.current = isVisible ? 1 : 0
    currentOpacity.current = THREE.MathUtils.lerp(
      currentOpacity.current,
      targetOpacity.current,
      delta * FADE_SPEED
    )

    const material = textRef.current.material as THREE.Material
    material.opacity = currentOpacity.current
    
  })

  return textRef
}

function useFocusableState(id: string) {
  const [, setLocation] = useLocation()
  const [hovered, setHovered] = useState(false)
  const [labelY, setLabelY] = useState(1.2)
  const [routeMatch, paramsRaw] = useRoute('/item/:id')
  const params: Record<string, string> = paramsRaw || {};
  
  const active = params.id === id
  const isVisible = hovered || active

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    setLocation('/item/' + id)
  }

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(true)
  }

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHovered(false)
  }

  const handleCentered = ({ boundingBox }: { boundingBox: THREE.Box3 }) => {
    const height = boundingBox.max.y - boundingBox.min.y
    setLabelY(height / 2 + LABEL_OFFSET)
  }

  return {
    hovered,
    active,
    isVisible,
    labelY,
    handlers: {
      onClick: handleClick,
      onPointerOver: handlePointerOver,
      onPointerOut: handlePointerOut,
      onCentered: handleCentered,
    }
  }
}

// Components
function FocusableLabel({ name, labelY, isVisible }: { 
  name: string
  labelY: number
  isVisible: boolean 
}) {
  const textRef = useFadeAnimation(isVisible)

  return (
    <Billboard raycast={() => null}>
      <Suspense fallback={null}>
        <Text
          ref={textRef}
          font={(suspend(boldFont) as FontModule).default}
          fontSize={FONT_SIZE}
          anchorY="bottom"
          position={[0, labelY, 0]}
          material-toneMapped={false}
          material-transparent={true}
          color={TEXT_COLOR}
        >
          {name}
        </Text>
      </Suspense>
    </Billboard>
  )
}

// Main component
export function Focusable({ 
  id, 
  name, 
  children, 
  inspectable = false, 
  ...props 
}: FocusableProps) {
  const { hovered, active, isVisible, labelY, handlers } = useFocusableState(id)
  const { onPointerOut, onPointerOver, ...centerHandlers } = handlers
  
  useCursor(hovered)

  return (
    <group {...props} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <Center
        name={id}
        userData={{ inspectable }}
        {...centerHandlers}
      >
        {React.cloneElement(children, { hovered, active })}
      </Center>
      
      <FocusableLabel 
        name={name} 
        labelY={labelY} 
        isVisible={isVisible} 
      />
    </group>
  )
} 