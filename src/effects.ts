export interface EffectPalette {
  bg: string
  primary: string
  secondary: string
  sand?: string
  cliff?: string
}

export interface EffectMetaConfig {
  title?: string
  subtitle?: string
  category?: string
  summary?: string
  interaction?: string
  tags?: string[]
  highlights?: string[]
  scale?: string
  order?: number
  featured?: boolean
  cover?: string
  offlineHref?: string
  palette?: Partial<EffectPalette>
}

export interface EffectItem {
  slug: string
  href: string
  offlineHref?: string
  indexLabel: string
  title: string
  subtitle: string
  category: string
  summary: string
  interaction: string
  tags: string[]
  highlights: string[]
  scale?: string
  order: number
  featured: boolean
  cover?: string
  palette: EffectPalette
  readmeRaw?: string
}

const DEFAULT_PALETTES: EffectPalette[] = [
  {
    bg: '#f3e9dc',
    primary: '#1d8a86',
    secondary: '#46b8b0',
    sand: '#dec4a1',
    cliff: '#7b6856',
  },
  {
    bg: '#ebe8f4',
    primary: '#5647a8',
    secondary: '#8f7ce6',
    sand: '#d9d2eb',
    cliff: '#3d336b',
  },
  {
    bg: '#e9f1ec',
    primary: '#2c785c',
    secondary: '#62b695',
    sand: '#cfe2d8',
    cliff: '#345247',
  },
]

const IGNORED_SLUGS = new Set(['src', 'dist', 'public', 'node_modules'])

// 自动扫描所有一级子目录中的 index.html、meta.json、README.md
// index.html 通过 vite.config.ts 中的 `?title` 加载器仅导入 <title> 文本，
// 避免将体积巨大的单文件特效页（如 dayan-pagoda，约 1.2MB）整体打包进门户主 bundle
const htmlModules = import.meta.glob('../*/index.html', {
  query: '?title',
  import: 'default',
  eager: true,
}) as Record<string, string>

const metaModules = import.meta.glob('../*/meta.json', {
  import: 'default',
  eager: true,
}) as Record<string, EffectMetaConfig>

const readmeModules = import.meta.glob('../*/README.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function extractSlug(globPath: string): string | null {
  const match = globPath.match(/^\.\.\/([^/]+)\//)
  if (!match) return null
  const slug = match[1]
  if (slug.startsWith('.') || IGNORED_SLUGS.has(slug)) return null
  return slug
}

function parseReadmeFallback(readme?: string): Partial<EffectMetaConfig> {
  if (!readme) return {}
  const lines = readme
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  let title: string | undefined
  let subtitle: string | undefined
  const headingLine = lines.find((line) => line.startsWith('# '))
  if (headingLine) {
    const rawHeading = headingLine.replace(/^#\s+/, '').trim()
    const parts = rawHeading.split(/\s*·\s*/)
    title = parts[0]?.trim()
    subtitle = parts.slice(1).join(' · ').trim() || undefined
  }

  let summary: string | undefined
  let interaction: string | undefined
  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('```') || line.startsWith('|') || line.startsWith('-')) {
      continue
    }
    if (line.startsWith('交互：') || line.startsWith('交互:')) {
      interaction = line.replace(/^交互[：:]\s*/, '').trim()
      continue
    }
    if (!summary && line.length > 16) {
      summary = line
    }
  }

  // 解析 ## 技术栈 段落
  let tags: string[] | undefined
  const techMatch = readme.match(/##\s*技术栈[\r\n]+([^\r\n#]+)/)
  if (techMatch?.[1]) {
    tags = techMatch[1]
      .split(/\s*·\s*|\s*,\s*|\s*、\s*/)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  return { title, subtitle, summary, interaction, tags }
}

function hashSlug(slug: string): number {
  let h = 0
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0
  }
  return h
}

export function loadEffects(): EffectItem[] {
  const items: Omit<EffectItem, 'indexLabel'>[] = []

  for (const [htmlPath, htmlTitleRaw] of Object.entries(htmlModules)) {
    const slug = extractSlug(htmlPath)
    if (!slug) continue

    const meta = metaModules[`../${slug}/meta.json`] ?? {}
    const readmeRaw = readmeModules[`../${slug}/README.md`]
    const fallback = parseReadmeFallback(readmeRaw)
    const htmlTitle = htmlTitleRaw?.trim() || undefined

    const defaultPalette = DEFAULT_PALETTES[hashSlug(slug) % DEFAULT_PALETTES.length]
    const palette: EffectPalette = {
      ...defaultPalette,
      ...(meta.palette ?? {}),
    }

    const title = meta.title || fallback.title || htmlTitle || slug
    const subtitle = meta.subtitle || fallback.subtitle || slug
    const category = meta.category || 'WebGL 交互特效'
    const summary =
      meta.summary ||
      fallback.summary ||
      `位于 /${slug}/ 子目录的独立视觉特效页面。`
    const interaction =
      meta.interaction ||
      fallback.interaction ||
      '移动鼠标或触摸屏幕与场景进行实时交互'
    const tags = meta.tags?.length
      ? meta.tags
      : fallback.tags?.length
        ? fallback.tags
        : ['WebGL', 'Interactive']
    const highlights = meta.highlights ?? []

    items.push({
      slug,
      href: `./${slug}/`,
      offlineHref: meta.offlineHref,
      title,
      subtitle,
      category,
      summary,
      interaction,
      tags,
      highlights,
      scale: meta.scale,
      order: meta.order ?? 999,
      featured: meta.featured ?? false,
      cover: meta.cover,
      palette,
      readmeRaw,
    })
  }

  items.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    return a.slug.localeCompare(b.slug)
  })

  return items.map((item, idx) => ({
    ...item,
    indexLabel: String(idx + 1).padStart(2, '0'),
  }))
}
