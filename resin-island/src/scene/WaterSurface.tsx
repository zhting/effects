/**
 * 树脂块顶面的动态水面。
 *
 * - 顶点：高度场模拟 + 微弱涌浪 → 位移
 * - 片元：逐像素用高度场求法线；按水深混合浅/深水色与不透明度；
 *         岸边与礁石周围生成泡沫；波峰处的“次表面”透光营造果冻质感；
 *         高光/菲涅尔处提高不透明度，保证反射在透明水面上依然清晰。
 * 基于 MeshPhysicalMaterial（环境反射、清漆高光、阴影都沿用内置实现）。
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { GLSL_COMMON, type SceneUniforms } from '../lib/shaders.ts'
import { useHeightfield } from '../hooks/useHeightfield.ts'
import type { JellyState } from '../hooks/useJelly.ts'
import { BLOCK } from '../lib/block.ts'
import { useSceneData } from './SceneContext.tsx'

const WATER_FN = /* glsl */ `
varying vec2 vWUv;
varying float vWaterH;

float swell(vec2 p, float t) {
  return 0.0045 * sin(dot(p, vec2(1.3, 0.7)) * 2.6 + t * 1.1)
       + 0.0030 * sin(dot(p, vec2(-0.6, 1.1)) * 4.3 - t * 1.6)
       + 0.0016 * sin(dot(p, vec2(0.9, -1.4)) * 7.0 + t * 2.3);
}
float edgeFade(vec2 uv) {
  vec4 hm = texture2D(uHeightMap, uv);
  return smoothstep(0.0, 0.14, -hm.g) * smoothstep(0.0, 0.1, uWaterLevel - hm.r);
}
float waterHeight(vec2 uv) {
  return (texture2D(uSim, uv).r + swell(uv * BLOCK_SIZE, uTime) * edgeFade(uv)) * uWaveHeight;
}
`

