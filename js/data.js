// ============================================================
// 星火小镇：荒谷拓荒记 — 内容数据库（纯数据，无 DOM，node 可测）
// ============================================================

export const CONFIG = {
  MAP_W: 144, MAP_H: 144,
  TILE_W: 64, TILE_H: 32,
  DAY_LEN: 480,          // 一天 = 480 秒
  SEASON_DAYS: 7,        // 一季 7 天
  TOWN_RADIUS: 18,       // 小镇工作/防御半径（格）
  AUTOSAVE_MS: 30000,
  VERSION: 1,
  SAVE_KEY: 'xinghuo_town_save_v1',
};

// 时间相位（占一天比例）
export const PHASES = { dawn: [0, .07], day: [.07, .5], dusk: [.5, .58], night: [.58, 1] };

// ---------------- 生态区 ----------------
// g: 地面色组(3变体), deco: [[物体id,权重,清场半径],...], temp: 温度修正, mon: 怪物池
export const BIOMES = {
  grass:   { n: '翡翠草原', g: ['#8fd06a', '#84c962', '#99d873'], temp: 0,   mon: ['slime', 'wolf', 'boar', 'zombie', 'skeleton'] },
  forest:  { n: '迷雾森林', g: ['#6fb857', '#64ad4d', '#79c25f'], temp: -2,  mon: ['goblin', 'goblin_archer', 'wolf', 'treant_sap', 'spider', 'zombie', 'skeleton'] },
  desert:  { n: '金沙荒漠', g: ['#e8d08a', '#e2c87e', '#eeda96'], temp: 12,  mon: ['scorpion', 'mummy', 'sandworm'] },
  snow:    { n: '霜语雪原', g: ['#e9f2f6', '#dfeaf1', '#f2f9fc'], temp: -16, mon: ['slime_ice', 'wolf_snow', 'yeti', 'banshee'] },
  swamp:   { n: '幽泽湿地', g: ['#7a9b5e', '#709154', '#84a668'], temp: 2,   mon: ['mush_toxic', 'spider', 'croc', 'bog_lurker'] },
  volcano: { n: '烬岩火山', g: ['#6b5a56', '#615250', '#75645f'], temp: 22,  mon: ['bat_fire', 'slime_lava', 'demon_imp', 'demon_lava', 'dragon_whelp'] },
  water:   { n: '碧波',     g: ['#5fb7d4', '#57aecd', '#69c1dc'], temp: 0,   mon: [] },
  sand:    { n: '河岸',     g: ['#ecd9a4', '#e6d298', '#f2e0ae'], temp: 6,   mon: [] },
};

