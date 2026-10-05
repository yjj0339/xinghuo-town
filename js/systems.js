// ============================================================
// 游戏系统中枢：时间/天气/生存/农业/小镇/经济/夜袭/任务/成就/存档
// ============================================================
import {
  CONFIG, ITEMS, RECIPES, BUILDINGS, CROPS, MONSTERS, ANIMALS, WORLD_OBJECTS,
  MAIN_QUESTS, SIDE_QUESTS, DAILY_POOL, ACHIEVEMENTS, SKILLS, TOWN_LEVELS,
  MERCHANT, FISH_TABLE, BIOMES, NAMES, JOBS, RANDOM_EVENTS,
} from './data.js';
import { makeQueries } from './world.js';
import { genWorld, mulberry32 } from './world.js';
import {
  makePlayer, makeMonster, makeAnimal, makeNPC, updateMonster, updateAnimal, updateNPC,
  updateDrop, updateProjectile, playerAttack, xpNeed, addItem, countItem, removeItem,
  playerDefense, playerDmgMul, playerWarmth, bestTool, dist, moveEntity,
} from './entities.js';

const TREE_IDS = ['tree', 'tree_big', 'tree_pine', 'tree_snow', 'tree_swamp', 'apple_tree'];
const ORE_IDS = ['ore_copper', 'ore_iron', 'ore_gold', 'ore_crystal', 'ore_coal', 'obsidian', 'sulfur'];
const SEASONS = ['春', '夏', '秋', '冬'];
const SEASON_TEMP = [4, 16, 4, -10];
const DAY_TIME = { // 时辰表（0..1 → 小时 6:00 起算）
};

function phaseOf(t) { return t < .07 ? 'dawn' : t < .5 ? 'day' : t < .58 ? 'dusk' : 'night'; }

export class Game {
  constructor(seed) {
    this.seed = seed;
    this.world = genWorld(seed);
    this.q = makeQueries(this.world);
    this.rng = mulberry32(seed ^ 0x9e3779b9);
    this.time = 0; this.dayTime = .1; this.day = 1; this.phase = 'day';
    this.seasonDay = 1; this.darkness = 0; this.lightning = 0; this.lightningCd = 8;
    this.weather = 'sunny'; this.weatherDay = 0;
    this.entities = []; this.drops = []; this.projectiles = []; this.floaters = []; this.particles = []; this.meteors = [];
    this.buildings = []; this.buildMap = new Map();
    this.pois = this.world.pois;
    this.ghost = null; this.target = null;
    this.town = { lv: 1, storage: new Array(20).fill(null), pop: 0, merchant: null, merchantDay: -1, raidTonight: false, raidActive: false, raidPower: 0 };
    this.stats = {}; this.claimedSides = []; this.mainIdx = 0; this.dailies = [];
    this.codex = { monsters: {}, items: {}, fish: {} };
    this.settings = { sfx: true, dmgNum: true, autoAtk: true };
    this.paused = false; this.gameSpeed = 1;
    this.sfxFn = () => { }; this.toastFn = () => { };
    this.spawnT = 0; this.animalT = 0; this.achT = 0; this.autosaveT = 0; this.eventT = 0;
    this.housedAnimals = []; // {type, buildingIdx, lastProduce}
    this.townCenter = { x: this.world.center.x + .5, z: this.world.center.z + .5 };
    this.player = makePlayer(this.townCenter.x, this.townCenter.z);
    this.startTime = Date.now();
    this.nightKillsPool = 0;
    this.buildCounts = {};
    this.version = CONFIG.VERSION;
    // 初始物资
    addItem(this.player.inv, 'wood', 5); addItem(this.player.inv, 'fiber', 3); addItem(this.player.inv, 'berry', 3);
  }

  // ---------- 基础查询 ----------
  buildingAt(x, z) {
    const tx = Math.floor(x), tz = Math.floor(z);
    const list = this.buildMap.get(tz * 1000 + tx);
    return list ? list[0] : null;
  }
  buildingNear(x, z, r) {
    for (const b of this.buildings) if (Math.hypot(b.x + .5 - x, b.z + .5 - z) < r) return b;
    return null;
  }
  isBlockedFor(e, x, z) {
    if (x < .3 || z < .3 || x > this.world.W - .3 || z > this.world.H - .3) return true;
    const tx = Math.floor(x), tz = Math.floor(z);
    const b = this.buildingAt(tx, tz);
    if (b) {
      const def = BUILDINGS[b.id];
      if (!def.walk && !(def.door && b.open)) return true;
    }
    const o = this.world.obj[tz * this.world.W + tx];
    if (o && WORLD_OBJECTS[o.id]?.block) return true;
    const fly = e && ((e.kind === 'monster' && MONSTERS[e.type]?.fly));
    if (!fly && this.q.isWater(tx, tz)) return true;
    return false;
  }

  // ---------- 物品 ----------
  give(item, n) { if (addItem(this.player.inv, item, n)) { this.bus('obtain', item, n); this.codex.items[item] = true; return true; } return false; }
  has(item, n) { return countItem(this.player.inv, item) >= n; }
  take(item, n) { return removeItem(this.player.inv, item, n); }
  count(item) { return countItem(this.player.inv, item); }
  autoUnequipIfEmpty(id) {
    for (const s of ['head', 'body', 'feet', 'acc', 'hand']) if (this.player.equip[s] === id && this.count(id) <= 0) this.player.equip[s] = null;
  }

  // ---------- 小镇仓储 ----------
  storageCap() { let cap = 20; for (const b of this.buildings) { const d = BUILDINGS[b.id]; if (d.storage) cap += d.storage; } return cap; }
  addStorage(id, n) {
    const st = this.town.storage; const cap = this.storageCap();
    const stack = 99;
    for (const s of st) if (s && s.id === id && s.n < stack) { const add = Math.min(n, stack - s.n); s.n += add; n -= add; if (n <= 0) return true; }
    for (let i = 0; i < st.length; i++) if (!st[i]) { if (n <= 0) return true; st[i] = { id, n: Math.min(n, stack) }; n -= st[i].n; }
    if (n > 0) { this.toast(`小镇仓库已满！`); return false; }
    return true;
  }
  takeStorage(id, n) {
    if (this.storageCount(id) < n) return false;
    const st = this.town.storage;
    for (let i = 0; i < st.length && n > 0; i++) { const s = st[i]; if (s && s.id === id) { const take = Math.min(s.n, n); s.n -= take; n -= take; if (s.n <= 0) st[i] = null; } }
    return true;
  }
  storageCount(id) { let n = 0; for (const s of this.town.storage) if (s && s.id === id) n += s.n; return n; }

