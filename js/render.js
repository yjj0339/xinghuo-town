// ============================================================
// 等距渲染器：程序化矢量美术 + 昼夜光照 + 天气特效 + 物品图标
// ============================================================
import { CONFIG, BIOMES, WORLD_OBJECTS, BUILDINGS, ITEMS, MONSTERS, ANIMALS } from './data.js';

const TW = CONFIG.TILE_W, TH = CONFIG.TILE_H;

export function worldToScreen(wx, wz) { return { x: (wx - wz) * TW / 2, y: (wx + wz) * TH / 2 }; }

// ---------- 小工具 ----------
function diamondPath(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2); ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x, y + h / 2); ctx.lineTo(x - w / 2, y); ctx.closePath();
}
function ell(ctx, x, y, rx, ry, color, alpha = .22) {
  ctx.fillStyle = color; ctx.globalAlpha = alpha;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}

// ============================================================
// 物品图标（渲染 & UI 共用） 在 (0,0) 中心绘制，尺寸 s
// ============================================================
const ICON_SHAPES = {
  res: [['#c9a06a', .9]], material: [['#9fb6c9', .9]],
};
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
  if (id.startsWith('ore_')) Object.assign(col, {}); // 用默认矿石形状
  const kind =
    (it.tool?.kind === 'axe') ? 'axe' : (it.tool?.kind === 'pick') ? 'pick' : (it.tool?.kind === 'rod') ? 'rod' :
    (it.tool?.kind === 'shovel') ? 'shovel' : (it.tool?.kind === 'skin') ? 'flask' : (it.tool?.kind === 'feed' || it.tool?.kind === 'bait') ? 'pouch' : (it.tool?.kind === 'light') ? 'lantern' :
    (it.c === 'weapon' && it.wpn?.proj === 'arrow') ? 'bow' : (it.c === 'weapon' && it.wpn?.proj) ? 'staff' : it.c === 'weapon' ? 'sword' :
    it.c === 'armor' ? 'armor' : it.c === 'seed' ? 'seed' : it.c === 'fish' ? 'fish' :
    id.startsWith('potion') ? 'flask' : id === 'antidote' ? 'flask' :
    id.startsWith('ore_') ? 'ore' : id === 'crystal' ? 'crystal' : id === 'coal' ? 'ore' : id === 'bar_copper' || id === 'bar_iron' || id === 'bar_gold' ? 'bar' :
    (id === 'wood' || id === 'plank') ? 'plank' : id === 'stone' || id === 'brick' ? 'rock' : id === 'meat_raw' || id === 'meat_cooked' || id === 'jerky' ? 'meat' :
    id === 'berry' || id === 'chili' || id === 'apple' ? 'fruit' : id === 'bread' || id === 'honey_cookie' || id === 'cake' ? 'bread' :
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
    default: c.fillStyle = col; diamondPath(c, 0, 0, s * .6, s * .6); c.fill(); if (ICON_SHAPES[it.c]) { c.globalAlpha = .35; c.fillStyle = '#fff'; diamondPath(c, 0, 0, s * .34, s * .34); c.fill(); c.globalAlpha = 1; }
  }
  c.restore();
}

