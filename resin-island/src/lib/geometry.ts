/**
 * 程序化几何体：地形、地形裙边、高度图纹理、树脂块外壳、岩石、植被。
 */
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BLOCK, sdRoundRect, clampToRoundRect } from './block.ts'
import {
  terrainHeight,
  colorNoise,
  vegetationNoise,
  rockDomeHeight,
  type RockInstance,
} from './terrainField.ts'
import { createNoise2D, noise3, smoothstep, clamp, lerp, mulberry32 } from './noise.ts'

const L0 = BLOCK.baseWaterLevel
const C = (hex: string) => new THREE.Color(hex).convertSRGBToLinear()

/* ------------------------------------------------------------------ */
/* 地形配色：按高度与坡度分层                                           */
/* ------------------------------------------------------------------ */
const PALETTE = {
  seaSand: C('#e2cfa6'),
  seaSandDark: C('#bfae86'),
  beachDry: C('#efe1c2'),
  beachWet: C('#d7c19a'),
  rockLight: C('#e3d3c2'),
  rock: C('#c8b19c'),
  rockDark: C('#9a8676'),
  soil: C('#8a7a4e'),
  grass: C('#6f8a3c'),
  grassDark: C('#4f6a2c'),
}

const tmp = new THREE.Color()
export function terrainColor(h: number, slope: number, x: number, z: number, out: THREE.Color) {
  const above = h - L0
  const cn = colorNoise(x, z)
  const vn = vegetationNoise(x, z)

  // 岩石：陡坡 + 岩层明暗条纹
  const band = 0.5 + 0.5 * Math.sin(h * 38 + cn * 6)
  out.copy(PALETTE.rock).lerp(PALETTE.rockLight, clamp(0.5 + cn * 1.4, 0, 1))
  out.lerp(PALETTE.rockDark, 0.25 * band * smoothstep(0.3, 0.75, slope))

  // 植被地表：高处缓坡
  const greenW = smoothstep(0.22, 0.42, above) * smoothstep(0.42, 0.24, slope) * smoothstep(-0.45, -0.1, vn)
  tmp.copy(PALETTE.grass).lerp(PALETTE.grassDark, clamp(0.5 - cn * 1.5, 0, 1)).lerp(PALETTE.soil, clamp(cn * 0.8, 0, 0.4))
  out.lerp(tmp, greenW)

  // 沙滩：低处缓坡
  const sandW = smoothstep(0.32, 0.18, above) * smoothstep(0.38, 0.2, slope)
  tmp.copy(PALETTE.beachWet).lerp(PALETTE.beachDry, smoothstep(0.0, 0.16, above))
  out.lerp(tmp, sandW)

  // 水下沙床
  const seaW = smoothstep(-0.02, -0.12, above) * smoothstep(0.55, 0.3, slope)
  tmp.copy(PALETTE.seaSand).lerp(PALETTE.seaSandDark, clamp(0.5 + cn * 1.2, 0, 1) * 0.7)
  out.lerp(tmp, seaW)
  return out
}

/* ------------------------------------------------------------------ */
/* 地形网格                                                            */
/* ------------------------------------------------------------------ */
export function buildTerrainGeometry(res: number) {
  const g = new THREE.PlaneGeometry(BLOCK.size, BLOCK.size, res, res)
  g.rotateX(-Math.PI / 2)
  const pos = g.attributes.position as THREE.BufferAttribute
  const inset = 0.004
  for (let i = 0; i < pos.count; i++) {
    const [x, z] = clampToRoundRect(pos.getX(i), pos.getZ(i), inset)
    pos.setXYZ(i, x, terrainHeight(x, z), z)
  }
  g.computeVertexNormals()
  const nrm = g.attributes.normal as THREE.BufferAttribute
  const colors = new Float32Array(pos.count * 3)
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    terrainColor(pos.getY(i), 1 - nrm.getY(i), pos.getX(i), pos.getZ(i), c)
    colors.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.deleteAttribute('uv')
  return g
}

