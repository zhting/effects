/**
 * 共享 uniform + GLSL 片段 + 对内置材质的注入（onBeforeCompile）。
 * 共享 uniform 是同一组对象引用，任一处更新 .value，所有材质同步生效。
 */
import * as THREE from 'three'

export function createSceneUniforms(heightMap: THREE.Texture) {
  return {
    uTime: { value: 0 },
    uSim: { value: null as THREE.Texture | null },
    uSimTexel: { value: new THREE.Vector2(1 / 256, 1 / 256) },
    uHeightMap: { value: heightMap },
    uWaterLevel: { value: 1 },
    uWaveHeight: { value: 1 },
    uSunDir: { value: new THREE.Vector3(-0.6, 0.7, -0.3).normalize() },
    uShallow: { value: new THREE.Color('#5fe0d0') },
    uDeep: { value: new THREE.Color('#0b6e8c') },
    uCausticStrength: { value: 1 },
  }
}
export type SceneUniforms = ReturnType<typeof createSceneUniforms>

export const GLSL_COMMON = /* glsl */ `
uniform float uTime;
uniform sampler2D uSim;
uniform vec2 uSimTexel;
uniform sampler2D uHeightMap;
uniform float uWaterLevel;
uniform float uWaveHeight;
uniform vec3 uSunDir;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform float uCausticStrength;

const float BLOCK_HALF = 2.0;
const float BLOCK_SIZE = 4.0;
const float BLOCK_RADIUS = 0.5;

vec2 worldToUv(vec2 xz) { return (xz + BLOCK_HALF) / BLOCK_SIZE; }

float sdRoundRect(vec2 p, float hw, float r) {
  vec2 q = abs(p) - vec2(hw - r);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm2(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; }
  return s;
}

// 动态 Voronoi 的 F2-F1：细胞边界即焦散亮线
float voronoiEdge(vec2 p, float t) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float f1 = 8.0;
  float f2 = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash22(n + g);
      o = 0.5 + 0.42 * sin(t + 6.2831 * o);
      float d = length(g + o - f);
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) { f2 = d; }
    }
  }
  return f2 - f1;
}

float causticPattern(vec2 p, float t) {
  // 低频扭曲让亮线弯曲，像真实的折射焦散
  p += 0.12 * vec2(vnoise(p * 1.7 + t * 0.2), vnoise(p * 1.7 - t * 0.2 + 3.0));
  float a = voronoiEdge(p * 3.4, t * 0.9);
  float la = 1.0 - smoothstep(0.0, 0.14, a);
#ifdef LOW_QUALITY
  float c = la * 1.1;
#else
  float b = voronoiEdge(p * 4.6 + 7.3, -t * 1.2 + 2.0);
  float lb = 1.0 - smoothstep(0.0, 0.12, b);
  float c = la * 0.75 + lb * 0.55;
#endif
  return c * c;
}

// 采样水面模拟：r = 高度, g = 速度
vec4 simAt(vec2 uv) { return texture2D(uSim, uv); }
`

/** 水下：湿痕、藻色、吸收色偏、焦散。用于地形和礁石 */
export function injectUnderwater(
  material: THREE.MeshStandardMaterial,
  uniforms: SceneUniforms,
  opts: { algae: number; key: string; low?: boolean },
) {
  if (opts.low) material.defines = { ...material.defines, LOW_QUALITY: '' }
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, { uAlgae: { value: opts.algae } })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        vec4 lp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          lp = instanceMatrix * lp;
        #endif
        vLocal = lp.xyz;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vLocal;\nuniform float uAlgae;\n${GLSL_COMMON}`)
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        float uwC = uWaterLevel - vLocal.y;
        float underC = smoothstep(-0.004, 0.03, uwC);
        // 水线以上一窄条湿痕
        float wetC = (1.0 - underC) * (1.0 - smoothstep(0.0, 0.08, -uwC));
        diffuseColor.rgb *= 1.0 - 0.3 * wetC;
        // 礁石水下部分长苔藻
        float algN = fbm2(vLocal.xz * 9.0 + vLocal.y * 4.0);
        float alg = uAlgae * underC * smoothstep(0.35, 0.65, algN + 0.25 * smoothstep(0.0, 0.25, uwC));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.07, 0.14, 0.06), alg * 0.85);
        // 水体：红光被吸收最快，同时水体内散射补入青绿色（否则沙子会发绿）
        vec3 T = exp(-vec3(1.25, 0.32, 0.2) * uwC * 1.5);
        vec3 scatter = uShallow * (1.0 - T.g) * 0.85;
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * T + scatter, underC * 0.8);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        {
          float uw = uWaterLevel - vLocal.y;
          float under = smoothstep(-0.004, 0.03, uw);
          if (under > 0.0 && uCausticStrength > 0.0) {
            // 沿太阳方向投射到水面，再取水面法线扰动
            vec2 p = vLocal.xz + uSunDir.xz / max(uSunDir.y, 0.25) * uw;
            vec2 suv = worldToUv(p);
            float hc = simAt(suv).r;
            float hl = simAt(suv - vec2(uSimTexel.x, 0.0)).r;
            float hr = simAt(suv + vec2(uSimTexel.x, 0.0)).r;
            float hd = simAt(suv - vec2(0.0, uSimTexel.y)).r;
            float hu = simAt(suv + vec2(0.0, uSimTexel.y)).r;
            vec2 grad = vec2(hr - hl, hu - hd);
            float lap = hl + hr + hd + hu - 4.0 * hc;
            p += grad * 2.5 * uWaveHeight * min(uw, 1.0);
            float c = causticPattern(p, uTime * 0.9);
            // 涟漪会聚光（拉普拉斯为负 = 波峰透镜）
            c *= clamp(1.0 - lap * 55.0 * uWaveHeight, 0.25, 3.0);
            float atten = exp(-uw * 1.1);
            float sunF = smoothstep(0.05, 0.6, uSunDir.y);
            totalEmissiveRadiance += c * under * atten * sunF * uCausticStrength * vec3(1.0, 0.97, 0.86) * 0.5;
          }
        }`,
      )
  }
  material.customProgramCacheKey = () => `underwater-${opts.key}-${opts.low ? 'lq' : 'hq'}`
  return material
}

/** 植被随风摆动（实例化） */
export function injectWind(material: THREE.MeshStandardMaterial, uniforms: SceneUniforms, strength: number, key: string) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uTime: uniforms.uTime, uWind: { value: strength } })
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = instanceMatrix[3].xyz;
        #else
          vec3 ip = vec3(0.0);
        #endif
        float hgt = max(transformed.y, 0.0);
        float sw = sin(uTime * 1.3 + ip.x * 3.1 + ip.z * 2.3) * 0.6 + sin(uTime * 2.3 + ip.x * 5.0 + ip.z) * 0.25;
        transformed.x += sw * uWind * hgt * hgt;
        transformed.z += cos(uTime * 1.1 + ip.z * 2.7) * 0.4 * uWind * hgt * hgt;`,
      )
  }
  material.customProgramCacheKey = () => `wind-${key}`
  return material
}