  // ---------- 战斗 ----------
  hitEntity(src, target, dmg, from, effect) {
    if (!target || target.hp <= 0) return;
    let final = dmg;
    if (from === 'player') {
      final = dmg * (0.9 + this.rng() * .2);
      const acc = this.player.equip.acc && ITEMS[this.player.equip.acc];
      if (acc?.arm?.luck && this.rng() < acc.arm.luck) { /* 幸运：额外掉落在死亡时多roll一次 */ target.lucky = true; }
    }
    if (target.kind === 'player') { this.hitPlayer(final, effect); return; }
    if (target.kind === 'npc' && from === 'player') return; // 不误伤居民
    target.hp -= final; target.hitT = .18;
    if (target.kind === 'monster') {
      const m = MONSTERS[target.type];
      target.state = 'chase';
      if (!target.target && src) target.target = src;
      if (target.hp <= 0) this.killMonster(target, from);
      else {
        if (effect === 'burn') target.burnT = 3;
        if (effect === 'slow') target.slowT = 2.5;
      }
      if (this.settings.dmgNum) this.floaters.push({ x: target.x, z: target.z, y: -36, text: `${Math.round(final)}`, color: from === 'player' ? '#ffe08a' : '#ff9d9d', life: .8 });
    } else if (target.kind === 'npc') {
      if (target.hp <= 0) { target.hp = target.maxHp; this.toast(`${target.name} 受伤过重，回屋休息了`); target.x = this.townCenter.x; target.z = this.townCenter.z; }
    } else if (target.kind === 'animal') {
      target.fleeT = 3; target.threat = src || this.player;
      if (target.hp <= 0) {
        const a = ANIMALS[target.type];
        for (const [id, mn, mx, ch] of a.drops) if (this.rng() < ch) this.spawnDrop(target.x, target.z, id, mn + Math.floor(this.rng() * (mx - mn + 1)));
        target.dead = true; this.gainXp(5); this.bus('kill_animal', target.type);
      }
    }
  }
  hitPlayer(dmg, effect) {
    const p = this.player;
    if (p.dead || p.fx.invuln > 0) return;
    let final = dmg * Math.max(.3, 1 - playerDefense(p) * .04);
    final *= 1 - (p.skills.iron_skin || 0) * .08;
    p.hp -= final; p.hitT = .2; p.fx.invuln = .4;
    if (effect === 'burn') p.fx.burn = 3;
    if (effect === 'slow') p.fx.slow = 2.5;
    if (effect === 'poison') p.fx.poison = 5;
    if (this.settings.dmgNum) this.floaters.push({ x: p.x, z: p.z, y: -40, text: `-${Math.round(final)}`, color: '#ff6a6a', life: .8 });
    this.sfx('hurt');
    if (p.hp <= 0) this.playerDown();
  }
  playerDown() {
    const p = this.player; p.dead = true; p.hp = 0;
    this.toast('你倒下了……醒来时已是清晨，损失了 20% 金币');
    // 惩罚：金币损失，回到城镇中心
    p.coins = Math.floor(p.coins * .8);
    p.x = this.townCenter.x; p.z = this.townCenter.z;
    p.hp = Math.max(30, p.maxHp * .4); p.hunger = Math.max(40, p.hunger); p.thirst = Math.max(40, p.thirst);
    // 时间快进到早晨
    if (this.phase === 'night') { this.dayTime = .02; this.day++; this.dayTime = .02; this.onNewDay(); }
    p.dead = false; p.fx.invuln = 3;
  }
  killMonster(m, from) {
    m.dead = true;
    const def = MONSTERS[m.type];
    this.gainXp(def.xp);
    this.bus('kill', m.type);
    this.codex.monsters[m.type] = this.codex.monsters[m.type] || { seen: 0, kills: 0 };
    this.codex.monsters[m.type].kills++;
    // 连击奖励
    const now = this.time;
    if (now - (this._comboT || -9) < 3.5) this._combo = (this._combo || 0) + 1; else this._combo = 1;
    this._comboT = now;
    if (this._combo >= 3) {
      const bonus = this._combo * 2;
      this.player.coins += bonus;
      this.sfx('combo');
      this.floaters.push({ x: m.x, z: m.z, y: -64, text: `${this._combo} 连杀！+${bonus}🪙`, color: '#ffd84c', life: 1.4, big: true });
    }
    const luck = (this.player.equip.acc && ITEMS[this.player.equip.acc]?.arm?.luck) || 0;
    for (const [id, mn, mx, ch] of def.drops) {
      if (this.rng() < ch) {
        const n = mn + Math.floor(this.rng() * (mx - mn + 1));
        if (id === 'coin') this.player.coins += n;
        else this.spawnDrop(m.x, m.z, id, n);
      }
      if (luck > 0 && this.rng() < ch * luck && mn > 0) this.spawnDrop(m.x, m.z, id, 1);
    }
    if (def.boss) {
      this.toast(`🏆 击败了 ${def.n}！`); this.sfx('roar');
      this.floaters.push({ x: m.x, z: m.z, y: -60, text: `${def.n} 被击败！`, color: '#ffd84c', life: 2, big: true });
    }
    for (let i = 0; i < (def.boss ? 14 : 4); i++) this.particles.push({ x: m.x, z: m.z, y: -14, t: 0, kind: 'poof', vx: (this.rng() - .5) * 3, vz: (this.rng() - .5) * 3 });
  }
  spawnDrop(x, z, item, n) { this.drops.push({ item, n, x: x + (this.rng() - .5) * .5, z: z + (this.rng() - .5) * .5, t: 0, seed: this.rng() }); }
  spawnProjectile(x, z, tx, tz, kind, dmg, from, effect, aoe) {
    const spd = kind === 'arrow' || kind === 'bolt' ? 11 : 6.5;
    const dx = tx - x, dz = tz - z, len = Math.hypot(dx, dz) || 1;
    const pr = { x, z, vx: dx / len * spd, vz: dz / len * spd, life: Math.min(2.4, len / spd + .2), kind, dmg, from, effect, aoe, h: 8, vy: kind === 'bomb' ? 4 : 0 };
    this.projectiles.push(pr); return pr;
  }
  spawnMeteor(x, z, dmg) { this.meteors.push({ x, z, t: 1.2, dmg }); }
  explode(pr) {
    const r = pr.aoe || 1.6;
    if (pr.from === 'player' || pr.from === 'tower') {
      for (const e of this.entities) if (e.kind === 'monster' && Math.hypot(e.x - pr.x, e.z - pr.z) < r) this.hitEntity(this.player, e, pr.dmg, pr.from);
    } else {
      if (Math.hypot(this.player.x - pr.x, this.player.z - pr.z) < r) this.hitPlayer(pr.dmg);
    }
    for (let i = 0; i < 10; i++) this.particles.push({ x: pr.x, z: pr.z, y: -8, t: 0, kind: 'boom', vx: (this.rng() - .5) * 5, vz: (this.rng() - .5) * 5 });
    this.sfx('boom'); this.lightning = Math.max(this.lightning, .12);
  }

  // ---------- 建造 ----------
  canPlace(id, tx, tz) {
    if (!this.q.inBounds(tx, tz) || this.q.isWater(tx, tz)) return false;
    if (this.buildingAt(tx, tz)) return false;
    if (this.world.obj[tz * this.world.W + tx]) return false;
    if (Math.hypot(tx - this.townCenter.x, tz - this.townCenter.z) > 40) return false; // 建造距离限制
    const p = this.player;
    if (Math.hypot(tx + .5 - p.x, tz + .5 - p.z) > 6) return false;
    return true;
  }
  buildCost(id) {
    const disc = 1 - (this.player.skills.builder || 0) * .08;
    return BUILDINGS[id].cost.map(([i, n]) => [i, Math.max(1, Math.round(n * disc))]);
  }
  canAfford(id) { return this.buildCost(id).every(([i, n]) => this.has(i, n)); }
  placeBuilding(id, tx, tz, free = false) {
    if (!this.canPlace(id, tx, tz)) { this.toast('这里不能建造'); return false; }
    if (!free) {
      if (!this.canAfford(id)) { this.toast('材料不足'); return false; }
      for (const [i, n] of this.buildCost(id)) this.take(i, n);
    }
    const b = { id, x: tx, z: tz, hp: BUILDINGS[id].hp, open: false, crop: null, idx: this.buildings.length };
    this.buildings.push(b);
    const key = tz * 1000 + tx;
    if (!this.buildMap.has(key)) this.buildMap.set(key, []);
    this.buildMap.get(key).push(b);
    this.buildCounts[id] = (this.buildCounts[id] || 0) + 1;
    this.bus('build', id);
    this.gainXp(6);
    this.sfx('build');
    for (let i = 0; i < 6; i++) this.particles.push({ x: tx + .5, z: tz + .5, y: -10, t: 0, kind: 'poof', vx: (this.rng() - .5) * 2, vz: (this.rng() - .5) * 2 });
    return true;
  }
  dismantle(b) {
    const idx = this.buildings.indexOf(b); if (idx < 0) return;
    const list = this.buildMap.get(b.z * 1000 + b.x); if (list) { const i = list.indexOf(b); if (i >= 0) list.splice(i, 1); if (!list.length) this.buildMap.delete(b.z * 1000 + b.x); }
    this.buildings.splice(idx, 1);
    this.buildCounts[b.id] = Math.max(0, (this.buildCounts[b.id] || 1) - 1);
    for (const [i, n] of BUILDINGS[b.id].cost) this.give(i, Math.ceil(n / 2));
    this.sfx('build'); this.toast(`拆除 ${BUILDINGS[b.id].n}，返还一半材料`);
    // 农田上的动物解绑
    this.housedAnimals = this.housedAnimals.filter(a => a.b !== b);
  }
  damageBuilding(b, dmg) {
    b.hp -= dmg; b.hitT = .2;
    if (b.hp <= 0) {
      this.toast(`${BUILDINGS[b.id].n} 被摧毁了！`); this.sfx('boom');
      this.dismantle(b); // 无返还
      for (const [i, n] of []) { }
    }
  }

  // ---------- 农业 ----------
  plantSeed(b, seedId) {
    const crop = ITEMS[seedId]?.seed?.crop;
    if (!crop || b.crop) return false;
    if (!CROPS[crop].seasons.includes(this.seasonIdx())) { this.toast(`${CROPS[crop].n}不适合在${SEASONS[this.seasonIdx()]}季种植`); return false; }
    if (!this.take(seedId, 1)) return false;
    b.crop = { id: crop, growth: 0, watered: true };
    this.bus('plant'); this.gainXp(2); this.sfx('plant');
    return true;
  }
  harvestCrop(b, byNPC) {
    if (!b.crop || b.crop.growth < 1) return false;
    const c = CROPS[b.crop.id];
    const mul = 1 + (this.player.skills.green_thumb || 0) * .15;
    const who = byNPC ? this : this; // 都进玩家仓库？农夫收获进小镇仓库
    for (const [id, n] of c.out) {
      const amt = Math.max(1, Math.round(n * mul * (0.9 + this.rng() * .3)));
      if (byNPC) this.addStorage(id, amt); else this.give(id, amt);
    }
    for (const [id, n, ch] of c.bonus) if (this.rng() < ch) { if (byNPC) this.addStorage(id, n); else this.give(id, n); }
    b.crop = null;
    this.bus('harvest'); this.gainXp(3);
    this.sfx('pick');
    if (!byNPC) this.toast(`收获 ${c.n}！`);
    return true;
  }
  seasonIdx() { return Math.floor(((this.day - 1) % (CONFIG.SEASON_DAYS * 4)) / CONFIG.SEASON_DAYS); }

  // ---------- 居民 & 招募 ----------
  popCap() { let cap = 2; for (const b of this.buildings) if (BUILDINGS[b.id].cap) cap += BUILDINGS[b.id].cap; return cap; }
  settlerCount() { return this.entities.filter(e => e.kind === 'npc').length; }
  addSettler(name, job) {
    const npc = makeNPC(name, this.townCenter.x + (this.rng() - .5) * 4, this.townCenter.z + (this.rng() - .5) * 4, job || 'none');
    this.entities.push(npc);
    this.bus('recruit'); this.toast(`🎉 ${name} 加入了小镇！`);
    this.sfx('join');
    return npc;
  }
  randomName() {
    return NAMES.family[Math.floor(this.rng() * NAMES.family.length)] +
      NAMES.given[Math.floor(this.rng() * NAMES.given.length)];
  }