// ============================================================
// 世界物体绘制（树、矿、草丛……） 锚点=所站地面中心
// ============================================================
const TREE_COLS = { tree: ['#4e9440', '#5aa848', '#6ab856'], tree_big: ['#3f8a38', '#4e9e42', '#5aad4c'], tree_pine: ['#3c7a52', '#488a5c', '#549a66'], tree_snow: ['#4a8a6a', '#569a76'], tree_swamp: ['#6a8a4a', '#769a54'] };
export function drawWorldObject(ctx, o, wx, wz, time, q) {
  const def = WORLD_OBJECTS[o.id]; if (!def) return;
  const sway = Math.sin(time * 1.2 + wx * 2.1 + wz * 1.3) * .04;
  const S = 1; // 尺寸基准
  const hit = o.hitT > 0;
  ctx.save();
  if (hit) { ctx.translate(Math.sin(time * 60) * 2.5, 0); }
  switch (o.id) {
    case 'tree': case 'tree_big': case 'tree_pine': case 'tree_snow': case 'tree_swamp': case 'apple_tree': {
      const big = o.id === 'tree_big' ? 1.5 : 1;
      const cols = TREE_COLS[o.id === 'apple_tree' ? 'tree' : o.id] || TREE_COLS.tree;
      ell(ctx, 0, 4, 16 * big, 7 * big, '#2a4a20', .18);
      ctx.fillStyle = '#7a5636'; ctx.fillRect(-4 * big, -26 * big, 8 * big, 28 * big);
      ctx.save(); ctx.rotate(sway);
      if (o.id === 'tree_pine' || o.id === 'tree_snow') {
        for (let i = 0; i < 3; i++) { const yy = -26 - i * 14, ww = (26 - i * 6) * big; ctx.fillStyle = cols[i % cols.length]; ctx.beginPath(); ctx.moveTo(0, yy - 20); ctx.lineTo(ww, yy + 6); ctx.lineTo(-ww, yy + 6); ctx.closePath(); ctx.fill(); }
        if (o.id === 'tree_snow') { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.moveTo(0, -26 - 2 * 14 - 20); ctx.lineTo(14, -26 - 2 * 14 + 2); ctx.lineTo(-14, -26 - 2 * 14 + 2); ctx.closePath(); ctx.fill(); }
      } else {
        for (const [dx, dy, r] of [[-14, -34, 16], [14, -36, 15], [0, -48, 17], [-6, -28, 14]]) {
          ctx.fillStyle = cols[(Math.abs(dx) + dy) % cols.length > 0 ? 1 : 0];
          ctx.beginPath(); ctx.arc(dx * big, dy * big, r * big, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.arc(-8 * big, -46 * big, 8 * big, 0, Math.PI * 2); ctx.fill();
      }
      if (o.id === 'apple_tree') { ctx.fillStyle = '#e05c5c'; for (const [ax, ay] of [[-10, -36], [8, -44], [2, -30], [12, -32]]) { ctx.beginPath(); ctx.arc(ax, ay, 3.4, 0, Math.PI * 2); ctx.fill(); } }
      ctx.restore();
      break;
    }
    case 'tree_dead': ell(ctx, 0, 3, 12, 6, '#2a4a20', .15); ctx.strokeStyle = '#8a7256'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(-2, -30); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-1, -16); ctx.lineTo(-14, -28); ctx.moveTo(-2, -22); ctx.lineTo(12, -34); ctx.stroke(); break;
    case 'cactus': ell(ctx, 0, 3, 10, 5, '#2a4a20', .15); ctx.fillStyle = '#5cA85c'; rr(ctx, -6, -34, 12, 36, 6); ctx.fill(); rr(ctx, -18, -26, 10, 12, 5); ctx.fill(); rr(ctx, 8, -30, 10, 12, 5); ctx.fill(); ctx.fillStyle = '#f0d878'; ctx.beginPath(); ctx.arc(0, -34, 4, 0, Math.PI * 2); ctx.fill(); break;
    case 'rock': case 'rock_sand': {
      ell(ctx, 0, 3, 15, 7, '#222', .15);
      const c1 = o.id === 'rock_sand' ? '#d8c088' : '#9aa3ad', c2 = o.id === 'rock_sand' ? '#c9ae74' : '#7e8894';
      ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(-16, 2); ctx.lineTo(-9, -14); ctx.lineTo(5, -17); ctx.lineTo(16, -4); ctx.lineTo(10, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(-16, 2); ctx.lineTo(-9, -14); ctx.lineTo(-2, -4); ctx.closePath(); ctx.fill(); break;
    }
    case 'ore_copper': case 'ore_iron': case 'ore_gold': case 'ore_crystal': case 'ore_coal': case 'obsidian': case 'sulfur': {
      ell(ctx, 0, 3, 15, 7, '#222', .15);
      ctx.fillStyle = '#7e8894'; ctx.beginPath(); ctx.moveTo(-16, 3); ctx.lineTo(-10, -13); ctx.lineTo(6, -16); ctx.lineTo(15, -3); ctx.lineTo(9, 5); ctx.closePath(); ctx.fill();
      const oc = { ore_copper: '#e0884c', ore_iron: '#d8e2ea', ore_gold: '#f0c84c', ore_crystal: '#7cd8e8', ore_coal: '#3c3c44', obsidian: '#4a3a5c', sulfur: '#e8d84c' }[o.id];
      ctx.fillStyle = oc;
      if (o.id === 'ore_crystal') { for (const [dx, dy, h] of [[-8, -6, 12], [2, -9, 15], [9, -4, 10]]) { ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx + 4, dy - h); ctx.lineTo(dx + 8, dy); ctx.closePath(); ctx.fill(); } }
      else for (const [dx, dy] of [[-8, -6], [2, -9], [8, -3], [-2, 0]]) { ctx.beginPath(); ctx.arc(dx, dy, 4, 0, Math.PI * 2); ctx.fill(); }
      break;
    }
    case 'bush_berry': { ctx.fillStyle = '#4e9440'; for (const [dx, dy] of [[-8, -6], [8, -6], [0, -12], [-4, -2], [6, -1]]) { ctx.beginPath(); ctx.arc(dx, dy, 8, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#c04fc0'; for (const [dx, dy] of [[-8, -7], [5, -12], [0, -3], [9, -3]]) { ctx.beginPath(); ctx.arc(dx, dy, 2.6, 0, Math.PI * 2); ctx.fill(); } break; }
    case 'bush_herb': { ctx.strokeStyle = '#5cb85c'; ctx.lineWidth = 3; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 4, 0); ctx.quadraticCurveTo(i * 6, -10, i * 8, -16); ctx.stroke(); } ctx.fillStyle = '#e8f0d8'; ctx.beginPath(); ctx.arc(0, -16, 3, 0, Math.PI * 2); ctx.fill(); break; }
    case 'grass_tuft': { ctx.strokeStyle = '#6cbf4a'; ctx.lineWidth = 2.5; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 3.4, 1); ctx.quadraticCurveTo(i * 4.4 + sway * 30, -8, i * 5.4, -13); ctx.stroke(); } break; }
    case 'reeds': { ctx.strokeStyle = '#8ab86a'; ctx.lineWidth = 3; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 5, 1); ctx.lineTo(i * 6 + sway * 20, -18); ctx.stroke(); } ctx.fillStyle = '#b89a5c'; ctx.beginPath(); ctx.ellipse(4, -18, 2.4, 5, .2, 0, Math.PI * 2); ctx.fill(); break; }
    case 'mush_patch': { for (const [dx, dy, s] of [[-7, -2, 1], [4, -5, 1.2], [9, 0, .8]]) { ctx.fillStyle = '#f2ead8'; ctx.fillRect(dx - 1.6 * s, dy - 7 * s, 3.2 * s, 7 * s); ctx.fillStyle = '#d96a5a'; ctx.beginPath(); ctx.ellipse(dx, dy - 7 * s, 5 * s, 3.4 * s, 0, Math.PI, 0); ctx.fill(); } break; }
    case 'flower_patch': { for (const [dx, dy] of [[-8, -3], [0, -8], [8, -2], [-3, 3]]) { ctx.strokeStyle = '#5c8a3c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(dx, dy + 4); ctx.lineTo(dx, dy - 2); ctx.stroke(); ctx.fillStyle = ['#f0909c', '#f0c84c', '#a8c8f0', '#f2f2f2'][(dx + 9) % 4]; for (let p = 0; p < 5; p++) { const a = p / 5 * Math.PI * 2; ctx.beginPath(); ctx.arc(dx + Math.cos(a) * 3, dy - 3 + Math.sin(a) * 3, 2, 0, Math.PI * 2); ctx.fill(); } } break; }
    case 'sand_pile': { ctx.fillStyle = '#e6d298'; ctx.beginPath(); ctx.ellipse(0, -3, 16, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d8c088'; ctx.beginPath(); ctx.ellipse(-4, -1, 8, 4, 0, 0, Math.PI * 2); ctx.fill(); break; }
    case 'clay_pile': { ctx.fillStyle = '#b3714f'; ctx.beginPath(); ctx.ellipse(0, -3, 15, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#9c5c3e'; ctx.beginPath(); ctx.ellipse(3, -2, 7, 4, 0, 0, Math.PI * 2); ctx.fill(); break; }
    case 'hive': { ell(ctx, 0, 2, 10, 5, '#222', .15); ctx.fillStyle = '#e0a83c'; ctx.beginPath(); ctx.ellipse(0, -14, 11, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#c9902c'; ctx.lineWidth = 2.4; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(0, -14 + i * 7, 10 - Math.abs(i) * 2, 3, 0, 0, Math.PI * 2); ctx.stroke(); } ctx.fillStyle = '#43331e'; ctx.beginPath(); ctx.arc(0, -12, 3, 0, Math.PI * 2); ctx.fill(); break;
    }
    case 'meteor': { ell(ctx, 0, 3, 16, 8, '#222', .2); ctx.fillStyle = '#5c5468'; ctx.beginPath(); ctx.moveTo(-14, 2); ctx.lineTo(-6, -14); ctx.lineTo(8, -12); ctx.lineTo(14, 0); ctx.lineTo(4, 6); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#7cd8e8'; ctx.globalAlpha = .6 + Math.sin(time * 3) * .3; ctx.beginPath(); ctx.arc(0, -5, 5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; break; }
    case 'ruin_pillar': { ell(ctx, 0, 3, 13, 6, '#222', .18); ctx.fillStyle = '#b8b2a4'; ctx.fillRect(-8, -34, 16, 36); ctx.fillStyle = '#a09a8c'; ctx.fillRect(-8, -34, 6, 36); ctx.fillStyle = '#c9c3b5'; ctx.fillRect(-11, -38, 22, 6); ctx.fillRect(-11, -2, 22, 5); ctx.strokeStyle = '#8a8478'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-3, -30); ctx.lineTo(-3, -8); ctx.moveTo(3, -28); ctx.lineTo(3, -6); ctx.stroke(); break; }
  }
  ctx.restore();
}

// ============================================================
// 建筑绘制（等距立体）
// ============================================================
function isoBox(ctx, w, d, h, topC, leftC, rightC) {
  // w/d: 半宽深(像素), h: 高
  ctx.fillStyle = leftC; ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(0, d * .5); ctx.lineTo(0, d * .5 - h); ctx.lineTo(-w, -h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rightC; ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(0, d * .5); ctx.lineTo(0, d * .5 - h); ctx.lineTo(w, -h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = topC; ctx.beginPath(); ctx.moveTo(0, -d * .5); ctx.lineTo(w, 0); ctx.lineTo(0, d * .5); ctx.lineTo(-w, 0); ctx.closePath(); ctx.fill();
}
function roof(ctx, w, h, peak, c1, c2) {
  ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(0, w * .5 - h); ctx.lineTo(0, w * .5 - h - peak); ctx.lineTo(-w, -h - peak); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(0, w * .5 - h); ctx.lineTo(0, w * .5 - h - peak); ctx.lineTo(w, -h - peak); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(0, -w * .5 - h); ctx.lineTo(w, -h); ctx.lineTo(0, w * .5 - h); ctx.lineTo(-w, -h); ctx.closePath(); ctx.fill();
}

export function drawBuilding(ctx, id, b, time, neighbors) {
  const def = BUILDINGS[id]; if (!def) return;
  const hit = b?.hitT > 0;
  ctx.save();
  if (hit) ctx.translate(Math.sin(time * 60) * 2, 0);
  switch (id) {
    case 'campfire': { ell(ctx, 0, 2, 16, 8, '#222', .18); ctx.fillStyle = '#8a7256'; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI; ctx.save(); ctx.translate(0, -2); ctx.rotate(a + .4); rr(ctx, -2.6, -12, 5.2, 14, 2); ctx.fill(); ctx.restore(); } drawFlame(ctx, 0, -8, time, 1.2); break; }
    case 'torch': { ell(ctx, 0, 2, 7, 3.5, '#222', .18); ctx.fillStyle = '#8a7256'; ctx.fillRect(-2, -26, 4, 28); drawFlame(ctx, 0, -30, time, .8); break; }
    case 'wall_wood': { const L = neighbors?.L, R = neighbors?.R; ctx.fillStyle = '#b58a56'; ctx.beginPath(); ctx.moveTo(-32, 0); ctx.lineTo(0, 16); ctx.lineTo(0, 16 - 30); ctx.lineTo(-32, -30); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#a0784a'; ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(0, 16); ctx.lineTo(0, -14); ctx.lineTo(32, -30); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#d0a05c'; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(32, 0); ctx.lineTo(0, 16); ctx.lineTo(-32, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#8a6a3c'; ctx.lineWidth = 2; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(i * 16 - 4, -6 + Math.abs(i) * 2); ctx.lineTo(i * 8 + i, 8); } ctx.stroke(); break; }
    case 'wall_stone': { ctx.fillStyle = '#9aa3ad'; ctx.beginPath(); ctx.moveTo(-32, 0); ctx.lineTo(0, 16); ctx.lineTo(0, -18); ctx.lineTo(-32, -34); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#8a929c'; ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(0, 16); ctx.lineTo(0, -18); ctx.lineTo(32, -34); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#b4bcc4'; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(32, -4); ctx.lineTo(0, 12); ctx.lineTo(-32, -4); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#7e8892'; ctx.lineWidth = 1.5; for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.moveTo(-30, -6 - r * 10); ctx.lineTo(0, 9 - r * 10); ctx.moveTo(30, -6 - r * 10); ctx.lineTo(0, 9 - r * 10); ctx.stroke(); } break; }
    case 'fence': { ctx.strokeStyle = '#a8763e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-28, -6); ctx.lineTo(28, -22); ctx.moveTo(-28, -16); ctx.lineTo(28, -32); ctx.moveTo(-20, -2); ctx.lineTo(-20, -34); ctx.moveTo(6, -15); ctx.lineTo(6, -47); ctx.stroke(); break; }
    case 'gate_wood': case 'gate_stone': { const stone = id === 'gate_stone'; ctx.fillStyle = stone ? '#8a929c' : '#a0784a'; ctx.fillRect(-30, -44, 10, 46); ctx.fillRect(20, -28, 10, 46); ctx.fillStyle = stone ? '#b4bcc4' : '#c9a06a'; const open = b?.open; if (!open) { rr(ctx, -22, -40, 44, 40, 4); ctx.fill(); ctx.strokeStyle = stone ? '#7e8892' : '#8a6a3c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-22, -20); ctx.lineTo(22, -20); ctx.moveTo(-22, -32); ctx.lineTo(22, -32); ctx.stroke(); } else { ctx.save(); ctx.translate(-24, -40); ctx.rotate(-.4); rr(ctx, 0, 0, 40, 8, 3); ctx.fill(); ctx.restore(); } break; }
    case 'floor_wood': case 'floor_stone': { ctx.fillStyle = id === 'floor_wood' ? '#c9a06a' : '#b4bcc4'; diamondPath(ctx, 0, 0, 60, 30); ctx.fill(); ctx.strokeStyle = id === 'floor_wood' ? '#a8845c' : '#9aa2ac'; ctx.lineWidth = 1.6; diamondPath(ctx, 0, 0, 40, 20); ctx.stroke(); diamondPath(ctx, 0, 0, 20, 10); ctx.stroke(); break; }
    case 'bed_straw': case 'bed_wood': { const wood = id === 'bed_wood'; ctx.fillStyle = wood ? '#a8763e' : '#d8c088'; rr(ctx, -22, -34, 44, 54, 6); ctx.fill(); ctx.fillStyle = wood ? '#e8e2d0' : '#e8dca8'; rr(ctx, -17, -29, 34, 20, 5); ctx.fill(); ctx.fillStyle = '#c96a6a'; rr(ctx, -17, -6, 34, 20, 5); ctx.fill(); break; }
    case 'storage_wood': case 'storage_stone': { isoBox(ctx, 20, 20, 14, '#c9a06a', '#a0784a', '#b58a56'); ctx.fillStyle = '#8a6a3c'; ctx.fillRect(-20, -6, 40, 4); ctx.fillStyle = '#e0c060'; ctx.fillRect(-4, -8, 8, 8); break; }
    case 'bench_work': { ctx.fillStyle = '#a8763e'; ctx.fillRect(-24, -14, 8, 22); ctx.fillRect(16, -26, 8, 22); ctx.fillStyle = '#c9a06a'; ctx.save(); ctx.translate(0, -2); ctx.transform(1, .5, -1, .5, 0, 0); ctx.fillRect(-24, -20, 48, 28); ctx.restore(); ctx.fillStyle = '#8a97a5'; ctx.save(); ctx.translate(-6, -14); ctx.rotate(.3); rr(ctx, -8, -3, 16, 6, 2); ctx.fill(); ctx.restore(); ctx.fillStyle = '#e05c5c'; ctx.fillRect(10, -20, 6, 6); break; }
    case 'furnace': { isoBox(ctx, 20, 20, 26, '#7e8894', '#5c646e', '#6a727c'); ctx.fillStyle = '#3a3e44'; diamondPath(ctx, 0, -20, 22, 11); ctx.fill(); ctx.fillStyle = `rgba(255,${140 + Math.sin(time * 5) * 40 | 0},40,.9)`; ctx.beginPath(); ctx.arc(0, -2, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(14, -22, 8, 4); break; }
    case 'anvil': { ctx.fillStyle = '#545c66'; ctx.fillRect(-6, -2, 12, 10); ctx.fillStyle = '#6a747e'; rr(ctx, -16, -14, 32, 10, 4); ctx.fill(); rr(ctx, -20, -12, 8, 6, 2); ctx.fill(); ctx.fillStyle = '#8a97a5'; ctx.fillRect(-10, -20, 20, 6); break; }
    case 'pot_cook': { ctx.fillStyle = '#8a97a5'; ctx.beginPath(); ctx.ellipse(0, -8, 16, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#4a4e54'; ctx.beginPath(); ctx.ellipse(0, -12, 12, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e0a860'; ctx.beginPath(); ctx.ellipse(0, -13, 8, 4, 0, 0, Math.PI * 2); ctx.fill(); // 汤
      ctx.strokeStyle = '#b8c2cc'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -10, 18, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); // 把手
      for (let i = 0; i < 2; i++) { const p = (time * .6 + i * .5) % 1; ctx.globalAlpha = (1 - p) * .5; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(Math.sin(time + i * 2) * 5, -16 - p * 14, 2.5 - p, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; break; }
    case 'sawmill': { ctx.fillStyle = '#b58a56'; ctx.save(); ctx.transform(1, .5, -1, .5, 0, 0); ctx.fillRect(-22, -18, 44, 34); ctx.restore(); ctx.fillStyle = '#c9c3b5'; ctx.beginPath(); ctx.arc(-8, -14, 9, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#8a8478'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(-8, -14, 9, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8, -14); ctx.lineTo(-8 + Math.cos(time * 2) * 8, -14 + Math.sin(time * 2) * 8); ctx.stroke(); break; }
    case 'plot_farm': { ctx.fillStyle = '#8a6a4a'; diamondPath(ctx, 0, 0, 58, 29); ctx.fill(); ctx.strokeStyle = '#7a5c3e'; ctx.lineWidth = 2; diamondPath(ctx, 0, 0, 40, 20); ctx.stroke(); if (b?.crop) drawCrop(ctx, b.crop, time); break; }
    case 'well': { isoBox(ctx, 12, 12, 12, '#9aa3ad', '#7e8892', '#8a929c'); ctx.fillStyle = '#3a6ea8'; diamondPath(ctx, 0, -10, 16, 8); ctx.fill(); ctx.fillStyle = '#a8763e'; ctx.fillRect(-14, -34, 4, 26); ctx.fillRect(10, -34, 4, 26); ctx.fillStyle = '#c96a4a'; ctx.beginPath(); ctx.moveTo(-18, -32); ctx.lineTo(0, -42); ctx.lineTo(18, -32); ctx.lineTo(0, -26); ctx.closePath(); ctx.fill(); break; }
    case 'coop': { isoBox(ctx, 16, 14, 10, '#e0c090', '#b58a56', '#c9a06a'); roof(ctx, 20, 10, 8, '#c96a4a', '#b55c3e'); ctx.fillStyle = '#5c4432'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); break; }
    case 'barn': { isoBox(ctx, 18, 16, 14, '#d0a05c', '#a0784a', '#b58a56'); roof(ctx, 22, 14, 10, '#b55c3e', '#a04c32'); ctx.fillStyle = '#5c4432'; rr(ctx, -6, -8, 12, 14, 2); ctx.fill(); ctx.fillStyle = '#e8e2d0'; ctx.beginPath(); ctx.arc(0, -1, 3.4, 0, Math.PI * 2); ctx.fill(); break; }
    case 'pen': { ctx.strokeStyle = '#c9c3b5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 24, 12, 0, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = '#a8763e'; ctx.lineWidth = 2.4; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 24, Math.sin(a) * 12); ctx.lineTo(Math.cos(a) * 24, Math.sin(a) * 12 - 8); ctx.stroke(); } break; }
    case 'hut_wood': { isoBox(ctx, 22, 20, 22, '#d0a05c', '#a0784a', '#b58a56'); roof(ctx, 28, 22, 14, '#c96a4a', '#b55c3e'); ctx.fillStyle = '#5c4432'; rr(ctx, -7, -6, 14, 16, 3); ctx.fill(); ctx.fillStyle = '#f7e8a0'; ctx.beginPath(); ctx.arc(14, -12, 4.4, 0, Math.PI * 2); ctx.fill(); break; }
    case 'hut_stone': { isoBox(ctx, 24, 22, 26, '#b4bcc4', '#8a929c', '#9aa3ad'); roof(ctx, 30, 26, 16, '#5c7ea8', '#4a6a94'); ctx.fillStyle = '#5c4432'; rr(ctx, -8, -6, 16, 18, 3); ctx.fill(); ctx.fillStyle = '#f7e8a0'; ctx.beginPath(); ctx.arc(16, -16, 5, 0, Math.PI * 2); ctx.fill(); break; }
    case 'board_recruit': { ctx.fillStyle = '#8a7256'; ctx.fillRect(-3, -30, 6, 30); ctx.fillStyle = '#c9a06a'; ctx.save(); ctx.rotate(.05); rr(ctx, -18, -34, 36, 22, 3); ctx.fill(); ctx.fillStyle = '#e05c5c'; ctx.beginPath(); ctx.moveTo(-12, -30); ctx.lineTo(12, -30); ctx.lineTo(12, -20); ctx.lineTo(2, -24); ctx.lineTo(-12, -20); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#4a3b28'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('招贤', 0, -14); ctx.restore(); break; }
    case 'market': { ctx.fillStyle = '#a8763e'; ctx.fillRect(-22, -6, 6, 16); ctx.fillRect(16, -14, 6, 16); ctx.fillStyle = '#c9a06a'; ctx.save(); ctx.transform(1, .5, -1, .5, 0, 0); ctx.fillRect(-22, -12, 44, 12); ctx.restore(); ctx.fillStyle = '#e05c5c'; ctx.beginPath(); ctx.moveTo(-26, -20); ctx.lineTo(26, -34); ctx.lineTo(26, -24); ctx.lineTo(-26, -10); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#f2e8cc'; ctx.beginPath(); ctx.moveTo(-26, -20); ctx.lineTo(26, -34); ctx.lineTo(26, -31); ctx.lineTo(-26, -17); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#f0c84c'; ctx.beginPath(); ctx.arc(-8, -8, 3, 0, Math.PI * 2); ctx.arc(2, -10, 3, 0, Math.PI * 2); ctx.fill(); break; }
    case 'post': { ctx.fillStyle = '#a8763e'; ctx.fillRect(-20, -22, 8, 26); ctx.fillRect(12, -30, 8, 26); ctx.fillStyle = '#c9a06a'; ctx.save(); ctx.transform(1, .5, -1, .5, 0, 0); ctx.fillRect(-20, -28, 40, 10); ctx.restore(); ctx.fillStyle = '#7cb8d8'; ctx.beginPath(); ctx.moveTo(-20, -26); ctx.quadraticCurveTo(0, -18, 20, -34); ctx.lineTo(20, -30); ctx.quadraticCurveTo(0, -12, -20, -22); ctx.closePath(); ctx.fill(); break; }
    case 'notice_board': { ctx.fillStyle = '#8a7256'; ctx.fillRect(-3, -26, 6, 28); ctx.fillStyle = '#c9a06a'; rr(ctx, -16, -30, 32, 20, 3); ctx.fill(); ctx.strokeStyle = '#8a6a3c'; ctx.lineWidth = 2; rr(ctx, -12, -26, 11, 13, 2); ctx.stroke(); rr(ctx, 1, -26, 11, 13, 2); ctx.stroke(); break; }
    case 'tower_arrow': case 'tower_ballista': { const heavy = id === 'tower_ballista'; const col = heavy ? ['#9aa3ad', '#6a747e', '#7e8894'] : ['#d0a05c', '#a0784a', '#b58a56']; isoBox(ctx, 14, 14, heavy ? 40 : 32, ...col); ctx.fillStyle = heavy ? '#8a929c' : '#c9a06a'; ctx.save(); ctx.translate(0, -(heavy ? 40 : 32) + 2); ctx.transform(1, .5, -1, .5, 0, 0); ctx.fillRect(-14, -8, 28, 16); ctx.restore(); ctx.save(); ctx.translate(0, -(heavy ? 40 : 32) - 4); ctx.rotate(Math.sin(time) * .2); ctx.strokeStyle = '#545c66'; ctx.lineWidth = 3; if (heavy) { ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.moveTo(0, -6); ctx.lineTo(0, 6); ctx.stroke(); } else { ctx.beginPath(); ctx.arc(0, 0, 8, Math.PI * .2, Math.PI * .8, true); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-7, -5); ctx.lineTo(-7, 5); ctx.stroke(); } ctx.restore(); break; }
    case 'spikes': { ctx.fillStyle = '#b8c2cc'; for (const [dx, dz] of [[-12, -4], [0, -10], [12, -4], [-6, 2], [8, 2], [0, 6]]) { ctx.beginPath(); ctx.moveTo(dx - 4, dz + 4); ctx.lineTo(dx, dz - 12); ctx.lineTo(dx + 4, dz + 4); ctx.closePath(); ctx.fill(); } break; }
    case 'flower_bed': { ctx.fillStyle = '#a8763e'; diamondPath(ctx, 0, 0, 52, 26); ctx.fill(); ctx.fillStyle = '#8a6a4a'; diamondPath(ctx, 0, 0, 42, 21); ctx.fill(); for (const [dx, dy, c] of [[-12, -4, '#f0909c'], [0, -8, '#f0c84c'], [12, -4, '#a8c8f0'], [-6, 4, '#f2f2f2'], [8, 4, '#f0909c']]) { ctx.fillStyle = '#5c8a3c'; ctx.fillRect(dx - 1, dy - 6, 2, 6); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(dx, dy - 7, 3.4, 0, Math.PI * 2); ctx.fill(); } break; }
    case 'lamp_post': { ell(ctx, 0, 2, 6, 3, '#222', .15); ctx.fillStyle = '#545c66'; ctx.fillRect(-2, -36, 4, 38); ctx.fillStyle = '#ffe08a'; diamondPath(ctx, 0, -38, 16, 10); ctx.fill(); ctx.strokeStyle = '#8a97a5'; ctx.lineWidth = 1.5; diamondPath(ctx, 0, -38, 16, 10); ctx.stroke(); break; }
    case 'bench_park': { ctx.fillStyle = '#a8763e'; ctx.fillRect(-16, -8, 4, 10); ctx.fillRect(12, -8, 4, 10); ctx.save(); ctx.transform(1, .5, -1, .5, 0, 0); ctx.fillStyle = '#c9a06a'; ctx.fillRect(-16, -6, 32, 6); ctx.restore(); break; }
    case 'fountain': { ctx.fillStyle = '#b4bcc4'; ctx.beginPath(); ctx.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#5fb7d4'; ctx.beginPath(); ctx.ellipse(0, -2, 17, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c9c3b5'; ctx.fillRect(-4, -20, 8, 18); ctx.fillStyle = '#8fd0e8'; for (let i = 0; i < 5; i++) { const p = (time * .8 + i * .2) % 1; ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.arc(Math.sin(i * 2.5) * 8, -20 - p * 14 + p * p * 16, 2, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; break; }
    case 'statue_hero': { ctx.fillStyle = '#b4bcc4'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#9aa3ad'; rr(ctx, -8, -40, 16, 36, 4); ctx.fill(); ctx.fillStyle = '#d8c088'; ctx.beginPath(); ctx.arc(0, -44, 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(8, -34); ctx.lineTo(20, -52); ctx.stroke(); ctx.fillStyle = '#f0c84c'; ctx.save(); ctx.translate(0, -52); ctx.rotate(.5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(5, -3); ctx.lineTo(0, -14); ctx.lineTo(-5, -3); ctx.closePath(); ctx.fill(); ctx.restore(); break; }
    case 'altar_ancient': { ctx.fillStyle = '#8a929c'; diamondPath(ctx, 0, 0, 56, 28); ctx.fill(); ctx.fillStyle = '#6a747e'; diamondPath(ctx, 0, 0, 40, 20); ctx.fill(); ctx.fillStyle = '#9aa3ad'; ctx.fillRect(-6, -24, 12, 22); ctx.fillStyle = '#7cd8e8'; ctx.globalAlpha = .5 + Math.sin(time * 2) * .4; ctx.beginPath(); ctx.arc(0, -30, 8 + Math.sin(time * 3) * 2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; break; }
    default: isoBox(ctx, 16, 16, 16, '#c9a06a', '#a0784a', '#b58a56');
  }
  // 建筑血条（受损时）
  if (b && b.hp < def.hp) {
    const w = 30, y = -46; ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(-w / 2, y, w, 4); ctx.fillStyle = '#6cbf4a'; ctx.fillRect(-w / 2, y, w * Math.max(0, b.hp / def.hp), 4);
  }
  ctx.restore();
}

function drawFlame(ctx, x, y, time, s) {
  for (let i = 0; i < 3; i++) {
    const p = (time * 2.2 + i * .33) % 1;
    const r = (1 - p) * 7 * s + 2;
    ctx.globalAlpha = (1 - p) * .8;
    ctx.fillStyle = i === 0 ? '#ffb43c' : i === 1 ? '#ff7d3b' : '#ffe08a';
    ctx.beginPath(); ctx.ellipse(x + Math.sin(time * 6 + i * 2.4) * 2 * s, y - p * 10 * s, r * .6, r, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCrop(ctx, crop, time) {
  const stage = Math.min(3, Math.floor(crop.growth * 4));
  const cols = { wheat: ['#7cc95c', '#a8c95c', '#d8c060', '#e8d070'], carrot: ['#6cc95c', '#6cc95c', '#5cb85c', '#f08c3c'], pumpkin: ['#6cc95c', '#7cc95c', '#8cc95c', '#e08828'], chili: ['#6cc95c', '#7cc95c', '#5cb85c', '#e04530'] };
  const cc = cols[crop.id] || cols.wheat;
  for (const [dx, dz] of [[-14, -5], [0, -9], [14, -5], [-7, 3], [7, 3]]) {
    ctx.strokeStyle = '#4e9440'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(dx, dz); ctx.lineTo(dx, dz - 5 - stage * 3); ctx.stroke();
    if (stage >= 2) { ctx.fillStyle = cc[stage]; ctx.beginPath(); ctx.arc(dx, dz - 5 - stage * 3, 2.4 + stage * .8, 0, Math.PI * 2); ctx.fill(); }
    if (stage === 3 && crop.id === 'carrot') { ctx.fillStyle = '#f08c3c'; ctx.beginPath(); ctx.moveTo(dx - 2.4, dz + 1); ctx.lineTo(dx, dz - 4); ctx.lineTo(dx + 2.4, dz + 1); ctx.closePath(); ctx.fill(); }
    if (stage === 3 && crop.id === 'pumpkin') { ctx.fillStyle = '#e08828'; ctx.beginPath(); ctx.ellipse(dx, dz - 1, 4.4, 3.4, 0, 0, Math.PI * 2); ctx.fill(); }
  }
}

// ============================================================
// 角色绘制
// ============================================================
export function drawHumanoid(ctx, e, time, look) {
  // look: {body, head, hat, weapon, cape}
  const walk = e.moving ? Math.sin(time * 10) : 0;
  const dir = e.dir; // 0下(朝屏幕) 1左 2右 3上
  const bob = e.moving ? Math.abs(Math.sin(time * 10)) * 2 : Math.sin(time * 2) * .6;
  ell(ctx, 0, 2, 9, 4.5, '#222', .2);
  const { body = '#7cb8d8', head = '#f2d4b0', hat = null, weapon = null, cape = null } = look || {};
  if (cape) { ctx.fillStyle = cape; ctx.beginPath(); ctx.moveTo(-6, -12 - bob); ctx.quadraticCurveTo(-9 + walk * 2, -2, -5, 2); ctx.lineTo(5, 2); ctx.quadraticCurveTo(9 + walk * 2, -2, 6, -12 - bob); ctx.closePath(); ctx.fill(); }
  // 腿
  ctx.strokeStyle = '#5c5040'; ctx.lineWidth = 3.4;
  ctx.beginPath(); ctx.moveTo(-3, -8); ctx.lineTo(-3 + walk * 3, 1); ctx.moveTo(3, -8); ctx.lineTo(3 - walk * 3, 1); ctx.stroke();
  // 身体
  ctx.fillStyle = body; rr(ctx, -6.4, -18 - bob, 12.8, 12, 5); ctx.fill();
  // 手 + 武器
  const swing = e.atkT > 0 ? -1.8 + (1 - e.atkT) * 2.6 : 0;
  ctx.strokeStyle = head; ctx.lineWidth = 3;
  const wx = dir === 2 ? 8 : -8;
  ctx.beginPath(); ctx.moveTo(wx * .6, -15 - bob); ctx.lineTo(wx, -10 - bob); ctx.stroke();
  if (weapon) { ctx.save(); ctx.translate(wx, -12 - bob); ctx.rotate(dir === 2 ? -.7 + swing : .7 - swing); ctx.scale(.62, .62); ctx.globalAlpha = 1; drawItemIcon(ctx, weapon, 30); ctx.restore(); }
  // 头
  ctx.fillStyle = head; ctx.beginPath(); ctx.arc(0, -23 - bob, 6.4, 0, Math.PI * 2); ctx.fill();
  // 眼睛
  if (dir !== 3) { ctx.fillStyle = '#2a2420'; const ex = dir === 1 ? -2 : dir === 2 ? 2 : 0; ctx.beginPath(); ctx.arc(ex - 2, -23 - bob, 1.1, 0, Math.PI * 2); ctx.arc(ex + 2, -23 - bob, 1.1, 0, Math.PI * 2); ctx.fill(); }
  if (hat) { ctx.fillStyle = hat; ctx.beginPath(); ctx.ellipse(0, -27 - bob, 7.4, 3, 0, Math.PI, 0); ctx.fill(); rr(ctx, -5, -28 - bob, 10, 4, 2); ctx.fill(); }
}

export function drawMonster(ctx, e, time) {
  const m = MONSTERS[e.type]; if (!m) return;
  const s = m.size || 1;
  const bob = Math.sin(time * 6 + e.seed * 10) * 1.5;
  ctx.save(); ctx.scale(s, s);
  const flash = e.hitT > 0;
  if (flash) { ctx.filter = 'brightness(1.8)'; }
  ell(ctx, 0, 3, 11, 5, '#222', .2);
  switch (e.type) {
    case 'slime': case 'slime_ice': case 'slime_lava': {
      const c = e.type === 'slime' ? ['#7cd85c', '#5cb840'] : e.type === 'slime_ice' ? ['#8cd8f0', '#5cb8e0'] : ['#f0904c', '#e06830'];
      const sq = 1 + Math.sin(time * 5 + e.seed * 7) * .12;
      ctx.fillStyle = c[0]; ctx.beginPath(); ctx.ellipse(0, -8 / sq, 10 * sq, 8 / sq, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c[1]; ctx.beginPath(); ctx.ellipse(0, -6 / sq, 6.4 * sq, 5 / sq, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-3, -10, 1.4, 0, Math.PI * 2); ctx.arc(3, -10, 1.4, 0, Math.PI * 2); ctx.fill(); break;
    }
    case 'wolf': case 'wolf_snow': {
      const c = e.type === 'wolf' ? ['#9aa3ad', '#7e8892'] : ['#f2f6f8', '#d8e2ea'];
      ctx.fillStyle = c[0]; ctx.beginPath(); ctx.ellipse(0, -9 + bob * .3, 13, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-11, -12, 5.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c[1]; ctx.beginPath(); ctx.moveTo(-13, -15); ctx.lineTo(-11, -20); ctx.lineTo(-9, -15); ctx.closePath(); ctx.moveTo(-8, -16); ctx.lineTo(-6, -20); ctx.lineTo(-4, -15); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = c[0]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(11, -9); ctx.lineTo(16, -12 + Math.sin(time * 8) * 2); ctx.stroke();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-13, -13, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e05c5c'; ctx.beginPath(); ctx.arc(-15.4, -12, 1, 0, Math.PI * 2); ctx.fill(); break;
    }
    case 'boar': { ctx.fillStyle = '#8a6a4c'; ctx.beginPath(); ctx.ellipse(0, -8 + bob * .3, 13, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#755638'; ctx.beginPath(); ctx.arc(-12, -9, 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-16, -8); ctx.lineTo(-20, -5); ctx.moveTo(-14, -6); ctx.lineTo(-18, -3); ctx.stroke(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-13, -11, 1.2, 0, Math.PI * 2); ctx.fill(); break; }
    case 'rabbit_mob': case 'chicken': case 'cow': case 'sheep': case 'deer': drawAnimal(ctx, e, time); break;
    case 'goblin': case 'goblin_king': case 'goblin_archer': {
      const king = e.type === 'goblin_king';
      ctx.fillStyle = king ? '#5c9c4a' : '#7cb85c';
      rr(ctx, -6, -16 + bob * .4, 12, 11, 4); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -20 + bob * .4, 6.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e0a83c'; // 耳朵
      ctx.beginPath(); ctx.moveTo(-5, -22); ctx.lineTo(-10, -27); ctx.lineTo(-3, -24); ctx.closePath(); ctx.moveTo(5, -22); ctx.lineTo(10, -27); ctx.lineTo(3, -24); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d84040'; ctx.beginPath(); ctx.arc(-2.4, -20, 1.3, 0, Math.PI * 2); ctx.arc(2.4, -20, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5c745c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-8, -1); ctx.moveTo(6, -8); ctx.lineTo(8, -1); ctx.stroke();
      if (king) { ctx.fillStyle = '#f0c84c'; ctx.beginPath(); ctx.moveTo(-8, -25); ctx.lineTo(-5, -32); ctx.lineTo(-2, -26); ctx.lineTo(0, -33); ctx.lineTo(2, -26); ctx.lineTo(5, -32); ctx.lineTo(8, -25); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#8a7256'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(7, -12); ctx.lineTo(15, -22); ctx.stroke(); }
      else if (e.type === 'goblin_archer') { ctx.strokeStyle = '#a8763e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(9, -14, 6, -Math.PI * .5, Math.PI * .5); ctx.stroke(); }
      else { ctx.strokeStyle = '#9aa3ad'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(7, -12); ctx.lineTo(13, -19); ctx.stroke(); }
      break;
    }
    case 'spider': { ctx.fillStyle = '#4a4048'; ctx.beginPath(); ctx.ellipse(0, -8, 9, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#3a323c'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = .5 + i * .5; const l = Math.sin(time * 8 + i) * 1.4; ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-14 - i, -4 + i * 3 + l); ctx.moveTo(8, -8); ctx.lineTo(14 + i, -4 + i * 3 - l); ctx.stroke(); } ctx.fillStyle = '#d84040'; ctx.beginPath(); ctx.arc(-3, -10, 1.2, 0, Math.PI * 2); ctx.arc(3, -10, 1.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e8e2d0'; ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(0, -4); ctx.lineTo(2, -6); ctx.closePath(); ctx.fill(); break; }
    case 'treant_sap': case 'treant_ancient': {
      const anc = e.type === 'treant_ancient';
      const trunk = anc ? '#6a4a2c' : '#7a5636';
      ctx.fillStyle = trunk; ctx.beginPath(); ctx.moveTo(-8, 2); ctx.lineTo(-5, -24); ctx.lineTo(5, -24); ctx.lineTo(8, 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = anc ? '#3f8a5c' : '#5aa848';
      for (const [dx, dy, r] of [[-13, -26, 11], [13, -26, 11], [0, -36, 13]]) { ctx.beginPath(); ctx.arc(dx, dy, r, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#d84040'; ctx.beginPath(); ctx.arc(-3, -18, 1.6, 0, Math.PI * 2); ctx.arc(3, -18, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4a3018'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, -14); ctx.lineTo(-14, -20 + Math.sin(time * 3) * 3); ctx.moveTo(6, -14); ctx.lineTo(14, -20 - Math.sin(time * 3) * 3); ctx.stroke();
      if (anc) { ctx.fillStyle = '#7cd8e8'; ctx.globalAlpha = .4; ctx.beginPath(); ctx.arc(0, -26, 26 + Math.sin(time * 2) * 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      break;
    }
    case 'mush_toxic': { ctx.fillStyle = '#f2ead8'; ctx.fillRect(-3.4, -10, 6.8, 10); ctx.fillStyle = '#9c6ab8'; ctx.beginPath(); ctx.ellipse(0, -11, 10, 7, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#d8b8e8'; ctx.beginPath(); ctx.arc(-4, -13, 1.8, 0, Math.PI * 2); ctx.arc(4, -12, 1.6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-1.6, -6, 1, 0, Math.PI * 2); ctx.arc(1.6, -6, 1, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = .3; ctx.fillStyle = '#9c6ab8'; ctx.beginPath(); ctx.arc(0, -16, 3 + Math.sin(time * 2) * 2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; break; }
    case 'croc': { ctx.fillStyle = '#5c8a4a'; ctx.beginPath(); ctx.ellipse(0, -6 + bob * .2, 15, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(12, -6); ctx.lineTo(20, -8); ctx.lineTo(20, -3); ctx.lineTo(12, -3); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#d8e8a0'; ctx.beginPath(); ctx.arc(-8, -6, 1.2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#4a723c'; ctx.lineWidth = 2; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-10 + i * 8, -12); ctx.lineTo(-8 + i * 8, -15); ctx.lineTo(-6 + i * 8, -12); ctx.stroke(); } break; }
    case 'bog_lurker': { ctx.fillStyle = '#5a6a4a'; ctx.beginPath(); ctx.moveTo(-12, 2); ctx.lineTo(-7, -20); ctx.lineTo(0, -14); ctx.lineTo(7, -22); ctx.lineTo(12, 2); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#c8e858'; ctx.beginPath(); ctx.arc(-3, -12, 2, 0, Math.PI * 2); ctx.arc(4, -14, 2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = .25; ctx.fillStyle = '#7a9b5e'; ctx.beginPath(); ctx.ellipse(0, -2, 16, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; break; }
    case 'scorpion': { ctx.fillStyle = '#a8864c'; ctx.beginPath(); ctx.ellipse(0, -7, 9, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#8a6a3c'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-7, -6 + i * 2); ctx.lineTo(-13, -2 + i * 3); ctx.moveTo(7, -6 + i * 2); ctx.lineTo(13, -2 + i * 3); ctx.stroke(); } ctx.strokeStyle = '#a8864c'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(9, -8); ctx.quadraticCurveTo(16, -18, 10, -20); ctx.stroke(); ctx.fillStyle = '#d84040'; ctx.beginPath(); ctx.arc(-9, -8, 1.2, 0, Math.PI * 2); ctx.fill(); break; }
    case 'mummy': { ctx.fillStyle = '#e8e2d0'; rr(ctx, -6.4, -18 + bob * .3, 12.8, 18, 4); ctx.fill(); ctx.beginPath(); ctx.arc(0, -21, 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#c9c3b5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, -14); ctx.lineTo(6, -12); ctx.moveTo(-6, -9); ctx.lineTo(6, -7); ctx.stroke(); ctx.fillStyle = '#3cd8c8'; ctx.globalAlpha = .6 + Math.sin(time * 4) * .3; ctx.beginPath(); ctx.arc(-2, -21, 1.4, 0, Math.PI * 2); ctx.arc(2, -21, 1.4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; break; }
    case 'sandworm': { const up = Math.sin(time * 2 + e.seed * 8) * 3; ctx.fillStyle = '#d8b878'; ctx.beginPath(); ctx.ellipse(0, -10 + up, 8, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#b8935c'; ctx.beginPath(); ctx.ellipse(0, -2, 12, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#4a3018'; ctx.beginPath(); ctx.ellipse(0, -20 + up, 5, 3.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e8d8a0'; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 5, -20 + up + Math.sin(a) * 3.4); ctx.lineTo(Math.cos(a) * 7.4, -20 + up + Math.sin(a) * 5); ctx.lineTo(Math.cos(a + .4) * 5, -20 + up + Math.sin(a + .4) * 3.4); ctx.closePath(); ctx.fill(); } break; }
    case 'yeti': { ctx.fillStyle = '#f2f6f8'; rr(ctx, -10, -24 + bob * .3, 20, 24, 8); ctx.fill(); ctx.fillStyle = '#d8e2ea'; ctx.beginPath(); ctx.arc(0, -27, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#5c7ea8'; ctx.beginPath(); ctx.arc(-3, -27, 1.4, 0, Math.PI * 2); ctx.arc(3, -27, 1.4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#f2f6f8'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-9, -18); ctx.lineTo(-15, -10); ctx.moveTo(9, -18); ctx.lineTo(15, -10); ctx.stroke(); break; }
    case 'banshee': { ctx.globalAlpha = .85; ctx.fillStyle = '#cfe4ee'; ctx.beginPath(); ctx.moveTo(-9, -2); ctx.quadraticCurveTo(-11, -18, 0, -28); ctx.quadraticCurveTo(11, -18, 9, -2); ctx.quadraticCurveTo(4, -8, 0, -2); ctx.quadraticCurveTo(-4, -8, -9, -2); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#8ab8d8'; ctx.beginPath(); ctx.arc(0, -22, 5.4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-2, -22, 1.2, 0, Math.PI * 2); ctx.arc(2, -22, 1.2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = .3; ctx.fillStyle = '#cfe4ee'; ctx.beginPath(); ctx.arc(0, -14, 16 + Math.sin(time * 3) * 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; break; }
    case 'bat_fire': { const flap = Math.sin(time * 14) * 6; ctx.fillStyle = '#e0683c'; ctx.beginPath(); ctx.moveTo(0, -16); ctx.quadraticCurveTo(-10, -20 - flap, -16, -12 - flap); ctx.quadraticCurveTo(-8, -12, 0, -10); ctx.quadraticCurveTo(8, -12, 16, -12 - flap); ctx.quadraticCurveTo(10, -20 - flap, 0, -16); ctx.fill(); ctx.fillStyle = '#5c3428'; ctx.beginPath(); ctx.arc(0, -14, 4.4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffd84c'; ctx.beginPath(); ctx.arc(-1.6, -14, 1, 0, Math.PI * 2); ctx.arc(1.6, -14, 1, 0, Math.PI * 2); ctx.fill(); break; }
    case 'demon_imp': case 'demon_lava': {
      const big = e.type === 'demon_lava';
      const c = big ? ['#c84c2c', '#a03c1c'] : ['#e0784c', '#c85c2c'];
      ctx.fillStyle = c[0]; rr(ctx, -6.4, -16 + bob * .4, 12.8, 12, 5); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -20, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c[1]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-13, -20); ctx.quadraticCurveTo(-18, -26, -14, -30); ctx.moveTo(13, -20); ctx.quadraticCurveTo(18, -26, 14, -30); ctx.stroke();
      ctx.fillStyle = '#ffd84c'; ctx.beginPath(); ctx.arc(-2.4, -20, 1.3, 0, Math.PI * 2); ctx.arc(2.4, -20, 1.3, 0, Math.PI * 2); ctx.fill();
      drawFlame(ctx, big ? -10 : -8, big ? -14 : -12, time, big ? .9 : .5);
      if (big) { ctx.globalAlpha = .3; ctx.fillStyle = '#ff7d3b'; ctx.beginPath(); ctx.arc(0, -14, 22 + Math.sin(time * 3) * 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
      break;
    }
    case 'skeleton': { ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, -6); ctx.moveTo(-5, -14); ctx.lineTo(5, -14); ctx.moveTo(-4, -6); ctx.lineTo(-4, 0); ctx.moveTo(4, -6); ctx.lineTo(4, 0); ctx.stroke(); ctx.fillStyle = '#f2ead8'; ctx.beginPath(); ctx.arc(0, -21, 5.4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-2, -21, 1.2, 0, Math.PI * 2); ctx.arc(2, -21, 1.2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#9aa3ad'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(6, -13); ctx.lineTo(12, -18); ctx.stroke(); break; }
    case 'zombie': { ctx.fillStyle = '#7c9c6a'; rr(ctx, -6.4, -17 + bob * .3, 12.8, 13, 4); ctx.fill(); ctx.fillStyle = '#8fb89a'; ctx.beginPath(); ctx.arc(0, -21, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-2, -21, 1.1, 0, Math.PI * 2); ctx.arc(2.4, -21, 1.1, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#7c9c6a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, -13); ctx.lineTo(-9, -8 + Math.sin(time * 3) * 2); ctx.moveTo(6, -13); ctx.lineTo(9, -8 - Math.sin(time * 3) * 2); ctx.stroke(); break; }
    case 'shadow': { ctx.globalAlpha = .75; ctx.fillStyle = '#3a3448'; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-10, -16, 0, -26); ctx.quadraticCurveTo(10, -16, 8, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#c86ae8'; ctx.beginPath(); ctx.arc(-2, -20, 1.4, 0, Math.PI * 2); ctx.arc(2, -20, 1.4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; break; }
    case 'ice_queen': {
      ctx.fillStyle = '#cfe4ee'; ctx.beginPath(); ctx.moveTo(-11, 0); ctx.quadraticCurveTo(-13, -22, 0, -34); ctx.quadraticCurveTo(13, -22, 11, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8cd8f0'; ctx.beginPath(); ctx.arc(0, -27, 6.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5c7ea8'; ctx.beginPath(); ctx.arc(-2.4, -27, 1.3, 0, Math.PI * 2); ctx.arc(2.4, -27, 1.3, 0, Math.PI * 2); ctx.fill();
      // 冰冠
      ctx.fillStyle = '#e8f6fc'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 4 - 1.6, -32); ctx.lineTo(i * 4, -38 - Math.abs(i)); ctx.lineTo(i * 4 + 1.6, -32); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = '#8cd8f0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -16); ctx.lineTo(-17, -22 + Math.sin(time * 3) * 3); ctx.moveTo(10, -16); ctx.lineTo(17, -22 - Math.sin(time * 3) * 3); ctx.stroke();
      ctx.globalAlpha = .25; ctx.fillStyle = '#8cd8f0'; ctx.beginPath(); ctx.arc(0, -18, 24 + Math.sin(time * 2) * 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; break;
    }
    case 'flame_lord': {
      ctx.fillStyle = '#5c2c1c'; rr(ctx, -10, -26 + bob * .3, 20, 24, 8); ctx.fill();
      ctx.fillStyle = '#3c1c10'; ctx.beginPath(); ctx.arc(0, -30, 8, 0, Math.PI * 2); ctx.fill();
      // 熔岩裂纹
      ctx.strokeStyle = `rgba(255,${120 + Math.sin(time * 6) * 60 | 0},40,.95)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-7, -20); ctx.lineTo(-2, -14); ctx.lineTo(-6, -8); ctx.moveTo(6, -22); ctx.lineTo(2, -16); ctx.stroke();
      ctx.fillStyle = '#ffd84c'; ctx.beginPath(); ctx.arc(-3, -30, 1.6, 0, Math.PI * 2); ctx.arc(3, -30, 1.6, 0, Math.PI * 2); ctx.fill();
      // 双角
      ctx.strokeStyle = '#2a1810'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-6, -35); ctx.quadraticCurveTo(-12, -42, -8, -46); ctx.moveTo(6, -35); ctx.quadraticCurveTo(12, -42, 8, -46); ctx.stroke();
      drawFlame(ctx, 0, -48, time, 1.4);
      ctx.globalAlpha = .3; ctx.fillStyle = '#ff7d3b'; ctx.beginPath(); ctx.arc(0, -20, 28 + Math.sin(time * 3) * 4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; break;
    }
  }
  if (flash) ctx.filter = 'none';
  ctx.restore();
  // 血条
  if (e.hp < e.maxHp && !m.boss) {
    const y = -34 * s; ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(-13, y, 26, 3.4); ctx.fillStyle = m.boss ? '#c86ae8' : '#e05c5c'; ctx.fillRect(-13, y, 26 * Math.max(0, e.hp / e.maxHp), 3.4);
  }
}

export function drawAnimal(ctx, e, time) {
  const a = ANIMALS[e.type] || MONSTERS[e.type];
  const bob = Math.sin(time * 8 + e.seed * 9) * 1.4;
  ell(ctx, 0, 2, 9, 4.5, '#222', .2);
  switch (e.type) {
    case 'chicken': { ctx.fillStyle = '#f7f3ea'; ctx.beginPath(); ctx.ellipse(0, -7 + bob * .4, 7.4, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(-6, -12 + bob * .4, 3.4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e05c5c'; ctx.beginPath(); ctx.arc(-6, -15 + bob * .4, 1.6, 0, Math.PI * 2); ctx.arc(-6, -11 + bob * .4, 1.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e8a13c'; ctx.beginPath(); ctx.moveTo(-9, -12); ctx.lineTo(-13, -11); ctx.lineTo(-9, -10); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#e05c5c'; ctx.beginPath(); ctx.arc(2, -12, 1, 0, Math.PI * 2); ctx.fill(); break; }
    case 'cow': { ctx.fillStyle = '#f2ead8'; ctx.beginPath(); ctx.ellipse(0, -10, 13, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#3c342c'; ctx.beginPath(); ctx.ellipse(-4, -12, 5, 4, 0, 0, Math.PI * 2); ctx.ellipse(7, -8, 4, 3.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e8d4b8'; ctx.beginPath(); ctx.arc(-12, -11, 5.4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d8a4b8'; ctx.beginPath(); ctx.ellipse(-12, -7, 3.4, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#e8d4b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-13, -14); ctx.lineTo(-15, -18); ctx.moveTo(-11, -14); ctx.lineTo(-9, -18); ctx.stroke(); break; }
    case 'sheep': { ctx.fillStyle = '#f7f3ea'; ctx.beginPath(); ctx.ellipse(0, -10, 11, 8, 0, 0, Math.PI * 2); ctx.fill(); for (const [dx, dy] of [[-6, -14], [0, -16], [6, -14]]) { ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#4a4038'; ctx.beginPath(); ctx.arc(-12, -11, 4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#4a4038'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-13, -13); ctx.quadraticCurveTo(-17, -14, -16, -17); ctx.stroke(); break; }
    case 'deer': { ctx.fillStyle = '#c9a37a'; ctx.beginPath(); ctx.ellipse(0, -11, 10, 6.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(-10, -16, 4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-11, -19); ctx.lineTo(-13, -25); ctx.moveTo(-13, -23); ctx.lineTo(-16, -25); ctx.moveTo(-13, -23); ctx.lineTo(-10, -26); ctx.moveTo(-9, -19); ctx.lineTo(-7, -25); ctx.stroke(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-11, -17, 1, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e8d4b8'; ctx.beginPath(); ctx.ellipse(9, -14, 3, 2, 0, 0, Math.PI * 2); ctx.fill(); break; }
    case 'rabbit_mob': { ctx.fillStyle = '#e8e2d0'; ctx.beginPath(); ctx.ellipse(0, -6 + bob * .5, 6, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(5, -10, 3.4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f2ead8'; ctx.beginPath(); ctx.ellipse(6, -15, 1.4, 3.4, .2, 0, Math.PI * 2); ctx.ellipse(3.4, -15, 1.4, 3.4, -.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(6, -10.4, .9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f7f3ea'; ctx.beginPath(); ctx.arc(-6, -6, 2.4, 0, Math.PI * 2); ctx.fill(); break; }
  }
}

export function drawNPC(ctx, e, time) {
  const jobCols = { lumberjack: '#a8763e', miner: '#8a8a92', farmer: '#6cbf4a', cook: '#e0784c', guard: '#5c7ea8', medic: '#f2f2f2', none: '#c9a06a' };
  const jobHats = { guard: '#3c5a8a', medic: '#f7f7f7', farmer: '#e0c060' };
  drawHumanoid(ctx, e, time, { body: jobCols[e.job] || '#c9a06a', hat: jobHats[e.job] || null, weapon: e.job === 'guard' ? 'sword_iron' : e.job === 'lumberjack' ? 'axe_iron' : e.job === 'miner' ? 'pick_iron' : null });
}

export function drawPlayer(ctx, p, time) {
  drawHumanoid(ctx, p, time, {
    body: '#ff9d3b', hat: p.equip.head ? '#c9d4e0' : null,
    weapon: p.equip.hand || null, cape: '#e05c5c',
  });
}

// ============================================================
// 主渲染器
// ============================================================
export class Renderer {
  constructor(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.lightCv = document.createElement('canvas'); this.lightCtx = this.lightCv.getContext('2d');
    this.zoom = 1; this.cam = { x: 0, z: 0 };
    this.resize();
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
    const c = this.screenCenter();
    ctx.setTransform(this.zoom * this.dpr, 0, 0, this.zoom * this.dpr, c.x - px * this.zoom * this.dpr, c.y - py * this.zoom * this.dpr);
  }
  worldToScreenPx(wx, wz) {
    const { x: px, y: py } = worldToScreen(wx, wz);
    const c = this.screenCenter();
    return { x: c.x + (px - worldToScreen(this.cam.x, this.cam.z).x) * this.zoom * this.dpr, y: c.y + (py - worldToScreen(this.cam.x, this.cam.z).y) * this.zoom * this.dpr };
  }

  render(G) {
    const ctx = this.ctx, t = G.time;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#87c9e8'; ctx.fillRect(0, 0, this.cv.width, this.cv.height);
    this.apply(ctx);
    const z = this.zoom * this.dpr;
    // 可视范围（世界坐标）
    const halfW = this.cv.width / 2 / z, halfH = this.cv.height / 2 / z;
    const cx = this.cam.x, cz = this.cam.z;
    const range = (halfW / (TW / 2) + halfH / (TH / 2)) / 2 + 3;
    const x0 = Math.max(0, Math.floor(cx - range)), x1 = Math.min(G.world.W - 1, Math.ceil(cx + range));
    const z0 = Math.max(0, Math.floor(cz - range)), z1 = Math.min(G.world.H - 1, Math.ceil(cz + range));

    // ---- 地面 ----
    for (let tz = z0; tz <= z1; tz++) for (let tx = x0; tx <= x1; tx++) {
      const bi = G.world.biome[tz * G.world.W + tx];
      const bName = ['water', 'sand', 'grass', 'forest', 'desert', 'snow', 'swamp', 'volcano'][bi];
      const bd = BIOMES[bName];
      const v = G.world.variant[tz * G.world.W + tx];
      let col = bd.g[v];
      const p1 = worldToScreen(tx, tz), p2 = worldToScreen(tx + 1, tz), p3 = worldToScreen(tx + 1, tz + 1), p4 = worldToScreen(tx, tz + 1);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); ctx.fill();
      if (bName === 'water') {
        const shim = Math.sin(t * 1.6 + tx * 1.7 + tz * 2.3) * .5 + .5;
        ctx.fillStyle = `rgba(255,255,255,${shim * .18})`;
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath(); ctx.fill();
      } else if ((bName === 'grass' || bName === 'forest') && v === 2) {
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        ctx.beginPath(); ctx.ellipse((p1.x + p3.x) / 2, (p1.y + p3.y) / 2, 5, 2.4, 0, 0, Math.PI * 2); ctx.fill();
      }
      // 建筑地板类先行标记（floor 直接画地面）
      const b = G.buildingAt(tx, tz);
      if (b && b.id === 'plot_farm') drawBuilding(ctx, b.id, b, t);
    }

    // ---- 深度排序精灵 ----
    const sprites = [];
    for (let tz = z0; tz <= z1; tz++) for (let tx = x0; tx <= x1; tx++) {
      const o = G.world.obj[tz * G.world.W + tx];
      if (o && !o.decoObj) sprites.push({ d: tx + tz, k: 'obj', x: tx + .5, z: tz + .5, o });
      const b = G.buildingAt(tx, tz);
      if (b && b.id !== 'plot_farm') sprites.push({ d: tx + tz + .1, k: 'bld', x: tx + .5, z: tz + .5, b, tx, tz });
    }
    for (const e of G.entities) {
      if (Math.abs(e.x - cx) > range + 2 || Math.abs(e.z - cz) > range + 2) continue;
      sprites.push({ d: e.x + e.z, k: 'ent', e });
    }
    for (const d of G.drops) sprites.push({ d: d.x + d.z, k: 'drop', d });
    for (const pr of G.projectiles) sprites.push({ d: pr.x + pr.z, k: 'proj', pr });
    for (const p of G.pois) {
      if (p.type === 'altar' || p.type === 'chest' || p.type === 'survivor') {
        if (Math.abs(p.x - cx) < range && Math.abs(p.z - cz) < range) sprites.push({ d: p.x + p.z + .2, k: 'poi', p });
      }
    }
    // 玩家建造虚影
    if (G.ghost) sprites.push({ d: G.ghost.x + G.ghost.z + .5, k: 'ghost', g: G.ghost });
    sprites.sort((a, b2) => a.d - b2.d);

    for (const s of sprites) {
      const pos = worldToScreen(s.x, s.z);
      ctx.save(); ctx.translate(pos.x, pos.y);
      if (s.k === 'obj') drawWorldObject(ctx, s.o, s.x, s.z, t, null);
      else if (s.k === 'bld') {
        const nb = { L: G.buildingAt(s.tx - 1, s.tz)?.id === s.b.id, R: G.buildingAt(s.tx + 1, s.tz)?.id === s.b.id };
        drawBuilding(ctx, s.b.id, s.b, t, nb);
        if (s.b.id === 'gate_wood' || s.b.id === 'gate_stone') { /* 门已含 */ }
      }
      else if (s.k === 'ent') {
        const e = s.e;
        if (e.kind === 'player') drawPlayer(ctx, e, t);
        else if (e.kind === 'monster') drawMonster(ctx, e, t);
        else if (e.kind === 'npc') drawNPC(ctx, e, t);
        else if (e.kind === 'merchant') drawHumanoid(ctx, e, t, { body: '#8a5cb8', hat: '#f0c84c', cape: '#c86ae8' });
        else if (e.kind === 'animal') { if (ANIMALS[e.type]) drawAnimal(ctx, e, t); else drawMonster(ctx, e, t); }
      }
      else if (s.k === 'drop') {
        const d = s.d; const bobY = Math.sin(t * 4 + d.seed * 8) * 2;
        ell(ctx, 0, 2, 6, 3, '#222', .15);
        ctx.save(); ctx.translate(0, -8 + bobY); ctx.scale(.7, .7); drawItemIcon(ctx, d.item, 20); ctx.restore();
      }
      else if (s.k === 'proj') drawProjectile(ctx, s.pr, t);
      else if (s.k === 'poi') drawPoi(ctx, s.p, t);
      else if (s.k === 'ghost') {
        ctx.globalAlpha = .55;
        const ok = G.ghost.ok;
        ctx.fillStyle = ok ? 'rgba(108,191,74,.5)' : 'rgba(224,92,92,.5)';
        diamondPath(ctx, 0, 0, TW - 4, TH - 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    // ---- 交互目标指示 ----
    if (G.target) {
      const tp = worldToScreen(G.target.x, G.target.z);
      ctx.strokeStyle = 'rgba(255,220,90,.9)'; ctx.lineWidth = 2.4; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 24;
      diamondPath(ctx, tp.x, tp.y, TW - 6, TH - 3); ctx.stroke(); ctx.setLineDash([]);
      const label = G.target.label;
      if (label) {
        ctx.font = `${12}px "Microsoft YaHei",sans-serif`; ctx.textAlign = 'center';
        const w = ctx.measureText(label).width + 14;
        ctx.fillStyle = 'rgba(255,248,236,.92)'; rr(ctx, tp.x - w / 2, tp.y - 58, w, 20, 8); ctx.fill();
        ctx.strokeStyle = '#e8d9b8'; ctx.lineWidth = 1; rr(ctx, tp.x - w / 2, tp.y - 58, w, 20, 8); ctx.stroke();
        ctx.fillStyle = '#4a3b28'; ctx.fillText(label, tp.x, tp.y - 44);
      }
    }

    // ---- 伤害飘字 ----
    ctx.textAlign = 'center';
    for (const f of G.floaters) {
      const fp = worldToScreen(f.x, f.z);
      const ty = fp.y + (f.y || -36);
      ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.font = `bold ${f.big ? 17 : 12.5}px "Microsoft YaHei",sans-serif`;
      ctx.strokeStyle = 'rgba(60,45,25,.6)'; ctx.lineWidth = 3; ctx.strokeText(f.text, fp.x, ty);
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

    // ---- 光照/夜色 ----
    this.renderLight(G);
    // ---- 天气 ----
    this.renderWeather(G);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  renderLight(G) {
    const lc = this.lightCtx, W = this.lightCv.width, H = this.lightCv.height;
    const dark = G.darkness; // 0..1
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.clearRect(0, 0, W, H);
    if (dark <= 0.02) return;
    lc.fillStyle = `rgba(14,18,48,${dark})`;
    lc.fillRect(0, 0, W, H);
    lc.globalCompositeOperation = 'destination-out';
    const punch = (wx, wz, r, strength = 1) => {
      const p = this.worldToScreenPx(wx, wz);
      const rr2 = r * this.zoom * this.dpr;
      const g = lc.createRadialGradient(p.x, p.y - 14 * this.zoom * this.dpr, 0, p.x, p.y - 14 * this.zoom * this.dpr, rr2);
      g.addColorStop(0, `rgba(0,0,0,${.95 * strength})`); g.addColorStop(.6, `rgba(0,0,0,${.5 * strength})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g; lc.beginPath(); lc.arc(p.x, p.y - 14 * this.zoom * this.dpr, rr2, 0, Math.PI * 2); lc.fill();
    };
    // 玩家自带微光
    punch(G.player.x, G.player.z, 3.2 * 90, .8);
    if (G.player.equip.acc === 'lantern') punch(G.player.x, G.player.z, 5.5 * 90, 1);
    for (const b of G.buildings) {
      const def = BUILDINGS[b.id];
      if (def?.light) punch(b.x + .5, b.z + .5, def.light * 95, 1);
    }
    for (const e of G.entities) {
      if (e.kind === 'monster' && (e.type === 'slime_lava' || e.type === 'flame_lord' || e.type === 'demon_lava' || e.type === 'bat_fire')) punch(e.x, e.z, 140, .8);
    }
    lc.globalCompositeOperation = 'source-over';
    // 暖色调滤镜
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.lightCv, 0, 0);
    if (dark > .1) { ctx.fillStyle = `rgba(255,160,60,${dark * .07})`; ctx.fillRect(0, 0, this.cv.width, this.cv.height); }
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
    if (!this.mmBase || this.mmDirty) {
      this.mmBase = document.createElement('canvas'); this.mmBase.width = W; this.mmBase.height = H;
      const c = this.mmBase.getContext('2d');
      const img = c.createImageData(W, H);
      const cols = { water: [95, 183, 212], sand: [236, 217, 164], grass: [143, 208, 106], forest: [111, 184, 87], desert: [232, 208, 138], snow: [233, 242, 246], swamp: [122, 155, 94], volcano: [107, 90, 86] };
      for (let i = 0; i < W * H; i++) {
        const b = ['water', 'sand', 'grass', 'forest', 'desert', 'snow', 'swamp', 'volcano'][G.world.biome[i]];
        const cl = cols[b]; img.data[i * 4] = cl[0]; img.data[i * 4 + 1] = cl[1]; img.data[i * 4 + 2] = cl[2]; img.data[i * 4 + 3] = 255;
      }
      c.putImageData(img, 0, 0);
      this.mmDirty = false;
    }
    mctx.clearRect(0, 0, size, size);
    mctx.drawImage(this.mmBase, 0, 0, size, size);
    const sc = size / W;
    // POI
    for (const p of G.pois) {
      if (!p.discovered) continue;
      mctx.fillStyle = p.type === 'altar' ? '#c86ae8' : p.type === 'ruin' ? '#e8a13c' : p.type === 'chest' && !p.opened ? '#f0c84c' : null;
      if (mctx.fillStyle) mctx.fillRect(p.x * sc - 1.5, p.z * sc - 1.5, 3, 3);
    }
    // 建筑
    mctx.fillStyle = '#fff';
    for (const b of G.buildings) mctx.fillRect(b.x * sc - 1, b.z * sc - 1, 2, 2);
    // 实体
    for (const e of G.entities) {
      if (e.kind === 'monster') { mctx.fillStyle = '#e04545'; mctx.fillRect(e.x * sc - 1, e.z * sc - 1, 2.4, 2.4); }
      else if (e.kind === 'npc') { mctx.fillStyle = '#4ce05c'; mctx.fillRect(e.x * sc - 1, e.z * sc - 1, 2.4, 2.4); }
    }
    // 玩家
    mctx.fillStyle = '#fff'; mctx.strokeStyle = '#e05c5c'; mctx.lineWidth = 1;
    mctx.beginPath(); mctx.arc(G.player.x * sc, G.player.z * sc, 3, 0, Math.PI * 2); mctx.fill(); mctx.stroke();
  }
}

function drawProjectile(ctx, pr, t) {
  ctx.save(); ctx.translate(0, 0);
  const kind = pr.kind;
  if (kind === 'arrow') {
    ctx.rotate(Math.atan2(pr.vy, pr.vx * .5) - 0);
    ctx.strokeStyle = '#8a6a3c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(6, 0); ctx.stroke();
    ctx.fillStyle = '#d8e2ea'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(2, -2.4); ctx.lineTo(2, 2.4); ctx.closePath(); ctx.fill();
  } else if (kind === 'fire') {
    ctx.fillStyle = `rgba(255,${120 + Math.sin(t * 12) * 50 | 0},40,.95)`;
    ctx.beginPath(); ctx.arc(0, 0, 6 + Math.sin(t * 14) * 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,120,.9)'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'ice') {
    ctx.fillStyle = '#8cd8f0'; ctx.save(); ctx.rotate(t * 8); ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6); } ctx.closePath(); ctx.fill(); ctx.restore();
  } else if (kind === 'bomb') {
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(0, 0, 5.4, 0, Math.PI * 2); ctx.fill();
    drawFlame(ctx, 3, -5, t, .4);
  } else if (kind === 'bolt') {
    ctx.rotate(Math.atan2(pr.vy, pr.vx * .5));
    ctx.strokeStyle = '#545c66'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(7, 0); ctx.stroke();
  }
  ctx.restore();
}

function drawPoi(ctx, p, t) {
  if (p.type === 'altar') {
    ctx.fillStyle = '#8a929c'; diamondPath(ctx, 0, 0, 56, 28); ctx.fill();
    ctx.fillStyle = '#6a747e'; diamondPath(ctx, 0, 0, 40, 20); ctx.fill();
    ctx.fillStyle = '#9aa3ad'; ctx.fillRect(-6, -22, 12, 20);
    const boss = { goblin_king: '#7cb85c', ice_queen: '#8cd8f0', flame_lord: '#ff7d3b' }[p.id];
    ctx.globalAlpha = .5 + Math.sin(t * 2) * .4; ctx.fillStyle = boss; ctx.beginPath(); ctx.arc(0, -28, 8 + Math.sin(t * 3) * 2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  } else if (p.type === 'chest' && !p.opened) {
    ell(ctx, 0, 2, 12, 6, '#222', .18);
    ctx.fillStyle = p.sealed ? '#8a7a9c' : '#a8763e'; rr(ctx, -12, -16, 24, 16, 3); ctx.fill();
    ctx.fillStyle = p.sealed ? '#a89abc' : '#c9a06a'; ctx.beginPath(); ctx.ellipse(0, -16, 12, 5, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#f0c84c'; ctx.fillRect(-2.4, -14, 4.8, 8);
    if (p.sealed) { ctx.globalAlpha = .4 + Math.sin(t * 3) * .3; ctx.strokeStyle = '#c8b8e8'; ctx.lineWidth = 2; diamondPath(ctx, 0, -10, 34, 17); ctx.stroke(); ctx.globalAlpha = 1; }
  } else if (p.type === 'survivor' && !p.rescued) {
    ell(ctx, 0, 2, 10, 5, '#222', .2);
    // 帐篷
    ctx.fillStyle = '#e0a860'; ctx.beginPath(); ctx.moveTo(-18, 2); ctx.lineTo(-4, -20); ctx.lineTo(10, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9902c'; ctx.beginPath(); ctx.moveTo(-4, -20); ctx.lineTo(10, 2); ctx.lineTo(-1, 2); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = .5 + Math.sin(t * 2.5) * .5; ctx.fillStyle = '#ffd84c'; ctx.beginPath(); ctx.arc(14, -14, 3.4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  }
}
