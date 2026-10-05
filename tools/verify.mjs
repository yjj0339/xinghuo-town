// ============================================================
// 无头验证：数据完整性 / 世界生成 / 核心玩法模拟 / 存档回路
// 运行：node tools/verify.mjs
// ============================================================
globalThis.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null }, setItem(k, v) { this._m[k] = v }, removeItem(k) { delete this._m[k] } };

import { ITEMS, RECIPES, BUILDINGS, MONSTERS, ANIMALS, CROPS, WORLD_OBJECTS, MAIN_QUESTS, SIDE_QUESTS, DAILY_POOL, ACHIEVEMENTS, SKILLS, MERCHANT, FISH_TABLE, BIOMES, RANDOM_EVENTS, CONFIG } from '../js/data.js';
import { genWorld, makeQueries, BIOME_IDS } from '../js/world.js';
import { Game } from '../js/systems.js';
import { xpNeed, addItem, countItem } from '../js/entities.js';

let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) { pass++; } else { fail++; console.error('  ❌ ' + name); } };
const section = s => console.log('\n== ' + s + ' ==');

// ---------------- 1. 数据完整性 ----------------
section('数据完整性');
for (const r of RECIPES) {
  for (const [id] of r.in) ok(!!ITEMS[id], `配方 ${r.id} 材料 ${id} 存在`);
  ok(!!ITEMS[r.out[0]], `配方 ${r.id} 产物 ${r.out[0]} 存在`);
}
for (const [bid, b] of Object.entries(BUILDINGS)) {
  for (const [id] of b.cost) ok(!!ITEMS[id], `建筑 ${bid} 材料 ${id} 存在`);
}
for (const [mid, m] of Object.entries(MONSTERS)) {
  for (const d of m.drops) ok(d[0] === 'coin' || !!ITEMS[d[0]], `怪物 ${mid} 掉落 ${d[0]} 存在`);
}
for (const [aid, a] of Object.entries(ANIMALS)) {
  if (a.product) ok(!!ITEMS[a.product[0]], `动物 ${aid} 产物 ${a.product[0]} 存在`);
  for (const d of a.drops) ok(!!ITEMS[d[0]], `动物 ${aid} 掉落 ${d[0]} 存在`);
}
for (const [cid, c] of Object.entries(CROPS)) {
  for (const o of c.out) ok(!!ITEMS[o[0]], `作物 ${cid} 产物 ${o[0]} 存在`);
  for (const b of c.bonus) ok(!!ITEMS[b[0]], `作物 ${cid} 奖励 ${b[0]} 存在`);
}
for (const o of Object.values(WORLD_OBJECTS)) for (const d of o.drops) ok(!!ITEMS[d[0]], `世界物体 ${o.n} 掉落 ${d[0]} 存在`);
for (const q of [...MAIN_QUESTS, ...SIDE_QUESTS, ...DAILY_POOL]) {
  if (q.reward?.items) for (const [id] of q.reward.items) ok(!!ITEMS[id], `任务 ${q.id || q.n} 奖励 ${id} 存在`);
}
for (const [id] of MERCHANT.sell) ok(!!ITEMS[id], `商人出售 ${id} 存在`);
for (const f of FISH_TABLE) ok(!!ITEMS[f.id], `鱼类 ${f.id} 存在`);
for (const a of ACHIEVEMENTS) ok(!!a.n && !!a.cond, `成就 ${a.id} 完整`);
for (const [sid, s] of Object.entries(SKILLS)) ok(!!s.n && s.max >= 1, `技能 ${sid} 完整`);
ok(RECIPES.length >= 70, `配方数量充足（${RECIPES.length}）`);
ok(Object.keys(ITEMS).length >= 90, `物品数量充足（${Object.keys(ITEMS).length}）`);
ok(Object.keys(MONSTERS).length >= 28, `怪物数量充足（${Object.keys(MONSTERS).length}）`);
ok(Object.keys(BUILDINGS).length >= 30, `建筑数量充足（${Object.keys(BUILDINGS).length}）`);
// 每个配方站点都有对应建筑
for (const st of new Set(RECIPES.map(r => r.st))) {
  if (st !== 'hand') ok(Object.values(BUILDINGS).some(b => b.station === st), `工作台 ${st} 有对应建筑`);
}
// 手搓配方可启动游戏闭环：木斧可用初始资源附近的木头+纤维
ok(RECIPES.some(r => r.st === 'hand' && r.out[0] === 'axe_wood'), '手搓木斧配方存在');