// ---------------- 物品 ----------------
// cat: res/material/food/tool/weapon/armor/seed/special/fish
// p=出售价 food:{h饥饿,t口渴,e精力,hp} tool:{kind,tier} wpn:{dmg,cd,range,proj,effect} arm:{slot,def,warm,spd}
export const ITEMS = {
  // —— 基础资源
  wood:      { n: '木头',    c: 'res', p: 1,  d: '砍树获得，万物之始' },
  stone:     { n: '石头',    c: 'res', p: 1,  d: '敲碎岩石获得' },
  fiber:     { n: '纤维',    c: 'res', p: 1,  d: '草丛中采集的植物纤维' },
  resin:     { n: '树脂',    c: 'res', p: 3,  d: '树木分泌的黏稠精华' },
  plank:     { n: '木板',    c: 'res', p: 3,  d: '锯木台加工的板材' },
  sand:      { n: '沙子',    c: 'res', p: 1,  d: '水边的细沙' },
  clay:      { n: '黏土',    c: 'res', p: 2,  d: '沼泽里的湿黏土' },
  leather:   { n: '皮革',    c: 'res', p: 5,  d: '处理过的兽皮' },
  bone:      { n: '骨头',    c: 'res', p: 2,  d: '打磨后能做很多东西' },
  feather:   { n: '羽毛',    c: 'res', p: 2,  d: '轻盈柔软' },
  wool:      { n: '羊毛',    c: 'res', p: 4,  d: '暖和的羊毛' },
  silk:      { n: '蛛丝',    c: 'res', p: 6,  d: '坚韧的蛛网丝线' },
  pelt:      { n: '厚毛皮',  c: 'res', p: 8,  d: '雪原野兽的皮毛，非常保暖' },
  fang:      { n: '兽牙',    c: 'res', p: 4,  d: '锋利的猛兽之牙' },
  chitin:    { n: '甲壳',    c: 'res', p: 5,  d: '坚硬的虫类外壳' },
  herb:      { n: '草药',    c: 'res', p: 3,  d: '可直接食用或入药' },
  ginseng:   { n: '灵芝',    c: 'res', p: 30, d: '幽泽湿地深处的珍宝' },
  honey:     { n: '蜂蜜',    c: 'res', p: 8,  d: '甜蜜的天然美味' },
  apple:     { n: '苹果',    c: 'food', p: 4, food: { h: 8, t: 4, e: 4 }, d: '森林里摘的红苹果' },
  berry:     { n: '浆果',    c: 'food', p: 2, food: { h: 5, t: 3 }, d: '酸酸甜甜的野果' },
  mushroom:  { n: '蘑菇',    c: 'food', p: 2, food: { h: 4, e: 2 }, d: '湿地里采的蘑菇' },
  chili:     { n: '火焰椒',  c: 'food', p: 6, food: { h: 6, hp: -2 }, d: '辣得冒火，却也暖身' },
  wheat:     { n: '小麦',    c: 'res', p: 3,  d: '金灿灿的粮食作物' },
  flour:     { n: '面粉',    c: 'res', p: 5,  d: '磨好的细面粉' },
  carrot:    { n: '胡萝卜',  c: 'food', p: 3, food: { h: 6, e: 3 }, d: '脆甜的胡萝卜' },
  pumpkin:   { n: '南瓜',    c: 'food', p: 6, food: { h: 10 }, d: '沉甸甸的大南瓜' },
  egg:       { n: '鸡蛋',    c: 'food', p: 3, food: { h: 4, e: 4 }, d: '鸡舍里新鲜产出' },
  milk:      { n: '牛奶',    c: 'food', p: 4, food: { h: 5, t: 5 }, d: '香浓的牛奶' },
  meat_raw:  { n: '生肉',    c: 'food', p: 3, food: { h: 6, hp: -4 }, d: '直接吃会拉肚子' },
  // —— 矿物
  ore_copper:{ n: '铜矿石',  c: 'res', p: 5,  d: '橙红色的金属矿' },
  ore_iron:  { n: '铁矿石',  c: 'res', p: 8,  d: '坚固的铁矿' },
  ore_gold:  { n: '金矿石',  c: 'res', p: 16, d: '闪着金光的贵重矿' },
  crystal:   { n: '水晶',    c: 'res', p: 20, d: '蕴含魔力的晶莹矿石' },
  coal:      { n: '煤炭',    c: 'res', p: 3,  d: '熔炉的燃料' },
  obsidian:  { n: '黑曜石',  c: 'res', p: 12, d: '火山玻璃，锋利异常' },
  sulfur:    { n: '硫磺',    c: 'res', p: 6,  d: '刺鼻的黄色粉末' },
  bar_copper:{ n: '铜锭',    c: 'res', p: 12, d: '冶炼出的铜金属锭' },
  bar_iron:  { n: '铁锭',    c: 'res', p: 18, d: '冶炼出的铁金属锭' },
  bar_gold:  { n: '金锭',    c: 'res', p: 36, d: '财富的化身' },
  glass:     { n: '玻璃',    c: 'res', p: 8,  d: '透明易碎，路灯必备' },
  brick:     { n: '砖块',    c: 'res', p: 6,  d: '烧制的红砖' },
  nail:      { n: '铁钉',    c: 'res', p: 2,  d: '小小的铁钉，建筑刚需' },
  rope:      { n: '绳索',    c: 'res', p: 3,  d: '搓出来的草绳' },
  cloth:     { n: '布料',    c: 'res', p: 6,  d: '织机纺织的布' },
  gear:      { n: '机械零件',c: 'res', p: 14, d: '精密的小零件' },
  essence_fire:  { n: '火焰精华', c: 'res', p: 18, d: '跳动着火苗的结晶' },
  essence_ice:   { n: '冰霜精华', c: 'res', p: 18, d: '寒气逼人的结晶' },
  essence_dark:  { n: '暗影精华', c: 'res', p: 22, d: '幽暗扭曲的结晶' },
  badge_goblin:  { n: '哥布林徽章', c: 'res', p: 4, d: '哥布林的部族徽记' },
  // —— 烹饪
  meat_cooked: { n: '烤肉',    c: 'food', p: 8,  food: { h: 18, e: 8, hp: 4 }, d: '滋滋冒油的烤肉' },
  jerky:       { n: '肉干',    c: 'food', p: 10, food: { h: 14, e: 10 }, d: '耐储存的旅行食品' },
  bread:       { n: '面包',    c: 'food', p: 8,  food: { h: 16, e: 6 }, d: '松软的烤面包' },
  salad:       { n: '蔬菜沙拉',c: 'food', p: 9,  food: { h: 10, t: 6, e: 6 }, d: '清爽健康' },
  pumpkin_soup:{ n: '南瓜浓汤',c: 'food', p: 16, food: { h: 20, t: 8, e: 8, hp: 6 }, d: '暖心暖胃' },
  stew:        { n: '炖菜',    c: 'food', p: 18, food: { h: 24, t: 6, e: 10, hp: 8 }, d: '肉蔬同炖的硬菜' },
  honey_cookie:{ n: '蜂蜜饼干',c: 'food', p: 7,  food: { h: 8, e: 10 }, d: '甜蜜的小点心' },
  fish_soup:   { n: '鲜鱼汤',  c: 'food', p: 15, food: { h: 16, t: 10, e: 6, hp: 5 }, d: '奶白色的鲜汤' },
  fried_egg:   { n: '煎蛋',    c: 'food', p: 6,  food: { h: 8, e: 8 }, d: '滋啦一声的焦香' },
  cheese:      { n: '奶酪',    c: 'food', p: 10, food: { h: 12, e: 8 }, d: '浓缩的奶香' },
  juice:       { n: '果汁',    c: 'food', p: 6,  food: { h: 4, t: 14, e: 4 }, d: '解渴神器' },
  tea_herb:    { n: '草药茶',  c: 'food', p: 6,  food: { t: 10, e: 6, hp: 4 }, d: '微苦回甘' },
  cake:        { n: '星火蛋糕',c: 'food', p: 40, food: { h: 30, t: 10, e: 20, hp: 20 }, d: '庆典的象征' },
  // —— 药水
  potion_small:{ n: '小型治疗药水', c: 'food', p: 12, food: { hp: 40 },  d: '恢复40点生命' },
  potion_big:  { n: '大型治疗药水', c: 'food', p: 30, food: { hp: 100 }, d: '恢复100点生命' },
  potion_speed:{ n: '迅捷药水', c: 'food', p: 18, food: { e: 20 }, fx: 'speed', d: '饮用后移动加速10秒' },
  potion_str:  { n: '力量药水', c: 'food', p: 20, food: { e: 10 }, fx: 'str',   d: '饮用后攻击提升10秒' },
  potion_warm: { n: '暖身药水', c: 'food', p: 14, food: { t: 6 }, fx: 'warm',  d: '饮用后12小时不怕冷' },
  antidote:    { n: '解毒药水', c: 'food', p: 10, food: { hp: 8 }, fx: 'cure', d: '解除中毒状态' },
  // —— 工具
  axe_wood:   { n: '木斧',   c: 'tool', p: 4,  tool: { kind: 'axe',  tier: 1 }, d: '能砍倒小树' },
  axe_stone:  { n: '石斧',   c: 'tool', p: 10, tool: { kind: 'axe',  tier: 2 }, d: '锋利了不少' },
  axe_iron:   { n: '铁斧',   c: 'tool', p: 26, tool: { kind: 'axe',  tier: 3 }, d: '伐木如切菜' },
  pick_wood:  { n: '木镐',   c: 'tool', p: 4,  tool: { kind: 'pick', tier: 1 }, d: '能敲碎软石' },
  pick_stone: { n: '石镐',   c: 'tool', p: 10, tool: { kind: 'pick', tier: 2 }, d: '可以开采铁矿' },
  pick_iron:  { n: '铁镐',   c: 'tool', p: 26, tool: { kind: 'pick', tier: 3 }, d: '金矿水晶都不在话下' },
  rod_wood:   { n: '木钓竿', c: 'tool', p: 8,  tool: { kind: 'rod',  tier: 1 }, d: '水边按下互动开始钓鱼' },
  rod_iron:   { n: '铁钓竿', c: 'tool', p: 24, tool: { kind: 'rod',  tier: 2 }, d: '鱼儿上钩更快' },
  shovel:     { n: '铁铲',   c: 'tool', p: 20, tool: { kind: 'shovel', tier: 2 }, d: '能铲取沙子和黏土' },
  waterskin:  { n: '水壶',   c: 'tool', p: 12, tool: { kind: 'skin' }, d: '在水井或河边装满，可喝3次' },
  feed:       { n: '饲料',   c: 'tool', p: 3,  tool: { kind: 'feed' }, d: '对鸡/牛/羊使用可引诱其跟随，靠近对应棚舍即可收养' },
  bait:       { n: '鱼饵',   c: 'tool', p: 2,  tool: { kind: 'bait' }, d: '钓鱼时上钩更快' },
  lantern:    { n: '提灯',   c: 'tool', p: 40, tool: { kind: 'light' }, d: '装备在饰品栏，夜晚随身照明' },
  // —— 武器
  stick:        { n: '木棍',     c: 'weapon', p: 1,  wpn: { dmg: 6,  cd: .45, range: 1.1 }, d: '聊胜于无' },
  spear:        { n: '木矛',     c: 'weapon', p: 6,  wpn: { dmg: 9,  cd: .6,  range: 1.5 }, d: '一寸长一寸强' },
  sword_stone:  { n: '石剑',     c: 'weapon', p: 12, wpn: { dmg: 12, cd: .45, range: 1.2 }, d: '像样的武器了' },
  sword_copper: { n: '铜剑',     c: 'weapon', p: 22, wpn: { dmg: 18, cd: .42, range: 1.2 }, d: '泛着铜光的利刃' },
  sword_iron:   { n: '铁剑',     c: 'weapon', p: 36, wpn: { dmg: 26, cd: .4,  range: 1.25 }, d: '削铁如泥' },
  sword_knight: { n: '骑士剑',   c: 'weapon', p: 80, wpn: { dmg: 38, cd: .38, range: 1.35 }, d: '传世名剑「星火」' },
  bow_wood:     { n: '木弓',     c: 'weapon', p: 18, wpn: { dmg: 16, cd: .8,  range: 7, proj: 'arrow' }, d: '远程放风筝' },
  bow_war:      { n: '战弓',     c: 'weapon', p: 42, wpn: { dmg: 24, cd: .7,  range: 8, proj: 'arrow' }, d: '军队制式强弓' },
  staff_fire:   { n: '火焰法杖', c: 'weapon', p: 60, wpn: { dmg: 28, cd: .9,  range: 7, proj: 'fire', effect: 'burn' }, d: '命中附加灼烧' },
  staff_ice:    { n: '冰霜法杖', c: 'weapon', p: 60, wpn: { dmg: 28, cd: .9,  range: 7, proj: 'ice', effect: 'slow' }, d: '命中减速敌人' },
  bomb:         { n: '炸弹',    c: 'weapon', p: 10, wpn: { dmg: 45, cd: 1.2, range: 5, proj: 'bomb', aoe: 1.8 }, d: '投掷爆炸，范围伤害（消耗品）' },
  // —— 防具 & 饰品
  hat_straw:   { n: '草帽',    c: 'armor', p: 4,  arm: { slot: 'head', def: 1, warm: 1 }, d: '遮阳又可爱' },
  hat_leather: { n: '皮帽',    c: 'armor', p: 10, arm: { slot: 'head', def: 2, warm: 2 }, d: '轻便保暖' },
  helm_iron:   { n: '铁盔',    c: 'armor', p: 22, arm: { slot: 'head', def: 5, warm: 1 }, d: '硬邦邦的安全感' },
  helm_knight: { n: '骑士头盔',c: 'armor', p: 50, arm: { slot: 'head', def: 7, warm: 1 }, d: '带红缨的荣誉之盔' },
  shirt_cloth: { n: '布衣',    c: 'armor', p: 5,  arm: { slot: 'body', def: 2, warm: 1 }, d: '总比光着强' },
  armor_leather:{ n: '皮甲',   c: 'armor', p: 18, arm: { slot: 'body', def: 4, warm: 2 }, d: '猎人经典款' },
  armor_iron:  { n: '铁甲',    c: 'armor', p: 40, arm: { slot: 'body', def: 8, warm: 1 }, d: '铁罐头防护' },
  armor_knight:{ n: '骑士板甲',c: 'armor', p: 90, arm: { slot: 'body', def: 12, warm: 2 }, d: '闪闪发光的重装' },
  coat_fur:    { n: '毛皮大衣',c: 'armor', p: 30, arm: { slot: 'body', def: 4, warm: 5 }, d: '雪原生存神器' },
  boots_cloth: { n: '布鞋',    c: 'armor', p: 4,  arm: { slot: 'feet', def: 1, spd: .05 }, d: '轻便软和' },
  boots_leather:{ n: '皮靴',   c: 'armor', p: 12, arm: { slot: 'feet', def: 2, spd: .08 }, d: '抓地更稳' },
  boots_iron:  { n: '铁靴',    c: 'armor', p: 24, arm: { slot: 'feet', def: 4 }, d: '脚部堡垒' },
  boots_spring:{ n: '蹦蹦靴',  c: 'armor', p: 46, arm: { slot: 'feet', def: 3, spd: .15 }, d: '走路带风' },
  ring_power:  { n: '力量戒指',c: 'armor', p: 50, arm: { slot: 'acc', def: 0, dmgPct: .1 }, d: '攻击+10%' },
  ring_luck:   { n: '幸运戒指',c: 'armor', p: 50, arm: { slot: 'acc', def: 0, luck: .15 }, d: '额外掉落率+15%' },
  amulet_warm: { n: '暖心吊坠',c:'armor', p: 40, arm: { slot: 'acc', def: 1, warm: 4 }, d: '寒夜里的温柔' },
  charm_gob:   { n: '哥布林克星',c:'armor',p: 35, arm: { slot: 'acc', def: 2, vsGob: .25 }, d: '对哥布林类伤害+25%' },
  // —— 种子
  seed_wheat:  { n: '小麦种子', c: 'seed', p: 3, seed: { crop: 'wheat' },  d: '春秋可种，3天成熟' },
  seed_carrot: { n: '胡萝卜种子',c:'seed', p: 4, seed: { crop: 'carrot' }, d: '春夏可种，2天成熟' },
  seed_pumpkin:{ n: '南瓜种子', c: 'seed', p: 6, seed: { crop: 'pumpkin' }, d: '夏秋可种，3天成熟' },
  seed_chili:  { n: '火焰椒种子',c:'seed', p: 6, seed: { crop: 'chili' },  d: '夏季可种，2天成熟' },
  // —— 特殊
  key_ruin:    { n: '废墟钥匙', c: 'special', p: 15, d: '能打开废墟里的封印宝箱' },
  book_skill:  { n: '技能书',   c: 'special', p: 60, d: '研读后获得1点技能点' },
  map_treasure:{ n: '藏宝图',   c: 'special', p: 20, d: '使用后在大地图标记一处宝藏' },
  trophy_goblin: { n: '哥布林王战利品', c: 'special', p: 100, d: '证明你击败了森林之王' },
  trophy_ice:    { n: '冰雪女巫冠冕',   c: 'special', p: 150, d: '凝结着极寒的魔力' },
  trophy_flame:  { n: '炎魔核心',       c: 'special', p: 200, d: '仍在燃烧的火焰心脏' },
  trophy_ancient:{ n: '远古之心',       c: 'special', p: 500, d: '山谷万物的源初之力' },
  // —— 鱼
  fish_crucian:{ n: '鲫鱼',   c: 'fish', p: 5,  fish: { w: [0.3, 1.2], rarity: 1 } },
  fish_carp:   { n: '鲤鱼',   c: 'fish', p: 9,  fish: { w: [0.8, 2.5], rarity: 1 } },
  fish_catfish:{ n: '鲶鱼',   c: 'fish', p: 12, fish: { w: [1.2, 4], rarity: 2 } },
  fish_trout:  { n: '鳟鱼',   c: 'fish', p: 14, fish: { w: [0.5, 2], rarity: 2 } },
  fish_eel:    { n: '鳗鱼',   c: 'fish', p: 18, fish: { w: [1, 3], rarity: 3 } },
  fish_snow:   { n: '雪鳞鱼', c: 'fish', p: 26, fish: { w: [0.4, 1.5], rarity: 3 } },
  fish_koi:    { n: '锦鲤',   c: 'fish', p: 60, fish: { w: [0.6, 1.8], rarity: 4 } },
  junk_boot:   { n: '破靴子', c: 'fish', p: 1,  fish: { rarity: 0 }, d: '……至少能卖1块钱' },
};

