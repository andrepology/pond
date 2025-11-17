import { memo, useMemo } from 'react'
import { EffectComposer, Bloom, HueSaturation, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode, BlendFunction } from 'postprocessing'
import { FilmGrain } from './FilmGrain'

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
}: PostProcessingEffectsProps) {
  const mode = useMemo(() => ToneMappingMode[toneMappingMode as keyof typeof ToneMappingMode], [toneMappingMode])
  const blendFunction = useMemo(() => BlendFunction[toneMappingBlendFunction as keyof typeof BlendFunction], [toneMappingBlendFunction])

  return (
    <EffectComposer autoClear={true} multisampling={0} resolutionScale={0.5}>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={bloomSmoothing}
        kernelSize={bloomKernelSize}
      />
      <HueSaturation saturation={saturation} hue={hue} />
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

