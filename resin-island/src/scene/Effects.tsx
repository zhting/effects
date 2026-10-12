/**
 * 后期：景深（微缩感）→ 轻微泛光 → 色调映射 → 暗角 + 极淡颗粒。
 */
import { Bloom, DepthOfField, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import type { ReactElement } from 'react'
import { useSceneData } from './SceneContext.tsx'

interface Props {
  dof: boolean
  bokeh: number
  focusRange: number
}

const FOCUS: [number, number, number] = [0, 0.75, 0.35]

export function Effects({ dof, bokeh, focusRange }: Props) {
  const { render } = useSceneData()
  const effects: ReactElement[] = []
  if (dof && render.dof && bokeh > 0)
    effects.push(<DepthOfField key="dof" target={FOCUS} worldFocusRange={focusRange} bokehScale={bokeh} resolutionScale={0.75} />)
  if (render.bloom)
    effects.push(<Bloom key="bloom" mipmapBlur intensity={0.32} luminanceThreshold={0.9} luminanceSmoothing={0.25} radius={0.7} />)
  effects.push(<ToneMapping key="tm" mode={ToneMappingMode.NEUTRAL} />)
  effects.push(<Vignette key="vig" offset={0.32} darkness={0.32} />)
  effects.push(<Noise key="grain" opacity={0.022} blendFunction={BlendFunction.OVERLAY} />)

  return (
    <EffectComposer multisampling={render.multisampling} stencilBuffer={false}>
      {effects}
    </EffectComposer>
  )
}
