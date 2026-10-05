// ============================================================
// 实体：玩家 / 怪物AI / 动物 / 居民职业AI / 弹道 / 掉落物
// ============================================================
import { ITEMS, MONSTERS, ANIMALS, WORLD_OBJECTS, BUILDINGS, JOBS, CONFIG } from './data.js';

let NEXT_ID = 1;
export const newId = () => NEXT_ID++;

// ---------- 移动与碰撞 ----------
export function moveEntity(G, e, dx, dz, dt) {
  const spd = e.spd * (e.spdMul || 1);
  const len = Math.hypot(dx, dz) || 1;
  const nx = dx / len * spd * dt, nz = dz / len * spd * dt;
  if (!G.isBlockedFor(e, e.x + nx, e.z)) e.x += nx; else e.stuckX = (e.stuckX || 0) + 1;
  if (!G.isBlockedFor(e, e.x, e.z + nz)) e.z += nz; else e.stuckZ = (e.stuckZ || 0) + 1;
  e.moving = Math.abs(nx) + Math.abs(nz) > .001;
  if (e.moving) {
    const ax = Math.abs(dx), az = Math.abs(dz);
    e.dir = az > ax * 2 ? (dz > 0 ? 0 : 3) : (dx < 0 ? 1 : 2);
  }
}
export function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

// ---------- 玩家 ----------
export function makePlayer(x, z) {
  return {
    id: newId(), kind: 'player', x, z, r: .34, spd: 4.4, dir: 0, seed: Math.random(),
    hp: 100, maxHp: 100, hunger: 100, thirst: 100, energy: 100, temp: 20,
    coins: 15, xp: 0, level: 1, skillPts: 0, skills: {},
    inv: new Array(40).fill(null), equip: { head: null, body: null, feet: null, acc: null, hand: null },
    atkT: 0, atkCd: 0, moving: false, hitT: 0, skinCharges: 0, kills: 0,
    fx: {}, // speed/str/warm/poison 计时
    fishing: null, sleepT: 0, dead: false,
  };
}
export function xpNeed(lv) { return Math.floor(60 * Math.pow(lv, 1.35)); }

export function playerDefense(p) {
  let def = 0;
  for (const s of ['head', 'body', 'feet']) { const it = p.equip[s] && ITEMS[p.equip[s]]; if (it?.arm) def += it.arm.def; }
  if (p.equip.acc && ITEMS[p.equip.acc]?.arm) def += ITEMS[p.equip.acc].arm.def || 0;
  return def;
}
export function playerDmgMul(p) {
  let m = 1;
  if (p.fx.str > 0) m += .3;
  if (p.skills.power) m += p.skills.power * .08;
  const acc = p.equip.acc && ITEMS[p.equip.acc];
  if (acc?.arm?.dmgPct) m += acc.arm.dmgPct;
  return m;
}
export function playerWarmth(p) {
  let w = 0;
  for (const s of ['head', 'body', 'feet']) { const it = p.equip[s] && ITEMS[p.equip[s]]; if (it?.arm?.warm) w += it.arm.warm; }
  const acc = p.equip.acc && ITEMS[p.equip.acc];
  if (acc?.arm?.warm) w += acc.arm.warm;
  if (p.fx.warm > 0) w += 8;
  return w;
}

export function addItem(inv, id, n) {
  const stack = id === 'bomb' ? 20 : 99;
  for (const s of inv) if (s && s.id === id && s.n < stack) { const add = Math.min(n, stack - s.n); s.n += add; n -= add; if (n <= 0) return true; }
  for (let i = 0; i < inv.length; i++) if (!inv[i]) { if (n <= 0) return true; const add = Math.min(n, stack); inv[i] = { id, n: add }; n -= add; }
  return n <= 0;
}
export function countItem(inv, id) { let n = 0; for (const s of inv) if (s && s.id === id) n += s.n; return n; }
export function removeItem(inv, id, n) {
  if (countItem(inv, id) < n) return false;
  for (let i = 0; i < inv.length && n > 0; i++) {
    const s = inv[i];
    if (s && s.id === id) { const take = Math.min(s.n, n); s.n -= take; n -= take; if (s.n <= 0) inv[i] = null; }
  }
  return true;
}
export function bestTool(inv, kind) {
  let best = null, tier = 0;
  for (const s of inv) if (s && ITEMS[s.id]?.tool?.kind === kind && ITEMS[s.id].tool.tier > tier) { tier = ITEMS[s.id].tool.tier; best = s.id; }
  return best;
}

