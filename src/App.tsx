import * as THREE from 'three'
import { useState, forwardRef, useMemo, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Preload, Environment, useGLTF, Center } from '@react-three/drei'
import { Leva, useControls } from 'leva'
import { Focusable } from './components/Focusable'
import { CameraRig } from './components/CameraRig'
import PondSphere from './components/PondSphere'

import { useLocation } from 'wouter'
import { DateTimeDisplay } from './components/DateTimeDisplay'
import { AdaptiveFog } from './components/AdaptiveFog'

import MindBody from './components/MindBody'
import ZenSand from './components/ZenSand'


useGLTF.preload('/models/mindbody.glb')
useGLTF.preload('/models/wellstone.glb')

export default function App() {
  const [sheetPercentage, setSheetPercentage] = useState(0)
  const [, setLocation] = useLocation()

  return (
    <>
      <Leva collapsed={false} hidden={false} />
      

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

        <Environment preset="forest"  environmentIntensity={1.0}  />

        {/* Lights */}
        <ambientLight intensity={Math.PI / 4} />
        <directionalLight
          castShadow
          intensity={ 1.5 * Math.PI }
          position={[5, 18, 48]}
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.00015}
          shadow-radius={10}
          shadow-blurSamples={20}
        />


        {/* Main Scene Content */}
        <ZenSand
          size={40}
          segments={512}
          color="#ffffff"
          amplitude={0.05}
          frequency={4}
          driftSpeed={1.1}
          centers={[[ 0.4, -3 ]]}
          position={[-1.2, -1, -1.5]}
        />
        <Center position={[0, 0.5, 1.5]}>
          <Focusable id="01" name="pond" position={[-1.2, 1.8, -3]} inspectable>
            <PondSphere />
          </Focusable>
          <Focusable id="02" name="mindbody" position={[1.0, 0.2, -3]}>
            <MindBody 
              color="indianred" 
              wandering={true} 
              wanderCenter={new THREE.Vector3(-1.2, 1.8, -3)} 
            />
          </Focusable>
          {/* <Focusable id="03" name="wellstone" position={[-1, 0.5, 0]}>
            <WellStone color="limegreen" />
          </Focusable> */}

          {/* Shadows and Ground */}

        </Center>


        
      </Canvas>

      <DateTimeDisplay />
    
      {/* <Sheet sheetPercentage={sheetPercentage} />
       <Controls onPercentageChange={setSheetPercentage} /> */}
    </>
  )
}