import * as THREE from 'three'
import { useState, forwardRef, useMemo, useRef, useEffect, memo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Preload, AccumulativeShadows, RandomizedLight, Icosahedron, Environment, Box, useGLTF, Center, useTexture, Stats, Backdrop, Lightformer } from '@react-three/drei'
import { Leva, useControls } from 'leva'
import { signal } from '@preact/signals-core'
// import { Focusable } from './components/focusable' // Kept for potential reversion
import { CameraRig } from './components/CameraRig'
import { isMobileDevice } from './helpers/deviceDetection'
import { folder } from 'leva'
import { PondSphere } from './components/PondSphere'

import { motion, AnimatePresence } from 'motion/react'
import { HUD } from './components/HUD'
import { AdaptiveFog } from './components/AdaptiveFog'
import { MeditationContainer } from './components/MeditationContainer'
import { JournalBrowser, TabId } from './components/JournalBrowser'
import { SceneInitializer } from './components/SceneInitializer'
import { useAppUpdater } from './hooks/useAppUpdater'

import ZenSand from './components/ZenSand'
import { Perf } from 'r3f-perf'
import { PostProcessingEffects } from './components/PostProcessingEffects'

//useGLTF.preload('/models/mindbody.glb')
//useGLTF.preload('/models/wellstone.glb')



