import { createContext, useContext } from 'react'
import type { SceneUniforms } from '../lib/shaders.ts'
import type { RockInstance } from '../lib/terrainField.ts'
import type { BuildSettings, RenderSettings } from '../quality.ts'

export interface SceneData {
  uniforms: SceneUniforms
  rocks: RockInstance[]
  build: BuildSettings
  render: RenderSettings
}

export const SceneContext = createContext<SceneData | null>(null)

export function useSceneData() {
  const ctx = useContext(SceneContext)
  if (!ctx) throw new Error('useSceneData must be used inside <SceneContext.Provider>')
  return ctx
}
