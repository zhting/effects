# 晴雨便利店 · 雨夜街角

three.js（r128）微缩三维场景，三渲二卡通风格，可以用第三人称操控角色在场景里走动。
场景写在一个 HTML 文件里，不需要构建。

## 目录

```
index.html              在线版：从 CDN 加载 three.js 和 three-vrm
offline/index.html      离线版：所有脚本都在 offline/lib
offline/record.html     录制专用版：由 tools/record.js 接管时钟逐帧渲染
offline/lib/            three.js r128 + 扩展脚本、three-vrm 0.6.5（均为 MIT 许可）
tools/record.js         逐帧录制脚本（Playwright）
```

## 操作

| 操作 | 电脑 | 手机 / 平板 |
| --- | --- | --- |
| 移动 | W A S D 或方向键（相对镜头方向） | 屏幕左侧按住拖动，出现摇杆 |
| 跑步 | 按住 Shift | 摇杆推到底 |
| 转镜头 | 鼠标左键或右键拖动 | 屏幕右侧单指拖动 |
| 远近 | 滚轮（拉到最远可看到整个底座） | 双指捏合 |
| 换角色 | 把 .vrm 文件拖进页面，或按 L 选择文件 | 屏幕右侧长按约 0.7 秒后松开，选择文件 |

- 在雨里会撑开透明伞，走到雨棚下或进店会收伞。
- 走近店门自动门会打开，店员会点头；靠近小猫它会抬头看你，角色会笑。
- 选过的 VRM 会记在这台浏览器里，下次打开自动加载。

## 使用自己的 VRM 角色

支持 VRM 0.x（VRoid Studio 导出的格式）。三种方式任选：

1. **拖进页面**：最简单，模型只在你自己的浏览器里读取，不会上传。
2. **放在页面旁边**：把模型改名为 `character.vrm`，和 `index.html`（或 `offline/index.html`）放在同一目录，
   然后在该目录开一个本地服务器打开：`npx serve .` 或 `python3 -m http.server`，页面会自动加载它。
   （直接双击 HTML 时浏览器不允许读取本地文件，这种情况请用方式 1。）
3. **录视频时使用**：把 `character.vrm` 放进 `offline/`，录制脚本会自动加载。

注意模型自带的使用许可。例如 yuzuhako_Shuera 的许可是「禁止再分发」，
所以本压缩包不包含模型文件；分享页面或代码时也不要把模型一起附上。

## 录制视频

```bash
cd tools
npm install
npx playwright install chromium
npm run record      # 输出 frames/f0000.png …（12 秒 × 30fps）
npm run encode      # 需要本机已安装 ffmpeg，输出 qingyu-konbini.mp4
```

参数：`node record.js 输出目录 宽 高 fps 秒数 [起始帧 结束帧]`，例如 1080p：`node record.js frames 1920 1080 30 12`。
起止帧可以拆成几段并行渲染。角色走位和镜头在 `record.js` 的 `direct()` 里。
fps 请不要低于 20：场景每帧最多推进 0.05 秒，帧率太低会让动作变慢。

## 可调的地方（index.html 内）

| 位置 | 作用 |
| --- | --- |
| `RN` / `WIND` | 雨滴数量 / 风速 |
| `scene.fog` | 雨雾浓度 |
| `shopLights` 的 `PointLight(warm, .42, …)` | 店内暖光 |
| `bloom.strength` | 辉光（镜头进店时会自动减弱） |
| `player.pos` / `heading` | 角色出生位置和朝向 |
| `tgt = … 3.0 : 1.35` | 跑步 / 走路速度（米/秒） |
| `animateRig()` | 程序化走路动画：步幅、摆臂、撑伞姿势 |
| `RECTS` / `CIRCS` | 碰撞范围（货架、柜台、贩卖机等） |
| `cam.distT` | 第三人称镜头的默认距离 |
