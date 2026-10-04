// ============================================================
// 世界生成：种子RNG + 分形噪声 + 生态区 + 资源点 + 兴趣点
// ============================================================
import { CONFIG, BIOMES, WORLD_OBJECTS } from './data.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 基于种子的平滑值噪声
function makeNoise(rng) {
  const P = new Uint8Array(512);
  const perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
  const fade = t => t * t * (3 - 2 * t);
  function n2(x, y) {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const tl = P[P[xi] + yi] / 255, tr = P[P[xi + 1] + yi] / 255;
    const bl = P[P[xi] + yi + 1] / 255, br = P[P[xi + 1] + yi + 1] / 255;
    const u = fade(xf), v = fade(yf);
    return (tl * (1 - u) + tr * u) * (1 - v) + (bl * (1 - u) + br * u) * v;
  }
  function fbm(x, y, oct = 3) {
    let v = 0, amp = .5, f = 1;
    for (let i = 0; i < oct; i++) { v += n2(x * f, y * f) * amp; amp *= .5; f *= 2; }
    return v / (1 - Math.pow(.5, oct)) * 1; // 归一化到~0..1
  }
  return { n2, fbm };
}

// 每个生态区的自然装饰权重表 [物体id, 权重]
const DECO_TABLE = {
  grass:   [['grass_tuft', 26], ['bush_berry', 6], ['bush_herb', 4], ['tree', 5], ['rock', 5], ['flower_patch', 5]],
  forest:  [['tree', 30], ['tree_big', 7], ['tree_pine', 8], ['bush_berry', 4], ['bush_herb', 4], ['mush_patch', 3], ['grass_tuft', 4], ['hive', 1], ['apple_tree', 3]],
  desert:  [['rock_sand', 7], ['cactus', 8], ['tree_dead', 2], ['sand_pile', 5], ['grass_tuft', 1]],
  snow:    [['tree_snow', 14], ['rock', 6], ['grass_tuft', 2]],
  swamp:   [['tree_swamp', 12], ['reeds', 8], ['mush_patch', 6], ['clay_pile', 5], ['bush_herb', 3]],
  volcano: [['rock', 6], ['sulfur', 6], ['obsidian', 2], ['ore_coal', 2]],
  sand:    [['reeds', 3], ['sand_pile', 4]],
};

export const BIOME_IDS = ['water', 'sand', 'grass', 'forest', 'desert', 'snow', 'swamp', 'volcano'];
const B = Object.fromEntries(BIOME_IDS.map((k, i) => [k, i]));