// ---------------- 配方 ----------------
// st: hand手搓/bench工作台/furnace熔炉/anvil铁砧/pot烹饪锅/saw锯木台
// unlock: 'town2'/'quest:m10'/缺省=已解锁
export const RECIPES = [
  // 手搓
  { id: 'r_axe_wood',   st: 'hand', in: [['wood', 3], ['fiber', 2]], out: ['axe_wood', 1] },
  { id: 'r_pick_wood',  st: 'hand', in: [['wood', 3], ['fiber', 2]], out: ['pick_wood', 1] },
  { id: 'r_stick',      st: 'hand', in: [['wood', 2]], out: ['stick', 1] },
  { id: 'r_spear',      st: 'hand', in: [['wood', 4], ['stone', 2]], out: ['spear', 1] },
  { id: 'r_rope',       st: 'hand', in: [['fiber', 3]], out: ['rope', 1] },
  { id: 'r_feed',       st: 'hand', in: [['wheat', 2]], out: ['feed', 2] },
  { id: 'r_bait',       st: 'hand', in: [['fiber', 2], ['berry', 1]], out: ['bait', 2] },
  { id: 'r_waterskin',  st: 'hand', in: [['leather', 2], ['rope', 1]], out: ['waterskin', 1] },
  { id: 'r_hat_straw',  st: 'hand', in: [['fiber', 5]], out: ['hat_straw', 1] },
  // 工作台
  { id: 'r_axe_stone',  st: 'bench', in: [['stone', 4], ['wood', 2]], out: ['axe_stone', 1] },
  { id: 'r_pick_stone', st: 'bench', in: [['stone', 4], ['wood', 2]], out: ['pick_stone', 1] },
  { id: 'r_shovel',     st: 'bench', in: [['bar_iron', 1], ['wood', 2]], out: ['shovel', 1] },
  { id: 'r_rod_wood',   st: 'bench', in: [['wood', 4], ['fiber', 3]], out: ['rod_wood', 1] },
  { id: 'r_sword_stone',st: 'bench', in: [['wood', 1], ['stone', 5], ['fiber', 2]], out: ['sword_stone', 1] },
  { id: 'r_sword_copper',st: 'bench',in: [['bar_copper', 2], ['wood', 2]], out: ['sword_copper', 1] },
  { id: 'r_sword_iron', st: 'bench', in: [['bar_iron', 2], ['wood', 2], ['leather', 1]], out: ['sword_iron', 1] },
  { id: 'r_bow_wood',   st: 'bench', in: [['wood', 3], ['rope', 2]], out: ['bow_wood', 1] },
  { id: 'r_bow_war',    st: 'bench', in: [['bar_iron', 1], ['wood', 3], ['rope', 3]], out: ['bow_war', 1] },
  { id: 'r_staff_fire', st: 'bench', in: [['bar_iron', 2], ['essence_fire', 3], ['crystal', 1]], out: ['staff_fire', 1] },
  { id: 'r_staff_ice',  st: 'bench', in: [['bar_iron', 2], ['essence_ice', 3], ['crystal', 1]], out: ['staff_ice', 1] },
  { id: 'r_bomb',       st: 'bench', in: [['coal', 2], ['sulfur', 2], ['fiber', 1]], out: ['bomb', 2] },
  { id: 'r_shirt_cloth',st: 'bench', in: [['cloth', 2], ['rope', 1]], out: ['shirt_cloth', 1] },
  { id: 'r_boots_cloth',st: 'bench', in: [['cloth', 1], ['rope', 1]], out: ['boots_cloth', 1] },
  { id: 'r_hat_leather',st: 'bench', in: [['leather', 2]], out: ['hat_leather', 1] },
  { id: 'r_armor_leather',st:'bench',in: [['leather', 4], ['rope', 2]], out: ['armor_leather', 1] },
  { id: 'r_boots_leather',st:'bench',in: [['leather', 3]], out: ['boots_leather', 1] },
  { id: 'r_armor_iron', st: 'bench', in: [['bar_iron', 4], ['cloth', 2]], out: ['armor_iron', 1] },
  { id: 'r_helm_iron',  st: 'bench', in: [['bar_iron', 2]], out: ['helm_iron', 1] },
  { id: 'r_boots_iron', st: 'bench', in: [['bar_iron', 2]], out: ['boots_iron', 1] },
  { id: 'r_coat_fur',   st: 'bench', in: [['pelt', 4], ['leather', 2], ['cloth', 1]], out: ['coat_fur', 1] },
  { id: 'r_lantern',    st: 'bench', in: [['bar_copper', 1], ['glass', 1], ['gear', 1]], out: ['lantern', 1] },
  { id: 'r_charm_gob',  st: 'bench', in: [['badge_goblin', 5], ['bar_copper', 2]], out: ['charm_gob', 1] },
  { id: 'r_rod_iron',   st: 'bench', in: [['bar_iron', 1], ['rope', 2]], out: ['rod_iron', 1] },
  // 熔炉
  { id: 'r_bar_copper', st: 'furnace', in: [['ore_copper', 2], ['coal', 1]], out: ['bar_copper', 1] },
  { id: 'r_bar_iron',   st: 'furnace', in: [['ore_iron', 2], ['coal', 1]], out: ['bar_iron', 1] },
  { id: 'r_bar_gold',   st: 'furnace', in: [['ore_gold', 2], ['coal', 2]], out: ['bar_gold', 1] },
  { id: 'r_glass',      st: 'furnace', in: [['sand', 2], ['coal', 1]], out: ['glass', 1] },
  { id: 'r_brick',      st: 'furnace', in: [['clay', 2], ['coal', 1]], out: ['brick', 1] },
  { id: 'r_nail',       st: 'furnace', in: [['bar_iron', 1]], out: ['nail', 4] },
  // 锯木台
  { id: 'r_plank',      st: 'saw', in: [['wood', 2]], out: ['plank', 4] },
  { id: 'r_cloth',      st: 'saw', in: [['fiber', 4]], out: ['cloth', 2] },
  { id: 'r_cloth_wool', st: 'saw', in: [['wool', 2]], out: ['cloth', 2] },
  { id: 'r_gear',       st: 'saw', in: [['nail', 3], ['plank', 2]], out: ['gear', 1] },
  { id: 'r_flour',      st: 'saw', in: [['wheat', 3]], out: ['flour', 2] },
  // 烹饪锅
  { id: 'r_meat_cooked',st: 'pot', in: [['meat_raw', 1]], out: ['meat_cooked', 1] },
  { id: 'r_jerky',      st: 'pot', in: [['meat_raw', 2], ['herb', 1]], out: ['jerky', 2] },
  { id: 'r_bread',      st: 'pot', in: [['flour', 2]], out: ['bread', 1] },
  { id: 'r_salad',      st: 'pot', in: [['carrot', 2], ['berry', 1]], out: ['salad', 1] },
  { id: 'r_pumpkin_soup',st:'pot', in: [['pumpkin', 1], ['milk', 1]], out: ['pumpkin_soup', 1] },
  { id: 'r_stew',       st: 'pot', in: [['meat_raw', 1], ['carrot', 1], ['mushroom', 1]], out: ['stew', 1] },
  { id: 'r_honey_cookie',st:'pot', in: [['honey', 1], ['flour', 1]], out: ['honey_cookie', 2] },
  { id: 'r_fish_soup',  st: 'pot', in: [['fish_crucian', 1], ['carrot', 1]], out: ['fish_soup', 1] },
  { id: 'r_fried_egg',  st: 'pot', in: [['egg', 1]], out: ['fried_egg', 1] },
  { id: 'r_cheese',     st: 'pot', in: [['milk', 2]], out: ['cheese', 1] },
  { id: 'r_juice',      st: 'pot', in: [['berry', 3]], out: ['juice', 1] },
  { id: 'r_tea_herb',   st: 'pot', in: [['herb', 2]], out: ['tea_herb', 2] },
  { id: 'r_cake',       st: 'pot', in: [['flour', 2], ['egg', 2], ['milk', 1], ['honey', 1]], out: ['cake', 1], unlock: 'town3' },
  { id: 'r_potion_small',st:'pot', in: [['herb', 1], ['berry', 2]], out: ['potion_small', 1] },
  { id: 'r_potion_big', st: 'pot', in: [['herb', 3], ['potion_small', 1]], out: ['potion_big', 1] },
  { id: 'r_potion_speed',st:'pot', in: [['juice', 1], ['herb', 1]], out: ['potion_speed', 1] },
  { id: 'r_potion_str', st: 'pot', in: [['meat_cooked', 1], ['chili', 1]], out: ['potion_str', 1] },
  { id: 'r_potion_warm',st: 'pot', in: [['herb', 2], ['chili', 1]], out: ['potion_warm', 1] },
  { id: 'r_antidote',   st: 'pot', in: [['herb', 2], ['mushroom', 1]], out: ['antidote', 1] },
  // 铁砧（小镇2级）
  { id: 'r_sword_knight',st:'anvil', in: [['bar_iron', 3], ['bar_gold', 1], ['leather', 2]], out: ['sword_knight', 1], unlock: 'town2' },
  { id: 'r_helm_knight',st: 'anvil', in: [['bar_iron', 3], ['feather', 2]], out: ['helm_knight', 1], unlock: 'town2' },
  { id: 'r_armor_knight',st:'anvil', in: [['bar_iron', 5], ['bar_gold', 1], ['cloth', 3]], out: ['armor_knight', 1], unlock: 'town3' },
  { id: 'r_boots_spring',st:'anvil', in: [['gear', 2], ['bar_iron', 1], ['cloth', 2]], out: ['boots_spring', 1], unlock: 'town2' },
  { id: 'r_ring_power', st: 'anvil', in: [['bar_gold', 1], ['bar_iron', 1]], out: ['ring_power', 1], unlock: 'town2' },
  { id: 'r_ring_luck',  st: 'anvil', in: [['bar_gold', 1], ['crystal', 1]], out: ['ring_luck', 1], unlock: 'town2' },
  { id: 'r_amulet_warm',st: 'anvil', in: [['bar_gold', 1], ['essence_fire', 1]], out: ['amulet_warm', 1], unlock: 'town2' },
  { id: 'r_key_ruin',   st: 'anvil', in: [['badge_goblin', 3], ['bar_copper', 1]], out: ['key_ruin', 1] },
  { id: 'r_book_skill', st: 'anvil', in: [['badge_goblin', 10], ['bar_gold', 2], ['essence_dark', 2]], out: ['book_skill', 1] },
];

