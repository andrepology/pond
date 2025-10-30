import * as THREE from 'three'
import { useState, forwardRef, useMemo, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Preload, AccumulativeShadows, RandomizedLight, Icosahedron, Environment, Box, useGLTF, Center, useTexture, Stats, Backdrop } from '@react-three/drei'
import { Leva, useControls } from 'leva'
import { Focusable } from './components/Focusable'
import { CameraRig } from './components/CameraRig'
import PondSphere from './components/PondSphere'

import { useLocation } from 'wouter'
import { DateTimeDisplay } from './components/DateTimeDisplay'
import { AdaptiveFog } from './components/AdaptiveFog'




useGLTF.preload('/models/mindbody.glb')
useGLTF.preload('/models/wellstone.glb')

export default function App() {
  const [sheetPercentage, setSheetPercentage] = useState(0)
  const [, setLocation] = useLocation()

  const { mapping, exposure } = useControls({
    exposure: { value: 0.85, min: 0, max: 4 },
    mapping: { value: 'ACESFilmic', options: ['No', 'Linear', 'AgX', 'ACESFilmic', 'Reinhard', 'Cineon', 'Custom'] },
  })

  return (
    <>
      <Leva collapsed />


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
        {/* <Stats /> */}
        <Preload all />

        <CameraRig sheetPercentage={sheetPercentage} />


        <color attach="background" args={['#f0f0f0']} />
        <AdaptiveFog
          color="#f0f0f0"
          defaultFog={{ near: 4, far: 18 }}
          focusedFog={{ near: 4, far: 12 }}
          animationDuration={1.2}
        />

        <Environment
           files={['/rogland_clear_night_2k.hdr']}
           backgroundBlurriness={1.0} 
           environmentIntensity={1.0} 
           
           
          />

        {/* Lights */}
        <ambientLight intensity={Math.PI / 4} />

        


        {/* Main Scene Content */}
        <Center position={[0, 0.5, 1.5]}>
          <Focusable id="01" name="pond" position={[-1.2, 1.5, -3]} inspectable>
            <PondSphere />
          </Focusable>

          {/* Shadows and Ground */}
          <AccumulativeShadows temporal={false} frames={200} blend={1.1} alphaTest={0.7} color="#f0f0f0" colorBlend={1} opacity={0.4} scale={15}>
            <RandomizedLight radius={10} ambient={0.6} intensity={Math.PI} position={[2.5, 8, -2.5]} bias={0.001} />
          </AccumulativeShadows>

        </Center>


        <Tone mapping={mapping} exposure={exposure} />



      </Canvas>

      <div style={{ transform: 'scale(1.5)', transformOrigin: 'bottom left' }}>
        <DateTimeDisplay />
      </div>

      {/* <Sheet sheetPercentage={sheetPercentage} />
       <Controls onPercentageChange={setSheetPercentage} /> */}
    </>
  )
}

function Tone({ mapping, exposure }) {
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    const prevFrag = THREE.ShaderChunk.tonemapping_pars_fragment
    const prevTonemapping = gl.toneMapping
    const prevTonemappingExp = gl.toneMappingExposure
    // Model viewers "commerce" tone mapping
    // https://github.com/google/model-viewer/blob/master/packages/model-viewer/src/three-components/Renderer.ts#L141
    THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
      'vec3 CustomToneMapping( vec3 color ) { return color; }',
      `float startCompression = 0.8 - 0.04;
       float desaturation = 0.15;
       vec3 CustomToneMapping( vec3 color ) {
         color *= toneMappingExposure;
         float x = min(color.r, min(color.g, color.b));
         float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
         color -= offset;
         float peak = max(color.r, max(color.g, color.b));
         if (peak < startCompression) return color;
         float d = 1. - startCompression;
         float newPeak = 1. - d * d / (peak + d - startCompression);
         color *= newPeak / peak;
         float g = 1. - 1. / (desaturation * (peak - newPeak) + 1.);
         return mix(color, vec3(1, 1, 1), g);
       }`,
    )
    gl.toneMapping = THREE[mapping + 'ToneMapping']
    gl.toneMappingExposure = exposure
    return () => {
      // Retore on unmount or data change
      gl.toneMapping = prevTonemapping
      gl.toneMappingExposure = prevTonemappingExp
      THREE.ShaderChunk.tonemapping_pars_fragment = prevFrag
    }
  }, [mapping, exposure])
  return null
}