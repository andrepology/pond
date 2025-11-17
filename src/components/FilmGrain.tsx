import { Effect, BlendFunction } from 'postprocessing'
import { wrapEffect } from '@react-three/postprocessing'
import * as THREE from 'three'

/**
 * Custom FilmGrain effect based on Three.js FilmPass shader
 * Provides film grain with intensity and grayscale controls
 */
class FilmGrainEffect extends Effect {
  constructor({
    intensity = 0.5,
    grayscale = false,
    blendFunction = BlendFunction.NORMAL,
  }: {
    intensity?: number
    grayscale?: boolean
    blendFunction?: BlendFunction
  } = {}) {
    super('FilmGrainEffect', fragmentShader, {
      blendFunction,
      uniforms: new Map<string, THREE.Uniform>([
        ['intensity', new THREE.Uniform(intensity)],
        ['grayscale', new THREE.Uniform(grayscale)],
        ['time', new THREE.Uniform(0.0)],
      ]),
    })

    this.intensity = intensity
    this.grayscale = grayscale
  }

  get intensity() {
    return this.uniforms.get('intensity')!.value
  }

  set intensity(value: number) {
    this.uniforms.get('intensity')!.value = value
  }

  get grayscale() {
    return this.uniforms.get('grayscale')!.value
  }

  set grayscale(value: boolean) {
    this.uniforms.get('grayscale')!.value = value
  }

  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, deltaTime: number) {
    this.uniforms.get('time')!.value += deltaTime
  }
}

const fragmentShader = /* glsl */ `
  uniform float intensity;
  uniform bool grayscale;
  uniform float time;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 base = inputColor;

    float noise = rand(fract(uv + time));

    vec3 color = base.rgb + base.rgb * clamp(0.1 + noise, 0.0, 1.0);

    color = mix(base.rgb, color, intensity);

    if (grayscale) {
      color = vec3(luminance(color));
    }

    outputColor = vec4(color, base.a);
  }
`

export const FilmGrain = wrapEffect(FilmGrainEffect, {
  blendFunction: BlendFunction.NORMAL,
})
