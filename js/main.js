// ============================================================
// 装配 v2：资产加载 / 输入 / 主循环 / 音效 / 教程 / 标题页
// ============================================================
import { CONFIG, ITEMS, RECIPES } from './data.js';
import { Game } from './systems.js';
import { Renderer } from './render.js';
import { UI } from './ui.js';
import { moveEntity, playerAttack, bestTool, dist } from './entities.js';
import { loadAssets } from './assets.js';
import { bgm } from './bgm.js';

window.__bgmOn = true;
window.__bgmToggle = () => {
  const on = bgm.toggle();
  window.__bgmOn = on;
  ui.toast(on ? '🎵 音乐已开启' : '音乐已关闭');
  if (on && G) updateBGM();
};
function updateBGM() {
  if (!G || !window.__bgmOn) return;
  const boss = G.entities.some(e => e.boss && !e.dead);
  if (boss) bgm.play('boss');
  else if (G.darkness > .25) bgm.play('night');
  else bgm.play('day');
}

// ---------------- 音效（WebAudio 轻量合成） ----------------
class Sfx {
  constructor() { this.ctx = null; }
  ensure() { if (!this.ctx) try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } return this.ctx; }
  beep(freq, dur, type = 'square', vol = .12, slide = 0) {
    const c = this.ensure(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), c.currentTime + dur);
    g.gain.value = vol; g.gain.exponentialRampToValueAtTime(.001, c.currentTime + dur);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur);
  }
  noise(dur = .15, vol = .1, hp = 800) {
    const c = this.ensure(); if (!c) return;
    const n = c.sampleRate * dur, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(c.destination); src.start();
  }
  play(name) {
    switch (name) {
      case 'chop': this.noise(.1, .14, 400); this.beep(120, .08, 'triangle', .1); break;
      case 'mine': this.noise(.08, .16, 1200); this.beep(700, .05, 'square', .06, -300); break;
      case 'dig': this.noise(.12, .12, 300); break;
      case 'swing': this.noise(.06, .06, 2000); break;
      case 'hit': this.beep(200, .09, 'square', .12, -80); this.noise(.05, .08, 1500); break;
      case 'hurt': this.beep(160, .18, 'sawtooth', .14, -60); break;
      case 'pick': this.beep(660, .07, 'sine', .1); this.beep(880, .07, 'sine', .08); break;
      case 'coin': this.beep(988, .06, 'square', .08); this.beep(1319, .1, 'square', .08); break;
      case 'build': this.beep(330, .07, 'square', .1); this.beep(440, .09, 'square', .1); this.noise(.1, .08, 500); break;
      case 'craft': this.beep(520, .08, 'triangle', .1); this.beep(780, .1, 'triangle', .1); break;
      case 'level': [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.beep(f, .12, 'square', .1), i * 90)); break;
      case 'quest': [659, 880].forEach((f, i) => setTimeout(() => this.beep(f, .14, 'triangle', .12), i * 110)); break;
      case 'join': [440, 554, 659].forEach((f, i) => setTimeout(() => this.beep(f, .1, 'sine', .1), i * 80)); break;
      case 'roar': this.beep(90, .5, 'sawtooth', .16, -40); this.noise(.4, .1, 200); break;
      case 'boom': this.noise(.4, .2, 150); this.beep(70, .3, 'sine', .2, -30); break;
      case 'shoot': this.noise(.05, .07, 2500); break;
      case 'door': this.beep(220, .12, 'triangle', .1, 40); break;
      case 'eat': this.beep(300, .08, 'sine', .1, 80); setTimeout(() => this.beep(260, .08, 'sine', .1, 60), 90); break;
      case 'drink': this.beep(500, .1, 'sine', .08, 200); break;
      case 'plant': this.beep(392, .08, 'sine', .1); break;
      case 'catch': this.beep(740, .08, 'square', .1); this.beep(988, .12, 'square', .1); break;
      case 'bite': this.beep(1200, .06, 'square', .12); break;
      case 'cast': this.noise(.15, .08, 1000); this.beep(600, .15, 'sine', .06, -200); break;
      case 'sleep': [523, 392, 330, 262].forEach((f, i) => setTimeout(() => this.beep(f, .2, 'sine', .08), i * 160)); break;
      case 'cook': this.beep(350, .1, 'triangle', .08, 60); break;
      case 'thunder': this.noise(.6, .22, 100); break;
      case 'equip': this.beep(440, .06, 'square', .08); break;
      case 'chest': [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this.beep(f, .1, 'square', .09), i * 70)); break;
      case 'combo': [784, 988, 1175].forEach((f, i) => setTimeout(() => this.beep(f, .09, 'square', .1), i * 60)); break;
      default: this.beep(440, .06, 'square', .06);
    }
  }
}

