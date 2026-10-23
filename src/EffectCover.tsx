import { useState, type MouseEvent } from 'react'
import type { EffectItem } from './effects.ts'
import { DayanPagodaCover } from './DayanPagodaCover.tsx'

interface Props {
  effect: EffectItem
}

export function EffectCover({ effect }: Props) {
  const [pointer, setPointer] = useState({ x: 0.5, y: 0.5, active: false })

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setPointer({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)), active: true })
  }

  const handleLeave = () => {
    setPointer({ x: 0.5, y: 0.5, active: false })
  }

  const tiltX = pointer.active ? (pointer.x - 0.5) * 14 : 0
  const tiltY = pointer.active ? (pointer.y - 0.5) * -10 : 0
  const shearX = pointer.active ? (pointer.x - 0.5) * -6 : 0

  if (effect.cover) {
    return (
      <div className="cover" onMouseMove={handleMove} onMouseLeave={handleLeave}>
        <img className="cover__img" src={effect.cover} alt={effect.title} loading="lazy" />
        <div className="cover__overlay">
          <span className="cover__cta">点击进入特效页面 →</span>
        </div>
      </div>
    )
  }

  const isResinIsland = effect.slug === 'resin-island'
  const isKonbini = effect.slug === 'qingyu-konbini'
  const { palette } = effect

  return (
    <div
      className={`cover ${isKonbini ? 'cover--night' : ''}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={
        {
          '--cover-bg': palette.bg,
          '--cover-primary': palette.primary,
          '--cover-secondary': palette.secondary,
          '--cover-sand': palette.sand ?? '#dec4a1',
          '--cover-cliff': palette.cliff ?? '#7b6856',
          '--ptr-x': `${(pointer.x * 100).toFixed(1)}%`,
          '--ptr-y': `${(pointer.y * 100).toFixed(1)}%`,
        } as React.CSSProperties
      }
    >
      <div className="cover__ambient" />

      {isResinIsland ? (
        <div
          className="diorama"
          style={{
            transform: `perspective(800px) rotateX(${tiltY.toFixed(2)}deg) rotateY(${tiltX.toFixed(2)}deg) skewX(${shearX.toFixed(2)}deg)`,
          }}
        >
          <div className="diorama__shadow" />
          <svg
            className="diorama__svg"
            viewBox="0 0 360 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="resinTop" x1="60" y1="30" x2="300" y2="150" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#7be0d6" stopOpacity="0.82" />
                <stop offset="55%" stopColor="#2ca69e" stopOpacity="0.88" />
                <stop offset="100%" stopColor="#146b68" stopOpacity="0.92" />
              </linearGradient>
              <linearGradient id="resinLeft" x1="50" y1="85" x2="180" y2="195" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#35b5ac" stopOpacity="0.82" />
                <stop offset="65%" stopColor="#177370" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#0f4e4d" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="resinRight" x1="180" y1="120" x2="310" y2="195" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#24948e" stopOpacity="0.86" />
                <stop offset="100%" stopColor="#0b3f40" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="islandCliff" x1="140" y1="44" x2="215" y2="115" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#9e8975" />
                <stop offset="55%" stopColor="#7b6856" />
                <stop offset="100%" stopColor="#58493b" />
              </linearGradient>
              <radialGradient id="shallowGlow" cx="52%" cy="46%" r="36%">
                <stop offset="0%" stopColor="#a7f3e8" stopOpacity="0.85" />
                <stop offset="60%" stopColor="#46b8b0" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#1d8a86" stopOpacity="0" />
              </radialGradient>
            </defs>

            <path
              d="M56 116 L180 164 L304 116 L304 148 Q242 174 180 194 Q118 174 56 148 Z"
              fill="#cbb08d"
              opacity="0.65"
            />
            <path
              d="M56 88 L180 136 L180 194 L56 146 Z"
              fill="url(#resinLeft)"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="1"
            />
            <path
              d="M304 88 L180 136 L180 194 L304 146 Z"
              fill="url(#resinRight)"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
            />
            <path
              d="M78 118 Q112 132 138 156 M108 126 Q142 146 166 172 M210 156 Q242 138 278 124"
              stroke="rgba(186, 255, 245, 0.36)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M180 40 L304 88 L180 136 L56 88 Z"
              fill="url(#resinTop)"
              stroke="rgba(255,255,255,0.65)"
              strokeWidth="1.2"
            />
            <ellipse cx="184" cy="86" rx="74" ry="32" fill="url(#shallowGlow)" />
            <ellipse
              className="diorama__ripple diorama__ripple--1"
              cx="182"
              cy="87"
              rx="60"
              ry="25"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="1.1"
              strokeDasharray="8 6"
            />
            <ellipse
              className="diorama__ripple diorama__ripple--2"
              cx="182"
              cy="87"
              rx="82"
              ry="34"
              stroke="rgba(215,255,250,0.38)"
              strokeWidth="1"
            />
            <path
              d="M128 88 Q154 106 202 101 Q232 96 238 82 Q216 67 174 68 Q140 70 128 88 Z"
              fill="#e6cfa8"
            />
            <path
              d="M123 89 Q154 110 206 104 Q238 98 243 81"
              stroke="rgba(255,255,255,0.78)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M142 84 L158 54 L184 46 L212 58 L224 82 Q196 94 166 92 Q148 90 142 84 Z"
              fill="url(#islandCliff)"
            />
            <path d="M158 54 L184 46 L188 78 L142 84 Z" fill="#95806b" opacity="0.75" />
            <path
              d="M156 56 Q182 44 208 58 Q194 68 174 67 Q160 65 156 56 Z"
              fill="#4f7c56"
            />
            <g fill="#2e593a">
              <polygon points="172,36 166,52 178,52" />
              <polygon points="184,33 177,50 191,50" />
              <polygon points="195,40 189,54 201,54" />
            </g>
            <ellipse cx="115" cy="84" rx="7" ry="4" fill="#6f6256" />
            <ellipse cx="246" cy="92" rx="5.5" ry="3.2" fill="#6f6256" />
          </svg>
          <div className="diorama__cursor-ripple" />
        </div>
      ) : isKonbini ? (
        <div
          className="diorama"
          style={{
            transform: `perspective(800px) rotateX(${tiltY.toFixed(2)}deg) rotateY(${tiltX.toFixed(2)}deg)`,
          }}
        >
          <svg
            className="diorama__svg"
            viewBox="0 0 360 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="warmStoreGlow" cx="50%" cy="55%" r="48%">
                <stop offset="0%" stopColor="#fde68a" stopOpacity="0.55" />
                <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#09101d" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="puddleReflect" x1="110" y1="150" x2="250" y2="198" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.48" />
                <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.52" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            {/* 雨夜暖光氛围晕 */}
            <ellipse cx="184" cy="122" rx="135" ry="76" fill="url(#warmStoreGlow)" />

            {/* 潮湿柏油街角底座 */}
            <path d="M36 154 L182 128 L326 154 L180 198 Z" fill="#111a2c" stroke="#243554" strokeWidth="1.2" />

            {/* 积水坑与霓虹倒影 */}
            <ellipse cx="188" cy="168" rx="68" ry="15" fill="url(#puddleReflect)" />
            <ellipse cx="122" cy="162" rx="26" ry="7" fill="rgba(56, 189, 248, 0.3)" />

            {/* 便利店建筑主体 */}
            <rect x="92" y="64" width="176" height="84" rx="4" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
            <rect x="86" y="54" width="188" height="18" rx="3" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />

            {/* 三色便利店灯带招牌 */}
            <rect x="90" y="58" width="180" height="4" fill="#38bdf8" />
            <rect x="90" y="63" width="180" height="3" fill="#34d399" />
            <rect x="90" y="67" width="180" height="3" fill="#f59e0b" />

            {/* 顶部发光字牌 */}
            <rect x="128" y="34" width="104" height="20" rx="4" fill="#0ea5e9" stroke="#e0f2fe" strokeWidth="1.5" />
            <text
              x="180"
              y="48"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="11"
              fontWeight="700"
              fontFamily="sans-serif"
              letterSpacing="2"
            >
              晴雨便利店 24H
            </text>

            {/* 便利店暖光玻璃橱窗与货架 */}
            <rect x="104" y="82" width="96" height="58" rx="2" fill="#fef3c7" />
            <line x1="112" y1="102" x2="192" y2="102" stroke="#d97706" strokeWidth="3" />
            <line x1="112" y1="118" x2="192" y2="118" stroke="#d97706" strokeWidth="3" />
            <line x1="152" y1="82" x2="152" y2="140" stroke="#1e293b" strokeWidth="2.5" />

            {/* 自动感应玻璃门 */}
            <rect x="208" y="82" width="46" height="64" rx="2" fill="#bae6fd" fillOpacity="0.82" stroke="#0f172a" strokeWidth="2" />
            <line x1="231" y1="82" x2="231" y2="146" stroke="#0f172a" strokeWidth="1.8" />

            {/* 屋檐下小猫剪影 */}
            <circle cx="198" cy="144" r="3.5" fill="#f8fafc" />
            <ellipse cx="195" cy="147" rx="5" ry="3.2" fill="#f8fafc" />

            {/* 街角撑透明伞的角色剪影 (v2) */}
            <g transform="translate(226, 126)">
              <path
                d="M-16 6 Q0 -10 16 6 Z"
                fill="rgba(224, 242, 254, 0.55)"
                stroke="#e0f2fe"
                strokeWidth="1.2"
              />
              <line x1="0" y1="-2" x2="0" y2="16" stroke="#bae6fd" strokeWidth="1.2" />
              <circle cx="-2" cy="10" r="4" fill="#fde68a" />
              <path d="M-7 25 L-4 14 L1 14 L4 25 Z" fill="#38bdf8" />
            </g>

            {/* 街角路灯与冷色光锥 */}
            <line x1="68" y1="42" x2="68" y2="152" stroke="#475569" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M68 42 Q82 40 88 46" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
            <circle cx="89" cy="48" r="5" fill="#e0f2fe" />
            <path d="M89 50 L54 152 L118 152 Z" fill="rgba(125, 211, 252, 0.13)" />

            {/* 斜风细雨线 */}
            <g stroke="rgba(186, 230, 253, 0.45)" strokeWidth="1.2" strokeLinecap="round">
              <line x1="72" y1="22" x2="62" y2="48" />
              <line x1="118" y1="18" x2="108" y2="44" />
              <line x1="262" y1="24" x2="252" y2="50" />
              <line x1="306" y1="46" x2="296" y2="72" />
              <line x1="146" y1="148" x2="138" y2="168" />
              <line x1="226" y1="152" x2="218" y2="172" />
            </g>
          </svg>
          <div className="diorama__cursor-ripple" />
        </div>
      ) : effect.slug === 'dayan-pagoda' ? (
        <div
          className="diorama"
          style={{
            transform: `perspective(800px) rotateX(${tiltY.toFixed(2)}deg) rotateY(${tiltX.toFixed(2)}deg)`,
          }}
        >
          <DayanPagodaCover />
          <div className="diorama__cursor-ripple" />
        </div>
      ) : (
        <div
          className="generative-stage"
          style={{
            transform: `perspective(800px) rotateX(${tiltY.toFixed(2)}deg) rotateY(${tiltX.toFixed(2)}deg)`,
          }}
        >
          <div className="generative-stage__orb generative-stage__orb--1" />
          <div className="generative-stage__orb generative-stage__orb--2" />
          <div className="generative-stage__grid" />
          <span className="generative-stage__slug">/{effect.slug}/</span>
        </div>
      )}

      <div className="cover__badges">
        <span className="cover__badge cover__badge--dir">/{effect.slug}/</span>
        {effect.scale && <span className="cover__badge">{effect.scale}</span>}
      </div>

      <div className="cover__overlay">
        <span className="cover__cta">进入特效页面 →</span>
      </div>
    </div>
  )
}
