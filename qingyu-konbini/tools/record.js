// 逐帧离线渲染晴雨便利店，输出 PNG 序列（时间由脚本接管，帧率与机器性能无关）
// 用法: node record.js [输出目录=frames] [宽=1280] [高=720] [fps=30] [秒数=12] [起始帧] [结束帧]
// 起始/结束帧可用于多进程分段并行渲染，例如 0 180 与 180 360。
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const a = process.argv.slice(2);
const outDir = path.resolve(a[0] || 'frames');
const W = +(a[1] || 1280), H = +(a[2] || 720), FPS = +(a[3] || 30), DUR = +(a[4] || 12);
const N = Math.round(FPS * DUR);
const S = a[5] !== undefined ? +a[5] : 0, E = a[6] !== undefined ? +a[6] : N;
const page = 'file://' + path.resolve(__dirname, '../offline/record.html');

// 运镜：先俯视全景，再缓慢下降并绕到店门前
function cam({ u, dt, render }) {
  const e = u < .12 ? 0 : (() => { const k = (u - .12) / .88; return k * k * (3 - 2 * k); })();
  const L = (a, b) => a + (b - a) * e, R = Math.PI / 180;
  const { camera, controls } = window.__cam;
  const tx = L(-1.2, -0.6), ty = L(2.2, 1.35), tz = L(-1.6, -2.6);
  const az = (L(44, 18) + Math.sin(u * Math.PI) * 2) * R, el = L(17, 8.5) * R, d = L(40, 15.5);
  controls.target.set(tx, ty, tz);
  camera.position.set(tx + d * Math.cos(el) * Math.sin(az), ty + d * Math.sin(el), tz + d * Math.cos(el) * Math.cos(az));
  camera.lookAt(tx, ty, tz);
  window.__skip = !render; window.__step(dt);
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ args: ['--allow-file-access-from-files', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('页面错误: ' + e.message));
  await p.goto(page);
  await p.waitForFunction(() => window.__ready && window.__ready() && window.__cam, null, { timeout: 60000 });
  const dt = 1000 / FPS;
  for (let i = 0; i < 90; i++) await p.evaluate(cam, { u: 0, dt, render: false });      // 预热 3 秒，让雨和涟漪进入稳定状态
  for (let f = 0; f < S; f++) await p.evaluate(cam, { u: f / (N - 1), dt, render: false }); // 快进到起始帧
  const t0 = Date.now();
  for (let f = S; f < E; f++) {
    await p.evaluate(cam, { u: f / (N - 1), dt, render: true });
    await p.screenshot({ path: path.join(outDir, `f${String(f).padStart(4, '0')}.png`) });
    if (f % 30 === 0) console.log(`帧 ${f}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await b.close();
  console.log(`完成：${E - S} 帧 → ${outDir}`);
})();