// ---------- 怪物 ----------
export function makeMonster(type, x, z, opts = {}) {
  const m = MONSTERS[type];
  const hpMul = opts.hpMul || 1;
  return {
    id: newId(), kind: 'monster', type, x, z, r: .38 * (m.size || 1), spd: m.spd, dir: 0,
    hp: m.hp * hpMul, maxHp: m.hp * hpMul, seed: Math.random(),
    state: 'wander', target: null, wanderT: Math.random() * 3, atkCd: 0, hitT: 0, atkT: 0,
    homeX: x, homeZ: z, spT: Math.random() * 5, // special timer
    raid: opts.raid || false, night: opts.night || m.night || false, moving: false,
    boss: !!m.boss, chargeT: 0, subT: 0,
  };
}
export function makeAnimal(type, x, z) {
  const a = ANIMALS[type];
  return {
    id: newId(), kind: 'animal', type, x, z, r: .3, spd: a.spd, dir: 0, seed: Math.random(),
    hp: a.hp, maxHp: a.hp, wanderT: Math.random() * 3, fleeT: 0, hitT: 0, moving: false,
    follow: false, housed: false,
  };
}
export function makeNPC(name, x, z, job) {
  return {
    id: newId(), kind: 'npc', name, job: job || 'none', x, z, r: .32, spd: 3.4, dir: 0, seed: Math.random(),
    hp: 80, maxHp: 80, happiness: 70, wanderT: Math.random() * 4, workT: 0, target: null,
    atkCd: 0, atkT: 0, hitT: 0, moving: false, talkT: 0, effMul: 1,
  };
}

