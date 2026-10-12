/**
 * 产品摄影式布光：暖色主光（太阳）+ 柔和天光 + 环境贴图 + 接触阴影。
 */
import { Component, Suspense, useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneData } from './SceneContext.tsx'

export type Preset = 'city' | 'sunset' | 'apartment' | 'park' | 'dawn' | 'studio'

interface Props {
  sunDir: THREE.Vector3
  preset: Preset
}

export function Lighting({ sunDir, preset }: Props) {
  const { render } = useSceneData()
  const light = useRef<THREE.DirectionalLight>(null)

  useLayoutEffect(() => {
    const l = light.current
    if (!l) return
    l.position.copy(sunDir).multiplyScalar(14)
    l.target.position.set(0, 0.6, 0)
    l.target.updateMatrixWorld()
  }, [sunDir, render.shadowMapSize])

  return (
    <>
      <ShadowOncePerFrame />
      <directionalLight
        key={render.shadowMapSize}
        ref={light}
        intensity={2.6}
        color="#fff1dc"
        castShadow={render.shadows}
        shadow-mapSize={[render.shadowMapSize, render.shadowMapSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={3}
      >
        <orthographicCamera attach="shadow-camera" args={[-3.6, 3.6, 3.6, -3.6, 2, 30]} />
      </directionalLight>
      <hemisphereLight args={['#fff7ea', '#d8c6ac', 0.45]} />

      <EnvironmentWithFallback preset={preset} />

      {/* 米白台面上的柔和接触阴影；块底不动，渲染若干帧后即可冻结 */}
      <ContactShadows
        position={[0, 0.002, 0]}
        scale={10}
        far={3}
        blur={2.6}
        opacity={0.55}
        resolution={render.contactShadowRes}
        color="#5c4632"
        frames={60}
      />
    </>
  )
}

/** 预设 HDR 加载失败（离线/被墙）时退回到程序化灯板环境，场景照样可用 */
function EnvironmentWithFallback({ preset }: { preset: Preset }) {
  const fallback = <LightformerEnvironment />
  return (
    <EnvBoundary key={preset} fallback={fallback}>
      <Suspense fallback={fallback}>
        <Environment preset={preset} environmentIntensity={0.9} />
      </Suspense>
    </EnvBoundary>
  )
}

function LightformerEnvironment() {
  return (
    <Environment resolution={256} environmentIntensity={0.9}>
      <color attach="background" args={['#cfd8d6']} />
      <Lightformer form="rect" intensity={3} color="#fff6e8" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
      <Lightformer form="rect" intensity={1.6} color="#dff3ff" position={[-6, 2, -2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#ffe9cf" position={[6, 2, 3]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} />
      <Lightformer form="ring" intensity={4} color="#fff3dd" position={[-3, 5, -4]} scale={1.5} />
    </Environment>
  )
}

class EnvBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.warn('[resin-island] Environment preset failed to load, using procedural fallback.', err)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/**
 * 透射材质的缓冲、接触阴影、主画面每帧会各调用一次 render()；
 * 默认每次 render() 都会重绘阴影贴图。改为每帧只在第一次 render 时更新。
 */
function ShadowOncePerFrame() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    return () => {
      gl.shadowMap.autoUpdate = true
    }
  }, [gl])
  useFrame(() => {
    gl.shadowMap.needsUpdate = true
  }, -3)
  return null
}
