/**
 * 纯数据层：海床 + 岛屿的高度函数、岩石与植被的散布。
 * 不依赖 three，可以在 node 里单独跑来预览地形。
 */
import { BLOCK, sdRoundRect, clampToRoundRect } from './block.ts'
import { createNoise2D, fbm, ridged, mulberry32, smoothstep, clamp, lerp } from './noise.ts'

const L0 = BLOCK.baseWaterLevel
const n1 = createNoise2D(7)
const n2 = createNoise2D(19)
const n3 = createNoise2D(53)

const len = (x: number, y: number) => Math.hypot(x, y)

/** 岛屿遮罩：>0 在岛内，越大越靠近山体中心 */
export function islandMask(x: number, z: number) {
  // 域扭曲让海岸线不规则
  const wx = x + 0.32 * fbm(n2, x * 0.55 + 3.1, z * 0.55 - 1.7, 3)
  const wz = z + 0.32 * fbm(n2, x * 0.55 - 7.3, z * 0.55 + 5.2, 3)
  // 主山体：沿 -x 边铺开，占据画面左侧到远角
  const a = 1 - len((wx + 2.05) / 1.95, (wz + 0.1) / 2.45)
  // 左前方岬角：沿 +z 边的低矮岩岬，和主山体围出一弯沙滩
  const b = 1 - len((wx + 0.45) / 0.9, (wz - 2.2) / 0.5)
  // 远角小礁丘
  const c = 1 - len((wx + 0.75) / 0.5, (wz + 2.15) / 0.45)
  // 靠近块壁处岛体收拢，四周都有自然的岩岸而不是被“切开”
  const edge = 0.5 * smoothstep(-0.6, 0.0, sdRoundRect(x, z)) + 0.12 * fbm(n3, x * 2.0, z * 2.0, 2)
  return { main: a - edge, cape: b - edge * 0.8, reef: c - edge * 0.6, any: Math.max(a - edge, b - edge * 0.8, c - edge * 0.6) }
}

function seabed(x: number, z: number, m: number) {
  let h = 0.2 + 0.07 * fbm(n1, x * 0.6, z * 0.6, 4)
  // 远角 (+x, -z) 更深，呈现由浅到深
  h -= 0.07 * ((x - z) / BLOCK.size)
  // 岛周围的浅台
  h += 0.38 * smoothstep(-0.75, 0.02, m)
  // 沙纹
  h += 0.006 * Math.sin(x * 9.0 + 2.0 * n3(x * 1.2, z * 1.2)) * smoothstep(0.0, -0.4, m)
  return h
}

/** 地形高度（不含散布岩石） */
export function terrainHeight(x: number, z: number) {
  const { main, cape, reef, any } = islandMask(x, z)
  const base = seabed(x, z, any)
  let h = base

  // 主山体：陡峭悬崖 + 隆起的山丘 + 岩脊
  if (main > -0.05) {
    const cliff = smoothstep(-0.02, 0.2, main)
    const hill = Math.pow(smoothstep(0.06, 0.9, main), 0.9)
    const rock = ridged(n3, x * 1.6, z * 1.6, 4)
    const strata = 0.03 * Math.sin((x * 0.6 + z * 0.4) * 14 + 4 * n1(x * 2, z * 2))
    const top =
      L0 + 0.26 + 0.72 * hill + 0.16 * rock * smoothstep(0.05, 0.5, main) + strata * smoothstep(0.0, 0.3, main)
    h = Math.max(h, lerp(base, top, cliff))
  }
  // 岬角：低一些、更破碎
  if (cape > -0.05) {
    const cliff = smoothstep(0.0, 0.2, cape)
    const rock = ridged(n3, x * 2.2 + 11, z * 2.2, 4)
    const top = L0 + 0.12 + 0.3 * Math.pow(smoothstep(0.1, 1.0, cape), 1.2) + 0.14 * rock
    h = Math.max(h, lerp(base, top, cliff))
  }
  // 远角礁丘
  if (reef > -0.05) {
    const cliff = smoothstep(0.0, 0.25, reef)
    const top = L0 + 0.1 + 0.35 * smoothstep(0.2, 1.0, reef) + 0.12 * ridged(n3, x * 3, z * 3, 3)
    h = Math.max(h, lerp(base, top, cliff))
  }

  // 沙滩：从两段山体的夹角处向开阔水面缓缓入水
  const ax = -1.05
  const az = 1.3
  const dx = 0.94
  const dz = 0.34
  const px = x - ax
  const pz = z - az
  const t = px * dx + pz * dz // 沿入水方向
  const lat = px * -dz + pz * dx // 横向
  const w =
    smoothstep(1.15, 0.55, Math.abs(lat + 0.2 * t)) *
    smoothstep(1.5, 1.05, t) *
    smoothstep(-0.7, -0.2, t)
  if (w > 0) {
    const beach = L0 + 0.2 - 0.16 * t - 0.2 * t * t + 0.015 * n1(x * 3, z * 3)
    h = Math.max(h, lerp(base, beach, w))
  }
  return h
}