// ---------- 怪物 AI ----------
export function updateMonster(G, e, dt) {
  const m = MONSTERS[e.type];
  e.atkCd = Math.max(0, e.atkCd - dt); e.hitT = Math.max(0, e.hitT - dt); e.atkT = Math.max(0, e.atkT - dt);
  const p = G.player;
  const dp = dist(e, p);

  // 被动生物
  if (m.passive) {
    e.wanderT -= dt;
    if (m.special === 'flee') { // 宝藏地精：一直逃离玩家
      const d = dist(e, p);
      if (d < 14) { moveEntity(G, e, e.x - p.x, e.z - p.z, dt); }
      else e.moving = false;
      return;
    }
    if (e.wanderT <= 0) { e.wanderT = 2 + Math.random() * 3; e.wx = e.homeX + (Math.random() - .5) * 8; e.wz = e.homeZ + (Math.random() - .5) * 8; }
    if (e.fleeT > 0) { e.fleeT -= dt; moveEntity(G, e, e.x - p.x, e.z - p.z, dt * 1.6); }
    else if (e.wx != null && dist(e, { x: e.wx, z: e.wz }) > .5) moveEntity(G, e, e.wx - e.x, e.wz - e.z, dt * .5);
    else e.moving = false;
    return;
  }

  // 选择目标：玩家 / 守卫NPC / 袭击时打建筑
  let target = null;
  if (!p.dead && dp < m.aggro) target = p;
  if (!target && (e.raid || dist(e, G.townCenter) < CONFIG.TOWN_RADIUS)) {
    let best = null, bd = e.raid ? 99 : 7;
    for (const o of G.entities) {
      if (o.kind === 'npc' && (o.job === 'guard' || e.raid)) { const d = dist(e, o); if (d < bd) { bd = d; best = o; } }
    }
    target = best;
  }

  // 深度冻结：太远且非袭击时休眠（性能）
  if (!target && dp > 26 && !e.raid) { e.moving = false; return; }

  if (target) {
    const d = dist(e, target);
    const range = m.ranged || (m.special === 'charge' ? 1.6 : 1.05 + e.r);
    if (m.special === 'charge' && e.chargeT === 0 && d < 5 && d > 1.6 && Math.random() < dt * .5) { e.chargeT = 1; e.chargeDir = { x: target.x - e.x, z: target.z - e.z }; }
    if (e.chargeT > 0) { // 冲锋
      e.chargeT -= dt;
      moveEntity(G, e, e.chargeDir.x, e.chargeDir.z, dt * 2.6);
      if (d < 1.1 && e.atkCd <= 0) { e.atkCd = 1; G.hitEntity(e, target, m.dmg * 1.4); }
      return;
    }
    if (d > range) moveEntity(G, e, target.x - e.x, target.z - e.z, dt);
    else {
      e.moving = false;
      // 面向目标
      e.dir = Math.abs(target.x - e.x) > Math.abs(target.z - e.z) * 2 ? (target.x > e.x ? 2 : 1) : (target.z > e.z ? 0 : 3);
      if (m.ranged) {
        if (e.atkCd <= 0 && d < m.ranged) {
          e.atkCd = m.boss ? 1.6 : 2.2; e.atkT = .3;
          const kind = e.type === 'banshee' ? 'ice' : e.type === 'ice_queen' ? 'ice' : e.type === 'demon_imp' ? 'fire' : 'bolt';
          G.spawnProjectile(e.x, e.z, target.x, target.z, kind, m.dmg, 'monster', e.type === 'ice_queen' || e.type === 'banshee' ? 'slow' : (e.type === 'demon_imp' ? 'burn' : null));
        }
      } else if (e.atkCd <= 0) {
        e.atkCd = m.boss ? 1.4 : 1.1; e.atkT = .25;
        G.hitEntity(e, target, m.dmg);
      }
    }
    // 袭击时破坏挡路建筑（被摧毁不返还材料）
    if (e.raid && d > range) {
      const b = G.buildingNear(e.x, e.z, 1.4);
      if (b && BUILDINGS[b.id]?.hp && !BUILDINGS[b.id].walk) { e.atkCd = Math.max(e.atkCd, .8); G.damageBuilding(b, m.dmg * dt * 1.5, true); e.atkT = .2; }
    }
  } else {
    // 游荡
    e.wanderT -= dt;
    if (e.wanderT <= 0) {
      e.wanderT = 2 + Math.random() * 4;
      const rad = e.raid ? 30 : 7;
      e.wx = e.homeX + (Math.random() - .5) * rad; e.wz = e.homeZ + (Math.random() - .5) * rad;
      if (e.raid) { e.wx = G.townCenter.x + (Math.random() - .5) * 6; e.wz = G.townCenter.z + (Math.random() - .5) * 6; }
    }
    if (e.wx != null && dist(e, { x: e.wx, z: e.wz }) > .6) moveEntity(G, e, e.wx - e.x, e.wz - e.z, dt * .6);
    else e.moving = false;
  }

  // Boss 特殊技能
  if (m.boss) {
    e.spT -= dt;
    if (e.spT <= 0) {
      e.spT = m.special === 'meteor' ? 7 : m.special === 'ring' ? 6 : m.special === 'all' ? 5 : 8;
      if ((m.special === 'summon' || m.special === 'all') && G.entities.filter(x => x.kind === 'monster').length < 40) {
        const n = e.type === 'treant_ancient' ? 3 : 2;
        for (let i = 0; i < n; i++) {
          const t2 = e.type === 'goblin_king' ? (Math.random() < .5 ? 'goblin' : 'goblin_archer') :
            e.type === 'ice_queen' ? 'slime_ice' : e.type === 'flame_lord' ? 'bat_fire' : 'treant_sap';
          const mon = makeMonster(t2, e.x + (Math.random() - .5) * 4, e.z + (Math.random() - .5) * 4, { night: true });
          G.entities.push(mon);
        }
        G.sfx('roar'); G.floaters.push({ x: e.x, z: e.z, y: -50, text: '召唤仆从！', color: '#c86ae8', life: 1.2, big: true });
      }
      if (m.special === 'ring' || m.special === 'all') {
        for (let i = 0; i < 10; i++) {
          const a = i / 10 * Math.PI * 2;
          G.spawnProjectile(e.x, e.z, e.x + Math.cos(a) * 6, e.z + Math.sin(a) * 6, 'ice', m.dmg * .7, 'monster', 'slow');
        }
        G.sfx('roar');
      }
      if (m.special === 'meteor' || m.special === 'all') {
        for (let i = 0; i < 3; i++) G.spawnMeteor(e.x + (Math.random() - .5) * 8, e.z + (Math.random() - .5) * 8, m.dmg);
      }
    }
  }
  // 暗影瞬移
  if (m.special === 'teleport' && target && d > 4 && Math.random() < dt * .3) {
    e.x = target.x + (Math.random() - .5) * 3; e.z = target.z + (Math.random() - .5) * 3;
    G.particles && G.particles.push({ x: e.x, z: e.z, t: 0, kind: 'tp' });
  }
}

