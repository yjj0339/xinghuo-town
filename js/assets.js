// ============================================================
// 资产系统：sprite 加载 + 绘制助手（阴影/翻转/受击/摆动）
// ============================================================

const cache = new Map();   // id -> Image
const pending = new Set();

export function loadAssets(list, onProgress) {
  let done = 0;
  return Promise.all(list.map(id => new Promise(res => {
    if (cache.has(id)) { done++; res(); return; }
    const img = new Image();
    img.onload = () => { cache.set(id, img); done++; onProgress && onProgress(done, list.length); res(); };
    img.onerror = () => { done++; onProgress && onProgress(done, list.length); res(); };
    img.src = 'assets/spr/' + id + '.png';
  })));
}

export function spr(id) { return cache.get(id) || null; }
export function hasSpr(id) { return cache.has(id); }

/**
 * 通用精灵绘制：底部中心锚点，附带阴影/受击白闪/上下浮动/水平翻转
 * @param h 目标显示高度(px)
 */
export function drawSpr(ctx, id, h, opt = {}) {
  const img = spr(id);
  if (!img || !img.width) return false;
  const w = img.width * (h / img.height);
  const {
    flip = false, shadow = 1, bob = 0, flash = 0, rotate = 0,
    alpha = 1, shadowScale = 1,
  } = opt;
  if (shadow > 0) {
    ctx.fillStyle = 'rgba(30,40,20,.22)';
    ctx.globalAlpha = .22 * shadow * alpha;
    ctx.beginPath();
    ctx.ellipse(0, 2, w * .38 * shadowScale, w * .19 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
  }
  ctx.save();
  if (rotate) ctx.rotate(rotate);
  ctx.translate(0, bob);
  if (flip) ctx.scale(-1, 1);
  ctx.globalAlpha = alpha;
  if (flash > 0) ctx.filter = `brightness(${1 + Math.min(1.6, flash * 2)}) saturate(${Math.max(0, 1 - flash)})`;
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.filter = 'none';
  ctx.restore();
  return true;
}
