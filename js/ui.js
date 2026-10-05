// ============================================================
// UI：HUD / 全套面板 / 触屏控件 / 商店 / 教程
// ============================================================
import { ITEMS, RECIPES, BUILDINGS, MONSTERS, ANIMALS, CROPS, ACHIEVEMENTS, SKILLS, SKILL_CATS, STATIONS, JOBS, MERCHANT, MAIN_QUESTS, SIDE_QUESTS, CONFIG, TOWN_LEVELS, PETS } from './data.js';
import { drawItemIcon } from './render.js';
import { countItem, playerDefense } from './entities.js';

const BADGE_SHOP = [
  ['book_skill', 8], ['bar_gold', 3], ['crystal', 4], ['potion_big', 3],
  ['ring_luck', 12], ['amulet_warm', 10], ['boots_spring', 11], ['map_treasure', 5],
];

const PHASE_CN = { dawn: '清晨', day: '白天', dusk: '黄昏', night: '夜晚' };
const WEATHER_CN = { sunny: '☀️ 晴', cloud: '⛅ 多云', rain: '🌧️ 雨', storm: '⛈️ 雷暴', fog: '🌫️ 雾', heat: '🔥 热浪', snow: '🌨️ 雪', blizzard: '❄️ 暴雪' };
const SEASONS = ['春', '夏', '秋', '冬'];
const CAT_CN = { base: '基础', prod: '生产', farm: '农牧', town: '城镇', def: '防御', deco: '装饰', special: '特殊' };

export class UI {
  constructor(G, renderer) {
    this.G = G; this.R = renderer;
    this.iconCache = new Map();
    this.activePanel = null;
    this.buildSel = null; this.dismantleMode = false;
    this.toastList = [];
    if (G) G.toastFn = m => this.toast(m);
  }

  iconURL(id) {
    if (this.iconCache.has(id)) return this.iconCache.get(id);
    const cv = document.createElement('canvas'); cv.width = 48; cv.height = 48;
    const ctx = cv.getContext('2d'); ctx.translate(24, 26);
    drawItemIcon(ctx, id, 34);
    const url = cv.toDataURL();
    this.iconCache.set(id, url);
    return url;
  }
  itemTag(id, n) {
    const it = ITEMS[id];
    return `<span class="itag"><img src="${this.iconURL(id)}" alt="">${it ? it.n : id}${n > 1 ? `×${n}` : ''}</span>`;
  }
  rarityColor(id) { return ''; }

