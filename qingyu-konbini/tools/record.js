// 逐帧离线渲染晴雨便利店（时间由脚本接管，成片帧率与机器性能无关），输出 PNG 序列。
// 用法: node record.js [输出目录=frames] [宽=1280] [高=720] [fps=30] [秒数=12] [起始帧] [结束帧]
// 若 offline/character.vrm 存在，会自动加载这个角色；否则使用默认角色。
// 镜头与角色动作：角色沿人行道走到店门口，转身推门进店，镜头从侧前方跟随，最后隔着玻璃看她进店。
const http = require('http');
const fs = require('fs');
const path = require('path');
let pw; try { pw = require('playwright'); } catch (_) { pw = require('playwright-core'); }

const a = process.argv.slice(2);
const outDir = path.resolve(a[0] || 'frames');
const W = +(a[1] || 1280), H = +(a[2] || 720), FPS = +(a[3] || 30), DUR = +(a[4] || 12);
const N = Math.round(FPS * DUR);
const S = a[5] !== undefined ? +a[5] : 0, E = a[6] !== undefined ? +a[6] : N;
const ROOT = path.resolve(__dirname, '../offline');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.vrm': 'model/gltf-binary', '.glb': 'model/gltf-binary' };

// 每帧在页面里执行：驱动角色走位 + 摆放镜头
function direct({ f, dt, render }) {
  const G = window.__game, P = G.player, cam = window.__cam.camera;
  if (f === 0) { P.pos.set(-6.6, 0, 3.3); P.heading = Math.PI / 2; P.umb = 1; }
  for (const k in G.keys) G.keys[k] = false;
  if (P.pos.z > -1.6) {
    G.keys.KeyW = true;
    G.cam.theta = P.pos.x < 0.62 ? -Math.PI / 2 : 0;   // 先沿人行道向东，到门前转向店内
  }
  const u = f / Math.max(1, window.__N - 1), e = u * u * (3 - 2 * u);
  const th = 0.95 - 0.8 * e, ph = 1.22 + 0.06 * e, d = 6.2 - 1.6 * e;
  const tx = P.pos.x, ty = 1.15, tz = P.pos.z;
  cam.position.set(tx + d * Math.sin(ph) * Math.sin(th), ty + d * Math.cos(ph), tz + d * Math.sin(ph) * Math.cos(th));
  cam.lookAt(tx, ty, tz);
  window.__skip = !render; window.__step(dt);
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const server = http.createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(data);
    });
  }).listen(0, '127.0.0.1');
  await new Promise(r => server.once('listening', r));
  const url = `http://127.0.0.1:${server.address().port}/record.html`;

  const args = ['--ignore-gpu-blocklist', '--no-proxy-server'].concat((process.env.EXTRA_ARGS || '').split(' ').filter(Boolean));
  const b = await pw.chromium.launch({ args, executablePath: process.env.CHROMIUM_PATH || undefined });
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.log('页面错误: ' + e.message));
  await p.goto(url);
  await p.waitForFunction(() => window.__ready && window.__ready() && window.__game, null, { timeout: 60000, polling: 300 });
  const hasVRM = fs.existsSync(path.join(ROOT, 'character.vrm'));
  if (hasVRM) await p.waitForFunction(() => window.__game.player.rig && window.__game.player.rig.isVRM, null, { timeout: 120000, polling: 300 });
  console.log(hasVRM ? '已加载 character.vrm' : '未找到 character.vrm，使用默认角色');
  await p.evaluate(n => { window.__N = n; }, N);

  const dt = 1000 / FPS;
  for (let i = 0; i < 90; i++) await p.evaluate(() => { window.__skip = true; window.__step(1000 / 30); });  // 预热，让雨和涟漪进入稳定状态
  for (let f = 0; f < S; f++) await p.evaluate(direct, { f, dt, render: false });
  const t0 = Date.now();
  for (let f = S; f < E; f++) {
    await p.evaluate(direct, { f, dt, render: true });
    await p.screenshot({ path: path.join(outDir, `f${String(f).padStart(4, '0')}.png`), timeout: 120000 });
    if (f % 30 === 0) console.log(`帧 ${f}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await b.close(); server.close();
  console.log(`完成：${E - S} 帧 → ${outDir}`);
})();
