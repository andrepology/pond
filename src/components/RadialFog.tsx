import { forwardRef } from 'react'
import { Effect, EffectAttribute } from 'postprocessing'
import { Uniform, Color } from 'three'

// Hybrid depth/radial fog shader with mode control
const fragmentShader = /* glsl */ `
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
uniform float intensity;
uniform float radialInfluence;
uniform float aspectRatio;

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  // Calculate depth-based fog factor
  // depth is normalized [0-1] where 0 = near plane, 1 = far plane
  float depthFogFactor = smoothstep(fogNear, fogFar, depth);
  
  // Calculate radial distance from center (0 at center, ~0.7 at corners)
  vec2 center = vec2(0.5);
  vec2 aspectUv = uv;
  aspectUv.x = (uv.x - 0.5) * aspectRatio + 0.5;
  float radialDist = length(aspectUv - center);
  
  // Radial fog factor (edges get fog, center stays clear)
  float radialFogFactor = smoothstep(0.40, 0.70, radialDist);
  
  // Blend between depth fog and radial fog based on radialInfluence
  // radialInfluence: 0.0 = pure depth fog, 1.0 = pure radial fog, >1.0 = radial dominates
  float finalFogFactor;
  if (radialInfluence < 0.01) {
    // Pure depth fog mode
    finalFogFactor = depthFogFactor;
  } else if (radialInfluence >= 1.0) {
    // Radial-dominant mode: radial fog with optional depth modulation
    float depthModulation = 1.0 + (depthFogFactor * (radialInfluence - 1.0));
    finalFogFactor = radialFogFactor * depthModulation;
  } else {
    // Hybrid mode: blend between depth and radial
    finalFogFactor = mix(depthFogFactor, radialFogFactor, radialInfluence);
  }
  
  finalFogFactor = clamp(finalFogFactor * intensity, 0.0, 1.0);
  
  // Mix original color with fog color
  outputColor = vec4(mix(inputColor.rgb, fogColor, finalFogFactor), inputColor.a);
}
`

// DepthFog effect class with radial modulation
class DepthFogEffect extends Effect {
  constructor({
    fogColor = new Color(0xf0f0f0),
    fogNear = 0.1,
    fogFar = 0.9,
    intensity = 1.0,
    radialInfluence = 0.0,
    aspectRatio = 1.0,
  }: {
    fogColor?: Color
    fogNear?: number
    fogFar?: number
    intensity?: number
    radialInfluence?: number
    aspectRatio?: number
  } = {}) {
    super('DepthFogEffect', fragmentShader, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map<string, Uniform>([
        ['fogColor', new Uniform(fogColor)],
        ['fogNear', new Uniform(fogNear)],
        ['fogFar', new Uniform(fogFar)],
        ['intensity', new Uniform(intensity)],
        ['radialInfluence', new Uniform(radialInfluence)],
        ['aspectRatio', new Uniform(aspectRatio)],
      ]),
    })
  }

  // Getters and setters for runtime updates
  get fogColor() {
    return (this.uniforms.get('fogColor') as Uniform).value as Color
  }

  set fogColor(value: Color | string | number) {
    const uniform = this.uniforms.get('fogColor') as Uniform
    if (value instanceof Color) {
      uniform.value = value
    } else {
      uniform.value.set(value)
    }
  }

  get fogNear() {
    return (this.uniforms.get('fogNear') as Uniform).value as number
  }

  set fogNear(value: number) {
    ;(this.uniforms.get('fogNear') as Uniform).value = value
  }

  get fogFar() {
    return (this.uniforms.get('fogFar') as Uniform).value as number
  }

  set fogFar(value: number) {
    ;(this.uniforms.get('fogFar') as Uniform).value = value
  }

  get intensity() {
    return (this.uniforms.get('intensity') as Uniform).value as number
  }

  set intensity(value: number) {
    ;(this.uniforms.get('intensity') as Uniform).value = value
  }

  get radialInfluence() {
    return (this.uniforms.get('radialInfluence') as Uniform).value as number
  }

  set radialInfluence(value: number) {
    ;(this.uniforms.get('radialInfluence') as Uniform).value = value
  }

  get aspectRatio() {
    return (this.uniforms.get('aspectRatio') as Uniform).value as number
  }

  set aspectRatio(value: number) {
    ;(this.uniforms.get('aspectRatio') as Uniform).value = value
  }
}

// React component wrapper (renamed to DepthFog for clarity)
interface DepthFogProps {
  fogColor?: string
  fogNear?: number
  fogFar?: number
  intensity?: number
  radialInfluence?: number
  aspectRatio?: number
}

export const DepthFog = forwardRef<DepthFogEffect, DepthFogProps>(
  ({ fogColor = '#f0f0f0', fogNear = 0.1, fogFar = 0.9, intensity = 1.0, radialInfluence = 0.0, aspectRatio = 1.0 }, ref) => {
    const effect = new DepthFogEffect({
      fogColor: new Color(fogColor),
      fogNear,
      fogFar,
      intensity,
      radialInfluence,
      aspectRatio,
    })

    return <primitive ref={ref} object={effect} dispose={null} />
  }
)

DepthFog.displayName = 'DepthFog'

// Legacy export for backwards compatibility
export const RadialFog = DepthFog