// ---------------- 启动 ----------------
const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const ui = new UI(null, renderer);
window.__ui = ui;
const sfx = new Sfx();
let G = null;

function newGame(seed) {
  G = new Game(seed ?? (Date.now() & 0xffff));
  wire();
  startLoop();
  ui.startTutorial();
  camIntro = 2.2; renderer.zoom = 1.7; // 开场运镜：从高空缓缓拉近
}
function continueGame() {
  const d = Game.load();
  if (!d) return newGame();
  G = new Game(d.seed);
  G.applySave(d);
  wire();
  startLoop();
  // 离线收益结算
  const off = G.claimOffline();
  if (off && off.got.length) {
    ui.toast(`💤 离线 ${off.mins >= 60 ? Math.floor(off.mins / 60) + '小时' + off.mins % 60 + '分' : off.mins + '分钟'}，${off.settlers} 位居民帮你收获了：${off.got.join('、')}（已存入小镇仓库）`);
  }
  ui.toast(`欢迎回来！第 ${G.day} 天`);
}
function wire() {
  ui.G = G;
  window.__G = G;
  G.toastFn = m => ui.toast(m);
  G.sfxFn = n => sfx.play(n);
  G.openPanel = n => ui.openPanel(n);
  G.openStation = st => { ui.craftTab = st; ui.openPanel('craft'); };
  renderer.cam.x = G.player.x; renderer.cam.z = G.player.z;
}

// ---------------- 输入 ----------------
const keys = {};
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  keys[e.key.toLowerCase()] = true;
  const k = e.key.toLowerCase();
  if (!G) return;
  if (k === 'e') G.interactPress = true;
  if (k === 'f') G.fishingPull();
  if (k === 'h') G.homeTp();
  if (k === 'j' || k === ' ') { e.preventDefault(); playerAttack(G, G.player); }
  if (k === 'b') ui.openPanel('build');
  if (k === 'i') ui.openPanel('inventory');
  if (k === 'c') ui.openPanel('craft');
  if (k === 'q') ui.openPanel('quests');
  if (k === 'm') { ui.openPanel('map'); requestAnimationFrame(() => ui.renderBigMap()); }
  if (k === 'escape') { if (ui.buildSel || ui.dismantleMode) ui.cancelBuild(); else ui.closePanel(); }
  if (/^[1-8]$/.test(k)) ui.selectSlot(+k - 1);
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

let pointerPos = null;
canvas.addEventListener('pointermove', e => { pointerPos = { x: e.offsetX, y: e.offsetY }; });
canvas.addEventListener('pointerdown', e => {
  if (!G) return;
  pointerPos = { x: e.offsetX, y: e.offsetY };
  const wpos = screenToWorld(e.offsetX, e.offsetY);
  const tx = Math.floor(wpos.x), tz = Math.floor(wpos.z);
  if (ui.dismantleMode) {
    const b = G.buildingAt(tx, tz);
    if (b) G.dismantle(b);
    return;
  }
  if (ui.buildSel) {
    if (G.placeBuilding(ui.buildSel, tx, tz)) {
      if (!G.canAfford(ui.buildSel)) ui.cancelBuild();
    } else G.toast('无法放置到这里');
    return;
  }
  let hitM = null;
  for (const m of G.entities) if (m.kind === 'monster' && Math.hypot(m.x - wpos.x, m.z - wpos.z) < 1.3) { hitM = m; break; }
  if (hitM) {
    const p = G.player;
    p.dir = Math.abs(hitM.x - p.x) > Math.abs(hitM.z - p.z) * 2 ? (hitM.x > p.x ? 2 : 1) : (hitM.z > p.z ? 0 : 3);
    playerAttack(G, p);
  } else {
    const t = G.interactTarget();
    if (t && Math.hypot(t.x - wpos.x, t.z - wpos.z) < 2.5) G.interactPress = true;
  }
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  renderer.zoom = Math.max(.55, Math.min(1.6, renderer.zoom * (e.deltaY < 0 ? 1.12 : .9)));
}, { passive: false });

function screenToWorld(px, py) {
  const c = renderer.screenCenter();
  const z = renderer.zoom * renderer.dpr;
  const camP = { x: (renderer.cam.x - renderer.cam.z) * 32, y: (renderer.cam.x + renderer.cam.z) * 16 };
  const sx = (px * renderer.dpr - c.x) / z + camP.x;
  const sy = (py * renderer.dpr - c.y) / z + camP.y;
  return { x: sx / 64 + sy / 32, z: sy / 32 - sx / 64 };
}

