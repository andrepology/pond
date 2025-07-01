import * as THREE from 'three'
import { useState, forwardRef, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Preload, AccumulativeShadows, RandomizedLight, Sphere as DreiSphere, Environment, Box, MeshTransmissionMaterial, useGLTF } from '@react-three/drei'
import React from 'react'
import { Sheet, Scroll } from '@silk-hq/components'
import { Controls } from './Controls'
import { Focusable } from './components/focusable'
import { CameraRig } from './components/camera-rig'

// Pre-create reusable materials for better performance
const MATERIALS = {
  dodgerblue: new THREE.MeshStandardMaterial({ color: 'dodgerblue' }),
  indianred: new THREE.MeshStandardMaterial({ color: 'indianred' }),
  limegreen: new THREE.MeshStandardMaterial({ color: 'limegreen' }),
  hotpink: new THREE.MeshStandardMaterial({ color: 'hotpink' })
}

// Detent positions and their corresponding percentages
const DETENT_PERCENTAGES = [15, 45, 85]

export default function App() {
  const [activeDetent, setActiveDetent] = useState(0)
  
  // Convert detent index to percentage for CameraRig
  const sheetPercentage = DETENT_PERCENTAGES[activeDetent] || 0

  return (
    <>
      <Canvas shadows camera={{ position: [0, 5, 12], fov: 35 }} eventSource={document.getElementById('root')!} eventPrefix="client">
        {/* Background and Environment */}
        <color attach="background" args={['#f0f0f0']} />
        <Environment preset="city" />

        {/* Lights */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

        {/* Main Scene Content */}
        <group position={[0, -0.5, 0]}>
          <Focusable id="01" name="Glass Sphere" position={[-2, 1, 0]} inspectable>
            <TransmissionSphere />
          </Focusable>
          <Focusable id="02" name="Mind Body Model" position={[0, 1, -2]}>
            <MindBodyModel />
          </Focusable>
          <Focusable id="03" name="Sphere C" position={[2, 1, 0]}>
            <InteractiveSphere color="limegreen" />
          </Focusable>
          
          {/* Shadows and Ground */}
          <AccumulativeShadows temporal frames={60} scale={15}>
            <RandomizedLight amount={8} position={[5, 5, -10]} />
          </AccumulativeShadows>
        </group>

        <CameraRig sheetPercentage={sheetPercentage} />
        <Preload all />
      </Canvas>
      
      {/* Silk Sheet Implementation */}
      <Sheet.Root
        license="non-commercial"
        presented={true}
        activeDetent={activeDetent}
        onActiveDetentChange={setActiveDetent}
      >
        <Sheet.View
          contentPlacement="bottom"
          tracks="bottom"
          detents={["15%", "45%", "85%"]}
          swipe={true}
          swipeOvershoot={true}
        >
          <Sheet.Backdrop className="bg-black/20" />
          <Sheet.Content className="bg-white rounded-t-lg shadow-lg">
            <Sheet.Handle className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3" />
            <div className="p-6">
              <Sheet.Title className="text-lg font-semibold mb-2">Scene Inspector</Sheet.Title>
              <Sheet.Description className="text-gray-600 mb-4">
                Inspect and interact with 3D objects in the scene
              </Sheet.Description>
              <div className="space-y-2">
                <p>Active Detent: {activeDetent}</p>
                <p>Sheet Height: {DETENT_PERCENTAGES[activeDetent]}%</p>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Root>
      
      <Controls onPercentageChange={setActiveDetent} />
    </>
  )
}


interface InteractiveProps {
  hovered?: boolean;
  active?: boolean;
  color: string;
}

const InteractiveSphere = forwardRef<any, InteractiveProps>(({ color, hovered, active, ...props }, ref) => {
  const material = useMemo(() => {
    if (hovered || active) return MATERIALS.hotpink
    return MATERIALS[color as keyof typeof MATERIALS] || new THREE.MeshStandardMaterial({ color })
  }, [color, hovered, active])

  return (
    <DreiSphere {...props} ref={ref} castShadow material={material} />
  )
});

const InteractiveBox = forwardRef<any, InteractiveProps>(({ color, hovered, active, ...props }, ref) => {
  const material = useMemo(() => {
    if (hovered || active) return MATERIALS.hotpink
    return MATERIALS[color as keyof typeof MATERIALS] || new THREE.MeshStandardMaterial({ color })
  }, [color, hovered, active])

  return (
    <Box {...props} ref={ref} castShadow material={material} />
  )
});

const TransmissionSphere = forwardRef<any, Omit<InteractiveProps, 'color'>>((props, ref) => {
  return (
    <DreiSphere {...props} ref={ref} castShadow>
      <MeshTransmissionMaterial
        // performance
        samples={6}
        resolution={256}

        transmission={1}
        roughness={0}
        thickness={0.2}
        ior={1.5}
        chromaticAberration={0.02}
        anisotropy={0.1}
        distortion={0.5}
        distortionScale={0.5}
        temporalDistortion={0}
      />
    </DreiSphere>
  )
});

const MindBodyModel = forwardRef<any, Omit<InteractiveProps, 'color'>>((props, ref) => {
  const { scene } = useGLTF('/models/mindbody.glb')
  
  // Apply standard material to all meshes in the model
  const clonedScene = useMemo(() => {
    const clone = scene.clone()
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({ 
          color: 'gray',
          metalness: 0.1,
          roughness: 0.7
        })
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    return clone
  }, [scene])

  return <primitive {...props} ref={ref} object={clonedScene} />
});
