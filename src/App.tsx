import * as THREE from 'three'
import { useState, forwardRef, useMemo, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Preload, AccumulativeShadows, RandomizedLight, Sphere as DreiSphere, Environment, Box, MeshTransmissionMaterial, useGLTF } from '@react-three/drei'
import { Perf } from 'r3f-perf'
import React from 'react'
import { Sheet } from './Sheet'
import { Controls } from './Controls'
import { Focusable } from './components/focusable'
import { CameraRig } from './components/camera-rig'
import SphericalSky from './components/SphericalSky'
import Starfield from './components/Starfield'
import WaterSphere from './components/WaterSphere'

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
      <Canvas 
        shadows="soft" 
        camera={{ position: [0, 5, 12], fov: 35 }} 
        eventSource={document.getElementById('root')!} 
        eventPrefix="client"
        gl={{ 
          antialias: true,
          powerPreference: "high-performance" 
        }}
        dpr={[1, 1.5]}
      >
        <Perf deepAnalyze position="top-left" />

        <color attach="background" args={['#f0f0f0']} />
        <primitive attach="fog" object={new THREE.FogExp2('#f0f0f0', 0.01)} />
        
        <Environment preset="city" />

        {/* Lights */}
        <ambientLight intensity={0.5} />

        {/* Main Scene Content */}
        <group position={[0, -0.5, 0]}>
          <Focusable id="01" name="pond" position={[-2, 1, 0]} inspectable>
            <TransmissionSphere />
          </Focusable>
          <Focusable id="02" name="mindbody" position={[0, 1, -2]}>
            <InteractiveMindbody color="indianred" />
          </Focusable>
          {/* <Focusable id="03" name="Sphere C" position={[2, 1, 0]}>
            <InteractiveSphere color="limegreen" />
          </Focusable> */}
          
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
  const groupRef = useRef<THREE.Group>(null)
  const primitiveRef = useRef<THREE.Object3D>(null)
  const { scene } = useGLTF('/models/mindbody.glb')

  useEffect(() => {
    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: '#CFCFCF',
      roughness: 0.4,
      metalness: 0.19
    })

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = stoneMaterial
        child.castShadow = true
      }
    })
  }, [scene])

  return (
    <group ref={groupRef} scale={0.45} {...props}>
      <primitive ref={primitiveRef} object={scene} rotation={[0, Math.PI, 0]} />
    </group>
  )
});

const TransmissionSphere = forwardRef<any, Omit<InteractiveProps, 'color'>>((props, ref) => {
  return (
    <group {...props} ref={ref}>
      
      <group position={[0, 0, 0]}>

        <SphericalSky
            radius={1.0}
            displayRadius={1000}
            segments={36}
            lowQuality={true}
          />

        <Starfield 
          radius={1.01}
          count={50}
          minStarSize={0.0}
          
          twinkleSpeed={1.3}
          twinkleAmount={0.3}

          bloomSize={0.8}
          bloomStrength={0.5}
          distanceFalloff={1.8}
          coreBrightness={3.0}
        />

        <WaterSphere radius={1.0} />
        
      </group>
    </group>
  )
});
