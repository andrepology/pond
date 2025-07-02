import React, { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Points } from '@react-three/drei'
import seedrandom from 'seedrandom'
import { useControls, folder } from 'leva'

interface StarfieldProps {
  // Core configuration
  seed?: string;
  count?: number;
  radius?: number;
  
  // Star visual effects
  twinkleSpeed?: number;
  twinkleAmount?: number;
  sizePulseAmount?: number;
  secondaryFrequency?: number;
  
  // Bloom and rendering
  bloomSize?: number;
  bloomStrength?: number;
  bloomSoftness?: number;
  minStarSize?: number;
  maxRenderDistance?: number;
  
  // Distance and distribution
  distanceFalloff?: number;
  coreBrightness?: number;
  centerBias?: number;
  
  // Legacy props (keeping for compatibility)
  parallaxStrength?: number;
  outsideThreshold?: number;
  insideThreshold?: number;
  shellColor?: string;
}

const Starfield: React.FC<StarfieldProps> = ({
  // Core configuration
  seed = 'default-seed',
  count = 300,
  radius = 64,
  
  // Star visual effects
  twinkleSpeed = 0.5,
  twinkleAmount = 0.4,
  sizePulseAmount = 0.5,
  secondaryFrequency = 0.0,
  
  // Bloom and rendering
  bloomSize = 2.1,
  bloomStrength = 1.2,
  bloomSoftness = 2.2,
  minStarSize = 5.0,
  maxRenderDistance = 150,
  
  // Distance and distribution
  distanceFalloff = 1.0,
  coreBrightness = 2.5,
  centerBias = 3.0,
  
  // Legacy props
  parallaxStrength = 0.05,
  outsideThreshold,
  insideThreshold,
  shellColor,
}) => {
  const { camera } = useThree();

  const pointsRef = useRef<THREE.Points>(null);
  const prevCameraPosition = useRef(new THREE.Vector3());
  const targetRotation = useRef({ x: 0, y: 0 });
  const opacityRef = useRef(1.0);

  const controls = useControls(
    'starfield',
    {
      Stars: folder({
        count: { value: count, min: 50, max: 1000, step: 10, label: 'Star Count' },
        radius: { value: radius, min: 10, max: 200, step: 1, label: 'Starfield Radius' },
        minStarSize: { value: minStarSize, min: 0.5, max: 5.0, step: 0.1, label: 'Min Star Size (px)' },
        maxRenderDistance: { value: maxRenderDistance, min: 50, max: 300, step: 10, label: 'Max Render Distance' },
        centerBias: { value: centerBias, min: 0.3, max: 2.0, step: 0.1, label: 'Center Bias (0.5=center, 1.0=uniform, 1.5=outer)' },
      }),
      Effects: folder({
        twinkleSpeed: { value: twinkleSpeed, min: 0.1, max: 2.0, step: 0.1, label: 'Twinkle Speed' },
        twinkleAmount: { value: twinkleAmount, min: 0.0, max: 1.0, step: 0.05, label: 'Twinkle Amount' },
        sizePulseAmount: { value: sizePulseAmount, min: 0.0, max: 1.0, step: 0.05, label: 'Size Pulse Amount' },
        secondaryFrequency: { value: secondaryFrequency, min: 0.0, max: 2.0, step: 0.1, label: 'Secondary Frequency' },
      }),
      Bloom: folder({
        bloomSize: { value: bloomSize, min: 1.0, max: 5.0, step: 0.1, label: 'Bloom Size' },
        bloomStrength: { value: bloomStrength, min: 0.5, max: 3.0, step: 0.1, label: 'Bloom Strength' },
        bloomSoftness: { value: bloomSoftness, min: 1.0, max: 5.0, step: 0.1, label: 'Bloom Softness' },
      }),
      Distance: folder({
        distanceFalloff: { value: distanceFalloff, min: 0.5, max: 3.0, step: 0.1, label: 'Distance Falloff' },
        coreBrightness: { value: coreBrightness, min: 1.0, max: 5.0, step: 0.1, label: 'Core Brightness' },
      })
    },
    { collapsed: true }
  );

  // For frame rate throttling
  const lastFrameTime = useRef(0);
  const targetFrameRate = 60;
  const frameInterval = 1000 / targetFrameRate;
  const accumulatedStarTimeRef = useRef(0); // Ref for accumulated star animation time

  const [starPositions, starAttributes, starMaterial] = useMemo(() => {
    const rng = seedrandom(seed);
    const positions = new Float32Array(controls.count * 3);
    const scales = new Float32Array(controls.count);
    const randomOffsets = new Float32Array(controls.count);
    const secondaryOffsets = new Float32Array(controls.count);
    const tempPos = new THREE.Vector3();

    let validStarCount = 0;
    let attempts = 0;
    const maxAttempts = controls.count * 3;

    while (validStarCount < controls.count && attempts < maxAttempts) {
      let x, y, z, len;
      do {
        x = (rng() * 2 - 1);
        y = (rng() * 2 - 1);
        z = (rng() * 2 - 1);
        len = x * x + y * y + z * z;
      } while (len > 1);
      const scaleFactor = radius * 0.6 * Math.pow(len, controls.centerBias / 3);
      tempPos.set(x * scaleFactor, y * scaleFactor, z * scaleFactor);
      
      // Position stars relative to component center (origin)
      positions[validStarCount * 3] = tempPos.x;
      positions[validStarCount * 3 + 1] = tempPos.y;
      positions[validStarCount * 3 + 2] = tempPos.z;
      
      scales[validStarCount] = 0.01 + rng() * 0.25;
    
      randomOffsets[validStarCount] = rng() * Math.PI * 2;
      secondaryOffsets[validStarCount] = rng() * Math.PI * 2;
      validStarCount++;
      
      attempts++;
    }

    // Trim arrays if we couldn't generate enough stars
    const finalPositions = validStarCount < controls.count 
      ? positions.subarray(0, validStarCount * 3) 
      : positions;
    const finalScales = validStarCount < controls.count 
      ? scales.subarray(0, validStarCount) 
      : scales;
    const finalRandomOffsets = validStarCount < controls.count 
      ? randomOffsets.subarray(0, validStarCount) 
      : randomOffsets;
    const finalSecondaryOffsets = validStarCount < controls.count 
      ? secondaryOffsets.subarray(0, validStarCount) 
      : secondaryOffsets;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        twinkleSpeed: { value: controls.twinkleSpeed },
        twinkleAmount: { value: controls.twinkleAmount },
        sizePulseAmount: { value: controls.sizePulseAmount },
        secondaryFrequency: { value: controls.secondaryFrequency },
        opacity: { value: 1.0 },
        bloomSize: { value: controls.bloomSize },
        bloomStrength: { value: controls.bloomStrength },
        bloomSoftness: { value: controls.bloomSoftness },
        sphereRadius: { value: controls.radius },
        distanceFalloff: { value: controls.distanceFalloff },
        coreBrightness: { value: controls.coreBrightness },
        minStarSize: { value: minStarSize },
        maxRenderDistance: { value: controls.maxRenderDistance },
      },
      vertexShader: `
      attribute float scale;
      attribute float randomOffset;
      attribute float secondaryOffset;
      uniform float time;
      uniform float twinkleSpeed;
      uniform float twinkleAmount;
      uniform float sizePulseAmount;
      uniform float secondaryFrequency;
      uniform float bloomSize;
      uniform float distanceFalloff;
      uniform float coreBrightness;
      uniform float sphereRadius;
      uniform float minStarSize;
      uniform float maxRenderDistance;
      varying float vBrightness;
      varying vec3 vWorldPosition;
      varying float vDistance;
      varying float vCameraDistance;
      varying float vDistanceAlpha;
      void main() {
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        
        // Calculate distance for culling
        float cameraDistance = -mvPosition.z;
        vCameraDistance = cameraDistance / sphereRadius;
        
        // Distance-based alpha for smooth fade-out
        vDistanceAlpha = smoothstep(maxRenderDistance * 0.8, maxRenderDistance, cameraDistance);
        vDistanceAlpha = 1.0 - vDistanceAlpha;
        
        // Twinkling calculations
        float primaryTwinkle = sin(time * twinkleSpeed + randomOffset) * 0.5 + 0.5;
        float secondaryTwinkle = cos(time * twinkleSpeed * secondaryFrequency + secondaryOffset) * 0.5 + 0.5;
        float twinkle = mix(primaryTwinkle, secondaryTwinkle, 0.3);
        
        // Reduce twinkling for very distant stars to prevent flickering
        float twinkleReduction = smoothstep(maxRenderDistance * 0.5, maxRenderDistance * 0.8, cameraDistance);
        twinkle = mix(twinkle, 0.5, twinkleReduction);
        
        vBrightness = 1.0 - (twinkle * twinkleAmount);
        vDistance = length(position) / sphereRadius;
        
        gl_Position = projectionMatrix * mvPosition;
        
        // Calculate size with minimum clamping
        float sizeVariation = 1.0 + (twinkle * 2.0 - 1.0) * sizePulseAmount;
        float calculatedSize = scale * sizeVariation * (300.0 / cameraDistance) * bloomSize;
        gl_PointSize = max(calculatedSize, minStarSize);
      }
    `,
      fragmentShader: `
      uniform float opacity;
      uniform float bloomStrength;
      uniform float bloomSoftness;
      uniform float distanceFalloff;
      uniform float coreBrightness;
      uniform float sphereRadius;
      uniform float minStarSize;
      uniform float maxRenderDistance;
      varying float vBrightness;
      varying vec3 vWorldPosition;
      varying float vDistance;
      varying float vCameraDistance;
      varying float vDistanceAlpha;
      void main() {
        // Early discard for very distant stars
        if (vDistanceAlpha <= 0.01) {
          discard;
        }
        
        vec2 center = vec2(0.5, 0.5);
        float dist = distance(gl_PointCoord, center);
        
        // Soft edge falloff instead of hard cutoff
        float edgeFalloff = smoothstep(0.5, 0.35, dist);
        if (edgeFalloff <= 0.001) {
          discard;
        }
        
        // Softer core with gradual transition
        float coreRadius = 0.08;
        float coreTransition = 0.25;
        float coreIntensity = 1.8;
        
        // Multi-layer intensity calculation for softer appearance  
        float coreFactor = smoothstep(coreRadius + coreTransition, coreRadius, dist);
        float haloFactor = exp(-bloomSoftness * dist * 1.5) * edgeFalloff;
        float outerGlow = exp(-dist * 3.0) * 0.3;
        
        // Blend core and halo smoothly
        float intensity = mix(
          haloFactor * bloomStrength + outerGlow,
          coreIntensity,
          coreFactor
        );
        
        // Enhanced distance dimming for depth
        float distanceDimming = mix(
          coreBrightness * 0.15,
          coreBrightness,
          1.0 / (1.0 + pow(vCameraDistance * 0.8, distanceFalloff))
        );
        
        // Warmer center, cooler edges with softer transition
        vec3 warmCenter = vec3(1.0, 0.98, 0.94);
        vec3 coolEdge = vec3(0.92, 0.96, 1.0);
        vec3 starColor = mix(warmCenter, coolEdge, smoothstep(0.0, 0.4, dist));
        
        vec3 finalColor = starColor * intensity * distanceDimming;
        float finalAlpha = intensity * opacity * vBrightness * distanceDimming * vDistanceAlpha * edgeFalloff;
        
        gl_FragColor = vec4(finalColor, finalAlpha);
      }
    `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    });

    return [
      finalPositions, 
      { scales: finalScales, randomOffsets: finalRandomOffsets, secondaryOffsets: finalSecondaryOffsets }, 
      material
    ];
  }, [
    seed, minStarSize, controls.count, controls.radius, controls.centerBias, 
    controls.twinkleSpeed, controls.twinkleAmount, controls.sizePulseAmount, 
    controls.secondaryFrequency, controls.bloomSize, controls.bloomStrength, 
    controls.bloomSoftness, controls.distanceFalloff, controls.coreBrightness, 
    controls.maxRenderDistance
  ]);

  useFrame((state, delta) => {
    const now = performance.now();
    const elapsed = now - lastFrameTime.current;
    const dt = Math.min(delta, 0.05); // Clamp delta time

    if (elapsed < frameInterval && now > 0) { return; }
    lastFrameTime.current = now;

    accumulatedStarTimeRef.current += dt; // Accumulate time using clamped delta for stars

    if (pointsRef.current) {
        (starMaterial as THREE.ShaderMaterial).uniforms.time.value = accumulatedStarTimeRef.current;
    }

    const zoom = camera.zoom;
    const maxZoom = 15;
    const minZoom = 4;
    let newStarsOpacity = 1.0; // Temporarily force opacity to 1.0

    // if (zoom > maxZoom) {
    //   newStarsOpacity = 1.0;
    // } else if (zoom < minZoom) {
    //   newStarsOpacity = 0.0;
    // } else {
    //   const normalizedZoom = (zoom - minZoom) / (maxZoom - minZoom);
    //   newStarsOpacity = Math.pow(normalizedZoom, 2.5);
    // }

    opacityRef.current = newStarsOpacity;
    if (pointsRef.current && starMaterial instanceof THREE.ShaderMaterial) {
        (starMaterial as THREE.ShaderMaterial).uniforms.opacity.value = newStarsOpacity;
        pointsRef.current.visible = newStarsOpacity > 0.01;
    }

  
    
    if (pointsRef.current) {
        const driftYSpeed = -0.055; 
        // Use delta time instead of accumulated time to prevent catch-up behavior
        const driftIncrement = dt * driftYSpeed; 
        targetRotation.current.y += driftIncrement;
        
        const rotationYDelta = (targetRotation.current.y - pointsRef.current.rotation.y) * 0.05; 
        const rotationXDelta = (targetRotation.current.x - pointsRef.current.rotation.x) * 0.05; 
        pointsRef.current.rotation.y += rotationYDelta;
        pointsRef.current.rotation.x += rotationXDelta;
        
    }
  });

  // Cleanup for star material
  useEffect(() => {
    const currentStarMaterial = starMaterial;
    return () => {
      (currentStarMaterial as THREE.ShaderMaterial)?.dispose();
    };
  }, [starMaterial]);

  return (
    <Points
      ref={pointsRef}
      positions={starPositions}
      material={starMaterial}
      frustumCulled
    >
      <bufferAttribute
        attach="geometry-attributes-scale"
        args={[starAttributes.scales, 1]}
      />
      <bufferAttribute
        attach="geometry-attributes-randomOffset"
        args={[starAttributes.randomOffsets, 1]}
      />
      <bufferAttribute
        attach="geometry-attributes-secondaryOffset"
        args={[starAttributes.secondaryOffsets, 1]}
      />
    </Points>
  );
};

export default Starfield; 