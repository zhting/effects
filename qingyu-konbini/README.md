# 晴雨便利店 · 雨夜街角

three.js（r128）微缩三维场景，三渲二卡通风格。整个场景就是一个 HTML 文件，没有构建步骤。

## 目录

```
index.html            在线版：从 CDN 加载 three.js，直接用浏览器打开即可
offline/index.html    离线版：three.js 及扩展脚本都在 offline/lib，断网也能运行
offline/record.html   录制专用版：接管时钟和随机数，供 tools/record.js 逐帧渲染
offline/lib/          three.js r128 及用到的 examples/js 扩展（MIT 许可，见 LICENSE-three.js.txt）
tools/record.js       Playwright 逐帧截图脚本
tools/package.json    录制脚本依赖与命令
```

## 打开

- 双击 `index.html`（需要联网）或 `offline/index.html`（不需联网）。
- 若浏览器限制本地文件，可在目录下起一个静态服务器：`npx serve .` 或 `python3 -m http.server`。
- 操作：左键拖动旋转，滚轮缩放，右键平移；触屏单指旋转、双指缩放。
- 中文字体优先从 Google Fonts 加载，离线时回退到系统中文字体（苹方 / 微软雅黑 / 思源黑体）。

## 录制视频

```bash
cd tools
npm install
npx playwright install chromium
npm run record      # 输出 frames/f0000.png …（12 秒 × 30fps = 360 帧）
npm run encode      # 需要本机已安装 ffmpeg，输出 qingyu-konbini.mp4
```

参数：`node record.js 输出目录 宽 高 fps 秒数 [起始帧 结束帧]`，例如 1080p：
`node record.js frames 1920 1080 30 12`。起止帧可以拆成几段并行渲染。
运镜在 `record.js` 的 `cam()` 里，改起止的方位角、仰角、距离即可。

## 可调的地方（index.html 内）

| 位置 | 作用 |
| --- | --- |
| `RN` | 雨滴数量 |
| `WIND` | 雨的横向风速 |
| `scene.fog` | 雨雾浓度 |
| `UnrealBloomPass(…, .7, .55, .9)` | 辉光强度 / 半径 / 阈值 |
| `PointLight(warm, …)` | 店内暖光 |
| `lampLight` | 路灯冷光 |
| `doorT = 9 + Math.random() * 10` | 自动门开启间隔 |
| `PUDDLES` | 积水坑的位置和大小 |
| 系统「减少动态效果」 | 自动放慢降雨、关闭招牌闪烁 |
