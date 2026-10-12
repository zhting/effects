/**
 * 树脂块外壳：顶部开口的圆角盒，侧壁与底面用 MeshTransmissionMaterial
 * 表现“块体本身就是海水”的通透与青绿色衰减。
 */
import { useEffect, useMemo } from 'react'
import { MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { buildShellGeometry } from '../lib/geometry.ts'
import { useSceneData } from './SceneContext.tsx'

interface Props {
  waterLevel: number
  shallow: string
  deep: string
}

export function ResinShell({ waterLevel, shallow, deep }: Props) {
  const { build, render } = useSceneData()
  const geometry = useMemo(() => buildShellGeometry(waterLevel, build.shellSegments), [waterLevel, build.shellSegments])
  useEffect(() => () => geometry.dispose(), [geometry])

  // 侧壁色调：浅水色提亮作为透射底色，深水色做体积衰减
  const { tint, attenuation } = useMemo(() => {
    const s = new THREE.Color(shallow)
    const d = new THREE.Color(deep)
    return {
      tint: s.clone().lerp(new THREE.Color('#e6ffff'), 0.4),
      attenuation: s.clone().lerp(d, 0.25),
    }
  }, [shallow, deep])

  return (
    <mesh geometry={geometry} renderOrder={1}>
      <MeshTransmissionMaterial
        samples={render.mtmSamples}
        resolution={render.mtmResolution}
        transmission={1}
        thickness={0.32}
        roughness={0.04}
        ior={1.3}
        chromaticAberration={0.035}
        anisotropicBlur={0.12}
        distortion={0.12}
        distortionScale={0.35}
        temporalDistortion={0.06}
        clearcoat={1}
        clearcoatRoughness={0.04}
        color={tint}
        attenuationColor={attenuation}
        attenuationDistance={1.6}
        envMapIntensity={1.1}
        specularIntensity={1}
      />
    </mesh>
  )
}
