import * as THREE from 'three'

export interface FishBodyShaderUniforms {
  time: { value: number }
  baseColor: { value: THREE.Color }
  opacity: { value: number }
  headConcentration: { value: number }
  fresnelStrength: { value: number }
  pulseWidth: { value: number }
  pulseStrength: { value: number }
  [key: string]: any
}

export const vertexShader = `
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vViewDir;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vUv = uv;
  vViewDir = normalize(cameraPosition - worldPosition.xyz);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const fragmentShader = `
uniform float time;
uniform vec3 baseColor;
uniform float opacity;
uniform float headConcentration;
uniform float fresnelStrength;
uniform float pulseWidth;
uniform float pulseStrength;

varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vViewDir;

void main() {
  vec3 normal = vNormal;
  if (!gl_FrontFacing) {
    normal = -normal;
  }

  // 0.0 = head, 1.0 = tail (from TubeBody UV generation)
  float spineT = clamp(vUv.y, 0.0, 1.0);

  // Base gradient: gentle translucency, kept fairly low so the pulse dominates
  float gradient = pow(1.0 - spineT, headConcentration);
  float baseFactor = gradient * 0.1;

  // Static concentration at the head that tapers off toward the tail
  float width = max(0.001, pulseWidth);      // controls falloff rate
  float headIntensity = exp(-spineT / width); // exponential falloff from head to tail
  float pulseFactor = pulseStrength * headIntensity;

  // Combined longitudinal factor: faint body + head concentration
  float longitudinalFactor = clamp(baseFactor + pulseFactor, 0.0, 1.0);

  // Radial coordinate across the ring (0 = center line, 1 = outer edge)
  float radial = abs(vUv.x - 0.5) * 2.0;

  // Core stays brighter, edges soften; stronger toward the tail for a smeared "streak"
  float radialCore = 1.0 - smoothstep(0.4, 1.0, radial); // 1 at center, 0 at outer edge
  float tailT = spineT;
  float streakFactor = mix(1.0, radialCore, tailT);

  // Subtle fresnel term for nicer edges without ink/glow patterns
  float viewDot = max(0.0, dot(normalize(normal), normalize(vViewDir)));
  float fresnel = pow(1.0 - viewDot, 1.5);
  float fresnelFactor = mix(1.0, 1.0 + fresnel * 1.5, clamp(fresnelStrength, 0.0, 1.0));

  float finalOpacity = opacity * longitudinalFactor * streakFactor * fresnelFactor;

  // Early discard for very transparent fragments
  if (finalOpacity <= 0.01) {
    discard;
  }

  // Simple color with mild fresnel lighting for an ethereal translucency
  vec3 color = baseColor;
  float lighting = 0.8 + 0.2 * fresnel;
  color *= lighting;

  gl_FragColor = vec4(color, finalOpacity);
}
`

export function createFishBodyShaderMaterial(): THREE.ShaderMaterial {
  const uniforms: FishBodyShaderUniforms = {
    time: { value: 0 },
    baseColor: { value: new THREE.Color('#FFFFFF') },
    opacity: { value: 0.5 },
    headConcentration: { value: 2.0 },
    fresnelStrength: { value: 0.3 },
    pulseWidth: { value: 0.3 },
    pulseStrength: { value: 1.0 },
  }

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
}