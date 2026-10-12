/**
 * 海床 + 岛屿：同一张噪声高度场，按高度/坡度分层着色；
 * 水下部分注入湿痕、吸收色偏与焦散。外沿的“裙边”让透过侧壁看到沙层剖面。
 */
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { buildTerrainGeometry, buildTerrainSkirt } from '../lib/geometry.ts'
import { injectUnderwater } from '../lib/shaders.ts'
import { useSceneData } from './SceneContext.tsx'

export function Terrain() {
  const { uniforms, build } = useSceneData()
  const geometry = useMemo(() => buildTerrainGeometry(build.terrainRes), [build.terrainRes])
  const skirt = useMemo(() => buildTerrainSkirt(build.shellSegments * 2), [build.shellSegments])
  const material = useMemo(
    () =>
      injectUnderwater(
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0, envMapIntensity: 0.7 }),
        uniforms,
        { algae: 0.12, key: 'terrain', low: build.lowShaders },
      ),
    [uniforms, build.lowShaders],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      skirt.dispose()
      material.dispose()
    },
    [geometry, skirt, material],
  )

  return (
    <group>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      <mesh geometry={skirt} material={material} receiveShadow />
    </group>
  )
}
