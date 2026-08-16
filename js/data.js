// ============================================================
// アルカの塔 - ゲームデータ
// 物語・キャラクター・モンスター・じゅもん・アイテム 全てオリジナル
// ============================================================
'use strict';

// ---------------- じゅもん ----------------
const SPELLS = {
  hinon:    { name: 'ヒノン',     mp: 2,  kind: 'atk',  pow: [12, 20],  target: 'enemy',   fx: 'spell', desc: 'ちいさな ほのおで こうげき' },
  hinonga:  { name: 'ヒノンガ',   mp: 6,  kind: 'atk',  pow: [38, 56],  target: 'enemy',   fx: 'spell', desc: 'ほのおの たまで こうげき' },
  hinongia: { name: 'ヒノンギア', mp: 14, kind: 'atk',  pow: [95, 130], target: 'enemies', fx: 'spell', desc: 'ごうかが てきぜんたいを つつむ' },
  birim:    { name: 'ビリム',     mp: 4,  kind: 'atk',  pow: [22, 34],  target: 'enemy',   fx: 'spell', desc: 'いなずまが てきを うつ' },
  birimga:  { name: 'ビリムガ',   mp: 9,  kind: 'atk',  pow: [60, 85],  target: 'enemies', fx: 'spell', desc: 'らいめいが てきぜんたいを うつ' },
  hiyari:   { name: 'ヒヤリ',     mp: 3,  kind: 'atk',  pow: [16, 26],  target: 'enemies', fx: 'spell', desc: 'こごえる かぜが てきを きる' },
  hiyariga: { name: 'ヒヤリガ',   mp: 10, kind: 'atk',  pow: [55, 78],  target: 'enemies', fx: 'spell', desc: 'ふぶきが てきぜんたいを おそう' },
  horon:    { name: 'ホロン',     mp: 3,  kind: 'heal', pow: [28, 38],  target: 'ally',    fx: 'heal', desc: 'HPを すこし かいふくする' },
  horonga:  { name: 'ホロンガ',   mp: 6,  kind: 'heal', pow: [75, 95],  target: 'ally',    fx: 'heal', desc: 'HPを おおきく かいふくする' },
  horongia: { name: 'ホロンギア', mp: 14, kind: 'heal', pow: [999, 999], target: 'ally',   fx: 'heal', desc: 'HPを かんぜんに かいふくする' },
  horonall: { name: 'ホロンオル', mp: 18, kind: 'heal', pow: [65, 85],  target: 'party',   fx: 'heal', desc: 'なかまぜんいんの HPを かいふく' },
  revim:    { name: 'リバイム',   mp: 12, kind: 'revive', target: 'ally', fx: 'heal', desc: 'しんだ なかまを いきかえらせる' },
  nemurin:  { name: 'ネムリン',   mp: 3,  kind: 'sleep', target: 'enemies', fx: 'spell', desc: 'てきを ねむらせる' },
  mamoru:   { name: 'マモール',   mp: 3,  kind: 'buff_def', target: 'party', fx: 'spell', desc: 'なかまの まもりを たかめる' },
  chikaram: { name: 'チカラム',   mp: 4,  kind: 'buff_atk', target: 'ally', fx: 'spell', desc: 'なかまの こうげきを たかめる' },
  toberu:   { name: 'トベール',   mp: 1,  kind: 'field_warp', target: 'field', fx: 'spell', desc: 'いったことのある やどば階へ とぶ' },
};

// ---------------- アイテム ----------------
const ITEMS = {
  yakusou:   { name: 'やくそう',       price: 8,    kind: 'heal', pow: [30, 40], desc: 'HPを 30ほど かいふくする' },
  iyashisou: { name: 'いやしそう',     price: 60,   kind: 'heal', pow: [85, 105], desc: 'HPを 90ほど かいふくする' },
  megumisou: { name: 'めぐみそう',     price: 300,  kind: 'heal', pow: [999, 999], desc: 'HPを かんぜんに かいふくする' },
  dokukeshi: { name: 'どくけしそう',   price: 10,   kind: 'cure_poison', desc: 'どくを なおす' },
  manadrop:  { name: 'マナのしずく',   price: 120,  kind: 'mp', pow: [30, 30], desc: 'MPを 30 かいふくする' },
  manaikaduti:{ name: 'マナのいかずち', price: 500, kind: 'mp', pow: [999, 999], desc: 'MPを かんぜんに かいふくする' },
  kaerihane: { name: 'かえりのはね',   price: 25,   kind: 'field_warp', desc: 'さいごに よった やどば階へ もどる' },
  hoshiniku: { name: 'ほしにく',       price: 80,   kind: 'bait', desc: 'まものが ぐっと なつきやすくなる(せんとうちゅうに つかう)' },
  chikaratane:{ name: 'ちからのたね',  price: 0,    kind: 'seed_str', desc: 'ちからが 2〜3 あがる' },
  mamoritane:{ name: 'まもりのたね',   price: 0,    kind: 'seed_vit', desc: 'みのまもりが 2〜3 あがる' },
  inochimi:  { name: 'いのちのきのみ', price: 0,    kind: 'seed_hp', desc: 'さいだいHPが 4〜6 あがる' },
  fushigimi: { name: 'ふしぎのきのみ', price: 0,    kind: 'seed_mp', desc: 'さいだいMPが 4〜6 あがる' },
  banishbell:{ name: 'まよけのすず',   price: 200,  kind: 'repel', desc: 'しばらく よわい まものが よってこない' },
};

// ---------------- そうび ----------------
const WEAPONS = {
  stick:    { name: 'ひのきのぼう',   atk: 2,  price: 10 },
  club:     { name: 'こんぼう',       atk: 5,  price: 45 },
  copper:   { name: 'どうのつるぎ',   atk: 9,  price: 120 },
  spear:    { name: 'てつのやり',     atk: 15, price: 420 },
  steel:    { name: 'はがねのつるぎ', atk: 23, price: 1100 },
  thunder:  { name: 'らいめいのけん', atk: 32, price: 3200 },
  dragfang: { name: 'りゅうのキバ',   atk: 42, price: 7800 },
  spirit:   { name: 'せいれいのつるぎ', atk: 53, price: 16000 },
  star:     { name: 'ほしのつるぎ',   atk: 65, price: 34000 },
  arca:     { name: 'アルカブレード', atk: 82, price: 0 },
};
const ARMORS = {
  cloth:    { name: 'ぬののふく',     def: 2,  price: 8 },
  leather:  { name: 'かわのよろい',   def: 6,  price: 60 },
  chain:    { name: 'くさりかたびら', def: 12, price: 280 },
  iron:     { name: 'てつのよろい',   def: 20, price: 850 },
  magic:    { name: 'まほうのよろい', def: 29, price: 2600 },
  dragon:   { name: 'りゅうのよろい', def: 39, price: 6800 },
  light:    { name: 'ひかりのローブ', def: 50, price: 15000 },
  star_a:   { name: 'ほしのよろい',   def: 62, price: 30000 },
};