function createWaterMaterial(uniforms: SceneUniforms, low: boolean) {
  const material = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0.03,
    metalness: 0,
    ior: 1.333,
    clearcoat: 0.6,
    clearcoatRoughness: 0.02,
    sheen: 0.2,
    sheenRoughness: 0.45,
    sheenColor: new THREE.Color('#9ff5ea'),
    specularIntensity: 0.9,
    envMapIntensity: 0.55,
    transparent: true,
    depthWrite: true,
  })
  if (low) material.defines = { ...material.defines, LOW_QUALITY: '' }

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${GLSL_COMMON}\n${WATER_FN}`)
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        vWUv = worldToUv(position.xz);
        vWaterH = waterHeight(vWUv);
        transformed.y += vWaterH;`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform mat3 normalMatrix;\n${GLSL_COMMON}\n${WATER_FN}`)
      .replace(
        '#include <clipping_planes_fragment>',
        /* glsl */ `#include <clipping_planes_fragment>
        vec4 hmF = texture2D(uHeightMap, vWUv);
        if (hmF.g > 0.0) discard;                       // 块体外
        float depthW = uWaterLevel + vWaterH - hmF.r;  // 水柱深度
        if (depthW < -0.2) discard;                     // 深埋在陆地下（其余交给深度测试）`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        float dn = clamp(depthW / 0.95, 0.0, 1.0);
        // 浅 → 中（青）→ 深（蓝），中段更饱和
        vec3 midCol = mix(uShallow, uDeep, 0.45) * 1.08;
        vec3 waterCol = dn < 0.5
          ? mix(uShallow, midCol, smoothstep(0.0, 0.5, dn))
          : mix(midCol, uDeep, smoothstep(0.5, 1.0, dn));
        // 真实水体的漫反射很弱，颜色主要来自体内散射：深处压暗
        waterCol *= mix(1.0, 0.75, smoothstep(0.3, 1.0, dn));
        float alphaW = mix(0.26, 0.88, smoothstep(0.05, 1.0, dn));

        vec2 fp = vWUv * BLOCK_SIZE;
        float fnA = fbm2(fp * 7.0 + vec2(uTime * 0.22, -uTime * 0.17));
        float fnB = fbm2(fp * 16.0 - vec2(uTime * 0.35, uTime * 0.28));
        vec4 simF = texture2D(uSim, vWUv);

        // 岸边泡沫：贴岸一圈厚泡沫 + 外侧随潮汐推拉的蕾丝花边
        float shore = 1.0 - smoothstep(0.0, 0.05, depthW);
        float band = 1.0 - smoothstep(0.02, 0.13, depthW);
        float wave = sin(depthW * 75.0 - uTime * 2.2 + fnA * 4.0);
        float lace = band * smoothstep(0.55, 0.75, fnB + 0.35 * wave);
        // 波峰泡沫（鼠标搅出的浪）
        float crest = smoothstep(0.045, 0.12, abs(simF.r) * uWaveHeight) * smoothstep(0.45, 0.75, fnB);
        float foam = clamp(max(shore * smoothstep(0.25, 0.55, fnB + shore * 0.45), max(lace * 0.75, crest * 0.7)), 0.0, 1.0);

        // 块壁边缘的弯月面高光
        float rim = smoothstep(-0.035, 0.0, hmF.g);

        diffuseColor.rgb = mix(waterCol, vec3(0.96, 0.99, 0.98), foam * 0.9);
        alphaW = max(alphaW, foam * 0.95);
        alphaW = max(alphaW, rim * 0.55);
        diffuseColor.a = alphaW;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.55, foam);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `{
          float e = uSimTexel.x;
          float hL = waterHeight(vWUv - vec2(e, 0.0));
          float hR = waterHeight(vWUv + vec2(e, 0.0));
          float hD = waterHeight(vWUv - vec2(0.0, e));
          float hU = waterHeight(vWUv + vec2(0.0, e));
          vec3 nObj = vec3(hL - hR, 2.0 * e * BLOCK_SIZE, hD - hU);
          // 细碎的风浪纹理（只扰动法线，不位移），远处海面更“活”
          vec2 cp = vWUv * BLOCK_SIZE;
          float fade = edgeFade(vWUv);
          vec2 q1 = cp * 9.0 + vec2(uTime * 0.6, uTime * 0.35);
          vec2 q2 = cp * 17.0 - vec2(uTime * 0.45, -uTime * 0.7);
        #ifdef LOW_QUALITY
          float c0 = vnoise(q1);
          float cx = vnoise(q1 + vec2(0.06, 0.0));
          float cz = vnoise(q1 + vec2(0.0, 0.06));
        #else
          float c0 = vnoise(q1) + 0.5 * vnoise(q2);
          float cx = vnoise(q1 + vec2(0.06, 0.0)) + 0.5 * vnoise(q2 + vec2(0.06, 0.0));
          float cz = vnoise(q1 + vec2(0.0, 0.06)) + 0.5 * vnoise(q2 + vec2(0.0, 0.06));
        #endif
          float chopAmt = 0.0055 * uWaveHeight * fade * (0.45 + 0.55 * smoothstep(0.1, 0.8, dn));
          nObj.xz -= vec2(cx - c0, cz - c0) / 0.06 * chopAmt;
          normal = normalize(normalMatrix * normalize(nObj));
        }`,
      )
      .replace(
        '#include <clearcoat_normal_fragment_maps>',
        `#ifdef USE_CLEARCOAT\nclearcoatNormal = normal;\n#endif`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        // 果冻感：浅水和隆起的波峰透出青绿色的体内光
        float lift = smoothstep(0.0, 0.07, simF.r * uWaveHeight + vWaterH * 0.5);
        float sss = (1.0 - dn) * 0.12 + lift * 0.4;
        totalEmissiveRadiance += uShallow * sss * (1.0 - foam) * (0.6 + 0.4 * smoothstep(0.0, 0.5, uSunDir.y));`,
      )
      .replace(
        '#include <opaque_fragment>',
        /* glsl */ `
        float specLum = max(0.0, dot(outgoingLight - totalDiffuse, vec3(0.2126, 0.7152, 0.0722)));
        float fres = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 4.0);
        float aOut = clamp(diffuseColor.a + specLum * 0.7 + fres * 0.18, 0.0, 1.0);
        gl_FragColor = vec4(outgoingLight, aOut);`,
      )
  }
  material.customProgramCacheKey = () => `jelly-water-${low ? 'lq' : 'hq'}`
  return material
}

interface Props {
  waterLevel: number
  ripple: number
  jelly: React.RefObject<JellyState>
}

export function WaterSurface({ waterLevel, ripple, jelly }: Props) {
  const { uniforms, build } = useSceneData()
  const sim = useHeightfield(build.simRes, uniforms)

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(BLOCK.size, BLOCK.size, build.waterSegments, build.waterSegments)
    g.rotateX(-Math.PI / 2)
    return g
  }, [build.waterSegments])
  const material = useMemo(() => createWaterMaterial(uniforms, build.lowShaders), [uniforms, build.lowShaders])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  // 果冻质感：波速偏慢、阻尼偏大，涟漪厚重而不碎
  useEffect(() => {
    sim.params.speed = 1.25
    sim.params.damping = 0.984
  }, [sim])

  useEffect(() => {
    sim.params.idle = ripple > 0 ? 0.6 + ripple * 0.4 : 0
  }, [sim, ripple])

  useFrame(() => {
    // 块体加速时，水体向反方向堆积并来回晃荡
    const a = jelly.current?.accel
    if (a) sim.params.slosh.set(-a.x, -a.y).multiplyScalar(0.00012 * Math.max(ripple, 0.25)).clampLength(0, 0.0004)
  })

  const last = useRef<{ u: number; v: number; t: number } | null>(null)
  const toUv = (e: ThreeEvent<PointerEvent>) => {
    const p = e.object.worldToLocal(e.point.clone())
    return [(p.x + BLOCK.half) / BLOCK.size, (p.z + BLOCK.half) / BLOCK.size] as const
  }

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    // 只响应真正落在水面上的指针（岛屿遮挡时不起波）
    if (e.intersections[0]?.object !== e.object) {
      last.current = null
      return
    }
    const [u, v] = toUv(e)
    const now = performance.now()
    const prev = last.current
    last.current = { u, v, t: now }
    if (!prev || ripple <= 0) return
    const dist = Math.hypot(u - prev.u, v - prev.v)
    if (dist < 1e-4 || dist > 0.2) return
    const speed = dist / Math.max((now - prev.t) / 1000, 1 / 240)
    const strength = THREE.MathUtils.clamp(speed * 0.012, 0.003, 0.022) * ripple
    // 沿轨迹插值，快速划过也能留下连续的尾迹
    const steps = Math.min(6, Math.ceil(dist / 0.012))
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      sim.addDrop(prev.u + (u - prev.u) * t, prev.v + (v - prev.v) * t, 0.028, -strength / Math.sqrt(steps))
    }
  }

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.intersections[0]?.object !== e.object || ripple <= 0) return
    const [u, v] = toUv(e)
    sim.addDrop(u, v, 0.045, -0.035 * ripple)
  }

  return (
    <mesh
      geometry={geometry}
      material={material}
      position-y={waterLevel}
      renderOrder={3}
      receiveShadow
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerOut={() => (last.current = null)}
    />
  )
}