/** 地形与块壁交界处的“剖面”：透过侧壁能看到沙层与岩层 */
export function buildTerrainSkirt(segments = 400, rows = 10) {
  const outline = roundRectOutline(segments, 0.004)
  const positions: number[] = []
  const normals: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const bottom = 0.0
  const sandDeep = C('#cdb88f')
  const sandLayer = C('#e3d2ac')
  const c = new THREE.Color()

  for (let i = 0; i <= segments; i++) {
    const p = outline[i % segments]
    const top = terrainHeight(p.x, p.z)
    for (let r = 0; r <= rows; r++) {
      const t = r / rows // 0 顶 → 1 底
      const y = lerp(top, bottom, t)
      positions.push(p.x, y, p.z)
      normals.push(p.nx, 0, p.nz)
      if (y > L0 - 0.05) {
        terrainColor(y, 0.8, p.x, p.z, c)
      } else {
        // 沉积层：一条条深浅不一的沙层
        const layer = 0.5 + 0.5 * Math.sin(y * 42 + Math.sin(p.x * 3 + p.z * 2) * 1.5)
        c.copy(sandLayer).lerp(sandDeep, 0.25 + 0.5 * layer * t)
      }
      colors.push(c.r, c.g, c.b)
    }
  }
  const stride = rows + 1
  for (let i = 0; i < segments; i++) {
    for (let r = 0; r < rows; r++) {
      const a = i * stride + r
      const b = (i + 1) * stride + r
      indices.push(a, a + 1, b, b, a + 1, b + 1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.setIndex(indices)
  fixWinding(g)
  return g
}

/* ------------------------------------------------------------------ */
/* 高度图：水面/模拟/焦散使用（地形 ∪ 礁石穹顶）                          */
/* ------------------------------------------------------------------ */
export function buildHeightTexture(res: number, rocks: RockInstance[]) {
  const data = new Uint16Array(res * res * 4)
  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const x = -BLOCK.half + (BLOCK.size * (i + 0.5)) / res
      const z = -BLOCK.half + (BLOCK.size * (j + 0.5)) / res
      const [cx, cz] = clampToRoundRect(x, z, 0.004)
      const h = Math.max(terrainHeight(cx, cz), rockDomeHeight(rocks, x, z))
      const k = (j * res + i) * 4
      data[k] = THREE.DataUtils.toHalfFloat(h)
      data[k + 1] = THREE.DataUtils.toHalfFloat(sdRoundRect(x, z))
      data[k + 2] = 0
      data[k + 3] = THREE.DataUtils.toHalfFloat(1)
    }
  }
  const tex = new THREE.DataTexture(data, res, res, THREE.RGBAFormat, THREE.HalfFloatType)
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearFilter
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  tex.needsUpdate = true
  return tex
}

/* ------------------------------------------------------------------ */
/* 树脂块外壳：顶部开口（顶面由动态水面构成）                              */
/* ------------------------------------------------------------------ */
interface OutlinePoint {
  x: number
  z: number
  nx: number
  nz: number
}

/** 沿圆角矩形边界等距取点（带外法线） */
export function roundRectOutline(count: number, inset = 0, half: number = BLOCK.half, r: number = BLOCK.radius): OutlinePoint[] {
  const straight = 2 * (half - r)
  const arc = (Math.PI / 2) * r
  const perimeter = 4 * (straight + arc)
  const pts: OutlinePoint[] = []
  // 四个角的圆心，依次逆时针（从 +x 边开始）
  const corners = [
    [half - r, half - r, 0],
    [-(half - r), half - r, Math.PI / 2],
    [-(half - r), -(half - r), Math.PI],
    [half - r, -(half - r), (3 * Math.PI) / 2],
  ]
  for (let k = 0; k < count; k++) {
    let s = (k / count) * perimeter
    let side = 0
    while (s > straight + arc && side < 3) {
      s -= straight + arc
      side++
    }
    const [cx, cz, a0] = corners[side]
    let x: number, z: number, nx: number, nz: number
    // 每段 = 先走直边（从上一个角的结束处到本角起点），再走圆弧
    const prev = corners[(side + 3) % 4]
    if (s < straight) {
      const t = s / straight
      // 直边方向：上一角圆弧终点 → 本角圆弧起点
      const pa = prev[2] + Math.PI / 2
      const sx = prev[0] + Math.cos(pa) * r
      const sz = prev[1] + Math.sin(pa) * r
      const ex = cx + Math.cos(a0) * r
      const ez = cz + Math.sin(a0) * r
      x = lerp(sx, ex, t)
      z = lerp(sz, ez, t)
      nx = Math.cos(a0)
      nz = Math.sin(a0)
    } else {
      const a = a0 + ((s - straight) / arc) * (Math.PI / 2)
      nx = Math.cos(a)
      nz = Math.sin(a)
      x = cx + nx * r
      z = cz + nz * r
    }
    pts.push({ x: x - nx * inset, z: z - nz * inset, nx, nz })
  }
  return pts
}

export function buildShellGeometry(height: number, segments = 160) {
  const outline = roundRectOutline(segments)
  const rb = BLOCK.bottomBevel
  // 竖直剖面：(内缩, y, 法线倾角)
  const profile: Array<[number, number, number]> = [
    [0, height, 0],
    [0, (height + rb) * 0.5, 0],
    [0, rb, 0],
  ]
  const arcSteps = 8
  for (let k = 1; k <= arcSteps; k++) {
    const th = (k / arcSteps) * (Math.PI / 2)
    profile.push([rb * (1 - Math.cos(th)), rb * (1 - Math.sin(th)), th])
  }
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  const stride = profile.length
  for (let i = 0; i <= segments; i++) {
    const p = outline[i % segments]
    for (const [inset, y, th] of profile) {
      positions.push(p.x - p.nx * inset, y, p.z - p.nz * inset)
      normals.push(p.nx * Math.cos(th), -Math.sin(th), p.nz * Math.cos(th))
    }
  }
  for (let i = 0; i < segments; i++) {
    for (let r = 0; r < stride - 1; r++) {
      const a = i * stride + r
      const b = (i + 1) * stride + r
      indices.push(a, a + 1, b, b, a + 1, b + 1)
    }
  }
  // 底面
  const center = positions.length / 3
  positions.push(0, 0, 0)
  normals.push(0, -1, 0)
  for (let i = 0; i < segments; i++) {
    const a = i * stride + (stride - 1)
    const b = (i + 1) * stride + (stride - 1)
    indices.push(center, a, b)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((positions.length / 3) * 2), 2))
  g.setIndex(indices)
  fixWinding(g)
  return g
}