// ---------------- なかまキャラ(人間) ----------------
const HUMANS = {
  hero: {
    name: 'ソラ', spr: 'hero', battle: 'hero',
    base: { hp: 26, mp: 5, str: 11, vit: 8, agi: 7 },
    grow: { hp: 6.6, mp: 3.1, str: 2.5, vit: 2.0, agi: 1.7 },
    spells: [[3, 'horon'], [5, 'hinon'], [7, 'toberu'], [10, 'chikaram'], [13, 'birim'], [16, 'horonga'], [20, 'revim'], [24, 'birimga'], [28, 'horongia'], [33, 'hinongia']],
    canEquip: true,
  },
  rino: {
    name: 'リノ', spr: 'rino', battle: 'rino',
    base: { hp: 20, mp: 12, str: 6, vit: 7, agi: 8 },
    grow: { hp: 5.2, mp: 4.6, str: 1.7, vit: 1.7, agi: 2.0 },
    spells: [[1, 'horon'], [6, 'nemurin'], [9, 'mamoru'], [12, 'horonga'], [15, 'revim'], [19, 'horonall'], [26, 'horongia'], [30, 'hiyariga']],
    canEquip: true,
  },
  gald: {
    name: 'ガルド', spr: 'gald', battle: 'gald',
    base: { hp: 55, mp: 0, str: 28, vit: 24, agi: 10 },
    grow: { hp: 8.4, mp: 0.7, str: 3.1, vit: 2.6, agi: 1.3 },
    spells: [],
    canEquip: true,
  },
  fio: {
    name: 'フィオ', spr: 'fio', battle: 'fio',
    base: { hp: 60, mp: 60, str: 20, vit: 20, agi: 30 },
    grow: { hp: 4.7, mp: 5.4, str: 1.5, vit: 1.5, agi: 2.3 },
    spells: [[1, 'hinon'], [1, 'hiyari'], [1, 'birim'], [1, 'hinonga'], [24, 'birimga'], [27, 'hiyariga'], [31, 'hinongia'], [34, 'nemurin']],
    canEquip: true,
  },
};

// ---------------- 転職 (しょくぎょう) ----------------
// ソラ(のぼりて)は転職不可。他の人間メンバーがLv12以上で転職できる。
// 転職するとレベル1に戻るが、じゅもんは全て引き継ぎ、能力の一部が「たくわえ」として残る。
const JOBS = {
  warrior:  { name: 'せんし',       desc: 'ちからじまんの まええい。じゅもんは にがて',
    base: { hp: 30, mp: 0,  str: 13, vit: 10, agi: 5 },
    grow: { hp: 8.2, mp: 0.5, str: 3.0, vit: 2.5, agi: 1.2 }, spells: [] },
  monk:     { name: 'ぶとうか',     desc: 'かいしんの いちげきが でやすい けんきゃく',
    base: { hp: 26, mp: 0,  str: 12, vit: 7,  agi: 10 },
    grow: { hp: 7.0, mp: 0.6, str: 2.8, vit: 1.7, agi: 2.6 }, spells: [] },
  priest:   { name: 'そうりょ',     desc: 'いやしの じゅもんを おぼえる',
    base: { hp: 22, mp: 14, str: 8,  vit: 8,  agi: 7 },
    grow: { hp: 5.4, mp: 4.8, str: 1.8, vit: 1.8, agi: 1.9 },
    spells: [[1, 'horon'], [6, 'mamoru'], [9, 'nemurin'], [12, 'horonga'], [16, 'revim'], [20, 'horonall'], [27, 'horongia']] },
  mage:     { name: 'まほうつかい', desc: 'こうげきじゅもんを おぼえる',
    base: { hp: 20, mp: 16, str: 7,  vit: 6,  agi: 8 },
    grow: { hp: 4.8, mp: 5.2, str: 1.5, vit: 1.4, agi: 2.2 },
    spells: [[1, 'hinon'], [4, 'hiyari'], [8, 'birim'], [12, 'hinonga'], [18, 'birimga'], [22, 'hiyariga'], [30, 'hinongia']] },
  thief:    { name: 'とうぞく',     desc: 'にげあしが はやく、おかねを おおく ひろう',
    base: { hp: 24, mp: 4,  str: 10, vit: 7,  agi: 13 },
    grow: { hp: 6.2, mp: 1.2, str: 2.2, vit: 1.6, agi: 3.0 }, spells: [] },
  merchant: { name: 'しょうにん',   desc: 'せんとうの おかねが ふえ、かいものが やすくなる',
    base: { hp: 25, mp: 4,  str: 9,  vit: 9,  agi: 7 },
    grow: { hp: 6.5, mp: 1.5, str: 2.2, vit: 2.1, agi: 1.6 }, spells: [] },
  sage:     { name: 'けんじゃ',     desc: 'こうげきも いやしも あやつる でんせつの みち', needFlag: 'boss50',
    base: { hp: 24, mp: 18, str: 9,  vit: 8,  agi: 9 },
    grow: { hp: 5.8, mp: 5.6, str: 2.0, vit: 1.8, agi: 2.1 },
    spells: [[1, 'hinon'], [1, 'horon'], [6, 'hiyari'], [10, 'birim'], [14, 'horonga'], [16, 'hinonga'], [20, 'revim'], [24, 'birimga'], [28, 'horonall'], [32, 'hinongia'], [34, 'horongia']] },
};
const JOB_ORDER = ['warrior', 'monk', 'priest', 'mage', 'thief', 'merchant', 'sage'];
const DEFAULT_JOB_NAMES = { hero: 'のぼりて', rino: 'ヒーラー', gald: 'せんし', fio: 'けんじゃ' };

