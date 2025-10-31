import * as THREE from 'three'

export interface FishBodyShaderUniforms {
  time: { value: number }
  velocity: { value: THREE.Vector3 }
  baseColor: { value: THREE.Color }
  inkDensity: { value: number }
  turbulenceScale: { value: number }
  flowStrength: { value: number }
  opacity: { value: number }
  [key: string]: any
}

export const vertexShader = `
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec2 vUv;
varying vec3 vViewDir;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vWorldNormal = normalize(normalMatrix * normal);
  vUv = uv;
  vViewDir = normalize(cameraPosition - vWorldPosition);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const fragmentShader = `
uniform float time;
uniform vec3 velocity;
uniform vec3 baseColor;
uniform float inkDensity;
uniform float turbulenceScale;
uniform float flowStrength;
uniform float opacity;

varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec2 vUv;
varying vec3 vViewDir;

// Fast hash function
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Improved Perlin-like noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  
  float n00 = hash(i);
  float n10 = hash(i + vec2(1.0, 0.0));
  float n01 = hash(i + vec2(0.0, 1.0));
  float n11 = hash(i + vec2(1.0, 1.0));
  
  float nx0 = mix(n00, n10, u.x);
  float nx1 = mix(n01, n11, u.x);
  return mix(nx0, nx1, u.y);
}

// Fractal Brownian Motion - multiple octaves
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  float maxValue = 0.0;
  
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p * frequency);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  
  return value / maxValue;
}

// Swirling coordinate transformation
vec2 swirl(vec2 p, float t) {
  float angle = t * 0.5 + length(p) * 0.3;
  float c = cos(angle);
  float s = sin(angle);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

// Main ink cloud noise - use UV coordinates for stability
float inkNoise(vec2 uv, float t) {
  vec2 flowBase = velocity.xz * flowStrength * t * 0.2;
  
  // Multiple coordinate systems using UVs (0-1 space)
  vec2 coord1 = uv * turbulenceScale;
  vec2 coord2 = uv * turbulenceScale * 0.7;
  vec2 coord3 = uv * turbulenceScale * 1.3;
  
  // Apply swirls with different phase offsets
  vec2 swirl1 = swirl(coord1, t * 0.3);
  vec2 swirl2 = swirl(coord2, t * 0.45 + 1.5);
  vec2 swirl3 = swirl(coord3, t * 0.25 + 3.0);
  
  // Layer turbulence
  float n1 = fbm(swirl1 + flowBase);
  float n2 = fbm(swirl2 + flowBase.yx * 0.8);
  float n3 = fbm(swirl3 - flowBase * 0.6);
  
  // Blend layers
  float combined = (n1 + n2 + n3) * 0.333;
  
  // Add secondary turbulence for detail
  float detail = fbm(uv * turbulenceScale * 2.0 + t * 0.1);
  combined = mix(combined, detail, 0.3);
  
  return combined;
}

// Ink dispersal pattern - soft bell curve along spine for even aura
float inkDispersion(float spineT) {
  return exp(-spineT * 8.5);  // exponential decay: strong at head, fades to tail
}

void main() {
  // Ensure normals always face outward relative to camera
  vec3 normal = vWorldNormal;
  if (!gl_FrontFacing) normal = -normal;
  
  // Compute cloud density using UV coordinates
  float cloud = inkNoise(vUv, time);
  
  // Even distribution along spine
  float disperse = inkDispersion(vUv.y);
  
  // Vein structure adds detail
  float veins = abs(sin(cloud * 6.28)) * 0.5;
  
  // Blend for final density - increased noise visibility
  float density = cloud * 0.7 + disperse * 0.5 + veins * 0.15;
  
  // Fresnel effect - edges glow softly
  float fresnel = pow(1.0 - max(0.0, dot(normal, vViewDir)), 1.5);
  
  // Modulate density with fresnel for silhouette glow
  float auraStrength = mix(0.3, 1.0, fresnel);
  density *= auraStrength;
  
  // Smooth opacity with fresnel softening
  float cloudOpacity = smoothstep(0.1, 0.9, density) * inkDensity;
  cloudOpacity *= mix(1.0, 2.0, fresnel); // Edges brighter
  
  // Dithering
  float dither = hash(vUv) * 0.06 - 0.03;
  cloudOpacity += dither;
  cloudOpacity = clamp(cloudOpacity, 0.0, 1.0);
  
  // Apply base opacity with fresnel edge fade
  float finalOpacity = opacity * cloudOpacity * mix(0.5, 1.0, fresnel);
  if (finalOpacity < 0.02) discard;
  
  // White mystical glow
  vec3 color = baseColor;
  
  // Lighting boosted by fresnel for ethereal effect
  float lighting = 0.7 + 0.3 * fresnel;
  color *= lighting;
  
  gl_FragColor = vec4(color, finalOpacity);
}
`

export function createFishBodyShaderMaterial(): THREE.ShaderMaterial {
  const uniforms: FishBodyShaderUniforms = {
    time: { value: 0 },
    velocity: { value: new THREE.Vector3(0, 0, 0) },
    baseColor: { value: new THREE.Color('#FFFFFF') }, // White glow
    inkDensity: { value: 0.8 },
    turbulenceScale: { value: 2.5 },
    flowStrength: { value: 3.0 },
    opacity: { value: 0.5 },
  }

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: true,
    side: THREE.DoubleSide,
  })
}