// ---------------- 建筑 ----------------
// cat: base/prod/farm/town/def/deco/special
// cost:[[item,cnt]] hp:耐久 walk:可通行 light:光照半径 station:工作台 door:门 bed:睡
// storage:仓储格 cap:+人口 ranch:{动物,cap} farm:农田 tower:{dmg,range,cd} unlock:解锁条件
export const BUILDINGS = {
  campfire:   { n: '篝火', cat: 'base', cost: [['wood', 5], ['stone', 3]], hp: 120, light: 4.5, warm: 5, d: '黑夜中的希望之光，取暖照明' },
  torch:      { n: '火把', cat: 'base', cost: [['wood', 2], ['fiber', 1]], hp: 60, light: 3, walk: true, d: '插在地上的小火把' },
  wall_wood:  { n: '木墙', cat: 'base', cost: [['plank', 2]], hp: 200, d: '基础防御工事' },
  wall_stone: { n: '石墙', cat: 'base', cost: [['stone', 5]], hp: 450, d: '更坚固的城墙' },
  fence:      { n: '木栅栏', cat: 'base', cost: [['wood', 3]], hp: 80, d: '圈住牲畜，拦不住怪物' },
  gate_wood:  { n: '木门', cat: 'base', cost: [['plank', 3], ['nail', 2]], hp: 220, door: true, d: '可以开关的木门' },
  gate_stone: { n: '石门', cat: 'base', cost: [['stone', 6], ['nail', 2]], hp: 500, door: true, d: '厚重可靠的石门' },
  floor_wood: { n: '木地板', cat: 'base', cost: [['plank', 1]], hp: 60, walk: true, deco: 1, d: '铺出温馨的小屋地面' },
  floor_stone:{ n: '石板路', cat: 'base', cost: [['stone', 2]], hp: 100, walk: true, deco: 1, d: '整洁的石板路' },
  bed_straw:  { n: '睡袋', cat: 'base', cost: [['fiber', 8], ['wood', 4]], hp: 80, bed: true, d: '将就睡一晚，恢复少量精力' },
  bed_wood:   { n: '木床', cat: 'base', cost: [['plank', 6], ['fiber', 4], ['cloth', 1]], hp: 150, bed: 2, d: '一觉到天亮，精力全满' },
  storage_wood:{ n: '木箱', cat: 'base', cost: [['plank', 4]], hp: 150, storage: 16, d: '扩大小镇仓储 +16 格' },
  storage_stone:{ n: '石仓', cat: 'base', cost: [['plank', 6], ['stone', 6]], hp: 300, storage: 32, d: '大型仓储 +32 格', unlock: 'town2' },
  bench_work: { n: '工作台', cat: 'prod', cost: [['wood', 6], ['stone', 4]], hp: 200, station: 'bench', d: '解锁更多制作配方' },
  furnace:    { n: '熔炉', cat: 'prod', cost: [['stone', 12], ['wood', 4]], hp: 300, station: 'furnace', light: 3, d: '冶炼金属、烧制玻璃砖块' },
  anvil:      { n: '铁砧', cat: 'prod', cost: [['bar_iron', 4], ['stone', 6]], hp: 350, station: 'anvil', unlock: 'town2', d: '打造高级装备' },
  pot_cook:   { n: '烹饪锅', cat: 'prod', cost: [['bar_copper', 2], ['stone', 4]], hp: 180, station: 'pot', light: 1.5, d: '烹饪美食与药水' },
  sawmill:    { n: '锯木台', cat: 'prod', cost: [['plank', 8], ['stone', 4], ['nail', 4]], hp: 220, station: 'saw', d: '加工木板布料零件面粉' },
  plot_farm:  { n: '农田', cat: 'farm', cost: [['wood', 4], ['fiber', 4]], hp: 60, farm: true, walk: true, d: '播种的地方，农夫会自动照料' },
  well:       { n: '水井', cat: 'farm', cost: [['stone', 10], ['plank', 4]], hp: 250, d: '免费饮水、灌满水壶、浇灌农田' },
  coop:       { n: '鸡舍', cat: 'farm', cost: [['plank', 6], ['fiber', 6]], hp: 180, ranch: { animal: 'chicken', cap: 4 }, d: '收养鸡，每天产蛋' },
  barn:       { n: '牛棚', cat: 'farm', cost: [['plank', 10], ['nail', 4]], hp: 250, ranch: { animal: 'cow', cap: 3 }, d: '收养牛，每天产奶' },
  pen:        { n: '羊圈', cat: 'farm', cost: [['plank', 8], ['rope', 2]], hp: 200, ranch: { animal: 'sheep', cap: 3 }, d: '收养羊，每天产毛' },
  hut_wood:   { n: '小木屋', cat: 'town', cost: [['plank', 10], ['cloth', 2]], hp: 400, cap: 2, deco: 2, d: '居民的家，+2 人口上限' },
  hut_stone:  { n: '石屋', cat: 'town', cost: [['brick', 8], ['plank', 6]], hp: 700, cap: 3, deco: 3, unlock: 'town3', d: '宽敞的石屋，+3 人口上限' },
  board_recruit:{ n: '招贤台', cat: 'town', cost: [['plank', 6], ['cloth', 2]], hp: 200, d: '花费金币招募路过的小镇移民' },
  market:     { n: '集市', cat: 'town', cost: [['plank', 12], ['cloth', 4], ['nail', 4]], hp: 300, unlock: 'quest:m10', d: '每天获得税收，解锁自由买卖' },
  post:       { n: '商队驿站', cat: 'town', cost: [['plank', 8], ['gear', 2], ['cloth', 2]], hp: 300, unlock: 'town3', d: '商队定期来访，收购价更高' },
  notice_board:{ n: '公告牌', cat: 'town', cost: [['wood', 6], ['plank', 2]], hp: 120, d: '每天发布3个日常委托' },
  tower_arrow: { n: '木箭塔', cat: 'def', cost: [['plank', 8], ['stone', 4], ['gear', 1]], hp: 300, tower: { dmg: 14, range: 6.5, cd: 1.1 }, d: '自动射击范围内的怪物' },
  tower_ballista:{ n: '石弩塔', cat: 'def', cost: [['plank', 10], ['bar_iron', 3], ['gear', 3]], hp: 600, tower: { dmg: 32, range: 8, cd: 1.6 }, unlock: 'town3', d: '威力巨大的重型塔防' },
  spikes:     { n: '尖刺陷阱', cat: 'def', cost: [['wood', 4], ['stone', 2]], hp: 150, walk: true, trap: { dmg: 8, cd: 1 }, d: '踩上去的怪物持续掉血' },
  flower_bed: { n: '花坛', cat: 'deco', cost: [['wood', 2], ['fiber', 4]], hp: 60, deco: 2, d: '赏心悦目，居民开心' },
  lamp_post:  { n: '路灯', cat: 'deco', cost: [['bar_iron', 1], ['glass', 2], ['plank', 2]], hp: 120, light: 4.5, deco: 2, d: '照亮小镇的夜晚' },
  bench_park: { n: '长椅', cat: 'deco', cost: [['plank', 3]], hp: 80, deco: 1, d: '坐下来歇歇脚' },
  fountain:   { n: '喷泉', cat: 'deco', cost: [['stone', 12], ['bar_copper', 2], ['gear', 1]], hp: 400, deco: 5, unlock: 'town3', d: '小镇的骄傲，大幅提升幸福感' },
  statue_hero:{ n: '英雄雕像', cat: 'deco', cost: [['stone', 16], ['bar_gold', 2]], hp: 600, deco: 6, unlock: 'quest:m11', d: '纪念拓荒者的丰碑' },
  banner_star:{ n: '星火旗帜', cat: 'deco', cost: [['plank', 2], ['cloth', 2]], hp: 100, deco: 3, d: '迎风飘扬的小镇旗帜' },
  fire_bowl:  { n: '装饰火盆', cat: 'deco', cost: [['stone', 6], ['coal', 2]], hp: 150, light: 4, deco: 2, d: '温暖的石雕火盆' },
  altar_ancient:{ n: '远古祭坛', cat: 'special', cost: [['trophy_goblin', 1], ['trophy_ice', 1], ['trophy_flame', 1], ['bar_gold', 5], ['crystal', 5]], hp: 999, unlock: 'quest:m13', d: '献上三大Boss战利品，召唤最终试炼' },
};