  // ---------- 屠宰/收养 ----------
  tryHouse(e) {
    const a = ANIMALS[e.type]; if (!a) return false;
    const home = this.buildings.find(b => BUILDINGS[b.id]?.ranch && BUILDINGS[b.id].ranch.animal === e.type &&
      this.housedAnimals.filter(h => h.b === b).length < BUILDINGS[b.id].ranch.cap);
    if (!home) { this.toast(`附近没有可用的${({ chicken: '鸡舍', cow: '牛棚', sheep: '羊圈' })[e.type]}`); return false; }
    e.dead = true; e.housed = true;
    this.housedAnimals.push({ type: e.type, b: home, lastDay: this.day });
    this.bus('house_animal'); this.gainXp(8);
    this.toast(`${a.n}入住了${BUILDINGS[home.id].n}！`); this.sfx('join');
    return true;
  }

  // ---------- 钓鱼 ----------
  startFishing() {
    const p = this.player;
    const rod = bestTool(p.inv, 'rod'); if (!rod) return false;
    // 面向水？
    const dirs = [[0, 1], [-1, 0], [1, 0], [0, -1]];
    const d = dirs[p.dir];
    if (!this.q.isWater(Math.floor(p.x + d[0] * 2), Math.floor(p.z + d[1] * 2))) { this.toast('要面向水面才能钓鱼'); return false; }
    const bait = this.count('bait') > 0;
    p.fishing = { state: 'wait', t: (bait ? 1 : 1.6) + this.rng() * 2.4, bait };
    if (bait) this.take('bait', 1);
    this.sfx('cast');
    return true;
  }
  updateFishing(dt) {
    const f = this.player.fishing; if (!f) return;
    f.t -= dt;
    if (f.state === 'wait' && f.t <= 0) { f.state = 'bite'; f.t = .85; this.sfx('bite'); }
    else if (f.state === 'bite' && f.t <= 0) { f.state = 'miss'; f.t = 1; this.toast('鱼跑掉了……'); }
    else if (f.state === 'miss' && f.t <= 0) this.player.fishing = null;
  }
  fishingPull() {
    const f = this.player.fishing; if (!f) return;
    if (f.state === 'bite') {
      const biome = this.q.biomeAt(Math.floor(this.player.x), Math.floor(this.player.z));
      let pool = FISH_TABLE.filter(x => !x.biomes.length || x.biomes.includes(biome));
      let sum = 0; for (const x of pool) sum += x.w;
      let r = this.rng() * sum, pick = pool[0];
      for (const x of pool) { r -= x.w; if (r <= 0) { pick = x; break; } }
      this.give(pick.id, 1);
      this.bus('fish', pick.id);
      this.gainXp(5); this.sfx('catch');
      this.toast(`钓到了 ${ITEMS[pick.id].n}！`);
      this.player.fishing = null;
    } else if (f.state === 'wait') { this.toast('还没有鱼上钩，别急……'); }
    else if (f.state === 'miss') this.player.fishing = null;
  }

  // ---------- XP / 技能 ----------
  gainXp(n) {
    const p = this.player;
    p.xp += n;
    while (p.xp >= xpNeed(p.level)) {
      p.xp -= xpNeed(p.level); p.level++; p.skillPts++;
      p.maxHp += 4; p.hp = Math.min(p.maxHp, p.hp + 20);
      this.toast(`⭐ 升到 ${p.level} 级！获得 1 技能点`); this.sfx('level');
      this.floaters.push({ x: p.x, z: p.z, y: -50, text: 'LEVEL UP!', color: '#ffd84c', life: 1.5, big: true });
      this.bus('level');
    }
  }
  learnSkill(id) {
    const p = this.player;
    if (!SKILLS[id]) { this.toast('未知技能'); return false; }
    const cur = p.skills[id] || 0;
    if (p.skillPts <= 0) { this.toast('没有技能点了'); return false; }
    if (cur >= SKILLS[id].max) { this.toast('该技能已满级'); return false; }
    p.skills[id] = cur + 1; p.skillPts--;
    this.bus('skill');
    this.sfx('level');
    // 立即生效：体质
    if (id === 'vitality') { p.maxHp += 15; p.hp += 15; }
    return true;
  }

  // ---------- 回城 ----------
  homeCd = 0;
  homeTp() {
    const p = this.player;
    if (this.homeCd > 0) { this.toast(`回城冷却中（${Math.ceil(this.homeCd)}秒）`); return false; }
    let danger = false;
    for (const e of this.entities) if (e.kind === 'monster' && !e.passive && dist(e, p) < 6) { danger = true; break; }
    if (danger) { this.toast('附近有怪物缠着你，无法回城！'); return false; }
    p.x = this.townCenter.x; p.z = this.townCenter.z;
    this.homeCd = 30;
    this.particles.push({ x: p.x, z: p.z, y: -20, t: 0, kind: 'tp' });
    this.sfx('cast');
    this.toast('🏠 已回到小镇中心');
    return true;
  }

  // ---------- 商人 ----------
  merchantArrive() {
    if (this.town.merchant) return;
    const post = this.buildings.find(b => b.id === 'post') || this.buildings.find(b => b.id === 'market');
    const x = (post ? post.x : this.townCenter.x + 3) + .5, z = (post ? post.z : this.townCenter.z + 3) + .5;
    this.town.merchant = { x, z, seed: this.rng(), dir: 0, moving: false, t: 0, atkT: 0, hitT: 0, spd: 0, r: .4, kind: 'merchant', id: -1 };
    this.entities.push(this.town.merchant);
    this.toast('🛒 商队来了！点击商人进行交易（停留至日落）');
    this.sfx('join');
  }
  merchantLeave() {
    if (!this.town.merchant) return;
    const i = this.entities.indexOf(this.town.merchant);
    if (i >= 0) this.entities.splice(i, 1);
    this.town.merchant = null;
  }
  sellPrice(id) {
    const base = ITEMS[id].p || 1;
    let m = 1 + (this.player.skills.trader || 0) * .06;
    if (this.buildings.some(b => b.id === 'post')) m += .1;
    return Math.max(1, Math.round(base * m));
  }
  buyPrice(id) {
    const row = MERCHANT.sell.find(x => x[0] === id);
    return row ? row[1] : Math.max(2, Math.ceil((ITEMS[id].p || 1) * 2.5));
  }
  sellItem(id, n) {
    const got = this.sellPrice(id) * n;
    if (!this.take(id, n)) return;
    this.player.coins += got;
    this.stats.sell_total = (this.stats.sell_total || 0) + got;
    this.sfx('coin'); this.toast(`出售 ${ITEMS[id].n}×${n}，+${got} 金币`);
  }
  buyItem(id, n) {
    const cost = this.buyPrice(id) * n;
    if (this.player.coins < cost) { this.toast('金币不足'); return; }
    if (!addItem(this.player.inv, id, n)) { this.toast('背包满了'); return; }
    this.player.coins -= cost; this.give(id, 0);
    this.sfx('coin'); this.toast(`购买 ${ITEMS[id].n}×${n}，-${cost} 金币`);
  }

  // ---------- 任务 ----------
  goalDone(goal) {
    const s = this.stats;
    switch (goal.t) {
      case 'gather': return (s['gather_' + goal.item] || 0) >= goal.n;
      case 'gather_total': return (s['gather_' + goal.item] || 0) >= goal.n;
      case 'gather_have': return this.count(goal.item) >= goal.n;
      case 'craft': return (s['craft_' + goal.item] || 0) >= goal.n;
      case 'build': return (this.buildCounts[goal.b] || 0) >= goal.n;
      case 'eat': return (s.eat || 0) >= goal.n;
      case 'plant': return (s.plant || 0) >= goal.n;
      case 'night_kills': return (s.night_kills || 0) >= goal.n;
      case 'recruit': return (s.recruit || 0) >= goal.n;
      case 'boss': return (s['boss_' + goal.b] || 0) >= 1;
      case 'town': return this.town.lv >= goal.n;
      case 'pop': return this.settlerCount() >= goal.n;
      case 'fish': return (s.fish || 0) >= goal.n;
      case 'house_animal': return (s.house_animal || 0) >= goal.n;
      case 'sell_coins': return (s.sell_total || 0) >= goal.n;
      case 'ruin': return (s.ruins || 0) >= goal.n;
      case 'kill': return (s.kills || 0) >= goal.n;
      case 'harvest': return (s.harvest || 0) >= goal.n;
      case 'cook': return (s.cook || 0) >= goal.n;
      case 'mine_total': return (s.mine_total || 0) >= goal.n;
      default: return false;
    }
  }
  questReady(q) { return q.goals.every(g => this.goalDone(g)); }
  claimQuest(q) {
    const r = q.reward || {};
    if (r.items) for (const [id, n] of r.items) this.give(id, n);
    if (r.coins) this.player.coins += r.coins;
    if (r.xp) this.gainXp(r.xp);
    if (r.unlockTip) this.toast('🔓 ' + r.unlockTip);
    this.sfx('quest');
  }
  mainQuest() { return MAIN_QUESTS[this.mainIdx] || null; }
  rollDailies() {
    if (!this.buildings.some(b => b.id === 'notice_board')) { this.dailies = []; return; }
    const pool = [...DAILY_POOL];
    this.dailies = [];
    for (let i = 0; i < 3 && pool.length; i++) {
      const idx = Math.floor(this.rng() * pool.length);
      const q = pool.splice(idx, 1)[0];
      this.dailies.push({ ...q, uid: this.day + '-' + i, base: { ...this.stats } });
    }
    this.toast('📋 公告牌更新了今日委托');
  }
  dailyProgress(q) {
    const g = q.goals[0];
    const key = { kill: 'kills', fish: 'fish', harvest: 'harvest' }[g.t];
    if (key) return Math.min(g.n, (this.stats[key] || 0) - (q.base[key] || 0));
    return Math.min(g.n, this.count(g.item));
  }