/** 保证三角形绕序与给定法线一致（朝外为正面） */
function fixWinding(g: THREE.BufferGeometry) {
  const idx = g.index!
  const pos = g.attributes.position
  const nrm = g.attributes.normal
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const n = new THREE.Vector3()
  for (let i = 0; i < idx.count; i += 3) {
    const ia = idx.getX(i)
    const ib = idx.getX(i + 1)
    const ic = idx.getX(i + 2)
    a.fromBufferAttribute(pos, ia)
    b.fromBufferAttribute(pos, ib)
    c.fromBufferAttribute(pos, ic)
    const face = b.sub(a).cross(c.sub(a))
    n.fromBufferAttribute(nrm, ia)
    if (face.dot(n) < 0) {
      idx.setX(i + 1, ic)
      idx.setX(i + 2, ib)
    }
  }
  idx.needsUpdate = true
}

/* ------------------------------------------------------------------ */
/* 岩石                                                               */
/* ------------------------------------------------------------------ */
export function buildRockGeometry(variant: number, detail = 4) {
  const noise = createNoise2D(100 + variant * 31)
  const g = new THREE.IcosahedronGeometry(1, detail)
  const pos = g.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  const colors = new Float32Array(pos.count * 3)
  const base = C('#cbb4a0')
  const crack = C('#857262')
  const light = C('#ece0d2')
  const c = new THREE.Color()
  const stretch = [new THREE.Vector3(1.0, 0.82, 0.9), new THREE.Vector3(1.15, 0.75, 0.85), new THREE.Vector3(0.9, 0.9, 1.05)][variant % 3]
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize()
    const big = noise3(noise, v.x * 1.1, v.y * 1.1, v.z * 1.1)
    const mid = noise3(noise, v.x * 2.6 + 5, v.y * 2.6, v.z * 2.6)
    const fine = noise3(noise, v.x * 7, v.y * 7, v.z * 7)
    // 风化的花岗岩：大体圆润，局部有平切面和裂隙
    const facet = Math.abs(noise3(noise, v.x * 1.7 + 9, v.y * 1.7, v.z * 1.7))
    const crackLine = 1 - smoothstep(0.0, 0.06, Math.abs(noise3(noise, v.x * 3.2 - 4, v.y * 3.2, v.z * 3.2)))
    let r = 1 + 0.22 * big + 0.09 * mid + 0.025 * fine - 0.06 * crackLine
    r = lerp(r, 1 + 0.12 * big, smoothstep(0.35, 0.55, facet) * 0.5)
    v.multiplyScalar(r).multiply(stretch)
    // 压平底部，便于“坐”在沙上
    if (v.y < -0.35) v.y = -0.35 + (v.y + 0.35) * 0.3
    pos.setXYZ(i, v.x, v.y, v.z)
    c.copy(base).lerp(light, clamp(0.5 + mid * 1.2 + v.y * 0.25, 0, 1)).lerp(crack, crackLine * 0.7 + clamp(-big, 0, 1) * 0.3)
    colors.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.computeVertexNormals()
  g.deleteAttribute('uv')
  return g
}