  // ---------------- 初始化 DOM ----------------
  init() {
    document.getElementById('hud').innerHTML = `
      <div id="stats-card" class="card">
        <div class="avatar">🧑‍🌾</div>
        <div id="hud-pet" class="pet-ico" style="display:none">🐣</div>
        <div class="bars">
          <div class="lv-row"><b id="hud-lv">Lv.1</b><span id="hud-xp"></span></div>
          <div class="bar hp"><i id="bar-hp"></i><span id="txt-hp"></span></div>
          <div class="bar hunger"><i id="bar-hunger"></i></div>
          <div class="bar thirst"><i id="bar-thirst"></i></div>
          <div class="bar energy"><i id="bar-energy"></i></div>
          <div class="mini-row"><span id="hud-temp"></span><span id="hud-skillpts"></span></div>
        </div>
      </div>
      <div id="quest-tracker" class="card" onclick="window.__ui.openPanel('quests')"></div>
      <div id="hud-time" class="card"></div>
      <div id="hud-right">
        <div class="card row"><span id="hud-coins"></span><span id="hud-town"></span></div>
        <div class="row2">
          <button id="btn-home" class="chip-btn" title="回到小镇中心（H键，战斗中不可用）">🏠 回城</button>
        </div>
        <canvas id="minimap" width="120" height="120"></canvas>
        <div class="zoom-row"><button id="zoom-out">－</button><button id="zoom-in">＋</button></div>
      </div>
      <div id="boss-bar" class="card" style="display:none"></div>
      <div id="raid-banner"></div>
      <div id="toasts"></div>
      <div id="fishing-tip" class="card" style="display:none">🐟 <b id="fishing-state"></b></div>
      <div id="menu-bar"></div>
      <div id="hotbar"></div>
      <div id="mobile-ctl">
        <div id="joy"><div id="joy-knob"></div></div>
        <div id="act-buttons">
          <button id="btn-attack">⚔️<span>攻击</span></button>
          <button id="btn-interact">✋<span id="interact-label">互动</span></button>
          <button id="btn-fish" style="display:none">🎣<span>收杆</span></button>
        </div>
      </div>
      <div id="vignette"></div>
      <div id="panel-wrap" style="display:none"><div id="panel" class="card"></div></div>
      <div id="build-tip" class="card" style="display:none"></div>
      <div id="tutorial" style="display:none"></div>
    `;
    const menu = [['inventory', '🎒', '背包'], ['build', '🔨', '建造'], ['craft', '⚒️', '制作'], ['quests', '📜', '任务'], ['town', '🏛️', '小镇'], ['codex', '📖', '图鉴'], ['ach', '🏅', '成就'], ['map', '🗺️', '地图'], ['settings', '⚙️', '设置']];
    document.getElementById('menu-bar').innerHTML = menu.map(([id, ic, n]) => `<button data-p="${id}">${ic}<span>${n}</span></button>`).join('');
    document.getElementById('menu-bar').querySelectorAll('button').forEach(b => b.onclick = () => this.openPanel(b.dataset.p));
    document.getElementById('zoom-in').onclick = () => { this.R.zoom = Math.min(1.6, this.R.zoom * 1.2); };
    document.getElementById('zoom-out').onclick = () => { this.R.zoom = Math.max(.55, this.R.zoom / 1.2); };
    document.getElementById('btn-home').onclick = () => { if (this.G) this.G.homeTp(); };
    document.getElementById('minimap').onclick = () => { this.openPanel('map'); this.renderBigMap(); };
    // 触屏
    const btnA = document.getElementById('btn-attack');
    btnA.addEventListener('pointerdown', e => { e.preventDefault(); this.G.attackHold = true; });
    btnA.addEventListener('pointerup', () => this.G.attackHold = false);
    btnA.addEventListener('pointerleave', () => this.G.attackHold = false);
    document.getElementById('btn-interact').onclick = () => this.G.interactPress = true;
    document.getElementById('btn-fish').onclick = () => this.G.fishingPull();
    // 摇杆
    const joy = document.getElementById('joy'), knob = document.getElementById('joy-knob');
    const joyState = { active: false, cx: 0, cy: 0 };
    joy.addEventListener('pointerdown', e => {
      joyState.active = true; const r = joy.getBoundingClientRect();
      joyState.cx = r.left + r.width / 2; joyState.cy = r.top + r.height / 2;
      joy.setPointerCapture(e.pointerId); this.joyMove(e.clientX, e.clientY, joyState, knob, joy);
    });
    joy.addEventListener('pointermove', e => { if (joyState.active) this.joyMove(e.clientX, e.clientY, joyState, knob, joy); });
    const joyEnd = () => { joyState.active = false; this.G.joy = null; knob.style.transform = 'translate(-50%,-50%)'; };
    joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);
    this.joyState = joyState;
  }
  joyMove(x, y, st, knob, joy) {
    let dx = x - st.cx, dy = y - st.cy;
    const max = 42, len = Math.hypot(dx, dy);
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    this.G.joy = len > 8 ? { x: dx / max, y: dy / max } : null;
  }

  // ---------------- 新手引导 ----------------
  tutorial = null;
  tutStep = 0;
  TUT_STEPS = [
    { id: 'move', icon: '👣', n: '学会移动', tip: '用 <b>WASD/方向键</b> 或<b>左侧摇杆</b>四处走走，熟悉一下你的营地', done: G => (G.movedDist || 0) > 6 },
    { id: 'wood', icon: '🪵', n: '收集木头', tip: '走到一棵<b>树</b>旁边，按 <b>E</b> 或点 <b>✋互动键</b> 采集，收集 <b>8 块木头</b>', done: G => G.count('wood') + (G.stats.gather_wood || 0) >= 8 || (G.buildCounts.campfire || 0) > 0, arrow: 'tree' },
    { id: 'stone', icon: '🪨', n: '收集石头', tip: '找一块<b>岩石</b>采起来，收集 <b>5 块石头</b>（灰色的大石头）', done: G => G.count('stone') + (G.stats.gather_stone || 0) >= 5 || (G.buildCounts.campfire || 0) > 0, arrow: 'rock' },
    { id: 'campfire', icon: '🔥', n: '点燃篝火', tip: '点右侧 <b>🔨建造</b> 按钮 → 选<b>篝火</b> → 点击身边空地放置。<br>篝火能照明取暖，是小镇的起点！', done: G => (G.buildCounts.campfire || 0) >= 1, glow: 'build' },
    { id: 'tool', icon: '🪓', n: '制作工具', tip: '点 <b>⚒️制作</b> → 制作<b>木斧</b>和<b>木镐</b>（各需3木头2纤维，草丛可采纤维）', done: G => (G.stats.craft_axe_wood || 0) >= 1 && (G.stats.craft_pick_wood || 0) >= 1, glow: 'craft' },
    { id: 'eat', icon: '🍎', n: '吃点东西', tip: '采集<b>浆果丛</b>（紫色果子的灌木）获得浆果，在<b>🎒背包</b>里点击吃掉，别让自己饿着', done: G => (G.stats.eat || 0) >= 1, glow: 'inventory' },
    { id: 'night', icon: '🌙', n: '度过一夜', tip: '天黑后怪物会出没！手里拿好武器（木棍也行），靠近怪物按 <b>J/空格</b> 攻击。<br>生命危险时按 <b>🏠回城</b> 躲回营地！', done: G => G.day >= 2 || (G.stats.night_kills || 0) >= 1 },
    { id: 'farm', icon: '🌱', n: '开垦农田', tip: '建造<b>农田</b>后走近它按互动即可播种。收获的作物能做料理、招商人', done: G => (G.buildCounts.plot_farm || 0) >= 1, glow: 'build' },
    { id: 'recruit', icon: '🧑‍🤝‍🧑', n: '招募居民', tip: '跟着屏幕上的<b>指引箭头</b>去找地图上的幸存者营地，对话后带 TA 回小镇！', done: G => (G.stats.recruit || 0) >= 1, arrow: 'survivor' },
    { id: 'end', icon: '🏆', n: '交给你了！', tip: '基础都学会了！接下来跟着<b>左上角的主线任务</b>一路发展：<br>围墙防御 → 招贤纳士 → 箭塔守家 → 挑战四大Boss → 传奇小镇！', done: () => false, last: true },
  ];
  startTutorial() {
    const seen = localStorage.getItem('xh_tut_v2');
    if (seen) { this.tutorial = null; return; }
    this.tutorial = true; this.tutStep = 0;
    this.renderTutCard();
  }
  skipTutorial() {
    this.tutorial = null;
    localStorage.setItem('xh_tut_v2', '1');
    const el = document.getElementById('tutorial');
    if (el) el.style.display = 'none';
    if (this.G) { this.G.guideArrow = null; this.G._arrowByTut = false; }
    this.clearGlow();
    this.toast('📋 跟着左上角主线任务走即可，加油！');
  }
  clearGlow() {
    document.querySelectorAll('#menu-bar button').forEach(b => b.classList.remove('tut-glow'));
  }
  renderTutCard() {
    const step = this.TUT_STEPS[this.tutStep];
    if (!step) { this.skipTutorial(); return; }
    const el = document.getElementById('tutorial');
    el.style.display = '';
    el.innerHTML = `<div class="tut-card card">
      <div class="tut-step">新手引导 ${this.tutStep + 1}/${this.TUT_STEPS.length}</div>
      <b>${step.icon} ${step.n}</b>
      <p>${step.tip}</p>
      <div class="tut-actions">
        ${step.last ? `<button class="btn-jelly" id="tut-ok">开始拓荒！</button>`
        : `<button class="btn-jelly" id="tut-ok">知道了</button><button class="btn-jelly" id="tut-skip" style="background:linear-gradient(180deg,#EEF2F6,#D9E1E9);box-shadow:0 3px 0 #AAB6C2;color:#5C6470">跳过引导</button>`}
      </div>
    </div>`;
    document.getElementById('tut-ok').onclick = () => { this.dismissTutCard(); };
    const skip = document.getElementById('tut-skip');
    if (skip) skip.onclick = () => this.skipTutorial();
    // 高亮目标UI按钮
    this.clearGlow();
    if (step.glow) {
      const btn = document.querySelector(`#menu-bar button[data-p="${step.glow}"]`);
      if (btn) btn.classList.add('tut-glow');
    }
  }
  dismissTutCard() {
    const el = document.getElementById('tutorial');
    el.style.display = 'none';
    if (this.TUT_STEPS[this.tutStep]?.last) this.skipTutorial(); // 最后一步点按钮即结业
  }
  updateTutorial(dt) {
    if (!this.tutorial) return;
    const G = this.G;
    const step = this.TUT_STEPS[this.tutStep];
    if (!step) { this.skipTutorial(); return; }
    // 条件达成 → 下一步（最后一步由按钮结束）
    if (!step.last && step.done(G)) {
      this.tutStep++;
      G.sfx('quest');
      this.renderTutCard();
      return;
    }
    // 指引箭头（教程箭头优先于主线箭头）
    G._arrowByTut = true;
    G.guideArrow = null;
    if (step.arrow === 'tree' || step.arrow === 'rock') {
      const t = this.findNearestObj(step.arrow === 'tree' ? ['tree', 'tree_pine', 'tree_big', 'apple_tree'] : ['rock', 'rock_sand', 'ore_copper', 'ore_coal']);
      if (t) G.guideArrow = { x: t.x, z: t.z, label: step.arrow === 'tree' ? '树木 🪓' : '岩石 ⛏️' };
    }
    if (step.arrow === 'survivor') {
      const p = G.pois.find(x => x.type === 'survivor' && !x.rescued);
      if (p) G.guideArrow = { x: p.x + .5, z: p.z + .5, label: '幸存者 🧑' };
    }
  }
  findNearestObj(ids) {
    const G = this.G, p = G.player;
    let best = null, bd = 46;
    const tx = Math.floor(p.x), tz = Math.floor(p.z);
    for (let dz = -24; dz <= 24; dz += 1) for (let dx = -24; dx <= 24; dx += 1) {
      const x = tx + dx, z = tz + dz;
      if (!G.q.inBounds(x, z)) continue;
      const o = G.world.obj[z * G.world.W + x];
      if (o && ids.includes(o.id)) {
        const d = Math.hypot(x + .5 - p.x, z + .5 - p.z);
        if (d < bd) { bd = d; best = { x: x + .5, z: z + .5 }; }
      }
    }
    return best;
  }

  // ---------------- Toast ----------------
  toast(msg) {
    const box = document.getElementById('toasts'); if (!box) return;
    const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = msg;
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 3200);
  }

  // ---------------- HUD 刷新 ----------------
  hudT = 0;
  update(dt) {
    this.hudT -= dt;
    if (this.hudT > 0) return;
    this.hudT = .25;
    const G = this.G, p = G.player;
    const $ = id => document.getElementById(id);
    $('hud-lv').textContent = `Lv.${p.level}`;
    $('hud-xp').textContent = `${p.xp}/${xpNeedTxt(p.level)}`;
    $('bar-hp').style.width = (p.hp / p.maxHp * 100) + '%'; $('txt-hp').textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
    $('bar-hunger').style.width = p.hunger + '%';
    $('bar-thirst').style.width = p.thirst + '%';
    $('bar-energy').style.width = p.energy + '%';
    $('hud-temp').textContent = (p.temp < 5 ? '🥶' : p.temp > 38 ? '🥵' : '🌡️') + p.temp + '°';
    $('hud-skillpts').innerHTML = p.skillPts > 0 ? `<b class="sp">✦${p.skillPts}技能点</b>` : '';
    // 宠物跟宠显示
    const petEl = document.getElementById('hud-pet');
    if (petEl) {
      if (G.pet) { const pd = PETS[G.pet.type]; petEl.style.display = ''; petEl.title = `${pd.n}：${pd.d}`; }
      else petEl.style.display = 'none';
    }
    $('hud-coins').textContent = `🪙 ${p.coins}`;
    $('hud-town').textContent = `🏛️ ${G.town.lv}级·${G.settlerCount()}人`;
    const hour = Math.floor(((G.dayTime + .25) % 1) * 24), min = Math.floor((((G.dayTime + .25) % 1) * 24 % 1) * 60);
    $('hud-time').innerHTML = `<b>第 ${G.day} 天</b> · ${SEASONS[G.seasonIdx()]}季${G.seasonDay} <br> ${PHASE_CN[G.phase]} ${hour}:${String(min).padStart(2, '0')} ${WEATHER_CN[G.weather] || ''}`;
    // 任务追踪
    const mq = G.mainQuest();
    if (mq) {
      $('quest-tracker').innerHTML = `<div class="qt-title">📜 ${mq.n}</div>` + mq.goals.map(g => {
        const done = G.goalDone(g);
        return `<div class="${done ? 'done' : ''}">${done ? '✅' : '⬜'} ${goalText(g)}</div>`;
      }).join('');
    } else $('quest-tracker').innerHTML = `<div class="qt-title">🎉 主线全部完成</div>`;
    // Boss 血条
    const boss = G.entities.find(e => e.boss);
    if (boss) {
      $('boss-bar').style.display = '';
      $('boss-bar').innerHTML = `<div class="qt-title">👹 ${MONSTERS[boss.type].n}</div><div class="bar boss"><i style="width:${boss.hp / boss.maxHp * 100}%"></i></div>`;
    } else $('boss-bar').style.display = 'none';
    // 夜袭预告
    if (G.town.raidTonight && G.dayTime > .45 && G.dayTime < .6) $('raid-banner').textContent = `⚠️ 传闻今夜怪物将大举来袭，做好防御！`;
    else if (G.town.raidActive) $('raid-banner').textContent = `⚔️ 怪物袭击进行中！保卫小镇！`;
    else $('raid-banner').textContent = '';
    // 钓鱼提示
    const fish = p.fishing;
    if (fish) {
      $('fishing-tip').style.display = '';
      $('fishing-tip').className = 'card' + (fish.state === 'bite' ? ' bite' : '');
      $('fishing-state').textContent = fish.state === 'bite' ? '咬钩了！快点击收杆/按F！' : fish.state === 'miss' ? '跑掉了……' : '耐心等待……';
      document.getElementById('btn-fish').style.display = fish.state === 'bite' ? '' : 'none';
    } else { $('fishing-tip').style.display = 'none'; document.getElementById('btn-fish').style.display = 'none'; }
    // 互动按钮标签 + 高亮
    const label = G.target ? G.labelForTarget(G.target).split('（')[0] : '';
    const iBtn = document.getElementById('btn-interact');
    document.getElementById('interact-label').textContent = label || '互动';
    if (iBtn) iBtn.classList.toggle('pulse', !!G.target);
    // 回城按钮冷却
    const homeBtn = document.getElementById('btn-home');
    if (homeBtn) {
      homeBtn.classList.toggle('cd', G.homeCd > 0);
      homeBtn.textContent = G.homeCd > 0 ? `🏠 ${Math.ceil(G.homeCd)}s` : '🏠 回城';
    }
    // 菜单红点：任务可领 / 技能点
    const mq2 = G.mainQuest();
    const questReady = mq2 && G.questReady(mq2);
    const dailyReady = G.dailies.some(q => G.dailyProgress(q) >= q.goals[0].n);
    const sideReady = SIDE_QUESTS.some(q => G.questReady(q) && !G.claimedSides.includes(q.id));
    const dots = {
      quests: questReady || dailyReady || sideReady ? '!' : '',
      settings: p.skillPts > 0 ? '✦' : '',
    };
    document.querySelectorAll('#menu-bar button').forEach(b => {
      const d = dots[b.dataset.p] || '';
      let dotEl = b.querySelector('.dot');
      if (d && !dotEl) { dotEl = document.createElement('i'); dotEl.className = 'dot'; b.appendChild(dotEl); }
      if (dotEl) { if (d) { dotEl.style.display = ''; dotEl.textContent = d; } else dotEl.style.display = 'none'; }
    });
    // 小地图
    const mm = document.getElementById('minimap');
    if (mm) { this.R.mmDirty = this.R.mmDirty || G.time - (this._mmT || 0) > 1; if (G.time - (this._mmT || 0) > 1) { this._mmT = G.time; } this.R.renderMinimap(mm.getContext('2d'), 120, G); }
    // 快捷栏
    this.renderHotbar();
    // 活动面板刷新
    if (this.activePanel) this.refreshPanel();
    // 受伤红晕
    document.getElementById('vignette').style.opacity = p.hitT > 0 ? .5 : 0;
  }
  renderHotbar() {
    const p = this.G.player;
    const hb = document.getElementById('hotbar');
    let html = '';
    for (let i = 0; i < 8; i++) {
      const s = p.inv[i];
      html += `<div class="hslot" data-i="${i}">${s ? `<img src="${this.iconURL(s.id)}"><b>${s.n > 1 ? s.n : ''}</b>${i === this.selectedSlot ? '<i></i>' : ''}` : `<span>${i + 1}</span>`}</div>`;
    }
    hb.innerHTML = html;
    hb.querySelectorAll('.hslot').forEach(el => el.onclick = () => this.selectSlot(+el.dataset.i));
  }
  selectedSlot = 0;
  selectSlot(i) {
    const p = this.G.player;
    this.selectedSlot = i;
    const s = p.inv[i];
    if (!s) return;
    const it = ITEMS[s.id];
    if (it.wpn || it.arm) this.G.equip(s.id);
    else if (it.food) this.G.useItem(i);
    else if (it.tool?.kind === 'rod') this.G.startFishing();
    this.renderHotbar();
  }

  // ---------------- 面板 ----------------
  openPanel(name) {
    this.activePanel = name;
    document.getElementById('panel-wrap').style.display = '';
    this.refreshPanel();
  }
  closePanel() {
    this.activePanel = null;
    document.getElementById('panel-wrap').style.display = 'none';
  }
  refreshPanel() {
    if (!this.activePanel) return;
    const el = document.getElementById('panel');
    // 用户正在操作下拉框时避免重绘打断
    if (document.activeElement && document.activeElement.tagName === 'SELECT' && el.contains(document.activeElement)) return;
    const H = {
      inventory: () => this.htmlInventory(), craft: () => this.htmlCraft(), build: () => this.htmlBuild(),
      quests: () => this.htmlQuests(), town: () => this.htmlTown(), codex: () => this.htmlCodex(),
      ach: () => this.htmlAch(), map: () => this.htmlMap(), settings: () => this.htmlSettings(),
      trade: () => this.htmlTrade(), daily: () => this.htmlQuests('daily'),
    }[this.activePanel];
    if (H) { el.innerHTML = `<div class="panel-head"><b>${PANEL_TITLES[this.activePanel]}</b><button class="close" id="panel-close">✕</button></div><div class="panel-body">${H()}</div>`; }
    document.getElementById('panel-close').onclick = () => this.closePanel();
    this.bindPanel();
  }

  bindPanel() {
    const el = document.getElementById('panel');
    el.querySelectorAll('[data-act]').forEach(b => {
      b.onclick = () => {
        const act = b.dataset.act, a1 = b.dataset.a1, a2 = b.dataset.a2;
        const G = this.G;
        switch (act) {
          case 'use': G.useItem(+a1); break;
          case 'drop': { const s = G.player.inv[+a1]; if (s) { G.spawnDrop(G.player.x, G.player.z, s.id, s.n); G.take(s.id, s.n); } break; }
          case 'craft': { const r = RECIPES.find(x => x.id === a1); if (r) G.craft(r); break; }
          case 'build': this.selectBuild(a1); break;
          case 'dismantle': this.dismantleMode = !this.dismantleMode; this.buildSel = null; this.G.ghost = null; break;
          case 'claimmain': G.claimMain(); break;
          case 'claimside': { const q = SIDE_QUESTS.find(x => x.id === a1); if (q && G.questReady(q) && !G.claimedSides.includes(q.id)) { G.claimQuest(q); G.claimedSides.push(q.id); } break; }
          case 'claimdaily': { const q = G.dailies.find(x => x.uid === a1); if (q && G.dailyProgress(q) >= q.goals[0].n) { G.claimQuest(q); G.dailies = G.dailies.filter(x => x.uid !== a1); } break; }
          case 'skill': G.learnSkill(a1); break;
          case 'sell': G.sellItem(a1, +a2 || 1); break;
          case 'sellall': G.sellItem(a1, G.count(a1)); break;
          case 'buy': G.buyItem(a1, 1); break;
          case 'buy5': G.buyItem(a1, 5); break;
          case 'badgebuy': {
            const cost = +a2 || 0;
            if (G.count('essence_badge') >= cost && G.take('essence_badge', cost)) {
              G.give(a1, 1); G.sfx('chest'); G.toast(`🎖️ 兑换成功：${ITEMS[a1].n}`);
            } else G.toast('徽章不足');
            break;
          }
          case 'take': { const s = G.town.storage[+a1]; if (s && G.give(s.id, s.n)) G.town.storage[+a1] = null; break; }
          case 'takeall': { for (let i = 0; i < G.town.storage.length; i++) { const s = G.town.storage[i]; if (s && G.give(s.id, s.n)) G.town.storage[i] = null; } break; }
          case 'store': { const s = G.player.inv[+a1]; if (s && G.addStorage(s.id, s.n)) G.take(s.id, s.n); break; }
          case 'tab': this.craftTab = a1; this.buildTab = a1; this.codexTab = a1; this.questTab = a1; break;
          case 'unequip': G.player.equip[a1] = null; break;
          case 'wipe': if (confirm('确定删除存档并重新开始？')) { G.wipeSave(); location.reload(); } break;
          case 'export': { const data = localStorage.getItem(CONFIG.SAVE_KEY); navigator.clipboard?.writeText(data); prompt('存档已复制到剪贴板（也可手动复制）：', data); break; }
          case 'import': { const t = prompt('粘贴存档数据：'); if (t) { try { JSON.parse(t); localStorage.setItem(CONFIG.SAVE_KEY, t); location.reload(); } catch (e) { alert('存档数据无效'); } } break; }
          case 'save': G.save(); break;
          case 'sfx': G.settings.sfx = !G.settings.sfx; break;
          case 'bgm': {
            if (window.__bgmToggle) window.__bgmToggle();
            break;
          }
          case 'petfree': G.releasePet(); break;
          case 'autoatk': G.settings.autoAtk = !G.settings.autoAtk; G.toast(G.settings.autoAtk ? '⚔️ 自动攻击已开启（怪物靠近自动挥击）' : '自动攻击已关闭'); break;
          case 'dmgnum': G.settings.dmgNum = !G.settings.dmgNum; break;
          case 'tut': localStorage.removeItem('xh_tut_v2'); this.closePanel(); this.tutorial = true; this.tutStep = 0; this.renderTutCard(); break;
          case 'recruitw': { if (G.town.wandererWaiting && G.player.coins >= 80) { G.player.coins -= 80; G.town.wandererWaiting = false; G.addSettler(G.randomName()); } break; }
          case 'fishguide': break;
        }
        this.refreshPanel();
      };
    });
    el.querySelectorAll('select[data-job]').forEach(sel => {
      sel.onchange = () => {
        const npc = this.G.entities.find(e => e.kind === 'npc' && e.id == sel.dataset.job);
        if (npc) { npc.job = sel.value; this.toast(`${npc.name} 转职为 ${JOBS[sel.value].n}`); }
      };
    });
  }

  selectBuild(id) {
    this.buildSel = id; this.dismantleMode = false;
    this.closePanel();
    document.getElementById('build-tip').style.display = '';
    this.updateBuildTip();
  }
  updateBuildTip() {
    const tip = document.getElementById('build-tip');
    if (!this.buildSel && !this.dismantleMode) { tip.style.display = 'none'; this.G.ghost = null; return; }
    tip.style.display = '';
    tip.innerHTML = this.dismantleMode ? `🧨 拆除模式：点击建筑拆除（返还一半材料）<button onclick="window.__ui.cancelBuild()">取消</button>`
      : `🔨 建造 <b>${BUILDINGS[this.buildSel].n}</b>：点击地面放置 <button onclick="window.__ui.cancelBuild()">取消</button>`;
  }
  cancelBuild() { this.buildSel = null; this.dismantleMode = false; this.G.ghost = null; this.updateBuildTip(); }

  // ---------------- 各面板 HTML ----------------
  htmlInventory() {
    const G = this.G, p = G.player;
    let slots = '';
    for (let i = 0; i < 40; i++) {
      const s = p.inv[i];
      if (s) {
        const it = ITEMS[s.id];
        const eq = Object.values(p.equip).includes(s.id);
        slots += `<div class="slot ${eq ? 'eq' : ''}" title="${it.n}：${it.d}" data-act="use" data-a1="${i}"><img src="${this.iconURL(s.id)}"><b>${s.n > 1 ? s.n : ''}</b></div>`;
      } else slots += `<div class="slot empty"></div>`;
    }
    const eqRow = (slot, name) => {
      const id = p.equip[slot];
      return `<div class="eq-slot" title="${id ? ITEMS[id].d : ''}">${id ? `<img src="${this.iconURL(id)}" data-act="unequip" data-a1="${slot}"><b data-act="unequip" data-a1="${slot}">卸下</b>` : `<span>${name}</span>`}</div>`;
    };
    return `<div class="inv-wrap">
      <div class="equip-col">
        <div class="sec-title">装备</div>
        ${eqRow('head', '头部')}${eqRow('body', '身体')}${eqRow('feet', '脚部')}${eqRow('acc', '饰品')}${eqRow('hand', '武器')}
        <div class="sec-title">属性</div>
        <div class="stat-mini">防御 ${playerDefense(p)} · 体温调节 ${p.temp}°</div>
        <div class="sec-title">操作</div>
        <button data-act="store-all" style="display:none"></button>
      </div>
      <div class="inv-grid">${slots}</div>
    </div>
    <div class="hint">点击物品：食物吃下 / 装备穿上 · 已装备物品有金框 · 水壶在水边点击灌水</div>`;
  }
  craftTab = 'hand';
  htmlCraft() {
    const G = this.G;
    const stations = ['hand'];
    for (const b of G.buildings) { const d = BUILDINGS[b.id]; if (d.station && !stations.includes(d.station)) stations.push(d.station); }
    const tabs = stations.map(s => `<button class="tab ${this.craftTab === s ? 'on' : ''}" data-act="tab" data-a1="${s}">${STATIONS[s]}</button>`).join('');
    let rows = '';
    for (const r of RECIPES.filter(r => r.st === this.craftTab)) {
      const unlocked = G.recipeUnlocked(r);
      const can = G.canCraft(r);
      const mats = r.in.map(([id, n]) => `<span class="${G.count(id) >= n ? 'ok' : 'lack'}">${ITEMS[id].n}×${n}</span>`).join(' ');
      rows += `<div class="recipe-row ${unlocked ? '' : 'locked'}">
        <div class="r-ico"><img src="${this.iconURL(r.out[0])}"></div>
        <div class="r-main"><b>${ITEMS[r.out[0]].n}${r.out[1] > 1 ? '×' + r.out[1] : ''}</b><div class="mats">${mats}</div><div class="r-desc">${ITEMS[r.out[0]].d || ''}</div></div>
        ${unlocked ? `<button class="craft-btn ${can ? '' : 'dis'}" data-act="craft" data-a1="${r.id}">制作</button>` : '<span class="lock-tag">未解锁</span>'}
      </div>`;
    }
    return tabs + (stations.length === 1 ? '<div class="hint">建造工作台/熔炉等设施解锁更多配方</div>' : '') + rows;
  }
  buildTab = 'base';
  htmlBuild() {
    const G = this.G;
    const cats = ['base', 'prod', 'farm', 'town', 'def', 'deco', 'special'];
    const tabs = cats.map(c => `<button class="tab ${this.buildTab === c ? 'on' : ''}" data-act="tab" data-a1="${c}">${CAT_CN[c]}</button>`).join('');
    let rows = '';
    for (const [id, d] of Object.entries(BUILDINGS)) {
      if (d.cat !== this.buildTab) continue;
      const unlocked = G.buildingUnlocked(id);
      const afford = G.canAfford(id);
      const cost = G.buildCost(id).map(([i, n]) => `<span class="${G.count(i) >= n ? 'ok' : 'lack'}">${ITEMS[i].n}×${n}</span>`).join(' ');
      rows += `<div class="recipe-row ${unlocked ? '' : 'locked'}">
        <div class="r-ico bld-ico">${bldEmoji(id)}</div>
        <div class="r-main"><b>${d.n}</b><div class="mats">${cost}</div><div class="r-desc">${d.d}</div></div>
        ${unlocked ? `<button class="craft-btn ${afford ? '' : 'dis'}" data-act="build" data-a1="${id}">建造</button>` : '<span class="lock-tag">未解锁</span>'}
      </div>`;
    }
    return tabs + rows + `<button class="dismantle-btn ${this.dismantleMode ? 'on' : ''}" data-act="dismantle">🧨 拆除模式</button>`;
  }
  questTab = 'main';
  htmlQuests(tab) {
    const G = this.G;
    const t = tab || this.questTab;
    const tabs = `<div class="tabs-row">
      <button class="tab ${t === 'main' ? 'on' : ''}" data-act="tab" data-a1="main">主线</button>
      <button class="tab ${t === 'side' ? 'on' : ''}" data-act="tab" data-a1="side">支线</button>
      <button class="tab ${t === 'daily' ? 'on' : ''}" data-act="tab" data-a1="daily">日常</button></div>`;
    let body = '';
    if (t === 'main') {
      const mq = G.mainQuest();
      if (mq) {
        body += questCard(G, mq, true);
      } else body += `<div class="quest-done">🎉 主线全部完成！传奇故事仍在继续……</div>`;
      body += `<div class="quest-chain">主线进度：${G.mainIdx} / ${MAIN_QUESTS.length}</div>`;
    } else if (t === 'side') {
      for (const q of SIDE_QUESTS) {
        const claimed = G.claimedSides.includes(q.id);
        const ready = G.questReady(q);
        body += questCard(G, q, ready && !claimed, claimed);
      }
    } else {
      if (!G.dailies.length) body += `<div class="hint">建造<b>公告牌</b>后每天发布 3 个日常委托</div>`;
      for (const q of G.dailies) {
        const prog = G.dailyProgress(q);
        const ready = prog >= q.goals[0].n;
        body += `<div class="quest-card ${ready ? 'ready' : ''}">
          <b>${q.n}</b><div class="goals"><span>${goalText(q.goals[0])}（${prog}/${q.goals[0].n}）</span></div>
          <div class="reward">${rewardText(q.reward)}</div>
          ${ready ? `<button class="craft-btn" data-act="claimdaily" data-a1="${q.uid}">领取</button>` : ''}
        </div>`;
      }
    }
    return tabs + body;
  }
  htmlTown() {
    const G = this.G;
    const lv = G.town.lv;
    const next = TOWN_LEVELS[lv];
    let settlers = '';
    const npcs = G.entities.filter(e => e.kind === 'npc');
    for (const n of npcs) {
      settlers += `<div class="settler">
        <div class="s-face">${jobFace(n.job)}</div>
        <div class="s-info"><b>${n.name}</b><span>😊${Math.round(n.happiness)}</span></div>
        <select data-job="${n.id}">${Object.entries(JOBS).map(([k, v]) => `<option value="${k}" ${n.job === k ? 'selected' : ''}>${v.n}</option>`).join('')}</select>
      </div>`;
    }
    let storage = '';
    for (let i = 0; i < G.town.storage.length; i++) {
      const s = G.town.storage[i];
      storage += s ? `<div class="slot" data-act="take" data-a1="${i}" title="点击取回"><img src="${this.iconURL(s.id)}"><b>${s.n}</b></div>` : `<div class="slot empty"></div>`;
    }
    let ranch = '';
    for (const h of G.housedAnimals) ranch += `<span class="itag">${ANIMALS[h.type].n} 🏠</span>`;
    return `
      <div class="town-head">🏛️ 小镇等级 <b>${lv}</b> · 居民 <b>${G.settlerCount()}/${G.popCap()}</b> · 建设分 <b>${G.town.score || 0}</b>${next ? `（下一级需 居民${next.need[0]}+建设${next.need[1]}）` : '（满级）'}</div>
      ${G.town.wandererWaiting ? `<button class="craft-btn" data-act="recruitw">🚶 招募流浪者（80金币）</button>` : ''}
      <div class="sec-title">居民职业（选择岗位后自动开工）</div>
      <div class="settlers">${settlers || '<div class="hint">还没有居民 —— 去地图上寻找幸存者，或等待流浪者事件</div>'}</div>
      <div class="sec-title">小镇仓库 ${G.town.storage.filter(Boolean).length}/${G.storageCap()} <button class="mini-btn" data-act="takeall">全部取出</button></div>
      <div class="inv-grid small">${storage}</div>
      <div class="sec-title">牧场</div>
      <div>${ranch || '<span class="hint">用饲料引诱鸡/牛/羊，带回对应棚舍即可收养</span>'}</div>`;
  }
  htmlCodex() {
    const G = this.G;
    const tabs = `<div class="tabs-row">
      <button class="tab ${this.codexTab !== 'item' && this.codexTab !== 'fish' ? 'on' : ''}" data-act="tab" data-a1="mon">怪物 ${Object.keys(G.codex.monsters).length}/${Object.keys(MONSTERS).length}</button>
      <button class="tab ${this.codexTab === 'item' ? 'on' : ''}" data-act="tab" data-a1="item">物品 ${Object.keys(G.codex.items).length}</button>
      <button class="tab ${this.codexTab === 'fish' ? 'on' : ''}" data-act="tab" data-a1="fish">鱼类 ${Object.keys(G.codex.fish).length}/7</button></div>`;
    const tab = this.codexTab === 'item' ? 'item' : this.codexTab === 'fish' ? 'fish' : 'mon';
    let body = '';
    if (tab === 'mon') {
      for (const [id, m] of Object.entries(MONSTERS)) {
        const rec = G.codex.monsters[id];
        body += `<div class="codex-card ${rec ? '' : 'unknown'}">
          <b>${m.n}${m.boss ? ' 👑' : ''}</b>
          ${rec ? `<div class="codex-stats">生命${m.hp} 攻击${m.dmg} 速度${m.spd}${m.night ? ' 夜行' : ''}${m.poison ? ' 剧毒' : ''}${m.burn ? ' 灼烧' : ''}${m.slow ? ' 减速' : ''}</div>
          <div class="codex-drops">掉落：${m.drops.map(d => ITEMS[d[0]] ? ITEMS[d[0]].n + (d[3] < 1 ? `(${Math.round(d[3] * 100)}%)` : '') : '').filter(Boolean).join('、')}</div>
          <div class="codex-kills">击杀 ${rec.kills || 0}</div>`
            : '<div class="codex-unk">？？？（尚未遭遇）</div>'}
        </div>`;
      }
    } else if (tab === 'item') {
      let grid = '';
      for (const [id, it] of Object.entries(ITEMS)) {
        grid += `<div class="slot ${G.codex.items[id] ? '' : 'unknown'}" title="${G.codex.items[id] ? it.n + '：' + (it.d || '') : '未获得'}"><img src="${this.iconURL(id)}"></div>`;
      }
      body = `<div class="inv-grid small">${grid}</div>`;
    } else {
      for (const [id, it] of Object.entries(ITEMS)) {
        if (it.c !== 'fish') continue;
        body += `<div class="codex-card ${G.codex.fish[id] ? '' : 'unknown'}"><b>${it.n}</b><div>${G.codex.fish[id] ? (it.d || '鱼获') : '？？？'}</div></div>`;
      }
    }
    return tabs + body;
  }
  htmlAch() {
    const G = this.G;
    let out = '';
    for (const a of ACHIEVEMENTS) {
      const got = G.unlockedAch?.has(a.id);
      out += `<div class="ach-card ${got ? 'got' : ''}"><div class="ach-ico">${got ? '🏅' : '🔒'}</div><div><b>${a.n}</b><div class="r-desc">${a.desc}</div></div></div>`;
    }
    return `<div class="hint">已解锁 ${G.unlockedAch?.size || 0} / ${ACHIEVEMENTS.length} · 每个成就奖励10金币</div><div class="ach-grid">${out}</div>`;
  }
  htmlMap() {
    return `<div class="map-wrap"><canvas id="big-map" width="440" height="440"></canvas>
      <div class="map-legend"><span>🟣 祭坛</span><span>🟠 废墟</span><span>🟡 宝箱</span><span>⬜ 建筑</span><span>🔴 怪物</span></div></div>`;
  }
  htmlSettings() {
    const G = this.G;
    return `
      <div class="set-row">
        <button class="craft-btn" data-act="bgm">🎵 音乐：${window.__bgmOn !== false ? '开' : '关'}</button>
        <button class="craft-btn" data-act="sfx">🔔 音效：${G.settings.sfx ? '开' : '关'}</button>
        <button class="craft-btn" data-act="autoatk">⚔️ 自动攻击：${G.settings.autoAtk ? '开' : '关'}</button>
      </div>
      <div class="set-row">
        <button class="craft-btn" data-act="dmgnum">💥 伤害数字：${G.settings.dmgNum ? '开' : '关'}</button>
        <button class="craft-btn" data-act="save">💾 立即保存</button>
        ${G.pet ? '<button class="craft-btn danger" data-act="petfree">🕊️ 放生跟宠</button>' : ''}
      </div>
      <div class="set-row">
        <button class="craft-btn" data-act="export">📤 导出存档</button>
        <button class="craft-btn" data-act="import">📥 导入存档</button>
      </div>
      <div class="set-row">
        <button class="craft-btn danger" data-act="wipe">🗑️ 删除存档重开</button>
        <button class="craft-btn" data-act="tut">🎓 重新看新手引导</button>
      </div>
      <div class="help-block">
        <b>🎯 快速上手：</b>跟着左上角主线任务走。白天采集建造，天黑怪物出没注意战斗或回城躲避。<br>
        <b>⌨️ 键盘：</b>WASD移动 · J/空格攻击 · E互动采集 · F钓鱼收杆 · H回城 · B建造 · I背包 · C制作 · Q任务 · M地图 · 1-8快捷栏 · 滚轮缩放 · Esc关闭<br>
        <b>📱 触屏：</b>左摇杆移动 · ⚔️按住连击 · ✋互动采集钓鱼（有目标时按钮会发光）<br>
        <b>💡 进阶：</b>怪物靠近会自动攻击（可关）；击杀3只内连杀有金币奖励；肉 attracted 商队每3天来访；四季影响作物与温度；祭坛可召唤Boss
      </div>`;
  }
  htmlTrade() {
    const G = this.G;
    let badgeHtml = '';
    if (G.town.merchant) {
      badgeHtml = `<div class="sec-title">🎖️ Boss徽章兑换（持有 ${G.count('essence_badge')}）</div>`;
      for (const [id, cost] of BADGE_SHOP) {
        badgeHtml += `<div class="recipe-row"><div class="r-ico"><img src="${this.iconURL(id)}"></div>
          <div class="r-main"><b>${ITEMS[id].n}</b><div class="mats"><span class="${G.count('essence_badge') >= cost ? 'ok' : 'lack'}">🎖️×${cost}</span></div></div>
          <button class="craft-btn ${G.count('essence_badge') >= cost ? '' : 'dis'}" data-act="badgebuy" data-a1="${id}" data-a2="${cost}">兑换</button></div>`;
      }
    }
    if (!G.town.merchant) return `<div class="hint">商队不在镇上（每3天来访一次，日落离开）</div>` + badgeHtml;
    let buy = '';
    for (const [id, price] of MERCHANT.sell) {
      buy += `<div class="recipe-row"><div class="r-ico"><img src="${this.iconURL(id)}"></div>
        <div class="r-main"><b>${ITEMS[id].n}</b><div class="mats"><span class="lack">单价🪙${price}</span></div></div>
        <button class="craft-btn ${G.player.coins >= price ? '' : 'dis'}" data-act="buy" data-a1="${id}">买1</button>
        <button class="craft-btn ${G.player.coins >= price * 5 ? '' : 'dis'}" data-act="buy5" data-a1="${id}">买5</button></div>`;
    }
    // 出售：聚合背包
    const agg = {};
    for (const s of G.player.inv) if (s) agg[s.id] = (agg[s.id] || 0) + s.n;
    let sell = '';
    for (const [id, n] of Object.entries(agg)) {
      if (!ITEMS[id].p) continue;
      sell += `<div class="recipe-row"><div class="r-ico"><img src="${this.iconURL(id)}"></div>
        <div class="r-main"><b>${ITEMS[id].n}×${n}</b><div class="mats"><span class="ok">单价🪙${G.sellPrice(id)}</span></div></div>
        <button class="craft-btn" data-act="sell" data-a1="${id}" data-a2="1">卖1</button>
        <button class="craft-btn" data-act="sellall" data-a1="${id}">全卖</button></div>`;
    }
    return `<div class="sec-title">🛒 购买（金币 ${G.player.coins}）</div>${buy}<div class="sec-title">💰 出售</div>${sell || '<div class="hint">背包里没有可出售的物品</div>'}`;
  }

  // 大地图渲染（打开地图面板后调用）
  renderBigMap() {
    const cv = document.getElementById('big-map'); if (!cv) return;
    this.R.renderMinimap(cv.getContext('2d'), 440, this.G);
    const G = this.G, ctx = cv.getContext('2d'), sc = 440 / G.world.W;
    ctx.font = '11px "Microsoft YaHei"';
    for (const p of G.pois) {
      if (!p.discovered) continue;
      if (p.type === 'altar') { ctx.fillStyle = '#c86ae8'; ctx.fillText('祭坛', p.x * sc - 11, p.z * sc - 5); }
      if (p.type === 'ruin') { ctx.fillStyle = '#e8a13c'; ctx.fillText('废墟', p.x * sc - 11, p.z * sc - 5); }
      if (p.type === 'chest' && !p.opened) { ctx.fillStyle = '#b8930c'; ctx.fillText('宝', p.x * sc - 5, p.z * sc - 3); }
      if (p.type === 'survivor' && !p.rescued) { ctx.fillStyle = '#3ca85c'; ctx.fillText('幸存者', p.x * sc - 17, p.z * sc - 5); }
      if (p.type === 'meteor') { ctx.fillStyle = '#3cd8e8'; ctx.fillText('陨星', p.x * sc - 11, p.z * sc - 5); }
    }
    ctx.fillStyle = '#e05c5c'; ctx.fillText('🏠', G.townCenter.x * sc - 6, G.townCenter.z * sc - 6);
  }
}

