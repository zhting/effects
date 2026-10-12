/**
 * 礁石：3 种程序化花岗岩形体，各用一个 InstancedMesh。
 * 水下部分会长出苔藻并接收焦散。
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { buildRockGeometry } from '../lib/geometry.ts'
import { injectUnderwater } from '../lib/shaders.ts'
import type { RockInstance } from '../lib/terrainField.ts'
import { useSceneData } from './SceneContext.tsx'

const VARIANTS = [0, 1, 2]

export function Rocks() {
  const { uniforms, rocks, build } = useSceneData()
  const geometries = useMemo(() => VARIANTS.map((v) => buildRockGeometry(v, build.rockDetail)), [build.rockDetail])
  const material = useMemo(
    () =>
      injectUnderwater(
        new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, envMapIntensity: 0.8 }),
        uniforms,
        { algae: 0.85, key: 'rocks', low: build.lowShaders },
      ),
    [uniforms, build.lowShaders],
  )
  useEffect(
    () => () => {
      geometries.forEach((g) => g.dispose())
      material.dispose()
    },
    [geometries, material],
  )

  return (
    <group>
      {VARIANTS.map((v) => (
        <RockSet key={v} geometry={geometries[v]} material={material} rocks={rocks.filter((r) => r.variant === v)} />
      ))}
    </group>
  )
}

function RockSet({ geometry, material, rocks }: { geometry: THREE.BufferGeometry; material: THREE.Material; rocks: RockInstance[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    const c = new THREE.Color()
    rocks.forEach((r, i) => {
      e.set(r.tilt * 0.6, r.rot, r.tilt)
      q.setFromEuler(e)
      m.compose(new THREE.Vector3(r.x, r.y, r.z), q, new THREE.Vector3(r.r, r.r * r.sy, r.r * 0.92))
      mesh.setMatrixAt(i, m)
      // 暖色花岗岩的色差
      c.setHSL(0.075 + r.tint * 0.02, 0.18 + r.tint * 0.1, 0.78 + r.tint * 0.14)
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [rocks])

  if (rocks.length === 0) return null
  return <instancedMesh ref={ref} args={[geometry, material, rocks.length]} castShadow receiveShadow />
}