export default function App() {
  const [isJournalDocked, setIsJournalDocked] = useState(true)
  
  const [sceneReady, setSceneReady] = useState(false)
  const markersVisibleRef = useRef(false)
  const hasInputSignal = useMemo(() => signal(false), [])
  const isMobile = isMobileDevice()
  
  // Auto-updater for Tauri builds
  // useAppUpdater()

  // Detect Tauri environment and add class to root for CSS
  useEffect(() => {
    if (typeof window !== 'undefined' && '__TAURI__' in window && window.__TAURI__) {
      document.getElementById('root')?.classList.add('tauri-app')
      document.body.classList.add('tauri-app')
    }
  }, [])



  // Sync signal to ref for RadialMarkers (inverted: visible when no input)
  useEffect(() => {
    const unsubscribe = hasInputSignal.subscribe(() => {
      markersVisibleRef.current = hasInputSignal.value
    })
    // Initial sync
    markersVisibleRef.current = hasInputSignal.value
    return unsubscribe
  }, [hasInputSignal])

  // Toggle scene-ready class for CSS fade-in
  useEffect(() => {
    if (sceneReady) {
      document.getElementById('root')?.classList.add('scene-ready')
    }
  }, [sceneReady])

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

  // Prevent touch events from scrolling the viewport globally
  // CSS touch-action handles most cases, but this ensures viewport never scrolls
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      // Only prevent if touch is NOT on a scrollable element
      // Scrollable elements have touch-action: pan-y and handle their own scrolling
      const scrollableElement = target?.closest('.scroller, [style*="overflow"]')
      if (!scrollableElement && target?.closest('[data-ui]')) {
        e.preventDefault()
      }
    }
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => document.removeEventListener('touchmove', handleTouchMove)
  }, [])


  const { toneMappingEnabled, toneMappingMode, toneMappingBlendFunction, toneMappingAdaptive, toneMappingResolution, toneMappingMiddleGrey, toneMappingMaxLuminance, toneMappingAverageLuminance, toneMappingAdaptationRate, bloomIntensity, bloomThreshold, bloomSmoothing, bloomKernelSize, saturation, hue, filmGrainIntensity, filmGrainGrayscale, depthFogEnabled, depthFogColor, depthFogNear, depthFogFar, depthFogIntensity, depthFogRadialInfluence } = useControls({
    'Post Processing': folder({
      'Tone Mapping': folder({
        toneMappingEnabled: { label: 'Enabled', value: false },
        toneMappingMode: {
          label: 'Mode',
          value: 'NEUTRAL',
          options: ['LINEAR', 'REINHARD', 'REINHARD2', 'REINHARD2_ADAPTIVE', 'UNCHARTED2', 'CINEON', 'ACES_FILMIC', 'AGX', 'NEUTRAL'],
          labels: ['Linear', 'Reinhard', 'Reinhard2', 'Reinhard2 Adaptive', 'Uncharted2', 'Cineon', 'ACES Filmic', 'AGX', 'Neutral'],
        },
        toneMappingBlendFunction: {
          label: 'Blend Mode',
          value: 'NORMAL',
          options: ['NORMAL', 'ADD', 'MULTIPLY', 'SCREEN', 'OVERLAY', 'SOFT_LIGHT', 'DIFFERENCE'],
        },
        toneMappingAdaptive: { label: 'Adaptive', value: true },
        toneMappingResolution: { label: 'Resolution', value: 256, min: 64, max: 1024, step: 32 },
        toneMappingMiddleGrey: { label: 'Mid Grey', value: 0.6, min: 0.1, max: 2.0, step: 0.01 },
        toneMappingMaxLuminance: { label: 'Max Lum', value: 16.0, min: 1.0, max: 100.0, step: 0.1 },
        toneMappingAverageLuminance: { label: 'Avg Lum', value: 1.0, min: 0.1, max: 10.0, step: 0.01 },
        toneMappingAdaptationRate: { label: 'Adapt Rate', value: 1.0, min: 0.1, max: 5.0, step: 0.01 },
      }, { collapsed: true }),
      'Bloom': folder({
        bloomIntensity: { label: 'Intensity', value: 0.1, min: 0, max: 3, step: 0.1 },
        bloomThreshold: { label: 'Threshold', value: 0.96, min: 0, max: 1, step: 0.01 },
        bloomSmoothing: { label: 'Smoothing', value: 0.025, min: 0, max: 1, step: 0.001 },
        bloomKernelSize: { label: 'Kernel Size', value: 1, options: [0, 1, 2], labels: ['Small', 'Medium', 'Large'] },
      }, { collapsed: true }),
      'Depth Fog': folder({
        depthFogEnabled: { label: 'Enabled', value: false },
        depthFogColor: { label: 'Color', value: '#F6F5F3' },
        depthFogNear: { label: 'Fog Near', value: 0.0, min: 0, max: 1, step: 0.01 },
        depthFogFar: { label: 'Fog Far', value: 0.85, min: 0, max: 1, step: 0.01 },
        depthFogIntensity: { label: 'Intensity', value: 1.0, min: 0, max: 2, step: 0.01 },
        depthFogRadialInfluence: { label: 'Radial Mode', value: 1.5, min: 0, max: 3, step: 0.05 },
      }, { collapsed: true }),
      'Hue & Saturation': folder({
        saturation: { value: 0, min: -1, max: 1, step: 0.01 },
        hue: { value: 0, min: -Math.PI, max: Math.PI, step: 0.01 },
      }, { collapsed: true }),
      'Film Grain': folder({
        filmGrainIntensity: { label: 'Intensity', value: 0, min: 0, max: 1, step: 0.01 },
        filmGrainGrayscale: { label: 'Grayscale', value: false },
      }, { collapsed: true }),
    }, { collapsed: true })
  })

  const { shadowFrames, shadowBlend, shadowAlphaTest, shadowColor, shadowColorBlend, shadowOpacity, shadowScale, lightRadius, lightAmbient, lightIntensity, lightPosition, lightBias } = useControls({
    'Shadow Settings': folder({
      'Light Settings': folder({
        lightRadius: { label: 'Radius', value: 11, min: 1, max: 20, step: 0.1 },
        lightAmbient: { label: 'Ambient', value: 0.35, min: 0, max: 1, step: 0.01 },
        lightIntensity: { label: 'Intensity', value: 2.1, min: 0, max: Math.PI * 2, step: 0.01 },
        lightPosition: { label: 'Position', value: [0, 17.5, -1.5], step: 0.1 },
        lightBias: { label: 'Bias', value: 0.001, min: 0, max: 0.01, step: 0.0001 },
      }, { collapsed: true }),
      shadowFrames: { label: 'Frames', value: 30, min: 1, max: 300, step: 1 },
      shadowBlend: { label: 'Blend', value: 1.5, min: 0, max: 2, step: 0.01 },
      shadowAlphaTest: { label: 'Alpha Test', value: 0.6, min: 0, max: 1, step: 0.01 },
      shadowColor: { label: 'Color', value: '#ffb700' },
      shadowColorBlend: { label: 'Color Blend', value: 0.20, min: 0, max: 2, step: 0.01 },
      shadowOpacity: { label: 'Opacity', value: 0.15, min: 0, max: 1, step: 0.01 },
      shadowScale: { label: 'Scale', value: 10, min: 0, max: 20, step: 0.5 },
    }, { collapsed: true })
  })



  return (
    <>
      <Leva hidden={!__IS_DEV__} collapsed={__IS_DEV__} />

      <Canvas
        shadows="soft"
        camera={{ position: [0, 20, -3], fov: 45 }}
        eventSource={document.getElementById('root')!}
        eventPrefix="client"
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          localClippingEnabled: true,
          alpha: true
        }}
        dpr={isMobile ? [1.0, 1.3] : [1.0, 1.5]}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(0x000000, 0) // Transparent clear
          scene.background = null
        }}
      >
        {/* <Perf 
          position="bottom-right" 
          minimal={isMobile} 
          deepAnalyze={!isMobile} 
          logsPerSecond={isMobile ? 2 : 5}
        /> */}
        {/* <Stats /> */}
        <Preload all />

        <SceneInitializer onReady={() => setSceneReady(true)}>
        <CameraRig markersVisible={markersVisibleRef.current} isJournalDocked={isJournalDocked} />

        <color attach="background" args={['#F6F5F3']} />
        <AdaptiveFog
          color="#F6F5F3"
          defaultFog={{ near: 14, far: 20 }}
          focusedFog={{ near: 14, far: 20 }}
          animationDuration={1.2}
        /> 

        <Environment
           files={['/envmaps/rogland_moonlit_night_1k.hdr']}
           backgroundBlurriness={.0}
           environmentIntensity={1.0}
           
          />
        



        
          <group name="pond" position={[0, 2.0, -3]} userData={{ inspectable: true }}>
            <PondSphere markersVisibleRef={markersVisibleRef} hasInputSignal={hasInputSignal} />
          </group>


           {/* Shadows and Ground */}
           <AccumulativeShadows
             temporal={false}
             frames={shadowFrames}
             blend={shadowBlend}
             alphaTest={shadowAlphaTest}
             color={shadowColor}
             colorBlend={shadowColorBlend}
             opacity={shadowOpacity}
             scale={shadowScale}
           >
            <RandomizedLight
              radius={lightRadius}
              ambient={lightAmbient}
              intensity={lightIntensity}
              position={lightPosition}
              bias={lightBias}
            />
          </AccumulativeShadows>
      
        {/* Post-processing effects run after scene render - disabled on mobile for performance */}
        {!isMobile && (
          <PostProcessingEffects
            bloomIntensity={bloomIntensity}
            bloomThreshold={bloomThreshold}
            bloomSmoothing={bloomSmoothing}
            bloomKernelSize={bloomKernelSize}
            saturation={saturation}
            hue={hue}
            toneMappingEnabled={toneMappingEnabled}
            toneMappingMode={toneMappingMode}
            toneMappingBlendFunction={toneMappingBlendFunction}
            toneMappingAdaptive={toneMappingAdaptive}
            toneMappingResolution={toneMappingResolution}
            toneMappingMiddleGrey={toneMappingMiddleGrey}
            toneMappingMaxLuminance={toneMappingMaxLuminance}
            toneMappingAverageLuminance={toneMappingAverageLuminance}
            toneMappingAdaptationRate={toneMappingAdaptationRate}
            filmGrainIntensity={filmGrainIntensity}
            filmGrainGrayscale={filmGrainGrayscale}
            depthFogEnabled={depthFogEnabled}
            depthFogColor={depthFogColor}
            depthFogNear={depthFogNear}
            depthFogFar={depthFogFar}
            depthFogIntensity={depthFogIntensity}
            depthFogRadialInfluence={depthFogRadialInfluence}
          />
        )}
        </SceneInitializer>



      </Canvas>


      <AnimatePresence>
        {sceneReady && (
          <>
            <HUD />
            <JournalBrowser 
              isDocked={isJournalDocked} 
              setIsDocked={setIsJournalDocked}
            />
          </>
        )}
      </AnimatePresence>


      {/* <Sheet sheetPercentage={sheetPercentage} />
       <Controls onPercentageChange={setSheetPercentage} /> */}
    </>
  )
}



