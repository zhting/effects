import { readdirSync, existsSync, cpSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = dirname(fileURLToPath(import.meta.url))
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'public', 'src'])

/**
 * 自动扫描根目录下包含 index.html 的子目录作为独立特效页面入口
 */
function discoverEffectEntries() {
  const entries: Record<string, string> = {
    main: resolve(rootDir, 'index.html'),
  }
  const subdirs = readdirSync(rootDir, { withFileTypes: true })
  for (const dirent of subdirs) {
    if (!dirent.isDirectory()) continue
    if (dirent.name.startsWith('.') || IGNORED_DIRS.has(dirent.name)) continue
    const htmlPath = resolve(rootDir, dirent.name, 'index.html')
    if (existsSync(htmlPath)) {
      entries[dirent.name] = htmlPath
    }
  }
  return entries
}

/**
 * 1. 访问 /<effect-slug>（无末尾斜杠）时自动重定向至 /<effect-slug>/
 * 2. 构建时自动复制子目录下的 offline 和 audio 静态资源目录
 */
function subdirEffectsPlugin(): Plugin {
  const addRedirect = (middlewares: {
    use: (
      fn: (
        req: { url?: string },
        res: { statusCode: number; setHeader: (k: string, v: string) => void; end: () => void },
        next: () => void,
      ) => void,
    ) => void
  }) => {
    middlewares.use((req, res, next) => {
      if (!req.url) return next()
      const [pathname, query] = req.url.split('?')
      const clean = pathname.replace(/^\/+/, '')
      if (clean && !pathname.endsWith('/') && !clean.includes('.')) {
        const firstSeg = clean.split('/')[0]
        if (!IGNORED_DIRS.has(firstSeg)) {
          const htmlPath = resolve(rootDir, clean, 'index.html')
          if (existsSync(htmlPath)) {
            res.statusCode = 302
            res.setHeader('Location', `/${clean}/${query ? `?${query}` : ''}`)
            res.end()
            return
          }
        }
      }
      next()
    })
  }

  return {
    name: 'subdir-effects-plugin',
    configureServer(server) {
      addRedirect(server.middlewares)
    },
    configurePreviewServer(server) {
      addRedirect(server.middlewares)
    },
    closeBundle() {
      const subdirs = readdirSync(rootDir, { withFileTypes: true })
      for (const dirent of subdirs) {
        if (!dirent.isDirectory() || dirent.name.startsWith('.') || IGNORED_DIRS.has(dirent.name)) {
          continue
        }
        for (const staticDir of ['offline', 'audio']) {
          const staticSrc = resolve(rootDir, dirent.name, staticDir)
          if (existsSync(staticSrc)) {
            const staticDest = resolve(rootDir, 'dist', dirent.name, staticDir)
            cpSync(staticSrc, staticDest, { recursive: true })
          }
        }
        const vrmSrc = resolve(rootDir, dirent.name, 'character.vrm')
        if (existsSync(vrmSrc)) {
          const vrmDest = resolve(rootDir, 'dist', dirent.name, 'character.vrm')
          cpSync(vrmSrc, vrmDest)
        }
      }
    },
  }
}

/**
 * 支持 `import title from './xxx/index.html?title'`：仅导出页面 <title> 文本。
 * 门户只需要子页面标题作为兜底信息，避免以 ?raw 方式把整页 HTML 打进主 bundle。
 */
function htmlTitlePlugin(): Plugin {
  return {
    name: 'html-title-loader',
    enforce: 'pre',
    load(id) {
      const [file, query] = id.split('?')
      if (query !== 'title' || !file.endsWith('.html')) return null
      const html = readFileSync(file, 'utf-8')
      const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ?? ''
      return `export default ${JSON.stringify(title)}`
    },
  }
}

export default defineConfig({
  plugins: [react(), htmlTitlePlugin(), subdirEffectsPlugin()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: discoverEffectEntries(),
    },
  },
})
