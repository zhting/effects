import { useMemo, useState, type MouseEvent } from 'react'
import { loadEffects, type EffectItem } from './effects.ts'
import { EffectCover } from './EffectCover.tsx'

export default function App() {
  const effects = useMemo(() => loadEffects(), [])
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<string>('全部')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [darkMode, setDarkMode] = useState(false)
  const [activeDoc, setActiveDoc] = useState<EffectItem | null>(null)
  const [showGuide, setShowGuide] = useState(false)

  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const item of effects) {
      for (const t of item.tags) tagSet.add(t)
    }
    return ['全部', ...Array.from(tagSet)]
  }, [effects])

  const filteredEffects = useMemo(() => {
    const q = search.trim().toLowerCase()
    return effects.filter((item) => {
      if (selectedTag !== '全部' && !item.tags.includes(selectedTag)) {
        return false
      }
      if (!q) return true
      const haystack = [
        item.slug,
        item.title,
        item.subtitle,
        item.category,
        item.summary,
        ...item.tags,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [effects, search, selectedTag])

  const openDocModal = (e: MouseEvent, item: EffectItem) => {
    e.preventDefault()
    e.stopPropagation()
    setActiveDoc(item)
  }

  return (
    <div className={`portal ${darkMode ? 'portal--dark' : ''}`}>
      {/* 顶部展厅横幅 */}
      <header className="hero">
        <div className="hero__inner">
          <div className="hero__brand">
            <span className="hero__eyebrow">INTERACTIVE VISUAL EFFECTS COLLECTION</span>
            <h1 className="hero__title">视觉特效数字展厅</h1>
            <p className="hero__desc">
              每个特效独立存放于单独的子目录中，点击卡片即可直接进入对应子目录的交互特效页面。
            </p>
          </div>

          <div className="hero__actions">
            <div className="stat-pill">
              <span className="stat-pill__label">已收录特效</span>
              <strong className="stat-pill__value">{String(effects.length).padStart(2, '0')}</strong>
            </div>

            <button
              type="button"
              className="action-btn"
              onClick={() => setShowGuide((v) => !v)}
              title="查看如何新增特效子目录"
            >
              + 子目录规范
            </button>

            <button
              type="button"
              className="action-btn"
              onClick={() => setDarkMode((d) => !d)}
              title="切换明暗主题"
            >
              {darkMode ? '☀ 暖砂亮色' : '☾ 曜石暗色'}
            </button>
          </div>
        </div>

        {/* 可展开的子目录扩展说明面板 */}
        {showGuide && (
          <div className="guide-banner">
            <div className="guide-banner__head">
              <strong>如何添加新的特效子目录？</strong>
              <button type="button" className="guide-banner__close" onClick={() => setShowGuide(false)}>
                收起 ✕
              </button>
            </div>
            <p className="guide-banner__text">
              本项目采用根目录 Vite 多页面工程并自动扫描一级子目录。只需新建一个子目录（例如{' '}
              <code>./aurora-fluid/</code>），放入 <code>index.html</code> 与代码，可选添加{' '}
              <code>meta.json</code> 或 <code>README.md</code>，刷新主界面即可自动生成展示卡片并注册路由。
            </p>
            <div className="guide-banner__code">
              <code>
                effects/
                {'\n'}├── index.html &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# 主界面门户入口
                {'\n'}├── resin-island/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# 特效 01：树脂块微缩岛屿 (/resin-island/)
                {'\n'}│ &nbsp;&nbsp;├── index.html &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# 子页面入口
                {'\n'}│ &nbsp;&nbsp;├── meta.json &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# 卡片元数据（标题、标签、简介、配色）
                {'\n'}│ &nbsp;&nbsp;└── src/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# 特效源码
                {'\n'}└── your-next-effect/ &nbsp;&nbsp;&nbsp;&nbsp;# 特效 02：新建子目录后自动识别 (/your-next-effect/)
              </code>
            </div>
          </div>
        )}
      </header>

      {/* 检索与标签过滤工具栏 */}
      <section className="toolbar" aria-label="筛选与视图切换">
        <div className="toolbar__filters">
          <div className="search-box">
            <span className="search-box__icon" aria-hidden="true">
              ⌕
            </span>
            <input
              type="search"
              className="search-box__input"
              placeholder="搜索特效名称、子目录或技术关键词..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="search-box__clear"
                onClick={() => setSearch('')}
                aria-label="清空搜索"
              >
                ✕
              </button>
            )}
          </div>

          <div className="tag-bar" role="tablist" aria-label="技术标签筛选">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                role="tab"
                aria-selected={selectedTag === tag}
                className={`tag-pill ${selectedTag === tag ? 'tag-pill--active' : ''}`}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="view-switch" role="group" aria-label="布局模式">
          <button
            type="button"
            className={`view-switch__btn ${viewMode === 'grid' ? 'view-switch__btn--active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            卡片视图
          </button>
          <button
            type="button"
            className={`view-switch__btn ${viewMode === 'list' ? 'view-switch__btn--active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            列表视图
          </button>
        </div>
      </section>

      {/* 特效卡片展示区 */}
      <main className="gallery">
        {filteredEffects.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__title">未找到匹配的特效页面</p>
            <p className="empty-state__sub">请尝试清除搜索词或切换标签筛选条件</p>
            <button
              type="button"
              className="action-btn"
              onClick={() => {
                setSearch('')
                setSelectedTag('全部')
              }}
            >
              重置筛选
            </button>
          </div>
        ) : (
          <div className={`cards ${viewMode === 'list' ? 'cards--list' : 'cards--grid'}`}>
            {filteredEffects.map((effect) => (
              <a
                key={effect.slug}
                href={effect.href}
                className={`effect-card ${effect.featured ? 'effect-card--featured' : ''}`}
              >
                <div className="effect-card__media">
                  <EffectCover effect={effect} />
                </div>

                <div className="effect-card__body">
                  <div className="effect-card__meta">
                    <span className="effect-card__index">NO. {effect.indexLabel}</span>
                    <span className="effect-card__dot">·</span>
                    <span className="effect-card__category">{effect.category}</span>
                    <span className="effect-card__path">/{effect.slug}/</span>
                  </div>

                  <div className="effect-card__heading">
                    <div>
                      <h2 className="effect-card__title">{effect.title}</h2>
                      <p className="effect-card__subtitle">{effect.subtitle}</p>
                    </div>
                    <span className="effect-card__enter" aria-hidden="true">
                      ↗
                    </span>
                  </div>

                  <p className="effect-card__summary">{effect.summary}</p>

                  {effect.highlights.length > 0 && (
                    <ul className="effect-card__highlights">
                      {effect.highlights.map((pt) => (
                        <li key={pt}>{pt}</li>
                      ))}
                    </ul>
                  )}

                  <div className="effect-card__interaction">
                    <span className="effect-card__interaction-label">交互操作</span>
                    <span className="effect-card__interaction-text">{effect.interaction}</span>
                  </div>

                  <div className="effect-card__footer">
                    <div className="effect-card__tags">
                      {effect.tags.map((tag) => (
                        <span key={tag} className="effect-card__tag">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="effect-card__links">
                      {effect.offlineHref && (
                        <button
                          type="button"
                          className="effect-card__doc-btn"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            window.location.href = effect.offlineHref!
                          }}
                          title="使用本地内置 three.js 离线运行"
                        >
                          离线版
                        </button>
                      )}
                      {effect.readmeRaw && (
                        <button
                          type="button"
                          className="effect-card__doc-btn"
                          onClick={(e) => openDocModal(e, effect)}
                        >
                          技术文档
                        </button>
                      )}
                      <span className="effect-card__go">进入子页面 →</span>
                    </div>
                  </div>
                </div>
              </a>
            ))}

            {/* 引导新增下一个特效子目录的占位卡片 */}
            <button
              type="button"
              className="next-slot-card"
              onClick={() => setShowGuide(true)}
            >
              <span className="next-slot-card__index">
                NO. {String(effects.length + 1).padStart(2, '0')}
              </span>
              <div className="next-slot-card__icon">+</div>
              <h3 className="next-slot-card__title">添加下一个特效子目录</h3>
              <p className="next-slot-card__desc">
                在根目录下新建 <code>&lt;effect-name&gt;/index.html</code>，展厅将自动扫描并在此生成入口卡片。
              </p>
              <span className="next-slot-card__hint">查看子目录规范 →</span>
            </button>
          </div>
        )}
      </main>

      <footer className="footer">
        <span>Effects Gallery · 子目录模块化多页面架构</span>
        <span>点击任意卡片直接跳转至对应子目录页面</span>
      </footer>

      {/* README / 技术说明弹窗 */}
      {activeDoc && (
        <div className="modal-backdrop" onClick={() => setActiveDoc(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <div>
                <span className="modal__path">/{activeDoc.slug}/README.md</span>
                <h3 className="modal__title">
                  {activeDoc.title} · {activeDoc.subtitle}
                </h3>
              </div>
              <div className="modal__actions">
                <a href={activeDoc.href} className="modal__launch">
                  进入特效页面 ↗
                </a>
                <button
                  type="button"
                  className="modal__close"
                  onClick={() => setActiveDoc(null)}
                  aria-label="关闭窗口"
                >
                  ✕
                </button>
              </div>
            </div>
            <pre className="modal__content">{activeDoc.readmeRaw}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