export function genWorld(seed) {
  const rng = mulberry32(seed);
  const noi = makeNoise(rng);
  const W = CONFIG.MAP_W, H = CONFIG.MAP_H;
  const biome = new Uint8Array(W * H);
  const variant = new Uint8Array(W * H);
  const obj = new Array(W * H).fill(null);       // {id, hp, t(重生计时), v(变体)}
  const pois = [];

  // ---- 生态区（纬度气候带 + 噪声扰动：北雪原-南火山，保证各大区块连片） ----
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const elev = noi.fbm(x * .045 + 100, z * .045 + 100, 4);
    const lat = z / H;
    const tN = Math.min(1, Math.max(0, lat * 1.35 - .18 + (noi.n2(x * .05 + 400, z * .05 + 400) - .5) * .5));
    const mN = noi.fbm(x * .03 + 800, z * .03 + 800, 3);
    let b;
    if (elev < 0.34) b = B.water;
    else if (tN < 0.28) b = B.snow;
    else if (tN >= 0.84 && mN < 0.5) b = B.volcano;
    else if (tN >= 0.62 && mN < 0.48) b = B.desert;
    else if (mN > 0.74 && elev < 0.5 && tN >= 0.3 && tN < 0.58) b = B.swamp;
    else if (mN > 0.56) b = B.forest;
    else b = B.grass;
    biome[z * W + x] = b;
    variant[z * W + x] = Math.floor(rng() * 3);
  }
  // 水边铺河岸沙
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
    const i = z * W + x;
    if (biome[i] === B.water) continue;
    if (biome[i - 1] === B.water || biome[i + 1] === B.water || biome[i - W] === B.water || biome[i + W] === B.water) {
      if (biome[i] !== B.volcano) biome[i] = B.sand;
    }
  }

  // ---- 城镇中心：靠近地图中心的可用草地 ----
  let center = { x: W >> 1, z: H >> 1 };
  outer: for (let r = 0; r < 40; r++) {
    for (let dz = -r; dz <= r; dz += 2) for (let dx = -r; dx <= r; dx += 2) {
      const x = (W >> 1) + dx, z = (H >> 1) + dz;
      let ok = true;
      for (let zz = z - 4; zz <= z + 4 && ok; zz++) for (let xx = x - 4; xx <= x + 4; xx++) {
        const b = biome[zz * W + xx];
        if (b === B.water || b === B.volcano || b === B.snow) { ok = false; break; }
      }
      if (ok) { center = { x, z }; break outer; }
    }
  }
  // 稀有生态区保底（噪声不利时也要保证沙漠/火山/沼泽成片存在）
  const cntBiome = b => { let n = 0; for (let i = 0; i < biome.length; i++) if (biome[i] === b) n++; return n; };
  const stamp = (b, zMin, zMax) => {
    for (let t = 0; t < 400; t++) {
      const x = 8 + Math.floor(rng() * (W - 16)), z = zMin + Math.floor(rng() * Math.max(1, zMax - zMin));
      if (Math.hypot(x - center.x, z - center.z) < 26) continue;
      const r = 9 + Math.floor(rng() * 5);
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dz * dz > r * r) continue;
        const xx = x + dx, zz = z + dz;
        if (xx < 3 || zz < 3 || xx >= W - 3 || zz >= H - 3) continue;
        biome[zz * W + xx] = b; // 覆盖水面：形成半岛/火山岛
      }
      return;
    }
  };
  if (cntBiome(B.volcano) < 500) stamp(B.volcano, Math.floor(H * .8), H - 6);
  if (cntBiome(B.desert) < 700) stamp(B.desert, Math.floor(H * .62), Math.floor(H * .9));
  if (cntBiome(B.swamp) < 500) stamp(B.swamp, Math.floor(H * .34), Math.floor(H * .62));
  // 中心强制开阔草地带（出生营地）
  for (let dz = -5; dz <= 5; dz++) for (let dx = -5; dx <= 5; dx++) {
    const i = (center.z + dz) * W + (center.x + dx);
    if (Math.hypot(dx, dz) < 3) biome[i] = B.grass;
    else if (biome[i] === B.water || biome[i] === B.volcano) biome[i] = B.grass;
  }

  // ---- 自然装饰物 ----
  function pickWeighted(table) {
    let sum = 0; for (const t of table) sum += t[1];
    let r = rng() * sum;
    for (const t of table) { r -= t[1]; if (r <= 0) return t[0]; }
    return table[0][0];
  }
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
    const i = z * W + x;
    const b = BIOME_IDS[biome[i]];
    if (b === 'water' || b === 'volcano' && rng() > .5) { if (b !== 'water') { /* 火山仍放少量 */ } }
    if (b === 'water') continue;
    const dCenter = Math.hypot(x - center.x, z - center.z);
    if (dCenter < 4.5) continue; // 城镇中心留空
    const table = DECO_TABLE[b]; if (!table) continue;
    const density = b === 'forest' ? .34 : b === 'swamp' ? .22 : b === 'grass' ? .13 : b === 'desert' ? .08 : b === 'snow' ? .12 : b === 'volcano' ? .12 : .05;
    if (rng() < density) {
      const oid = pickWeighted(table);
      if (WORLD_OBJECTS[oid]) obj[i] = { id: oid, hp: WORLD_OBJECTS[oid].hp, t: 0, v: Math.floor(rng() * 3) };
    }
  }

  // ---- 矿脉（噪声聚簇） ----
  function tryOre(x, z, id) {
    const i = z * W + x;
    if (obj[i] || biome[i] === B.water) return;
    const def = WORLD_OBJECTS[id];
    obj[i] = { id, hp: def.hp, t: 0, v: Math.floor(rng() * 3) };
  }
  for (let z = 2; z < H - 2; z++) for (let x = 2; x < W - 2; x++) {
    const i = z * W + x, b = BIOME_IDS[biome[i]];
    if (b === 'water' || b === 'sand') continue;
    const c = noi.fbm(x * .1 + 1600, z * .1 + 1600, 2);
    if (Math.hypot(x - center.x, z - center.z) < 8) continue;
    if (c > .72 && rng() < .5) tryOre(x, z, 'ore_copper');
    else if (c < .3 && rng() < .35) tryOre(x, z, 'ore_coal');
    else if ((b === 'forest' || b === 'snow') && c > .6 && rng() < .3) tryOre(x, z, 'ore_iron');
    else if ((b === 'volcano' || b === 'snow') && c < .22 && rng() < .22) tryOre(x, z, rng() < .5 ? 'ore_gold' : 'ore_crystal');
  }

  // ---- 兴趣点 ----
  function findBiomeSpot(targetBiome, minD, maxD, tries = 900) {
    for (let k = 0; k < tries; k++) {
      const x = 4 + Math.floor(rng() * (W - 8)), z = 4 + Math.floor(rng() * (H - 8));
      const d = Math.hypot(x - center.x, z - center.z);
      if (d < minD || d > maxD) continue;
      const b = BIOME_IDS[biome[z * W + x]];
      if (targetBiome) { if (b !== targetBiome) continue; }
      else if (b === 'water') continue;
      return { x, z };
    }
    return null;
  }
  function clearArea(s, r) {
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const i = (s.z + dz) * W + (s.x + dx);
      if (biome[i] === B.water) biome[i] = B.grass;
      obj[i] = null;
    }
  }
  // 三大祭坛
  const altars = [
    { boss: 'goblin_king', biome: 'forest', n: '哥布林祭坛' },
    { boss: 'ice_queen', biome: 'snow', n: '冰雪祭坛' },
    { boss: 'flame_lord', biome: 'volcano', n: '火焰祭坛' },
  ];
  for (const a of altars) {
    const s = findBiomeSpot(a.biome, 30, 78) || { x: 20, z: 20 };
    clearArea(s, 2);
    pois.push({ type: 'altar', id: a.boss, n: a.n, x: s.x, z: s.z, discovered: false });
  }
  // 四处废墟
  for (let r = 0; r < 4; r++) {
    const s = findBiomeSpot(['grass', 'forest', 'desert', 'swamp'][r], 22, 72) || { x: 30 + r * 20, z: 30 };
    clearArea(s, 3);
    // 废墟石柱环
    for (let dz = -2; dz <= 2; dz += 2) for (let dx = -2; dx <= 2; dx += 2) {
      if (Math.abs(dx) + Math.abs(dz) === 4) obj[(s.z + dz) * W + (s.x + dx)] = { id: 'ruin_pillar', hp: 99, t: 0, v: 0, decoObj: true };
    }
    pois.push({ type: 'ruin', idx: r, n: `古代废墟·${'一二三四'[r]}`, x: s.x, z: s.z, discovered: false });
  }
  // 幸存者 ×8
  for (let k = 0; k < 8; k++) {
    const s = findBiomeSpot(null, 18, 70) || { x: 40, z: 40 };
    pois.push({ type: 'survivor', idx: k, n: '幸存者', x: s.x, z: s.z, discovered: false, rescued: false });
  }
  // 野宝箱 ×8
  for (let k = 0; k < 8; k++) {
    const s = findBiomeSpot(null, 14, 72) || { x: 40, z: 40 };
    pois.push({ type: 'chest', idx: k, n: '宝箱', x: s.x, z: s.z, discovered: false, opened: false, sealed: k % 2 === 0 });
  }

  return { seed, W, H, biome, variant, obj, center, pois, noise: noi };
}

// ---- 地图查询工具（供引擎/测试共用） ----
export function makeQueries(world) {
  const { W, H, biome, obj } = world;
  const idx = (x, z) => z * W + x;
  return {
    idx,
    inBounds: (x, z) => x >= 0 && z >= 0 && x < W && z < H,
    biomeAt: (x, z) => BIOME_IDS[biome[idx(x, z)]],
    objAt: (x, z) => obj[idx(x, z)],
    isWater: (x, z) => biome[idx(x, z)] === B.water,
    hasBlockObj: (x, z) => { const o = obj[idx(x, z)]; return !!(o && WORLD_OBJECTS[o.id] && WORLD_OBJECTS[o.id].block); },
  };
}
