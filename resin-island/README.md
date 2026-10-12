# 树脂块微缩岛屿 · Resin Island

全屏 WebGL 交互场景：一块圆角透明树脂里装着悬崖、沙滩和青绿海水。整块像果冻一样跟着鼠标晃，水面随鼠标起浪。所有 3D 内容程序化生成，不加载任何模型文件；环境光只用 drei 的 `Environment` 预设。

```bash
npm install
npm run dev      # 开发
npm run build    # tsc 类型检查 + 生产构建
npm run preview  # 预览构建产物
```

交互：移动鼠标 → 果冻晃动；在水面划过 → 涟漪尾迹；点击水面 → 溅起一个果冻状水包。手机上用手指拖动，右上角「调参」按钮切换面板。

## 技术栈

Vite · React 19 · TypeScript · three r186 · @react-three/fiber 9 · @react-three/drei 10 · @react-three/postprocessing 3 · leva

## 目录

```
src/
  App.tsx                 Canvas、自动降级（PerformanceMonitor）、leva、页面文字
  controls.ts             leva 面板（水色 / 浪高 / 涟漪 / 潮位 / 焦散 / 太阳 / 环境 / 果冻软硬 / 景深）
  quality.ts              设备检测与三档画质：BuildSettings（首屏定）+ RenderSettings（运行时升降）
  hooks/
    useHeightfield.ts     GPU 高度场水面模拟（乒乓 RT，固定 60Hz 步长）
    useJelly.ts           果冻弹簧：剪切矩阵，块底固定、顶部晃得最多
  lib/
    noise.ts              种子随机数、simplex、fbm、ridged
    block.ts              树脂块尺寸、圆角矩形 SDF
    terrainField.ts       纯数据：海床+岛屿高度函数、礁石与植被散布（不依赖 three）
    geometry.ts           程序化几何：地形/裙边/高度图/开口外壳/岩石/树/灌木
    shaders.ts            共享 uniform、GLSL 片段（焦散、噪声）、材质注入
  scene/
    Experience.tsx        场景装配 + 共享 uniform 同步
    ResinShell.tsx        MeshTransmissionMaterial 树脂外壳
    Terrain.tsx           海床+岛屿（高度/坡度分层着色，水下焦散）
    Rocks.tsx             实例化花岗岩礁石（水下长苔藻）
    Vegetation.tsx        实例化松树与灌木（风摆）
    WaterSurface.tsx      动态水面材质 + 鼠标交互 + 晃荡耦合
    Lighting.tsx          太阳、天光、Environment 预设（失败时退回 Lightformer）、接触阴影
    Effects.tsx           景深、泛光、色调映射、暗角、颗粒
    CameraRig.tsx         长焦俯视相机，按宽高比自动取景
```

## 关键实现

**树脂块 = 海水。** 外壳是顶部开口的圆角盒（`buildShellGeometry`），侧壁和底面用 `MeshTransmissionMaterial`，`color` 取浅水色提亮、`attenuationColor` 取浅→深水色，透过侧壁能看到沙层剖面、苔藻大圆石和焦散。顶面由动态水面构成，因此不会出现“透射材质顶面 + 水面”双层折射。

**高度场水面（`useHeightfield`）。** 两张 HalfFloat RT 乒乓，r = 高度、g = 速度。每步：叠加鼠标水滴（批量 uniform 数组，单 pass）→ 邻域平均求加速度 → 叠加果冻晃荡力 → 阻尼 → 积分；陆地、礁石、块壁处清零形成反射边界。固定 60Hz 步长，掉帧时每帧最多追 3 步。空闲时随机落下极小水滴，保持自然微动。波速偏慢、阻尼偏大，涟漪厚重不碎，这就是“果冻水”的手感。

**水面着色（`WaterSurface`）。** 在 `MeshPhysicalMaterial` 上注入：顶点按高度场位移；片元逐像素用高度场差分求法线，再叠一层只扰动法线的细碎风浪；按水柱深度（来自地形 ∪ 礁石的高度图）做浅→青→深三段混色与不透明度；岸边与礁石周围的泡沫、波峰泡沫；浅水和波峰处的青绿“体内透光”；高光/菲涅尔处抬高不透明度，让反射在透明水面上依然清晰。环境反射、清漆高光、阴影都沿用内置实现。

**焦散。** 两层动态 Voronoi 的 F2−F1 亮线，沿太阳方向投射到水面，再用高度场梯度扰动位置、用拉普拉斯调制亮度——鼠标搅出的涟漪会在海底投下对应的光斑变化。低配只算一层。

**岛屿。** 同一张噪声高度场同时生成海床与岛屿：域扭曲的椭圆遮罩 + 平滑阶跃塑出陡崖、山丘叠 ridged 噪声出岩脊、定向坡道做一弯沙滩；靠近块壁处遮罩收拢，四周都是自然岩岸而不是被“切开”。顶点色按高度与坡度分层（水下沙、湿沙/干沙、岩石层理、植被地表）。植被在高处缓坡上拒绝采样 + 空间哈希散布。

**果冻晃动（`useJelly`）。** 给整组场景设置剪切矩阵 `x' = x + sx·y, z' = z + sz·y`，块底 y=0 固定、越高位移越大；外加由速度激发的轻微压扁/拉伸。剪切对所有材质（含透射材质）、阴影和射线拾取都自动成立。驱动方式：鼠标位置给一个轻微倾向目标，鼠标移动速度给冲量；刚度与阻尼由「果冻软硬」插值。弹簧加速度同时写入水面模拟，产生反向堆积和来回晃荡。

## 性能与自动降级

| | 流畅（手机起步） | 均衡 | 高清（桌面） |
|---|---|---|---|
| DPR | ≤1.25 | ≤1.5 | ≤2 |
| 模拟 / 高度图 | 128² | 192² | 256² |
| 透射采样 / 缓冲 | 3 / 256 | 5 / 512 | 8 / 1024 |
| 阴影 | 关 | 1024 | 2048 |
| 景深 / MSAA | 关 / 0 | 桌面开 / 2 | 开 / 4 |
| 着色器 | 单层焦散、简化风浪 | 完整 | 完整 |

- 几何精度（地形、礁石、植被数量、模拟分辨率）只按首屏设备决定一次；运行时 `PerformanceMonitor` 只升降渲染开销（DPR、透射采样、阴影、景深、MSAA），避免重建卡顿。目标：桌面 48–58 fps 区间、手机 28–50 fps 区间，越界即升/降一档。
- 透射缓冲、接触阴影、主画面每帧各 render 一次，默认会重绘 3 次阴影贴图；这里关掉 `shadowMap.autoUpdate`，每帧只更新一次。
- 接触阴影只渲染前 60 帧（块底不动）。
- 共享 uniform 是同一组对象引用，参数变化只改 `.value`，`useFrame` 里不做 setState。
- 调试：URL 加 `?tier=0|1|2` 可锁定画质档位。

## 说明

- `Environment` 预设 HDR 来自 drei 默认 CDN（raw.githack.com）。网络不可达时会自动退回到程序化 Lightformer 环境，场景照常显示。也可以在面板「光照 → 环境」里切换预设。
- 控制台里的 `THREE.Clock deprecated` 警告来自 R3F 内部，无害。