// ---------------- モンスター ----------------
// tame: なかまになる確率 / ally: なかま時のせいちょう倍率
const MONSTERS = {
  // === 下層 1-9 ===
  slime:    { name: 'プルル',       spr: 'm_slime', hp: 8,  atk: 9,  def: 5,  agi: 5,  exp: 2,   gold: 4,   tame: 0.14,
              allySpells: [[8, 'horon'], [18, 'horonga']], acts: ['attack'] },
  bat:      { name: 'コウモリン',   spr: 'm_bat',   hp: 7,  atk: 10, def: 3,  agi: 10, exp: 3,   gold: 5,   tame: 0.12, acts: ['attack'] },
  rat:      { name: 'トゲネズミ',   spr: 'm_rat',   hp: 10, atk: 10, def: 6,  agi: 7,  exp: 4,   gold: 7,   tame: 0.1, acts: ['attack'] },
  // === 11-19 ===
  goblin:   { name: 'ゴブ',         spr: 'm_goblin', hp: 34, atk: 22, def: 12, agi: 10, exp: 10,  gold: 14,  tame: 0.09, acts: ['attack'] },
  aquan:    { name: 'アクアン',     spr: 'm_aquan',  hp: 28, atk: 19, def: 10, agi: 14, exp: 11,  gold: 12,  tame: 0.1,
              allySpells: [[10, 'hiyari'], [22, 'hiyariga']], acts: ['attack', ['spell', 'hiyari']] },
  slimered: { name: 'プルルレッド', spr: 'm_slime_red', hp: 30, atk: 24, def: 9, agi: 9, exp: 12, gold: 15, tame: 0.1,
              allySpells: [[9, 'hinon'], [20, 'hinonga']], acts: ['attack', ['spell', 'hinon']] },
  // === 21-29 ===
  mush:     { name: 'カサドン',     spr: 'm_mush',   hp: 48, atk: 32, def: 18, agi: 12, exp: 22,  gold: 24,  tame: 0.08, acts: ['attack', 'sleepattack'] },
  thief:    { name: 'ドロボーグ',   spr: 'm_thief',  hp: 42, atk: 36, def: 15, agi: 22, exp: 24,  gold: 45,  tame: 0.07, acts: ['attack', 'attack', 'steal'] },
  gobsold:  { name: 'ゴブへい',     spr: 'm_goblin_soldier', hp: 55, atk: 38, def: 24, agi: 14, exp: 26, gold: 30, tame: 0.08, acts: ['attack'] },
  rock3:    { name: 'イワコロ',     spr: 'm_rock',   hp: 70, atk: 34, def: 40, agi: 6,  exp: 30,  gold: 22,  tame: 0.07, acts: ['attack', 'defend'] },
  // === 31-39 ===
  ghost:    { name: 'ユラリ',       spr: 'm_ghost',  hp: 60, atk: 45, def: 22, agi: 24, exp: 42,  gold: 36,  tame: 0.08,
              allySpells: [[14, 'nemurin'], [24, 'birim']], acts: ['attack', ['spell', 'nemurin']] },
  shadowrat:{ name: 'カゲネズミ',   spr: 'm_rat_shadow', hp: 55, atk: 52, def: 20, agi: 34, exp: 40, gold: 42, tame: 0.07, acts: ['attack', 'attack'] },
  darkbat:  { name: 'ヤミモリン',   spr: 'm_bat_dark', hp: 50, atk: 48, def: 18, agi: 38, exp: 38, gold: 34, tame: 0.07, acts: ['attack', 'sleepattack'] },
  // === 41-49 ===
  plant:    { name: 'ツタウネ',     spr: 'm_plant',  hp: 85, atk: 58, def: 32, agi: 18, exp: 62,  gold: 50,  tame: 0.07, acts: ['attack', 'sleepattack', ['spell', 'horon']] },
  poisonmush:{ name: 'ドクカサドン', spr: 'm_mush_poison', hp: 78, atk: 62, def: 35, agi: 20, exp: 60, gold: 48, tame: 0.06, acts: ['attack', 'poisonattack'] },
  mist:     { name: 'キリモヤン',   spr: 'm_aquan_mist', hp: 72, atk: 55, def: 28, agi: 40, exp: 58, gold: 55, tame: 0.07,
              allySpells: [[18, 'hiyariga']], acts: ['attack', ['spell', 'hiyari']] },
  goldslime:{ name: 'プルルゴールド', spr: 'm_slime_gold', hp: 40, atk: 40, def: 60, agi: 30, exp: 30, gold: 250, tame: 0.05, acts: ['attack', 'flee'] },
  // === 51-59 ===
  machine:  { name: 'カラクリへい', spr: 'm_machine', hp: 110, atk: 75, def: 55, agi: 26, exp: 95,  gold: 80,  tame: 0.06, acts: ['attack', 'doubleattack'] },
  metalrock:{ name: 'メタルコロ',   spr: 'm_rock_metal', hp: 95, atk: 68, def: 80, agi: 12, exp: 100, gold: 66, tame: 0.05, acts: ['attack', 'defend'] },
  goblord:  { name: 'ゴブロード',   spr: 'm_goblin_lord', hp: 130, atk: 82, def: 48, agi: 30, exp: 105, gold: 110, tame: 0.05, acts: ['attack', ['spell', 'chikaram']] },
  // === 61-69 ===
  dragonchild:{ name: 'プチドラ',   spr: 'm_dragonchild', hp: 125, atk: 92, def: 60, agi: 42, exp: 150, gold: 100, tame: 0.09,
              allySpells: [[20, 'hinonga']], acts: ['attack', ['breath', 25]] },
  wraith:   { name: 'レイス',       spr: 'm_ghost_wraith', hp: 115, atk: 88, def: 52, agi: 55, exp: 140, gold: 95, tame: 0.05,
              allySpells: [[22, 'birimga']], acts: ['attack', ['spell', 'birim'], ['spell', 'nemurin']] },
  guardmachine:{ name: 'ガードマシン', spr: 'm_machine_guard', hp: 160, atk: 98, def: 78, agi: 30, exp: 165, gold: 130, tame: 0.05, acts: ['attack', 'doubleattack', 'defend'] },
  // === 71-79 ===
  dragon:   { name: 'ドラゴノイド', spr: 'm_dragon', hp: 200, atk: 118, def: 82, agi: 48, exp: 260, gold: 170, tame: 0.05, acts: ['attack', ['breath', 45]] },
  lavarock: { name: 'マグマコロ',   spr: 'm_rock_lava', hp: 180, atk: 108, def: 105, agi: 22, exp: 240, gold: 150, tame: 0.04, acts: ['attack', ['breath', 38]] },
  maneater: { name: 'マンイーター', spr: 'm_plant_eater', hp: 170, atk: 125, def: 70, agi: 52, exp: 250, gold: 160, tame: 0.04, acts: ['attack', 'poisonattack', 'sleepattack'] },
  // === 81-89 ===
  seraph:   { name: 'セラフ',       spr: 'm_angel',  hp: 210, atk: 130, def: 95, agi: 75, exp: 380, gold: 220, tame: 0.05,
              allySpells: [[25, 'horonga'], [30, 'horonall']], acts: ['attack', ['spell', 'horonga'], ['spell', 'birimga']] },
  noirdragon:{ name: 'ノワドラ',    spr: 'm_dragon_noir', hp: 260, atk: 148, def: 100, agi: 60, exp: 420, gold: 260, tame: 0.04, acts: ['attack', ['breath', 60]] },
  makinasold:{ name: 'マキナへい',  spr: 'm_machine_makina', hp: 240, atk: 140, def: 115, agi: 45, exp: 400, gold: 240, tame: 0.04, acts: ['attack', 'doubleattack'] },
  // === 91-99 ===
  shadowman:{ name: 'シャドウビト', spr: 'm_shadow', hp: 280, atk: 165, def: 110, agi: 88, exp: 600, gold: 300, tame: 0.04, acts: ['attack', 'doubleattack', ['spell', 'hinonga']] },
  darkseraph:{ name: 'ダークセラフ', spr: 'm_angel_dark', hp: 300, atk: 172, def: 125, agi: 80, exp: 650, gold: 340, tame: 0.03,
              acts: ['attack', ['spell', 'hiyariga'], ['spell', 'nemurin']] },
  deathwraith:{ name: 'デスレイス', spr: 'm_ghost_death', hp: 260, atk: 160, def: 105, agi: 95, exp: 580, gold: 280, tame: 0.03, acts: ['attack', ['spell', 'birimga'], 'poisonattack'] },
  metalslime:{ name: 'メタプル',    spr: 'm_slime_metal', hp: 12, atk: 60, def: 400, agi: 150, exp: 1500, gold: 30, tame: 0.02, acts: ['attack', 'flee', 'flee'] },

  // === ボス ===
  b_guardio: { name: 'もんばんガーディオ', spr: 'b_guardio', boss: true, hp: 150, atk: 26, def: 16, agi: 9, exp: 60, gold: 120,
               acts: ['attack', 'attack', 'strongattack'] },
  b_aquera:  { name: 'すいれいアクエラ', spr: 'b_aquera', boss: true, hp: 380, atk: 48, def: 28, agi: 20, exp: 220, gold: 400,
               acts: ['attack', ['spell', 'hiyari'], ['breath', 22]] },
  b_dronzo:  { name: 'とうぞくおうドロンゾ', spr: 'm_boss_dronzo', boss: true, big: true, hp: 520, atk: 68, def: 40, agi: 40, exp: 550, gold: 1200,
               acts: ['attack', 'doubleattack', 'strongattack'] },
  b_nocturna:{ name: 'よるのじょおうノクターナ', spr: 'b_nocturna', boss: true, hp: 750, atk: 88, def: 52, agi: 48, exp: 1100, gold: 1500,
               acts: ['attack', ['spell', 'nemurin'], ['spell', 'hiyariga'], 'strongattack'] },
  b_gardura: { name: 'しゅごじゅうガーデュラ', spr: 'm_boss_gardura', boss: true, big: true, hp: 1000, atk: 105, def: 68, agi: 42, exp: 2000, gold: 2200,
               acts: ['attack', 'poisonattack', 'strongattack', ['spell', 'horonga']] },
  b_makinas: { name: 'きかいしんマキナス', spr: 'b_makinas', boss: true, hp: 1350, atk: 125, def: 90, agi: 50, exp: 3500, gold: 3500,
               acts: ['attack', 'doubleattack', ['breath', 55], 'strongattack'] },
  b_dragnoa: { name: 'りゅうおうドラグノア', spr: 'm_boss_dragnoa', boss: true, big: true, hp: 1750, atk: 150, def: 105, agi: 60, exp: 6000, gold: 5000,
               acts: ['attack', ['breath', 75], 'strongattack', 'doubleattack'] },
  b_seraphos:{ name: 'だいてんしセラフォス', spr: 'm_boss_seraphos', boss: true, big: true, hp: 2300, atk: 170, def: 125, agi: 85, exp: 10000, gold: 7000,
               acts: ['attack', ['spell', 'birimga'], ['spell', 'horonga'], 'strongattack'] },
  b_shadowsora:{ name: 'シャドウソラ', spr: 'm_boss_shadowsora', boss: true, big: true, hp: 2500, atk: 180, def: 135, agi: 100, exp: 16000, gold: 9000,
               acts: ['attack', 'doubleattack', ['spell', 'hinongia'], 'strongattack'] },
  b_arcacore:{ name: 'アルカ=コア', spr: 'b_arcacore', boss: true, hp: 3200, atk: 195, def: 140, agi: 110, exp: 0, gold: 0,
               acts: ['attack', ['spell', 'hinongia'], ['spell', 'hiyariga'], 'strongattack', ['breath', 85], 'doubleattack'] },
};

