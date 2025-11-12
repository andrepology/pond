import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'

interface SceneInitializerProps {
  onReady: () => void
  children: React.ReactNode
}

export function SceneInitializer({ onReady, children }: SceneInitializerProps) {
  const { gl, scene, camera } = useThree()
  const hasCompiledRef = useRef(false)
  const frameCountRef = useRef(0)

  // Wait 2 frames for scene to settle, then compile and signal ready
  useFrame(() => {
    if (!hasCompiledRef.current) {
      frameCountRef.current++
      
      // After 2 frames, compile shaders and signal ready
      if (frameCountRef.current === 2) {
        console.log('[SceneInitializer] Compiling shaders...')
        gl.compile(scene, camera)
        console.log('[SceneInitializer] Signaling ready')
        hasCompiledRef.current = true
        
        // Use setTimeout to ensure we're outside the render loop
        setTimeout(() => {
          onReady()
        }, 0)
      }
    }
  })

  // Render children immediately to allow scene setup
  return <>{children}</>
}

