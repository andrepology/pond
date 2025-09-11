import React, { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import type { SpineState } from '../core/spine'
import { BODY } from '../config/constants'
import { useFrame } from '@react-three/fiber'

interface TubeBodyProps {
  spine: SpineState
  headRef: React.MutableRefObject<THREE.Mesh | null>
  headDirection: React.MutableRefObject<THREE.Vector3>
  color?: THREE.ColorRepresentation
}

export function TubeBody({ spine, headRef, headDirection, color = '#FFFFFF' }: TubeBodyProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const samplesPerSegment = useMemo(() => 8, [])
  const effectiveSegments = useMemo(() => Math.max(1, spine.points.length + 1), [spine.points.length])
  const sampleCount = useMemo(() => Math.max(2, effectiveSegments * samplesPerSegment + 1), [effectiveSegments, samplesPerSegment])
  const ringSegments = useMemo(() => 32, [])

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
      color: '#FFFFFF', 
      transparent: true, 
      opacity: 0.1, 
      toneMapped: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,  // Default: normal alpha blending
      
      depthWrite: false  // Prevents z-fighting with transparency
    })
    return { geometry: geom, material: mat }
  }, [sampleCount, ringSegments, color])

  useEffect(() => {
    return () => { geometry.dispose(); (material as THREE.Material).dispose() }
  }, [geometry, material])

  // Temporal smoothing refs
  const prevCentersRef = useRef<THREE.Vector3[] | null>(null)
  const prevNormalsRef = useRef<THREE.Vector3[] | null>(null)
  const prevBinormalsRef = useRef<THREE.Vector3[] | null>(null)

  useFrame(() => {
    const positions = (geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array
    const normals = (geometry.getAttribute('normal') as THREE.BufferAttribute).array as Float32Array

    // Build curve with ghost endpoints for stability
    const headPos = headRef.current?.position ?? spine.points[0] ?? new THREE.Vector3()
    const first = spine.points[0] ?? headPos
    const second = spine.points[1] ?? first.clone().add(new THREE.Vector3(0, 0, 0.001))
    const last = spine.points[spine.points.length - 1] ?? first
    const prevLast = spine.points[spine.points.length - 2] ?? last.clone().add(new THREE.Vector3(0, 0, -0.001))
    const ghostHead = headPos.clone().add(headPos.clone().sub(first))
    const ghostTail = last.clone().add(last.clone().sub(prevLast))
    const control = [ghostHead, headPos.clone(), ...spine.points.map(p => p.clone()), ghostTail]
    const curve = new THREE.CatmullRomCurve3(control, false, 'centripetal', 0.0)
    const centersAll = curve.getPoints(sampleCount + 1)
    const centers = centersAll.slice(1, -1)

    // Compute tangents
    const tangents: THREE.Vector3[] = new Array(sampleCount)
    for (let i = 0; i < sampleCount; i++) tangents[i] = new THREE.Vector3()
    for (let i = 0; i < sampleCount; i++) {
      const prev = centers[Math.max(0, i - 1)]
      const next = centers[Math.min(sampleCount - 1, i + 1)]
      tangents[i].subVectors(next, prev).normalize()
    }

    // Minimal-twist frames
    const normalsF: THREE.Vector3[] = new Array(sampleCount)
    const binormalsF: THREE.Vector3[] = new Array(sampleCount)
    const t0 = tangents[0]
    const up = Math.abs(t0.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    normalsF[0] = up.clone().sub(t0.clone().multiplyScalar(up.dot(t0))).normalize()
    binormalsF[0] = new THREE.Vector3().crossVectors(t0, normalsF[0]).normalize()
    for (let i = 1; i < sampleCount; i++) {
      const ti = tangents[i]
      const nPrev = normalsF[i - 1]
      let ni = nPrev.clone().sub(ti.clone().multiplyScalar(nPrev.dot(ti)))
      const len = ni.length()
      if (len < 1e-5) {
        ni = new THREE.Vector3().crossVectors(binormalsF[i - 1], ti).normalize()
      } else {
        ni.multiplyScalar(1 / len)
      }
      normalsF[i] = ni
      binormalsF[i] = new THREE.Vector3().crossVectors(ti, ni).normalize()
    }

    // Temporal smoothing
    const smoothAlpha = 0.35
    if (prevCentersRef.current && prevCentersRef.current.length === centers.length) {
      for (let i = 0; i < centers.length; i++) {
        centers[i].lerpVectors(prevCentersRef.current[i], centers[i], smoothAlpha)
      }
    }
    if (prevNormalsRef.current && prevNormalsRef.current.length === normalsF.length) {
      for (let i = 0; i < normalsF.length; i++) {
        normalsF[i].lerpVectors(prevNormalsRef.current[i], normalsF[i], smoothAlpha).normalize()
        binormalsF[i].lerpVectors(prevBinormalsRef.current![i], binormalsF[i], smoothAlpha).normalize()
      }
    }

    // Fill vertex buffers with teardrop geometry
    const tmp = new THREE.Vector3()
    const radial = new THREE.Vector3()
    const ringRadii: number[] = new Array(sampleCount)
    
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
        const theta = (x / ringSegments) * Math.PI * 2
        const nx = Math.cos(theta)
        const ny = Math.sin(theta)
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
    geometry.computeBoundingSphere()

    // Store for next frame smoothing
    prevCentersRef.current = centers.map(c => c.clone())
    prevNormalsRef.current = normalsF.map(n => n.clone())
    prevBinormalsRef.current = binormalsF.map(b => b.clone())
  })

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} frustumCulled={false}>
      <primitive
        object={material}
        attach="material"
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}

