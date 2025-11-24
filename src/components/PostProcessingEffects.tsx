import { memo, useMemo, useEffect, useRef } from 'react'
import { EffectComposer, Bloom, HueSaturation, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode, BlendFunction } from 'postprocessing'
import { FilmGrain } from './FilmGrain'
import { RadialFog } from './RadialFog'
import { useThree } from '@react-three/fiber'

interface PostProcessingEffectsProps {
  bloomIntensity: number
  bloomThreshold: number
  bloomSmoothing: number
  bloomKernelSize: number
  saturation: number
  hue: number
  toneMappingEnabled: boolean
  toneMappingMode: string
  toneMappingBlendFunction: string
  toneMappingAdaptive: boolean
  toneMappingResolution: number
  toneMappingMiddleGrey: number
  toneMappingMaxLuminance: number
  toneMappingAverageLuminance: number
  toneMappingAdaptationRate: number
  filmGrainIntensity: number
  filmGrainGrayscale: boolean
  depthFogEnabled: boolean
  depthFogColor: string
  depthFogNear: number
  depthFogFar: number
  depthFogIntensity: number
  depthFogRadialInfluence: number
}

export const PostProcessingEffects = memo(function PostProcessingEffects({
  bloomIntensity,
  bloomThreshold,
  bloomSmoothing,
  bloomKernelSize,
  saturation,
  hue,
  toneMappingEnabled,
  toneMappingMode,
  toneMappingBlendFunction,
  toneMappingAdaptive,
  toneMappingResolution,
  toneMappingMiddleGrey,
  toneMappingMaxLuminance,
  toneMappingAverageLuminance,
  toneMappingAdaptationRate,
  filmGrainIntensity,
  filmGrainGrayscale,
  depthFogEnabled,
  depthFogColor,
  depthFogNear,
  depthFogFar,
  depthFogIntensity,
  depthFogRadialInfluence,
}: PostProcessingEffectsProps) {
  const mode = useMemo(() => ToneMappingMode[toneMappingMode as keyof typeof ToneMappingMode], [toneMappingMode])
  const blendFunction = useMemo(() => BlendFunction[toneMappingBlendFunction as keyof typeof BlendFunction], [toneMappingBlendFunction])
  
  const { size } = useThree()
  const depthFogRef = useRef<any>(null)

  // Update aspect ratio when viewport size changes
  useEffect(() => {
    if (depthFogRef.current && depthFogEnabled) {
      const aspectRatio = size.width / size.height
      depthFogRef.current.aspectRatio = aspectRatio
    }
  }, [size.width, size.height, depthFogEnabled])

  return (
    <EffectComposer autoClear={true} multisampling={0} resolutionScale={0.5}>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={bloomSmoothing}
        kernelSize={bloomKernelSize}
      />
      <HueSaturation saturation={saturation} hue={hue} />
      {depthFogEnabled && (
        <RadialFog
          ref={depthFogRef}
          fogColor={depthFogColor}
          fogNear={depthFogNear}
          fogFar={depthFogFar}
          intensity={depthFogIntensity}
          radialInfluence={depthFogRadialInfluence}
          aspectRatio={size.width / size.height}
        />
      )}
      {filmGrainIntensity > 0 && (
        <FilmGrain intensity={filmGrainIntensity} grayscale={filmGrainGrayscale} />
      )}
      {toneMappingEnabled && (
        <ToneMapping
          mode={mode}
          blendFunction={blendFunction}
          adaptive={toneMappingAdaptive}
          resolution={toneMappingResolution}
          middleGrey={toneMappingMiddleGrey}
          maxLuminance={toneMappingMaxLuminance}
          averageLuminance={toneMappingAverageLuminance}
          adaptationRate={toneMappingAdaptationRate}
        />
      )}
    </EffectComposer>
  )
})

