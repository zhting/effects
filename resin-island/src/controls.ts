import { useControls, folder } from 'leva'

/** leva 调参面板：所有可调参数集中在这里 */
export function useSceneControls() {
  return useControls({
    水体: folder({
      shallow: { value: '#25d4c6', label: '浅水色' },
      deep: { value: '#0b62a6', label: '深水色' },
      waveHeight: { value: 1, min: 0, max: 3, step: 0.01, label: '浪高' },
      ripple: { value: 1, min: 0, max: 3, step: 0.01, label: '涟漪强度' },
      tide: { value: 0, min: -0.15, max: 0.15, step: 0.005, label: '潮位' },
      caustics: { value: 1, min: 0, max: 2.5, step: 0.01, label: '焦散' },
    }),
    光照: folder({
      sunAzimuth: { value: 130, min: 0, max: 360, step: 1, label: '太阳方位°' },
      sunElevation: { value: 48, min: 6, max: 88, step: 1, label: '太阳高度°' },
      envPreset: {
        value: 'city' as 'city' | 'sunset' | 'apartment' | 'park' | 'dawn' | 'studio',
        options: { 城市: 'city', 日落: 'sunset', 公寓: 'apartment', 公园: 'park', 黎明: 'dawn', 影棚: 'studio' },
        label: '环境',
      },
    }),
    果冻: folder({
      stiffness: { value: 0.3, min: 0, max: 1, step: 0.01, label: '软硬' },
    }),
    镜头: folder({
      dof: { value: true, label: '景深' },
      bokeh: { value: 2.2, min: 0, max: 8, step: 0.1, label: '虚化强度' },
      focusRange: { value: 3.6, min: 0.5, max: 8, step: 0.1, label: '清晰范围' },
    }),
  })
}

export type SceneControls = ReturnType<typeof useSceneControls>