  // ---------- 事件总线 ----------
  bus(type, a, b) {
    const s = this.stats;
    switch (type) {
      case 'gather': {
        s['gather_' + a] = (s['gather_' + a] || 0) + b;
        if (ORE_IDS.includes(a)) s.mine_total = (s.mine_total || 0) + b;
        this.gainXp(a === 'wood' || a === 'stone' ? 2 : 3);
        this.codex.items[a] = true;
        break;
      }
      case 'obtain': this.codex.items[a] = true; break;
      case 'kill': {
        s.kills = (s.kills || 0) + 1;
        if (this.phase === 'night' || this.phase === 'dusk') s.night_kills = (s.night_kills || 0) + 1;
        if (MONSTERS[a]?.boss) s['boss_' + a] = (s['boss_' + a] || 0) + 1;
        break;
      }
      case 'kill_animal': break;
      case 'craft': s['craft_' + a] = (s['craft_' + a] || 0) + (b || 1); s.craft = (s.craft || 0) + (b || 1); this.gainXp(2); this.codex.items[a] = true; break;
      case 'build': s['build_' + a] = (s['build_' + a] || 0) + 1; if (BUILDINGS[a]?.cat === 'deco') s.deco_build = (s.deco_build || 0) + 1; if (BUILDINGS[a]?.tower) s.towers = (s.towers || 0) + 1; break;
      case 'eat': s.eat = (s.eat || 0) + 1; break;
      case 'plant': s.plant = (s.plant || 0) + 1; break;
      case 'harvest': s.harvest = (s.harvest || 0) + 1; break;
      case 'cook': s.cook = (s.cook || 0) + 1; this.codex.items[a] = true; break;
      case 'fish': {
        s.fish = (s.fish || 0) + 1;
        if (a === 'fish_koi') s.koi = (s.koi || 0) + 1;
        this.codex.fish[a] = true;
        s.fish_kinds = Object.keys(this.codex.fish).filter(k => k.startsWith('fish_')).length;
        break;
      }
      case 'house_animal': s.house_animal = (s.house_animal || 0) + 1; break;
      case 'recruit': s.recruit = (s.recruit || 0) + 1; break;
      case 'sell': break;
      case 'ruin': s.ruins = (s.ruins || 0) + 1; break;
      case 'level': s.level = this.player.level; break;
      case 'skill': s.skill_total = Object.values(this.player.skills).reduce((x, y) => x + y, 0); break;
      case 'sleep': break;
      case 'npc_work': break;
    }
    this.checkQuests();
  }
  checkQuests() {
    // 主线完成提示（不自动领取，由玩家在任务面板领取 → 保持仪式感；主线完成时弹提示）
    const mq = this.mainQuest();
    if (mq && this.questReady(mq) && !mq._readyShown) {
      mq._readyShown = true;
      this.toast(`✅ 主线「${mq.n}」目标达成！打开任务面板领取奖励`);
      this.sfx('quest');
    }
  }
  claimMain() {
    const mq = this.mainQuest();
    if (!mq || !this.questReady(mq)) return false;
    this.claimQuest(mq);
    this.mainIdx++;
    this.toast(`📖 新主线：${this.mainQuest()?.n || '全部完成！'}`);
    return true;
  }

  // ---------- 成就 ----------
  checkAch() {
    const s = this.stats;
    s.days = this.day - 1;
    s.nights = Math.max(0, this.day - 1 + (this.dayTime > .58 ? 1 : 0));
    s.pop = this.settlerCount();
    s.town = this.town.lv;
    s.coins_total = this.player.coins;
    for (const a of ACHIEVEMENTS) {
      if (this.unlockedAch?.has(a.id)) continue;
      const c = a.cond;
      let ok = false;
      if (c.t === 'stat') ok = (s[c.k] || 0) >= c.n;
      else if (c.t === 'build') ok = (this.buildCounts[c.b] || 0) >= c.n;
      if (ok) {
        (this.unlockedAch = this.unlockedAch || new Set()).add(a.id);
        this.toast(`🏅 成就达成：${a.n}`); this.sfx('level');
        this.player.coins += 10;
      }
    }
  }

  // ---------- 时间推进 ----------
  onNewDay() {
    this.seasonDay = ((this.day - 1) % CONFIG.SEASON_DAYS) + 1;
    const prevSeason = Math.floor(((this.day - 2) % 28) / 7);
    const newSeason = this.seasonIdx();
    // 天气
    const roll = this.rng();
    const s = newSeason;
    if (s === 3) this.weather = roll < .4 ? 'sunny' : roll < .55 ? 'cloud' : roll < .75 ? 'snow' : roll < .82 ? 'blizzard' : 'fog';
    else if (s === 1) this.weather = roll < .35 ? 'sunny' : roll < .5 ? 'cloud' : roll < .62 ? 'rain' : roll < .68 ? 'storm' : roll < .8 ? 'heat' : 'fog';
    else this.weather = roll < .5 ? 'sunny' : roll < .68 ? 'cloud' : roll < .84 ? 'rain' : roll < .89 ? 'storm' : 'fog';
    // 雨天自动浇水
    if (this.weather === 'rain' || this.weather === 'storm') for (const b of this.buildings) if (b.crop) b.crop.watered = true;
    else for (const b of this.buildings) if (b.crop) b.crop.watered = false;
    // 作物枯萎：不适合季节的停止生长（不死亡）
    // 税收
    const market = this.buildings.some(b => b.id === 'market');
    if (market) {
      let tax = 5 * this.town.lv + this.settlerCount() * 2;
      if (this.town.lv >= 5) tax *= 2;
      this.player.coins += tax;
      this.toast(`💰 集市税收 +${tax} 金币`);
    }
    // 牧场产出
    for (const h of this.housedAnimals) {
      if (this.day - h.lastDay >= 1) {
        h.lastDay = this.day;
        const [pid, pn] = ANIMALS[h.type].product;
        this.addStorage(pid, pn);
      }
    }
    // 商人
    if (MERCHANT.visitDays.includes(this.day)) this.merchantArrive();
    // 日常委托
    this.rollDailies();
    // 夜袭计划
    this.town.raidTonight = this.day >= 4 && this.day % 2 === 0;
    if (this.day % 10 === 0) { this.town.raidTonight = true; this.town.bigRaid = true; }
    // 换季事件
    if (newSeason !== prevSeason && this.day > 1) {
      this.toast(`🍂 ${SEASONS[newSeason]}天来了！`);
      for (const e of this.entities) if (e.kind === 'npc') e.happiness = Math.min(100, e.happiness + 10);
    }
    // 随机事件
    if (this.rng() < .4) this.randomEvent();
    // 成就/存档
    this.checkAch();
    this.save(true);
  }
  randomEvent() {
    const ev = RANDOM_EVENTS[Math.floor(this.rng() * RANDOM_EVENTS.length)];
    const tc = this.townCenter;
    switch (ev.id) {
      case 'e_herd': {
        const types = ['chicken', 'sheep', 'deer', 'cow'];
        const t = types[Math.floor(this.rng() * types.length)];
        for (let i = 0; i < 4 + Math.floor(this.rng() * 3); i++) {
          const x = tc.x + (this.rng() - .5) * 30, z = tc.z + (this.rng() - .5) * 30;
          if (this.q.isWater(Math.floor(x), Math.floor(z))) continue;
          const a = makeAnimal(t, x, z); a.homeX = x; a.homeZ = z;
          this.entities.push(a);
        }
        this.toast(`🐐 ${ev.n}：${ANIMALS[t].n}群出现在小镇附近`);
        break;
      }
      case 'e_honey': {
        for (let i = 0; i < 3; i++) {
          for (let k = 0; k < 30; k++) {
            const x = Math.floor(this.rng() * this.world.W), z = Math.floor(this.rng() * this.world.H);
            const i2 = z * this.world.W + x;
            if (this.q.biomeAt(x, z) === 'forest' && !this.world.obj[i2]) { this.world.obj[i2] = { id: 'hive', hp: 1, t: 0, v: 0 }; break; }
          }
        }
        this.toast(`🍯 ${ev.n}：森林里多了几个野蜂巢`);
        break;
      }
      case 'e_meteor': {
        for (let k = 0; k < 60; k++) {
          const x = 10 + Math.floor(this.rng() * (this.world.W - 20)), z = 10 + Math.floor(this.rng() * (this.world.H - 20));
          const i2 = z * this.world.W + x;
          if (!this.q.isWater(x, z) && !this.world.obj[i2]) {
            this.world.obj[i2] = { id: 'meteor', hp: 4, t: 0, v: 0 };
            this.pois.push({ type: 'meteor', n: '陨星', x, z, discovered: false });
            break;
          }
        }
        this.toast(`☄️ ${ev.n}！小地图上出现了新的标记`);
        break;
      }
      case 'e_wanderer': {
        this.town.wandererWaiting = true;
        this.toast(`🚶 ${ev.n}：招贤台有一位流浪者愿意加入（80金币）`);
        break;
      }
      case 'e_mimic': {
        for (let k = 0; k < 40; k++) {
          const x = Math.floor(this.rng() * this.world.W), z = Math.floor(this.rng() * this.world.H);
          if (!this.q.isWater(x, z) && Math.hypot(x - tc.x, z - tc.z) > 12) {
            this.pois.push({ type: 'chest', idx: 100 + this.pois.length, n: '可疑的宝箱', x, z, discovered: true, opened: false, sealed: false, mimic: true });
            break;
          }
        }
        this.toast(`📦 ${ev.n}：地图上出现了一只神秘的宝箱……`);
        break;
      }
      case 'e_goldrush': {
        let placed = 0;
        for (let k = 0; k < 300 && placed < 6; k++) {
          const x = 8 + Math.floor(this.rng() * (this.world.W - 16)), z = 8 + Math.floor(this.rng() * (this.world.H - 16));
          const i2 = z * this.world.W + x;
          if (!this.q.isWater(x, z) && !this.world.obj[i2] && Math.hypot(x - tc.x, z - tc.z) > 15) {
            this.world.obj[i2] = { id: 'ore_gold', hp: 4, t: 0, v: 0 };
            this.pois.push({ type: 'meteor', n: '金矿', x, z, discovered: true });
            placed++;
          }
        }
        this.toast(`⛏️ ${ev.n}：小地图出现了 6 处新金矿标记！`);
        break;
      }
      case 'e_greedy': {
        const ang = this.rng() * Math.PI * 2;
        const x = tc.x + Math.cos(ang) * 14, z = tc.z + Math.sin(ang) * 14;
        if (!this.q.isWater(Math.floor(x), Math.floor(z))) {
          const g = makeMonster('gold_goblin', x, z, {});
          this.entities.push(g);
          this.toast(`💰 ${ev.n}：一只宝藏地精出现在小镇附近，快去抓住它（它会逃跑）！`);
        }
        break;
      }
    }
  }

