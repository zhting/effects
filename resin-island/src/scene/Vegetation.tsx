/**
 * 植被：在岛屿缓坡上实例化散布松树与灌木，带轻微风摆。
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { buildBushGeometry, buildTreeGeometry } from '../lib/geometry.ts'
import { injectWind } from '../lib/shaders.ts'
import { scatterPlants, type PlantInstance } from '../lib/terrainField.ts'
import { useSceneData } from './SceneContext.tsx'

export function Vegetation() {
  const { uniforms, build } = useSceneData()

  const trees = useMemo(
    () =>
      scatterPlants(build.trees, {
        minAbove: 0.36,
        maxSlope: 0.3,
        minScale: 0.13,
        maxScale: 0.26,
        spacing: 0.085,
        seed: 11,
        density: -0.22,
      }),
    [build.trees],
  )
  const bushes = useMemo(
    () =>
      scatterPlants(build.bushes, {
        minAbove: 0.24,
        maxSlope: 0.5,
        minScale: 0.05,
        maxScale: 0.11,
        spacing: 0.05,
        seed: 23,
        density: -0.4,
      }),
    [build.bushes],
  )

  const treeGeo = useMemo(() => buildTreeGeometry(), [])
  const bushGeo = useMemo(() => buildBushGeometry(), [])
  const treeMat = useMemo(
    () => injectWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, envMapIntensity: 0.6 }), uniforms, 0.035, 'tree'),
    [uniforms],
  )
  const bushMat = useMemo(
    () => injectWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, envMapIntensity: 0.6 }), uniforms, 0.05, 'bush'),
    [uniforms],
  )
  useEffect(
    () => () => {
      treeGeo.dispose()
      bushGeo.dispose()
      treeMat.dispose()
      bushMat.dispose()
    },
    [treeGeo, bushGeo, treeMat, bushMat],
  )

  return (
    <group>
      <PlantSet geometry={treeGeo} material={treeMat} plants={trees} hue={0.24} />
      <PlantSet geometry={bushGeo} material={bushMat} plants={bushes} hue={0.22} />
    </group>
  )
}

function PlantSet({
  geometry,
  material,
  plants,
  hue,
}: {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  plants: PlantInstance[]
  hue: number
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    const n = new THREE.Vector3()
    const yaw = new THREE.Quaternion()
    const c = new THREE.Color()
    plants.forEach((p, i) => {
      // 树大体竖直，只向坡面法线倾一点
      n.set(p.nx * 0.35, 1, p.nz * 0.35).normalize()
      q.setFromUnitVectors(up, n)
      yaw.setFromAxisAngle(up, p.rot)
      q.multiply(yaw)
      const s = p.s
      m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(s, s * (0.9 + p.tint * 0.3), s))
      mesh.setMatrixAt(i, m)
      c.setHSL(hue + (p.tint - 0.5) * 0.06, 0.4, 0.88 + p.tint * 0.3)
      mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [plants, hue])

  if (plants.length === 0) return null
  return <instancedMesh ref={ref} args={[geometry, material, plants.length]} castShadow receiveShadow />
}
