/**
 * 场景装配：生成共享数据 → 灯光/相机 → 果冻组（地形、礁石、植被、水面、树脂壳）→ 后期。
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BLOCK } from '../lib/block.ts'
import { buildHeightTexture } from '../lib/geometry.ts'
import { createSceneUniforms } from '../lib/shaders.ts'
import { scatterRocks } from '../lib/terrainField.ts'
import { useJelly, type JellyOptions } from '../hooks/useJelly.ts'
import type { SceneControls } from '../controls.ts'
import type { BuildSettings, RenderSettings } from '../quality.ts'
import { SceneContext, type SceneData } from './SceneContext.tsx'
import { CameraRig } from './CameraRig.tsx'
import { Lighting, type Preset } from './Lighting.tsx'
import { Terrain } from './Terrain.tsx'
import { Rocks } from './Rocks.tsx'
import { Vegetation } from './Vegetation.tsx'
import { WaterSurface } from './WaterSurface.tsx'
import { ResinShell } from './ResinShell.tsx'
import { Effects } from './Effects.tsx'

interface Props {
  controls: SceneControls
  build: BuildSettings
  render: RenderSettings
}

export function Experience({ controls, build, render }: Props) {
  // 一次性生成：礁石 → 高度图（地形 ∪ 礁石）→ 共享 uniform
  const rocks = useMemo(() => scatterRocks(build.rocks), [build.rocks])
  const heightMap = useMemo(() => buildHeightTexture(build.heightRes, rocks), [build.heightRes, rocks])
  const uniforms = useMemo(() => createSceneUniforms(heightMap), [heightMap])
  useEffect(() => () => heightMap.dispose(), [heightMap])

  const data = useMemo<SceneData>(() => ({ uniforms, rocks, build, render }), [uniforms, rocks, build, render])

  const waterLevel = BLOCK.baseWaterLevel + controls.tide

  const sunDir = useMemo(() => {
    const az = THREE.MathUtils.degToRad(controls.sunAzimuth)
    const el = THREE.MathUtils.degToRad(controls.sunElevation)
    return new THREE.Vector3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az))
  }, [controls.sunAzimuth, controls.sunElevation])

  // 参数变化时同步到共享 uniform（不触发任何重渲染）
  useEffect(() => {
    uniforms.uWaterLevel.value = waterLevel
    uniforms.uWaveHeight.value = controls.waveHeight
    uniforms.uCausticStrength.value = controls.caustics
    uniforms.uShallow.value.set(controls.shallow)
    uniforms.uDeep.value.set(controls.deep)
    uniforms.uSunDir.value.copy(sunDir)
  }, [uniforms, waterLevel, controls.waveHeight, controls.caustics, controls.shallow, controls.deep, sunDir])

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime
  })

  const jellyGroup = useRef<THREE.Group>(null)
  const jellyOpts = useRef<JellyOptions>({ stiffness: controls.stiffness })
  useEffect(() => {
    jellyOpts.current.stiffness = controls.stiffness
  }, [controls.stiffness])
  const jelly = useJelly(jellyGroup, jellyOpts)

  return (
    <SceneContext.Provider value={data}>
      <CameraRig />
      <Lighting sunDir={sunDir} preset={controls.envPreset as Preset} />

      <group ref={jellyGroup}>
        <Terrain />
        <Rocks />
        <Vegetation />
        <WaterSurface waterLevel={waterLevel} ripple={controls.ripple} jelly={jelly} />
        <ResinShell waterLevel={waterLevel} shallow={controls.shallow} deep={controls.deep} />
      </group>

      <Effects dof={controls.dof} bokeh={controls.bokeh} focusRange={controls.focusRange} />
    </SceneContext.Provider>
  )
}
