import * as THREE from 'three'
import { useState, forwardRef, useMemo, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Preload, AccumulativeShadows, RandomizedLight, Icosahedron, Environment, Box, useGLTF, Center, useTexture, Stats } from '@react-three/drei'
import { Leva, useControls } from 'leva'
import { Focusable } from './components/focusable'
import { CameraRig } from './components/camera-rig'
import PondSphere from './components/pond-sphere'

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
      <Leva collapsed   hidden />
      

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

        <Environment preset="park"  environmentIntensity={1.0}  />

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
    
      {/* <Sheet sheetPercentage={sheetPercentage} />
       <Controls onPercentageChange={setSheetPercentage} /> */}
    </>
  )
}