// ---------------- 2. 世界生成 ----------------
section('世界生成（3个种子）');
for (const seed of [12345, 777, 20261005]) {
  const w = genWorld(seed);
  const q = makeQueries(w);
  const counts = {};
  for (let i = 0; i < w.biome.length; i++) { const b = BIOME_IDS[w.biome[i]]; counts[b] = (counts[b] || 0) + 1; }
  for (const b of ['grass', 'forest', 'desert', 'snow', 'swamp', 'volcano', 'water']) ok((counts[b] || 0) > 150, `种子${seed} 生态区 ${b} 足量（${counts[b] || 0}）`);
  ok(q.biomeAt(w.center.x, w.center.z) === 'grass', `种子${seed} 城镇中心是草地`);
  ok(!q.hasBlockObj(w.center.x, w.center.z), `种子${seed} 中心无障碍`);
  const altars = w.pois.filter(p => p.type === 'altar');
  const ruins = w.pois.filter(p => p.type === 'ruin');
  const survivors = w.pois.filter(p => p.type === 'survivor');
  const chests = w.pois.filter(p => p.type === 'chest');
  ok(altars.length === 3, `种子${seed} 三大祭坛（${altars.length}）`);
  ok(ruins.length === 4, `种子${seed} 四处废墟（${ruins.length}）`);
  ok(survivors.length === 8, `种子${seed} 八位幸存者（${survivors.length}）`);
  ok(chests.length === 8, `种子${seed} 八个宝箱（${chests.length}）`);
  let ores = 0; for (const o of w.obj) if (o && String(o.id).startsWith('ore_')) ores++;
  ok(ores > 80, `种子${seed} 矿脉数量（${ores}）`);
  let trees = 0; for (const o of w.obj) if (o && String(o.id).startsWith('tree')) trees++;
  ok(trees > 300, `种子${seed} 树木数量（${trees}）`);
}