// ---------- 动物 ----------
export function updateAnimal(G, e, dt) {
  e.hitT = Math.max(0, e.hitT - dt);
  e.wanderT -= dt;
  if (e.fleeT > 0) {
    e.fleeT -= dt;
    const th = e.threat; if (th) moveEntity(G, e, e.x - th.x, e.z - th.z, dt * 1.4);
    return;
  }
  if (e.follow) { // 被饲料引诱
    const p = G.player;
    const d = dist(e, p);
    if (d > 1.4) moveEntity(G, e, p.x - e.x, p.z - e.z, dt);
    else e.moving = false;
    return;
  }
  if (e.wanderT <= 0) { e.wanderT = 2 + Math.random() * 4; e.wx = e.homeX + (Math.random() - .5) * 6; e.wz = e.homeZ + (Math.random() - .5) * 6; }
  if (e.wx != null && dist(e, { x: e.wx, z: e.wz }) > .4) moveEntity(G, e, e.wx - e.x, e.wz - e.z, dt * .4);
  else e.moving = false;
}

// ---------- 居民 ----------
export function updateNPC(G, e, dt) {
  e.atkCd = Math.max(0, e.atkCd - dt); e.atkT = Math.max(0, e.atkT - dt); e.hitT = Math.max(0, e.hitT - dt);
  e.talkT = Math.max(0, e.talkT - dt);
  // 随机闲聊气泡
  if (e.say) { e.say.t -= dt; if (e.say.t <= 0) e.say = null; }
  else if (Math.random() < dt * .05) {
    const lines = {
      lumberjack: ['这些木头真不错', '今天也要努力伐木！', '森林里空气真好~'],
      miner: ['叮叮当当~', '我闻到矿脉的味道了', '石头石头好石头'],
      farmer: ['庄稼长得不错', '要下雨就好了', '新鲜的蔬菜最棒了'],
      cook: ['咕嘟咕嘟炖着呢', '谁饿了？马上开饭！', '今天的汤特别香'],
      guard: ['一切安全！', '有我在，别怕', '夜里要格外小心'],
      medic: ['身体是拓荒的本钱', '受伤了来找我', '多喝热水'],
      none: ['小镇真舒服呀', '今天天气真好', '要是有一块蛋糕就好了', '听说北边雪山很危险'],
    };
    const pool = lines[e.job] || lines.none;
    e.say = { text: pool[Math.floor(Math.random() * pool.length)], t: 3 };
  }
  const tc = G.townCenter, R = CONFIG.TOWN_RADIUS;
  const eff = (1 + (G.player.skills.mayor || 0) * .1) * (e.happiness / 70);
  e.workT -= dt;

  const goTarget = (tx, tz, done, speedMul = 1) => {
    const d = Math.hypot(tx - e.x, tz - e.z);
    if (d > .9) moveEntity(G, e, tx - e.x, tz - e.z, dt * speedMul);
    else { e.moving = false; done && done(); }
  };

  switch (e.job) {
    case 'lumberjack': case 'miner': {
      if (!e.target || e.target.done) {
        e.target = G.findWorkObject(e.job === 'lumberjack' ? 'tree' : 'ore', tc, R);
        if (!e.target) { wanderNPC(G, e, dt); return; }
      }
      const t = e.target;
      goTarget(t.x + .7, t.z + .7, () => {
        if (e.workT <= 0) {
          e.workT = 1.6 / eff; e.atkT = .3;
          const obj = G.world.obj[t.idx];
          if (!obj) { e.target = null; return; }
          obj.hp -= 1; obj.hitT = .2; G.sfx(e.job === 'lumberjack' ? 'chop' : 'mine');
          G.particles && G.particles.push({ x: t.x + .5, z: t.z + .5, t: 0, kind: 'hit' });
          if (obj.hp <= 0) {
            const def = WORLD_OBJECTS[obj.id];
            for (const [id, mn, mx, ch] of def.drops) if (Math.random() < ch) G.addStorage(id, Math.floor(mn + Math.random() * (mx - mn + 1)));
            // 留下会重生的树桩，避免居民把资源砍绝
            const stump = def.regrow > 0 ? { regrowId: obj.id, id: null, t: def.regrow } : null;
            G.world.obj[t.idx] = stump;
            if (stump) G.regrowSet.add(t.idx);
            e.target = null; G.bus('npc_work', e.job);
          }
        }
      });
      break;
    }
    case 'farmer': {
      if (!e.target) { e.target = G.findFarmWork(); if (!e.target) { wanderNPC(G, e, dt); return; } }
      const t = e.target;
      goTarget(t.x + .5, t.z + .5, () => {
        if (e.workT <= 0) {
          e.workT = 2 / eff;
          const b = G.buildingAt(t.x, t.z);
          if (!b || !b.crop) { e.target = null; return; }
          if (b.crop.growth >= 1) {
            G.harvestCrop(b, true); e.target = null;
          } else {
            b.crop.watered = true; e.atkT = .3; G.particles && G.particles.push({ x: t.x + .5, z: t.z + .5, t: 0, kind: 'drop' });
            e.target = null;
          }
        }
      });
      break;
    }
    case 'cook': {
      if (!e.target) {
        const has = G.town.storage;
        const raw = has.find(s => s && ['meat_raw', 'fish_crucian', 'fish_carp', 'fish_catfish', 'fish_trout'].includes(s.id));
        const pot = G.buildings.find(b => b.id === 'pot_cook');
        if (raw && pot) e.target = { kind: 'cook', x: pot.x, z: pot.z, item: raw.id };
        else { wanderNPC(G, e, dt); return; }
      }
      goTarget(e.target.x + .8, e.target.z + .8, () => {
        if (e.workT <= 0) {
          e.workT = 3 / eff;
          if (G.takeStorage(e.target.item, 1)) {
            const out = e.target.item === 'meat_raw' ? 'meat_cooked' : 'fish_soup';
            G.addStorage(out, 1); G.bus('cook', out); G.sfx('cook');
            G.particles && G.particles.push({ x: e.x, z: e.z, t: 0, kind: 'yummy' });
          }
          e.target = null;
        }
      });
      break;
    }
    case 'guard': {
      let tgt = null, bd = 8;
      for (const mo of G.entities) if (mo.kind === 'monster') { const d = dist(e, mo); if (d < bd) { bd = d; tgt = mo; } }
      if (tgt) {
        if (bd > 1.1) moveEntity(G, e, tgt.x - e.x, tgt.z - e.z, dt);
        else {
          e.moving = false;
          if (e.atkCd <= 0) { e.atkCd = .9; e.atkT = .25; G.hitEntity(e, tgt, 14 + G.town.lv * 2, 'guard'); }
        }
      } else wanderNPC(G, e, dt, tc, 10);
      break;
    }
    case 'medic': {
      let tgt = null, bd = 6;
      if (G.player.hp < G.player.maxHp) tgt = G.player;
      for (const o of G.entities) if (o.kind === 'npc' && o.hp < o.maxHp) { const d = dist(e, o); if (d < bd) { bd = d; tgt = o; } }
      if (tgt) {
        if (dist(e, tgt) > 2.2) moveEntity(G, e, tgt.x - e.x, tgt.z - e.z, dt);
        else { e.moving = false; tgt.hp = Math.min(tgt.maxHp, tgt.hp + 4 * dt); }
      } else wanderNPC(G, e, dt);
      break;
    }
    default: wanderNPC(G, e, dt);
  }
}
function wanderNPC(G, e, dt, anchor, radius = 6) {
  const a = anchor || G.townCenter;
  e.wanderT -= dt;
  if (e.wanderT <= 0) { e.wanderT = 2 + Math.random() * 4; e.wx = a.x + (Math.random() - .5) * radius * 2; e.wz = a.z + (Math.random() - .5) * radius * 2; }
  if (e.wx != null && Math.hypot(e.wx - e.x, e.wz - e.z) > .6) moveEntity(G, e, e.wx - e.x, e.wz - e.z, dt * .5);
  else e.moving = false;
}

