import React, { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import type { SpineState } from '../core/Spine'
import { useFrame } from '@react-three/fiber'
import { createFishBodyShaderMaterial } from './FishBodyShader'
import { useControls, folder } from 'leva'

interface TubeBodyProps {
  spine: SpineState
  headRef: React.MutableRefObject<THREE.Mesh | null>
  headDirection: React.MutableRefObject<THREE.Vector3>
  velocity?: React.MutableRefObject<THREE.Vector3>
  color?: THREE.ColorRepresentation
}

export function TubeBody({ spine, headRef, headDirection, velocity, color = '#FFFFFF' }: TubeBodyProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  // Leva controls for body shape parameters
  const bodyControls = useControls('Fish Body', {
    shape: folder({
      maxRadius: { value: 0.35, min: 0.1, max: 1.0, step: 0.05, label: 'Max Radius' },
      headRoundness: { value: 0.6, min: 0.1, max: 1.5, step: 0.05, label: 'Head Roundness (p)' },
      tailSharpness: { value: 2.1, min: 0.5, max: 4.0, step: 0.1, label: 'Tail Sharpness (q)' },
    }),
    belly: folder({
      bellyAmount: { value: 0.08, min: 0.0, max: 0.3, step: 0.01, label: 'Belly Amount' },
      bellyFrequency: { value: 0.8, min: 0.3, max: 2.0, step: 0.1, label: 'Belly Frequency' },
    }),
    shader: folder({
      inkDensity: { value: 0.8, min: 0.0, max: 2.0, step: 0.1, label: 'Ink Density' },
      turbulenceScale: { value: 2.5, min: 0.5, max: 10.0, step: 0.5, label: 'Turbulence Scale' },
      flowStrength: { value: 3.0, min: 0.0, max: 10.0, step: 0.5, label: 'Flow Strength' },
      opacity: { value: 0.5, min: 0.0, max: 1.0, step: 0.05, label: 'Opacity' },
    }),
    geometry: folder({
      samplesPerSegment: { value: 8, min: 4, max: 16, step: 1, label: 'Samples/Segment' },
      ringSegments: { value: 32, min: 16, max: 64, step: 4, label: 'Ring Segments' },
    }),
  }, { collapsed: true })

  const samplesPerSegment = bodyControls.samplesPerSegment
  const effectiveSegments = useMemo(() => Math.max(1, spine.points.length + 1), [spine.points.length])
  const sampleCount = useMemo(() => Math.max(2, effectiveSegments * samplesPerSegment + 1), [effectiveSegments, samplesPerSegment])
  const ringSegments = bodyControls.ringSegments
  const ringCos = useMemo(() => {
    const a = new Float32Array(ringSegments + 1)
    for (let x = 0; x <= ringSegments; x++) a[x] = Math.cos((x / ringSegments) * Math.PI * 2)
    return a
  }, [ringSegments])
  const ringSin = useMemo(() => {
    const a = new Float32Array(ringSegments + 1)
    for (let x = 0; x <= ringSegments; x++) a[x] = Math.sin((x / ringSegments) * Math.PI * 2)
    return a
  }, [ringSegments])

  const smoothstep = (edge0: number, edge1: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)
  }

  const { geometry, material } = useMemo(() => {
    // Pure ring-based teardrop geometry - no caps
    const totalVertCount = sampleCount * (ringSegments + 1)
    const positions = new Float32Array(totalVertCount * 3)
    const normals = new Float32Array(totalVertCount * 3)
    const uvs = new Float32Array(totalVertCount * 2)
    const indices: number[] = []

    // Ring-to-ring quads only
    for (let y = 0; y < sampleCount - 1; y++) {
      for (let x = 0; x < ringSegments; x++) {
        const a = y * (ringSegments + 1) + x
        const b = a + ringSegments + 1
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }

    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geom.setIndex(indices)
    const mat = createFishBodyShaderMaterial()
    return { geometry: geom, material: mat }
  }, [sampleCount, ringSegments])

  useEffect(() => {
    return () => { geometry.dispose(); (material as THREE.Material).dispose() }
  }, [geometry, material])

  // Keep material color in sync without recreating material
  useEffect(() => {
    if ((material as THREE.ShaderMaterial).uniforms?.baseColor) {
      (material as THREE.ShaderMaterial).uniforms.baseColor.value.set(color)
    }
  }, [material, color])

  // Working arrays to avoid per-frame allocations
  const centersRef = useRef<THREE.Vector3[] | null>(null)
  const tangentsRef = useRef<THREE.Vector3[] | null>(null)
  const normalsRef = useRef<THREE.Vector3[] | null>(null)
  const binormalsRef = useRef<THREE.Vector3[] | null>(null)
  const ringRadiiRef = useRef<Float32Array | null>(null)
  const ringRadiiDerivRef = useRef<Float32Array | null>(null)

  // Persistent curve and control points
  const controlPointsRef = useRef<THREE.Vector3[] | null>(null)
  const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null)

  // Scratch vectors
  const scratchRef = useRef({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3() })

  // Ensure vector arrays sized to sampleCount
  useEffect(() => {
    const ensureVecArray = (ref: React.MutableRefObject<THREE.Vector3[] | null>) => {
      if (!ref.current || ref.current.length !== sampleCount) {
        ref.current = new Array(sampleCount)
        for (let i = 0; i < sampleCount; i++) ref.current[i] = new THREE.Vector3()
      }
    }
    ensureVecArray(centersRef)
    ensureVecArray(tangentsRef)
    ensureVecArray(normalsRef)
    ensureVecArray(binormalsRef)
    if (!ringRadiiRef.current || ringRadiiRef.current.length !== sampleCount) {
      ringRadiiRef.current = new Float32Array(sampleCount)
    }
    if (!ringRadiiDerivRef.current || ringRadiiDerivRef.current.length !== sampleCount) {
      ringRadiiDerivRef.current = new Float32Array(sampleCount)
    }
  }, [sampleCount])

  // Ensure control points and curve sized to spine length (ghostHead + head + points + ghostTail)
  useEffect(() => {
    const controlCount = spine.points.length + 3
    if (!controlPointsRef.current || controlPointsRef.current.length !== controlCount) {
      controlPointsRef.current = new Array(controlCount)
      for (let i = 0; i < controlCount; i++) controlPointsRef.current[i] = new THREE.Vector3()
    }
    if (!curveRef.current) {
      curveRef.current = new THREE.CatmullRomCurve3(controlPointsRef.current, false, 'centripetal', 0.0)
    } else {
      curveRef.current.points = controlPointsRef.current
    }
  }, [spine.points.length])

  useFrame((state) => {
    // Skip frame if refs not initialized yet (race condition guard)
    if (!controlPointsRef.current || !centersRef.current) return

    // Update shader uniforms every frame
    const shaderMat = material as THREE.ShaderMaterial
    if (shaderMat.uniforms) {
      shaderMat.uniforms.time.value = state.clock.elapsedTime
      shaderMat.uniforms.inkDensity.value = bodyControls.inkDensity
      shaderMat.uniforms.turbulenceScale.value = bodyControls.turbulenceScale
      shaderMat.uniforms.flowStrength.value = bodyControls.flowStrength
      shaderMat.uniforms.opacity.value = bodyControls.opacity
      if (velocity?.current) {
        shaderMat.uniforms.velocity.value.copy(velocity.current)
      }
    }

    const positions = (geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array
    const normals = (geometry.getAttribute('normal') as THREE.BufferAttribute).array as Float32Array
    const uvs = (geometry.getAttribute('uv') as THREE.BufferAttribute).array as Float32Array

    // Build curve with ghost endpoints for stability
    const headPos = headRef.current?.position ?? spine.points[0] ?? scratchRef.current.a.set(0, 0, 0)
    const first = spine.points[0] ?? headPos
    const last = spine.points[spine.points.length - 1] ?? first
    const prevLast = spine.points[spine.points.length - 2] ?? scratchRef.current.b.copy(last).add(scratchRef.current.c.set(0, 0, -0.001))
    const ghostHead = scratchRef.current.a.copy(headPos).add(scratchRef.current.b.copy(headPos).sub(first))
    const ghostTail = scratchRef.current.c.copy(last).add(scratchRef.current.b.copy(last).sub(prevLast))
    const controlPoints = controlPointsRef.current
    controlPoints[0].copy(ghostHead)
    controlPoints[1].copy(headPos)
    for (let i = 0; i < spine.points.length; i++) controlPoints[i + 2].copy(spine.points[i])
    controlPoints[controlPoints.length - 1].copy(ghostTail)
    const curve = curveRef.current!
    const centers = centersRef.current!
    for (let i = 0; i < sampleCount; i++) {
      const t = (i + 1) / (sampleCount + 1)
      curve.getPoint(t, centers[i])
    }

    // Compute tangents
    const tangents = tangentsRef.current!
    for (let i = 0; i < sampleCount; i++) {
      const prev = centers[Math.max(0, i - 1)]
      const next = centers[Math.min(sampleCount - 1, i + 1)]
      tangents[i].subVectors(next, prev).normalize()
    }

    // Minimal-twist frames
    const normalsF = normalsRef.current!
    const binormalsF = binormalsRef.current!
    const t0 = tangents[0]
    // Smooth transition between up vectors to prevent instant orientation switches
    const upY = new THREE.Vector3(0, 1, 0)
    const upX = new THREE.Vector3(1, 0, 0)
    const t = Math.abs(t0.y)
    const blendFactor = THREE.MathUtils.smoothstep(0.6, 1.0, t) // Wider transition zone
    const up = scratchRef.current.a.lerpVectors(upY, upX, blendFactor)
    normalsF[0].copy(up).sub(scratchRef.current.b.copy(t0).multiplyScalar(up.dot(t0))).normalize()
    binormalsF[0].crossVectors(t0, normalsF[0]).normalize()
    for (let i = 1; i < sampleCount; i++) {
      const ti = tangents[i]
      const nPrev = normalsF[i - 1]
      const ni = normalsF[i]
      ni.copy(nPrev).sub(scratchRef.current.b.copy(ti).multiplyScalar(nPrev.dot(ti)))
      const len = ni.length()
      if (len < 1e-5) {
        ni.copy(scratchRef.current.c.crossVectors(binormalsF[i - 1], ti)).normalize()
      } else {
        ni.multiplyScalar(1 / len)
      }
      binormalsF[i].crossVectors(ti, ni).normalize()
    }

    // Fill vertex buffers with teardrop geometry
    const tmp = scratchRef.current.a
    const radial = scratchRef.current.b
    const ringRadii = ringRadiiRef.current!
    const ringRadiiDeriv = ringRadiiDerivRef.current!

    // Teardrop shape parameters from Leva controls
    const maxR = bodyControls.maxRadius
    const p = bodyControls.headRoundness  // controls head roundness (lower = rounder)
    const q = bodyControls.tailSharpness  // controls tail sharpness (higher = sharper)

    for (let y = 0; y < sampleCount; y++) {
      const center = centers[y]
      const t = y / (sampleCount - 1)
      const s = t

      // Compute radius: r(s) = maxR * s^p * (1-s)^q * belly(s)
      const sPowP = Math.pow(s, p)
      const oneMinusS = 1 - s
      const oneMinusSPowQ = Math.pow(oneMinusS, q)
      const baseRadius = sPowP * oneMinusSPowQ
      
      // Belly curve from Leva controls
      const bellyArg = Math.PI * s * bodyControls.bellyFrequency
      const belly = 1 + bodyControls.bellyAmount * Math.sin(bellyArg)
      
      const radius = Math.max(0.001, maxR * baseRadius * belly)
      ringRadii[y] = radius

      // Compute dr/ds using product rule: d/ds[s^p * (1-s)^q * belly(s)]
      // = [p * s^(p-1) * (1-s)^q - q * s^p * (1-s)^(q-1)] * belly + s^p * (1-s)^q * d(belly)/ds
      const dBaseRadius = p * Math.pow(Math.max(0.001, s), p - 1) * oneMinusSPowQ - 
                          q * sPowP * Math.pow(oneMinusS, q - 1)
      const dBelly = bodyControls.bellyAmount * Math.PI * bodyControls.bellyFrequency * Math.cos(bellyArg)
      const dRadius = maxR * (dBaseRadius * belly + baseRadius * dBelly)
      
      // Convert ds to dt (since s = t, ds/dt = 1, so dr/dt = dr/ds)
      // Scale by spine length to get proper world-space derivative
      ringRadiiDeriv[y] = dRadius

      const normal = normalsF[y]
      const binorm = binormalsF[y]
      const tangent = tangents[y]
      const drdt = ringRadiiDeriv[y]

      for (let x = 0; x <= ringSegments; x++) {
        const idx = (y * (ringSegments + 1) + x) * 3
        const uvIdx = (y * (ringSegments + 1) + x) * 2
        const nx = ringCos[x]
        const ny = ringSin[x]
        tmp.copy(center)
        tmp.addScaledVector(normal, nx * radius)
        tmp.addScaledVector(binorm, ny * radius)
        positions[idx] = tmp.x
        positions[idx + 1] = tmp.y
        positions[idx + 2] = tmp.z

        // Compute correct surface normal for parametric tube
        // Surface: P(u,v) = C(u) + r(u) * [N(u) * cos(v) + B(u) * sin(v)]
        // Normal: (radialVector - tangent * dr/du).normalize()
        radial.set(0, 0, 0)
        radial.addScaledVector(normal, nx)
        radial.addScaledVector(binorm, ny)
        
        // Subtract the tangent component weighted by radius derivative
        const surfaceNormal = scratchRef.current.c
        surfaceNormal.copy(radial).addScaledVector(tangent, -drdt)
        surfaceNormal.normalize()

        normals[idx] = surfaceNormal.x
        normals[idx + 1] = surfaceNormal.y
        normals[idx + 2] = surfaceNormal.z

        // UV coordinates: x = ring position (0-1), y = spine position (0-1)
        uvs[uvIdx] = x / ringSegments
        uvs[uvIdx + 1] = y / (sampleCount - 1)
      }
    }

    geometry.getAttribute('position').needsUpdate = true
    geometry.getAttribute('normal').needsUpdate = true
    geometry.getAttribute('uv').needsUpdate = true
  })

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />
  )
}