export function terrainNormal(x: number, z: number, e = 0.02): [number, number, number] {
  const hx = terrainHeight(x + e, z) - terrainHeight(x - e, z)
  const hz = terrainHeight(x, z + e) - terrainHeight(x, z - e)
  const nx = -hx
  const ny = 2 * e
  const nz = -hz
  const l = Math.hypot(nx, ny, nz)
  return [nx / l, ny / l, nz / l]
}

/** 用于地形分层着色与植被分布的密度噪声 */
export const vegetationNoise = (x: number, z: number) => fbm(n2, x * 1.3 + 40, z * 1.3 - 12, 3)
export const colorNoise = (x: number, z: number) => fbm(n1, x * 3.1 - 9, z * 3.1 + 4, 3)

/* ------------------------------------------------------------------ */
/* 岩石散布                                                            */
/* ------------------------------------------------------------------ */

/** 岩石网格（buildRockGeometry）顶部相对半径的大致高度 */
export const ROCK_Y_EXTENT = 0.85

export interface RockInstance {
  x: number
  y: number
  z: number
  /** 水平半径 */
  r: number
  /** 竖直缩放 */
  sy: number
  rot: number
  tilt: number
  variant: number
  tint: number
}

export function scatterRocks(count: number, seed = 3): RockInstance[] {
  const rand = mulberry32(seed)
  const rocks: RockInstance[] = []
  const tryPlace = (x: number, z: number, r: number, exposeChance = 0) => {
    if (sdRoundRect(x, z) > -r * 0.9 - 0.04) return false
    for (const o of rocks) {
      if (Math.hypot(o.x - x, o.z - z) < (o.r + r) * 0.72) return false
    }
    const ground = terrainHeight(x, z)
    if (ground > L0 + 0.35) return false
    const y = ground - r * 0.2
    let sy = lerp(0.55, 0.95, rand())
    // 一部分礁石被拉高，探出水面
    if (ground > L0 - 0.5 && rand() < exposeChance) sy = clamp((L0 + lerp(0.07, 0.22, rand()) - y) / (r * ROCK_Y_EXTENT), sy, 3.2)
    rocks.push({
      x,
      z,
      y,
      r,
      sy,
      rot: rand() * Math.PI * 2,
      tilt: (rand() - 0.5) * 0.5,
      variant: Math.floor(rand() * 3),
      tint: rand(),
    })
    return true
  }

  // 1) 沿海岸线：围着岛屿边缘一圈大小不一的礁石，部分露出水面
  let guard = 0
  const shoreTarget = Math.floor(count * 0.45)
  while (rocks.length < shoreTarget && guard++ < 6000) {
    const x = lerp(-2, 1.0, rand())
    const z = lerp(-2, 2, rand())
    const m = islandMask(x, z).any
    if (m < -0.22 || m > 0.05) continue
    // 沙滩上礁石少一些
    const g = terrainHeight(x, z)
    if (g > L0 - 0.08 && g < L0 + 0.2 && rand() < 0.85) continue
    const big = rand() < 0.35
    tryPlace(x, z, big ? lerp(0.13, 0.22, rand()) : lerp(0.05, 0.12, rand()), 0.55)
  }

  // 2) 海中散落的礁石群（几处成簇）
  const clusters: Array<[number, number, number, number]> = [
    // x, z, 数量, 探出水面概率
    [-0.2, 1.55, 5, 0.7],
    [0.15, 0.2, 3, 0.5],
    [1.25, -0.95, 3, 0.6],
    [-0.35, -1.05, 3, 0.4],
    [1.0, 1.35, 3, 0.15],
  ]
  for (const [cx, cz, n, expose] of clusters) {
    let placed = 0
    let g2 = 0
    while (placed < n && g2++ < 200) {
      const a = rand() * Math.PI * 2
      const d = rand() * 0.38
      if (tryPlace(cx + Math.cos(a) * d, cz + Math.sin(a) * d, lerp(0.07, placed === 0 ? 0.24 : 0.15, rand()), placed === 0 ? expose : expose * 0.6)) placed++
    }
  }

  // 3) 贴着前侧两面块壁的水下大圆石：透过侧壁能看到长满苔藻的石头
  guard = 0
  const wallTarget = rocks.length + Math.floor(count * 0.16)
  while (rocks.length < wallTarget && guard++ < 3000) {
    const x = lerp(-1.6, 1.9, rand())
    const z = lerp(-1.6, 1.9, rand())
    const sd = sdRoundRect(x, z)
    if (sd < -0.5 || sd > -0.12) continue
    // 只放在靠近相机的两面（+x、+z）
    if (x + z < 0.6) continue
    if (islandMask(x, z).any > -0.15) continue
    tryPlace(x, z, lerp(0.13, 0.27, rand()))
  }

  // 4) 零星海底卵石
  guard = 0
  while (rocks.length < count && guard++ < 4000) {
    const x = lerp(-1.9, 1.9, rand())
    const z = lerp(-1.9, 1.9, rand())
    if (islandMask(x, z).any > -0.1) continue
    tryPlace(x, z, lerp(0.035, 0.09, rand()))
  }
  return rocks
}

