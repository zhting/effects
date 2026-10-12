import { Suspense, useCallback, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor, useProgress } from '@react-three/drei'
import { Leva } from 'leva'
import { useSceneControls } from './controls.ts'
import { Experience } from './scene/Experience.tsx'
import { buildSettings, detectDevice, renderSettings, TIER_LABEL, type Tier } from './quality.ts'

const BACKGROUND = '#f3e9dc'

export default function App() {
  const device = useMemo(detectDevice, [])
  const [tier, setTier] = useState<Tier>(device.initialTier)
  // 几何精度只按首屏设备决定；运行时只调渲染开销
  const build = useMemo(() => buildSettings(device.initialTier), [device])
  const render = useMemo(() => renderSettings(tier, device.mobile), [tier, device])
  const controls = useSceneControls()
  // 手机上默认隐藏调参面板，用右上角的小按钮切换
  const [panelHidden, setPanelHidden] = useState(device.mobile)

  const decline = useCallback(() => setTier((t) => (!device.locked && t > 0 ? ((t - 1) as Tier) : t)), [device])
  const incline = useCallback(() => setTier((t) => (t < device.maxTier ? ((t + 1) as Tier) : t)), [device])

  return (
    <>
      <Canvas
        className="stage"
        shadows="percentage"
        dpr={render.dpr}
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      >
        <color attach="background" args={[BACKGROUND]} />
        {/* 桌面目标 60fps、手机目标 30fps：掉帧自动降一级，稳定后尝试回升 */}
        <PerformanceMonitor
          bounds={() => (device.mobile ? [28, 50] : [48, 58])}
          flipflops={4}
          onDecline={decline}
          onIncline={incline}
          onFallback={() => !device.locked && setTier(0)}
        />
        <Suspense fallback={null}>
          <Experience controls={controls} build={build} render={render} />
        </Suspense>
      </Canvas>

      <Leva
        hidden={panelHidden}
        collapsed={!device.mobile && window.innerWidth < 1100}
        titleBar={{ title: '调参' }}
        hideCopyButton
      />
      {device.mobile && (
        <button className={`panel-toggle ${panelHidden ? '' : 'panel-toggle--open'}`} onClick={() => setPanelHidden((h) => !h)}>
          {panelHidden ? '调参' : '收起'}
        </button>
      )}

      <header className="label">
        <a className="label__back" href="../">
          ← 特效展厅
        </a>
        <span className="label__title">树脂块微缩岛屿</span>
        <span className="label__sub">Resin Island · 1:2000</span>
      </header>
      <p className="hint">{device.mobile ? '拖动手指让果冻晃动 · 在水面划过掀起涟漪' : '移动鼠标让果冻晃动 · 在水面划过掀起涟漪 · 点击溅起水花'}</p>
      <span className="tier">画质 · {TIER_LABEL[tier]}</span>
      <Loading />
    </>
  )
}

function Loading() {
  const { active, progress } = useProgress()
  return (
    <div className={`loading ${active ? '' : 'loading--done'}`}>
      <span>注入树脂中 {Math.round(progress)}%</span>
    </div>
  )
}
