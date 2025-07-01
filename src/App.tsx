import * as THREE from 'three'
import { useState, forwardRef, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Preload, AccumulativeShadows, RandomizedLight, Sphere as DreiSphere, Environment, Box, MeshTransmissionMaterial, useGLTF } from '@react-three/drei'
import { Perf } from 'r3f-perf'
import React from 'react'
import { Sheet } from './Sheet'
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

// Preload the GLB model for better performance
useGLTF.preload('/models/mindbody.glb')

export default function App() {
  const [sheetPercentage, setSheetPercentage] = useState(0)

  return (
    <>
      <Canvas shadows="soft" camera={{ position: [0, 5, 12], fov: 35 }} eventSource={document.getElementById('root')!} eventPrefix="client">
        <Perf position="top-left" />

        <color attach="background" args={['#f0f0f0']} />
        <primitive attach="fog" object={new THREE.FogExp2('#f0f0f0', 0.01)} />
        <ambientLight intensity={Math.PI / 4} />
        
        <Environment preset="city" />

        {/* Lights */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

        {/* Main Scene Content */}
        <group position={[0, -0.5, 0]}>
          <Focusable id="01" name="Glass Sphere" position={[-2, 1, 0]} inspectable>
            <TransmissionSphere />
          </Focusable>
          <Focusable id="02" name="mindbody" position={[0, 1, -2]}>
            <InteractiveMindbody color="indianred" />
          </Focusable>
          <Focusable id="03" name="Sphere C" position={[2, 1, 0]}>
            <InteractiveSphere color="limegreen" />
          </Focusable>
          
          {/* Shadows and Ground */}
          <AccumulativeShadows temporal frames={60} blend={200} alphaTest={0.9} color="#f0f0f0" colorBlend={1} opacity={0.5} scale={20}>
            <RandomizedLight radius={10} ambient={0.5} intensity={Math.PI} position={[2.5, 8, -2.5]} bias={0.001} />
          </AccumulativeShadows>

        </group>

        <CameraRig sheetPercentage={sheetPercentage} />
        <Preload all />
      </Canvas>
      <Sheet sheetPercentage={sheetPercentage} />
      <Controls onPercentageChange={setSheetPercentage} />
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

const InteractiveMindbody = forwardRef<any, InteractiveProps>(({ color, hovered, active, ...props }, ref) => {
  const { scene } = useGLTF('/models/mindbody.glb')
  
  const material = useMemo(() => {
    if (hovered || active) return MATERIALS.hotpink
    return MATERIALS[color as keyof typeof MATERIALS] || new THREE.MeshStandardMaterial({ color })
  }, [color, hovered, active])

  const mesh = scene.children[0] as THREE.Mesh

  return (
    <mesh 
      {...props} 
      ref={ref}
      geometry={mesh.geometry}
      material={material}
      rotation={[0, Math.PI, 0]}
      castShadow
    />
  )
});

const TransmissionSphere = forwardRef<any, Omit<InteractiveProps, 'color'>>((props, ref) => {
  return (
    <DreiSphere {...props} ref={ref} castShadow>
      <MeshTransmissionMaterial
        // performance
        samples={2}
        // resolution={256}

        transmission={1}
        roughness={0}
        thickness={0.5}
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