// なかまモンスターのニックネーム候補
const MON_NICKNAMES = {
  slime: 'プルた', bat: 'モリー', rat: 'チクチク', goblin: 'ゴブすけ', aquan: 'しずく',
  slimered: 'ヒバナ', mush: 'カサじい', thief: 'シノビ', gobsold: 'ゴブへー', rock3: 'ゴロン',
  ghost: 'ユラちゃん', shadowrat: 'カゲミ', darkbat: 'ヨルモ', plant: 'ツタ丸', poisonmush: 'ドクどん',
  mist: 'モヤン', goldslime: 'コガネ', machine: 'カラッポ', metalrock: 'ガチン', goblord: 'ゴブキン',
  dragonchild: 'リンド', wraith: 'レイちゃん', guardmachine: 'ガーディ', dragon: 'ドラゴ',
  lavarock: 'マグマン', maneater: 'パックン', seraph: 'セララ', noirdragon: 'ノワール',
  makinasold: 'マッキー', shadowman: 'シャドー', darkseraph: 'クロハ', deathwraith: 'デスレ', metalslime: 'メタン',
};

// ---------------- エンカウントテーブル (tier 1-10) ----------------
const ENCOUNTERS = [
  [], // tier0(村) なし
  [['slime', 40], ['bat', 30], ['rat', 30]],
  [['goblin', 30], ['aquan', 30], ['slimered', 25], ['rat', 15]],
  [['mush', 28], ['thief', 25], ['gobsold', 27], ['rock3', 20]],
  [['ghost', 32], ['shadowrat', 28], ['darkbat', 25], ['mush', 15]],
  [['plant', 28], ['poisonmush', 26], ['mist', 26], ['goldslime', 8], ['ghost', 12]],
  [['machine', 32], ['metalrock', 28], ['goblord', 25], ['mist', 15]],
  [['dragonchild', 30], ['wraith', 28], ['guardmachine', 25], ['machine', 17]],
  [['dragon', 30], ['lavarock', 27], ['maneater', 27], ['guardmachine', 16]],
  [['seraph', 30], ['noirdragon', 26], ['makinasold', 28], ['dragon', 16]],
  [['shadowman', 27], ['darkseraph', 24], ['deathwraith', 26], ['metalslime', 6], ['seraph', 17]],
];

// ---------------- 階層テーマ名 ----------------
const TIER_NAMES = [
  '', 'いしずえの階層', 'みずわの階層', 'すないろの階層', 'とこよの階層', 'そらにわの階層',
  'はぐるまの階層', 'りゅうがんの階層', 'うんぜんの階層', 'ほしかげの階層', 'てんがいの階層',
];

// ---------------- ショップ (やどば階ごと) ----------------
const SHOPS = {
  1:  { items: ['yakusou', 'dokukeshi', 'kaerihane'], weapons: ['stick', 'club'], armors: ['cloth', 'leather'], inn: 6 },
  11: { items: ['yakusou', 'dokukeshi', 'kaerihane', 'hoshiniku'], weapons: ['club', 'copper'], armors: ['leather', 'chain'], inn: 15 },
  21: { items: ['yakusou', 'dokukeshi', 'kaerihane', 'hoshiniku', 'manadrop'], weapons: ['copper', 'spear'], armors: ['chain'], inn: 30 },
  31: { items: ['yakusou', 'iyashisou', 'dokukeshi', 'kaerihane', 'hoshiniku', 'manadrop'], weapons: ['spear', 'steel'], armors: ['chain', 'iron'], inn: 60 },
  41: { items: ['iyashisou', 'dokukeshi', 'kaerihane', 'hoshiniku', 'manadrop', 'banishbell'], weapons: ['steel'], armors: ['iron'], inn: 100 },
  51: { items: ['iyashisou', 'dokukeshi', 'kaerihane', 'hoshiniku', 'manadrop', 'banishbell'], weapons: ['steel', 'thunder'], armors: ['iron', 'magic'], inn: 150 },
  61: { items: ['iyashisou', 'megumisou', 'dokukeshi', 'kaerihane', 'hoshiniku', 'manadrop'], weapons: ['thunder', 'dragfang'], armors: ['magic', 'dragon'], inn: 220 },
  71: { items: ['iyashisou', 'megumisou', 'dokukeshi', 'kaerihane', 'hoshiniku', 'manaikaduti'], weapons: ['dragfang'], armors: ['dragon'], inn: 300 },
  81: { items: ['iyashisou', 'megumisou', 'dokukeshi', 'kaerihane', 'hoshiniku', 'manaikaduti'], weapons: ['dragfang', 'spirit'], armors: ['dragon', 'light'], inn: 400 },
  91: { items: ['megumisou', 'dokukeshi', 'kaerihane', 'hoshiniku', 'manaikaduti'], weapons: ['spirit', 'star'], armors: ['light', 'star_a'], inn: 500 },
};

// ---------------- 宝箱テーブル (tierごと) ----------------
const CHEST_LOOT = [
  [],
  ['yakusou', 'yakusou', 'gold:20', 'dokukeshi', 'chikaratane'],
  ['yakusou', 'gold:60', 'hoshiniku', 'mamoritane', 'manadrop'],
  ['gold:150', 'iyashisou', 'inochimi', 'yakusou', 'hoshiniku'],
  ['gold:300', 'iyashisou', 'fushigimi', 'manadrop', 'chikaratane'],
  ['gold:500', 'iyashisou', 'inochimi', 'banishbell', 'mamoritane'],
  ['gold:800', 'megumisou', 'manadrop', 'chikaratane', 'inochimi'],
  ['gold:1200', 'megumisou', 'manaikaduti', 'fushigimi', 'iyashisou'],
  ['gold:1800', 'megumisou', 'inochimi', 'chikaratane', 'manaikaduti'],
  ['gold:2500', 'megumisou', 'manaikaduti', 'inochimi', 'fushigimi'],
  ['gold:4000', 'megumisou', 'manaikaduti', 'inochimi', 'chikaratane'],
];

