import * as THREE from 'three'
import { useState, forwardRef, useMemo, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Preload, AccumulativeShadows, RandomizedLight, Sphere, Icosahedron, Environment, Box, useGLTF, Center, useTexture, Stats } from '@react-three/drei'
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
import Fish2 from './fish/Fish2'
import { useLocation } from 'wouter'
import { DateTimeDisplay } from './components/DateTimeDisplay'
import { AdaptiveFog } from './components/adaptive-fog'




useGLTF.preload('/models/mindbody.glb')
useGLTF.preload('/models/wellstone.glb')

export default function App() {
  const [sheetPercentage, setSheetPercentage] = useState(0)
  const [, setLocation] = useLocation()

  return (
    <>
      <Leva collapsed  />
      

      <Canvas
        shadows="soft"
        camera={{ position: [0, 12, 12], fov: 45 }}
        eventSource={document.getElementById('root')!}
        eventPrefix="client"
        // needed for switching back to default camera
       onPointerMissed={() => setLocation('/')}
        gl={{
          antialias: true,
          powerPreference: "high-performance"
        }}
        dpr={[1, 1.2]}
      >
        {/* <Perf deepAnalyze position="top-left" /> */}
        <Stats />
        <Preload all />

        <CameraRig sheetPercentage={sheetPercentage} />


        <color attach="background" args={['#f0f0f0']} />
        <AdaptiveFog
          color="#f0f0f0"
          defaultFog={{ near: 15, far: 32 }}
          focusedFog={{ near: 4, far: 8 }}
          animationDuration={1.2}
        />

        <Environment preset="forest"  environmentIntensity={1.0}  />

        {/* Lights */}
        <ambientLight intensity={Math.PI / 4} />


        {/* Main Scene Content */}
        <Center position={[0, 0.5, 1.5]}>
          <Focusable id="01" name="pond" position={[-1.2, 1.2, -3]} inspectable>
            <PondSphere />
          </Focusable>
          {/* <Focusable id="02" name="mindbody" position={[1.8, 0.8, 0.01]}>
            <MindBody color="indianred" />
          </Focusable>
          <Focusable id="03" name="wellstone" position={[-1, 0.5, 0]}>
            <WellStone color="limegreen" />
          </Focusable> */}

          {/* Shadows and Ground */}
          <AccumulativeShadows temporal={false} frames={200} blend={10.1} alphaTest={0.7} color="#f0f0f0" colorBlend={1} opacity={0.4} scale={15}>
            <RandomizedLight radius={10} ambient={0.6} intensity={Math.PI} position={[2.5, 8, -2.5]} bias={0.001} />
          </AccumulativeShadows>

        </Center>


        
      </Canvas>

      <DateTimeDisplay />
    
      {/* <Sheet sheetPercentage={sheetPercentage} /> */}
      {/* <Controls onPercentageChange={setSheetPercentage} /> */}
    </>
  )
}


interface InteractiveProps {
  hovered?: boolean;
  active?: boolean;
  color: string;
}





// Optimized helper function for UV generation (moved outside component to prevent recreation)
const generateSphericalUVs = (geometry: THREE.BufferGeometry) => {
  geometry.computeBoundingBox()
  const bbox = geometry.boundingBox!
  const center = bbox.getCenter(new THREE.Vector3())
  const positions = geometry.attributes.position
  const uvs = new Float32Array(positions.count * 2)
  
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) - center.x
    const y = positions.getY(i) - center.y
    const z = positions.getZ(i) - center.z
    
    const radius = Math.sqrt(x * x + y * y + z * z)
    const theta = Math.atan2(z, x)
    const phi = Math.acos(y / radius)
    
    uvs[i * 2] = (theta + Math.PI) / (2 * Math.PI)
    uvs[i * 2 + 1] = phi / Math.PI
  }
  
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
}


