import React, { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useControls, folder } from 'leva'

// Global geometries cache to avoid recreation
const geometriesCache = new Map<string, THREE.SphereGeometry>()
const getGeometry = (radius: number, segments: number): THREE.SphereGeometry => {
  const key = `${radius}-${segments}`
  if (!geometriesCache.has(key)) {
    geometriesCache.set(key, new THREE.SphereGeometry(radius, segments, Math.max(24, segments)))
  }
  return geometriesCache.get(key)!
}

// Reusable vectors to avoid allocations
const _sunPosition = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)
const _tempVec = new THREE.Vector3()

// Define props interface matching original Sky
interface SphericalSkyProps {
  turbidity?: number
  rayleigh?: number
  mieCoefficient?: number
  mieDirectionalG?: number
  sunPosition?: [number, number, number]
  up?: [number, number, number]
  radius?: number
  displayRadius?: number // The apparent radius for shader calculations
  segments?: number
  // Performance optimizations
  updateFrequency?: number // How often to update (in frames)
  lowQuality?: boolean // Enable lower quality mode
  // Unique ID for Leva controls
  controlsId?: string
  // Time animation
  initialTimeScale?: number
  initialEnableTimeAnimation?: boolean
}

const SphericalSky: React.FC<SphericalSkyProps> = ({
  turbidity: initialTurbidity = 7,
  rayleigh: initialRayleigh = 2,
  mieCoefficient: initialMieCoefficient = 0.07,
  mieDirectionalG: initialMieDirectionalG = 0.35,
  sunPosition: initialSunPosition = [0, 0, 1],
  up: initialUp = [0, 1, 0],
  radius = 1000,
  displayRadius = 1000, // Default to a large radius for the visual effect
  segments = 16, // Lower segment count for better performance
  updateFrequency = 10, // Only update every 10 frames
  lowQuality = false,
  controlsId = 'sky',
  initialTimeScale = 0.01,
  initialEnableTimeAnimation = true
}) => {
  // Create Leva controls
  const { turbidity, rayleigh, sunPosition, mieCoefficient, mieDirectionalG, directionOverride, isOrthographic, timeScale, enableTimeAnimation, horizonOffset } = useControls(
    controlsId,
    {
      Sky: folder({
        turbidity: {
          value: initialTurbidity,
          min: 1,
          max: 100,
          step: 0.1,
          label: 'Turbidity'
        },
        rayleigh: {
          value: initialRayleigh,
          min: 0,
          max: 12,
          step: 0.01,
          label: 'Rayleigh'
        },
        mieCoefficient: {
          value: initialMieCoefficient,
          min: 0.0001,
          max: 0.5,
          step: 0.0001,
          label: 'Mie Coefficient'
        },
        mieDirectionalG: {
          value: initialMieDirectionalG,
          min: 0,
          max: 1,
          step: 0.01,
          label: 'Mie DirectionalG'
        },
        sunPosition: {
          value: {
            x: initialSunPosition[0],
            y: initialSunPosition[1],
            z: initialSunPosition[2]
          },
          step: 0.1,
          label: 'Sun Position'
        },
        rayOffset: {
          value: 0.1,
          min: 0,
          max: 1.0,
          step: 0.01,
          label: 'Ray Offset'
        },
        enableTimeAnimation: {
          value: initialEnableTimeAnimation,
          label: 'Enable Time Passage'
        },
        timeScale: {
          value: initialTimeScale,
          min: 0.1,
          max: 5.0,
          step: 0.1,
          label: 'Time Scale'
        }
      }),
      Horizon: folder({
        horizonOffset: {
          value: {
            x: -2.0,
            y: 0.95,
            z: -2.0
          },
          step: 0.1,
          label: 'Horizon Offset'
        }
      }),
      Direction: folder({
        directionOverride: {
          value: [0, 1, 0],
          label: 'View Direction'
        },
        isOrthographic: false
      })
    },
    { collapsed: true }
  )

  // Track time
  const timeRef = useRef(0)

  // Calculate actual sun position based on animation state
  const actualSunPosition = useMemo(() => {
    if (!enableTimeAnimation) {
      return {
        x: sunPosition.x,
        y: sunPosition.y,
        z: sunPosition.z
      }
    }

    // Keep x and z from UI controls, only override y
    return {
      x: sunPosition.x,
      y: sunPosition.y, // Will be overridden in useFrame
      z: sunPosition.z
    }
  }, [sunPosition, enableTimeAnimation])

  // Convert leva controls sunPosition object to array
  const sunPositionArray: [number, number, number] = [actualSunPosition.x, actualSunPosition.y, actualSunPosition.z]

  // Track previous props to avoid unnecessary updates
  const prevProps = useRef({
    sunPosition: sunPositionArray,
    turbidity,
    rayleigh,
    mieCoefficient,
    mieDirectionalG
  })

  // Keep references for cleanup
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  // Access to the camera
  const { camera } = useThree()

  // Create material with modified shader
  const material = useMemo(() => {
    if (materialRef.current) {
      materialRef.current.dispose()
    }

    const material = new THREE.ShaderMaterial({
      uniforms: {
        turbidity: { value: turbidity },
        rayleigh: { value: rayleigh },
        mieCoefficient: { value: mieCoefficient },
        mieDirectionalG: { value: mieDirectionalG },
        sunPosition: { value: _sunPosition.set(...sunPositionArray) },
        up: { value: _up.set(...initialUp) },
        // Add new uniform for camera direction override
        cameraForward: { value: new THREE.Vector3(...directionOverride) },
        displayRadius: { value: displayRadius },
        horizonOffset: { value: new THREE.Vector3(horizonOffset.x, horizonOffset.y, horizonOffset.z) }
      },
      vertexShader: /* glsl */ `
		uniform vec3 sunPosition;
		uniform float rayleigh;
		uniform float turbidity;
		uniform float mieCoefficient;
        uniform float displayRadius;
		uniform vec3 up;

		varying vec3 vWorldPosition;
		varying vec3 vSunDirection;
		varying float vSunfade;
		varying vec3 vBetaR;
		varying vec3 vBetaM;
		varying float vSunE;

		// constants for atmospheric scattering
		const float e = 2.71828182845904523536028747135266249775724709369995957;
		const float pi = 3.141592653589793238462643383279502884197169;

		// wavelength of used primaries, according to preetham
		const vec3 lambda = vec3( 680E-9, 550E-9, 450E-9 );
		// this pre-calculation replaces older TotalRayleigh(vec3 lambda) function:
		// (8.0 * pow(pi, 3.0) * pow(pow(n, 2.0) - 1.0, 2.0) * (6.0 + 3.0 * pn)) / (3.0 * N * pow(lambda, vec3(4.0)) * (6.0 - 7.0 * pn))
		const vec3 totalRayleigh = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 );

		// mie stuff
		// K coefficient for the primaries
		const float v = 4.0;
		const vec3 K = vec3( 0.686, 0.678, 0.666 );
		// MieConst = pi * pow( ( 2.0 * pi ) / lambda, vec3( v - 2.0 ) ) * K
		const vec3 MieConst = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 );

		// earth shadow hack
		// cutoffAngle = pi / 1.95;
		const float cutoffAngle = 1.6110731556870734;
		const float steepness = 1.5;
		const float EE = 1000.0;

		float sunIntensity( float zenithAngleCos ) {
			zenithAngleCos = clamp( zenithAngleCos, -1.0, 1.0 );
			return EE * max( 0.0, 1.0 - pow( e, -( ( cutoffAngle - acos( zenithAngleCos ) ) / steepness ) ) );
		}

		vec3 totalMie( float T ) {
			float c = ( 0.2 * T ) * 10E-18;
			return 0.434 * c * MieConst;
		}

		void main() {
            // Inflate the world position for the fragment shader to get large-scale effects
			vec4 worldPosition = modelMatrix * vec4( position * displayRadius, 1.0 );
			vWorldPosition = worldPosition.xyz;

            // Use the actual, small-scale position for the screen projection
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			// gl_Position.z = gl_Position.w; // set z to camera.far

			vSunDirection = normalize( sunPosition );

			vSunE = sunIntensity( dot( vSunDirection, up ) );

			vSunfade = 1.0 - clamp( 1.0 - exp( ( sunPosition.y / 450000.0 ) ), 0.0, 1.0 );

			float rayleighCoefficient = rayleigh - ( 1.0 * ( 1.0 - vSunfade ) );

			// extinction (absorption + out scattering)
			// rayleigh coefficients
			vBetaR = totalRayleigh * rayleighCoefficient;

			// mie coefficients
			vBetaM = totalMie( turbidity ) * mieCoefficient;

		}`,

      fragmentShader: /* glsl */ `
		varying vec3 vWorldPosition;
		varying vec3 vSunDirection;
		varying float vSunfade;
		varying vec3 vBetaR;
		varying vec3 vBetaM;
		varying float vSunE;

		uniform float mieDirectionalG;
		uniform vec3 up;
		uniform vec3 cameraForward; // Camera direction override for orthographic view
		uniform vec3 horizonOffset; // Horizon position offset

		// constants for atmospheric scattering
		const float pi = 3.141592653589793238462643383279502884197169;

		const float n = 1.0003; // refractive index of air
		const float N = 2.545E25; // number of molecules per unit volume for air at 288.15K and 1013mb (sea level -45 celsius)

		// optical length at zenith for molecules
		const float rayleighZenithLength = 8.4E3;
		const float mieZenithLength = 1.25E3;
		// 66 arc seconds -> degrees, and the cosine of that
		const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;

		// 3.0 / ( 16.0 * pi )
		const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
		// 1.0 / ( 4.0 * pi )
		const float ONE_OVER_FOURPI = 0.07957747154594767;

		float rayleighPhase( float cosTheta ) {
			return THREE_OVER_SIXTEENPI * ( 1.0 + pow( cosTheta, 2.0 ) );
		}

		float hgPhase( float cosTheta, float g ) {
			float g2 = pow( g, 2.0 );
			float inverse = 1.0 / pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 );
			return ONE_OVER_FOURPI * ( ( 1.0 - g2 ) * inverse );
		}

		void main() {
          // MODIFIED: Use camera-relative direction instead of position-based direction
          vec3 direction = normalize(cameraForward);
          
          // For realistic effect, blend world position with camera direction
          // This creates a more natural gradation across the sphere
          vec3 localPos = normalize(vWorldPosition);
          
          // Apply horizon offset using uniform controls
          localPos.x += horizonOffset.x;
          localPos.y += horizonOffset.y;
          localPos.z += horizonOffset.z;
          localPos = normalize(localPos);
          
          direction = normalize(mix(direction, localPos, 1.50));

          // optical length
          // cutoff angle at 90 to avoid singularity in next formula.
          float zenithAngle = acos( max( 0.0, dot( up, direction ) ) );
          float inverse = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / pi ), -1.253 ) );
          float sR = rayleighZenithLength * inverse;
          float sM = mieZenithLength * inverse;

          // combined extinction factor
          vec3 Fex = exp( -( vBetaR * sR + vBetaM * sM ) );

          // in scattering
          float cosTheta = dot( direction, vSunDirection );

          float rPhase = rayleighPhase( cosTheta * 0.5 + 0.5 );
          vec3 betaRTheta = vBetaR * rPhase;

          float mPhase = hgPhase( cosTheta, mieDirectionalG );
          vec3 betaMTheta = vBetaM * mPhase;

          vec3 Lin = pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );
          Lin *= mix( vec3( 1.0 ), pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * Fex, vec3( 1.0 / 2.0 ) ), clamp( pow( 1.0 - dot( up, vSunDirection ), 5.0 ), 0.0, 1.0 ) );

          // nightsky
          float theta = acos( direction.y ); // elevation --> y-axis, [-pi/2, pi/2]
          float phi = atan( direction.z, direction.x ); // azimuth --> x-axis [-pi/2, pi/2]
          vec2 uv = vec2( phi, theta ) / vec2( 2.0 * pi, pi ) + vec2( 0.5, 0.0 );
          vec3 L0 = vec3( 0.1 ) * Fex;

          // composition + solar disc
          float sundisk = smoothstep( sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta );
          L0 += ( vSunE * 19000.0 * Fex ) * sundisk;

          vec3 texColor = ( Lin + L0 ) * 0.04 + vec3( 0.0, 0.0003, 0.00075 );

          vec3 retColor = pow( texColor, vec3( 1.0 / ( 1.2 + ( 1.2 * vSunfade ) ) ) );

          retColor = min(retColor, vec3(1.0));

          gl_FragColor = vec4( retColor, 1.0 );

          #include <tonemapping_fragment>
          #include <colorspace_fragment>

		}`,
      side: THREE.BackSide,
      depthWrite: true,
   
    })

    materialRef.current = material
    return material
  }, [
    // Only include parameters that require shader recompilation
    turbidity,
    rayleigh,
    mieCoefficient,
    mieDirectionalG,
    lowQuality,
    displayRadius,
    horizonOffset
    // sunPosition removed from deps to prevent unnecessary recreation
  ])

  // Update material uniforms on prop changes
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.turbidity.value = turbidity
      materialRef.current.uniforms.rayleigh.value = rayleigh
      materialRef.current.uniforms.mieCoefficient.value = mieCoefficient
      materialRef.current.uniforms.mieDirectionalG.value = mieDirectionalG
      materialRef.current.uniforms.sunPosition.value.set(...sunPositionArray)
      materialRef.current.uniforms.cameraForward.value.set(...directionOverride)
      materialRef.current.uniforms.displayRadius.value = displayRadius
      materialRef.current.uniforms.horizonOffset.value.set(horizonOffset.x, horizonOffset.y, horizonOffset.z)
    }
  }, [turbidity, rayleigh, mieCoefficient, mieDirectionalG, sunPositionArray, directionOverride, displayRadius, horizonOffset])

  // Update camera direction in the shader
  useFrame(() => {
    if (materialRef.current) {
      if (isOrthographic) {
        // Use manual direction override from leva controls
        materialRef.current.uniforms.cameraForward.value.set(...directionOverride)
      } else {
        // Get the camera's look direction
        _tempVec.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize()
        materialRef.current.uniforms.cameraForward.value.copy(_tempVec)
      }
    }
  })

  // Time animation frame
  useFrame((_, delta) => {
    if (!enableTimeAnimation || !materialRef.current) return

    // Update time based on timeScale
    timeRef.current += delta * timeScale

    // Calculate x position: linear back and forth between -3 and 3
    // Create a triangle wave using modulo and linear interpolation
    const period = 4 // Full cycle duration
    const normalizedTime = (timeRef.current % period) / period // 0 to 1
    const triangleWave = normalizedTime < 0.5 
      ? normalizedTime * 2 // 0 to 1 in first half
      : 2 - (normalizedTime * 2) // 1 to 0 in second half
    const xPosition = -3 + (triangleWave * 6) // Map from [0,1] to [-3,3]

    // Calculate y position: oscillate between -0.1 and 0.1
    const yPosition = 0.0 * Math.sin(timeRef.current * 0.3)

    // Update sun position with the new x and y values
    if (materialRef.current) {
      materialRef.current.uniforms.sunPosition.value.x = xPosition
      materialRef.current.uniforms.sunPosition.value.y = yPosition
    }
  })

  // PERFORMANCE: Use frame skipping with ref comparison
  const frameCount = useRef(0)
  useFrame(() => {
    frameCount.current = (frameCount.current + 1) % updateFrequency
    if (frameCount.current !== 0) return

    const { current: prev } = prevProps

    // Only update sun position when it changes (for non-animated properties)
    if (
      !enableTimeAnimation &&
      (prev.sunPosition[0] !== sunPositionArray[0] || prev.sunPosition[1] !== sunPositionArray[1] || prev.sunPosition[2] !== sunPositionArray[2])
    ) {
      if (materialRef.current) {
        materialRef.current.uniforms.sunPosition.value.set(...sunPositionArray)
      }
      prev.sunPosition = [...sunPositionArray]
    }
  })

  // Get cached geometry
  const geometry = useMemo(() => getGeometry(radius, segments), [radius, segments])

  // Proper cleanup
  useEffect(() => {
    return () => {
      // Material will be disposed by the materialRef when component unmounts
      if (materialRef.current) {
        materialRef.current.dispose()
      }
    }
  }, [])

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={true} castShadow />
    </group>
  )
}

export default SphericalSky
