import { type ReactNode } from 'react'
import * as THREE from 'three'
import { extend } from '@react-three/fiber'

interface SquircleProps {
  children: ReactNode
  radius?: number  // Border radius in pixels (default: 12)
  className?: string  // Additional classes for customization
}

// Create a custom geometry for squircle shape
class SquircleGeometry extends THREE.BufferGeometry {
  constructor(radius = 12, segments = 32) {
    super()
    
    const vertices = []
    const indices = []
    
    // Center point
    vertices.push(0, 0, 0)
    
    // Generate points around the squircle
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      const x = Math.cos(angle)
      const y = Math.sin(angle)
      
      // Apply squircle formula
      const r = Math.pow(Math.abs(x), 4) + Math.pow(Math.abs(y), 4)
      const scale = radius / Math.pow(r, 0.25)
      
      vertices.push(x * scale, y * scale, 0)
    }
    
    // Create triangles
    for (let i = 1; i < segments; i++) {
      indices.push(0, i, i + 1)
    }
    indices.push(0, segments, 1)
    
    this.setIndex(indices)
    this.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    this.computeVertexNormals()
  }
}

// Extend R3F with our custom geometry
extend({ SquircleGeometry })

// Original Squircle component for DOM elements
export const Squircle = ({ 
  children, 
  radius = 12,
  className = ''
}: SquircleProps) => {
  return (
    <div 
      className={`relative ${className}`}
      style={{
        borderRadius: `${radius}px`,
        // Add mask for smoother corners using a path that works for any width/height
        WebkitMask: `url("data:image/svg+xml,%3Csvg width='100%' height='100%' viewBox='0 0 100 100' preserveAspectRatio='none' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M${radius} 0H${100-radius}C${100-radius/8} 0 100 ${radius/8} 100 ${radius}V${100-radius}C100 ${100-radius/8} ${100-radius/8} 100 ${100-radius} 100H${radius}C${radius/8} 100 0 ${100-radius/8} 0 ${100-radius}V${radius}C0 ${radius/8} ${radius/8} 0 ${radius} 0Z' fill='black'/%3E%3C/svg%3E") center/100% 100%`,
        maskImage: `url("data:image/svg+xml,%3Csvg width='100%' height='100%' viewBox='0 0 100 100' preserveAspectRatio='none' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M${radius} 0H${100-radius}C${100-radius/8} 0 100 ${radius/8} 100 ${radius}V${100-radius}C100 ${100-radius/8} ${100-radius/8} 100 ${100-radius} 100H${radius}C${radius/8} 100 0 ${100-radius/8} 0 ${100-radius}V${radius}C0 ${radius/8} ${radius/8} 0 ${radius} 0Z' fill='black'/%3E%3C/svg%3E") center/100% 100%`,
        // Don't set boxShadow here since we're using the shadow-lg Tailwind class
      }}
    >
      {children}
    </div>
  )
}
