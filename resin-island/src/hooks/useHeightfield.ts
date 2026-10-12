/**
 * GPU 高度场水面模拟（乒乓渲染目标）。
 *
 * 纹理通道：r = 水面高度，g = 竖直速度。
 * 每个固定步长（60Hz）执行一次：邻域平均 → 加速度 → 阻尼 → 积分，
 * 同一 pass 里叠加鼠标水滴、晃动带来的晃荡力，并把陆地/礁石/块壁处的
 * 波清零（波会在这些边界反射）。
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneUniforms } from '../lib/shaders.ts'

const MAX_DROPS = 12

export interface HeightfieldParams {
  /** 波速（0..2，越大传播越快；果冻质感取偏小值） */
  speed: number
  /** 每步速度保留比例 */
  damping: number
  /** 晃荡加速度（块体局部 xz），由果冻弹簧写入 */
  slosh: THREE.Vector2
  /** 空闲时的自然微波（随机小水滴的强度） */
  idle: number
}

export interface HeightfieldApi {
  /** 当前高度场纹理（每帧变化，读取请通过共享 uniform） */
  readonly texture: THREE.Texture
  /** 在 uv 处投下一个水滴；strength 正值隆起、负值下陷 */
  addDrop: (u: number, v: number, radius: number, strength: number) => void
  params: HeightfieldParams
}

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPrev;
uniform sampler2D uHeightMap;
uniform vec2 uTexel;
uniform float uSpeed;
uniform float uDamping;
uniform float uWaterLevel;
uniform vec2 uSlosh;
uniform vec4 uDrops[${MAX_DROPS}];
uniform int uDropCount;

const float PI = 3.141592653589793;

void main() {
  vec4 info = texture2D(uPrev, vUv);

  // 水滴（隆起/下陷的余弦包络）
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    if (i >= uDropCount) break;
    vec4 d = uDrops[i];
    float k = max(0.0, 1.0 - length(d.xy - vUv) / d.z);
    k = 0.5 - cos(k * PI) * 0.5;
    info.r += k * d.w;
  }

  float l = texture2D(uPrev, vUv - vec2(uTexel.x, 0.0)).r;
  float r = texture2D(uPrev, vUv + vec2(uTexel.x, 0.0)).r;
  float b = texture2D(uPrev, vUv - vec2(0.0, uTexel.y)).r;
  float t = texture2D(uPrev, vUv + vec2(0.0, uTexel.y)).r;
  float avg = (l + r + b + t) * 0.25;

  info.g += (avg - info.r) * uSpeed;
  // 晃荡：块体加速时水体整体向反方向倾斜
  info.g += dot(vUv - 0.5, uSlosh);
  info.g *= uDamping;
  info.r += info.g;
  // 缓慢回归静水面，避免长时间漂移
  info.r *= 0.9995;

  // 陆地 / 礁石 / 块壁：固定边界
  vec4 hm = texture2D(uHeightMap, vUv);
  float wet = step(hm.r, uWaterLevel - 0.004) * step(hm.g, -0.004);
  info.rg *= wet;
  info.r = clamp(info.r, -0.25, 0.25);
  gl_FragColor = vec4(info.rg, 0.0, 1.0);
}
`

export function useHeightfield(resolution: number, shared: SceneUniforms): HeightfieldApi {
  const gl = useThree((s) => s.gl)

  const targets = useMemo(() => {
    const make = () =>
      new THREE.WebGLRenderTarget(resolution, resolution, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        depthBuffer: false,
        stencilBuffer: false,
      })
    return [make(), make()] as const
  }, [resolution])

  const { scene, camera, material } = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uPrev: { value: null },
        uHeightMap: shared.uHeightMap,
        uWaterLevel: shared.uWaterLevel,
        uTexel: { value: new THREE.Vector2(1 / resolution, 1 / resolution) },
        uSpeed: { value: 1.4 },
        uDamping: { value: 0.986 },
        uSlosh: { value: new THREE.Vector2() },
        uDrops: { value: Array.from({ length: MAX_DROPS }, () => new THREE.Vector4()) },
        uDropCount: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    })
    const scene = new THREE.Scene()
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
    quad.frustumCulled = false
    scene.add(quad)
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    return { scene, camera, material }
  }, [resolution, shared])

  const state = useRef({ read: 0, acc: 0, idleTimer: 0 })
  const drops = useRef<THREE.Vector4[]>([])
  const params = useRef<HeightfieldParams>({
    speed: 1.4,
    damping: 0.986,
    slosh: new THREE.Vector2(),
    idle: 1,
  }).current

  // 初始化为静水并释放资源
  useEffect(() => {
    const prevTarget = gl.getRenderTarget()
    const prevColor = gl.getClearColor(new THREE.Color())
    const prevAlpha = gl.getClearAlpha()
    gl.setClearColor(0x000000, 0)
    for (const t of targets) {
      gl.setRenderTarget(t)
      gl.clear(true, false, false)
    }
    gl.setRenderTarget(prevTarget)
    gl.setClearColor(prevColor, prevAlpha)
    shared.uSim.value = targets[0].texture
    shared.uSimTexel.value.set(1 / resolution, 1 / resolution)
    return () => {
      targets.forEach((t) => t.dispose())
      material.dispose()
      ;(scene.children[0] as THREE.Mesh).geometry.dispose()
    }
  }, [gl, targets, material, scene, shared, resolution])

  // 负优先级：在其他 useFrame 与后期合成之前跑模拟
  useFrame((_, delta) => {
    const s = state.current
    const dt = Math.min(delta, 0.1)

    // 空闲的自然微波：偶尔落下的小水滴
    s.idleTimer -= dt
    if (params.idle > 0 && s.idleTimer <= 0) {
      s.idleTimer = 0.18 + Math.random() * 0.3
      const u = Math.random()
      const v = Math.random()
      drops.current.push(new THREE.Vector4(u, v, 0.02 + Math.random() * 0.025, (Math.random() - 0.5) * 0.01 * params.idle))
    }

    const step = 1 / 60
    s.acc = Math.min(s.acc + dt, step * 3)
    const u = material.uniforms
    u.uSpeed.value = params.speed
    u.uDamping.value = params.damping
    const prev = gl.getRenderTarget()
    while (s.acc >= step) {
      s.acc -= step
      const list = drops.current.splice(0, MAX_DROPS)
      list.forEach((d, i) => (u.uDrops.value as THREE.Vector4[])[i].copy(d))
      u.uDropCount.value = list.length
      ;(u.uSlosh.value as THREE.Vector2).copy(params.slosh)
      u.uPrev.value = targets[s.read].texture
      const write = 1 - s.read
      gl.setRenderTarget(targets[write])
      gl.render(scene, camera)
      s.read = write
    }
    gl.setRenderTarget(prev)
    shared.uSim.value = targets[s.read].texture
  }, -2)

  return useMemo<HeightfieldApi>(
    () => ({
      get texture() {
        return targets[state.current.read].texture
      },
      addDrop: (uu, vv, radius, strength) => {
        if (drops.current.length > MAX_DROPS * 3) drops.current.shift()
        drops.current.push(new THREE.Vector4(uu, vv, radius, strength))
      },
      params,
    }),
    [targets, params],
  )
}