  // ---------- 刷怪 ----------
  ambientSpawn(dt) {
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    this.spawnT = 2;
    const p = this.player;
    const mons = this.entities.filter(e => e.kind === 'monster' && !e.dead);
    const cap = 14 + this.town.lv * 2 + (this.phase === 'night' ? 6 : 0);
    if (mons.length < cap) {
      const ang = this.rng() * Math.PI * 2;
      const d = 16 + this.rng() * 14;
      const x = p.x + Math.cos(ang) * d, z = p.z + Math.sin(ang) * d;
      const tx = Math.floor(x), tz = Math.floor(z);
      if (this.q.inBounds(tx, tz) && !this.q.isWater(tx, tz) && !this.buildingAt(tx, tz)) {
        const biome = this.q.biomeAt(tx, tz);
        const pool = BIOMES[biome]?.mon || [];
        const nightNow = this.phase === 'night';
        if (pool.length) {
          const cand = pool.filter(id => MONSTERS[id].night ? nightNow : true);
          if (cand.length) {
            const id = cand[Math.floor(this.rng() * cand.length)];
            const m = makeMonster(id, x, z, { night: MONSTERS[id].night });
            if (Math.hypot(x - this.townCenter.x, z - this.townCenter.z) > CONFIG.TOWN_RADIUS * .8) this.entities.push(m);
          }
        }
      }
    }
    // 动物
    const animals = this.entities.filter(e => e.kind === 'animal' && !e.dead);
    if (animals.length < 12) {
      const ang = this.rng() * Math.PI * 2, d = 14 + this.rng() * 18;
      const x = p.x + Math.cos(ang) * d, z = p.z + Math.sin(ang) * d;
      const tx = Math.floor(x), tz = Math.floor(z);
      if (this.q.inBounds(tx, tz) && !this.q.isWater(tx, tz)) {
        const biome = this.q.biomeAt(tx, tz);
        if (biome === 'grass' || biome === 'forest') {
          const roll = this.rng();
          const t = biome === 'forest' ? (roll < .4 ? 'deer' : roll < .6 ? 'rabbit_mob' : roll < .8 ? 'chicken' : 'sheep') : (roll < .3 ? 'rabbit_mob' : roll < .55 ? 'chicken' : roll < .8 ? 'cow' : 'sheep');
          if (ANIMALS[t]) {
            const a = makeAnimal(t, x, z); a.homeX = x; a.homeZ = z;
            this.entities.push(a);
          } else {
            const mm = makeMonster(t, x, z); this.entities.push(mm);
          }
        }
      }
    }
  }

  startRaid() {
    const big = this.town.bigRaid;
    const n = Math.min(24, 3 + this.town.lv * 2 + Math.floor(this.day / 5) + (big ? 6 : 0));
    const dirs = this.rng() * Math.PI * 2;
    const ex = this.townCenter.x + Math.cos(dirs) * (CONFIG.TOWN_RADIUS + 6);
    const ez = this.townCenter.z + Math.sin(dirs) * (CONFIG.TOWN_RADIUS + 6);
    const pool = [];
    const nearBiome = this.q.biomeAt(Math.floor(ex), Math.floor(ez));
    for (const id of (BIOMES[nearBiome]?.mon || []).slice(0, 3)) pool.push(id);
    pool.push('zombie', 'skeleton');
    for (let i = 0; i < n; i++) {
      const id = pool[Math.floor(this.rng() * pool.length)];
      const m = makeMonster(id, ex + (this.rng() - .5) * 5, ez + (this.rng() - .5) * 5, { raid: true, hpMul: 1 + this.day * .02 });
      this.entities.push(m);
    }
    if (big && this.day % 10 === 0) {
      const bk = makeMonster('goblin_king', ex, ez, { raid: true, hpMul: .6 });
      this.entities.push(bk);
    }
    this.town.raidActive = true;
    this.toast(`⚔️ 怪物夜袭！${n} 只怪物正在逼近小镇！`); this.sfx('roar');
    this.raidBanner = 4;
  }
  endRaid() {
    this.town.raidActive = false; this.town.bigRaid = false;
    let fled = 0;
    for (const e of this.entities) if (e.kind === 'monster' && e.raid) { e.dead = true; fled++; }
    this.entities = this.entities.filter(e => !(e.kind === 'monster' && e.raid));
    if (fled) this.toast(`🌅 黎明降临，怪物们撤退了（${fled} 只）`);
  }

