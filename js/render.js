// ============================================================
// 等距渲染器 v2：AI高清sprite + 预渲染地形缓存 + 光照天气
// ============================================================
import { CONFIG, BIOMES, WORLD_OBJECTS, BUILDINGS, ITEMS, MONSTERS, ANIMALS, PETS } from './data.js';
import { drawSpr, hasSpr } from './assets.js';

const G_PETS = PETS;

const TW = CONFIG.TILE_W, TH = CONFIG.TILE_H;
// 地形分块缓存（16×16格/块）。等距局部角点 x∈[-480,+480]，OX=544 把负半区平移进画布
const CHUNK = 16, OX = CHUNK * TW / 2 + TW / 2, CPADX = OX, CPADY = TH + 16;
const CHUNK_W = OX + CHUNK * TW / 2 + TW;   // 1120
const CHUNK_H = CHUNK * TH + CPADY * 2;     // 596

export function worldToScreen(wx, wz) { return { x: (wx - wz) * TW / 2, y: (wx + wz) * TH / 2 }; }

function diamondPath(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2); ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x, y + h / 2); ctx.lineTo(x - w / 2, y); ctx.closePath();
}
function ell(ctx, x, y, rx, ry, color, alpha = .22) {
  ctx.fillStyle = color; ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

// ============================================================
// 各类 sprite 的游戏内显示高度（px）
// ============================================================
const SPRITE_H = {
  tree: 94, tree_big: 132, tree_pine: 98, tree_snow: 98, tree_swamp: 94, tree_dead: 78, apple_tree: 94, cactus: 66,
  rock: 56, rock_sand: 54, ore_copper: 60, ore_iron: 60, ore_gold: 60, ore_crystal: 60, ore_coal: 58, obsidian: 58, sulfur: 50,
  meteor: 62, ruin_pillar: 86,
  bush_berry: 46, bush_herb: 42, reeds: 48, mush_patch: 38, sand_pile: 42, clay_pile: 42, hive: 46,
  campfire: 58, torch: 68, wall_wood: 74, wall_stone: 78, fence: 54, gate_wood: 86, gate_stone: 90,
  bed_straw: 46, bed_wood: 50, storage_wood: 54, storage_stone: 70, bench_work: 60, furnace: 74, anvil: 46, pot_cook: 62, sawmill: 64,
  well: 78, coop: 64, barn: 86, hut_wood: 98, hut_stone: 106, board_recruit: 68, market: 86, post: 84, notice_board: 58,
  tower_arrow: 94, tower_ballista: 102, spikes: 38, flower_bed: 42, lamp_post: 90, bench_park: 38, fountain: 90, statue_hero: 98, altar_ancient: 102,
  slime: 48, slime_ice: 48, slime_lava: 48, boar: 58, wolf: 56, rabbit_mob: 38, goblin: 60, goblin_archer: 60, spider: 52,
  treant_sap: 66, mush_toxic: 46, croc: 58, bog_lurker: 68, scorpion: 50, mummy: 62, sandworm: 68, yeti: 72, banshee: 68,
  bat_fire: 46, demon_imp: 56, demon_lava: 76, skeleton: 60, zombie: 60, shadow: 62,
  goblin_king: 110, ice_queen: 114, flame_lord: 118, treant_ancient: 130,
  sand_cobra: 60, frost_owl: 48, rock_golem: 88,
  chicken: 40, cow: 62, sheep: 52, deer: 58,
  player: 68, npc_worker: 68, npc_guard: 70, npc_medic: 68, merchant: 68,
};
const hOf = id => SPRITE_H[id] || 60;

// ============================================================
// 物品图标（UI 用，程序绘制）
// ============================================================
export function drawItemIcon(ctx, id, s) {
  const it = ITEMS[id]; if (!it) return;
  const c = ctx; c.save();
  const col = {
    wood: '#a8763e', stone: '#9aa3ad', fiber: '#7cc95c', resin: '#e8a13c', plank: '#d0a05c',
    sand: '#ecd9a4', clay: '#b3714f', leather: '#a56a3c', bone: '#e8e2d0', feather: '#f2f2f2',
    wool: '#f7f3ea', silk: '#dfe8f2', pelt: '#c9a37a', fang: '#f5efdd', chitin: '#8a7a5c',
    herb: '#5cb85c', ginseng: '#d45c5c', honey: '#f0b429', apple: '#e05c5c', berry: '#c04fc0',
    mushroom: '#d98c6a', chili: '#e04530', wheat: '#e0c060', flour: '#f2ead8', carrot: '#f08c3c',
    pumpkin: '#e08828', egg: '#f7f0dc', milk: '#fdfeff', meat_raw: '#e07070', coal: '#4a4a52',
    obsidian: '#3a3444', sulfur: '#e8d84c', nail: '#8a97a5', rope: '#c9a868', cloth: '#e8d8c0',
    gear: '#b8c2cc', crystal: '#7cd8e8', glass: '#cdeef5', brick: '#c96a4a',
  }[id] || (it.c === 'food' ? '#f0b46a' : it.c === 'weapon' ? '#c9d4e0' : it.c === 'armor' ? '#a8b6c9' : it.c === 'seed' ? '#d8c88a' : it.c === 'fish' ? '#7cb8d8' : '#ccc');
  const kind =
    (it.tool?.kind === 'axe') ? 'axe' : (it.tool?.kind === 'pick') ? 'pick' : (it.tool?.kind === 'rod') ? 'rod' :
    (it.tool?.kind === 'shovel') ? 'shovel' : (it.tool?.kind === 'skin') ? 'flask' : (it.tool?.kind === 'feed' || it.tool?.kind === 'bait') ? 'pouch' : (it.tool?.kind === 'light') ? 'lantern' :
    (it.c === 'weapon' && it.wpn?.proj === 'arrow') ? 'bow' : (it.c === 'weapon' && it.wpn?.proj) ? 'staff' : it.c === 'weapon' ? 'sword' :
    it.c === 'armor' ? 'armor' : it.c === 'seed' ? 'seed' : it.c === 'fish' ? 'fish' :
    id.startsWith('potion') ? 'flask' : id === 'antidote' ? 'flask' :
    id.startsWith('ore_') ? 'ore' : id === 'crystal' ? 'crystal' : id === 'coal' ? 'ore' : (id === 'bar_copper' || id === 'bar_iron' || id === 'bar_gold') ? 'bar' :
    (id === 'wood' || id === 'plank') ? 'plank' : (id === 'stone' || id === 'brick') ? 'rock' : (id === 'meat_raw' || id === 'meat_cooked' || id === 'jerky') ? 'meat' :
    (id === 'berry' || id === 'chili' || id === 'apple') ? 'fruit' : (id === 'bread' || id === 'honey_cookie' || id === 'cake') ? 'bread' :
    id.startsWith('fish_') ? 'fish' : id === 'key_ruin' ? 'key' : id === 'book_skill' ? 'book' : id === 'map_treasure' ? 'map' : id.startsWith('trophy') ? 'trophy' : id === 'egg' ? 'egg' : 'res';
  const oreCol = { ore_copper: '#e0884c', ore_iron: '#b8c2cc', ore_gold: '#f0c84c', crystal: '#7cd8e8', coal: '#3c3c44', obsidian: '#3a3444', sulfur: '#e8d84c' }[id] || col;
  const barCol = { bar_copper: '#e0884c', bar_iron: '#c2ccd8', bar_gold: '#f0c84c' }[id] || col;
  c.lineWidth = Math.max(1, s * .08); c.strokeStyle = 'rgba(60,45,25,.55)'; c.lineJoin = 'round'; c.lineCap = 'round';
  switch (kind) {
    case 'axe': c.strokeStyle = '#a8763e'; c.lineWidth = s * .14; c.beginPath(); c.moveTo(-s * .28, s * .32); c.lineTo(s * .18, -s * .3); c.stroke(); c.fillStyle = col; c.beginPath(); c.moveTo(s * .08, -s * .4); c.lineTo(s * .42, -s * .18); c.lineTo(s * .22, s * .02); c.closePath(); c.fill(); break;
    case 'pick': c.strokeStyle = '#a8763e'; c.lineWidth = s * .14; c.beginPath(); c.moveTo(-s * .2, s * .36); c.lineTo(s * .14, -s * .2); c.stroke(); c.strokeStyle = col; c.lineWidth = s * .16; c.beginPath(); c.arc(s * .08, -s * .12, s * .34, Math.PI * .95, Math.PI * 2.05); c.stroke(); break;
    case 'rod': c.strokeStyle = '#a8763e'; c.lineWidth = s * .1; c.beginPath(); c.moveTo(-s * .34, s * .34); c.lineTo(s * .3, -s * .34); c.stroke(); c.strokeStyle = '#888'; c.lineWidth = s * .05; c.beginPath(); c.moveTo(s * .3, -s * .34); c.quadraticCurveTo(s * .42, 0, s * .28, s * .2); c.stroke(); break;
    case 'shovel': c.strokeStyle = '#a8763e'; c.lineWidth = s * .12; c.beginPath(); c.moveTo(-s * .26, s * .3); c.lineTo(s * .12, -s * .16); c.stroke(); c.fillStyle = '#c2ccd8'; rr(c, s * .06, -s * .42, s * .3, s * .34, s * .08); c.fill(); break;
    case 'flask': c.fillStyle = '#dce8ec'; c.beginPath(); c.arc(0, s * .1, s * .3, 0, Math.PI * 2); c.fill(); c.fillStyle = id.includes('speed') ? '#5cd8a8' : id.includes('str') ? '#e0884c' : id.includes('warm') ? '#f0a04c' : id === 'antidote' ? '#a8e05c' : '#e05c6c'; c.beginPath(); c.arc(0, s * .14, s * .24, 0, Math.PI * 2); c.fill(); c.fillStyle = '#8a97a5'; rr(c, -s * .09, -s * .38, s * .18, s * .2, s * .04); c.fill(); break;
    case 'pouch': c.fillStyle = '#d8c090'; c.beginPath(); c.arc(0, s * .08, s * .3, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#a88a5c'; c.beginPath(); c.moveTo(-s * .12, -s * .22); c.lineTo(0, -s * .34); c.lineTo(s * .12, -s * .22); c.stroke(); break;
    case 'lantern': c.fillStyle = '#8a97a5'; rr(c, -s * .18, -s * .3, s * .36, s * .5, s * .06); c.fill(); c.fillStyle = '#ffe08a'; rr(c, -s * .1, -s * .2, s * .2, s * .3, s * .04); c.fill(); break;
    case 'sword': c.fillStyle = col === '#c9d4e0' ? '#c9d4e0' : col; c.save(); c.rotate(-Math.PI / 4); rr(c, -s * .09, -s * .46, s * .18, s * .68, s * .07); c.fill(); c.fillStyle = '#a8763e'; rr(c, -s * .2, s * .2, s * .4, s * .1, s * .04); c.fill(); rr(c, -s * .06, s * .28, s * .12, s * .22, s * .04); c.fill(); c.restore(); break;
    case 'bow': c.strokeStyle = '#a8763e'; c.lineWidth = s * .12; c.beginPath(); c.arc(-s * .05, 0, s * .4, -Math.PI * .6, Math.PI * .6); c.stroke(); c.strokeStyle = '#ddd'; c.lineWidth = s * .04; c.beginPath(); c.moveTo(-s * .25, -s * .33); c.lineTo(-s * .25, s * .33); c.stroke(); break;
    case 'staff': c.strokeStyle = '#8a6a4a'; c.lineWidth = s * .1; c.beginPath(); c.moveTo(-s * .16, s * .42); c.lineTo(s * .14, -s * .2); c.stroke(); c.fillStyle = id === 'staff_fire' ? '#ff9d3b' : '#7cd8e8'; c.beginPath(); c.arc(s * .18, -s * .3, s * .16, 0, Math.PI * 2); c.fill(); break;
    case 'armor': c.fillStyle = col; c.beginPath(); c.moveTo(-s * .3, -s * .3); c.lineTo(s * .3, -s * .3); c.lineTo(s * .34, s * .1); c.lineTo(s * .12, s * .4); c.lineTo(-s * .12, s * .4); c.lineTo(-s * .34, s * .1); c.closePath(); c.fill(); break;
    case 'seed': c.fillStyle = col; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(-s * .18 + i * s * .18, (i % 2) * s * .16 - s * .04, s * .1, s * .13, .4, 0, Math.PI * 2); c.fill(); } break;
    case 'fish': c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, s * .34, s * .2, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(s * .28, 0); c.lineTo(s * .48, -s * .16); c.lineTo(s * .48, s * .16); c.closePath(); c.fill(); c.fillStyle = '#233'; c.beginPath(); c.arc(-s * .16, -s * .04, s * .04, 0, Math.PI * 2); c.fill(); break;
    case 'ore': c.fillStyle = '#8a8a92'; c.beginPath(); c.moveTo(-s * .3, s * .1); c.lineTo(-s * .14, -s * .24); c.lineTo(s * .12, -s * .3); c.lineTo(s * .32, s * .02); c.lineTo(s * .18, s * .3); c.lineTo(-s * .16, s * .3); c.closePath(); c.fill(); c.fillStyle = oreCol; for (const [dx, dy] of [[-.1, .02], [.1, -.1], [.02, .16]]) { c.beginPath(); c.arc(dx * s, dy * s, s * .08, 0, Math.PI * 2); c.fill(); } break;
    case 'crystal': c.fillStyle = col; c.beginPath(); c.moveTo(0, -s * .4); c.lineTo(s * .18, 0); c.lineTo(0, s * .34); c.lineTo(-s * .18, 0); c.closePath(); c.fill(); c.globalAlpha = .5; c.beginPath(); c.moveTo(s * .2, -s * .1); c.lineTo(s * .34, s * .1); c.lineTo(s * .18, s * .3); c.closePath(); c.fill(); c.globalAlpha = 1; break;
    case 'bar': c.fillStyle = barCol; rr(c, -s * .3, -s * .12, s * .6, s * .28, s * .05); c.fill(); c.globalAlpha = .7; rr(c, -s * .22, -s * .26, s * .44, s * .18, s * .05); c.fill(); c.globalAlpha = 1; break;
    case 'plank': c.fillStyle = col; c.save(); c.rotate(-.3); rr(c, -s * .34, -s * .18, s * .68, s * .16, s * .03); c.fill(); rr(c, -s * .28, s * .02, s * .68, s * .16, s * .03); c.fill(); c.restore(); break;
    case 'rock': c.fillStyle = col === '#c96a4a' ? '#c96a4a' : '#9aa3ad'; c.beginPath(); c.moveTo(-s * .3, s * .12); c.lineTo(-s * .1, -s * .24); c.lineTo(s * .22, -s * .2); c.lineTo(s * .32, s * .16); c.lineTo(-s * .12, s * .28); c.closePath(); c.fill(); break;
    case 'meat': c.fillStyle = id === 'meat_raw' ? '#e07070' : '#b56a4a'; c.beginPath(); c.ellipse(s * .04, 0, s * .3, s * .22, .3, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f2ead8'; c.beginPath(); c.ellipse(-s * .2, -s * .12, s * .12, s * .08, -.5, 0, Math.PI * 2); c.fill(); break;
    case 'fruit': c.fillStyle = col; c.beginPath(); c.arc(0, s * .04, s * .3, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#5c8a3c'; c.lineWidth = s * .06; c.beginPath(); c.moveTo(0, -s * .24); c.quadraticCurveTo(s * .1, -s * .4, s * .22, -s * .42); c.stroke(); break;
    case 'bread': c.fillStyle = '#e0a860'; c.beginPath(); c.ellipse(0, 0, s * .32, s * .22, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#b5823c'; c.lineWidth = s * .05; c.beginPath(); c.moveTo(-s * .16, -s * .06); c.lineTo(-s * .04, s * .04); c.moveTo(s * .02, -s * .08); c.lineTo(s * .14, s * .02); c.stroke(); break;
    case 'egg': c.fillStyle = '#f7f0dc'; c.beginPath(); c.ellipse(0, s * .04, s * .22, s * .3, 0, 0, Math.PI * 2); c.fill(); break;
    case 'key': c.fillStyle = '#e0c060'; c.beginPath(); c.arc(0, -s * .2, s * .16, 0, Math.PI * 2); c.fill(); c.fillRect(-s * .05, -s * .1, s * .1, s * .5); c.fillRect(s * .05, s * .2, s * .14, s * .07); c.fillRect(s * .05, s * .05, s * .1, s * .07); break;
    case 'book': c.fillStyle = '#c96a6a'; rr(c, -s * .26, -s * .32, s * .52, s * .64, s * .05); c.fill(); c.fillStyle = '#f2ead8'; c.fillRect(-s * .16, -s * .22, s * .32, s * .44); c.strokeStyle = '#b5a888'; c.lineWidth = s * .04; c.beginPath(); c.moveTo(0, -s * .18); c.lineTo(0, s * .18); c.stroke(); break;
    case 'map': c.fillStyle = '#f2e8cc'; rr(c, -s * .3, -s * .24, s * .6, s * .48, s * .04); c.fill(); c.strokeStyle = '#c98a4a'; c.lineWidth = s * .06; c.beginPath(); c.moveTo(-s * .2, -s * .1); c.quadraticCurveTo(0, s * .2, s * .2, -s * .14); c.stroke(); c.fillStyle = '#e05c5c'; c.beginPath(); c.arc(s * .14, -s * .06, s * .07, 0, Math.PI * 2); c.fill(); break;
    case 'trophy': c.fillStyle = '#f0c84c'; c.beginPath(); c.moveTo(-s * .24, -s * .3); c.lineTo(s * .24, -s * .3); c.lineTo(s * .14, s * .06); c.lineTo(-s * .14, s * .06); c.closePath(); c.fill(); c.fillRect(-s * .05, s * .06, s * .1, s * .16); c.fillRect(-s * .18, s * .22, s * .36, s * .08); break;
    default: c.fillStyle = col; diamondPath(c, 0, 0, s * .6, s * .6); c.fill();
  }
  c.restore();
}

// ============================================================
// 地形 tile 预渲染缓存：渐变+高光边+装饰细节（biome × 6变体）
// ============================================================
const tileCache = new Map();
const TILE_DECOR = ['none', 'grass', 'flower', 'pebble', 'grass2', 'flower2'];
function makeTile(bName, decor) {
  const cv = document.createElement('canvas'); cv.width = 96; cv.height = 64;
  const c = cv.getContext('2d');
  const g = BIOMES[bName].g;
  const cx = 48, cy = 32;
  // 主渐变：左上亮 → 右下暗
  const grad = c.createLinearGradient(cx - 32, cy - 16, cx + 32, cy + 16);
  grad.addColorStop(0, g[2]); grad.addColorStop(.5, g[0]); grad.addColorStop(1, g[1]);
  c.fillStyle = grad;
  diamondPath(c, cx, cy, 60, 30); c.fill();
  // 中央亮斑
  const rg = c.createRadialGradient(cx, cy - 4, 2, cx, cy, 26);
  rg.addColorStop(0, 'rgba(255,255,255,.14)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = rg; diamondPath(c, cx, cy, 60, 30); c.fill();
  // 边缘立体感：左上亮边、右下暗边
  c.lineWidth = 2;
  c.strokeStyle = 'rgba(255,255,255,.18)';
  c.beginPath(); c.moveTo(cx, cy - 15); c.lineTo(cx + 30, cy); c.stroke(); // 右上边高光
  c.strokeStyle = 'rgba(0,0,0,.14)';
  c.beginPath(); c.moveTo(cx + 30, cy); c.lineTo(cx, cy + 15); c.lineTo(cx - 30, cy); c.stroke();
  // 水面波纹
  if (bName === 'water') {
    c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 1.6;
    for (const [dx, dy, w2] of [[-12, -2, 10], [8, 4, 12], [-4, 8, 8]]) {
      c.beginPath(); c.moveTo(cx + dx - w2 / 2, cy + dy); c.quadraticCurveTo(cx + dx, cy + dy - 3, cx + dx + w2 / 2, cy + dy); c.stroke();
    }
  }
  // 装饰细节
  const dk = decor;
  if (dk === 'grass' || dk === 'grass2') {
    c.strokeStyle = bName === 'snow' ? 'rgba(150,190,160,.5)' : 'rgba(40,110,40,.4)'; c.lineWidth = 1.8;
    const pts = dk === 'grass' ? [[-14, 0], [4, -6], [14, 4]] : [[-8, 6], [8, -2], [0, 10]];
    for (const [dx, dy] of pts) {
      c.beginPath(); c.moveTo(cx + dx, cy + dy); c.quadraticCurveTo(cx + dx + 2, cy + dy - 6, cx + dx + 4, cy + dy - 9); c.stroke();
    }
  } else if (dk === 'flower' || dk === 'flower2') {
    const cols = ['#f0909c', '#f0c84c', '#a8c8f0', '#f2f2f2'];
    const pts = dk === 'flower' ? [[-12, -2], [6, -4]] : [[10, 6], [-6, 6]];
    pts.forEach(([dx, dy], i) => {
      c.strokeStyle = 'rgba(60,120,40,.6)'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(cx + dx, cy + dy + 3); c.lineTo(cx + dx, cy + dy - 2); c.stroke();
      c.fillStyle = cols[(i + dk.length) % 4];
      for (let p = 0; p < 4; p++) { const a = p / 4 * Math.PI * 2; c.beginPath(); c.arc(cx + dx + Math.cos(a) * 2.4, cy + dy - 2 + Math.sin(a) * 2.4, 1.6, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#fff'; c.beginPath(); c.arc(cx + dx, cy + dy - 2, 1.2, 0, Math.PI * 2); c.fill();
    });
  } else if (dk === 'pebble') {
    c.fillStyle = 'rgba(90,90,100,.3)';
    for (const [dx, dy, r] of [[-10, 2, 2.4], [12, -2, 1.8], [2, 6, 2]]) { c.beginPath(); c.ellipse(cx + dx, cy + dy, r, r * .6, 0, 0, Math.PI * 2); c.fill(); }
  }
  // 沙漠波纹/雪地高光/火山裂纹
  if (bName === 'desert' && decor === 'none') {
    c.strokeStyle = 'rgba(180,150,90,.35)'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(cx - 14, cy - 2); c.quadraticCurveTo(cx, cy - 6, cx + 12, cy - 1); c.stroke();
  }
  if (bName === 'volcano' && (decor === 'pebble' || decor === 'none')) {
    c.strokeStyle = 'rgba(255,120,50,.35)'; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(cx - 10, cy + 2); c.lineTo(cx - 4, cy - 3); c.lineTo(cx + 6, cy + 1); c.stroke();
  }
  if (bName === 'snow' && decor === 'none') {
    c.fillStyle = 'rgba(255,255,255,.5)';
    c.beginPath(); c.ellipse(cx + 8, cy + 2, 6, 3, 0, 0, Math.PI * 2); c.fill();
  }
  return cv;
}
function getTile(bName, v, h2) {
  const dk = TILE_DECOR[(v + h2) % TILE_DECOR.length];
  const key = bName + '|' + dk;
  let t = tileCache.get(key);
  if (!t) { t = makeTile(bName, dk); tileCache.set(key, t); }
  return t;
}
function tileEdgeColor(bName) { return BIOMES[bName].g[0]; }

// ============================================================
// 世界物体绘制（sprite 优先，程序回退）
// ============================================================
export function drawWorldObject(ctx, o, wx, wz, time) {
  const def = WORLD_OBJECTS[o.id]; if (!def) return;
  const sway = Math.sin(time * 1.2 + wx * 2.1 + wz * 1.3) * .03;
  const hit = o.hitT > 0;
  const h = hasSpr(o.id) ? hOf(o.id) : 40;
  // 采集进度条（受损时显示）
  if (o.hp < def.hp) {
    const pct = Math.max(0, o.hp / def.hp);
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.roundRect(-14, -h - 10, 28, 5, 3); ctx.fill();
    ctx.fillStyle = '#FFC64D';
    ctx.beginPath(); ctx.roundRect(-14, -h - 10, 28 * pct, 5, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(-14, -h - 10, 28, 5, 3); ctx.stroke();
  }
  if (hasSpr(o.id)) {
    const isTree = o.id.startsWith('tree') || o.id === 'apple_tree';
    drawSpr(ctx, o.id, hOf(o.id), {
      rotate: isTree ? sway : 0,
      flash: hit ? .7 : 0,
      shadowScale: def.shadow || 1,
    });
    return;
  }
  ctx.save();
  ctx.translate(0, -0);
  if (hit) ctx.translate(Math.sin(time * 60) * 2.5, 0);
  // —— 程序回退（草丛/花丛等小物件）
  switch (o.id) {
    case 'grass_tuft': { ctx.strokeStyle = '#6cbf4a'; ctx.lineWidth = 2.5; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 3.4, 1); ctx.quadraticCurveTo(i * 4.4 + sway * 30, -8, i * 5.4, -13); ctx.stroke(); } break; }
    case 'flower_patch': { for (const [dx, dy] of [[-8, -3], [0, -8], [8, -2], [-3, 3]]) { ctx.strokeStyle = '#5c8a3c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(dx, dy + 4); ctx.lineTo(dx, dy - 2); ctx.stroke(); ctx.fillStyle = ['#f0909c', '#f0c84c', '#a8c8f0', '#f2f2f2'][(dx + 9) % 4]; for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2; ctx.beginPath(); ctx.arc(dx + Math.cos(a) * 3, dy - 3 + Math.sin(a) * 3, 2, 0, Math.PI * 2); ctx.fill(); } } break; }
    case 'ruin_pillar': { ell(ctx, 0, 3, 13, 6, '#222', .18); ctx.fillStyle = '#b8b2a4'; ctx.fillRect(-8, -34, 16, 36); ctx.fillStyle = '#a09a8c'; ctx.fillRect(-8, -34, 6, 36); ctx.fillStyle = '#c9c3b5'; ctx.fillRect(-11, -38, 22, 6); ctx.fillRect(-11, -2, 22, 5); break; }
  }
  ctx.restore();
}

// ============================================================
// 建筑绘制（sprite 优先）
// ============================================================
export function drawBuilding(ctx, id, b, time) {
  const def = BUILDINGS[id]; if (!def) return;
  const hit = b?.hitT > 0;
  if (id === 'plot_farm') { // 农田程序绘制
    ctx.fillStyle = '#8a6a4a'; diamondPath(ctx, 0, 0, 58, 29); ctx.fill();
    ctx.strokeStyle = '#7a5c3e'; ctx.lineWidth = 2; diamondPath(ctx, 0, 0, 40, 20); ctx.stroke();
    ctx.fillStyle = '#7a5c3e';
    for (const [dx, dz] of [[-14, -5], [14, -5], [-7, 3], [7, 3], [0, -9]]) { diamondPath(ctx, dx, dz + 4, 18, 9); ctx.fill(); }
    if (b?.crop) drawCrop(ctx, b.crop, time);
    if (b?.hp < def.hp) bldHpBar(ctx, b, def);
    return;
  }
  if (id === 'floor_wood' || id === 'floor_stone') {
    const g1 = id === 'floor_wood' ? '#d8b078' : '#c4ccd4';
    const g2 = id === 'floor_wood' ? '#c9a06a' : '#b4bcc4';
    const grad = ctx.createLinearGradient(-30, -15, 30, 15);
    grad.addColorStop(0, g1); grad.addColorStop(1, g2);
    ctx.fillStyle = grad; diamondPath(ctx, 0, 0, 60, 30); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.1)'; ctx.lineWidth = 1.4; diamondPath(ctx, 0, 0, 44, 22); ctx.stroke();
    return;
  }
  if (hasSpr(id)) {
    drawSpr(ctx, id, hOf(id), { flash: hit ? .7 : 0 });
    if (def.door && b?.open) { /* 开门状态：叠亮色提示 */ ctx.fillStyle = 'rgba(120,220,120,.25)'; diamondPath(ctx, 0, 0, 40, 20); ctx.fill(); }
    if (def.light) { // 灯光脉动
      const a = .1 + Math.sin(time * 3) * .04;
      ctx.fillStyle = `rgba(255,200,90,${a})`;
      ctx.beginPath(); ctx.ellipse(0, 0, hOf(id) * .5, hOf(id) * .25, 0, 0, Math.PI * 2); ctx.fill();
    }
    bldHpBar(ctx, b, def);
    return;
  }
  // —— 程序回退
  ctx.save();
  if (hit) ctx.translate(Math.sin(time * 60) * 2, 0);
  ctx.fillStyle = '#c9a06a'; diamondPath(ctx, 0, 0, 56, 28); ctx.fill();
  ctx.restore();
}
function bldHpBar(ctx, b, def) {
  if (!b || b.hp >= def.hp) return;
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(-15, -hOf(b.id) - 10, 30, 4);
  ctx.fillStyle = '#6cbf4a'; ctx.fillRect(-15, -hOf(b.id) - 10, 30 * Math.max(0, b.hp / def.hp), 4);
}
function drawCrop(ctx, crop, time) {
  const stage = Math.min(3, Math.floor(crop.growth * 4));
  const cols = { wheat: ['#7cc95c', '#a8c95c', '#d8c060', '#e8d070'], carrot: ['#6cc95c', '#6cc95c', '#5cb85c', '#f08c3c'], pumpkin: ['#6cc95c', '#7cc95c', '#8cc95c', '#e08828'], chili: ['#6cc95c', '#7cc95c', '#5cb85c', '#e04530'] };
  const cc = cols[crop.id] || cols.wheat;
  for (const [dx, dz] of [[-14, -5], [0, -9], [14, -5], [-7, 3], [7, 3]]) {
    ctx.strokeStyle = '#4e9440'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(dx, dz); ctx.lineTo(dx, dz - 5 - stage * 3); ctx.stroke();
    if (stage >= 2) { ctx.fillStyle = cc[stage]; ctx.beginPath(); ctx.arc(dx, dz - 5 - stage * 3, 2.4 + stage * .8, 0, Math.PI * 2); ctx.fill(); }
  }
}

// ============================================================
// 实体绘制（sprite 优先）
// ============================================================
export function drawMonster(ctx, e, time) {
  const m = MONSTERS[e.type]; if (!m) return;
  const bob = e.moving ? Math.abs(Math.sin(time * 9 + e.seed * 8)) * 3 : Math.sin(time * 2.4 + e.seed * 8) * 1.2;
  const flip = e.dir === 1;
  if (hasSpr(e.type)) {
    if (m.boss) { // Boss 光环
      ctx.globalAlpha = .16 + Math.sin(time * 2.5) * .06;
      ctx.fillStyle = { goblin_king: '#8ce05c', ice_queen: '#8cd8f0', flame_lord: '#ff8a3b', treant_ancient: '#7cd8a8' }[e.type] || '#c86ae8';
      ctx.beginPath(); ctx.ellipse(0, 0, hOf(e.type) * .42, hOf(e.type) * .21, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (e.type === 'bat_fire' || e.type === 'banshee' || e.type === 'shadow') { // 飘浮系
      drawSpr(ctx, e.type, hOf(e.type), { bob: Math.sin(time * 3 + e.seed * 9) * 5 - 10, flip, flash: e.hitT > 0 ? .8 : 0, shadowScale: .7 });
    } else {
      drawSpr(ctx, e.type, hOf(e.type) * (1 + (e.chargeT > 0 ? .08 : 0)), { bob, flip, flash: e.hitT > 0 ? .8 : 0, rotate: e.atkT > 0 ? (flip ? -.18 : .18) : 0 });
    }
    hpBar(ctx, e, m);
    return;
  }
  // —— 程序回退（极简）
  ell(ctx, 0, 2, 11, 5, '#222', .2);
  ctx.fillStyle = '#c86ae8'; ctx.beginPath(); ctx.arc(0, -12, 10, 0, Math.PI * 2); ctx.fill();
  hpBar(ctx, e, m);
}
function hpBar(ctx, e, m) {
  if (e.hp >= e.maxHp || m.boss) return;
  const y = -hOf(e.type) - 8;
  ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(-13, y, 26, 4);
  ctx.fillStyle = m.boss ? '#c86ae8' : '#e05c5c'; ctx.fillRect(-13, y, 26 * Math.max(0, e.hp / e.maxHp), 4);
}

export function drawAnimal(ctx, e, time) {
  const bob = e.fleeT > 0 || e.follow ? Math.abs(Math.sin(time * 11 + e.seed * 7)) * 3 : Math.sin(time * 2 + e.seed * 7) * 1;
  if (hasSpr(e.type)) {
    drawSpr(ctx, e.type, hOf(e.type), { bob, flip: e.dir === 1, flash: e.hitT > 0 ? .7 : 0 });
    return;
  }
  ell(ctx, 0, 2, 9, 4.5, '#222', .2);
  ctx.fillStyle = '#f2ead8'; ctx.beginPath(); ctx.arc(0, -8, 8, 0, Math.PI * 2); ctx.fill();
}

export function drawNPC(ctx, e, time) {
  const bob = e.moving ? Math.abs(Math.sin(time * 8 + e.seed * 6)) * 2.6 : Math.sin(time * 2 + e.seed * 6) * 1;
  const id = { guard: 'npc_guard', medic: 'npc_medic' }[e.job] || 'npc_worker';
  if (hasSpr(id)) {
    drawSpr(ctx, id, hOf(id), { bob, flip: e.dir === 1, flash: e.hitT > 0 ? .7 : 0, rotate: e.atkT > 0 ? (e.dir === 1 ? -.2 : .2) : 0 });
    // 职业小徽标
    const badge = { lumberjack: '🪓', miner: '⛏️', farmer: '🌾', cook: '🍲', guard: '🛡️', medic: '💊', none: '' }[e.job];
    if (badge && e.job !== 'guard' && e.job !== 'medic') {
      ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(badge, 20, -hOf(id) * .55);
    }
    if (e.hp < e.maxHp) { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(-12, -hOf(id) - 8, 24, 3.4); ctx.fillStyle = '#6cbf4a'; ctx.fillRect(-12, -hOf(id) - 8, 24 * e.hp / e.maxHp, 3.4); }
    // 闲聊气泡
    if (e.say) {
      ctx.font = '11px "Microsoft YaHei",sans-serif';
      const txt = e.say.text;
      const w = ctx.measureText(txt).width + 16;
      const bx = -w / 2, by = -hOf(id) - 34;
      ctx.fillStyle = 'rgba(255,252,244,.96)';
      ctx.beginPath(); ctx.roundRect(bx, by, w, 20, 9); ctx.fill();
      ctx.strokeStyle = '#EFE0BE'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4, by + 20); ctx.lineTo(4, by + 20); ctx.lineTo(0, by + 26); ctx.closePath();
      ctx.fillStyle = 'rgba(255,252,244,.96)'; ctx.fill();
      ctx.fillStyle = '#7A5C34'; ctx.textAlign = 'center'; ctx.fillText(txt, 0, by + 14);
    }
    return;
  }
  ell(ctx, 0, 2, 9, 4.5, '#222', .2);
  ctx.fillStyle = '#5c7ea8'; ctx.beginPath(); ctx.arc(0, -14, 9, 0, Math.PI * 2); ctx.fill();
}

export function drawPlayer(ctx, p, time) {
  const bob = p.moving ? Math.abs(Math.sin(time * 9)) * 3 : Math.sin(time * 2.2) * 1.2;
  if (hasSpr('player')) {
    drawSpr(ctx, 'player', hOf('player'), {
      bob, flip: p.dir === 1, flash: p.hitT > 0 ? .8 : 0,
      rotate: p.atkT > 0 ? (p.dir === 1 ? -.22 : .22) : 0,
    });
    return;
  }
  ell(ctx, 0, 2, 9, 4.5, '#222', .2);
  ctx.fillStyle = '#ff9d3b'; ctx.beginPath(); ctx.arc(0, -16, 10, 0, Math.PI * 2); ctx.fill();
}

export function drawMerchant(ctx, e, time) {
  if (hasSpr('merchant')) { drawSpr(ctx, 'merchant', hOf('merchant'), { bob: Math.sin(time * 2) * 1.4 }); return; }
  ell(ctx, 0, 2, 9, 4.5, '#222', .2);
  ctx.fillStyle = '#8a5cb8'; ctx.beginPath(); ctx.arc(0, -16, 10, 0, Math.PI * 2); ctx.fill();
}

// ============================================================
// 主渲染器
// ============================================================
export class Renderer {
  constructor(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.lightCv = document.createElement('canvas'); this.lightCtx = this.lightCv.getContext('2d');
    this.zoom = 1; this.cam = { x: 0, z: 0 };
    this.shake = 0;
    this.chunks = new Map(); // 地形块缓存 "gcx|gcz" -> {cv}
    this.resize();
  }

  getChunk(G, gcx, gcz) {
    const key = gcx + '|' + gcz;
    const hit = this.chunks.get(key);
    if (hit) { hit.f = this._frame; return hit; }
    const BN = ['water', 'sand', 'grass', 'forest', 'desert', 'snow', 'swamp', 'volcano'];
    const cv = document.createElement('canvas');
    cv.width = CHUNK_W; cv.height = CHUNK_H;
    const cc = cv.getContext('2d');
    const ox = gcx * CHUNK, oz = gcz * CHUNK;
    for (let tz = 0; tz < CHUNK; tz++) for (let tx = 0; tx < CHUNK; tx++) {
      const wx = ox + tx, wz = oz + tz;
      if (wx >= G.world.W || wz >= G.world.H) continue;
      const i = wz * G.world.W + wx;
      const bName = BN[G.world.biome[i]];
      const v = G.world.variant[i];
      const h2 = (wx * 7 + wz * 13) % 5;
      const p = worldToScreen(tx, tz); // 块内格子角点（x 可能为负，由 OX 平移）
      const dx = p.x + OX - 48, dy = p.y + CPADY - 16;
      cc.drawImage(getTile(bName, v, h2), dx, dy);
      // 生态过渡柔边（上/左邻异色）
      const upB = wz > 0 ? BN[G.world.biome[i - G.world.W]] : bName;
      const lfB = wx > 0 ? BN[G.world.biome[i - 1]] : bName;
      const cxp = p.x + OX, cyp = p.y + CPADY;
      if (upB !== bName) {
        cc.globalAlpha = .3; cc.fillStyle = tileEdgeColor(upB);
        cc.beginPath(); cc.moveTo(cxp, cyp - 15); cc.lineTo(cxp + 30, cyp); cc.lineTo(cxp + 18, cyp + 2.5); cc.lineTo(cxp, cyp - 10); cc.closePath(); cc.fill();
        cc.beginPath(); cc.moveTo(cxp, cyp - 15); cc.lineTo(cxp - 30, cyp); cc.lineTo(cxp - 18, cyp + 2.5); cc.lineTo(cxp, cyp - 10); cc.closePath(); cc.fill();
        cc.globalAlpha = 1;
      }
      if (lfB !== bName) {
        cc.globalAlpha = .3; cc.fillStyle = tileEdgeColor(lfB);
        cc.beginPath(); cc.moveTo(cxp - 30, cyp); cc.lineTo(cxp, cyp + 15); cc.lineTo(cxp, cyp + 10); cc.lineTo(cxp - 18, cyp + 2.5); cc.closePath(); cc.fill();
        cc.globalAlpha = 1;
      }
    }
    const entry = { cv, f: this._frame };
    this.chunks.set(key, entry);
    // LRU：本帧正在用的不淘汰，防止可视块数超上限时同帧互删闪烁
    while (this.chunks.size > 16) {
      let oldestK = null, oldestF = Infinity;
      for (const [k, e] of this.chunks) {
        if (e.f < oldestF && e.f !== this._frame) { oldestF = e.f; oldestK = k; }
      }
      if (oldestK === null) break; // 全是本帧的，下帧再清
      this.chunks.delete(oldestK);
    }
    return entry;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = this.cv.clientWidth * dpr; this.cv.height = this.cv.clientHeight * dpr;
    this.dpr = dpr;
    this.lightCv.width = this.cv.width; this.lightCv.height = this.cv.height;
  }
  screenCenter() { return { x: this.cv.width / 2, y: this.cv.height / 2 + 30 }; }
  apply(ctx) {
    const { x: px, y: py } = worldToScreen(this.cam.x, this.cam.z);
    let c = this.screenCenter();
    if (this.shake > 0) { c = { x: c.x + (Math.random() - .5) * this.shake * 14, y: c.y + (Math.random() - .5) * this.shake * 14 }; }
    ctx.setTransform(this.zoom * this.dpr, 0, 0, this.zoom * this.dpr, c.x - px * this.zoom * this.dpr, c.y - py * this.zoom * this.dpr);
  }
  worldToScreenPx(wx, wz) {
    const { x: px, y: py } = worldToScreen(wx, wz);
    const c = this.screenCenter();
    return { x: c.x + (px - worldToScreen(this.cam.x, this.cam.z).x) * this.zoom * this.dpr, y: c.y + (py - worldToScreen(this.cam.x, this.cam.z).y) * this.zoom * this.dpr };
  }

  render(G) {
    const ctx = this.ctx, t = G.time;
    this._frame = (this._frame || 0) + 1;
    this.shake = Math.max(0, this.shake - .016);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // 天空渐变底色（随时间）
    const skyDay = ctx.createLinearGradient(0, 0, 0, this.cv.height);
    const nightMix = G.darkness / .58;
    const lerp = (a, b) => a.map((v, i) => Math.round(v * (1 - nightMix) + b[i] * nightMix));
    const c1 = lerp([135, 201, 232], [30, 40, 80]), c2 = lerp([190, 227, 200], [22, 30, 62]);
    skyDay.addColorStop(0, `rgb(${c1})`); skyDay.addColorStop(1, `rgb(${c2})`);
    ctx.fillStyle = skyDay; ctx.fillRect(0, 0, this.cv.width, this.cv.height);
    this.apply(ctx);
    const z = this.zoom * this.dpr;
    const halfW = this.cv.width / 2 / z, halfH = this.cv.height / 2 / z;
    const cx = this.cam.x, cz = this.cam.z;
    const range = (halfW / (TW / 2) + halfH / (TH / 2)) / 2 + 3;
    const x0 = Math.max(0, Math.floor(cx - range)), x1 = Math.min(G.world.W - 1, Math.ceil(cx + range));
    const z0 = Math.max(0, Math.floor(cz - range)), z1 = Math.min(G.world.H - 1, Math.ceil(cz + range));
    const BIOME_NAMES = ['water', 'sand', 'grass', 'forest', 'desert', 'snow', 'swamp', 'volcano'];

    // ---- 地面（分块缓存：地形静态，16×16格一块，LRU≤12；水面波光/农田为动态层单独画） ----
    const gcx0 = Math.floor(x0 / CHUNK), gcx1 = Math.floor(x1 / CHUNK);
    const gcz0 = Math.floor(z0 / CHUNK), gcz1 = Math.floor(z1 / CHUNK);
    for (let gcz = gcz0; gcz <= gcz1; gcz++) for (let gcx = gcx0; gcx <= gcx1; gcx++) {
      const ch = this.getChunk(G, gcx, gcz);
      const base = worldToScreen(gcx * CHUNK, gcz * CHUNK);
      ctx.drawImage(ch.cv, base.x - CPADX, base.y - CPADY);
    }
    // 动态层1：水面波光（只遍历水格）
    for (let tz = z0; tz <= z1; tz++) for (let tx = x0; tx <= x1; tx++) {
      if (G.world.biome[tz * G.world.W + tx] !== 0) continue;
      const shim = Math.sin(t * 1.6 + tx * 1.7 + tz * 2.3) * .5 + .5;
      if (shim > .82) {
        const pc = worldToScreen(tx + .5, tz + .5);
        ctx.fillStyle = `rgba(255,255,255,${(shim - .82) * 1.2})`;
        ctx.beginPath(); ctx.ellipse(pc.x, pc.y, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    // 动态层2：农田（作物会生长，不能烘进块缓存）
    for (const b of G.buildings) {
      if (b.id !== 'plot_farm') continue;
      if (b.x < x0 - 1 || b.x > x1 + 1 || b.z < z0 - 1 || b.z > z1 + 1) continue;
      const pc = worldToScreen(b.x + .5, b.z + .5);
      ctx.save(); ctx.translate(pc.x, pc.y);
      drawBuilding(ctx, 'plot_farm', b, t);
      ctx.restore();
    }

    // ---- 深度排序精灵 ----
    const sprites = [];
    for (let tz = z0; tz <= z1; tz++) for (let tx = x0; tx <= x1; tx++) {
      const o = G.world.obj[tz * G.world.W + tx];
      if (o && o.id) sprites.push({ d: tx + tz, k: 'obj', x: tx + .5, z: tz + .5, o });
      const b = G.buildingAt(tx, tz);
      if (b && b.id !== 'plot_farm') sprites.push({ d: tx + tz + .1, k: 'bld', x: tx + .5, z: tz + .5, b });
    }
    for (const e of G.entities) {
      if (Math.abs(e.x - cx) > range + 2 || Math.abs(e.z - cz) > range + 2) continue;
      sprites.push({ d: e.x + e.z, k: 'ent', e });
    }
    for (const d of G.drops) {
      if (Math.abs(d.x - cx) > range + 2 || Math.abs(d.z - cz) > range + 2) continue;
      sprites.push({ d: d.x + d.z, k: 'drop', d });
    }
    if (G.pet) sprites.push({ d: G.pet.x + G.pet.z, k: 'pet', e: G.pet });
    for (const pr of G.projectiles) sprites.push({ d: pr.x + pr.z, k: 'proj', pr });
    for (const mt of G.meteors || []) sprites.push({ d: mt.x + mt.z, k: 'meteor', mt });
    for (const p of G.pois) {
      if ((p.type === 'altar' || (p.type === 'chest' && !p.opened) || (p.type === 'survivor' && !p.rescued)) && Math.abs(p.x - cx) < range && Math.abs(p.z - cz) < range)
        sprites.push({ d: p.x + p.z + .2, k: 'poi', p });
    }
    if (G.ghost) sprites.push({ d: G.ghost.x + G.ghost.z + .5, k: 'ghost', g: G.ghost });
    sprites.sort((a, b2) => a.d - b2.d);

    for (const s of sprites) {
      const pos = worldToScreen(s.x, s.z);
      ctx.save(); ctx.translate(pos.x, pos.y);
      if (s.k === 'obj') drawWorldObject(ctx, s.o, s.x, s.z, t);
      else if (s.k === 'bld') drawBuilding(ctx, s.b.id, s.b, t);
      else if (s.k === 'ent') {
        const e = s.e;
        if (e.kind === 'player') drawPlayer(ctx, e, t);
        else if (e.kind === 'monster') drawMonster(ctx, e, t);
        else if (e.kind === 'npc') drawNPC(ctx, e, t);
        else if (e.kind === 'merchant') drawMerchant(ctx, e, t);
        else if (e.kind === 'animal') drawAnimal(ctx, e, t);
      }
      else if (s.k === 'drop') {
        const d = s.d; const bobY = Math.sin(t * 4 + d.seed * 8) * 2.4;
        ctx.fillStyle = 'rgba(30,40,20,.18)';
        ctx.beginPath(); ctx.ellipse(0, 2, 7, 3.4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(0, -10 + bobY); ctx.scale(.75, .75); drawItemIcon(ctx, d.item, 22); ctx.restore();
        // 拾取光点
        ctx.fillStyle = 'rgba(255,240,160,.5)';
        ctx.beginPath(); ctx.arc(0, -10 + bobY, 9 + Math.sin(t * 5 + d.seed * 9) * 2, 0, Math.PI * 2); ctx.globalAlpha = .25; ctx.fill(); ctx.globalAlpha = 1;
      }
      else if (s.k === 'pet') {
        const e = s.e;
        const sprId = (G_PETS && G_PETS[e.type]?.spr) || e.type;
        const bob = e.moving ? Math.abs(Math.sin(t * 10 + e.seed * 9)) * 3 : Math.sin(t * 2.5 + e.seed * 9) * 1.2;
        drawSpr(ctx, sprId, e.type === 'dragon' ? 52 : 38, { bob, flip: e.dir === 1, shadowScale: .8 });
        // 宠物星星标记
        ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('⭐', 16, -40 + Math.sin(t * 3) * 2);
      }
      else if (s.k === 'proj') drawProjectile(ctx, s.pr, t);
      else if (s.k === 'meteor') drawMeteorMark(ctx, s.mt, t);
      else if (s.k === 'poi') drawPoi(ctx, s.p, t);
      else if (s.k === 'ghost') {
        const ok = G.ghost.ok;
        ctx.globalAlpha = .45;
        if (hasSpr(G.ghost.id)) { drawSpr(ctx, G.ghost.id, hOf(G.ghost.id)); }
        ctx.fillStyle = ok ? 'rgba(108,191,74,.35)' : 'rgba(224,92,92,.45)';
        diamondPath(ctx, 0, 0, TW - 4, TH - 2); ctx.fill();
        ctx.strokeStyle = ok ? '#6cbf4a' : '#e05c5c'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 24;
        diamondPath(ctx, 0, 0, TW - 4, TH - 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    // ---- 交互目标指示 ----
    if (G.target) {
      const tp = worldToScreen(G.target.x, G.target.z);
      ctx.strokeStyle = 'rgba(255,220,90,.95)'; ctx.lineWidth = 2.6; ctx.setLineDash([7, 5]); ctx.lineDashOffset = -t * 24;
      diamondPath(ctx, tp.x, tp.y, TW - 6, TH - 3); ctx.stroke(); ctx.setLineDash([]);
      const label = G.target.label;
      if (label) {
        ctx.font = `600 13px "Microsoft YaHei",sans-serif`; ctx.textAlign = 'center';
        const w = ctx.measureText(label).width + 18;
        ctx.fillStyle = 'rgba(255,248,236,.95)'; rr(ctx, tp.x - w / 2, tp.y - 64, w, 22, 10); ctx.fill();
        ctx.strokeStyle = '#f0c87a'; ctx.lineWidth = 1.4; rr(ctx, tp.x - w / 2, tp.y - 64, w, 22, 10); ctx.stroke();
        ctx.fillStyle = '#5b4632'; ctx.fillText(label, tp.x, tp.y - 48.5);
        // 下箭头动画
        const ay = tp.y - 36 + Math.sin(t * 5) * 3;
        ctx.fillStyle = '#ffb43c';
        ctx.beginPath(); ctx.moveTo(tp.x - 5, ay - 6); ctx.lineTo(tp.x + 5, ay - 6); ctx.lineTo(tp.x, ay); ctx.closePath(); ctx.fill();
      }
    }

    // ---- 伤害飘字 ----
    ctx.textAlign = 'center';
    for (const f of G.floaters) {
      const fp = worldToScreen(f.x, f.z);
      const ty = fp.y + (f.y || -36);
      ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.font = `bold ${f.big ? 19 : 14}px "Microsoft YaHei",sans-serif`;
      ctx.strokeStyle = 'rgba(60,45,25,.65)'; ctx.lineWidth = 3.5; ctx.strokeText(f.text, fp.x, ty);
      ctx.fillStyle = f.color || '#fff'; ctx.fillText(f.text, fp.x, ty);
      ctx.globalAlpha = 1;
    }
    // ---- 粒子 ----
    for (const pa of G.particles || []) {
      const pp = worldToScreen(pa.x, pa.z);
      const py = pp.y + (pa.y || -10);
      const a = 1 - pa.t / .8;
      ctx.globalAlpha = a * .8;
      const cols = { poof: '#d8cfc0', boom: '#ff9d3b', leaf: '#7cc95c', spark: '#ffe08a', drop: '#7ac8f0', tp: '#c86ae8', hit: '#ffe8c8', yummy: '#ffb8d8' };
      ctx.fillStyle = cols[pa.kind] || '#fff';
      ctx.beginPath(); ctx.arc(pp.x, py, 3 + a * 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // ---- 任务指引箭头（屏幕边缘） ----
    if (G.guideArrow) { this.renderGuideArrow(ctx, G.guideArrow, G); }

    this.renderLight(G);
    this.renderWeather(G);
    this.renderAmbient(G);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // 环境氛围：夜晚萤火虫 / 秋日落叶 / 雨天涟漪
  renderAmbient(G) {
    const ctx = this.ctx, t = G.time;
    // 世界坐标粒子 → 屏幕投影（跟随镜头的小范围随机游走）
    if (!this._ambient) {
      this._ambient = [];
      for (let i = 0; i < 26; i++) this._ambient.push({ ox: (Math.random() - .5), oy: (Math.random() - .5), ph: Math.random() * 9, sp: .3 + Math.random() * .7 });
    }
    const season = G.seasonIdx();
    const biome = G.q.biomeAt(Math.floor(G.player.x), Math.floor(G.player.z));
    const firefly = G.darkness > .25 && (biome === 'grass' || biome === 'forest' || biome === 'swamp');
    const leaves = season === 2 && (biome === 'grass' || biome === 'forest');
    const ripples = G.weather === 'rain' || G.weather === 'storm';
    if (!firefly && !leaves && !ripples) return;
    this.apply(ctx);
    for (const a of this._ambient) {
      a.ph += .016 * a.sp;
      const wx = this.cam.x + Math.cos(a.ph * .7 + a.ox * 6) * 6 + a.ox * 10;
      const wz = this.cam.z + Math.sin(a.ph * .5 + a.oy * 6) * 6 + a.oy * 10;
      const p = worldToScreen(wx, wz);
      if (firefly) {
        const glow = (Math.sin(a.ph * 2.2) * .5 + .5) * .8;
        ctx.globalAlpha = glow * .8;
        ctx.fillStyle = '#ffe66a';
        ctx.beginPath(); ctx.arc(p.x, p.y - 26 - Math.sin(a.ph) * 8, 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = glow * .2;
        ctx.beginPath(); ctx.arc(p.x, p.y - 26 - Math.sin(a.ph) * 8, 6, 0, Math.PI * 2); ctx.fill();
      } else if (leaves) {
        const fall = (a.ph * .35) % 1;
        ctx.globalAlpha = .7 * (1 - fall * .4);
        ctx.save(); ctx.translate(p.x + Math.sin(a.ph * 3) * 14, p.y - 60 + fall * 70); ctx.rotate(a.ph * 2);
        ctx.fillStyle = ['#e8a13c', '#d8763c', '#c9a03c'][Math.floor(a.ox * 3 + 3) % 3];
        ctx.beginPath(); ctx.ellipse(0, 0, 4.4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else if (ripples) {
        const rp = (a.ph * .8) % 1;
        ctx.globalAlpha = (1 - rp) * .35;
        ctx.strokeStyle = '#cfe8f5'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, rp * 14, rp * 7, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  // 屏幕边缘指引箭头：指向目标世界点
  renderGuideArrow(ctx, ga, G) {
    const p = this.worldToScreenPx(ga.x, ga.z);
    const W = this.cv.width, H = this.cv.height;
    const cx = W / 2, cy = H / 2;
    const dx = p.x - cx, dy = p.y - cy;
    if (Math.abs(p.x - cx) < W * .3 && Math.abs(p.y - cy) < H * .3) {
      // 目标在屏内：直接在目标上方画浮动标记
      ctx.save(); ctx.translate(p.x, p.y - 70);
      const bob2 = Math.sin(G.time * 4) * 5;
      ctx.translate(0, bob2);
      ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🔻', 0, 0);
      ctx.font = 'bold 12px "Microsoft YaHei"';
      ctx.strokeStyle = 'rgba(60,45,25,.7)'; ctx.lineWidth = 3;
      ctx.strokeText(ga.label || '', 0, 16);
      ctx.fillStyle = '#ffd84c'; ctx.fillText(ga.label || '', 0, 16);
      ctx.restore();
      return;
    }
    // 屏外：边缘箭头
    const ang = Math.atan2(dy, dx);
    const m = Math.min(W, H) * .36;
    const ex = cx + Math.cos(ang) * m, ey = cy + Math.sin(ang) * m;
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang);
    ctx.fillStyle = 'rgba(255,184,60,.95)';
    ctx.strokeStyle = 'rgba(120,70,10,.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-8, -11); ctx.lineTo(-3, 0); ctx.lineTo(-8, 11); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.rotate(-ang);
    ctx.font = 'bold 11px "Microsoft YaHei"'; ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(60,45,25,.7)'; ctx.lineWidth = 3;
    ctx.strokeText(ga.label || '', 0, 26);
    ctx.fillStyle = '#ffd84c'; ctx.fillText(ga.label || '', 0, 26);
    ctx.restore();
  }

  renderLight(G) {
    const lc = this.lightCtx, W = this.lightCv.width, H = this.lightCv.height;
    const dark = G.darkness;
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.clearRect(0, 0, W, H);
    if (dark <= 0.02) return;
    lc.fillStyle = `rgba(16,20,52,${dark})`;
    lc.fillRect(0, 0, W, H);
    lc.globalCompositeOperation = 'destination-out';
    const punch = (wx, wz, r, strength = 1) => {
      const p = this.worldToScreenPx(wx, wz);
      const rr2 = r * this.zoom * this.dpr;
      const g = lc.createRadialGradient(p.x, p.y - 14 * this.zoom * this.dpr, 0, p.x, p.y - 14 * this.zoom * this.dpr, rr2);
      g.addColorStop(0, `rgba(0,0,0,${.95 * strength})`); g.addColorStop(.6, `rgba(0,0,0,${.5 * strength})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g; lc.beginPath(); lc.arc(p.x, p.y - 14 * this.zoom * this.dpr, rr2, 0, Math.PI * 2); lc.fill();
    };
    punch(G.player.x, G.player.z, 3.4 * 90, .85);
    if (G.player.equip.acc === 'lantern') punch(G.player.x, G.player.z, 5.5 * 90, 1);
    for (const b of G.buildings) {
      const def = BUILDINGS[b.id];
      if (def?.light) punch(b.x + .5, b.z + .5, def.light * 95, 1);
    }
    for (const e of G.entities) {
      if (e.kind === 'monster' && ['slime_lava', 'flame_lord', 'demon_lava', 'bat_fire'].includes(e.type)) punch(e.x, e.z, 140, .8);
    }
    lc.globalCompositeOperation = 'source-over';
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.lightCv, 0, 0);
    if (dark > .1) { ctx.fillStyle = `rgba(255,160,60,${dark * .06})`; ctx.fillRect(0, 0, this.cv.width, this.cv.height); }
  }

  renderWeather(G) {
    const ctx = this.ctx, W = this.cv.width, H = this.cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const w = G.weather;
    if (w === 'rain' || w === 'storm') {
      const n = w === 'storm' ? 130 : 70;
      ctx.strokeStyle = 'rgba(160,200,230,.5)'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const sx = ((i * 733 + G.time * 900 * (w === 'storm' ? 1.5 : 1)) % (W + 100)) - 50;
        const sy = (i * 613 + G.time * 1600) % (H + 60) - 30;
        ctx.moveTo(sx, sy); ctx.lineTo(sx - 8, sy + 18);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(100,130,170,.12)'; ctx.fillRect(0, 0, W, H);
    } else if (w === 'snow' || w === 'blizzard') {
      const n = w === 'blizzard' ? 120 : 60;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < n; i++) {
        const sx = ((i * 521 + Math.sin(G.time + i) * 40 + G.time * (w === 'blizzard' ? 300 : 60)) % (W + 60)) - 30;
        const sy = (i * 447 + G.time * (w === 'blizzard' ? 500 : 120)) % (H + 30) - 15;
        ctx.beginPath(); ctx.arc(sx, sy, 1.6 + (i % 3) * .8, 0, Math.PI * 2); ctx.fill();
      }
    } else if (w === 'fog') {
      ctx.fillStyle = 'rgba(230,236,240,.28)'; ctx.fillRect(0, 0, W, H);
    } else if (w === 'heat') {
      ctx.fillStyle = 'rgba(255,180,60,.1)'; ctx.fillRect(0, 0, W, H);
    }
    if (G.lightning > 0) {
      ctx.fillStyle = `rgba(255,255,255,${G.lightning * .5})`; ctx.fillRect(0, 0, W, H);
    }
  }

  renderMinimap(mctx, size, G) {
    const { W, H } = G.world;
    if (!this.mmBase) {
      this.mmBase = document.createElement('canvas'); this.mmBase.width = W; this.mmBase.height = H;
      const c = this.mmBase.getContext('2d');
      const img = c.createImageData(W, H);
      const cols = { water: [95, 183, 212], sand: [236, 217, 164], grass: [143, 208, 106], forest: [111, 184, 87], desert: [232, 208, 138], snow: [233, 242, 246], swamp: [122, 155, 94], volcano: [107, 90, 86] };
      for (let i = 0; i < W * H; i++) {
        const b = ['water', 'sand', 'grass', 'forest', 'desert', 'snow', 'swamp', 'volcano'][G.world.biome[i]];
        const cl = cols[b]; img.data[i * 4] = cl[0]; img.data[i * 4 + 1] = cl[1]; img.data[i * 4 + 2] = cl[2]; img.data[i * 4 + 3] = 255;
      }
      c.putImageData(img, 0, 0);
    }
    mctx.clearRect(0, 0, size, size);
    mctx.drawImage(this.mmBase, 0, 0, size, size);
    const sc = size / W;
    for (const p of G.pois) {
      if (!p.discovered) continue;
      mctx.fillStyle = p.type === 'altar' ? '#c86ae8' : p.type === 'ruin' ? '#e8a13c' : p.type === 'chest' && !p.opened ? '#f0c84c' : p.type === 'meteor' ? '#3cd8e8' : null;
      if (mctx.fillStyle) mctx.fillRect(p.x * sc - 1.5, p.z * sc - 1.5, 3, 3);
    }
    mctx.fillStyle = '#fff';
    for (const b of G.buildings) mctx.fillRect(b.x * sc - 1, b.z * sc - 1, 2, 2);
    for (const e of G.entities) {
      if (e.kind === 'monster') { mctx.fillStyle = '#e04545'; mctx.fillRect(e.x * sc - 1, e.z * sc - 1, 2.4, 2.4); }
      else if (e.kind === 'npc') { mctx.fillStyle = '#4ce05c'; mctx.fillRect(e.x * sc - 1, e.z * sc - 1, 2.4, 2.4); }
    }
    mctx.fillStyle = '#fff'; mctx.strokeStyle = '#e05c5c'; mctx.lineWidth = 1.4;
    mctx.beginPath(); mctx.arc(G.player.x * sc, G.player.z * sc, 3.4, 0, Math.PI * 2); mctx.fill(); mctx.stroke();
  }
}

function drawProjectile(ctx, pr, t) {
  ctx.save();
  if (pr.kind === 'arrow' || pr.kind === 'bolt') {
    ctx.rotate(Math.atan2(pr.vy, pr.vx * .5));
    ctx.strokeStyle = pr.kind === 'bolt' ? '#545c66' : '#8a6a3c'; ctx.lineWidth = pr.kind === 'bolt' ? 3 : 2.2;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(7, 0); ctx.stroke();
    ctx.fillStyle = '#d8e2ea'; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(2, -2.6); ctx.lineTo(2, 2.6); ctx.closePath(); ctx.fill();
  } else if (pr.kind === 'fire') {
    ctx.fillStyle = `rgba(255,${120 + Math.sin(t * 12) * 50 | 0},40,.95)`;
    ctx.beginPath(); ctx.arc(0, 0, 6.5 + Math.sin(t * 14) * 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,120,.9)'; ctx.beginPath(); ctx.arc(0, 0, 3.2, 0, Math.PI * 2); ctx.fill();
  } else if (pr.kind === 'ice') {
    ctx.fillStyle = '#8cd8f0'; ctx.save(); ctx.rotate(t * 8);
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.lineTo(Math.cos(a) * 6.4, Math.sin(a) * 6.4); } ctx.closePath(); ctx.fill(); ctx.restore();
  } else if (pr.kind === 'bomb') {
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(0, (pr.h || 8) - 8, 5.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffb43c'; ctx.beginPath(); ctx.arc(3, (pr.h || 8) - 14, 2.4 + Math.sin(t * 20), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawMeteorMark(ctx, mt, t) {
  ctx.globalAlpha = .5 + Math.sin(t * 8) * .3;
  ctx.strokeStyle = '#ff6a3b'; ctx.lineWidth = 3;
  diamondPath(ctx, 0, 0, 76, 38); ctx.stroke();
  ctx.fillStyle = 'rgba(255,106,59,.15)'; diamondPath(ctx, 0, 0, 76, 38); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawPoi(ctx, p, t) {
  if (p.type === 'altar') {
    if (hasSpr('altar_ancient')) { // 祭坛用远古祭坛图+Boss色光
      drawSpr(ctx, 'altar_ancient', 96);
    } else {
      ctx.fillStyle = '#8a929c'; diamondPath(ctx, 0, 0, 56, 28); ctx.fill();
    }
    const boss = { goblin_king: '#7cb85c', ice_queen: '#8cd8f0', flame_lord: '#ff7d3b' }[p.id];
    ctx.globalAlpha = .5 + Math.sin(t * 2) * .4; ctx.fillStyle = boss;
    ctx.beginPath(); ctx.arc(0, -70, 9 + Math.sin(t * 3) * 2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // 召唤提示
    ctx.font = '600 12px "Microsoft YaHei"'; ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(60,45,25,.7)'; ctx.lineWidth = 3;
    ctx.strokeText(p.n, 0, -92);
    ctx.fillStyle = '#ffd84c'; ctx.fillText(p.n, 0, -92);
  } else if (p.type === 'chest' && !p.opened) {
    drawSpr(ctx, p.sealed ? 'chest_sealed' : 'chest', 46, { bob: Math.sin(t * 2.5) * 2 });
    ctx.globalAlpha = .3 + Math.sin(t * 3) * .2; ctx.fillStyle = '#ffd84c';
    ctx.beginPath(); ctx.arc(0, -26, 14, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  } else if (p.type === 'survivor' && !p.rescued) {
    // 幸存者营地：帐篷+求救标记
    if (hasSpr('hut_wood')) drawSpr(ctx, 'hut_wood', 60);
    ctx.globalAlpha = .6 + Math.sin(t * 2.5) * .4; ctx.fillStyle = '#ffd84c';
    ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('❗', 22, -50);
    ctx.globalAlpha = 1;
    ctx.font = '600 12px "Microsoft YaHei"';
    ctx.strokeStyle = 'rgba(60,45,25,.7)'; ctx.lineWidth = 3;
    ctx.strokeText('幸存者', 0, -66);
    ctx.fillStyle = '#8ce05c'; ctx.fillText('幸存者', 0, -66);
  }
}