// ---------------- 作物 ----------------
export const CROPS = {
  wheat:   { n: '小麦',   seasons: [0, 3], days: 3, out: [['wheat', 2], ['seed_wheat', 1]], bonus: [['seed_wheat', 1, .5]] },
  carrot:  { n: '胡萝卜', seasons: [0, 1], days: 2, out: [['carrot', 2], ['seed_carrot', 1]], bonus: [['carrot', 1, .4]] },
  pumpkin: { n: '南瓜',   seasons: [1, 2], days: 3, out: [['pumpkin', 1], ['seed_pumpkin', 1]], bonus: [['pumpkin', 1, .35]] },
  chili:   { n: '火焰椒', seasons: [1],    days: 2, out: [['chili', 2], ['seed_chili', 1]], bonus: [['chili', 1, .5]] },
};

// ---------------- 怪物 ----------------
// tier 强度档; hp/dmg/spd; aggro 侦测半径; ranged 远程; night 夜行(白天消失)
// drops:[[item,min,max,chance]]; xp; boss; special: summon/ring/charge/meteor/teleport
export const MONSTERS = {
  slime:      { n: '史莱姆',   tier: 1, hp: 24,  dmg: 6,  spd: 1.4, aggro: 4, xp: 8,  drops: [['resin', 1, 1, .3], ['fiber', 1, 2, .4]] },
  boar:       { n: '野猪',     tier: 1, hp: 45,  dmg: 12, spd: 2.2, aggro: 3.5, xp: 14, neutral: true, special: 'charge', drops: [['meat_raw', 2, 3, 1], ['leather', 1, 1, .5], ['fang', 1, 1, .3]] },
  wolf:       { n: '灰狼',     tier: 1, hp: 40,  dmg: 10, spd: 2.6, aggro: 6, xp: 14, night: true, drops: [['meat_raw', 1, 2, 1], ['leather', 1, 1, .4], ['fang', 1, 1, .25]] },
  rabbit_mob: { n: '野兔',     tier: 0, hp: 10,  dmg: 0,  spd: 2.8, aggro: 0, xp: 3, passive: true, drops: [['meat_raw', 1, 1, 1]] },
  goblin:     { n: '哥布林',   tier: 2, hp: 55,  dmg: 12, spd: 2.1, aggro: 5.5, xp: 22, drops: [['badge_goblin', 1, 1, .5], ['coin', 2, 6, .6]] },
  goblin_archer:{ n: '哥布林弓手', tier: 2, hp: 42, dmg: 10, spd: 1.9, aggro: 7, ranged: 6, xp: 24, drops: [['badge_goblin', 1, 1, .5], ['wood', 1, 2, .4]] },
  spider:     { n: '大蜘蛛',   tier: 2, hp: 60,  dmg: 10, spd: 2.4, aggro: 5, xp: 24, night: true, poison: true, drops: [['silk', 1, 3, .8], ['chitin', 1, 1, .4]] },
  treant_sap: { n: '树精',     tier: 2, hp: 90,  dmg: 14, spd: 1.0, aggro: 3.5, xp: 30, drops: [['wood', 3, 5, 1], ['resin', 1, 2, .5], ['herb', 1, 1, .3]] },
  mush_toxic: { n: '毒蘑菇怪', tier: 1, hp: 35,  dmg: 8,  spd: 1.2, aggro: 4, xp: 12, poison: true, drops: [['mushroom', 2, 4, 1], ['herb', 1, 1, .3]] },
  croc:       { n: '鳄鱼',     tier: 2, hp: 80,  dmg: 16, spd: 1.8, aggro: 4, xp: 26, drops: [['leather', 2, 3, 1], ['meat_raw', 1, 2, .8], ['fang', 1, 1, .4]] },
  bog_lurker: { n: '沼泽怪',   tier: 3, hp: 110, dmg: 18, spd: 1.5, aggro: 5, xp: 38, drops: [['clay', 2, 4, .8], ['essence_dark', 1, 1, .2], ['ginseng', 1, 1, .1]] },
  scorpion:   { n: '巨蝎',     tier: 2, hp: 55,  dmg: 14, spd: 2.0, aggro: 5, xp: 24, poison: true, drops: [['chitin', 1, 2, 1], ['sulfur', 1, 1, .3]] },
  mummy:      { n: '木乃伊',   tier: 3, hp: 100, dmg: 18, spd: 1.3, aggro: 5, xp: 36, drops: [['cloth', 1, 2, .7], ['coin', 5, 15, .5]] },
  sandworm:   { n: '沙虫',     tier: 3, hp: 120, dmg: 20, spd: 2.2, aggro: 6, xp: 40, special: 'ambush', drops: [['chitin', 2, 3, 1], ['sulfur', 1, 2, .5]] },
  slime_ice:  { n: '冰史莱姆', tier: 1, hp: 30,  dmg: 8,  spd: 1.4, aggro: 4, xp: 10, slow: true, drops: [['essence_ice', 1, 1, .25], ['fiber', 1, 2, .4]] },
  wolf_snow:  { n: '雪狼',     tier: 2, hp: 55,  dmg: 14, spd: 2.7, aggro: 6, xp: 22, night: true, drops: [['meat_raw', 1, 2, 1], ['pelt', 1, 1, .4], ['fang', 1, 1, .3]] },
  yeti:       { n: '雪人',     tier: 3, hp: 140, dmg: 22, spd: 1.6, aggro: 5, xp: 44, special: 'charge', drops: [['pelt', 2, 3, 1], ['essence_ice', 1, 1, .35], ['bone', 1, 2, .5]] },
  banshee:    { n: '冰雪女妖', tier: 3, hp: 90,  dmg: 16, spd: 1.8, aggro: 7, ranged: 6, xp: 42, slow: true, drops: [['essence_ice', 1, 2, .5], ['crystal', 1, 1, .2]] },
  bat_fire:   { n: '火蝙蝠',   tier: 2, hp: 35,  dmg: 10, spd: 3.2, aggro: 7, xp: 20, fly: true, burn: true, drops: [['essence_fire', 1, 1, .3]] },
  slime_lava: { n: '熔岩史莱姆', tier: 2, hp: 60, dmg: 14, spd: 1.5, aggro: 4, xp: 24, burn: true, drops: [['sulfur', 1, 2, .6], ['essence_fire', 1, 1, .3]] },
  demon_imp:  { n: '小恶魔',   tier: 3, hp: 70,  dmg: 18, spd: 2.0, aggro: 7, ranged: 6, xp: 40, burn: true, drops: [['sulfur', 1, 2, .5], ['essence_fire', 1, 1, .4], ['obsidian', 1, 1, .3]] },
  demon_lava: { n: '火焰恶魔', tier: 4, hp: 160, dmg: 26, spd: 1.8, aggro: 6, xp: 60, burn: true, drops: [['obsidian', 1, 2, 1], ['essence_fire', 1, 2, .6], ['bar_gold', 1, 1, .1]] },
  skeleton:   { n: '骷髅',     tier: 2, hp: 65,  dmg: 13, spd: 1.9, aggro: 5.5, xp: 22, night: true, drops: [['bone', 1, 3, 1], ['coin', 3, 8, .4]] },
  zombie:     { n: '僵尸',     tier: 1, hp: 50,  dmg: 10, spd: 1.2, aggro: 5, xp: 14, night: true, drops: [['fiber', 1, 2, .5], ['coin', 1, 4, .3]] },
  shadow:     { n: '暗影',     tier: 3, hp: 80,  dmg: 16, spd: 2.8, aggro: 7, xp: 36, night: true, special: 'teleport', drops: [['essence_dark', 1, 1, .5]] },
  dragon_whelp:{ n: '火焰幼龙', tier: 4, hp: 190, dmg: 24, spd: 2.4, aggro: 8, ranged: 6, fly: true, burn: true, xp: 80,
                drops: [['essence_fire', 1, 2, .7], ['obsidian', 1, 2, .5], ['ore_gold', 1, 1, .15]] },
  gold_goblin:{ n: '宝藏地精', tier: 2, hp: 60,  dmg: 8,  spd: 3.4, aggro: 0, xp: 60, passive: true, special: 'flee',
                drops: [['coin', 30, 80, 1], ['map_treasure', 1, 1, .15]] },
  // —— Boss
  goblin_king:{ n: '哥布林王', tier: 5, hp: 700, dmg: 28, spd: 2.0, aggro: 9, xp: 500, boss: true, special: 'summon', size: 1.6,
                drops: [['trophy_goblin', 1, 1, 1], ['bar_gold', 2, 3, 1], ['badge_goblin', 5, 10, 1]] },
  ice_queen:  { n: '冰雪女巫', tier: 5, hp: 1100, dmg: 32, spd: 1.8, aggro: 9, ranged: 7, xp: 800, boss: true, special: 'ring', size: 1.7, slow: true,
                drops: [['trophy_ice', 1, 1, 1], ['crystal', 3, 5, 1], ['essence_ice', 4, 6, 1]] },
  flame_lord: { n: '炎魔领主', tier: 5, hp: 1600, dmg: 38, spd: 1.9, aggro: 9, xp: 1200, boss: true, special: 'meteor', size: 1.8, burn: true,
                drops: [['trophy_flame', 1, 1, 1], ['obsidian', 4, 6, 1], ['essence_fire', 5, 8, 1], ['bar_gold', 3, 4, 1]] },
  treant_ancient:{ n: '远古树人', tier: 6, hp: 2400, dmg: 45, spd: 1.4, aggro: 10, xp: 2000, boss: true, special: 'all', size: 2.2,
                drops: [['trophy_ancient', 1, 1, 1], ['crystal', 5, 8, 1], ['bar_gold', 5, 8, 1], ['book_skill', 2, 3, 1], ['ginseng', 2, 3, 1]] },
};

