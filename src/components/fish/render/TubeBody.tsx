import React, { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import type { SpineState } from '../core/Spine'
import { useFrame } from '@react-three/fiber'

interface TubeBodyProps {
  spine: SpineState
  headRef: React.MutableRefObject<THREE.Mesh | null>
  headDirection: React.MutableRefObject<THREE.Vector3>
  color?: THREE.ColorRepresentation
  onFinData?: (finData: FinAttachmentData[]) => void
}

interface FinAttachmentData {
  position: THREE.Vector3
  normal: THREE.Vector3
  binormal: THREE.Vector3
  tangent: THREE.Vector3
  radius: number
  spineT: number
}

export function TubeBody({ spine, headRef, headDirection, color = '#FFFFFF', onFinData }: TubeBodyProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const samplesPerSegment = useMemo(() => 8, [])
  const effectiveSegments = useMemo(() => Math.max(1, spine.points.length + 1), [spine.points.length])
  const sampleCount = useMemo(() => Math.max(2, effectiveSegments * samplesPerSegment + 1), [effectiveSegments, samplesPerSegment])
  const ringSegments = useMemo(() => 32, [])
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
    geom.setIndex(indices)
    const mat = new THREE.MeshToonMaterial({ 
      color: color, 
      transparent: true, 
      opacity: 0.1, 
      toneMapped: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    return { geometry: geom, material: mat }
  }, [sampleCount, ringSegments])

  useEffect(() => {
    return () => { geometry.dispose(); (material as THREE.Material).dispose() }
  }, [geometry, material])

  // Keep material color in sync without recreating material
  useEffect(() => {
    if ((material as THREE.MeshToonMaterial).color) (material as THREE.MeshToonMaterial).color.set(color)
  }, [material, color])

  // Temporal smoothing refs
  const prevCentersRef = useRef<THREE.Vector3[] | null>(null)
  const prevNormalsRef = useRef<THREE.Vector3[] | null>(null)
  const prevBinormalsRef = useRef<THREE.Vector3[] | null>(null)

  // Working arrays to avoid per-frame allocations
  const centersRef = useRef<THREE.Vector3[] | null>(null)
  const tangentsRef = useRef<THREE.Vector3[] | null>(null)
  const normalsRef = useRef<THREE.Vector3[] | null>(null)
  const binormalsRef = useRef<THREE.Vector3[] | null>(null)
  const ringRadiiRef = useRef<Float32Array | null>(null)

  // Persistent curve and control points
  const controlPointsRef = useRef<THREE.Vector3[] | null>(null)
  const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null)

  // Scratch vectors
  const scratchRef = useRef({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3() })

  // Double-buffer fin data arrays to avoid per-frame allocations while changing reference
  const finBuffersRef = useRef<[FinAttachmentData[], FinAttachmentData[]]>([[], []])
  const finInitRef = useRef(false)
  const finActiveIdxRef = useRef(0)

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
    // prev arrays for smoothing
    if (!prevCentersRef.current || prevCentersRef.current.length !== sampleCount) {
      prevCentersRef.current = new Array(sampleCount)
      for (let i = 0; i < sampleCount; i++) prevCentersRef.current[i] = new THREE.Vector3()
    }
    if (!prevNormalsRef.current || prevNormalsRef.current.length !== sampleCount) {
      prevNormalsRef.current = new Array(sampleCount)
      for (let i = 0; i < sampleCount; i++) prevNormalsRef.current[i] = new THREE.Vector3()
    }
    if (!prevBinormalsRef.current || prevBinormalsRef.current.length !== sampleCount) {
      prevBinormalsRef.current = new Array(sampleCount)
      for (let i = 0; i < sampleCount; i++) prevBinormalsRef.current[i] = new THREE.Vector3()
    }
    if (!ringRadiiRef.current || ringRadiiRef.current.length !== sampleCount) {
      ringRadiiRef.current = new Float32Array(sampleCount)
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

  useFrame(() => {
    const positions = (geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array
    const normals = (geometry.getAttribute('normal') as THREE.BufferAttribute).array as Float32Array

    // Build curve with ghost endpoints for stability
    const headPos = headRef.current?.position ?? spine.points[0] ?? scratchRef.current.a.set(0, 0, 0)
    const first = spine.points[0] ?? headPos
    const last = spine.points[spine.points.length - 1] ?? first
    const prevLast = spine.points[spine.points.length - 2] ?? scratchRef.current.b.copy(last).add(scratchRef.current.c.set(0, 0, -0.001))
    const ghostHead = scratchRef.current.a.copy(headPos).add(scratchRef.current.b.copy(headPos).sub(first))
    const ghostTail = scratchRef.current.c.copy(last).add(scratchRef.current.b.copy(last).sub(prevLast))
    const controlPoints = controlPointsRef.current!
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
    const up = Math.abs(t0.y) < 0.9 ? scratchRef.current.a.set(0, 1, 0) : scratchRef.current.a.set(1, 0, 0)
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

    // Temporal smoothing
    const smoothAlpha = 0.35
    if (prevCentersRef.current && prevCentersRef.current.length === centers.length) {
      for (let i = 0; i < centers.length; i++) {
        centers[i].lerpVectors(prevCentersRef.current[i], centers[i], smoothAlpha)
      }
    }
    if (prevNormalsRef.current && prevNormalsRef.current.length === normalsF.length && prevBinormalsRef.current) {
      for (let i = 0; i < normalsF.length; i++) {
        normalsF[i].lerpVectors(prevNormalsRef.current[i], normalsF[i], smoothAlpha).normalize()
        binormalsF[i].lerpVectors(prevBinormalsRef.current[i], binormalsF[i], smoothAlpha).normalize()
      }
    }

    // Fill vertex buffers with teardrop geometry
    const tmp = scratchRef.current.a
    const radial = scratchRef.current.b
    const ringRadii = ringRadiiRef.current!
    
    for (let y = 0; y < sampleCount; y++) {
      const center = centers[y]
      const t = y / (sampleCount - 1)
      
      // Mathematical teardrop using parametric equation for perfect smoothness
      const maxR = 0.35
      // Teardrop parameter: s goes from 0 (head) to 1 (tail)
      const s = t
      // Classic teardrop formula: r(s) = a * sqrt(s) * (1-s)^n
      // Modified for better head roundness: r(s) = a * s^p * (1-s)^q
      const p = 0.6  // controls head roundness (lower = rounder)
      const q = 2.1  // controls tail sharpness (higher = sharper)
      const baseRadius = Math.pow(s, p) * Math.pow(1 - s, q)
      
      // Add slight belly curve for organic feel
      const belly = 1 + 0.08 * Math.sin(Math.PI * s * 0.8)
      
      const radius = Math.max(0.001, maxR * baseRadius * belly)
      ringRadii[y] = radius
      
      const normal = normalsF[y]
      const binorm = binormalsF[y]
      
      for (let x = 0; x <= ringSegments; x++) {
        const idx = (y * (ringSegments + 1) + x) * 3
        const nx = ringCos[x]
        const ny = ringSin[x]
        tmp.copy(center)
        tmp.addScaledVector(normal, nx * radius)
        tmp.addScaledVector(binorm, ny * radius)
        positions[idx] = tmp.x
        positions[idx + 1] = tmp.y
        positions[idx + 2] = tmp.z
        
        // Compute smooth surface normal
        radial.set(0, 0, 0)
        radial.addScaledVector(normal, nx)
        radial.addScaledVector(binorm, ny)
        
        // Simple radial normals - good enough for toon shading
        // (Removed expensive analytical computation)
        
        radial.normalize()
        normals[idx] = radial.x
        normals[idx + 1] = radial.y
        normals[idx + 2] = radial.z
      }
    }

    geometry.getAttribute('position').needsUpdate = true
    geometry.getAttribute('normal').needsUpdate = true

    // Generate fin attachment data if callback provided
    if (onFinData) {
      const stepSize = 4
      const expectedLength = Math.ceil(sampleCount / stepSize)
      // Initialize or resize both buffers
      for (let b = 0; b < 2; b++) {
        const buf = finBuffersRef.current[b]
        if (!finInitRef.current || buf.length !== expectedLength) {
          finBuffersRef.current[b] = []
          for (let i = 0; i < expectedLength; i++) {
            finBuffersRef.current[b].push({
              position: new THREE.Vector3(),
              normal: new THREE.Vector3(),
              binormal: new THREE.Vector3(),
              tangent: new THREE.Vector3(),
              radius: 0,
              spineT: 0
            })
          }
        }
      }
      finInitRef.current = true
      // Write into the active buffer
      const activeIdx = finActiveIdxRef.current
      const finBuf = finBuffersRef.current[activeIdx]
      let finIdx = 0
      for (let y = 0; y < sampleCount; y += stepSize) {
        const t = y / (sampleCount - 1)
        const fin = finBuf[finIdx]
        fin.position.copy(centers[y])
        fin.normal.copy(normalsF[y])
        fin.binormal.copy(binormalsF[y])
        fin.tangent.copy(tangents[y])
        fin.radius = ringRadii[y]
        fin.spineT = t
        finIdx++
      }
      onFinData(finBuf)
      // Flip buffer index for next frame
      finActiveIdxRef.current = 1 - activeIdx
    }

    // Store for next frame smoothing
    if (prevCentersRef.current) {
      for (let i = 0; i < sampleCount; i++) prevCentersRef.current[i].copy(centers[i])
    }
    if (prevNormalsRef.current) {
      for (let i = 0; i < sampleCount; i++) prevNormalsRef.current[i].copy(normalsF[i])
    }
    if (prevBinormalsRef.current) {
      for (let i = 0; i < sampleCount; i++) prevBinormalsRef.current[i].copy(binormalsF[i])
    }
  })

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false} />
  )
}