// ============================================================
// ストーリーテキスト
// ============================================================

const OPENING_TEXT = [
  'とおい とおい むかし――',
  'せかいは 「ほしばみの きり」に のまれ',
  'ひとびとは そらへ のびる いっぽんの とうに にげこんだ。',
  '',
  'とうの な は 「アルカ」。',
  'だれが なんの ために たてたのか もう だれも しらない。',
  '',
  'とうの なかで うまれ とうの なかで しんでいく。',
  'それが ひとの いきかたに なって せんねん。',
  '',
  'ただ いいつたえだけが のこっている。',
  '――ももとせに ひとり むねに とうの もんしょうが ともる。',
  'そのものは 「のぼりて」。',
  'ひゃくの かいを のぼり せかいの しんじつを しる さだめ――',
  '',
  '100ねんまえ ひとりの しょうじょが のぼった。',
  'そして…… かえらなかった。',
  '',
  'きょう ねもとの むらの わかもの ソラの むねに',
  'もんしょうが ともった。',
];

// ---------------- セツナの手記 (収集要素・全10篇) ----------------
const SETSUNA_JOURNALS = {
  3: ['ふるい てがきが おちている。',
    '『わたしは セツナ。きょう とうを のぼりはじめた。』',
    '『いもうとの ミオが 「ほしばみびょう」に かかった。』',
    '『てんがいの まには ねがいの かなう ばしょが あるという。だから わたしは のぼる。』'],
  15: ['しめった てがきが はりついている。',
    '『みずわの かいそうに ついた。アクエラという せいれいに あった。とても やさしい。』',
    '『「あなたの いもうとに」と せいれいの みずを くれた。』',
    '『かえりのはねに たくして むらへ おくった。ミオ、まっていて。』'],
  25: ['すなに うもれた てがきを みつけた。',
    '『おかねを ぬすまれた。とうぞくにも くらしが あるのだと なかまは いう。』',
    '『ゆるせるほど わたしは おとなじゃ ない。』',
    '『でも この とうでは、だれもが なにかに すがって いきている。』'],
  35: ['やぶれかけの てがきが ある。',
    '『ねむりの かいそう。ゆめの なかで ミオに あえた。』',
    '『めざめたく なかった。』',
    '『ここで ねむりつづける ひとの きもちが わかって、こわかった。』'],
  45: ['はなに かこまれた てがきが ある。',
    '『そらにわで いしぶみを よんだ。この とうは はこぶね。』',
    '『わたしたちは ずっと まもられて いたのだ。』',
    '『……だれに? そのひとは いま どうしている?』'],
  55: ['あぶらの しみた てがきが ある。',
    '『はぐるまの おとが こもりうたに きこえる。この とうは いきている。』',
    '『せんねんも やすまず うごきつづけて いる。』',
    '『だれか この とうを ねぎらった ことは あるのだろうか。』'],
  65: ['りゅうの すの ちかくに てがきが ある。',
    '『りゅうの こに なつかれた。プチドラと なづけた。』',
    '『わかれの あさ、りゅうの ちょうろうが いった。』',
    '『「つよさとは まもりたい ものの かずだ」と。いい ことばだ。』'],
  75: ['くもの うえに てがきが ある。',
    '『くもを ぬけた。したの せかいが ちいさい。』',
    '『ミオ、みているか。おねえちゃんは いま そらの うえに いるよ。』'],
  85: ['ひかりに つつまれた てがきが ある。',
    '『てんじんは「えらばれしものしか うえへ いけない」という。』',
    '『うそだ。しるしを もらっても、のぼるか どうかは じぶんで きめる。』',
    '『えらぶのは いつだって じぶんだ。』'],
  95: ['ていねいに たたまれた さいごの てがきが ある。',
    '『あした てんがいの まへ いく。もし かえらなくても かなしまないで。』',
    '『これを よむ つぎの のぼりてへ。おねがいが ある。』',
    '『アルカを ころさないで あげて。あれは わるものじゃ ない。』',
    '『まもりすぎて こわれた、ただの さびしがりやだ。』',
    '『どうか こころで かって。 ――セツナ』'],
};

// ---------------- 最終決戦後 ----------------
const FINALE_AFTER = [
  'アルカ=コアの ひかりが しずかに よわまっていく。',
  'アルカ『……マケタ。イヤ……スクワレタノ カモシレヌ。』',
  'アルカ『キケ、ノボリテヨ。100ネンマエ、セツナハ サイゴニ コウ ネガッタ。』',
  'アルカ『「つぎの のぼりてを えらんで。こんどこそ、とびらを」……ト。』',
  'アルカ『ダカラ ワタシハ オマエヲ エランダ。』',
  'アルカ『ミオノ チスジ…… セツナノ ネガイノ ツヅキヲ イキル モノヨ。』',
  'ソラ「ぼくが…… セツナの いもうとの……。」',
  'アルカ『ダガ ワスレルナ。エランダノハ ワタシデモ、ノボッタノハ オマエ ジシンダ。』',
];

const FINALE_SETSUNA = [
  'ソラは セツナの てがきを アルカに さしだした。',
  '『アルカを ころさないで あげて。あれは わるものじゃ ない。』',
  '『まもりすぎて こわれた、ただの さびしがりやだ。』',
  'アルカ『……セツナ……。ソウカ……ズット ミテイテ クレタノカ……。』',
  'ひかりの コアから あたたかい しずくが こぼれおちた。',
];

// ---------------- エンディング (分岐) ----------------
const ENDING_OPEN = [
  'とうの いただきが ゆっくりと ひらいていく。',
  'ひとびとが みあげる さきに――',
  'あおい そらが あった。',
  '',
  'ほしばみの きりは とうに はれていた。',
  'せんねんの あいだ アルカは めいれいを まもり',
  'ただ ひとびとを まもりつづけて いたのだ。',
  '',
  'ひとびとは すこしずつ とうを おり',
  'はじめて だいちを あるいた。',
  'つちの においに ないた ろうじんが いた。',
  'ちへいせんに むかって かけだす こどもが いた。',
  '',
  'それでも ゆうぐれには みな とうを ふりかえる。',
  'とうは これからも そこに たっている。',
  'ふるさとの ように。はこぶねの ように。',
  '',
  'そして いちばん たかい まどには',
  'こんやも ちいさな ひかりが ともっている。',
  'もう ひとりぼっちでは ない ひかりが。',
  '',
  '― おわり ―',
  '',
  'ARCA TOWER',
  'ひゃくそうの ものがたり',
];

const ENDING_STAY = [
  'ソラ「……いそぐ ことは ない。」',
  'ソラ「こころの じゅんびが できたものから、そとへ いこう。」',
  'アルカ『……ソレガ オマエノ コタエカ。』',
  '',
  'とびらは 「いつでも ひらける とびら」に なった。',
  'ソラは あんないにんに なり',
  'そとの せかいを みたいものを つれて',
  'なんども とうと だいちを いききした。',
  '',
  'のこるものが いて、いくものが いて、',
  'かえってくるものが いた。',
  'とうは ろうやでは なくなり、みなとに なった。',
  '',
  'アルカは まいにち だれかと はなしている。',
  'せんねんぶんの はなしを とりもどすように。',
  '',
  '― おわり ―',
  '',
  'ARCA TOWER',
  'ひゃくそうの ものがたり',
];

