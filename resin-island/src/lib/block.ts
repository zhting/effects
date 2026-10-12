/** 树脂块的尺寸常量（世界单位）。块底在 y = 0。 */
export const BLOCK = {
  size: 4,
  half: 2,
  /** 竖直棱的圆角半径 */
  radius: 0.5,
  /** 底边倒角半径 */
  bottomBevel: 0.16,
  /** 地形生成时的参考水位；潮位在它上下浮动 */
  baseWaterLevel: 1.0,
} as const

/** 圆角矩形的有符号距离（内部为负） */
export function sdRoundRect(x: number, z: number, half: number = BLOCK.half, r: number = BLOCK.radius) {
  const qx = Math.abs(x) - (half - r)
  const qz = Math.abs(z) - (half - r)
  const ox = Math.max(qx, 0)
  const oz = Math.max(qz, 0)
  return Math.hypot(ox, oz) + Math.min(Math.max(qx, qz), 0) - r
}

/** 把落在圆角矩形外（或距边小于 inset）的点投影回边界内侧 */
export function clampToRoundRect(x: number, z: number, inset = 0): [number, number] {
  const d = sdRoundRect(x, z) + inset
  if (d <= 0) return [x, z]
  const e = 1e-3
  const gx = (sdRoundRect(x + e, z) - sdRoundRect(x - e, z)) / (2 * e)
  const gz = (sdRoundRect(x, z + e) - sdRoundRect(x, z - e)) / (2 * e)
  const gl = Math.hypot(gx, gz) || 1
  return [x - (gx / gl) * d, z - (gz / gl) * d]
}

/** 世界 xz → 模拟/高度图 uv */
export const worldToUv = (x: number, z: number): [number, number] => [
  (x + BLOCK.half) / BLOCK.size,
  (z + BLOCK.half) / BLOCK.size,
]
