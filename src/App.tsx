import * as THREE from 'three'
import { useState, forwardRef, useMemo, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Preload, AccumulativeShadows, RandomizedLight, Sphere as DreiSphere, Environment, Box, MeshTransmissionMaterial, useGLTF, Center, useTexture } from '@react-three/drei'
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
import { DateTimeDisplay } from './components/DateTimeDisplay'

// Pre-create reusable materials for better performance
const MATERIALS = {
  dodgerblue: new THREE.MeshStandardMaterial({ color: 'dodgerblue' }),
  indianred: new THREE.MeshStandardMaterial({ color: 'indianred' }),
  limegreen: new THREE.MeshStandardMaterial({ color: 'limegreen' }),
  hotpink: new THREE.MeshStandardMaterial({ color: 'hotpink' })
}

// Preload the GLB model for better performance
useGLTF.preload('/models/mindbody.glb')
useGLTF.preload('/models/wellstone.glb')

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
        {/* <Perf deepAnalyze position="top-left" /> */}
        <Preload all />
      
        <CameraRig sheetPercentage={sheetPercentage} />

      


        <color attach="background" args={['#f0f0f0']} />
        <primitive attach="fog" object={new THREE.FogExp2('#f0f0f0', 0.03)} />

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
          <Focusable id="03" name="wellstone" position={[1, 0.6, 0]}>
            <WellStone color="limegreen" />
          </Focusable>

          {/* Shadows and Ground */}
          <AccumulativeShadows frames={120} blend={200} alphaTest={0.9} color="#f0f0f0" colorBlend={2} opacity={0.3} scale={20}>
            <RandomizedLight radius={10} ambient={0.5} intensity={Math.PI} position={[2.5, 8, -2.5]} bias={0.001} />
          </AccumulativeShadows>


        </Center>

  
       
      </Canvas>
      {/* <Leva collapsed/> */}
      <DateTimeDisplay />
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
    if (groupRef.current && (hovered || active)) {
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
  const transmissionControls = useControls('Transmission Material', {
    samples: { value: 5, min: 1, max: 20, step: 1 },
    resolution: { value: 512, min: 64, max: 1024, step: 64 },
    transmission: { value: 1.0, min: 0, max: 1, step: 0.01 },
    roughness: { value: 0.0, min: 0, max: 1, step: 0.01 },
    thickness: { value: 0.8, min: 0, max: 2, step: 0.01 },
    ior: { value: 1.0, min: 1, max: 3, step: 0.01 },
    chromaticAberration: { value: 0.02, min: 0, max: 0.1, step: 0.001 },
    anisotropy: { value: 0.0, min: 0, max: 1, step: 0.01 },
    distortion: { value: 0.0, min: 0, max: 1, step: 0.01 },
    distortionScale: { value: 4.3, min: 0, max: 10, step: 0.1 },
    temporalDistortion: { value: 0.0, min: 0, max: 1, step: 0.01 },
    clearcoat: { value: 0.0, min: 0, max: 1, step: 0.01 }
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

      
      {/* <DreiSphere castShadow args={[1.00, 64, 64]}>
        <MeshTransmissionMaterial
          
          samples={transmissionControls.samples}
          resolution={transmissionControls.resolution}
          transmission={transmissionControls.transmission}
          roughness={transmissionControls.roughness}
          thickness={transmissionControls.thickness}
          ior={transmissionControls.ior}
          chromaticAberration={transmissionControls.chromaticAberration}
          anisotropy={transmissionControls.anisotropy}
          distortion={transmissionControls.distortion}
          distortionScale={transmissionControls.distortionScale}
          temporalDistortion={transmissionControls.temporalDistortion}
          clearcoat={transmissionControls.clearcoat}
        />
      </DreiSphere> */}
    </group>
  )
});

const WellStone = forwardRef<any, InteractiveProps>(({ color, hovered, active, ...props }, ref) => {
  const groupRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF('/models/wellstone.glb')
  
  // Leva controls for real-time adjustment
  const stoneControls = useControls('WellStone Material', {
    roughness: { value: 0.8, min: 0, max: 1, step: 0.01 },
    metalness: { value: 0.1, min: 0, max: 1, step: 0.01 },
    textureRepeat: { value: 0.5, min: 0.1, max: 3, step: 0.1 },
    textureRotation: { value: 0, min: 0, max: Math.PI * 2, step: 0.1 },
    useOriginalUVs: { value: true },
    normalScale: { value: 1.0, min: 0, max: 3, step: 0.1 }
  })
  
  // Load only diffuse and normal map textures
  const textures = useTexture({
    map: '/textures/stone_diffuse.jpg',        // Color/albedo texture (594KB)
    normalMap: '/textures/stone_normal.jpg'    // Normal map for surface detail (1.3MB)
  })

  useEffect(() => {
    

    // Recursively apply custom material with displacement mapping
    const applyCustomMaterial = (object: THREE.Object3D) => {
      if (object instanceof THREE.Mesh) {
        // Create new material with only diffuse and normal mapping
        const customMaterial = new THREE.MeshStandardMaterial({
          map: textures.map,
          normalMap: textures.normalMap,
          normalScale: new THREE.Vector2(stoneControls.normalScale, stoneControls.normalScale),
          roughness: stoneControls.roughness,
          metalness: stoneControls.metalness
        })

        // Configure texture properties for better quality and UV handling
        Object.values(textures).forEach(texture => {
          if (texture) {
            if (stoneControls.useOriginalUVs) {
              // Use original UV mapping from the model
              texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
              texture.repeat.set(1, 1)
              texture.offset.set(0, 0)
            } else {
              // Use custom UV mapping to avoid rings
              texture.wrapS = texture.wrapT = THREE.RepeatWrapping
              texture.repeat.set(stoneControls.textureRepeat, stoneControls.textureRepeat)
              texture.rotation = stoneControls.textureRotation
              texture.center.set(0.5, 0.5) // Rotate around center
            }
            texture.anisotropy = 16   // Improve texture quality
            texture.needsUpdate = true
          }
        })

        object.material = customMaterial
        object.castShadow = true
        object.receiveShadow = true
      }
      object.children.forEach(child => applyCustomMaterial(child))
    }

    applyCustomMaterial(scene)
  }, [scene, textures, stoneControls])

  useFrame(() => {
    if (groupRef.current && (hovered || active)) {
      groupRef.current.rotation.y += 0.001
    }
  })

  return (
    <group ref={groupRef} scale={20.5} {...props}>
      <Center>
        <primitive object={scene} />
      </Center>
    </group>
  )
});