const EPILOGUE_SETSUNA = [
  '',
  'てんがいの まの かたすみには',
  'ちいさな はかが ある。',
  '『セツナ ここに ねむる。そらに いちばん ちかい ばしょで。』',
  '',
  'アルカは まいあさ いちばんの ひかりを',
  'そのはかに そそぐという。',
  'ミオの ちすじの わかものが とびらを ひらいたことを',
  'かのじょは きっと しっている。',
];

// NPC会話 (やどば階ごと)
const TOWN_DATA = {
  1: {
    name: 'ねもとの むら',
    npcs: [
      { spr: 'elder', x: 8, y: 4, lines: ['わしは むらおさ じゃ。むねの もんしょうが ともるのは 100ねんぶり……。', 'のぼりては とうに えらばれしもの。10かいごとの まもりてを こえ、てんがいの まを めざす さだめじゃ。', '100ねんまえの のぼりて セツナは…… かえって こなんだ。', 'ソラよ。どうか むりだけは するでないぞ。'] },
      { spr: 'woman', x: 5, y: 8, lines: ['ごくまれに、たおした まものが おきあがって なかまに なりたがる ことが あるの。', 'まものと こころが かようのは とても めずらしいこと。であえたら たいせつに してあげてね。', 'せんとうに つれていける まものは 2ひきまで。「ほしにく」を つかうと なつきやすく なるらしいわ。'] },
      { spr: 'man', x: 12, y: 9, lines: ['セツナさまの いもうとの ミオさまは、この むらで ながいきした そうだ。', 'ふしぎな みずが とどいて、びょうきが なおったんだと。', 'その みず、だれが おくったんだろうな。'] },
      { spr: 'child', x: 8, y: 12, lines: ['ソラにいちゃん がんばって!', 'ぼく、にいちゃんの もんしょう みたよ! むねの ところ、ひかってた!'] },
    ],
  },
  11: {
    name: 'やどば イチノセ',
    npcs: [
      { spr: 'man', x: 5, y: 8, lines: ['ここは やどば「イチノセ」。のぼりての ための やすみばさ。', 'この うえは みずの かいそうだ。ぬれても なかないでくれよ。'] },
      { spr: 'woman', x: 12, y: 9, lines: ['20かいの すいれいアクエラさまが あばれているの。', 'むかしは のぼりてに みずを わけてくれる ほど やさしかったのに……。'] },
      { spr: 'guard', x: 8, y: 12, lines: ['セツナという のぼりての はなし、ばあちゃんに きいたことが ある。', 'この やどばにも とまって、とちゅうの かいそうに てがきを のこして いったそうだ。', 'とうの どこかに まだ のこって いるかもな。'] },
    ],
  },
  21: {
    name: 'やどば ミナモ',
    npcs: [
      { spr: 'woman', x: 5, y: 8, lines: ['アクエラさまを しずめてくれて ありがとう。', 'あのかたの みずは どんな びょうも いやすと いわれるの。', 'むかし、ふもとの むすめを すくったことも あるんですって。'] },
      { spr: 'merchant', x: 12, y: 9, lines: ['うえは すないろの かいそう。しょうにんの まち バザーラが あるよ。', 'とうぞくおう ドロンゾに きをつけな。', 'やつ…… もとは のぼりてだった って うわさだぜ。'] },
      { spr: 'man', x: 8, y: 12, lines: ['ポンプが なおって みずが きれいに なった。ありがとうよ。'] },
    ],
  },
  31: {
    name: 'しょうにんのまち バザーラ',
    npcs: [
      { spr: 'merchant', x: 5, y: 8, lines: ['いらっしゃい! ドロンゾが きえて しょうばい はんじょう!', 'あいつも むかしは まっすぐな のぼりてだった らしいがねえ。', 'この とうは、ひとの よわさを うつす かがみなのさ。'] },
      { spr: 'gald', x: 12, y: 9, lines: ['おれは ガルド。もと おうきゅうの けいびへいだ。', 'ドロンゾとの たたかい みせてもらった。いい うでだ。', 'おまえ 100かいを めざすのか……おもしろい。おれも つれていけ!'], event: 'join_gald' },
      { spr: 'woman', x: 8, y: 12, lines: ['うえは とこよの かいそう。よるが あけないの。', 'ねむったまま めざめない ひとが いるって…… こわいわね。'] },
      { spr: 'celest', x: 15, y: 8, event: 'jobchange', lines: null },
    ],
  },
  41: {
    name: 'やどば ヨナカ',
    npcs: [
      { spr: 'man', x: 5, y: 8, lines: ['よるが あけた……! ノクターナさまは もともと にんげん だったんだな。', 'のぼりてだった かのじょが、100ねんも みんなの あくむを ひきうけて いたなんて。'] },
      { spr: 'woman', x: 12, y: 9, lines: ['うえは そらにわの かいそう。はなが いっぱい さいているの。', 'にわの おくに ふるい いしぶみが あるそうよ。', 'とうの ひみつが かかれている とか いないとか。'] },
      { spr: 'child', x: 8, y: 12, lines: ['こわいゆめ、もう みないんだ!', 'よるの おねえちゃんに ありがとうって いっといて!'] },
    ],
  },
  51: {
    name: 'そらにわのさと ハナレ',
    npcs: [
      { spr: 'fio', x: 5, y: 8, lines: ['わたしは フィオ。とうの れきしを しらべる けんきゅうしゃ。', 'アルカ…… ふるいことばで「はこぶね」。そして いしぶみには 「めいれい」が きざまれていた。', 'とびらを とざしたのは アルカの いしか、それとも……。しんじつを この めで たしかめたい。つれていって!'], event: 'join_fio' },
      { spr: 'woman', x: 12, y: 9, lines: ['いしぶみ、よんだ?', '『たみの こころが いえる ひまで とびらを とざせ』……。', 'とびらって、なんの ことかしら。'] },
      { spr: 'man', x: 8, y: 12, lines: ['うえは はぐるまの かいそう。とうの しんぞうが うごいている。', 'せんねんも うごきっぱなしで、だいじょうぶなのかね。'] },
    ],
  },
  61: {
    name: 'はぐるまのまち ネジロ',
    npcs: [
      { spr: 'man', x: 5, y: 8, lines: ['マキナスさまが とまった……。', 'せんねん うごきつづけて、さいごに「ありがとう」が きけたなら、ほんもうだったろうよ。'] },
      { spr: 'merchant', x: 12, y: 9, lines: ['うえは りゅうがんの かいそう。りゅうぞくの すみかだ。', 'やつらは「つくりしもの」が のこした ばんけん らしい。', 'よわいものは とおさない…… それが やくめなんだと。'] },
      { spr: 'guard', x: 8, y: 12, lines: ['マキナスさまの けいこく、きいたか? とうの じゅみょうが のこり わずかだと……。', 'とびらは いずれ ひらかれねば ならない。だれかが それを うえに つたえないと。'] },
    ],
  },
  71: {
    name: 'りゅうのさと タツミ',
    npcs: [
      { spr: 'man', x: 5, y: 8, lines: ['ドラグノアさまが にんげんを みとめるとは な。', '「やくめは おわった」と アルカさまに つたえるのだろう?', 'たのんだぞ、のぼりてどの。'] },
      { spr: 'woman', x: 12, y: 9, lines: ['うえは うんぜんの かいそう。くもの うえよ。', '80かいには てんじんの みやこ ソラリスが あるわ。', 'てんじんは「えらばれしもの」しか とおさない そうだけど……。'] },
      { spr: 'child', x: 8, y: 12, lines: ['むかし セツナって ひとも りゅうの こと なかよしだったんだって!', 'ちょうろうが いってた! りゅうは わすれない って!'] },
    ],
  },
  81: {
    name: 'てんじんのみやこ ソラリス',
    npcs: [
      { spr: 'celest', x: 5, y: 8, lines: ['もんしょうを ともした もの…… 100ねんぶりの のぼりて……。', 'われらは まちがって いたのかも しれません。', 'どうか あのかたを…… アルカさまを たすけて さしあげて。'] },
      { spr: 'celest', x: 12, y: 9, lines: ['アルカさまは いちばん うえで ずっと おひとりです。', 'われら てんじんですら、おそばに よることは ゆるされません。', 'せんねんの あいだ、たった ひとりだけ…… となりに いた ひとが いたと ききます。'] },
      { spr: 'woman', x: 8, y: 12, lines: ['うえは ほしかげの かいそう。きおくの ろうかと よばれるわ。', 'とうが あなたの こころを うつしだすの。', 'じぶんの よわさと むきあう かくごを して いきなさい。'] },
    ],
  },
  91: {
    name: 'さいごのやどば ホシズエ',
    npcs: [
      { spr: 'elder', x: 5, y: 8, lines: ['よくぞ ここまで……。ここが さいごの やどばじゃ。', 'このうえは てんがいの かいそう。100かいには アルカ=コアが おる。', 'たたかいの まえに、そなえを わすれるな。'] },
      { spr: 'celest', x: 12, y: 9, lines: ['シャドウソラに かったのですね。あれは とうが うつす あなたじしん。', 'じぶんの よわさに かてたなら、こころは もう ととのって います。', 'てんがいで まつものは、てきでは ない。それを わすれないで。'] },
      { spr: 'woman', x: 8, y: 12, lines: ['てんがいの まの かたすみに、ちいさな はかが あるそうよ。', 'だれの はかかは…… たどりついた ひとだけが しるの。', 'どうか ぶじに かえってきてね。'] },
    ],
  },
};

