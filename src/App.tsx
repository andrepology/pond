import * as THREE from 'three'
import { useState, forwardRef, useMemo, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Preload, AccumulativeShadows, RandomizedLight, Icosahedron, Environment, Box, useGLTF, Center, useTexture, Stats, Backdrop } from '@react-three/drei'
import { Leva, useControls } from 'leva'
import { signal } from '@preact/signals-core'
import { Focusable } from './components/focusable'
import { CameraRig } from './components/CameraRig'
import { PondSphere } from './components/PondSphere'

import { useLocation } from 'wouter'
import { DateTimeDisplay } from './components/DateTimeDisplay'
import { AdaptiveFog } from './components/AdaptiveFog'
import { MeditationContainer } from './components/MeditationContainer'
import { AuthFlow } from './components/AuthFlow'
import { VoiceProvider, CallButton } from './VoiceChat'


//useGLTF.preload('/models/mindbody.glb')
//useGLTF.preload('/models/wellstone.glb')

export default function App() {
  const [sheetPercentage, setSheetPercentage] = useState(0)
  const markersVisibleRef = useRef(false)
  const hasInputSignal = useMemo(() => signal(false), [])
  const [, setLocation] = useLocation()

  // Sync signal to ref for RadialMarkers (inverted: visible when no input)
  useEffect(() => {
    const unsubscribe = hasInputSignal.subscribe(() => {
      markersVisibleRef.current = !hasInputSignal.value
    })
    // Initial sync
    markersVisibleRef.current = !hasInputSignal.value
    return unsubscribe
  }, [hasInputSignal])

  const { mapping, exposure } = useControls({
    exposure: { value: 0.85, min: 0, max: 4 },
    mapping: { value: 'ACESFilmic', options: ['No', 'Linear', 'AgX', 'ACESFilmic', 'Reinhard', 'Cineon', 'Custom'] },
  })

  return (
    <VoiceProvider config={{ agentId: import.meta.env.VITE_ELEVENLABS_AGENT_ID }}>
      <Leva collapsed />

      {/* Authentication Flow - shows sign in/sign up forms */}
      <AuthFlow />

      <Canvas
        shadows="soft"
        camera={{ position: [0, 12, 12], fov: 45 }}
        eventSource={document.getElementById('root')!}
        eventPrefix="client"
        // needed for switching back to default camera
        onPointerMissed={(event) => {
          const target = event.target as HTMLElement
          if (target?.closest('[class*="leva-c-"]')) return
          if (target?.closest('[data-ui]')) return
          setLocation('/')
        }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          localClippingEnabled: true
        }}
        dpr={[1, 1.2]}
      >
        {/* <Perf deepAnalyze position="top-left" /> */}
        {/* <Stats /> */}
        <Preload all />

        <CameraRig sheetPercentage={sheetPercentage} />


        <color attach="background" args={['#F3F0EB']} />
        <AdaptiveFog
          color="#F3F0EB"
          defaultFog={{ near: 4, far: 18 }}
          focusedFog={{ near: 4, far: 12 }}
          animationDuration={1.2}
        />

        <Environment
          //  files={['/rogland_clear_night_2k.hdr']}
           preset='sunset'
           backgroundBlurriness={1.0} 
           environmentIntensity={1.0} 
           
           
          />

        {/* Lights */}
        <ambientLight intensity={Math.PI / 4} />

        


        {/* Main Scene Content */}
        <Center position={[0, 0.5, 1.5]}>
          <Focusable id="01" name="" position={[-1.2, 2.5, -3]} inspectable>
            <PondSphere markersVisibleRef={markersVisibleRef} hasInputSignal={hasInputSignal} />
          </Focusable>

           {/* Shadows and Ground */}
           <AccumulativeShadows
             temporal={false}
             frames={200}
             blend={0}
             alphaTest={0.62}
             color="#e0e7ef" // very light gray-blue (lighter than slate-400)
             colorBlend={1.0}
             opacity={0.4}
             scale={20}
           >
            <RandomizedLight radius={8} ambient={0.2} intensity={Math.PI } position={[0, 11, -25]} bias={0.001} />
          </AccumulativeShadows>
        </Center>

         


        <Tone mapping={mapping} exposure={exposure} />



      </Canvas>


      <DateTimeDisplay />

      {/* Voice Call Button */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000
      }}>
        <CallButton />
      </div>

      {/* <MeditationContainer markersVisibleRef={markersVisibleRef} hasInputSignal={hasInputSignal} /> */}

      {/* <Sheet sheetPercentage={sheetPercentage} />
       <Controls onPercentageChange={setSheetPercentage} /> */}
    </VoiceProvider>
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