// ---------------- 动物（可捕捉/被动） ----------------
export const ANIMALS = {
  chicken: { n: '鸡', hp: 15, spd: 1.6, product: ['egg', 1], days: 1, drops: [['meat_raw', 1, 1, 1], ['feather', 2, 3, 1]] },
  cow:     { n: '牛', hp: 40, spd: 1.4, product: ['milk', 1], days: 1, drops: [['meat_raw', 3, 4, 1], ['leather', 2, 2, 1]] },
  sheep:   { n: '羊', hp: 30, spd: 1.5, product: ['wool', 1], days: 1, drops: [['meat_raw', 2, 3, 1], ['wool', 2, 3, 1]] },
  deer:    { n: '鹿', hp: 25, spd: 3.0, drops: [['meat_raw', 2, 3, 1], ['leather', 1, 2, 1], ['bone', 1, 1, .4]] },
};

// ---------------- 地图自然物体（世界生成用） ----------------
// tool: 需要的工具kind与最低档; drops; hp: 采集几下; regrow: 重生秒数
export const WORLD_OBJECTS = {
  tree:      { n: '树',     tool: ['axe', 1], hp: 3, drops: [['wood', 3, 5, 1], ['resin', 1, 1, .25], ['seed_wheat', 1, 1, .05]], regrow: 240, block: true, shadow: 1 },
  tree_big:  { n: '大树',   tool: ['axe', 2], hp: 5, drops: [['wood', 6, 9, 1], ['resin', 1, 2, .4], ['apple', 1, 2, .3]], regrow: 360, block: true, shadow: 1.3 },
  tree_pine: { n: '松树',   tool: ['axe', 1], hp: 3, drops: [['wood', 3, 5, 1], ['resin', 1, 1, .3]], regrow: 240, block: true, shadow: 1.1 },
  tree_snow: { n: '雪松',   tool: ['axe', 1], hp: 4, drops: [['wood', 4, 6, 1], ['resin', 1, 1, .3]], regrow: 300, block: true, shadow: 1.1 },
  tree_swamp:{ n: '沼泽树', tool: ['axe', 1], hp: 3, drops: [['wood', 3, 4, 1], ['herb', 1, 1, .3]], regrow: 300, block: true, shadow: 1.1 },
  tree_dead: { n: '枯木',   tool: ['axe', 1], hp: 2, drops: [['wood', 2, 3, 1], ['mushroom', 1, 1, .2]], regrow: 360, block: true, shadow: .8 },
  cactus:    { n: '仙人掌', tool: ['axe', 1], hp: 2, drops: [['fiber', 2, 3, 1]], regrow: 300, block: true, shadow: .7 },
  rock:      { n: '岩石',   tool: ['pick', 1], hp: 3, drops: [['stone', 3, 5, 1]], regrow: 300, block: true, shadow: .8 },
  rock_sand: { n: '沙岩',   tool: ['pick', 1], hp: 3, drops: [['stone', 2, 4, 1], ['sand', 1, 2, .5]], regrow: 300, block: true, shadow: .8 },
  ore_copper:{ n: '铜矿',   tool: ['pick', 1], hp: 3, drops: [['ore_copper', 2, 3, 1], ['stone', 1, 1, .5]], regrow: 420, block: true, shadow: .8 },
  ore_iron:  { n: '铁矿',   tool: ['pick', 2], hp: 4, drops: [['ore_iron', 2, 3, 1], ['stone', 1, 1, .5]], regrow: 480, block: true, shadow: .8 },
  ore_gold:  { n: '金矿',   tool: ['pick', 3], hp: 4, drops: [['ore_gold', 2, 3, 1]], regrow: 600, block: true, shadow: .8 },
  ore_crystal:{n: '水晶矿', tool: ['pick', 3], hp: 4, drops: [['crystal', 1, 2, 1]], regrow: 600, block: true, shadow: .8 },
  ore_coal:  { n: '煤矿',   tool: ['pick', 1], hp: 3, drops: [['coal', 2, 4, 1], ['stone', 1, 1, .4]], regrow: 420, block: true, shadow: .8 },
  obsidian:  { n: '黑曜石', tool: ['pick', 3], hp: 5, drops: [['obsidian', 1, 2, 1]], regrow: 600, block: true, shadow: .8 },
  sulfur:    { n: '硫磺堆', tool: ['pick', 1], hp: 2, drops: [['sulfur', 2, 3, 1]], regrow: 420, block: true, shadow: .6 },
  bush_berry:{ n: '浆果丛', tool: [null, 0], hp: 1, drops: [['berry', 2, 4, 1], ['fiber', 1, 1, .3]], regrow: 150, shadow: .5 },
  bush_herb: { n: '草药丛', tool: [null, 0], hp: 1, drops: [['herb', 1, 2, 1]], regrow: 200, shadow: .5 },
  grass_tuft:{ n: '草丛',   tool: [null, 0], hp: 1, drops: [['fiber', 1, 2, 1], ['seed_carrot', 1, 1, .04]], regrow: 100, shadow: .4 },
  reeds:     { n: '芦苇',   tool: [null, 0], hp: 1, drops: [['fiber', 2, 3, 1]], regrow: 120, shadow: .5 },
  mush_patch:{ n: '蘑菇圈', tool: [null, 0], hp: 1, drops: [['mushroom', 2, 3, 1]], regrow: 180, shadow: .4 },
  flower_patch:{ n: '花丛', tool: [null, 0], hp: 1, drops: [['fiber', 1, 1, 1]], regrow: 150, shadow: .4, deco: true },
  sand_pile: { n: '沙堆',   tool: ['shovel', 2], hp: 1, drops: [['sand', 3, 4, 1]], regrow: 240, shadow: .5 },
  clay_pile: { n: '黏土堆', tool: ['shovel', 2], hp: 1, drops: [['clay', 3, 4, 1]], regrow: 240, shadow: .5 },
  apple_tree:{ n: '苹果树', tool: ['axe', 1], hp: 3, drops: [['apple', 3, 5, 1], ['wood', 2, 3, 1]], regrow: 300, block: true, shadow: 1.1 },
  hive:      { n: '野蜂巢', tool: [null, 0], hp: 1, drops: [['honey', 1, 2, 1]], regrow: 400, shadow: .6 },
  meteor:    { n: '陨星残骸', tool: ['pick', 2], hp: 4, drops: [['crystal', 2, 4, 1], ['ore_iron', 1, 2, 1]], regrow: 0, block: true, shadow: .8 },
  ruin_pillar:{ n: '残破石柱', tool: ['pick', 2], hp: 4, drops: [['stone', 3, 5, 1], ['brick', 1, 1, .3]], regrow: 0, block: true, shadow: .9 },
};

// ---------------- 钓鱼 ----------------
export const FISH_TABLE = [
  { id: 'junk_boot',   w: 12, biomes: [] },
  { id: 'fish_crucian',w: 30, biomes: [] },
  { id: 'fish_carp',   w: 22, biomes: [] },
  { id: 'fish_catfish',w: 12, biomes: ['swamp'] },
  { id: 'fish_trout',  w: 12, biomes: ['grass', 'forest'] },
  { id: 'fish_eel',    w: 8,  biomes: ['swamp', 'forest'] },
  { id: 'fish_snow',   w: 8,  biomes: ['snow'] },
  { id: 'fish_koi',    w: 3,  biomes: [] },
];