// ボスイベント (ボス階 floor -> data)
const BOSS_EVENTS = {
  10: {
    boss: 'b_guardio', flag: 'boss10',
    before: ['いしの きょじんが みちを ふさいでいる。',
      'ガーディオ「ワレハ モンバン。チカラナキモノ トオルベカラズ。」',
      '「……カツテ ワレハ ナサケヲ カケ、チカラナキモノヲ トオシタ。」',
      '「ソノモノハ 20カイデ シンダ。」',
      '「ユエニ ワレハ タメス。イノチヲ マモルタメニ。」'],
    after: ['ガーディオ「……ミゴトナリ。シンパイハ イラヌようだ。」',
      '「ノボリテヨ。100ネンマエノ ショウジョ イライノ ゴウカクダ。」',
      'いしの めが すこしだけ やさしく みえた。',
      'ガーディオは「もんばんの しるし」を さしだした。',
      '※かいだんが あらわれた!'],
    reward: { type: 'a', id: 'chain', text: 'くさりかたびら' },
  },
  20: {
    boss: 'b_aquera', flag: 'boss20', music: 'sad',
    before: ['みずの せいれいが くるしそうに うずまいている。',
      'アクエラ「……みずが…… にごる…… けがれる……」',
      '「だれだ…… わたしの みずを けがすのは……!」',
      'アクエラは われを わすれて おそいかかってきた!'],
    after: ['アクエラ「……ああ そうか。ポンプが こわれて いたのか。」',
      '「とりみだして すまなかった。」',
      'アクエラは ちからを つかい ポンプを なおした。',
      'アクエラ「……その もんしょう。100ねんまえの あのこと おなじ ひかり。」',
      '「セツナ…… いもうとの びょうきは なおった だろうか……。」',
      'アクエラから「マナのしずく」を 3つ うけとった。',
      '※かいだんが あらわれた!'],
    reward: { type: 'item', id: 'manadrop', count: 3, text: 'マナのしずく 3こ' },
  },
  30: {
    boss: 'b_dronzo', flag: 'boss30',
    before: ['とうぞくおう ドロンゾ「へっへっへ……みぐるみ おいていきな!」',
      '「オレさまも むかしは のぼりてサマって よばれた もんさ。」',
      '「だが 30かいで きづいた。うえを めざすより うばうほうが ラクだとな!」',
      '「この とうは ひとの よわさを うつす かがみ。オレは かがみに まけただけよ!」'],
    after: ['ドロンゾ「ま まいった! こうさんだ!」',
      '「……ちっ。おまえの め、むかしの オレに そっくりだぜ。」',
      '「ぬすんだ カネは かえす。だから いけよ。」',
      '「オレが すてちまった 『さき』ってやつを、みてきて くれ。」',
      'ドロンゾは かつての「あがりての やり」を たくした。',
      '※かいだんが あらわれた!'],
    reward: { type: 'w', id: 'spear', text: 'てつのやり' },
  },
  40: {
    boss: 'b_nocturna', flag: 'boss40', music: 'sad',
    before: ['よるの じょおう ノクターナ「……ねむりなさい。」',
      '「わたしも かつて のぼりてだった。でも げんじつは つらすぎた。」',
      '「だから ここで みんなの あくむを ひきうけて、ねむらせて あげているの。」',
      '「ゆめの なかなら だれも きずつかない。あなたも とわの ゆめへ……。」'],
    after: ['ノクターナ「……そう。あなたは ゆめより げんじつを えらぶのね。」',
      '「わたしが ひきうけた 100ねんぶんの あくむが…… とけていく……。」',
      '「ありがとう。100ねんぶりに あさが みたい。」',
      'あさひが とこよの かいそうに さしこんだ。',
      'ノクターナの ゆめが「まほうのよろい」に かたちを かえた。',
      '※かいだんが あらわれた!'],
    reward: { type: 'a', id: 'magic', text: 'まほうのよろい' },
  },
  50: {
    boss: 'b_gardura', flag: 'boss50', music: 'mystery',
    before: ['そらにわの おくで きんいろの けものが めを さました。',
      'ガーデュラ「グルルル……。」',
      'にわの ばんけんは せんねんの めいれいに したがい、あらすものを ゆるさない!'],
    after: ['ガーデュラは たたかいを やめ、しずかに ふせた。',
      'そして みちを あけるように どこかへ さっていった。',
      'にわの おくに ふるい いしぶみが あった。',
      '『はこぶねの まもりびと アルカへ。』',
      '『たみの こころが いえる ひまで、とびらを とざしたまえ。』',
      '『――つくりしもの』',
      'フィオ?「とびらを とざしたのは アルカの いしじゃない。めいれい だったのね……。」',
      '※かいだんが あらわれた!'],
  },
  60: {
    boss: 'b_makinas', flag: 'boss60',
    before: ['きょだいな きかいが きどうした。',
      'マキナス『ケイコク。ケイコク。トウノ チュウスウヘノ セッキンヲ カクニン。』',
      '『ワタシハ トウノ セイビシ。センネン ムキュウ カドウチュウ。』',
      '『キケンブツハ ハイジョ シマス。』'],
    after: ['マキナス『キノウ テイシ……。』',
      '『……サイゴニ ケイコクヲ ノコス。トウノ ジュミョウハ ノコリ ワズカ。』',
      '『トビラハ イズレ ヒラカレネバ ナラヌ。ヒトガ ソトデ イキルタメニ。』',
      '『ダレカガ ソレヲ アルカニ ツタエネバ ナラヌ……。』',
      '『……ナガイアイダ ゴクロウトハ イワレナカッタ。アリガトウ。ソレガ キキタカッタ。』',
      'マキナスは しずかに ねむりに ついた。',
      '※かいだんが あらわれた!'],
  },
  70: {
    boss: 'b_dragnoa', flag: 'boss70',
    before: ['りゅうおう ドラグノア「にんげんよ。」',
      '「われら りゅうぞくは 『つくりしもの』が のこした さいごの ばん。」',
      '「よわきものを うえへ やらぬ。それが せんねんの つとめ。」',
      '「わが ほのおに たえて みせよ!」'],
    after: ['ドラグノア「……みごとだ。その つよさ、その こころ。」',
      '「にんげんの こよ。アルカに つたえよ。『やくめは もう おわった』と。」',
      '「われらも ながく つとめすぎた。だれもが やすまねば ならぬ ときが きたのだ。」',
      '※かいだんが あらわれた!'],
  },
  80: {
    boss: 'b_seraphos', flag: 'boss80',
    before: ['だいてんし セラフォス「したかいの たみが なぜ ここへ。」',
      '「せんていなき ものが のぼれば、アルカさまの こころが みだれる!」',
      '「あのかたを これいじょう くるしませては ならぬ!」',
      '「さばきの ひかりを うけよ!」'],
    after: ['セラフォス「……ばかな。その むねの もんしょう……。」',
      '「では あなたが…… 100ねんぶりの のぼりて……。」',
      '「われらは アルカさまを まもって いる つもりで、とじこめて いたのかもしれぬ。」',
      '「ゆけ。そして どうか…… あのかたを こどくから すくって さしあげて くれ。」',
      '※かいだんが あらわれた!'],
  },
  90: {
    boss: 'b_shadowsora', flag: 'boss90', music: 'mystery',
    before: ['きおくの ろうかの おくに―― もうひとりの ソラが たっていた。',
      'シャドウソラ「……こわいんだろう?」',
      '「しんじつを しるのが。じぶんが 『えらばれた りゆう』を しるのが。」',
      '「もんしょうは ぐうぜん ともったんじゃ ない。おまえは えらばれるべくして えらばれた。」',
      '「それを しって、それでも すすめるのか? おれは おまえの よわさだ。こえてみろ!」'],
    after: ['シャドウソラ「……そうか。おまえは もう にげないんだな。」',
      '「いっておく。てんがいで まつものは、てきじゃ ない。」',
      '「せかいで いちばん ながく、ひとりぼっちだった ものだ。」',
      'かげは ほほえむと ひかりに とけて きえた。',
      '※かいだんが あらわれた!'],
  },
  100: {
    boss: 'b_arcacore', flag: 'boss100', music: 'mystery',
    before: ['てんがいの ま。ほしぞらの したに それは いた。',
      'アルカ=コア『ヨウコソ。ヒャクノ カイヲ コエシモノ。』',
      '『ワタシハ アルカ。ツクリシモノノ メイニヨリ トビラヲ マモルモノ。』',
      '『メイレイ:「たみの こころが いえる ひまで とびらを とざせ」。』',
      '『キリハ トウニ ハレタ。ダガ ココロノ キズガ イエタカ、ワタシニハ ワカラナイ。』',
      '『100ネンマエ、ヒトリノ ショウジョガ ココニ タッタ。』',
      '『カノジョハ トビラヲ ヒラケト イワナカッタ。カワリニ…… トナリニ イテクレタ。』',
      '『カノジョガ サッタアト、ワタシハ マタ ヒトリニ ナッタ。』',
      '『……モウ ダレモ ウシナイタクナイ。ダカラ タメス。』',
      'ソラ「ためさなくていい。ぼくたちは じぶんで えらぶ!」',
      'アルカ=コア『ナラバ シメセ。ソノ ココロガ トビラヲ ヒラクニ タルモノカ!』'],
    after: [], // finale()で処理
  },
};