/* ------------------------------------------------------------------ */
/* 植被：简化的伞状松树 + 灌木丛                                          */
/* ------------------------------------------------------------------ */
function blob(radius: number, squashY: number, seed: number, detail = 1) {
  const noise = createNoise2D(seed)
  const g = new THREE.IcosahedronGeometry(radius, detail)
  const pos = g.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const n = noise3(noise, v.x * 4, v.y * 4, v.z * 4)
    v.multiplyScalar(1 + 0.22 * n)
    v.y *= squashY
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  g.deleteAttribute('uv')
  return g.index ? g.toNonIndexed() : g
}

function paint(g: THREE.BufferGeometry, bottom: THREE.Color, top: THREE.Color, y0: number, y1: number) {
  const pos = g.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    c.copy(bottom).lerp(top, clamp((pos.getY(i) - y0) / (y1 - y0), 0, 1))
    colors.set([c.r, c.g, c.b], i * 3)
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return g
}

/** 单位高度≈1 的树：细干 + 2~3 层扁平树冠（类似海边的油松） */
export function buildTreeGeometry() {
  const rand = mulberry32(77)
  const parts: THREE.BufferGeometry[] = []
  const trunk = new THREE.CylinderGeometry(0.035, 0.06, 0.62, 5, 1).toNonIndexed()
  trunk.deleteAttribute('uv')
  trunk.translate(0, 0.31, 0)
  parts.push(paint(trunk, C('#4a3527'), C('#6a4c36'), 0, 0.6))
  const leafDark = C('#3a6030')
  const leaf = C('#8db250')
  const layers: Array<[number, number, number, number, number]> = [
    // x, y, z, 半径, 扁平度
    [0.0, 0.62, 0.0, 0.36, 0.5],
    [0.14, 0.52, -0.08, 0.26, 0.5],
    [-0.12, 0.8, 0.06, 0.25, 0.55],
    [0.05, 0.92, -0.04, 0.17, 0.6],
  ]
  layers.forEach(([x, y, z, r, s], k) => {
    const b = blob(r, s, 300 + k)
    b.rotateY(rand() * Math.PI)
    b.translate(x, y, z)
    parts.push(paint(b, leafDark, leaf, y - r * s, y + r * s))
  })
  const merged = mergeGeometries(parts, false)!
  merged.computeVertexNormals()
  return merged
}

export function buildBushGeometry() {
  const parts: THREE.BufferGeometry[] = []
  const leafDark = C('#476c32')
  const leaf = C('#98b858')
  const spec: Array<[number, number, number, number]> = [
    [0, 0.25, 0, 0.42],
    [0.28, 0.18, 0.1, 0.3],
    [-0.24, 0.17, -0.12, 0.3],
  ]
  spec.forEach(([x, y, z, r], k) => {
    const b = blob(r, 0.75, 500 + k)
    b.translate(x, y, z)
    parts.push(paint(b, leafDark, leaf, 0, 0.5))
  })
  const merged = mergeGeometries(parts, false)!
  merged.computeVertexNormals()
  return merged
}