// ---------------- 商人 ----------------
export const MERCHANT = {
  visitDays: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30],   // 来访日
  sell: [ // 出售列表 [物品, 价格]
    ['seed_wheat', 5], ['seed_carrot', 6], ['seed_pumpkin', 12], ['seed_chili', 12],
    ['waterskin', 30], ['rod_wood', 20], ['bait', 3], ['feed', 6],
    ['potion_small', 24], ['potion_big', 60], ['antidote', 20],
    ['coal', 8], ['crystal', 45], ['sulfur', 15], ['fiber', 3], ['wood', 2], ['stone', 2],
    ['map_treasure', 45], ['book_skill', 150],
  ],
};

// ---------------- 主线任务 ----------------
// type: gather(持有即可)/kill/build/craft/recruit/town/coins/boss/plant/eat/fish/house/night_kills
export const MAIN_QUESTS = [
  { id: 'm1',  n: '拾荒营地',   desc: '收集 8 木头、5 石头，并建造一座篝火', goals: [{ t: 'gather', item: 'wood', n: 8 }, { t: 'gather', item: 'stone', n: 5 }, { t: 'build', b: 'campfire', n: 1 }], reward: { items: [['fiber', 6]], coins: 10, xp: 30 } },
  { id: 'm2',  n: '简易工具',   desc: '制作一把木斧和一把木镐', goals: [{ t: 'craft', item: 'axe_wood', n: 1 }, { t: 'craft', item: 'pick_wood', n: 1 }], reward: { items: [['plank', 4]], xp: 40 } },
  { id: 'm3',  n: '工作台',     desc: '建造一座工作台', goals: [{ t: 'build', b: 'bench_work', n: 1 }], reward: { items: [['stone', 10]], coins: 20, xp: 50 } },
  { id: 'm4',  n: '遮风挡雨',   desc: '用 6 面木墙和 1 扇木门围出你的小窝', goals: [{ t: 'build', b: 'wall_wood', n: 6 }, { t: 'build', b: 'gate_wood', n: 1 }], reward: { coins: 40, xp: 60, unlockTip: '床与木箱已可建造' } },
  { id: 'm5',  n: '温饱一线',   desc: '采 6 个浆果，并进食 2 次', goals: [{ t: 'gather', item: 'berry', n: 6 }, { t: 'eat', n: 2 }], reward: { items: [['seed_wheat', 4], ['seed_carrot', 2]], xp: 60 } },
  { id: 'm6',  n: '第一块农田', desc: '建造 2 块农田并播下种子', goals: [{ t: 'build', b: 'plot_farm', n: 2 }, { t: 'plant', n: 2 }], reward: { coins: 30, xp: 80 } },
  { id: 'm7',  n: '夜幕降临',   desc: '在夜间的怪物袭击中击杀 5 只怪物', goals: [{ t: 'night_kills', n: 5 }], reward: { items: [['sword_stone', 1], ['potion_small', 2]], coins: 50, xp: 120 } },
  { id: 'm8',  n: '远方的篝火', desc: '在地图上找到幸存者并邀请其加入（对话后护送回镇）', goals: [{ t: 'recruit', n: 1 }], reward: { coins: 60, xp: 150 } },
  { id: 'm9',  n: '熔炉点火',   desc: '建造熔炉与锯木台，冶炼 5 块铁锭', goals: [{ t: 'build', b: 'furnace', n: 1 }, { t: 'build', b: 'sawmill', n: 1 }, { t: 'craft', item: 'bar_iron', n: 5 }], reward: { items: [['bar_copper', 5]], xp: 200 } },
  { id: 'm10', n: '公告与集市', desc: '建造公告牌与集市', goals: [{ t: 'build', b: 'notice_board', n: 1 }, { t: 'build', b: 'market', n: 1 }], reward: { coins: 80, xp: 250, unlockTip: '集市已解锁：每天自动税收' } },
  { id: 'm11', n: '森林的咆哮', desc: '在迷雾森林的哥布林祭坛召唤并击败哥布林王', goals: [{ t: 'boss', b: 'goblin_king' }], reward: { items: [['book_skill', 1]], coins: 200, xp: 500, unlockTip: '铁砧配方与英雄雕像已解锁' } },
  { id: 'm12', n: '繁荣小镇',   desc: '小镇升到 3 级，居民达到 4 人', goals: [{ t: 'town', n: 3 }, { t: 'pop', n: 4 }], reward: { coins: 150, xp: 400 } },
  { id: 'm13', n: '极寒与烈焰', desc: '分别击败冰雪女巫与炎魔领主', goals: [{ t: 'boss', b: 'ice_queen' }, { t: 'boss', b: 'flame_lord' }], reward: { coins: 300, xp: 800, unlockTip: '远古祭坛建造配方已解锁' } },
  { id: 'm14', n: '远古之心',   desc: '建造远古祭坛，召唤并击败远古树人', goals: [{ t: 'build', b: 'altar_ancient', n: 1 }, { t: 'boss', b: 'treant_ancient' }], reward: { items: [['cake', 5], ['book_skill', 2]], coins: 1000, xp: 2000, unlockTip: '传奇拓荒者！小镇的故事还在继续……' } },
];

// ---------------- 支线任务 ----------------
export const SIDE_QUESTS = [
  { id: 's1', n: '猎人小试',   desc: '累计击杀 10 只怪物',     goals: [{ t: 'kill', n: 10 }],    reward: { items: [['spear', 1]], xp: 80 } },
  { id: 's2', n: '伐木达人',   desc: '累计收集 60 木头',       goals: [{ t: 'gather_total', item: 'wood', n: 60 }], reward: { items: [['axe_stone', 1]], xp: 80 } },
  { id: 's3', n: '矿工之路',   desc: '累计挖掘 20 份矿石',     goals: [{ t: 'mine_total', n: 20 }], reward: { items: [['pick_stone', 1]], xp: 100 } },
  { id: 's4', n: '厨房新手',   desc: '烹饪 5 道料理',          goals: [{ t: 'cook', n: 5 }],     reward: { items: [['berry', 10], ['meat_cooked', 2]], xp: 90 } },
  { id: 's5', n: '垂钓时光',   desc: '钓上 5 条鱼',            goals: [{ t: 'fish', n: 5 }],     reward: { items: [['rod_wood', 1], ['bait', 5]], xp: 90 } },
  { id: 's6', n: '牧场主梦',   desc: '收养 3 只牲畜',          goals: [{ t: 'house_animal', n: 3 }], reward: { items: [['feed', 8]], coins: 60, xp: 120 } },
  { id: 's7', n: '第一桶金',   desc: '通过出售累计赚取 300 金币', goals: [{ t: 'sell_coins', n: 300 }], reward: { coins: 100, xp: 120 } },
  { id: 's8', n: '废墟探险家', desc: '探访 3 处古代废墟',      goals: [{ t: 'ruin', n: 3 }],     reward: { items: [['key_ruin', 1]], coins: 80, xp: 150 } },
];

// ---------------- 日常委托池 ----------------
export const DAILY_POOL = [
  { n: '木材订单',   goals: [{ t: 'gather_have', item: 'wood', n: 15 }],   reward: { coins: 20, xp: 30 } },
  { n: '石料订单',   goals: [{ t: 'gather_have', item: 'stone', n: 12 }],  reward: { coins: 18, xp: 30 } },
  { n: '夜间狩猎',   goals: [{ t: 'kill', n: 4 }],                        reward: { coins: 25, xp: 40 } },
  { n: '丰收时节',   goals: [{ t: 'harvest', n: 4 }],                     reward: { coins: 22, xp: 35 } },
  { n: '鲜鱼大餐',   goals: [{ t: 'fish', n: 3 }],                        reward: { coins: 20, xp: 35 } },
  { n: '煎蛋早餐',   goals: [{ t: 'gather_have', item: 'egg', n: 3 }],    reward: { coins: 15, xp: 25 } },
];

