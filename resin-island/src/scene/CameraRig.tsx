/**
 * 长焦俯视相机：小视场角 + 远距离，透视压缩带来“桌面产品照”的感觉。
 * 根据画面宽高比自动拉远，保证竖屏手机上整块也完整入画。
 */
import { useLayoutEffect, useMemo, useRef } from 'react'
import { PerspectiveCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

const FOV = 15
const TARGET = new THREE.Vector3(0, 0.82, 0)
const DIRECTION = new THREE.Vector3(1, 1.22, 1).normalize()
/** 需要入画的半幅（竖直：块底到岛顶；水平：块的对角宽度），含少许留白 */
const HALF_V = 3.2
const HALF_H = 3.05

export function CameraRig() {
  const size = useThree((s) => s.size)
  const ref = useRef<THREE.PerspectiveCamera>(null)

  const position = useMemo(() => {
    const aspect = size.width / Math.max(size.height, 1)
    const v = THREE.MathUtils.degToRad(FOV)
    const h = 2 * Math.atan(Math.tan(v / 2) * aspect)
    const dist = Math.max(HALF_V / Math.sin(v / 2), HALF_H / Math.sin(h / 2))
    return DIRECTION.clone().multiplyScalar(dist).add(TARGET)
  }, [size.width, size.height])

  useLayoutEffect(() => {
    ref.current?.lookAt(TARGET)
  }, [position])

  return <PerspectiveCamera ref={ref} makeDefault fov={FOV} near={5} far={120} position={position} />
}