const PANEL_TITLES = { inventory: '🎒 背包与装备', craft: '⚒️ 制作', build: '🔨 建造', quests: '📜 任务', town: '🏛️ 小镇管理', codex: '📖 图鉴', ach: '🏅 成就', map: '🗺️ 世界地图', settings: '⚙️ 设置与帮助', trade: '🛒 商队交易', daily: '📋 今日委托' };
function xpNeedTxt(lv) { return Math.floor(60 * Math.pow(lv, 1.35)); }
function goalText(g) {
  const N = (id) => ITEMS[id]?.n || id;
  switch (g.t) {
    case 'gather': case 'gather_total': return `收集 ${N(g.item)}×${g.n}`;
    case 'gather_have': return `持有 ${N(g.item)}×${g.n}`;
    case 'craft': return `制作 ${N(g.item)}×${g.n}`;
    case 'build': return `建造 ${BUILDINGS[g.b].n}${g.n > 1 ? '×' + g.n : ''}`;
    case 'eat': return `进食 ${g.n} 次`;
    case 'plant': return `播种 ${g.n} 次`;
    case 'night_kills': return `夜间击杀 ${g.n} 只怪物`;
    case 'recruit': return `招募 ${g.n} 位居民`;
    case 'boss': return `击败 ${MONSTERS[g.b].n}`;
    case 'town': return `小镇升到 ${g.n} 级`;
    case 'pop': return `居民达到 ${g.n} 人`;
    case 'fish': return `钓鱼 ${g.n} 次`;
    case 'house_animal': return `收养 ${g.n} 只牲畜`;
    case 'sell_coins': return `出售累计赚 ${g.n} 金币`;
    case 'ruin': return `发现 ${g.n} 处废墟`;
    case 'kill': return `击杀 ${g.n} 只怪物`;
    case 'harvest': return `收获 ${g.n} 次`;
    case 'cook': return `烹饪 ${g.n} 道`;
    case 'mine_total': return `挖掘 ${g.n} 份矿石`;
    default: return '';
  }
}
function rewardText(r) {
  if (!r) return '';
  const parts = [];
  if (r.coins) parts.push(`🪙${r.coins}`);
  if (r.xp) parts.push(`✨${r.xp}`);
  if (r.items) for (const [id, n] of r.items) parts.push(`${ITEMS[id].n}×${n}`);
  return '奖励：' + parts.join(' ');
}
function questCard(G, q, canClaim, claimed) {
  const goals = q.goals.map(g => {
    const done = G.goalDone(g);
    return `<div class="${done ? 'done' : ''}">${done ? '✅' : '⬜'} ${goalText(g)}</div>`;
  }).join('');
  return `<div class="quest-card ${canClaim ? 'ready' : ''} ${claimed ? 'claimed' : ''}">
    <b>${q.n}</b><div class="qdesc">${q.desc}</div>
    <div class="goals">${goals}</div>
    <div class="reward">${rewardText(q.reward)}</div>
    ${claimed ? '<span class="claimed-tag">已完成</span>' : canClaim ? `<button class="craft-btn" data-act="${q.id.startsWith('m') ? 'claimmain' : 'claimside'}" data-a1="${q.id}">领取奖励</button>` : ''}
  </div>`;
}
function bldEmoji(id) {
  return { campfire: '🔥', torch: '🕯️', wall_wood: '🧱', wall_stone: '🪨', fence: '🚧', gate_wood: '🚪', gate_stone: '🚪', floor_wood: '🟫', floor_stone: '⬜', bed_straw: '🛏️', bed_wood: '🛏️', storage_wood: '📦', storage_stone: '🗃️', bench_work: '🛠️', furnace: '🔥', anvil: '⚒️', pot_cook: '🍲', sawmill: '🪚', plot_farm: '🌱', well: '⛲', coop: '🐔', barn: '🐄', pen: '🐑', hut_wood: '🏠', hut_stone: '🏘️', board_recruit: '🪧', market: '🏪', post: '⛺', notice_board: '📋', tower_arrow: '🏹', tower_ballista: '🎯', spikes: '🔻', flower_bed: '🌷', lamp_post: '💡', bench_park: '🪑', fountain: '⛲', statue_hero: '🗿', altar_ancient: '🔮' }[id] || '🏠';
}
function jobFace(job) {
  return { lumberjack: '🪓', miner: '⛏️', farmer: '🌾', cook: '👨‍🍳', guard: '🛡️', medic: '💊', none: '😌' }[job] || '🙂';
}