/** 把礁石近似成穹顶，叠加到水面使用的高度图上（遮挡波浪、生成岸边泡沫） */
export function rockDomeHeight(rocks: RockInstance[], x: number, z: number) {
  let h = -Infinity
  for (const r of rocks) {
    const d = Math.hypot(x - r.x, z - r.z) / (r.r * 0.85)
    if (d >= 1) continue
    const top = r.y + r.r * r.sy * ROCK_Y_EXTENT * 0.92
    h = Math.max(h, r.y + (top - r.y) * Math.sqrt(1 - d * d))
  }
  return h
}

/* ------------------------------------------------------------------ */
/* 植被散布                                                            */
/* ------------------------------------------------------------------ */

export interface PlantInstance {
  x: number
  y: number
  z: number
  s: number
  rot: number
  nx: number
  nz: number
  tint: number
}

export function scatterPlants(
  count: number,
  opts: { minAbove: number; maxSlope: number; minScale: number; maxScale: number; spacing: number; seed: number; density: number },
): PlantInstance[] {
  const rand = mulberry32(opts.seed)
  const out: PlantInstance[] = []
  const cell = new Map<string, PlantInstance[]>()
  const key = (x: number, z: number) => `${Math.floor(x / opts.spacing)},${Math.floor(z / opts.spacing)}`
  let guard = 0
  while (out.length < count && guard++ < count * 60) {
    let x = lerp(-2, 0.6, rand())
    let z = lerp(-2, 2, rand())
    ;[x, z] = clampToRoundRect(x, z, 0.1)
    const h = terrainHeight(x, z)
    if (h < L0 + opts.minAbove) continue
    const [nx, ny, nz] = terrainNormal(x, z)
    const slope = 1 - ny
    if (slope > opts.maxSlope) continue
    const dens = vegetationNoise(x, z)
    if (dens < opts.density + (rand() - 0.5) * 0.25) continue
    // 简单的空间哈希避免过度重叠
    let ok = true
    const kx = Math.floor(x / opts.spacing)
    const kz = Math.floor(z / opts.spacing)
    for (let i = -1; i <= 1 && ok; i++) {
      for (let j = -1; j <= 1 && ok; j++) {
        const list = cell.get(`${kx + i},${kz + j}`)
        if (list) for (const p of list) if (Math.hypot(p.x - x, p.z - z) < opts.spacing) ok = false
      }
    }
    if (!ok) continue
    const p: PlantInstance = {
      x,
      z,
      y: h - 0.012,
      s: lerp(opts.minScale, opts.maxScale, Math.pow(rand(), 1.4)) * (0.85 + 0.3 * clamp(dens + 0.5, 0, 1)),
      rot: rand() * Math.PI * 2,
      nx,
      nz,
      tint: rand(),
    }
    out.push(p)
    const k = key(x, z)
    const list = cell.get(k)
    if (list) list.push(p)
    else cell.set(k, [p])
  }
  return out
}
