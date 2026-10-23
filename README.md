# 视觉特效数字展厅 · Effects Gallery

基于 Vite 多页面架构（MPA）的视觉特效展示主界面。每个特效独立存放在根目录下的一级子目录中，主界面会自动扫描所有包含 `index.html` 的子目录并生成门户卡片。

## 快速开始

```bash
npm install
npm run dev      # 启动开发服务器（主界面 / 与所有子目录特效页同时可用）
npm run build    # TypeScript 类型检查 + 多页面生产构建
npm run preview  # 预览生产构建产物
```

## 目录结构

```text
effects/
├── index.html              # 主界面门户入口 (/)
├── src/                    # 主界面门户源码
│   ├── main.tsx
│   ├── App.tsx             # 门户画廊、搜索筛选、主题/视图切换
│   ├── EffectCover.tsx     # 交互式卡片封面预览
│   ├── effects.ts          # 自动扫描子目录 index.html / meta.json / README.md
│   └── styles.css
├── dayan-pagoda/           # 单文件特效：大雁塔三维院落 (/dayan-pagoda/)，内联 three.js + 路径追踪
├── resin-island/           # 第一个特效页面：树脂块微缩岛屿 (/resin-island/)
│   ├── index.html
│   ├── meta.json           # 特效卡片元数据配置
│   ├── README.md           # 特效技术文档
│   └── src/                # 特效独立源码
└── vite.config.ts          # 自动扫描一级子目录并注册 Vite 多页面入口
```

## 如何添加新的特效页面

1. 在根目录下新建一个子目录，例如 `aurora-waves/`。
2. 在该子目录下创建 `index.html`（脚本引用使用相对路径，如 `<script type="module" src="./src/main.tsx"></script>`）。
3. *(可选)* 在该子目录下添加 `meta.json` 自定义卡片标题、副标题、简介、技术标签与主题色（若未提供 `meta.json`，主界面会自动从子目录的 `README.md` 或 `index.html` 中提取信息）。
4. 刷新主界面即可看到新特效卡片，点击直接跳转至 `/aurora-waves/`。
