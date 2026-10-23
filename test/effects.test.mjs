import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const IGNORED_DIRS = new Set(['node_modules', 'dist', 'public', 'src', 'test'])

function getEffectSubdirs() {
  return readdirSync(rootDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.') && !IGNORED_DIRS.has(d.name))
    .filter((d) => existsSync(resolve(rootDir, d.name, 'index.html')))
    .map((d) => d.name)
}

describe('Effects Gallery 工程结构与子目录规范测试', () => {
  test('根目录主界面入口文件与核心源码存在', () => {
    assert.ok(existsSync(resolve(rootDir, 'index.html')), '缺少根目录 index.html')
    assert.ok(existsSync(resolve(rootDir, 'vite.config.ts')), '缺少 vite.config.ts')
    assert.ok(existsSync(resolve(rootDir, 'src/main.tsx')), '缺少 src/main.tsx')
    assert.ok(existsSync(resolve(rootDir, 'src/App.tsx')), '缺少 src/App.tsx')
    assert.ok(existsSync(resolve(rootDir, 'src/effects.ts')), '缺少 src/effects.ts')
    assert.ok(existsSync(resolve(rootDir, 'src/EffectCover.tsx')), '缺少 src/EffectCover.tsx')
  })

  test('已收录 resin-island 与 qingyu-konbini 特效子目录', () => {
    const subdirs = getEffectSubdirs()
    assert.ok(subdirs.includes('resin-island'), '应包含 resin-island 子目录')
    assert.ok(subdirs.includes('qingyu-konbini'), '应包含 qingyu-konbini 子目录')
    assert.ok(subdirs.length >= 2, '至少包含 2 个特效子目录')
  })

  test('每个特效子目录包含合法的 index.html、meta.json 与返回主界面导航', () => {
    const subdirs = getEffectSubdirs()
    for (const slug of subdirs) {
      const dirPath = resolve(rootDir, slug)
      const htmlPath = resolve(dirPath, 'index.html')
      const metaPath = resolve(dirPath, 'meta.json')
      const readmePath = resolve(dirPath, 'README.md')

      const html = readFileSync(htmlPath, 'utf-8')
      assert.match(html, /<!doctype html>/i, `${slug}/index.html 缺少 doctype`)
      assert.doesNotMatch(
        html,
        /src=["']\/src\//,
        `${slug}/index.html 不应使用根路径 /src/，需使用相对路径 ./src/`,
      )

      assert.ok(existsSync(readmePath), `${slug} 缺少 README.md`)
      assert.ok(existsSync(metaPath), `${slug} 缺少 meta.json`)

      const meta = JSON.parse(readFileSync(metaPath, 'utf-8'))
      assert.equal(typeof meta.title, 'string', `${slug}/meta.json 缺少 title`)
      assert.ok(meta.title.length > 0, `${slug}/meta.json title 不能为空`)
      assert.equal(typeof meta.subtitle, 'string', `${slug}/meta.json 缺少 subtitle`)
      assert.equal(typeof meta.summary, 'string', `${slug}/meta.json 缺少 summary`)
      assert.ok(Array.isArray(meta.tags) && meta.tags.length > 0, `${slug}/meta.json tags 应为非空数组`)
      assert.equal(typeof meta.order, 'number', `${slug}/meta.json order 应为数字`)
      assert.equal(typeof meta.palette, 'object', `${slug}/meta.json 缺少 palette 配色配置`)
    }
  })

  test('qingyu-konbini v2 离线版资源齐全（含 three-vrm 与 GLTFLoader）', () => {
    assert.ok(
      existsSync(resolve(rootDir, 'qingyu-konbini/offline/index.html')),
      '缺少 qingyu-konbini/offline/index.html',
    )
    assert.ok(
      existsSync(resolve(rootDir, 'qingyu-konbini/offline/lib/build/three.min.js')),
      '缺少 qingyu-konbini/offline/lib/build/three.min.js',
    )
    assert.ok(
      existsSync(resolve(rootDir, 'qingyu-konbini/offline/lib/three-vrm/three-vrm.min.js')),
      '缺少 qingyu-konbini/offline/lib/three-vrm/three-vrm.min.js',
    )
    assert.ok(
      existsSync(resolve(rootDir, 'qingyu-konbini/offline/lib/examples/js/loaders/GLTFLoader.js')),
      '缺少 qingyu-konbini/offline/lib/examples/js/loaders/GLTFLoader.js',
    )
    const onlineHtml = readFileSync(resolve(rootDir, 'qingyu-konbini/index.html'), 'utf-8')
    const offlineHtml = readFileSync(resolve(rootDir, 'qingyu-konbini/offline/index.html'), 'utf-8')
    assert.match(onlineHtml, /id="vrm-upload-btn"/, '在线版缺少替换 VRM 模型按钮')
    assert.match(offlineHtml, /id="vrm-upload-btn"/, '离线版缺少替换 VRM 模型按钮')
    assert.match(onlineHtml, /rigFromVRM1/, '在线版缺少 VRM 1.0 支持')
    assert.match(offlineHtml, /rigFromVRM1/, '离线版缺少 VRM 1.0 支持')
    assert.ok(
      existsSync(resolve(rootDir, 'qingyu-konbini/character.vrm')),
      '缺少默认模型 qingyu-konbini/character.vrm',
    )
  })

  test('多页面构建 (npm run build) 生成主界面与所有子目录产物', () => {
    execSync('npm run build', { cwd: rootDir, stdio: 'pipe' })
    assert.ok(existsSync(resolve(rootDir, 'dist/index.html')), '构建产物缺少 dist/index.html')
    assert.ok(
      existsSync(resolve(rootDir, 'dist/resin-island/index.html')),
      '构建产物缺少 dist/resin-island/index.html',
    )
    assert.ok(
      existsSync(resolve(rootDir, 'dist/qingyu-konbini/index.html')),
      '构建产物缺少 dist/qingyu-konbini/index.html',
    )
    assert.ok(
      existsSync(resolve(rootDir, 'dist/qingyu-konbini/offline/index.html')),
      '构建产物缺少 dist/qingyu-konbini/offline/index.html',
    )
    assert.ok(
      existsSync(resolve(rootDir, 'dist/qingyu-konbini/character.vrm')),
      '构建产物缺少 dist/qingyu-konbini/character.vrm',
    )
    assert.ok(
      existsSync(resolve(rootDir, 'dist/dayan-pagoda/index.html')),
      '构建产物缺少 dist/dayan-pagoda/index.html',
    )
    const narrationPath = 'dayan-pagoda/audio/narration.mp3'
    assert.deepEqual(
      readFileSync(resolve(rootDir, 'dist', narrationPath)),
      readFileSync(resolve(rootDir, narrationPath)),
      '生产构建必须完整保留大雁塔的固定解说录音',
    )
    const mainChunks = readdirSync(resolve(rootDir, 'dist/assets')).filter((f) => /^main-.*\.js$/.test(f))
    for (const chunk of mainChunks) {
      const code = readFileSync(resolve(rootDir, 'dist/assets', chunk), 'utf-8')
      assert.ok(!code.includes('three.js r186 | MIT License'), `门户主 bundle ${chunk} 不应内联子页面整页 HTML`)
    }
  })
})
