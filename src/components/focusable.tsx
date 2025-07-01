import * as THREE from 'three'
import { useState, Suspense } from 'react'
import { useCursor, Text, Billboard, Center } from '@react-three/drei'
import { useRoute, useLocation } from 'wouter'
import { suspend } from 'suspend-react'
import React from 'react'

type FontModule = { default: string }

const regular = import('@pmndrs/assets/fonts/inter_regular.woff') as Promise<FontModule>
const medium = import('@pmndrs/assets/fonts/inter_bold.woff') as Promise<FontModule>

interface InteractiveProps {
  hovered?: boolean;
  active?: boolean;
  color: string;
}

interface FocusableProps {
  id: string;
  name: string;
  children: React.ReactElement<InteractiveProps>;
  position: [number, number, number];
  inspectable?: boolean;
}

export function Focusable({ id, name, children, inspectable = false, ...props }: FocusableProps) {
  const [, setLocation] = useLocation()
  const [hovered, hover] = useState(false)
  const [labelY, setLabelY] = useState(1.2)
  const [, params] = useRoute('/item/:id')
  const active = params?.id === id
  useCursor(hovered)

  const handleCentered = ({ boundingBox }: { boundingBox: THREE.Box3 }) => {
    const height = boundingBox.max.y - boundingBox.min.y
    setLabelY(height / 2 + 0.2) // 0.2 offset from the top
  }

  return (
    <group {...props}>
      <Center
        name={id}
        userData={{ inspectable }}
        onCentered={handleCentered}
        onDoubleClick={(e) => (e.stopPropagation(), setLocation('/item/' + id))}
        onPointerOver={(e) => (e.stopPropagation(), hover(true))}
        onPointerOut={(e) => (e.stopPropagation(), hover(false))}>
        {/* Pass hover and active state to children */}
        {React.cloneElement(children, { hovered, active })}
      </Center>
      {(hovered || active) && (
        <Billboard>
          <Suspense fallback={null}>
            <Text
              font={(suspend(medium) as FontModule).default}
              fontSize={0.25}
              anchorY="bottom"
              position={[0, labelY, 0]}
              material-toneMapped={false}>
              {name}
            </Text>
            <Text
              font={(suspend(regular) as FontModule).default}
              fontSize={0.1}
              anchorY="top"
              position={[0, labelY, 0]}
              material-toneMapped={false}>
              /{id}
            </Text>
          </Suspense>
        </Billboard>
      )}
    </group>
  )
} 