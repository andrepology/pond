import * as THREE from 'three'
import { useState, forwardRef, useMemo, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Preload, AccumulativeShadows, RandomizedLight, Sphere as DreiSphere, Environment, Box, MeshTransmissionMaterial, useGLTF, Center } from '@react-three/drei'
import { Perf } from 'r3f-perf'
import { Leva, useControls } from 'leva'
import React from 'react'
import { Sheet } from './Sheet'
import { Controls } from './Controls'
import { Focusable } from './components/focusable'
import { CameraRig } from './components/camera-rig'
import SphericalSky from './components/SphericalSky'
import Starfield from './components/Starfield'
import WaterSphere from './components/WaterSphere'
import Innio from './innio/Innio'
import { useLocation } from 'wouter'

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
  const [, setLocation] = useLocation()

  return (
    <>
      <Leva collapsed />
    
      <Canvas
        shadows="soft"
        camera={{ position: [0, 5, 12], fov: 35 }}
        eventSource={document.getElementById('root')!}
        eventPrefix="client"
        onPointerMissed={() => setLocation('/')}
        gl={{
          antialias: true,
          powerPreference: "high-performance"
        }}
        dpr={[1, 1.5]}
      >
        <Perf deepAnalyze position="top-left" />
        <Preload all />
        
        <CameraRig sheetPercentage={sheetPercentage} />

      


        <color attach="background" args={['#f0f0f0']} />
        <primitive attach="fog" object={new THREE.FogExp2('#f0f0f0', 0.05)} />

        <Environment preset="forest" />

        {/* Lights */}
        <ambientLight intensity={0.5} />

        {/* Main Scene Content */}
        <Center position={[0, 0, 0]}>
          <Focusable id="01" name="innio" position={[-2, 1.2, 0]} inspectable>
            <TransmissionSphere />
          </Focusable>
          <Focusable id="02" name="mindbody" position={[0, 1, -2]}>
            <MindBody color="indianred" />
          </Focusable>
          {/* <Focusable id="03" name="Sphere C" position={[2, 1, 0]}>
            <InteractiveSphere color="limegreen" />
          </Focusable> */}

          {/* Shadows and Ground */}
          <AccumulativeShadows frames={120} blend={200} alphaTest={0.9} color="#f0f0f0" colorBlend={2} opacity={0.3} scale={20}>
            <RandomizedLight radius={10} ambient={0.5} intensity={Math.PI} position={[2.5, 8, -2.5]} bias={0.001} />
          </AccumulativeShadows>


        </Center>

  
       
      </Canvas>
      {/* <Leva collapsed/> */}
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

const MindBody = forwardRef<any, InteractiveProps>(({ color, hovered, active, ...props }, ref) => {
  const groupRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF('/models/mindbody.glb')

  useEffect(() => {
    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: '#CFCFCF',
      roughness: 0.4,
      metalness: 0.19
    })

    const mesh = scene.children[0]
    if (mesh instanceof THREE.Mesh) {
      mesh.material = stoneMaterial
      mesh.castShadow = true
    }
  }, [scene])

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001
    }
  })

  return (
    <group ref={groupRef} scale={0.45} {...props}>
      <Center>
        <primitive object={scene} rotation={[0, Math.PI, 0]} />
      </Center>
    </group>
  )
});

const TransmissionSphere = forwardRef<any, Omit<InteractiveProps, 'color'>>((props, ref) => {
  useControls('Transmission Material', {
    samples: { value: 5, min: 1, max: 20, step: 1 },
    resolution: { value: 256, min: 64, max: 1024, step: 64 },
    transmission: { value: 1, min: 0, max: 1, step: 0.01 },
    roughness: { value: 0.0, min: 0, max: 1, step: 0.01 },
    thickness: { value: 0.2, min: 0, max: 2, step: 0.01 },
    ior: { value: 1.5, min: 1, max: 3, step: 0.01 },
    chromaticAberration: { value: 0.02, min: 0, max: 0.1, step: 0.001 },
    anisotropy: { value: 0.1, min: 0, max: 1, step: 0.01 },
    distortion: { value: 0.1, min: 0, max: 1, step: 0.01 },
    distortionScale: { value: 4.3, min: 0, max: 10, step: 0.1 },
    temporalDistortion: { value: 0.2, min: 0, max: 1, step: 0.01 },
    clearcoat: { value: 1, min: 0, max: 1, step: 0.01 }
  })

  return (
    <group  {...props} ref={ref}>
      <SphericalSky
        radius={1.0}
        displayRadius={1000}
        segments={48}
        lowQuality={true}
      />

      {/* <WaterSphere radius={0.99} /> */}

      <Innio />

      {/* <Starfield
        radius={1.00}
        count={50}
        minStarSize={0.0}

        twinkleSpeed={1.3}
        twinkleAmount={0.3}

        bloomSize={0.8}
        bloomStrength={0.5}
        distanceFalloff={1.8}
        coreBrightness={3.0}
      /> */}

      
      {/* <DreiSphere castShadow args={[1.01, 64, 64]}>
        <MeshTransmissionMaterial
          backside
          samples={samples}
          resolution={resolution}
          transmission={transmission}
          roughness={roughness}
          thickness={thickness}
          ior={ior}
          chromaticAberration={chromaticAberration}
          anisotropy={anisotropy}
          distortion={distortion}
          distortionScale={distortionScale}
          temporalDistortion={temporalDistortion}
          clearcoat={clearcoat}
        />
      </DreiSphere> */}
    </group>
  )
});