// ---------------- 主循环 ----------------
let lastT = 0, started = false, camIntro = 0, bgmT = 0;
function startLoop() {
  if (started) return; started = true;
  lastT = performance.now();
  requestAnimationFrame(tick);
}
let targT = 0, movedDist = 0, lastPX = 0, lastPZ = 0;
function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(.05, (now - lastT) / 1000);
  lastT = now;
  if (!G) return;
  const p = G.player;
  let mx = 0, mz = 0;
  if (keys['w'] || keys['arrowup']) mz -= 1;
  if (keys['s'] || keys['arrowdown']) mz += 1;
  if (keys['a'] || keys['arrowleft']) mx -= 1;
  if (keys['d'] || keys['arrowright']) mx += 1;
  if (G.joy) { mx = G.joy.x; mz = G.joy.y; }
  if ((mx || mz) && !p.dead) {
    if (p.fishing) p.fishing = null;
    moveEntity(G, p, mx, mz, dt);
    movedDist += Math.hypot(p.x - lastPX, p.z - lastPZ);
  } else p.moving = false;
  lastPX = p.x; lastPZ = p.z;
  G.movedDist = movedDist;
  if (G.attackHold) playerAttack(G, p);
  // 自动攻击（设置开启 + 附近有怪 + 玩家未在移动）
  if (G.settings.autoAtk && !p.moving && p.atkCd <= 0 && !p.dead) {
    let tgt = null, bd = 2.2;
    for (const m of G.entities) if (m.kind === 'monster' && !MON_PASSIVE(m)) { const d = dist(m, p); if (d < bd) { bd = d; tgt = m; } }
    if (tgt) {
      p.dir = Math.abs(tgt.x - p.x) > Math.abs(tgt.z - p.z) * 2 ? (tgt.x > p.x ? 2 : 1) : (tgt.z > p.z ? 0 : 3);
      playerAttack(G, p);
    }
  }
  if (G.interactPress) { G.interactPress = false; G.interact(); }
  // 长按互动连发（手机✋/键盘E按住）
  if (G.interactHold || keys['e']) {
    G.interactHoldT = (G.interactHoldT || 0) - dt;
    if (G.interactHoldT <= 0) { G.interactHoldT = .3; G.interact(); }
  } else G.interactHoldT = 0;
  targT -= dt;
  if (targT <= 0) { targT = .15; G.target = G.interactTarget(); }
  if (ui.buildSel) {
    const base = pointerPos ? screenToWorld(pointerPos.x, pointerPos.y) : p;
    let tx = Math.floor(base.x), tz = Math.floor(base.z);
    if (!pointerPos) {
      const dirs = [[0, 1], [-1, 0], [1, 0], [0, -1]];
      tx = Math.floor(p.x + dirs[p.dir][0] * 1.5); tz = Math.floor(p.z + dirs[p.dir][1] * 1.5);
    }
    G.ghost = { id: ui.buildSel, x: tx, z: tz, ok: G.canPlace(ui.buildSel, tx, tz) };
  } else G.ghost = null;
  // 教程指引
  if (ui.tutorial) ui.updateTutorial(dt);
  G.update(dt);
  // Boss 出场震屏
  const boss = G.entities.find(e => e.boss);
  if (boss && !G._bossSeen) { G._bossSeen = true; renderer.shake = 1; }
  if (!boss) G._bossSeen = false;
  // 玩家受击轻微震屏
  if (p.hitT > .15 && !G._hurtShake) { G._hurtShake = true; renderer.shake = Math.max(renderer.shake, .25); }
  if (p.hitT <= 0) G._hurtShake = false;
  // 开场运镜
  if (camIntro > 0) {
    camIntro -= dt;
    const k = Math.max(0, camIntro / 2.2);
    renderer.zoom = 1 + k * .7;
    if (camIntro <= 0) renderer.zoom = 1;
  }
  // BGM 状态切换（节流）
  bgmT -= dt;
  if (bgmT <= 0) { bgmT = 1; updateBGM(); }
  renderer.cam.x += (p.x - renderer.cam.x) * Math.min(1, dt * 6);
  renderer.cam.z += (p.z - renderer.cam.z) * Math.min(1, dt * 6);
  renderer.render(G);
  ui.update(dt);
  if (ui.activePanel === 'map') ui.renderBigMap();
}
function MON_PASSIVE(m) { return m.type === 'rabbit_mob'; }

