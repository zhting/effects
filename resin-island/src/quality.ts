/**
 * 画质分级与自动降级。
 *
 * - BuildSettings：几何/模拟分辨率，只在首屏按设备决定一次（运行时重建会卡顿）。
 * - RenderSettings：渲染开销旋钮，由 PerformanceMonitor 运行时上下调整。
 */
export type Tier = 0 | 1 | 2

export interface BuildSettings {
  /** 低配：单层焦散、简化水面噪声 */
  lowShaders: boolean
  terrainRes: number
  simRes: number
  heightRes: number
  waterSegments: number
  shellSegments: number
  rockDetail: number
  rocks: number
  trees: number
  bushes: number
}

export interface RenderSettings {
  dpr: number
  mtmSamples: number
  mtmResolution: number
  shadows: boolean
  shadowMapSize: number
  dof: boolean
  bloom: boolean
  multisampling: number
  contactShadowRes: number
}

export function detectDevice() {
  const ua = navigator.userAgent
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (coarse && navigator.maxTouchPoints > 1)
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
  const cores = navigator.hardwareConcurrency ?? 8
  const weak = memory <= 4 || cores <= 4
  let initialTier: Tier = mobile ? 0 : weak ? 1 : 2
  let maxTier: Tier = mobile ? 1 : 2
  // 调试：?tier=0|1|2 强制固定画质（关闭自动升降）
  const forced = new URLSearchParams(location.search).get('tier')
  const locked = forced === '0' || forced === '1' || forced === '2'
  if (locked) initialTier = maxTier = Number(forced) as Tier
  return { mobile, initialTier, maxTier, locked }
}

export function buildSettings(tier: Tier): BuildSettings {
  if (tier === 0)
    return { lowShaders: true, terrainRes: 150, simRes: 128, heightRes: 128, waterSegments: 96, shellSegments: 112, rockDetail: 2, rocks: 55, trees: 110, bushes: 220 }
  if (tier === 1)
    return { lowShaders: false, terrainRes: 200, simRes: 192, heightRes: 192, waterSegments: 128, shellSegments: 140, rockDetail: 3, rocks: 70, trees: 150, bushes: 340 }
  return { lowShaders: false, terrainRes: 260, simRes: 256, heightRes: 256, waterSegments: 180, shellSegments: 180, rockDetail: 3, rocks: 80, trees: 190, bushes: 460 }
}

export function renderSettings(tier: Tier, mobile: boolean): RenderSettings {
  const native = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  if (tier === 0)
    return {
      dpr: Math.min(native, mobile ? 1.25 : 1),
      mtmSamples: 3,
      mtmResolution: 256,
      shadows: false,
      shadowMapSize: 512,
      dof: false,
      bloom: true,
      multisampling: 0,
      contactShadowRes: 256,
    }
  if (tier === 1)
    return {
      dpr: Math.min(native, 1.5),
      mtmSamples: 5,
      mtmResolution: 512,
      shadows: true,
      shadowMapSize: 1024,
      dof: !mobile,
      bloom: true,
      multisampling: mobile ? 0 : 2,
      contactShadowRes: 512,
    }
  return {
    dpr: Math.min(native, 2),
    mtmSamples: 8,
    mtmResolution: 1024,
    shadows: true,
    shadowMapSize: 2048,
    dof: true,
    bloom: true,
    multisampling: 4,
    contactShadowRes: 1024,
  }
}

export const TIER_LABEL: Record<Tier, string> = { 0: '流畅', 1: '均衡', 2: '高清' }