  // ---------- 主更新 ----------
  update(dt) {
    if (this.paused) return;
    dt *= this.gameSpeed;
    this.time += dt;
    this.homeCd = Math.max(0, this.homeCd - dt);
    const prevPhase = this.phase;
    // 时间
    this.dayTime += dt / CONFIG.DAY_LEN;
    if (this.dayTime >= 1) { this.dayTime -= 1; this.day++; this.onNewDay(); }
    this.phase = phaseOf(this.dayTime);
    if (prevPhase === 'night' && this.phase === 'dawn') this.endRaid();
    // 黑暗度
    const t = this.dayTime;
    let dark = 0;
    if (t < .07) dark = .58 * (1 - t / .07);
    else if (t < .5) dark = 0;
    else if (t < .58) dark = .58 * ((t - .5) / .08);
    else dark = .58 + Math.min(.08, (t - .58) * .1);
    this.darkness = dark;
    // 雷暴闪电
    this.lightning = Math.max(0, this.lightning - dt * 1.5);
    if (this.weather === 'storm' && this.phase !== 'day') {
      this.lightningCd -= dt;
      if (this.lightningCd <= 0) { this.lightningCd = 6 + this.rng() * 10; this.lightning = .5; this.sfx('thunder'); }
    }
    // 夜袭开始
    if (this.town.raidTonight && !this.town.raidActive && t >= .6) { this.town.raidTonight = false; this.startRaid(); }
    // 商人日落离开
    if (this.town.merchant && t > .52) this.merchantLeave();

    const p = this.player;
    // 玩家效果
    for (const k of Object.keys(p.fx)) { p.fx[k] = Math.max(0, p.fx[k] - dt); if (p.fx[k] <= 0) delete p.fx[k]; }
    p.atkCd = Math.max(0, p.atkCd - dt); p.atkT = Math.max(0, p.atkT - dt); p.hitT = Math.max(0, p.hitT - dt);
    p.spdMul = 1;
    if (p.fx.speed) p.spdMul *= 1.5;
    if (p.fx.slow) p.spdMul *= .5;
    const boots = p.equip.feet && ITEMS[p.equip.feet]?.arm?.spd; if (boots) p.spdMul *= 1 + boots;
    if (this.phase === 'night' && p.skills.night_owl) p.spdMul *= 1 + p.skills.night_owl * .1;
    // 状态消耗
    const metaMul = 1 - (p.skills.metabolism || 0) * .1;
    const hot = this.weather === 'heat';
    p.hunger = Math.max(0, p.hunger - dt / 42 * metaMul);
    p.thirst = Math.max(0, p.thirst - dt / 34 * metaMul * (hot ? 1.6 : 1));
    if (!p.moving) p.energy = Math.min(100, p.energy + dt / 12); else p.energy = Math.max(0, p.energy - dt / 90);
    // 体温
    const biome = this.q.biomeAt(Math.floor(p.x), Math.floor(p.z));
    let temp = 18 + (BIOMES[biome]?.temp || 0) * .6 + SEASON_TEMP[this.seasonIdx()] * .8;
    if (this.phase === 'night') temp -= 6;
    if (this.weather === 'snow' || this.weather === 'blizzard') temp -= 8;
    if (hot) temp += 10;
    const warm = playerWarmth(p);
    const nearFire = this.buildings.some(b => BUILDINGS[b.id]?.warm && Math.hypot(b.x + .5 - p.x, b.z + .5 - p.z) < 4);
    if (nearFire) temp += 10;
    const comfort = temp + warm * 3;
    p.temp = Math.round(temp);
    if (comfort < 0) { p.hp -= dt * 1.2; if (this.rng() < dt * .2) this.toast('🥶 太冷了！靠近篝火或穿上保暖衣物'); }
    if (comfort > 45) { p.hp -= dt * 1.2; if (this.rng() < dt * .2) this.toast('🥵 太热了！去凉快点的地方'); }
    if (p.hunger <= 0 || p.thirst <= 0) p.hp -= dt * 1.5;
    if (p.hunger > 30 && p.thirst > 30 && p.hp < p.maxHp && comfort > 0 && comfort < 45) p.hp = Math.min(p.maxHp, p.hp + dt * .8);
    if (p.fx.burn) p.hp -= dt * 3;
    if (p.fx.poison) p.hp -= dt * 2;
    if (p.hp <= 0 && !p.dead) this.playerDown();
    // 钓鱼
    this.updateFishing(dt);
    // 农作物生长
    for (const b of this.buildings) {
      if (b.crop && b.crop.watered && b.crop.growth < 1) {
        if (CROPS[b.crop.id].seasons.includes(this.seasonIdx())) b.crop.growth = Math.min(1, b.crop.growth + dt / (CROPS[b.crop.id].days * CONFIG.DAY_LEN));
      }
    }
    // 资源重生
    const objArr = this.world.obj;
    for (let i = 0; i < objArr.length; i++) {
      const o = objArr[i];
      if (o && o.t > 0) { o.t -= dt; if (o.t <= 0 && o.regrowId) { objArr[i] = { id: o.regrowId, hp: WORLD_OBJECTS[o.regrowId].hp, t: 0, v: Math.floor(this.rng() * 3) }; } }
    }
    // 实体更新
    for (const e of this.entities) {
      if (e.dead) continue;
      if (e.kind === 'monster') {
        // 图鉴登记
        if (Math.abs(e.x - p.x) < 12 && !this.codex.monsters[e.type]) this.codex.monsters[e.type] = { seen: this.day, kills: 0 };
        // 状态效果
        if (e.burnT > 0) { e.burnT -= dt; e.hp -= dt * 4; if (e.hp <= 0) { this.killMonster(e, 'player'); continue; } }
        e.spdMul = e.slowT > 0 ? .5 : 1; if (e.slowT > 0) e.slowT -= dt;
        // 夜行怪白天消散
        if ((this.phase === 'day') && (e.night || e.raid) && !e.boss) { e.dead = true; continue; }
        if (Math.abs(e.x - p.x) < 32 || e.raid) updateMonster(this, e, dt);
      }
      else if (e.kind === 'animal') { if (Math.abs(e.x - p.x) < 40) updateAnimal(this, e, dt); }
      else if (e.kind === 'npc') {
        if (e.escorting) {
          // 护送中的幸存者：跟随玩家，抵达小镇即安顿
          const d = dist(e, p);
          if (Math.hypot(e.x - this.townCenter.x, e.z - this.townCenter.z) < CONFIG.TOWN_RADIUS * .6) {
            e.escorting = false;
            this.toast(`🏡 ${e.name} 在小镇安顿下来了！可在「小镇」面板为 TA 分配职业`);
            this.bus('recruit'); this.sfx('join');
          } else if (d > 1.8) {
            moveEntity(this, e, p.x - e.x, p.z - e.z, dt);
          } else e.moving = false;
        }
        else updateNPC(this, e, dt);
      }
      else if (e.kind === 'merchant') { /* 站桩 */ }
    }
    this.entities = this.entities.filter(e => !e.dead);
    // 夜行怪白天标记（防止残留）
    // 弹道/掉落/陨石
    for (const pr of this.projectiles) updateProjectile(this, pr, dt);
    this.projectiles = this.projectiles.filter(pr => !pr.dead);
    for (const d of this.drops) updateDrop(this, d, dt);
    this.drops = this.drops.filter(d => !d.dead);
    for (const mt of this.meteors) {
      mt.t -= dt;
      if (mt.t <= 0) { mt.dead = true; this.explode({ x: mt.x, z: mt.z, dmg: mt.dmg, from: 'monster', aoe: 2 }); }
    }
    this.meteors = this.meteors.filter(m => !m.dead);
    // 箭塔
    for (const b of this.buildings) {
      const def = BUILDINGS[b.id];
      if (def.tower) {
        b.cdT = (b.cdT || 0) - dt;
        if (b.cdT <= 0) {
          let tgt = null, bd = def.tower.range;
          for (const e of this.entities) if (e.kind === 'monster' && !e.dead) { const d = Math.hypot(e.x - b.x - .5, e.z - b.z - .5); if (d < bd) { bd = d; tgt = e; } }
          if (tgt) {
            b.cdT = def.tower.cd;
            const pr = this.spawnProjectile(b.x + .5, b.z + .5, tgt.x, tgt.z, b.id === 'tower_ballista' ? 'bolt' : 'arrow', def.tower.dmg * (this.buildings.some(x => x.id === 'statue_hero') ? 1.1 : 1), 'tower');
            this.sfx('shoot');
          }
        }
      }
      if (def.trap) {
        b.cdT = (b.cdT || 0) - dt;
        if (b.cdT <= 0) for (const e of this.entities) if (e.kind === 'monster' && !e.dead && Math.hypot(e.x - b.x - .5, e.z - b.z - .5) < .8) { b.cdT = def.trap.cd; this.hitEntity(this.player, e, def.trap.dmg, 'tower'); }
      }
      if (b.hitT > 0) b.hitT -= dt;
    }
    // 粒子/飘字
    for (const pa of this.particles) { pa.t += dt; pa.x += (pa.vx || 0) * dt; pa.z += (pa.vz || 0) * dt; pa.y = (pa.y || -10) - dt * 8; }
    this.particles = this.particles.filter(pa => pa.t < .8);
    for (const f of this.floaters) { f.life -= dt; f.y -= dt * 26; }
    this.floaters = this.floaters.filter(f => f.life > 0);
    // 刷怪
    this.ambientSpawn(dt);
    // 发现 POI
    for (const poi of this.pois) {
      if (!poi.discovered && Math.hypot(poi.x - p.x, poi.z - p.z) < 9) {
        poi.discovered = true;
        if (poi.type === 'altar') this.toast(`📍 发现了${poi.n}！可在此召唤 Boss`);
        if (poi.type === 'ruin') { this.toast(`📍 发现了${poi.n}！小心精英怪守卫`); this.bus('ruin'); this.spawnRuinGuards(poi); }
        if (poi.type === 'survivor') this.toast(`📍 发现了幸存者营地！上前对话`);
      }
    }
    // 小镇等级
    let score = 0;
    for (const b of this.buildings) { const c = BUILDINGS[b.id].cat; score += c === 'prod' ? 3 : c === 'farm' ? 2 : c === 'town' ? 5 : c === 'def' ? 3 : c === 'deco' ? 1 : 0; }
    let lv = 1;
    for (const tl of TOWN_LEVELS) if (this.settlerCount() >= tl.need[0] && score >= tl.need[1]) lv = tl.lv;
    if (lv > this.town.lv) {
      this.town.lv = lv;
      this.toast(`🏛️ 小镇升到 ${lv} 级！${TOWN_LEVELS[lv - 1].perk}`); this.sfx('level');
      this.bus('town_level');
    }
    this.town.pop = this.settlerCount();
    this.town.score = score;
    // 成就检查（节流）
    this.achT -= dt;
    if (this.achT <= 0) { this.achT = 2; this.checkAch(); }
    // 自动存档
    this.autosaveT += dt;
    if (this.autosaveT > 30) { this.autosaveT = 0; this.save(); }
  }

  spawnRuinGuards(poi) {
    const pool = ['skeleton', 'mummy', 'bog_lurker', 'yeti'];
    for (let i = 0; i < 3; i++) {
      const m = makeMonster(pool[poi.idx % 4], poi.x + (this.rng() - .5) * 5, poi.z + (this.rng() - .5) * 5, { hpMul: 1.5 });
      this.entities.push(m);
    }
  }

  summonBoss(bossId) {
    const poi = this.pois.find(x => x.type === 'altar' && x.id === bossId);
    if (!poi) return false;
    if (this.entities.some(e => e.boss)) { this.toast('已有 Boss 在场！'); return false; }
    const m = makeMonster(bossId, poi.x + .5, poi.z + .5, {});
    this.entities.push(m);
    this.toast(`👹 ${MONSTERS[bossId].n} 苏醒了！`); this.sfx('roar');
    return true;
  }