// ---------------- 标题页 ----------------
function showTitle() {
  const params = new URLSearchParams(location.search);
  if (params.get('auto')) { document.getElementById('title').style.display = 'none'; newGame(); return; }
  if (params.get('test')) { document.getElementById('title').style.display = 'none'; newGame(params.get('seed') ? +params.get('seed') : undefined); runSmokeTest(params.get('test')); return; }
  const hasSave = !!Game.load();
  const el = document.getElementById('title');
  el.style.display = '';
  el.innerHTML = `<div class="title-card">
    <h1>星火小镇</h1>
    <p class="sub">荒谷拓荒记 · 2.5D 开放世界生存经营</p>
    <div class="title-feats">🌲 六大生态区 · 🏛️ 经营建镇 · ⚔️ 怪物夜袭<br>🌾 四季农牧 · 🎣 钓鱼 · 👹 四大Boss · 📜 任务成就图鉴<br>✨ 全新手绘卡通画面 · 新手引导手把手教学</div>
    ${hasSave ? `<button id="btn-continue">▶ 继续拓荒</button><button id="btn-new" class="ghost-btn">🌱 新的开始</button>`
      : `<button id="btn-start">🔥 点燃篝火，开始拓荒</button>`}
  </div>`;
  const start = () => { el.style.display = 'none'; sfx.ensure(); bgm.ensure(); if (bgm.ctx && bgm.ctx.state === 'suspended') bgm.ctx.resume(); newGame(); };
  const cont = () => { el.style.display = 'none'; sfx.ensure(); bgm.ensure(); if (bgm.ctx && bgm.ctx.state === 'suspended') bgm.ctx.resume(); continueGame(); };
  document.getElementById(hasSave ? 'btn-continue' : 'btn-start').onclick = hasSave ? cont : start;
  if (hasSave) document.getElementById('btn-new').onclick = () => {
    if (confirm('开始新游戏会覆盖现有存档，确定？')) { localStorage.removeItem(CONFIG.SAVE_KEY); el.style.display = 'none'; sfx.ensure(); newGame(); }
  };
}

// ---------------- 冒烟测试钩子 ----------------
function runSmokeTest(mode) {
  const results = { errors: [], steps: [] };
  window.__smoke = results;
  const step = (name, fn) => {
    try { fn(); results.steps.push('✅ ' + name); }
    catch (e) { results.steps.push('❌ ' + name + ': ' + e.message); results.errors.push(name + ': ' + (e.stack || e.message)); }
  };
  window.addEventListener('error', e => results.errors.push('全局: ' + e.message));
  if (mode === 'panels') {
    let n = 0;
    const tickN = setInterval(() => {
      n++;
      if (n === 10) {
        for (const p of ['inventory', 'craft', 'build', 'quests', 'town', 'codex', 'ach', 'map', 'settings', 'trade']) {
          step('打开面板 ' + p, () => { ui.openPanel(p); if (p === 'map') ui.renderBigMap(); });
        }
        step('关闭面板', () => ui.closePanel());
        clearInterval(tickN);
      }
    }, 100);
  }
  if (mode === 'play') {
    setTimeout(() => {
      step('给予材料', () => { G.give('wood', 20); G.give('stone', 20); G.give('fiber', 10); });
      step('合成木斧', () => { if (!G.craft(RECIPES.find(r => r.out[0] === 'axe_wood'))) throw new Error('craft fail'); });
      step('放置篝火', () => { if (!G.placeBuilding('campfire', Math.floor(G.player.x) + 2, Math.floor(G.player.z))) throw new Error('place fail'); });
      step('装备武器', () => G.equip('stick'));
      step('夜袭', () => { G.day = 4; G.town.raidTonight = false; G.startRaid(); });
      step('存档', () => G.save(true));
      step('读档回路', () => { const d = JSON.parse(localStorage.getItem(CONFIG.SAVE_KEY)); if (!d) throw new Error('no save'); });
      step('回城', () => { G.homeCd = 0; G.homeTp(); });
    }, 1400);
  }
  setTimeout(() => {
    document.title = 'SMOKE ' + JSON.stringify({ s: results.steps, e: results.errors });
  }, 3800);
}

// ---------------- 资产加载 → 标题 ----------------
async function boot() {
  const bar = document.querySelector('#load-bar i');
  const txt = document.getElementById('load-txt');
  let ids = [];
  try {
    const r = await fetch('assets/spr/list.json');
    ids = await r.json();
  } catch (e) { console.warn('资产清单缺失，使用程序化绘制'); }
  await loadAssets(ids, (done, total) => {
    const pct = Math.round(done / total * 100);
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = `正在唤醒荒谷居民… ${pct}%`;
  });
  const loading = document.getElementById('loading');
  loading.style.opacity = '0';
  setTimeout(() => loading.style.display = 'none', 500);
  showTitle();
}

window.addEventListener('resize', () => renderer.resize());
document.addEventListener('visibilitychange', () => { if (document.hidden && G) G.save(true); });
window.addEventListener('beforeunload', () => { if (G) G.save(true); });

ui.init();
boot();
