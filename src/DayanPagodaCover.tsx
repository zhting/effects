export function DayanPagodaCover() {
  return (
    <svg
      className="diorama__svg"
      viewBox="0 0 360 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pagodaStone" x1="148" y1="40" x2="210" y2="155" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e6cfa8" />
          <stop offset="1" stopColor="#c4a77a" />
        </linearGradient>
        <linearGradient id="pagodaCourt" x1="80" y1="130" x2="280" y2="190" gradientUnits="userSpaceOnUse">
          <stop stopColor="#e8dcc5" />
          <stop offset="1" stopColor="#cbb894" />
        </linearGradient>
      </defs>

      <circle cx="240" cy="62" r="26" fill="#d8b569" fillOpacity="0.2" />
      <ellipse cx="181" cy="192" rx="133" ry="13" fill="#5c4a38" fillOpacity="0.12" />

      {/* 与其他封面一致的等距微缩底座。 */}
      <path d="M40 156 L180 108 L320 156 L180 208 Z" fill="#bca47e" />
      <path d="M40 150 L180 102 L320 150 L180 201 Z" fill="url(#pagodaCourt)" stroke="#f6ebd5" strokeWidth="1.2" />
      <path d="M40 150 L180 201 L180 208 L40 156 Z" fill="#bda682" />
      <path d="M320 150 L180 201 L180 208 L320 156 Z" fill="#a8906b" />
      <path d="M65 150 L180 112 L295 150 L180 191 Z" fill="#8b9a70" />
      <path d="M107 150 L180 125 L254 150 L180 178 Z" fill="#ddceb1" />
      <path d="M167 169 L180 164 L206 180 L192 185 Z" fill="#ede2cb" />
      <path d="M180 160 L230 150 L254 160 L206 179 Z" fill="#74654e" fillOpacity="0.17" />

      {/* 两侧的红墙灰瓦殿宇和院墙。 */}
      {[{ x: 84, y: 139 }, { x: 256, y: 139 }].map(({ x, y }) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <path d="M-24 0 L8 -11 L34 0 L2 12 Z" fill="#b7a184" />
          <path d="M-18 -4 L2 3 L2 -15 L-18 -22 Z" fill="#a95038" />
          <path d="M2 3 L27 -6 L27 -24 L2 -15 Z" fill="#863f2e" />
          <path d="M-26 -20 L-5 -36 L18 -28 L35 -21 L2 -9 Z" fill="#56605b" />
          <path d="M-26 -20 L2 -9 L35 -21" stroke="#89918a" strokeWidth="2" strokeLinejoin="round" />
          <path d="M-5 -36 L18 -28" stroke="#a3a79a" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 -12 L8 -1 M17 -15 L17 -4" stroke="#dfb879" strokeWidth="2" />
        </g>
      ))}
      <path d="M76 158 L126 177 M238 177 L287 159" stroke="#a34d36" strokeWidth="5" />
      <path d="M75 155 L126 174 M238 174 L288 156" stroke="#637066" strokeWidth="3" strokeLinecap="round" />

      {/* 七层方形砖塔：正面暖砂色，侧面压暗，逐层收分。 */}
      <path d="M132 152 L181 135 L231 152 L181 170 Z" fill="#eee2c9" />
      <path d="M132 152 L181 170 L181 177 L132 159 Z" fill="#c4af8b" />
      <path d="M231 152 L181 170 L181 177 L231 159 Z" fill="#a68d65" />
      {Array.from({ length: 7 }, (_, level) => {
        const y = 153 - level * 16
        const left = 180 - (76 - level * 6) / 2
        const right = 180 + (76 - level * 6) / 2
        return (
          <g key={level}>
            <path d={`M${left} ${y} L${right} ${y} L${right - 2} ${y - 15} L${left + 2} ${y - 15} Z`} fill="url(#pagodaStone)" />
            <path d={`M${right} ${y} L${right + 13} ${y - 8} L${right + 10} ${y - 23} L${right - 2} ${y - 15} Z`} fill="#a68b61" />
            <path d={`M${left - 3} ${y - 14} L${right + 2} ${y - 14} L${right + 16} ${y - 22} L${right + 13} ${y - 25} L${right - 1} ${y - 18} L${left} ${y - 18} Z`} fill="#ddc69e" />
            <path d={`M${left - 3} ${y - 14} L${right + 2} ${y - 14} L${right + 16} ${y - 22}`} stroke="#967c55" strokeWidth="1" strokeLinejoin="round" />
            <path d={`M177 ${y - 1} V${y - 7} A3 3 0 0 1 183 ${y - 7} V${y - 1} Z`} fill="#5c4a38" />
            <path d={`M${right + 4} ${y - 5} V${y - 12} L${right + 8} ${y - 15} V${y - 8} Z`} fill="#67563e" />
            <path d={`M${left + 5} ${y - 5} H172 M188 ${y - 5} H${right - 5}`} stroke="#b3966b" strokeOpacity="0.55" strokeWidth="0.7" />
          </g>
        )
      })}
      <path d="M155 38 L177 22 L190 22 L219 31 L198 40 Z" fill="#77725c" />
      <path d="M155 38 L198 40 L219 31" stroke="#9d987e" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M183 22 V14" stroke="#947130" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="183" cy="13" r="2.5" fill="#c4a04e" />

      {/* 用简洁树冠呼应树脂岛屿、便利店的插画细节密度。 */}
      {[{ x: 65, y: 145 }, { x: 116, y: 162 }, { x: 253, y: 166 }, { x: 294, y: 143 }].map(({ x, y }) => (
        <g key={x}>
          <ellipse cx={x + 3} cy={y + 4} rx="11" ry="4" fill="#496443" fillOpacity="0.2" />
          <path d={`M${x} ${y + 2} V${y - 17}`} stroke="#746347" strokeWidth="2.5" strokeLinecap="round" />
          <path d={`M${x} ${y - 33} L${x - 10} ${y - 12} Q${x} ${y - 5} ${x + 10} ${y - 12} Z`} fill="#52734f" />
          <path d={`M${x} ${y - 33} V${y - 9} Q${x + 6} ${y - 9} ${x + 10} ${y - 12} Z`} fill="#3b5a3e" />
        </g>
      ))}
    </svg>
  )
}