// ---------------- 成就 ----------------
export const ACHIEVEMENTS = [
  { id: 'a_first_camp',  n: '星星之火',   desc: '点燃第一座篝火',        cond: { t: 'build', b: 'campfire', n: 1 } },
  { id: 'a_wood_100',    n: '伐木工',     desc: '累计收集 100 木头',      cond: { t: 'stat', k: 'gather_wood', n: 100 } },
  { id: 'a_wood_500',    n: '森林之友',   desc: '累计收集 500 木头',      cond: { t: 'stat', k: 'gather_wood', n: 500 } },
  { id: 'a_stone_200',   n: '石匠',       desc: '累计收集 200 石头',      cond: { t: 'stat', k: 'gather_stone', n: 200 } },
  { id: 'a_mine_50',     n: '矿工',       desc: '累计挖掘 50 份矿石',     cond: { t: 'stat', k: 'mine_total', n: 50 } },
  { id: 'a_kill_10',     n: '初试锋芒',   desc: '击杀 10 只怪物',         cond: { t: 'stat', k: 'kills', n: 10 } },
  { id: 'a_kill_100',    n: '怪物克星',   desc: '击杀 100 只怪物',        cond: { t: 'stat', k: 'kills', n: 100 } },
  { id: 'a_kill_500',    n: '传说猎人',   desc: '击杀 500 只怪物',        cond: { t: 'stat', k: 'kills', n: 500 } },
  { id: 'a_night_5',     n: '守夜人',     desc: '安然度过 5 个夜晚',      cond: { t: 'stat', k: 'nights', n: 5 } },
  { id: 'a_night_20',    n: '暗夜行者',   desc: '安然度过 20 个夜晚',     cond: { t: 'stat', k: 'nights', n: 20 } },
  { id: 'a_fish_1',      n: '处女钓',     desc: '钓上第一条鱼',           cond: { t: 'stat', k: 'fish', n: 1 } },
  { id: 'a_fish_20',     n: '垂钓大师',   desc: '累计钓鱼 20 次',         cond: { t: 'stat', k: 'fish', n: 20 } },
  { id: 'a_koi',         n: '锦鲤附体',   desc: '钓到一条锦鲤',           cond: { t: 'stat', k: 'koi', n: 1 } },
  { id: 'a_cook_10',     n: '厨师',       desc: '烹饪 10 道料理',         cond: { t: 'stat', k: 'cook', n: 10 } },
  { id: 'a_cook_40',     n: '大厨',       desc: '烹饪 40 道料理',         cond: { t: 'stat', k: 'cook', n: 40 } },
  { id: 'a_farm_50',     n: '农夫',       desc: '收获 50 次作物',         cond: { t: 'stat', k: 'harvest', n: 50 } },
  { id: 'a_ranch_10',    n: '牧场大亨',   desc: '收养 10 只牲畜',         cond: { t: 'stat', k: 'house_animal', n: 10 } },
  { id: 'a_pop_4',       n: '小小村庄',   desc: '居民达到 4 人',          cond: { t: 'stat', k: 'pop', n: 4 } },
  { id: 'a_pop_8',       n: '兴旺小镇',   desc: '居民达到 8 人',          cond: { t: 'stat', k: 'pop', n: 8 } },
  { id: 'a_town_3',      n: '初具规模',   desc: '小镇升至 3 级',          cond: { t: 'stat', k: 'town', n: 3 } },
  { id: 'a_town_5',      n: '星火燎原',   desc: '小镇升至 5 级',          cond: { t: 'stat', k: 'town', n: 5 } },
  { id: 'a_coins_1000',  n: '小有积蓄',   desc: '持有 1000 金币',         cond: { t: 'stat', k: 'coins_total', n: 1000 } },
  { id: 'a_coins_5000',  n: '富甲一方',   desc: '持有 5000 金币',         cond: { t: 'stat', k: 'coins_total', n: 5000 } },
  { id: 'a_craft_30',    n: '能工巧匠',   desc: '累计制作 30 件物品',     cond: { t: 'stat', k: 'craft', n: 30 } },
  { id: 'a_boss_gob',    n: '弑王者·森',  desc: '击败哥布林王',           cond: { t: 'stat', k: 'boss_goblin_king', n: 1 } },
  { id: 'a_boss_ice',    n: '弑王者·霜',  desc: '击败冰雪女巫',           cond: { t: 'stat', k: 'boss_ice_queen', n: 1 } },
  { id: 'a_boss_flame',  n: '弑王者·焰',  desc: '击败炎魔领主',           cond: { t: 'stat', k: 'boss_flame_lord', n: 1 } },
  { id: 'a_boss_ancient',n: '传奇拓荒者', desc: '击败远古树人',           cond: { t: 'stat', k: 'boss_treant_ancient', n: 1 } },
  { id: 'a_lv10',        n: '身经百战',   desc: '角色达到 10 级',         cond: { t: 'stat', k: 'level', n: 10 } },
  { id: 'a_lv20',        n: '宗师',       desc: '角色达到 20 级',         cond: { t: 'stat', k: 'level', n: 20 } },
  { id: 'a_skill_12',    n: '全才',       desc: '技能累计点满 12 级',     cond: { t: 'stat', k: 'skill_total', n: 12 } },
  { id: 'a_deco_10',     n: '园艺之心',   desc: '建造 10 件装饰建筑',     cond: { t: 'stat', k: 'deco_build', n: 10 } },
  { id: 'a_days_30',     n: '三十而立',   desc: '存活 30 天',             cond: { t: 'stat', k: 'days', n: 30 } },
  { id: 'a_ruins',       n: '考古学家',   desc: '探访全部废墟',           cond: { t: 'stat', k: 'ruins', n: 4 } },
  { id: 'a_fish_all',    n: '图鉴·渔夫',  desc: '集齐 7 种鱼',            cond: { t: 'stat', k: 'fish_kinds', n: 7 } },
  { id: 'a_tower_5',     n: '铜墙铁壁',   desc: '建造 5 座防御塔',        cond: { t: 'stat', k: 'towers', n: 5 } },
];

// ---------------- 技能树（4系12技能） ----------------
export const SKILLS = {
  // 生存
  vitality:   { n: '强健体魄', cat: 'surv', max: 3, d: '生命上限 +15/级' },
  metabolism: { n: '高效代谢', cat: 'surv', max: 3, d: '饥饿与口渴消耗 -10%/级' },
  night_owl:  { n: '夜行者',   cat: 'surv', max: 2, d: '夜间视野与移速 +10%/级' },
  // 采集
  sharp_tools:{ n: '锋利工具', cat: 'gather', max: 3, d: '采集伤害 +20%/级（采得更快）' },
  rich_vein:  { n: '富矿之眼', cat: 'gather', max: 3, d: '挖矿双倍掉落 +8%/级' },
  green_thumb:{ n: '绿手指',   cat: 'gather', max: 3, d: '农业产量 +15%/级' },
  // 战斗
  power:      { n: '蛮力',     cat: 'combat', max: 3, d: '伤害 +8%/级' },
  swift:      { n: '迅捷',     cat: 'combat', max: 2, d: '攻击速度 +8%/级' },
  iron_skin:  { n: '铁骨',     cat: 'combat', max: 3, d: '受到伤害 -8%/级' },
  // 经营
  trader:     { n: '能言善辩', cat: 'town', max: 3, d: '出售价格 +6%/级' },
  builder:    { n: '心灵手巧', cat: 'town', max: 3, d: '建造材料消耗 -8%/级' },
  mayor:      { n: '领袖魅力', cat: 'town', max: 3, d: '居民工作效率 +10%/级' },
};

export const SKILL_CATS = { surv: '生存', gather: '采集', combat: '战斗', town: '经营' };

// ---------------- 居民 ----------------
export const JOBS = {
  lumberjack: { n: '伐木工', d: '自动砍伐小镇周边的树' },
  miner:      { n: '矿工',   d: '自动开采小镇周边的矿' },
  farmer:     { n: '农夫',   d: '照料农田：浇水、收获、补种' },
  cook:       { n: '厨师',   d: '将食材加工成料理存入仓库' },
  guard:      { n: '守卫',   d: '巡逻并攻击靠近小镇的怪物' },
  medic:      { n: '医师',   d: '缓慢治疗附近的你与居民' },
  none:       { n: '休息中', d: '什么都不干，快乐躺平' },
};

export const NAMES = {
  family: ['赵', '钱', '孙', '李', '周', '吴', '郑', '王', '林', '陈', '苏', '何'],
  given: ['小麦', '阿福', '秀兰', '铁柱', '翠花', '大山', '桃子', '石头', '春妮', '二狗', '阿慧', '栓子', '杏儿', '阿祥', '小满', '来福', '豆豆', '月儿'],
};

// ---------------- 随机事件 ----------------
export const RANDOM_EVENTS = [
  { id: 'e_herd',     n: '动物迁徙', w: 10, d: '一群动物路过小镇附近' },
  { id: 'e_honey',    n: '野蜂分巢', w: 8,  d: '有人在森林里发现了野蜂巢' },
  { id: 'e_meteor',   n: '流星坠落', w: 4,  d: '夜里一颗流星坠落在山谷中，散发出水晶的光芒' },
  { id: 'e_wanderer', n: '流浪者来访', w: 8, d: '一位流浪者在招贤台前驻足，可以花钱请他留下' },
  { id: 'e_festival', n: '丰收祭',   w: 6,  d: '换季之日，小镇其乐融融，全员幸福+"（自动触发于季节更替）' },
  { id: 'e_mimic',    n: '可疑宝箱', w: 5,  d: '地图上出现了一只神秘的宝箱……真的是宝箱吗？' },
  { id: 'e_goldrush', n: '淘金热',   w: 5,  d: '山那边发现了新金矿脉，快去地图上找金光标记！' },
  { id: 'e_greedy',   n: '宝藏地精', w: 6,  d: '一只背着钱袋的宝藏地精出现在小镇附近，抓住它！' },
];

// ---------------- 小镇等级 ----------------
// 需求：[人口, 建筑分]（建筑分：prod=3 farm=2 town=5 def=3 deco=1）
export const TOWN_LEVELS = [
  { lv: 1, need: [0, 0],     perk: '初始营地' },
  { lv: 2, need: [2, 10],    perk: '解锁铁砧/石仓/更多配方' },
  { lv: 3, need: [4, 25],    perk: '解锁石弩塔/驿站/喷泉/石屋' },
  { lv: 4, need: [6, 45],    perk: '解锁英雄雕像，夜袭强度上限提升' },
  { lv: 5, need: [8, 70],    perk: '传奇小镇！税收翻倍' },
];

// ---------------- 工具快捷查询 ----------------
export const STATIONS = {
  hand: '徒手', bench: '工作台', furnace: '熔炉', anvil: '铁砧', pot: '烹饪锅', saw: '锯木台',
};