// 道中の小イベント (手記のない階に配置)
const FLAVOR_EVENTS = {
  2:  ['かべの くぼみに ちいさな ひかりが ともっている。', 'ガーディオの めと おなじ いろだ。こちらを みまもっているようだ。'],
  7:  ['かべに ふるい もじが きざまれている。', '『のぼるものよ。やすむことを おそれるな。』', '『やどばの ベッドは いつでも あいている。』'],
  12: ['ふるい ポンプの おとが きこえる。', 'みずは まだ すこし にごっている。アクエラの くるしみが つたわってくるようだ。'],
  13: ['みずたまりに さかなが およいでいる。', 'とうの なかなのに どこから きたのだろう……。'],
  14: ['たてふだが みずに ぬれている。', '『このさき、ゆかの ひびに ちゅうい。したから かぜが ふいている。』', 'だれかが なんども かきなおした けいこくだ。'],
  18: ['かべに ぬれた てがたが のこっている。', 'ちいさな てだ。だれかが ここまで みずを はこびに きたのだろうか。'],
  22: ['こわれた てんびんが すなに うもれている。', 'かたほうの さらには きんか。もう かたほうには ふるい くすりびん。'],
  23: ['すなの うえに あしあとが てんてんと つづいている。', 'ふるい あしあとだ。100ねんまえの ものかも しれない。'],
  28: ['やぶれた あかい マントの きれはしが ある。', 'ドロンゾも むかしは この みちを うえへ のぼっていた。'],
  32: ['だれかの ゆめが こおった けっしょうが ある。', 'ふれると なつかしい こえが きこえたが、ことばは おもいだせなかった。'],
  33: ['くらやみの なかで こどもの わらいごえが きこえた きがした。', '……きの せいだろうか。'],
  38: ['ねむる のぼりての ために ならべられた ベッドが ある。', 'まくらもとには「めざめる ひまで まつ」と かかれていた。'],
  47: ['はなばたけが ひろがっている。', 'とうの なかに かぜが ふき はなびらが まっていた。'],
  57: ['ゆかの したから はぐるまの おとが きこえる。', 'この とう ぜんたいが ひとつの いきものの ようだ。'],
  67: ['ちいさな りゅうの こが ねむっている。', 'おこさないように そっと とおりすぎた。'],
  77: ['くもの すきまから したの かいそうが みえた。', 'ずいぶん たかくまで きたものだ。'],
  87: ['ほしが ちかい。てを のばせば とどきそうだ。', 'ソラは しばらく そらを みあげていた。'],
  97: ['『ここまで こられたことを ほこりに おもいなさい』', 'どこからか こえが きこえた。やさしい こえだった。'],
};

// なかま加入イベント
const JOIN_EVENTS = {
  join_rino: {
    flag: 'join_rino', who: 'rino',
    lines: ['リノ「あなたが うわさの のぼりて さん?」', '「わたしは リノ。いやしの じゅもんが つかえるの。」', '「ひとりで 100かいなんて むちゃよ。 わたしも つれてって!」'],
    joined: 'リノが なかまに くわわった!',
  },
  join_gald: {
    flag: 'join_gald', who: 'gald',
    lines: ['ガルド「おれは ガルド。もと おうきゅうの けいびへいだ。」', '「ドロンゾとの たたかい みせてもらった。 いい うでだ。」', '「おまえ 100かいを めざすのか……おもしろい。 おれも つれていけ!」'],
    joined: 'ガルドが なかまに くわわった!',
  },
  join_fio: {
    flag: 'join_fio', who: 'fio',
    lines: ['フィオ「わたしは フィオ。とうの れきしを しらべる けんきゅうしゃ。」', '「アルカ…… ふるい ことばで『はこぶね』。」', '「この とうの しんじつを この めで たしかめたいの。 つれていって!」'],
    joined: 'フィオが なかまに くわわった!',
  },
};

// レベルアップに必要な経験値
function expForNext(level) {
  return Math.floor(7 * Math.pow(level, 2.35));
}