// ---------- 掉落物 ----------
export function updateDrop(G, d, dt) {
  d.t += dt;
  const p = G.player;
  const dd = Math.hypot(d.x - p.x, d.z - p.z);
  if (d.t > .4 && dd < 1.6) { // 磁吸
    d.x += (p.x - d.x) * dt * 8; d.z += (p.z - d.z) * dt * 8;
  }
  if (d.t > .4 && dd < .55) {
    if (addItem(p.inv, d.item, d.n)) {
      d.dead = true; G.sfx('pick'); G.bus('gather', d.item, d.n);
      G.floaters.push({ x: p.x, z: p.z, y: -40, text: `+${d.n} ${ITEMS[d.item]?.n || d.item}`, color: '#ffe08a', life: .9 });
    }
  }
  if (d.t > 300) d.dead = true;
}

// ---------- 弹道 ----------
export function updateProjectile(G, pr, dt) {
  pr.x += pr.vx * dt; pr.z += pr.vz * dt; pr.life -= dt;
  if (pr.life <= 0) { if (pr.aoe) G.explode(pr); pr.dead = true; return; }
  if (pr.kind === 'bomb') { pr.vy -= 9 * dt; pr.h += pr.vy * dt; if (pr.h <= 0) { G.explode(pr); pr.dead = true; return; } }
  // 命中判定
  if (pr.from === 'player' || pr.from === 'tower') {
    for (const e of G.entities) {
      if (e.kind !== 'monster') continue;
      if (Math.hypot(e.x - pr.x, e.z - pr.z) < e.r + .35) {
        if (pr.aoe) G.explode(pr); else G.hitEntity(pr.owner || G.player, e, pr.dmg, pr.from, pr.effect);
        pr.dead = true; return;
      }
    }
  } else {
    const p = G.player;
    if (!p.dead && Math.hypot(p.x - pr.x, p.z - pr.z) < p.r + .35) { G.hitPlayer(pr.dmg, pr.effect); pr.dead = true; return; }
    for (const o of G.entities) if (o.kind === 'npc' && Math.hypot(o.x - pr.x, o.z - pr.z) < .6) { G.hitEntity(null, o, pr.dmg); pr.dead = true; return; }
  }
}