const PondSphere = forwardRef<any, Omit<InteractiveProps, 'color'>>((props, ref) => {
  const waterControls = useControls('Water Material', {
    roughness: { value: 0.00, min: 0, max: 1, step: 0.005 },
    ior: { value: 1.76, min: 1, max: 2.333, step: 0.001 },
    transmission: { value: 1.00, min: 0, max: 1, step: 0.01 },
    thickness: { value: 0.05, min: 0, max: 2, step: 0.01 },
    attenuationDistance: { value: 0.8, min: 0.1, max: 10, step: 0.1 },
    attenuationColor: '#ffffff',
    specularIntensity: { value: 0.92, min: 0, max: 1, step: 0.01 },
    normalScale: { value: 0.44, min: 0, max: 2, step: 0.01 },
    normalTiling: { value: 0.3, min: 0.1, max: 10, step: 0.1 },
    flowU: { value: 0.00, min: -0.3, max: 0.3, step: 0.001 },
    flowV: { value: -0.01, min: -0.3, max: 0.3, step: 0.001 }
  })

  const waterNormals = useTexture('/waternormals.jpg')
  useMemo(() => {
    if (waterNormals) {
      waterNormals.wrapS = THREE.RepeatWrapping
      // Clamp vertical to avoid seams/pinching at poles
      waterNormals.wrapT = THREE.ClampToEdgeWrapping
      waterNormals.anisotropy = 4
    }
  }, [waterNormals])

  useEffect(() => {
    if (waterNormals) {
      waterNormals.repeat.set(waterControls.normalTiling, Math.max(0.15, waterControls.normalTiling))
    }
  }, [waterNormals, waterControls.normalTiling])

  useFrame((_, delta) => {
    if (waterNormals) {
      waterNormals.offset.x += delta * waterControls.flowU
      // Reduce vertical flow near poles to minimize artifacts
      waterNormals.offset.y += delta * (waterControls.flowV * 0.5)
    }
  })

  return (
    <group  {...props} ref={ref}>



      <SphericalSky
        radius={1.01}
        displayRadius={1000}
        segments={48}
        lowQuality={true}
        opacity={1.05}
      /> 

    {/* <group position={[0, 0, 0]} scale={0.6}> 
      <Starfield
        radius={1.00}
        count={50}
        minStarSize={0.10}

        twinkleSpeed={1.3}
        twinkleAmount={0.3}

        bloomSize={0.3}
        bloomStrength={0.1}
        distanceFalloff={1.8}
        coreBrightness={1.0}
      />
    </group>
      

      {/* Water sphere with UV mapping to prevent pole pinching */}
      <Sphere castShadow args={[1.01, 64, 32]}>
        <meshPhysicalMaterial
          transmission={waterControls.transmission}
          roughness={waterControls.roughness}
          ior={waterControls.ior}
          thickness={waterControls.thickness}
          attenuationColor={waterControls.attenuationColor as unknown as THREE.ColorRepresentation}
          attenuationDistance={waterControls.attenuationDistance}
          specularIntensity={waterControls.specularIntensity}
          metalness={0}
          clearcoat={0.0}
          normalMap={waterNormals as unknown as THREE.Texture}
          normalScale={new THREE.Vector2(waterControls.normalScale, waterControls.normalScale)}
          transparent
          opacity={1.0}
        />
      </Sphere>

      {/* Contained scene (scaled so Innio's [-1,1] bounds fit inside radius ~1.01) */}
      <group name="innio-container" scale={0.15}>
        <Fish2 />
      </group>


    </group>
  )
});

const MindBody = forwardRef<any, InteractiveProps>(({ color, hovered, active, ...props }, ref) => {
  const groupRef = useRef<THREE.Group>(null)
  const { nodes } = useGLTF('/models/mindbody.glb')

  // Simple material controls
  const { roughness, metalness } = useControls('MindBody Material', {
    roughness: { value: 0.3, min: 0, max: 1, step: 0.01 },
    metalness: { value: 0.0, min: 0, max: 1, step: 0.01 }
  })

  // Memoize the material to prevent unnecessary recreations
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#CFCFCF',
      roughness,
      metalness
    })
  }, [roughness, metalness])

  // Extract the geometry from the first mesh found in the loaded model.
  // This is more robust than relying on `scene.children[0]`.
  const geometry = useMemo(() => {
    let geo: THREE.BufferGeometry | null = null;
    if (nodes) {
      for (const node of Object.values(nodes)) {
        if (node instanceof THREE.Mesh) {
          geo = node.geometry;
          break; 
        }
      }
    }
    return geo;
  }, [nodes]);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(clock.elapsedTime) * 0.03
      
      if (hovered || active) {
        groupRef.current.rotation.y += 0.01
      }
    }
  })

  // Render a new mesh with the extracted geometry and our dynamic material
  // instead of imperatively modifying the GLTF scene.
  return (
    <group ref={groupRef} scale={0.45} {...props}>
      <Center>
        {geometry && (
          <mesh 
            geometry={geometry} 
            material={material} 
            castShadow 
            receiveShadow 
            rotation={[0, Math.PI, 0]} 
          />
        )}
      </Center>
    </group>
  )
});


const WellStone = forwardRef<any, InteractiveProps>(({ color, hovered, active, ...props }, ref) => {
  const groupRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF('/models/wellstone.glb')

  const { roughness, metalness, textureRepeat, normalScale } = useControls('WellStone Material', {
    roughness: { value: 0.3, min: 0, max: 1, step: 0.01 },
    metalness: { value: 0.39, min: 0, max: 1, step: 0.01 },
    textureRepeat: { value: 5.0, min: 0.1, max: 10, step: 0.1 },
    normalScale: { value: 1.2, min: 0, max: 1, step: 0.05 }
  })

  const rockTextures = useTexture({
    map: '/textures/rock_diffuse.jpg',
    normalMap: '/textures/rock_normal.jpg',
    roughnessMap: '/textures/rock_roughness.jpg',
    aoMap: '/textures/rock_ao.jpg'
  })

  const rockMaterial = useMemo(() => {
    Object.values(rockTextures).forEach(texture => {
      if (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(textureRepeat, textureRepeat)
        texture.anisotropy = 2
      }
    })

    return new THREE.MeshStandardMaterial({
      color: '#CFCFCF', // Match MindBody color
      normalMap: rockTextures.normalMap,
      normalScale: new THREE.Vector2(normalScale, normalScale),
      roughness,
      metalness
    })
  }, [rockTextures, textureRepeat, normalScale, roughness, metalness])

  useEffect(() => {
    const mesh = scene.children[1] as THREE.Mesh
    if (mesh?.geometry) {
      if (!mesh.geometry.attributes.uv) {
        generateSphericalUVs(mesh.geometry)
      }
      mesh.material = rockMaterial
      mesh.castShadow = true
      mesh.receiveShadow = true
    }
  }, [scene, rockMaterial])

  useFrame(() => {
    if (groupRef.current && (hovered || active)) {
      groupRef.current.rotation.y += 0.01
    }
  })

  return (
    <group ref={groupRef} scale={6.5} rotation={[0, Math.PI, 0]} {...props}>
      <Center>
        <primitive object={scene} />
      </Center>
    </group>
  )
});



