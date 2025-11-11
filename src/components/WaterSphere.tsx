import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { folder, useControls } from 'leva';

// Optimize texture loading (can be a shared utility if used elsewhere)
const textureLoader = new THREE.TextureLoader();
const textureCache = new Map<string, Promise<THREE.Texture>>();

const loadTexture = (path: string): Promise<THREE.Texture> => {
  if (textureCache.has(path)) {
    return textureCache.get(path)!;
  }

  const texturePromise = new Promise<THREE.Texture>((resolve, reject) => {
    textureLoader.load(
      path,
      (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        resolve(texture);
      },
      undefined,
      reject
    );
  });

  textureCache.set(path, texturePromise);
  return texturePromise;
};

interface WaterSphereProps {
  radius: number;
  sunPosition?: [number, number, number];
}

const WaterSphere: React.FC<WaterSphereProps> = ({
  radius,
  sunPosition = [12.5, 12, 10.5],
}) => {
  const { camera } = useThree();
  const sphereRef = useRef<THREE.Mesh>(null);
  
  const controls = useControls({
    'water': folder({
    Flow: folder({
      flowSpeed: { value: 0.02, min: 0.001, max: 0.1, step: 0.001 },
      flowDir1X: { value: 0.5, min: -1, max: 1, step: 0.1 },
      flowDir1Y: { value: 0.5, min: -1, max: 1, step: 0.1 },
      flowDir2X: { value: -0.5, min: -1, max: 1, step: 0.1 },
      flowDir2Y: { value: -0.5, min: -1, max: 1, step: 0.1 },
      flowMixRatio: { value: 0.65, min: 0, max: 1, step: 0.05 },
    }),
    Appearance: folder({
      waterColor: { value: '#fafafa' },
      transparency: { value: 0.45, min: 0, max: 1, step: 0.05 },
      initialSphereOpacity: { value: 1.0, min: 0, max: 1, step: 0.05 },
    }),
    Brightness: folder({
      brightnessFactor: { value: 0.50, min: 0, max: 2, step: 0.05 },
      brightnessThreshold: { value: 0.90, min: 0, max: 1, step: 0.05 },
      brightnessTransition: { value: 0.40, min: 0, max: 1, step: 0.05 },
    }),
    Lighting: folder({
      ambientLight: { value: 0.5, min: 0, max: 2, step: 0.05 },
      diffuseLight: { value: 1.05, min: 0, max: 3, step: 0.05 },
    }),
    Texture: folder({
      distortionScale: { value: 1.8, min: 0, max: 5, step: 0.1 },
      bumpScale: { value: 0.25, min: 0, max: 1, step: 0.05 },
      normalMapInfluence: { value: 0.85, min: 0, max: 2, step: 0.05 },
      textureRepeatX: { value: 4.0, min: 0.5, max: 10, step: 0.5 },
      textureRepeatY: { value: 4.0, min: 0.5, max: 10, step: 0.5 },
    }),
  }, { collapsed: true })
});

  const sphereMaterial = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          time: { value: 0 },
          waterNormals: { value: null },
          sunDirection: { value: new THREE.Vector3(...sunPosition).normalize() },
          waterColor: { value: new THREE.Color(controls.waterColor) },
          distortionScale: { value: controls.distortionScale },
          bumpScale: { value: controls.bumpScale },
          repeat: { value: new THREE.Vector2(controls.textureRepeatX, controls.textureRepeatY) },
          transparency: { value: controls.transparency },
          flowSpeed: { value: controls.flowSpeed },
          opacity: { value: controls.initialSphereOpacity },
          brightnessFactor: { value: controls.brightnessFactor },
          brightnessThreshold: { value: controls.brightnessThreshold },
          brightnessTransition: { value: controls.brightnessTransition },
          normalMapInfluence: { value: controls.normalMapInfluence },
          flowDir1: { value: new THREE.Vector2(controls.flowDir1X, controls.flowDir1Y) },
          flowDir2: { value: new THREE.Vector2(controls.flowDir2X, controls.flowDir2Y) },
          flowMixRatio: { value: controls.flowMixRatio },
          ambientLight: { value: controls.ambientLight },
          diffuseLight: { value: controls.diffuseLight },
          sphereRadius: { value: radius },
        },
      ]),
      vertexShader: `
        #include <fog_pars_vertex>
        uniform float time;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vNormal = normal;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: `
        #include <fog_pars_fragment>
        uniform sampler2D waterNormals;
        uniform vec3 waterColor;
        uniform vec3 sunDirection;
        uniform vec2 repeat;
        uniform float time;
        uniform float flowSpeed;
        uniform float transparency;
        uniform float opacity;
        uniform float brightnessFactor;
        uniform float brightnessThreshold;
        uniform float brightnessTransition;
        uniform float normalMapInfluence;
        uniform vec2 flowDir1;
        uniform vec2 flowDir2;
        uniform float flowMixRatio;
        uniform float ambientLight;
        uniform float diffuseLight;
        uniform float sphereRadius;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vec2 uvFlow1 = vUv * repeat + flowDir1 * time * flowSpeed;
          vec2 uvFlow2 = vUv * repeat + flowDir2 * time * flowSpeed;
          vec4 normalColor1 = texture2D(waterNormals, uvFlow1);
          vec4 normalColor2 = texture2D(waterNormals, uvFlow2);
          vec4 normalColor = mix(normalColor1, normalColor2, flowMixRatio);
          float poleProximity = abs(normalize(vWorldPosition).y);
          float poleAttenuationFactor = smoothstep(0.2, 0.98, poleProximity);
          float adjustedNormalMapInfluence = normalMapInfluence * (1.0 - poleAttenuationFactor);
          vec3 normal = normalize(vNormal + normalColor.rgb * adjustedNormalMapInfluence);
          float NdotL = dot(normal, sunDirection);
          float light = max(0.0, NdotL);
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          vec3 reflectDir = reflect(-sunDirection, normal);
          float spec = pow(max(dot(reflectDir, viewDir), 0.5), 32.0) * 0.2;
          float rimFactor = 1.0 - max(0.0, dot(viewDir, normal));
          float rim = pow(rimFactor, 8.0) * 0.25;
          vec3 color = waterColor * (ambientLight + light * diffuseLight) + spec + rim;
          float brightness = dot(color, vec3(0.299, 0.587, 0.114)) * brightnessFactor;
          float visibility = smoothstep(
            brightnessThreshold - brightnessTransition/2.0,
            brightnessThreshold + brightnessTransition/2.0,
            brightness
          );
          visibility = pow(visibility, 0.4);
          gl_FragColor = vec4(color, transparency * opacity * visibility);
          #include <fog_fragment>
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: true,
    });

    loadTexture('/waternormals.jpg')
      .then(texture => {
        texture.repeat.set(controls.textureRepeatX, controls.textureRepeatY);
        material.uniforms.waterNormals.value = texture;
      })
      .catch(error => {
        console.error('Failed to load waternormals.jpg:', error);
      });

    return material;
  }, [
    controls.flowSpeed,
    controls.brightnessFactor,
    controls.brightnessThreshold,
    controls.brightnessTransition,
    controls.waterColor,
    controls.distortionScale,
    controls.bumpScale,
    controls.textureRepeatX,
    controls.textureRepeatY,
    controls.transparency,
    controls.normalMapInfluence,
    controls.flowDir1X,
    controls.flowDir1Y,
    controls.flowDir2X,
    controls.flowDir2Y,
    controls.flowMixRatio,
    controls.ambientLight,
    controls.diffuseLight,
    radius,
    sunPosition,
    controls.initialSphereOpacity
  ]);

  useFrame(() => {
    if (sphereRef.current && sphereRef.current.material instanceof THREE.ShaderMaterial) {
      sphereRef.current.material.uniforms.time.value = performance.now() / 1000;
    }
  });

  // Update material uniforms when controls change
  useEffect(() => {
    if (sphereRef.current && sphereRef.current.material instanceof THREE.ShaderMaterial) {
      const material = sphereRef.current.material;
      material.uniforms.sunDirection.value.set(...sunPosition).normalize();
      material.uniforms.waterColor.value.set(new THREE.Color(controls.waterColor));
      material.uniforms.distortionScale.value = controls.distortionScale;
      material.uniforms.bumpScale.value = controls.bumpScale;
      material.uniforms.repeat.value.set(controls.textureRepeatX, controls.textureRepeatY);
      material.uniforms.transparency.value = controls.transparency;
      material.uniforms.flowSpeed.value = controls.flowSpeed;
      material.uniforms.brightnessFactor.value = controls.brightnessFactor;
      material.uniforms.brightnessThreshold.value = controls.brightnessThreshold;
      material.uniforms.brightnessTransition.value = controls.brightnessTransition;
      material.uniforms.normalMapInfluence.value = controls.normalMapInfluence;
      material.uniforms.flowDir1.value.set(controls.flowDir1X, controls.flowDir1Y);
      material.uniforms.flowDir2.value.set(controls.flowDir2X, controls.flowDir2Y);
      material.uniforms.flowMixRatio.value = controls.flowMixRatio;
      material.uniforms.ambientLight.value = controls.ambientLight;
      material.uniforms.diffuseLight.value = controls.diffuseLight;
      material.uniforms.sphereRadius.value = radius;
      material.uniforms.opacity.value = controls.initialSphereOpacity;
    }
  }, [
    sunPosition, 
    controls.waterColor, 
    controls.distortionScale, 
    controls.bumpScale, 
    controls.textureRepeatX, 
    controls.textureRepeatY,
    controls.transparency, 
    controls.flowSpeed, 
    controls.brightnessFactor, 
    controls.brightnessThreshold, 
    controls.brightnessTransition,
    controls.normalMapInfluence, 
    controls.flowDir1X, 
    controls.flowDir1Y, 
    controls.flowDir2X, 
    controls.flowDir2Y, 
    controls.flowMixRatio,
    controls.ambientLight, 
    controls.diffuseLight, 
    radius, 
    controls.initialSphereOpacity
  ]);

  return (
    <mesh
      ref={sphereRef}
      scale={radius * 1.01}
      frustumCulled
      visible={controls.initialSphereOpacity > 0.01}
    >
      <sphereGeometry args={[1, 32, 32]} />
      <primitive object={sphereMaterial} />
    </mesh>
  );
};

export default WaterSphere; 