// ---------- 玩家攻击 ----------
export function playerAttack(G, p) {
  const w = p.equip.hand && ITEMS[p.equip.hand];
  const wpn = w?.wpn || ITEMS.stick.wpn;
  if (p.atkCd > 0) return;
  const spdMul = 1 - (p.skills.swift || 0) * .08;
  p.atkCd = wpn.cd * spdMul; p.atkT = .22;
  const dmgBase = wpn.dmg * playerDmgMul(p);
  G.sfx('swing');
  if (wpn.proj) {
    const r = wpn.range;
    const dx = p.dir === 1 ? -1 : p.dir === 2 ? 1 : 0, dz = p.dir === 0 ? 1 : -1;
    let tx = p.x + dx * r, tz = p.z + dz * r;
    // 朝最近敌人修正
    let best = null, bd = r + 1;
    for (const e of G.entities) if (e.kind === 'monster') { const d = dist(p, e); if (d < bd) { bd = d; best = e; } }
    if (best) { tx = best.x; tz = best.z; }
    const kind = wpn.proj === 'arrow' ? 'arrow' : wpn.proj;
    const pr = G.spawnProjectile(p.x, p.z, tx, tz, kind, dmgBase, 'player', wpn.effect, wpn.aoe);
    pr.owner = p;
    if (wpn.proj === 'arrow' && countItem(p.inv, 'wood') > 0 && Math.random() < .5) {} // 箭免耗材，保持轻松
    if (p.equip.hand === 'bomb') { removeItem(p.inv, 'bomb', 1); G.autoUnequipIfEmpty('bomb'); }
    return;
  }
  // 近战扇形
  const dx = p.dir === 1 ? -1 : p.dir === 2 ? 1 : 0, dz = p.dir === 0 ? 1 : p.dir === 3 ? -1 : 0;
  let hitAny = false;
  for (const e of G.entities) {
    if (e.kind !== 'monster') continue;
    const ex = e.x - p.x, ez = e.z - p.z;
    const d = Math.hypot(ex, ez);
    if (d < wpn.range + e.r && (ex * dx + ez * dz) / (d || 1) > .3) {
      let dmg = dmgBase;
      const acc = p.equip.acc && ITEMS[p.equip.acc];
      if (acc?.arm?.vsGob && e.type.startsWith('goblin')) dmg *= 1 + acc.arm.vsGob;
      G.hitEntity(p, e, dmg, 'player', wpn.effect);
      // 击退
      e.x += ex / (d || 1) * .25; e.z += ez / (d || 1) * .25;
      hitAny = true;
    }
  }
  if (hitAny) G.sfx('hit');
}
