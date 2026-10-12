/**
 * 果冻弹簧：整组场景跟随鼠标位移做阻尼弹簧晃动。
 *
 * 用剪切矩阵实现“顶部晃得比底部多”：块底 y=0 固定，
 *   x' = x + sx·y,  z' = z + sz·y,  y' = y·(1+sy)
 * 剪切矩阵对所有材质（包括透射材质）都成立，阴影和射线拾取也自动跟随。
 */
import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export interface JellyOptions {
  /** 0 = 很软（慢、幅度大、回弹多），1 = 很硬 */
  stiffness: number
}

export interface JellyState {
  shear: THREE.Vector2
  velocity: THREE.Vector2
  /** 本帧剪切加速度（用于驱动水面晃荡） */
  accel: THREE.Vector2
  squash: number
}

const tmpRight = new THREE.Vector3()
const tmpFwd = new THREE.Vector3()

export function useJelly(group: RefObject<THREE.Group | null>, opts: RefObject<JellyOptions>) {
  const state = useRef<JellyState>({
    shear: new THREE.Vector2(),
    velocity: new THREE.Vector2(),
    accel: new THREE.Vector2(),
    squash: 0,
  })
  const internal = useRef({
    lastPointer: new THREE.Vector2(),
    hasPointer: false,
    squashVel: 0,
    target: new THREE.Vector2(),
  })
  const matrix = useRef(new THREE.Matrix4())

  useFrame((s, delta) => {
    const g = group.current
    if (!g) return
    const st = state.current
    const it = internal.current
    const dt = Math.min(delta, 1 / 20)
    const stiff = THREE.MathUtils.clamp(opts.current?.stiffness ?? 0.35, 0, 1)

    // 弹簧参数：软 → 低刚度、低阻尼、幅度大
    const k = THREE.MathUtils.lerp(26, 150, stiff)
    const c = THREE.MathUtils.lerp(2.6, 13, stiff)
    const amp = THREE.MathUtils.lerp(0.1, 0.045, stiff)

    // 屏幕方向 → 块体水平方向（相机右方向与“远离相机”方向投影到 xz）
    tmpRight.setFromMatrixColumn(s.camera.matrixWorld, 0).setY(0).normalize()
    tmpFwd.setFromMatrixColumn(s.camera.matrixWorld, 2).multiplyScalar(-1).setY(0).normalize()

    const p = s.pointer
    if (!it.hasPointer) {
      it.lastPointer.copy(p)
      it.hasPointer = true
    }
    const dpx = p.x - it.lastPointer.x
    const dpy = p.y - it.lastPointer.y
    it.lastPointer.copy(p)

    // 目标：轻微倾向鼠标所在方向
    it.target.set(
      (tmpRight.x * p.x + tmpFwd.x * p.y) * amp * 0.45,
      (tmpRight.z * p.x + tmpFwd.z * p.y) * amp * 0.45,
    )
    // 鼠标移动的冲量：块体先被“拖”过去，再回弹
    const impulse = 2.2 * amp
    const ix = (tmpRight.x * dpx + tmpFwd.x * dpy) * impulse
    const iz = (tmpRight.z * dpx + tmpFwd.z * dpy) * impulse
    st.velocity.x += ix / Math.max(dt, 1e-3) * 0.08
    st.velocity.y += iz / Math.max(dt, 1e-3) * 0.08

    // 半隐式欧拉，细分子步保证高刚度时稳定
    const sub = 4
    const h = dt / sub
    const prevVx = st.velocity.x
    const prevVz = st.velocity.y
    for (let i = 0; i < sub; i++) {
      const ax = -k * (st.shear.x - it.target.x) - c * st.velocity.x
      const az = -k * (st.shear.y - it.target.y) - c * st.velocity.y
      st.velocity.x += ax * h
      st.velocity.y += az * h
      st.shear.x += st.velocity.x * h
      st.shear.y += st.velocity.y * h
    }
    const lim = amp * 2.6
    st.shear.clampLength(0, lim)
    st.accel.set((st.velocity.x - prevVx) / Math.max(dt, 1e-3), (st.velocity.y - prevVz) / Math.max(dt, 1e-3))

    // 竖直方向的压扁/拉伸：由横向速度激发，单独的弹簧
    const speed = st.velocity.length()
    const ks = k * 1.6
    const sqTarget = -Math.min(speed * 0.35, 0.05)
    for (let i = 0; i < sub; i++) {
      const a = -ks * (st.squash - sqTarget) - c * 0.8 * it.squashVel
      it.squashVel += a * h
      st.squash += it.squashVel * h
    }
    st.squash = THREE.MathUtils.clamp(st.squash, -0.06, 0.06)

    // 剪切 + 体积近似守恒的缩放
    const sx = st.shear.x
    const sz = st.shear.y
    const sy = st.squash
    const xz = 1 - sy * 0.5
    matrix.current.set(xz, sx, 0, 0, 0, 1 + sy, 0, 0, 0, sz, xz, 0, 0, 0, 0, 1)
    g.matrixAutoUpdate = false
    g.matrix.copy(matrix.current)
    g.matrixWorldNeedsUpdate = true
  }, -1)

  return state
}
