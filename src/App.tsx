import * as THREE from 'three'
import { useState, forwardRef, useMemo, useRef, useEffect, memo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Preload, AccumulativeShadows, RandomizedLight, Icosahedron, Environment, Box, useGLTF, Center, useTexture, Stats, Backdrop } from '@react-three/drei'
import { Leva, useControls } from 'leva'
import { signal } from '@preact/signals-core'
// import { Focusable } from './components/focusable' // Kept for potential reversion
import { CameraRig } from './components/CameraRig'
import { PondSphere } from './components/PondSphere'

import { DateTimeDisplay } from './components/DateTimeDisplay'
import { AdaptiveFog } from './components/AdaptiveFog'
import { MeditationContainer } from './components/MeditationContainer'
import { JournalBrowser } from './components/JournalBrowser'

import MindBody from './components/MindBody'
import ZenSand from './components/ZenSand'
import { Perf } from 'r3f-perf'
import { EffectComposer, Bloom, HueSaturation } from '@react-three/postprocessing'

//useGLTF.preload('/models/mindbody.glb')
//useGLTF.preload('/models/wellstone.glb')



export default function App() {
  const [isJournalDocked, setIsJournalDocked] = useState(true)
  const markersVisibleRef = useRef(false)
  const hasInputSignal = useMemo(() => signal(false), [])

  // Sync signal to ref for RadialMarkers (inverted: visible when no input)
  useEffect(() => {
    const unsubscribe = hasInputSignal.subscribe(() => {
      markersVisibleRef.current = !hasInputSignal.value
    })
    // Initial sync
    markersVisibleRef.current = !hasInputSignal.value
    return unsubscribe
  }, [hasInputSignal])

  // Prevent wheel events from UI elements reaching the Canvas
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement
      // Check if event is from a [data-ui] element
      if (target?.closest('[data-ui]')) {
        // In bubble phase, the target has already handled the event for scrolling
        // Now stop it from reaching Canvas handlers
        e.stopPropagation()
        e.stopImmediatePropagation()
      }
    }
    // Listen in bubble phase so the target (scrollable UI element) handles scrolling first
    // Then we stop propagation before it reaches React Three Fiber's Canvas handlers
    const root = document.getElementById('root')
    if (root) {
      // Use a wrapper function to ensure proper cleanup
      root.addEventListener('wheel', handleWheel, false)
      return () => root.removeEventListener('wheel', handleWheel, false)
    }
  }, [])

  const { mapping, exposure } = useControls({
    exposure: { value: 0.85, min: 0, max: 4 },
    mapping: { value: 'ACESFilmic', options: ['No', 'Linear', 'AgX', 'ACESFilmic', 'Reinhard', 'Cineon', 'Custom'] },
  })

  const { lightRadius, lightAmbient, lightIntensity, lightPosition, lightBias } = useControls('Light Settings', {
    lightRadius: { value: 11, min: 1, max: 20, step: 0.1 },
    lightAmbient: { value: 0.3, min: 0, max: 1, step: 0.01 },
    lightIntensity: { value: 2.3, min: 0, max: Math.PI * 2, step: 0.01 },
    lightPosition: { value: [0, 24, -1.5], step: 0.1 },
    lightBias: { value: 0.001, min: 0, max: 0.01, step: 0.0001 },
  })

  const { bloomIntensity, bloomThreshold, bloomSmoothing, bloomKernelSize } = useControls('Bloom', {
    bloomIntensity: { value: 0.7, min: 0, max: 3, step: 0.1 },
    bloomThreshold: { value: 0.90, min: 0, max: 1, step: 0.01 },
    bloomSmoothing: { value: 0.025, min: 0, max: 1, step: 0.001 },
    bloomKernelSize: { value: 1, options: [0, 1, 2], labels: ['Small', 'Medium', 'Large'] },
  })

  const { saturation, hue } = useControls('Hue & Saturation', {
    saturation: { value: 0, min: -1, max: 1, step: 0.01 },
    hue: { value: 0, min: -Math.PI, max: Math.PI, step: 0.01 },
  })

  return (
    <>
      {import.meta.env.MODE === 'development' && <Leva collapsed />}

      <Canvas
        shadows="soft"
        camera={{ position: [0, 12, 12], fov: 45 }}
        eventSource={document.getElementById('root')!}
        eventPrefix="client"
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          localClippingEnabled: true
        }}
        dpr={[0.8, 1.1]}
      >
        {/* <Perf deepAnalyze position="top-left" /> */}
        {/* <Stats /> */}
        <Preload all />

        <CameraRig isJournalDocked={isJournalDocked} />


        <color attach="background" args={['#F6F5F3']} />
        <AdaptiveFog
          color="#F6F5F3"
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


        {/* Main Scene Content */}
        {/* <ZenSand
          size={40}
          segments={512}
          color="#ffffff"
          amplitude={0.05}
          frequency={4}
          driftSpeed={1.1}
          centers={[[ 0.4, -3 ]]}
          position={[-1.2, -1, -1.5]}
        /> */}
        <Center position={[0, 1.0, 1.5]}>
          <group name="pond" position={[-1.2, 3.0, -3]} userData={{ inspectable: true }}>
            <PondSphere markersVisibleRef={markersVisibleRef} hasInputSignal={hasInputSignal} />
          </group>
          {/* <Focusable id="02" name="mindbody" position={[1.0, 0.2, -3]}>
            <MindBody
              color="indianred"
              wandering={true}
              wanderCenter={new THREE.Vector3(-1.2, 1.8, -3)}
            />
          </Focusable> */}

           {/* Shadows and Ground */}
           <AccumulativeShadows
             temporal={false}
             frames={200}
             blend={1.0}
             alphaTest={0.42}
             color="#FFF9EA" // cream
             colorBlend={1.0}
             opacity={0.10}
             scale={30}
           >
            <RandomizedLight
              radius={lightRadius}
              ambient={lightAmbient}
              intensity={lightIntensity}
              position={lightPosition}
              bias={lightBias}
            />
          </AccumulativeShadows>
        </Center>

        {/* Tone mapping modifies shader chunks - must be before EffectComposer */}
        {/* <Tone mapping={mapping} exposure={exposure} /> */}

        {/* Post-processing effects run after scene render */}
        <PostProcessingEffects
          bloomIntensity={bloomIntensity}
          bloomThreshold={bloomThreshold}
          bloomSmoothing={bloomSmoothing}
          bloomKernelSize={bloomKernelSize}
          saturation={saturation}
          hue={hue}
        />



      </Canvas>


      {/* <DateTimeDisplay /> */}

      {/* Journal Browser */}
      <JournalBrowser isDocked={isJournalDocked} setIsDocked={setIsJournalDocked} />


      {/* <Sheet sheetPercentage={sheetPercentage} />
       <Controls onPercentageChange={setSheetPercentage} /> */}
    </>
  )
}


const PostProcessingEffects = memo(function PostProcessingEffects({
  bloomIntensity,
  bloomThreshold,
  bloomSmoothing,
  bloomKernelSize,
  saturation,
  hue,
}: {
  bloomIntensity: number
  bloomThreshold: number
  bloomSmoothing: number
  bloomKernelSize: number
  saturation: number
  hue: number
}) {
  return (
    <EffectComposer autoClear={false} multisampling={0}>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={bloomSmoothing}
        kernelSize={bloomKernelSize}
      />
      <HueSaturation saturation={saturation} hue={hue} />
    </EffectComposer>
  )
})

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