  // ---------- 交互 ----------
  interactTarget() {
    const p = this.player;
    let best = null, bd = 1.9;
    // 掉落物（自动拾取，无需目标）
    // 世界物体
    const tx = Math.floor(p.x), tz = Math.floor(p.z);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const x = tx + dx, z = tz + dz;
      if (!this.q.inBounds(x, z)) continue;
      const o = this.world.obj[z * this.world.W + x];
      if (o && o.id) {
        const d = Math.hypot(x + .5 - p.x, z + .5 - p.z);
        if (d < bd) { bd = d; best = { kind: 'obj', x: x + .5, z: z + .5, obj: o, tx: x, tz: z }; }
      }
      const b = this.buildingAt(x, z);
      if (b) {
        const d = Math.hypot(x + .5 - p.x, z + .5 - p.z);
        if (d < bd + .3) { bd = Math.min(bd, d); best = { kind: 'bld', x: x + .5, z: z + .5, b, tx: x, tz: z }; }
      }
    }
    // POI
    for (const poi of this.pois) {
      const d = Math.hypot(poi.x + .5 - p.x, poi.z + .5 - p.z);
      if (d < bd) {
        if (poi.type === 'altar') { bd = d; best = { kind: 'altar', x: poi.x + .5, z: poi.z + .5, poi }; }
        if (poi.type === 'chest' && !poi.opened) { bd = d; best = { kind: 'chest', x: poi.x + .5, z: poi.z + .5, poi }; }
        if (poi.type === 'survivor' && !poi.rescued) { bd = d; best = { kind: 'survivor', x: poi.x + .5, z: poi.z + .5, poi }; }
      }
    }
    // 商人
    if (this.town.merchant) {
      const d = Math.hypot(this.town.merchant.x - p.x, this.town.merchant.z - p.z);
      if (d < bd + .5) { best = { kind: 'merchant', x: this.town.merchant.x, z: this.town.merchant.z }; }
    }
    // 动物（饲料引诱）
    for (const e of this.entities) {
      if (e.kind === 'animal' && !e.follow && ['chicken', 'cow', 'sheep'].includes(e.type)) {
        const d = dist(e, p);
        if (d < bd) { bd = d; best = { kind: 'animal', x: e.x, z: e.z, e }; }
      }
    }
    // 幸存者跟随者（入镇）
    for (const e of this.entities) if (e.kind === 'npc' && e.escorting) best = { kind: 'escort', x: e.x, z: e.z, e };
    return best;
  }
  labelForTarget(t) {
    if (!t) return '';
    if (t.kind === 'obj') {
      const def = WORLD_OBJECTS[t.obj.id];
      const need = def.tool[1] > 0 ? def.tool : null;
      return def.n + (need ? `（需${{ axe: '斧', pick: '镐', shovel: '铲' }[need[0]] || ''}T${need[1]}）` : '');
    }
    if (t.kind === 'bld') {
      const def = BUILDINGS[t.b.id];
      if (def.door) return `${def.n}（${t.b.open ? '开启' : '关闭'}）`;
      if (def.bed) return def.n + '（睡觉）';
      if (def.station) return def.n + '（制作）';
      return def.n;
    }
    if (t.kind === 'altar') return `${t.poi.n}（召唤Boss）`;
    if (t.kind === 'chest') return t.poi.mimic ? '宝箱？' : t.poi.sealed ? '封印宝箱（需废墟钥匙）' : '宝箱';
    if (t.kind === 'survivor') return '幸存者（对话）';
    if (t.kind === 'merchant') return '商队老板（交易）';
    if (t.kind === 'animal') return `${ANIMALS[t.e.type].n}（用饲料引诱）`;
    if (t.kind === 'escort') return '幸存者（到达小镇后自动加入）';
    return '';
  }
  interact() {
    const t = this.target;
    if (!t) return false;
    const p = this.player;
    if (t.kind === 'obj') {
      const def = WORLD_OBJECTS[t.obj.id];
      const [kind, tier] = def.tool;
      if (kind) {
        const tool = bestTool(p.inv, kind);
        if (!tool || ITEMS[tool].tool.tier < tier) { this.toast(`需要${{ axe: '斧', pick: '镐', shovel: '铲' }[kind]}（T${tier}）`); return false; }
      }
      const dmg = 1 + (p.skills.sharp_tools || 0) * .2;
      t.obj.hp -= dmg; t.obj.hitT = .2;
      this.sfx(kind === 'axe' ? 'chop' : kind === 'pick' ? 'mine' : 'dig');
      this.particles.push({ x: t.x, z: t.z, y: -18, t: 0, kind: kind === 'axe' ? 'leaf' : 'spark', vx: (this.rng() - .5) * 2, vz: (this.rng() - .5) * 2 });
      if (t.obj.hp <= 0) {
        const rich = p.skills.rich_vein ? 1 + p.skills.rich_vein * .08 : 1;
        for (const [id, mn, mx, ch] of def.drops) {
          if (this.rng() < ch) this.spawnDrop(t.tx + .5, t.tz + .5, id, mn + Math.floor(this.rng() * (mx - mn + 1)));
          if (this.rng() < Math.min(.9, ch * (rich - 1))) this.spawnDrop(t.tx + .5, t.tz + .5, id, mn);
        }
        const regrow = def.regrow;
        this.world.obj[t.tz * this.world.W + t.tx] = regrow > 0 ? { regrowId: def.id, id: null, t: regrow } : null;
        this.bus('gather', def.drops[0][0], 0); // 计数走 spawnDrop 的 pickup
      }
      return true;
    }
    if (t.kind === 'bld') {
      const b = t.b, def = BUILDINGS[b.id];
      if (def.door) { b.open = !b.open; this.sfx('door'); return true; }
      if (def.bed) { this.trySleep(b); return true; }
      if (b.id === 'well') { this.drinkWater(true); return true; }
      if (b.id === 'board_recruit') {
        if (this.town.wandererWaiting) {
          if (p.coins >= 80) { p.coins -= 80; this.town.wandererWaiting = false; this.addSettler(this.randomName()); return true; }
          this.toast('金币不足（需要80）'); return false;
        }
        this.toast('暂无流浪者来访，请留意每日事件'); return false;
      }
      if (def.station) { this.openStation?.(def.station); return true; }
      if (b.id === 'plot_farm') {
        if (b.crop && b.crop.growth >= 1) { this.harvestCrop(b, false); return true; }
        // 自动种下背包里第一种可种种子
        for (const s of p.inv) if (s && ITEMS[s.id]?.seed) { if (this.plantSeed(b, s.id)) { this.toast(`种下了${CROPS[ITEMS[s.id].seed.crop].n}`); return true; } }
        this.toast('没有适合当前季节的种子');
        return false;
      }
      if (b.id === 'notice_board') { this.openPanel?.('daily'); return true; }
      return true;
    }
    if (t.kind === 'altar') {
      const boss = t.poi.id;
      const stat = this.stats['boss_' + boss];
      this.summonBoss(boss);
      return true;
    }
    if (t.kind === 'chest') {
      const poi = t.poi;
      if (poi.mimic) {
        poi.opened = true;
        const m = makeMonster('bog_lurker', poi.x + .5, poi.z + .5, { hpMul: 2, night: false });
        this.entities.push(m);
        this.toast('💥 是宝箱怪！'); this.sfx('roar');
        return true;
      }
      if (poi.sealed && !this.take('key_ruin', 1)) { this.toast('需要废墟钥匙（哥布林徽章+铜锭在铁砧打造）'); return false; }
      poi.opened = true; this.sfx('chest');
      const loot = [
        ['coins', 30 + Math.floor(this.rng() * 50)], ['bar_gold', 1 + Math.floor(this.rng() * 2)],
        ['crystal', 1 + Math.floor(this.rng() * 2)], ['book_skill', this.rng() < .2 ? 1 : 0],
      ];
      for (const [id, n] of loot) {
        if (id === 'coins') p.coins += n;
        else if (n > 0) this.give(id, n);
      }
      this.toast('🎁 打开了宝箱！（金币/金锭/水晶）');
      return true;
    }
    if (t.kind === 'survivor') {
      const poi = t.poi;
      poi.rescued = true;
      const npc = makeNPC(this.randomName(), poi.x + .5, poi.z + .5, 'none');
      npc.escorting = true;
      this.entities.push(npc);
      this.toast(`${npc.name}：谢谢你！请带我回你的小镇（我会跟着你）`);
      this.sfx('join');
      return true;
    }
    if (t.kind === 'merchant') { this.openPanel?.('trade'); return true; }
    if (t.kind === 'animal') {
      if (this.take('feed', 1)) { t.e.follow = true; this.toast(`${ANIMALS[t.e.type].n}被吸引了，把它带回对应的棚舍吧`); return true; }
      this.toast('需要饲料（小麦制作）');
      return false;
    }
    if (t.kind === 'escort') {
      this.toast('TA会一直跟着你，回到小镇中心附近就会安顿下来');
      return true;
    }
    return false;
  }
  drinkWater(fromWell) {
    const p = this.player;
    p.thirst = Math.min(100, p.thirst + (fromWell ? 40 : 25));
    this.toast(fromWell ? '🚰 喝了井水，神清气爽' : '💧 喝了清水');
    this.sfx('drink');
  }

  trySleep(b) {
    if (this.phase !== 'night' && this.dayTime < .5) { this.toast('现在还不困（夜晚才能睡觉）'); return false; }
    if (this.town.raidActive) { this.toast('怪物正在进攻，睡不着！'); return false; }
    const q = BUILDINGS[b.id].bed;
    this.dayTime = .02; this.day++; this.onNewDay();
    this.player.energy = q >= 2 ? 100 : Math.min(100, this.player.energy + 60);
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 25);
    this.player.hunger = Math.max(5, this.player.hunger - 12);
    this.player.thirst = Math.max(5, this.player.thirst - 12);
    this.toast('🛌 一觉到天亮！');
    this.sfx('sleep');
    return true;
  }

  // ---------- 吃东西/使用 ----------
  useItem(slotIdx) {
    const p = this.player;
    const slot = p.inv[slotIdx];
    if (!slot) return false;
    const it = ITEMS[slot.id];
    if (it.food) {
      p.hunger = Math.min(100, p.hunger + (it.food.h || 0));
      p.thirst = Math.min(100, p.thirst + (it.food.t || 0));
      p.energy = Math.min(100, p.energy + (it.food.e || 0));
      p.hp = Math.min(p.maxHp, p.hp + (it.food.hp || 0));
      if (it.fx === 'speed') p.fx.speed = 10;
      if (it.fx === 'str') p.fx.str = 10;
      if (it.fx === 'warm') p.fx.warm = CONFIG.DAY_LEN * .5;
      if (it.fx === 'cure') delete p.fx.poison, delete p.fx.burn;
      this.take(slot.id, 1);
      this.bus('eat'); this.sfx('eat');
      this.toast(`吃了 ${it.n}`);
      return true;
    }
    if (slot.id === 'book_skill') { this.take('book_skill', 1); p.skillPts++; this.toast('📖 研读技能书，+1 技能点'); this.sfx('level'); return true; }
    if (slot.id === 'map_treasure') {
      this.take('map_treasure', 1);
      for (let k = 0; k < 80; k++) {
        const x = Math.floor(this.rng() * this.world.W), z = Math.floor(this.rng() * this.world.H);
        if (!this.q.isWater(x, z) && Math.hypot(x - p.x, z - p.z) > 15) {
          this.pois.push({ type: 'chest', idx: 200 + this.pois.length, n: '宝藏', x, z, discovered: true, opened: false, sealed: false });
          this.toast(`🗺️ 藏宝图指向了小地图上的新标记！`);
          return true;
        }
      }
    }
    if (slot.id === 'waterskin') {
      const tx = Math.floor(p.x), tz = Math.floor(p.z);
      let near = this.q.isWater(tx + 2, tz) || this.q.isWater(tx - 2, tz) || this.q.isWater(tx, tz + 2) || this.q.isWater(tx, tz - 2);
      near = near || this.buildings.some(b => (b.id === 'well') && Math.hypot(b.x - tx, b.z - tz) < 3);
      if (near) { p.skinCharges = 3; this.toast('💧 灌满了水壶（可喝3次）'); return true; }
      this.toast('要在水边或水井旁才能灌水'); return false;
    }
    // 装备
    if (it.arm) { this.equip(slot.id); return true; }
    if (it.wpn) { this.equip(slot.id); return true; }
    this.toast('这个物品无法直接使用');
    return false;
  }
  equip(id) {
    const p = this.player, it = ITEMS[id];
    let slot = it.wpn ? 'hand' : it.arm.slot;
    if (slot === 'hand' && it.wpn?.proj) { /* 远程也占手 */ }
    p.equip[slot] = p.equip[slot] === id ? null : id;
    this.sfx('equip');
  }

  // ---------- 制作 ----------
  buildingUnlocked(id) {
    const u = BUILDINGS[id].unlock; if (!u) return true;
    if (u === 'town2') return this.town.lv >= 2;
    if (u === 'town3') return this.town.lv >= 3;
    if (u.startsWith('quest:m')) return this.mainIdx >= parseInt(u.slice(7));
    return true;
  }
  recipeUnlocked(r) {
    if (!r.unlock) return true;
    if (r.unlock === 'town2') return this.town.lv >= 2;
    if (r.unlock === 'town3') return this.town.lv >= 3;
    if (r.unlock.startsWith('quest:')) return this.mainIdx > parseInt(r.unlock.slice(6).slice(1));
    return true;
  }
  canCraft(r) {
    if (!this.recipeUnlocked(r)) return false;
    return r.in.every(([id, n]) => this.count(id) >= n);
  }
  craft(r) {
    if (!this.canCraft(r)) { this.toast(r.unlock && !this.recipeUnlocked(r) ? '尚未解锁（提升小镇等级）' : '材料不足'); return false; }
    for (const [id, n] of r.in) this.take(id, n);
    const n = r.out[1] || 1;
    if (!addItem(this.player.inv, r.out[0], n)) { this.toast('背包已满！'); for (const [id, m] of r.in) this.give(id, m); return false; }
    this.bus('craft', r.out[0], n);
    this.sfx('craft');
    this.toast(`制作了 ${ITEMS[r.out[0]].n}×${n}`);
    return true;
  }

  // ---------- 保存 ----------
  save(silent) {
    try {
      const p = this.player;
      const data = {
        v: this.version, seed: this.seed, day: this.day, dayTime: this.dayTime, weather: this.weather, time: this.time,
        player: { x: p.x, z: p.z, hp: p.hp, maxHp: p.maxHp, hunger: p.hunger, thirst: p.thirst, energy: p.energy, coins: p.coins, xp: p.xp, level: p.level, skillPts: p.skillPts, skills: p.skills, inv: p.inv, equip: p.equip, skinCharges: p.skinCharges },
        buildings: this.buildings.map(b => ({ id: b.id, x: b.x, z: b.z, hp: b.hp, open: b.open, crop: b.crop })),
        objDiff: (() => { const d = {}; const arr = this.world.obj; for (let i = 0; i < arr.length; i++) { const o = arr[i]; if (o === null) d[i] = 0; else if (o.regrowId) d[i] = { r: o.regrowId, t: o.t }; else if (o.hitT !== undefined || o.hp !== (WORLD_OBJECTS[o.id]?.hp)) d[i] = { hp: o.hp }; } return d; })(),
        pois: this.pois.map(x => ({ ...x })),
        npcs: this.entities.filter(e => e.kind === 'npc').map(e => ({ name: e.name, job: e.job, x: e.x, z: e.z, happiness: e.happiness, escorting: e.escorting })),
        housed: this.housedAnimals.map(h => ({ type: h.type, bx: h.b.x, bz: h.b.z, lastDay: h.lastDay })),
        town: { lv: this.town.lv, storage: this.town.storage, merchantDay: this.town.merchantDay, raidTonight: this.town.raidTonight },
        stats: this.stats, claimedSides: this.claimedSides, mainIdx: this.mainIdx, dailies: this.dailies,
        codex: this.codex, settings: this.settings, unlockedAch: this.unlockedAch ? [...this.unlockedAch] : [],
      };
      localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(data));
      if (!silent) this.toast('💾 已保存');
      return true;
    } catch (e) { console.error('save failed', e); return false; }
  }
  static load() {
    try {
      const raw = localStorage.getItem(CONFIG.SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  applySave(d) {
    const p = this.player;
    Object.assign(p, d.player);
    p.fx = {};
    this.day = d.day; this.dayTime = d.dayTime; this.weather = d.weather;
    this.buildings = []; this.buildMap.clear(); this.buildCounts = {};
    for (const b of d.buildings) this.placeBuildingRaw(b);
    for (const [k, v] of Object.entries(d.objDiff || {})) {
      const i = +k;
      if (v === 0) this.world.obj[i] = null;
      else if (v.r) this.world.obj[i] = { regrowId: v.r, id: null, t: v.t };
      else if (v.hp !== undefined) { const o = this.world.obj[i]; if (o) o.hp = v.hp; }
    }
    this.pois = d.pois;
    this.entities = this.entities.filter(e => e.kind === 'monster' || e.kind === 'animal');
    for (const n of d.npcs) {
      const npc = makeNPC(n.name, n.x, n.z, n.job);
      npc.happiness = n.happiness; npc.escorting = n.escorting;
      this.entities.push(npc);
    }
    this.housedAnimals = d.housed.map(h => ({ type: h.type, b: this.buildings.find(b => b.x === h.bx && b.z === h.bz), lastDay: h.lastDay })).filter(h => h.b);
    Object.assign(this.town, d.town);
    this.stats = d.stats || {}; this.claimedSides = d.claimedSides || []; this.mainIdx = d.mainIdx || 0; this.dailies = d.dailies || [];
    this.codex = d.codex || this.codex; this.settings = d.settings || this.settings;
    this.unlockedAch = new Set(d.unlockedAch || []);
    this.toast('📂 读取存档成功');
  }
  placeBuildingRaw(b) {
    const nb = { id: b.id, x: b.x, z: b.z, hp: b.hp, open: b.open, crop: b.crop, idx: this.buildings.length };
    this.buildings.push(nb);
    const key = b.z * 1000 + b.x;
    if (!this.buildMap.has(key)) this.buildMap.set(key, []);
    this.buildMap.get(key).push(nb);
    this.buildCounts[b.id] = (this.buildCounts[b.id] || 0) + 1;
  }
  wipeSave() { localStorage.removeItem(CONFIG.SAVE_KEY); }

  // ---------- 音效钩子 ----------
  sfx(name) { if (this.settings.sfx) this.sfxFn(name); }
  toast(msg) { this.toastFn(msg); }

  // ---------- 帮助查询 ----------
  findWorkObject(kind, tc, R) {
    for (let k = 0; k < 26; k++) {
      const x = Math.floor(tc.x + (this.rng() - .5) * R * 2), z = Math.floor(tc.z + (this.rng() - .5) * R * 2);
      if (!this.q.inBounds(x, z)) continue;
      const i = z * this.world.W + x;
      const o = this.world.obj[i];
      if (!o || o.regrowId) continue;
      if (kind === 'tree' && TREE_IDS.includes(o.id)) return { x, z, idx: i };
      if (kind === 'ore' && ORE_IDS.includes(o.id)) return { x, z, idx: i };
    }
    return null;
  }
  findFarmWork() {
    const plots = this.buildings.filter(b => b.id === 'plot_farm' && b.crop);
    const dry = plots.find(b => b.crop.growth < 1 && !b.crop.watered);
    if (dry) return { x: dry.x, z: dry.z };
    const ripe = plots.find(b => b.crop.growth >= 1);
    if (ripe) return { x: ripe.x, z: ripe.z };
    return null;
  }
}