// ---------------- 3. 核心玩法无头模拟 ----------------
section('无头模拟（采集→合成→建造→战斗→任务→存档）');
const G = new Game(42);
// 初始资源
ok(G.player.hp === 100, '玩家初始满血');
// 给足材料走完整条生产链
G.give('wood', 50); G.give('fiber', 30); G.give('stone', 60); G.give('coal', 20);
G.give('ore_iron', 10); G.give('leather', 10); G.give('berry', 10); G.give('herb', 10);
// 合成工具链
const rAxe = RECIPES.find(r => r.out[0] === 'axe_wood');
ok(G.craft(rAxe), '合成木斧');
ok(G.craft(RECIPES.find(r => r.out[0] === 'pick_wood')), '合成木镐');
// 建造链（中心旁空地）
const c = G.world.center;
ok(G.placeBuilding('campfire', c.x + 2, c.z), '放置篝火');
ok(G.placeBuilding('bench_work', c.x, c.z + 2), '放置工作台');
ok(G.buildCounts.campfire === 1, '建筑计数正确');
ok(G.buildingAt(c.x + 2, c.z)?.id === 'campfire', '建筑查询正确');
// 熔炉+冶炼
G.give('plank', 40); G.give('stone', 80);
ok(G.placeBuilding('furnace', c.x - 2, c.z), '放置熔炉');
ok(G.craft(RECIPES.find(r => r.out[0] === 'bar_iron')), '冶炼铁锭');
ok(G.craft(RECIPES.find(r => r.out[0] === 'sword_stone')), '合成石剑');
// 农田种植
G.give('seed_wheat', 5);
ok(G.placeBuilding('plot_farm', c.x, c.z - 2), '放置农田');
const farm = G.buildingAt(c.x, c.z - 2);
ok(G.plantSeed(farm, 'seed_wheat'), '播种小麦');
farm.crop.growth = 1;
const hadWheat = countItem(G.player.inv, 'wheat');
ok(G.harvestCrop(farm, false), '收获小麦');
ok(countItem(G.player.inv, 'wheat') > hadWheat, '小麦进入背包');
// 战斗：生成史莱姆并击杀
const { makeMonster } = await import('../js/entities.js');
const slime = makeMonster('slime', G.player.x + 1, G.player.z);
G.entities.push(slime);
G.hitEntity(G.player, slime, 999, 'player');
ok(slime.dead !== true || G.stats.kills >= 1, '击杀计入统计');
ok(G.stats.kills >= 1, `击杀数 ${G.stats.kills}`);
// Boss 召唤与击杀
ok(G.summonBoss('goblin_king') === true, '召唤哥布林王');
const king = G.entities.find(e => e.boss);
ok(!!king, 'Boss在场');
G.killMonster(king, 'player');
ok(G.stats['boss_goblin_king'] === 1, 'Boss击杀计入统计');
// 任务主线全链路（直接补满条件后逐个领取）
G.stats.gather_wood = 99; G.stats.gather_stone = 99; G.stats.gather_berry = 99; G.stats.eat = 99;
G.stats.craft_axe_wood = 99; G.stats.craft_pick_wood = 99; G.stats.craft_bar_iron = 99;
G.stats.plant = 99; G.stats.night_kills = 99; G.stats.recruit = 99; G.stats.boss_ice_queen = 1; G.stats.boss_flame_lord = 1;
G.stats.boss_treant_ancient = 1; G.stats.sell_total = 999; G.stats.ruins = 9; G.stats.kills = 99; G.stats.fish = 99;
G.stats.cook = 99; G.stats.mine_total = 99; G.stats.house_animal = 99; G.stats.harvest = 99;
G.buildCounts.wall_wood = 99; G.buildCounts.gate_wood = 99; G.buildCounts.plot_farm = 99;
G.buildCounts.bench_work = 99; G.buildCounts.furnace = 99; G.buildCounts.sawmill = 99;
G.buildCounts.notice_board = 99; G.buildCounts.market = 99; G.buildCounts.altar_ancient = 99;
G.town.lv = 5;
for (let i = 0; i < 4; i++) G.addSettler('居民' + i, 'none'); // m12 需要4居民
let claimed = 0;
for (let i = 0; i < 20; i++) { if (G.claimMain()) claimed++; else break; }
ok(claimed === MAIN_QUESTS.length, `主线可全部领取（${claimed}/${MAIN_QUESTS.length}）`);
ok(G.mainIdx === MAIN_QUESTS.length, '主线索引推进到底');
// 技能
G.player.skillPts = 20;
const hpBefore = G.player.maxHp;
ok(G.learnSkill('vitality') && G.player.maxHp === hpBefore + 15, '技能：体质+HP');
ok(!G.learnSkill('xxx'), '技能：无效ID拒绝');
// 钓鱼
G.player.inv.unshift({ id: 'rod_wood', n: 1 });
G.player.dir = 0;
// 玩家旁边造水：直接模拟钓鱼状态
G.player.fishing = { state: 'bite', t: .5 };
G.fishingPull();
ok(G.stats.fish >= 1, '钓鱼收杆成功计入');
// 商人
G.merchantArrive();
ok(G.entities.some(e => e.kind === 'merchant'), '商人到场');
G.sellItem('wood', 5);
ok(G.stats.sell_total > 0, '出售计入');
G.merchantLeave();
ok(!G.entities.some(e => e.kind === 'merchant'), '商人离场');
// 夜袭
G.town.raidTonight = true;
G.dayTime = .61; G.phase = 'night'; G.town.raidActive = false;
G.startRaid();
ok(G.entities.filter(e => e.raid).length > 0, '夜袭波次生成');
G.endRaid();
ok(!G.entities.some(e => e.raid), '夜袭结束清场');
// 招募+职业
const npc = G.addSettler('测试员', 'lumberjack');
ok(G.settlerCount() >= 1, '居民加入');
npc.job = 'guard';
// 时间推进（模拟 300 秒游戏时间，含跨天）
const dayBefore = G.day;
for (let i = 0; i < 3000; i++) G.update(.1);
ok(G.day > dayBefore, `时间推进跨天（${dayBefore}→${G.day}）`);
ok(G.entities.length > 0, `实体存活（${G.entities.length}）`);
// 存档回路
ok(G.save(true) === true, '存档写入');
const data = JSON.parse(localStorage.getItem(CONFIG.SAVE_KEY));
const G2 = new Game(data.seed);
G2.applySave(data);
ok(G2.buildings.length === G.buildings.length, `存档建筑数一致（${G2.buildings.length}）`);
ok(G2.player.coins === G.player.coins, '存档金币一致');
ok(G2.mainIdx === G.mainIdx, '存档主线进度一致');
G2.give('wood', 10); G2.craft(RECIPES.find(r => r.out[0] === 'rope'));
for (let i = 0; i < 500; i++) G2.update(.1);

// ---------------- 3.5 v3 新系统 ----------------
section('v3：宠物/离线收益/徽章/新内容');
// 徒手采集（新手不死锁）
{
  const Gh = new Game(4242);
  // 找玩家附近最近的一棵树
  let tree = null;
  const px = Math.floor(Gh.player.x), pz = Math.floor(Gh.player.z);
  for (let r = 1; r < 40 && !tree; r++) {
    for (let dz = -r; dz <= r && !tree; dz++) for (let dx = -r; dx <= r && !tree; dx++) {
      const x = px + dx, z = pz + dz;
      if (!Gh.q.inBounds(x, z)) continue;
      const o = Gh.world.obj[z * Gh.world.W + x];
      if (o && ['tree', 'tree_pine', 'tree_big'].includes(o.id)) tree = { x, z, o };
    }
  }
  ok(!!tree, '找到一棵测试用树');
  if (tree) {
    // 玩家站到树旁，清空背包工具
    Gh.player.inv = new Array(40).fill(null);
    Gh.player.x = tree.x + 1.5; Gh.player.z = tree.z + .5;
    Gh.target = Gh.interactTarget();
    ok(Gh.target && Gh.target.kind === 'obj' && Gh.target.tx === tree.x && Gh.target.tz === tree.z, `目标锁定为树（${Gh.target && Gh.target.kind === 'obj' ? Gh.target.obj.id : JSON.stringify(Gh.target)}）`);
    const hp0 = tree.o.hp;
    const chopped = Gh.interact();
    ok(chopped === true && tree.o.hp < hp0, `徒手砍树有效（${hp0}→${tree.o.hp}）`);
    ok(Gh.labelForTarget(Gh.target).includes('连按'), '目标标签提示连按');
  }
}
ok(G.adoptPet('chick') === true, '收养小鸡跟宠');
ok(G.petBuff('gather') > 0, '跟宠采集加成生效');
ok(G.petBuff('power') === 0, '跟宠加成类型正确');
G.releasePet();
ok(G.adoptPet('dragon', true) === true, '龙蛋孵化幼龙跟宠');
ok(G.petBuff('power') > 0, '幼龙攻击加成生效');
// 徽章：击Boss 掉徽章
G.stats.boss_goblin_king = 0;
const king2 = G.entities.find(e => e.boss && e.type === 'goblin_king') || (() => { const k = makeMonster('goblin_king', 5, 5, {}); G.entities.push(k); return k; })();
const badgeBefore = G.count('essence_badge') + 0;
G.killMonster(king2, 'player');
ok(G.count('essence_badge') > badgeBefore, `Boss徽章掉落（+${G.count('essence_badge') - badgeBefore}）`);
ok(G.summonBoss('goblin_king') === true, 'Boss可重复召唤');
const king3 = G.entities.find(e => e.boss && !e.dead);
ok(king3 && king3.maxHp > MONSTERS.goblin_king.hp, `重复召唤变强（${Math.round(king3.maxHp)}>${MONSTERS.goblin_king.hp}）`);
G.killMonster(king3, 'player');
// 离线收益
localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify({ ...JSON.parse(localStorage.getItem(CONFIG.SAVE_KEY)), wallTime: Date.now() - 3 * 3600 * 1000, npcs: G.entities.filter(e => e.kind === 'npc').map(n => ({ name: n.name, job: n.job, x: n.x, z: n.z, happiness: 70 })) }));
G.day = 1;
const off = G.claimOffline();
ok(off && off.mins >= 170, `离线收益结算（${off ? off.mins + '分钟' : 'null'}）`);
ok(off && off.got.length > 0, `离线产物入仓（${off ? off.got.join(',') : '-'}）`);
// 新配方/作物
ok(!!ITEMS.fish_cooked && !!ITEMS.fruit_salad && !!ITEMS.feast, '新料理物品存在');
ok(RECIPES.some(r => r.out[0] === 'feast') && RECIPES.some(r => r.out[0] === 'fruit_salad'), '新料理配方存在');
ok(CROPS.strawberry && CROPS.corn, '新作物存在');
ok(ITEMS.seed_strawberry && ITEMS.seed_corn, '新作物种子存在');
// 宠物存档回路
G.save(true);
const d3 = JSON.parse(localStorage.getItem(CONFIG.SAVE_KEY));
ok(d3.pet === 'dragon', '宠物写入存档');
const G3 = new Game(d3.seed); G3.applySave(d3);
ok(G3.pet && G3.pet.type === 'dragon', '宠物读档恢复');
// 主线指引箭头
G.mainIdx = 7; G._arrowByTut = false; G.checkQuests();
ok(!!G.guideArrow, `主线箭头（m8指向幸存者：${G.guideArrow ? G.guideArrow.label : 'null'}）`);

// ---------------- 4. 汇总 ----------------
console.log(`\n========================\n✅ 通过 ${pass} 项 · ❌ 失败 ${fail} 项\n========================`);
process.exit(fail ? 1 : 0);
