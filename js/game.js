// ============================================================
// アルカの塔 - メインエンジン
// ============================================================
'use strict';

// ---------------- 入力 ----------------
const Input = (() => {
  const held = new Set();
  const pressed = new Set();
  // 素早いタップが描画フレームの間で完結しても失われないよう、
  // 仮想ボタンの押下をゲーム側が読むまで短時間保持する。
  const virtualPressed = new Map();
  const MAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
    z: 'ok', Z: 'ok', Enter: 'ok', ' ': 'ok',
    x: 'cancel', X: 'cancel', Escape: 'cancel',
  };
  window.addEventListener('keydown', e => {
    const k = MAP[e.key];
    if (k) {
      e.preventDefault();
      if (!held.has(k)) pressed.add(k);
      held.add(k);
      AudioSys.ensureCtx();
    }
  });
  window.addEventListener('keyup', e => {
    const k = MAP[e.key];
    if (k) held.delete(k);
  });
  window.addEventListener('blur', () => { held.clear(); virtualPressed.clear(); });
  const api = {
    held: k => held.has(k),
    pressed(k) {
      if (pressed.has(k)) return true;
      const expires = virtualPressed.get(k);
      if (!expires) return false;
      virtualPressed.delete(k);
      return expires >= performance.now();
    },
    endFrame: () => pressed.clear(),
    virtualDown(k) {
      if (!held.has(k)) virtualPressed.set(k, performance.now() + 500);
      held.add(k);
      AudioSys.ensureCtx();
    },
    // スティックは方向へ入った瞬間だけpressedを作る。フィールドはheld、
    // メニュー・店・戦闘はpressedを読むため、同じ操作面を両方で使える。
    virtualHold(k) {
      if (!held.has(k) && Game.state !== 'field') virtualPressed.set(k, performance.now() + 500);
      held.add(k); AudioSys.ensureCtx();
    },
    virtualUp(k) { held.delete(k); },
    // メニューでの素早いフリックも次フレームまでpressedを保持する。
    virtualUnhold(k) { held.delete(k); },
  };
  window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#touch-controls [data-key]').forEach(button => {
      const key = button.dataset.key;
      const release = e => {
        e.preventDefault(); api.virtualUp(key); button.classList.remove('is-held');
        const group = button.closest('.dpad, .touch-actions');
        if (group && !group.querySelector('.is-held')) group.classList.remove('is-active');
      };
      button.addEventListener('pointerdown', e => {
        e.preventDefault(); button.setPointerCapture?.(e.pointerId);
        api.virtualDown(key); button.classList.add('is-held');
        button.closest('.dpad, .touch-actions')?.classList.add('is-active');
      });
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
      button.addEventListener('contextmenu', e => e.preventDefault());
    });

    // 左側のどこに触れても、その場所から使える追従式フローティングスティック。
    const moveZone = document.getElementById('move-zone');
    const stick = document.getElementById('floating-stick');
    const knob = document.getElementById('stick-knob');
    let stickPointer = null, originX = 0, originY = 0, activeMoveKeys = new Set();
    const setMoveKeys = next => {
      for (const key of activeMoveKeys) if (!next.has(key)) api.virtualUnhold(key);
      for (const key of next) if (!activeMoveKeys.has(key)) api.virtualHold(key);
      activeMoveKeys = next;
    };
    const moveStick = e => {
      const dx = e.clientX - originX, dy = e.clientY - originY;
      const distance = Math.hypot(dx, dy);
      const travel = Math.min(42, distance);
      const nx = distance ? dx / distance : 0, ny = distance ? dy / distance : 0;
      knob.style.transform = `translate(${nx * travel}px, ${ny * travel}px)`;
      const next = new Set();
      if (distance >= 12) {
        // グリッド移動なので、斜め入力は傾きの大きい軸へ素直に丸める。
        if (Math.abs(nx) > Math.abs(ny)) next.add(nx < 0 ? 'left' : 'right');
        else next.add(ny < 0 ? 'up' : 'down');
      }
      setMoveKeys(next);
    };
    const releaseStick = e => {
      if (stickPointer !== e.pointerId) return;
      e.preventDefault();
      setMoveKeys(new Set());
      stickPointer = null;
      knob.style.transform = '';
      stick.classList.remove('is-visible');
    };
    moveZone?.addEventListener('pointerdown', e => {
      if (stickPointer !== null) return;
      e.preventDefault();
      stickPointer = e.pointerId; originX = e.clientX; originY = e.clientY;
      moveZone.setPointerCapture?.(e.pointerId);
      moveZone.classList.add('was-used');
      stick.style.left = `${originX}px`; stick.style.top = `${originY}px`;
      stick.classList.add('is-visible');
      knob.style.transform = '';
      AudioSys.ensureCtx();
    });
    moveZone?.addEventListener('pointermove', e => {
      if (stickPointer !== e.pointerId) return;
      e.preventDefault(); moveStick(e);
    });
    moveZone?.addEventListener('pointerup', releaseStick);
    moveZone?.addEventListener('pointercancel', releaseStick);
    moveZone?.addEventListener('lostpointercapture', releaseStick);
    moveZone?.addEventListener('contextmenu', e => e.preventDefault());
  });
  return api;
})();

// ---------------- UI 描画 ----------------
const UI = {
  FONT: "'MS Gothic', 'Osaka-Mono', 'Hiragino Kaku Gothic ProN', monospace",
  TITLE_FONT: "'Hiragino Mincho ProN', 'Yu Mincho', serif",
  window(g, x, y, w, h) {
    g.save();
    g.fillStyle = 'rgba(0,0,8,0.7)';
    g.fillRect(x + 5, y + 6, w, h);
    const bg = g.createLinearGradient(x, y, x, y + h);
    bg.addColorStop(0, 'rgba(16,38,55,0.98)');
    bg.addColorStop(0.52, 'rgba(5,18,31,0.98)');
    bg.addColorStop(1, 'rgba(8,12,27,0.98)');
    g.fillStyle = bg;
    g.fillRect(x, y, w, h);
    // 真鍮の外枠とシアンの内側光。斜めに欠いた角が塔の紋章を示す。
    g.strokeStyle = '#1b2230'; g.lineWidth = 5; g.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    g.strokeStyle = '#b99750'; g.lineWidth = 2; g.strokeRect(x + 4, y + 4, w - 8, h - 8);
    g.strokeStyle = '#416f7f'; g.lineWidth = 1; g.strokeRect(x + 7.5, y + 7.5, w - 15, h - 15);
    g.fillStyle = '#d5b75e';
    for (const [cx, cy, sx, sy] of [[x+2,y+2,1,1],[x+w-2,y+2,-1,1],[x+2,y+h-2,1,-1],[x+w-2,y+h-2,-1,-1]]) {
      g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+sx*9,cy);g.lineTo(cx,cy+sy*9);g.closePath();g.fill();
      g.fillStyle='#62dce4';g.fillRect(cx+sx*3-(sx<0?2:0),cy+sy*3-(sy<0?2:0),2,2);g.fillStyle='#d5b75e';
    }
    g.fillStyle='rgba(91,224,232,.14)';g.fillRect(x+9,y+9,w-18,2);
    g.restore();
  },
  text(g, str, x, y, color, size) {
    g.font = `${size || 16}px ${UI.FONT}`;
    g.fillStyle = '#000';
    g.fillText(str, x + 1, y + 1);
    g.fillStyle = color || '#fff';
    g.fillText(str, x, y);
  },
  measure(g, str, size) {
    g.font = `${size || 16}px ${UI.FONT}`;
    return g.measureText(str).width;
  },
  textWrap(g, str, x, y, maxW, color, size, lineH) {
    let line = '', yy = y;
    for (const ch of str) {
      if (ch === '\n' || UI.measure(g, line + ch, size) > maxW) {
        UI.text(g, line, x, yy, color, size);
        yy += lineH; line = ch === '\n' ? '' : ch;
      } else line += ch;
    }
    if (line) UI.text(g, line, x, yy, color, size);
    return yy;
  },
  cursor(g, x, y, dir) {
    const blink = Math.floor(performance.now()/180)%2;
    g.fillStyle = blink ? '#ffffff' : '#79e6ed';
    if (dir === 'right') {
      g.fillRect(x, y+3, 3, 6);g.fillRect(x+3,y+2,3,8);g.fillRect(x+6,y+4,3,4);g.fillRect(x+9,y+5,2,2);
    } else {
      g.fillRect(x+3,y,6,3);g.fillRect(x+2,y+3,8,3);g.fillRect(x+4,y+6,4,3);g.fillRect(x+5,y+9,2,2);
    }
  },
};

// ---------------- キャラクター計算 ----------------
const Chars = {
  expTable(l) { return l <= 1 ? 0 : Math.floor(7 * Math.pow(l - 1, 2.35)); },

  makeHuman(id, level) {
    const h = HUMANS[id];
    const m = {
      kind: 'human', id, name: h.name, level, exp: Chars.expTable(level),
      spells: [], weapon: null, armor: null,
      seeds: { hp: 0, mp: 0, str: 0, vit: 0 },
      poison: false, sleep: 0, defend: false, atkBuff: 1, defBuff: 1,
    };
    Chars.recompute(m);
    m.hp = m.maxhp; m.mp = m.maxmp;
    for (const [lv, sp] of h.spells) if (lv <= level && !m.spells.includes(sp)) m.spells.push(sp);
    return m;
  },

  makeMonster(spec, level, nick) {
    const m = {
      kind: 'monster', id: spec, name: nick, level, exp: Chars.expTable(level),
      spells: [], weapon: null, armor: null,
      seeds: { hp: 0, mp: 0, str: 0, vit: 0 },
      poison: false, sleep: 0, defend: false, atkBuff: 1, defBuff: 1,
    };
    Chars.recompute(m);
    m.hp = m.maxhp; m.mp = m.maxmp;
    const b = MONSTERS[spec];
    if (b.allySpells) for (const [lv, sp] of b.allySpells) if (lv <= level && !m.spells.includes(sp)) m.spells.push(sp);
    return m;
  },

  // 職業(転職後)か素の成長テーブルを返す
  tablesFor(m) {
    if (m.job && typeof JOBS !== 'undefined' && JOBS[m.job]) {
      return JOBS[m.job];
    }
    return HUMANS[m.id];
  },

  jobNameOf(m) {
    if (m.kind === 'monster') return 'まもの';
    if (m.job && JOBS[m.job]) return JOBS[m.job].name;
    return DEFAULT_JOB_NAMES[m.id] || '-';
  },

  changeJob(m, jobId) {
    const formerLevel = m.level;
    // 能力の一部を「たくわえ」として引き継ぐ
    m.seeds.hp += Math.floor(m.maxhp * 0.05);
    m.seeds.mp += Math.floor(m.maxmp * 0.05);
    m.seeds.str += Math.floor((m.str - m.seeds.str) * 0.1);
    m.seeds.vit += Math.floor((m.vit - m.seeds.vit) * 0.1);
    m.job = jobId;
    // 第一部終盤でLv1へ戻ると復帰不能になりやすいため、鍛錬の7割を新しい道へ引き継ぐ。
    m.level = Math.max(5, Math.floor(formerLevel * 0.7));
    m.exp = Chars.expTable(m.level);
    Chars.recompute(m);
    m.hp = m.maxhp; m.mp = m.maxmp;
    const learned = [];
    for (const [lv, sp] of JOBS[jobId].spells) {
      if (lv <= m.level && !m.spells.includes(sp)) { m.spells.push(sp); learned.push(sp); }
    }
    return learned;
  },

  recompute(m) {
    const L = m.level;
    if (m.kind === 'human') {
      const h = Chars.tablesFor(m);
      m.maxhp = Math.round(h.base.hp + h.grow.hp * (L - 1)) + m.seeds.hp;
      m.maxmp = Math.round(h.base.mp + h.grow.mp * (L - 1)) + m.seeds.mp;
      m.str = Math.round(h.base.str + h.grow.str * (L - 1)) + m.seeds.str;
      m.vit = Math.round(h.base.vit + h.grow.vit * (L - 1)) + m.seeds.vit;
      m.agi = Math.round(h.base.agi + h.grow.agi * (L - 1));
    } else {
      const b = MONSTERS[m.id];
      const steps = Math.max(0, L - 1);
      // 敵としての数値が低い序盤種も、仲間になった瞬間から一人分の戦力になる。
      // 種族固有値と仲間共通の最低成長を比べ、高い側を採用する。
      m.maxhp = Math.round(Math.max(18 + 5.2 * steps, b.hp * 0.72 + 5.2 * steps, b.hp * 0.6 + b.hp * 0.09 * L)) + m.seeds.hp;
      m.maxmp = Math.round(b.allySpells ? 12 + 2.5 * steps : 4 + 0.9 * steps) + m.seeds.mp;
      m.str = Math.round(Math.max(10 + 2.05 * steps, b.atk * 0.72 + 2.05 * steps, b.atk * 0.6 + b.atk * 0.05 * L)) + m.seeds.str;
      m.vit = Math.round(Math.max(8 + 1.85 * steps, b.def * 0.72 + 1.85 * steps, b.def * 0.6 + b.def * 0.05 * L)) + m.seeds.vit;
      m.agi = Math.round(Math.max(8 + 1.75 * steps, b.agi * 0.72 + 1.75 * steps, b.agi * 0.6 + b.agi * 0.05 * L));
    }
    m.hp = Math.min(m.hp !== undefined ? m.hp : m.maxhp, m.maxhp);
    m.mp = Math.min(m.mp !== undefined ? m.mp : m.maxmp, m.maxmp);
  },

  applyLevelUp(m, newLevel) {
    const oldHp = m.maxhp, oldMp = m.maxmp;
    m.level = newLevel;
    Chars.recompute(m);
    m.hp += Math.max(0, m.maxhp - oldHp);
    m.mp += Math.max(0, m.maxmp - oldMp);
    const newSpells = [];
    const table = m.kind === 'human' ? Chars.tablesFor(m).spells : (MONSTERS[m.id].allySpells || []);
    for (const [lv, sp] of table) {
      if (lv === newLevel && !m.spells.includes(sp)) { m.spells.push(sp); newSpells.push(sp); }
    }
    return { newSpells };
  },

  attackOf(m) { return m.str + (m.weapon ? WEAPONS[m.weapon].atk : 0); },
  defenseOf(m) { return m.vit + (m.armor ? ARMORS[m.armor].def : 0); },
  agiOf(m) { return m.agi; },
};

const REST_POINT_NAMES = Object.freeze({
  7: 'ほしあかりの野営地',
  18: 'みずかがみの浮島町 ミズベ',
  27: 'ぬすびとの路地町 ネグラ',
  37: 'ゆめつむぎの町 ネムリ',
});
const PUBLIC_REST_POINTS = Object.freeze([1, 7, 11, 18, 21, 27, 31, 37]);

// ---------------- ゲーム本体 ----------------
const Game = {
  state: 'boot',
  party: [], reserve: [], bag: [], equipBag: [], gold: 0, flags: {},
  floor: 1, map: null, px: 10, py: 12, dir: 'd',
  ox: 0, oy: 0, moving: false, moveT: 0, moveFromDir: 'd', animT: 0,
  walkAnimT: 0,
  partyPath: null, partyPathFrom: null,
  visitedTowns: [1], lastInn: 1, steps: 0, repel: 0,
  encounterDistance: 0,
  dialog: null, choiceBox: null, menuStack: [],
  fade: 0, fadeDir: 0, fadeCb: null,
  floorLabelT: 0, ignoreStairs: null,
  titleSel: 0, openingPage: 0, endingT: 0, shop: null,
  fallEvent: null,
  chapterClearT: 0,
  maxRoster: 20,

  // ---------- 起動 ----------
  init() {
    Art.init();
    CharGen.install(); // 32x32高解像度キャラで上書き
    this.titleArt = new Image();
    this.titleArt.src = 'assets/title-keyart-v3.png';
    this.villageArt = new Image();
    this.townArtsV5 = { 11: new Image(), 21: new Image(), 31: new Image() };
    this.battleArt = new Image();
    this.battleBackgroundsV5 = { 2: new Image(), 3: new Image(), 4: new Image() };
    this.monsterAtlas = new Image();
    this.battleSpritesV5 = new Image();
    this.partyBattleV5 = new Image();
    this.environmentAtlas = new Image();
    this.tier1Environment = new Image();
    this.tier2Environment = new Image();
    this.battleSpritesV5Tier2 = new Image();
    this.tier3Environment = new Image();
    this.battleSpritesV5Tier3 = new Image();
    this.tier4Environment = new Image();
    this.battleSpritesV5Tier4 = new Image();
    this.hdCharacters = {};
    for (const id of ['hero', 'rino', 'gald', 'fio']) {
      this.hdCharacters[id] = new Image();
    }
    // V5では会話用立ち絵とフィールド用アニメを分離する。
    this.fieldCharacters = {};
    const heroField = new Image();
    heroField.src = 'assets/v5/hero-field-v5.webp';
    this.fieldCharacters.hero = heroField;
    // 仲間は加入・登場フロアまで遅延読込する。
    for (const id of ['rino', 'gald', 'fio']) this.fieldCharacters[id] = new Image();
    this.npcDirectionSheets = {};
    for (const id of ['elder', 'woman', 'man', 'child', 'merchant', 'guard', 'celest']) {
      this.npcDirectionSheets[id] = new Image();
    }
    this.canvas = document.getElementById('screen');
    // 内部解像度 1024x896 (論理座標系は512x448のまま、2倍変換で描画)
    this.canvas.width = 1024; this.canvas.height = 896;
    this.g = this.canvas.getContext('2d');
    this.g.imageSmoothingEnabled = true;
    this.g.imageSmoothingQuality = 'high';
    this.g.setTransform(2, 0, 0, 2, 0, 0);
    const resize = () => {
      const touchMode = matchMedia('(hover: none) and (pointer: coarse)').matches || window.innerWidth <= 700 || window.innerHeight <= 600;
      document.documentElement.classList.toggle('touch-ui', touchMode);
      const ww = window.innerWidth, wh = window.innerHeight;
      let sc = Math.min(ww / 1024, wh / 896);
      if (sc > 1) sc = Math.floor(sc * 2) / 2;
      this.canvas.style.width = (1024 * sc) + 'px';
      this.canvas.style.height = (896 * sc) + 'px';
    };
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 80));
    resize();
    this.state = 'title';
    this.titleSel = this.hasSave() ? 1 : 0;
    this.last = performance.now();
    window.addEventListener('arca:visual-test', ev => this.runVisualTest(ev.detail));
    const visualTest = new URLSearchParams(location.search).get('visualTest');
    if (visualTest) this.runVisualTest(visualTest);
    requestAnimationFrame(t => this.frame(t));
  },

  loadAssetOnce(image, src) {
    if (image && !image.src) image.src = src;
    return image;
  },

  // 開発用の再現可能な画面注入。通常プレイやセーブデータには触れない。
  runVisualTest(detail) {
    const test = typeof detail === 'string' ? detail : detail && detail.kind;
    if (!test) return false;
    this.visualTestActive = true;
    if (!this.party.length) {
      this.party = [Chars.makeHuman('hero', 1)];
      this.party[0].weapon = 'stick'; this.party[0].armor = 'cloth';
    }
    if (!this.map) this.loadFloor(2, null);
    if (test === 'battle-tier1') {
      this.state = 'battle';
      Battle.start({ enemySpecs: ['slime', 'bat', 'rat'], boss: false, onEnd: () => {} });
      return true;
    }
    if (test === 'battle-fx') {
      this.state = 'battle';
      Battle.start({ enemySpecs: ['slime', 'bat', 'rat'], boss: false, onEnd: () => {} });
      Battle.queue.length = 0; Battle.phase = 'command'; Battle.startCommandPhase();
      Battle.addFx('fire', { enemies: true }, 4);
      return true;
    }
    if (test === 'battle-guardio') {
      this.loadFloor(10, null);
      this.state = 'battle';
      Battle.start({ enemySpecs: ['b_guardio'], boss: true, onEnd: () => {} });
      return true;
    }
    if (test === 'battle-tier2') {
      this.loadFloor(12, null); this.state = 'battle';
      Battle.start({ enemySpecs: ['goblin', 'aquan', 'slimered'], boss: false, onEnd: () => {} });
      return true;
    }
    if (test === 'battle-aquera') {
      this.loadFloor(20, null); this.state = 'battle';
      Battle.start({ enemySpecs: ['b_aquera'], boss: true, onEnd: () => {} });
      return true;
    }
    if (test === 'battle-tier3') {
      this.loadFloor(22, null); this.state = 'battle';
      Battle.start({ enemySpecs: ['mush', 'thief', 'gobsold'], boss: false, onEnd: () => {} });
      return true;
    }
    if (test === 'battle-dronzo') {
      this.loadFloor(30, null); this.state = 'battle';
      Battle.start({ enemySpecs: ['b_dronzo'], boss: true, onEnd: () => {} });
      return true;
    }
    if (test === 'battle-tier4') {
      this.loadFloor(32, null); this.state = 'battle';
      Battle.start({ enemySpecs: ['ghost', 'shadowrat', 'darkbat'], boss: false, onEnd: () => {} });
      return true;
    }
    if (test === 'battle-nocturna') {
      this.loadFloor(40, null); this.state = 'battle';
      Battle.start({ enemySpecs: ['b_nocturna'], boss: true, onEnd: () => {} });
      return true;
    }
    if (test === 'chapter-clear') {
      this.party = [Chars.makeHuman('hero', 18), Chars.makeHuman('rino', 18), Chars.makeMonster('slime', 17, 'プルた')];
      this.flags.boss40 = true;
      this.loadFloor(40, null); this.showChapterClear(); return true;
    }
    if (test === 'chapter-gate') {
      this.flags.boss40 = true;
      this.loadFloor(40, null);
      const gate = this.map.chapterGate;
      if (!gate) return false;
      this.px = gate.x; this.py = gate.y + 1; this.dir = 'u';
      this.resetPartyPath(); this.state = 'field'; return true;
    }
    if (test === 'village') {
      this.loadFloor(1, null); this.state = 'field'; return true;
    }
    if (test === 'town-life') {
      this.loadFloor(1, null); this.px = 10; this.py = 10; this.dir = 'u';
      for (const n of this.map.npcs) if (n.wander) n.npcWait = 0;
      this.resetPartyPath(); this.state = 'field'; return true;
    }
    if (test === 'village-stairs') {
      this.loadFloor(1, null); this.px = 10; this.py = 1; this.dir = 'u';
      this.ignoreStairs = null; this.resetPartyPath(); this.state = 'field'; return true;
    }
    if (test === 'shop-buy') {
      this.loadFloor(1, null); this.gold = 999; this.openShop('equip');
      this.shop.mode = 'buy'; this.shop.sel = 1; return true;
    }
    if (/^town-(11|21|31)$/.test(test)) {
      const floor = Number(test.split('-')[1]); this.loadFloor(floor, null);
      this.px = 10; this.py = 10; this.dir = 'u'; this.ignoreStairs = null;
      this.resetPartyPath(); this.state = 'field'; return true;
    }
    if (test === 'party-field') {
      this.party = ['hero', 'rino', 'gald', 'fio'].map((id, i) => Chars.makeHuman(id, 8 + i));
      this.loadFloor(1, null);
      this.px = 10; this.py = 12; this.dir = 'u'; this.resetPartyPath();
      this.partyPath = [0, 1, 2, 3].map(i => ({ x: 10, y: 12 + i, dir: 'u' }));
      this.partyPathFrom = this.partyPath.map(p => ({ ...p }));
      this.state = 'field'; return true;
    }
    if (test === 'party-monsters') {
      this.party = [
        Chars.makeHuman('hero', 8), Chars.makeMonster('slime', 7, 'プルた'),
        Chars.makeMonster('bat', 7, 'モリー'), Chars.makeMonster('goblin', 7, 'ゴブすけ'),
      ];
      this.loadFloor(2, null); this.px = 13; this.py = 12; this.dir = 'u'; this.resetPartyPath();
      this.partyPath = [0, 1, 2, 3].map(i => ({ x: 13, y: 12 + i, dir: 'u' }));
      this.partyPathFrom = this.partyPath.map(p => ({ ...p }));
      this.state = 'field'; return true;
    }
    if (test === 'pitfall-14') {
      this.flags.pit_known_14_to_12 = false;
      this.loadFloor(14, null);
      const pit = this.map.pitfalls && this.map.pitfalls[0];
      if (!pit) return false;
      const dirs = [{ dx: 0, dy: 1, dir: 'u' }, { dx: 0, dy: -1, dir: 'd' }, { dx: 1, dy: 0, dir: 'l' }, { dx: -1, dy: 0, dir: 'r' }];
      const near = dirs.find(d => Maps.walkable(this.map, pit.x + d.dx, pit.y + d.dy)) || dirs[0];
      this.px = pit.x + near.dx; this.py = pit.y + near.dy; this.dir = near.dir;
      this.resetPartyPath(); this.state = 'field'; return true;
    }
    if (test === 'pitfall-fall') {
      this.flags.pit_known_14_to_12 = false;
      this.loadFloor(14, null);
      const pit = this.map.pitfalls && this.map.pitfalls[0];
      if (!pit) return false;
      this.px = pit.x; this.py = pit.y; this.resetPartyPath(); this.state = 'field';
      this.triggerPitfall(pit); return true;
    }
    if (test === 'camp-7') {
      this.party = [Chars.makeHuman('hero', 5), Chars.makeHuman('rino', 5), Chars.makeMonster('slime', 4, 'プルた')];
      this.loadFloor(7, null);
      const fire = this.map.campCenter;
      if (!fire) return false;
      const around = [{ x: fire.x, y: fire.y + 2, dir: 'u' }, { x: fire.x - 2, y: fire.y, dir: 'r' }, { x: fire.x + 2, y: fire.y, dir: 'l' }];
      const spot = around.find(p => Maps.walkable(this.map, p.x, p.y)) || this.map.entry;
      this.px = spot.x; this.py = spot.y; this.dir = spot.dir || 'u';
      this.resetPartyPath(); this.state = 'field'; return true;
    }
    if (test === 'camp-rest') {
      this.party = [Chars.makeHuman('hero', 5), Chars.makeHuman('rino', 5), Chars.makeMonster('slime', 4, 'プルた')];
      this.loadFloor(7, null); this.state = 'field'; this.campRestEvent(); return true;
    }
    if (test === 'camp-story') {
      this.party = [Chars.makeHuman('hero', 5), Chars.makeHuman('rino', 5), Chars.makeMonster('slime', 4, 'プルた')];
      this.loadFloor(7, null); this.state = 'field'; this.campStoryEvent(); return true;
    }
    if (test === 'story-8' || test === 'story-9') {
      const floor = Number(test.split('-')[1]);
      this.party = [Chars.makeHuman('hero', 6), Chars.makeMonster('slime', 5, 'プルた')];
      this.loadFloor(floor, null);
      const story = this.map.storySpots && this.map.storySpots[0];
      if (!story) return false;
      const nearby = [
        { x: story.x, y: story.y + 1, dir: 'u' }, { x: story.x, y: story.y - 1, dir: 'd' },
        { x: story.x + 1, y: story.y, dir: 'l' }, { x: story.x - 1, y: story.y, dir: 'r' },
      ].find(p => Maps.walkable(this.map, p.x, p.y));
      if (!nearby) return false;
      this.px = nearby.x; this.py = nearby.y; this.dir = nearby.dir;
      this.resetPartyPath(); this.state = 'field'; return true;
    }
    if (test === 'otherworld-16') {
      this.party = [Chars.makeHuman('hero', 10), Chars.makeHuman('rino', 9), Chars.makeMonster('aquan', 9, 'アクア')];
      this.loadFloor(16, null);
      const story = this.map.storySpots && this.map.storySpots[0];
      if (!story) return false;
      const nearby = [
        { x: story.x, y: story.y + 1, dir: 'u' }, { x: story.x, y: story.y - 1, dir: 'd' },
        { x: story.x + 1, y: story.y, dir: 'l' }, { x: story.x - 1, y: story.y, dir: 'r' },
      ].find(p => Maps.walkable(this.map, p.x, p.y));
      if (!nearby) return false;
      this.px = nearby.x; this.py = nearby.y; this.dir = nearby.dir;
      this.resetPartyPath(); this.state = 'field'; return true;
    }
    const specialFloors = {
      'lake-town-18': 18,
      'rescue-24': 24,
      'thief-town-27': 27,
      'false-home-34': 34,
      'dream-town-37': 37,
    };
    if (specialFloors[test]) {
      const floor = specialFloors[test];
      this.party = [Chars.makeHuman('hero', Math.max(8, Math.floor(floor / 2))), Chars.makeMonster('slime', Math.max(7, Math.floor(floor / 2)), 'プルた')];
      if (floor === 24) this.flags.rescued_merchant_24 = false;
      if (floor === 27) this.flags.rescued_merchant_24 = true;
      this.loadFloor(floor, null);
      const focus = this.map.npcs[0] || this.map.restSpawn || this.map.entry;
      const nearby = [
        { x: focus.x, y: focus.y + 1, dir: 'u' }, { x: focus.x, y: focus.y - 1, dir: 'd' },
        { x: focus.x + 1, y: focus.y, dir: 'l' }, { x: focus.x - 1, y: focus.y, dir: 'r' },
      ].find(p => Maps.walkable(this.map, p.x, p.y)) || this.map.entry;
      this.px = nearby.x; this.py = nearby.y; this.dir = nearby.dir || 'd';
      this.resetPartyPath(); this.state = 'field'; return true;
    }
    if (test === 'dungeon-tier1') {
      this.loadFloor(2, null); this.state = 'field'; return true;
    }
    if (test === 'dungeon-tier2') {
      this.loadFloor(12, null); this.state = 'field'; return true;
    }
    if (test === 'dungeon-tier3') {
      this.loadFloor(22, null); this.state = 'field'; return true;
    }
    if (test === 'dungeon-tier4') {
      this.loadFloor(32, null); this.state = 'field'; return true;
    }
    return false;
  },

  frame(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    this.update(dt);
    this.draw();
    Input.endFrame();
    requestAnimationFrame(t2 => this.frame(t2));
  },

  // ---------- 状態ヘルパ ----------
  hasSave() { try { return !!localStorage.getItem('arca_tower_save_v1'); } catch (e) { return false; } },

  newGame() {
    this.party = [Chars.makeHuman('hero', 1)];
    this.party[0].weapon = 'stick';
    this.party[0].armor = 'cloth';
    this.reserve = [];
    this.bag = [{ id: 'yakusou', n: 3 }];
    this.equipBag = [];
    this.gold = 30;
    this.flags = {};
    this.floor = 1;
    this.visitedTowns = [1];
    this.lastInn = 1; this.steps = 0; this.repel = 0; this.encounterDistance = 0;
    this.walkAnimT = 0;
    this.loadFloor(1, null);
    this.px = 10; this.py = 12; this.dir = 'u';
    this.resetPartyPath();
    this.state = 'opening';
    this.openingPage = 0;
    AudioSys.playMusic('title');
  },

  save() {
    // 開発用の画面テストは、実プレイヤーの冒険の書を上書きしない。
    if (this.visualTestActive) return true;
    const data = {
      v: 1, gold: this.gold, floor: this.floor, px: this.px, py: this.py, dir: this.dir,
      party: this.party, reserve: this.reserve, bag: this.bag, equipBag: this.equipBag,
      flags: this.flags, visitedTowns: this.visitedTowns, lastInn: this.lastInn,
    };
    try { localStorage.setItem('arca_tower_save_v1', JSON.stringify(data)); return true; }
    catch (e) { return false; }
  },

  load() {
    try {
      const d = JSON.parse(localStorage.getItem('arca_tower_save_v1'));
      if (!d) return false;
      const wasBeyondPublicRelease = d.floor > 40;
      let migratedSave = wasBeyondPublicRelease;
      const savedPosition = { x: d.px, y: d.py, dir: d.dir };
      const publicFloor = Math.max(1, Math.min(Number(d.floor) || 1, 40));
      const visited = new Set((d.visitedTowns || [1])
        .map(Number).filter(f => PUBLIC_REST_POINTS.includes(f) && f <= publicFloor));
      // 旧版で通過済みの途中拠点も、新しいワープ先として安全に引き継ぐ。
      for (const f of PUBLIC_REST_POINTS) if (f <= publicFloor) visited.add(f);
      const savedInn = Math.min(Number(d.lastInn) || 1, publicFloor);
      const normalizedInn = [...PUBLIC_REST_POINTS].filter(f => f <= savedInn).pop() || 1;
      Object.assign(this, {
        gold: d.gold, floor: publicFloor, px: d.px, py: d.py, dir: d.dir,
        party: d.party || [], reserve: d.reserve || [], bag: d.bag || [], equipBag: d.equipBag || [],
        flags: d.flags || {}, visitedTowns: [...visited].sort((a, b) => a - b), lastInn: normalizedInn,
      });
      for (const m of [...this.party, ...this.reserve]) {
        m.sleep = 0; m.defend = false; m.atkBuff = 1; m.defBuff = 1;
        // 旧セーブの仲間モンスターにも新しい能力計算を適用。残りHP/MPの割合は維持する。
        if (m.kind === 'monster') {
          const hpRate = m.maxhp > 0 ? Math.max(0, m.hp) / m.maxhp : 1;
          const mpRate = m.maxmp > 0 ? Math.max(0, m.mp) / m.maxmp : 1;
          m.seeds = m.seeds || { hp: 0, mp: 0, str: 0, vit: 0 };
          Chars.recompute(m);
          m.hp = hpRate <= 0 ? 0 : Math.max(1, Math.round(m.maxhp * Math.min(1, hpRate)));
          m.mp = Math.round(m.maxmp * Math.min(1, mpRate));
        }
      }
      // 後から追加されたボス報酬を、撃破済みの旧セーブにも一度だけ補填する。
      for (const floor of [10, 20, 30, 40]) {
        const be = BOSS_EVENTS[floor];
        if (be && this.flags[be.flag] && !this.flags[`reward_${be.flag}`]) {
          this.grantBossReward(be);
          if (this.flags[`reward_${be.flag}`]) migratedSave = true;
        }
      }
      this.loadFloor(this.floor, null);
      if (!wasBeyondPublicRelease && Maps.walkable(this.map, savedPosition.x, savedPosition.y)) {
        this.px = savedPosition.x; this.py = savedPosition.y; this.dir = savedPosition.dir;
      }
      this.resetPartyPath();
      this.state = 'field';
      this.playFieldMusic();
      // 40Fへの巻き戻しや旧ボス報酬の補填を即時保存し、再読込で重複させない。
      if (migratedSave) this.save();
      if (wasBeyondPublicRelease) {
        this.showDialog([
          'この こうかいばんは 40かいまで たのしめます。',
          'これまでの ぼうけんの きろくは のこしたまま、40かいへ もどりました。',
        ]);
      }
      return true;
    } catch (e) { console.error(e); return false; }
  },

  rosterCount() { return this.party.length + this.reserve.length; },
  recruitLevel() {
    const hero = this.party.find(m => m.kind === 'human' && m.id === 'hero');
    const highest = this.party.reduce((level, m) => Math.max(level, Number(m.level) || 1), 1);
    // 並び順や転職直後の低レベルに引っ張られず、現在の冒険へすぐ参加できる水準にする。
    return Math.max(1, Number(hero && hero.level) || 1, highest - 1);
  },
  hasMonsterAlly(spec) {
    return [...this.party, ...this.reserve].some(m => m.kind === 'monster' && m.id === spec);
  },

  addItem(id, n) {
    n = n || 1;
    const e = this.bag.find(x => x.id === id);
    if (e) e.n += n; else this.bag.push({ id, n });
  },
  removeItem(id) {
    const i = this.bag.findIndex(x => x.id === id);
    if (i >= 0) { this.bag[i].n--; if (this.bag[i].n <= 0) this.bag.splice(i, 1); }
  },

  // ---------- フロア ----------
  loadFloor(floor, from) {
    const cameFromSafeMap = !this.map || this.map.safe;
    this.floor = floor;
    this.map = Maps.build(floor, this.flags);
    if (this.map.town) {
      const townArt = this.townArtsV5[this.floor];
      if (townArt) this.loadAssetOnce(townArt, `assets/v5/town-${this.floor}-v5.webp`);
      else this.loadAssetOnce(this.villageArt, 'assets/village-bg-v4.png');
    } else if (this.map.tier === 1) {
      this.loadAssetOnce(this.tier1Environment, 'assets/v5/tier1-environment-v5.webp');
    } else if (this.map.tier === 2) {
      this.loadAssetOnce(this.tier2Environment, 'assets/v5/tier2-environment-v5.webp');
    } else if (this.map.tier === 3) {
      this.loadAssetOnce(this.tier3Environment, 'assets/v5/tier3-environment-v5.webp');
    } else if (this.map.tier === 4) {
      this.loadAssetOnce(this.tier4Environment, 'assets/v5/tier4-environment-v5.webp');
    } else {
      this.loadAssetOnce(this.environmentAtlas, 'assets/environment-atlas-v4.png');
    }
    if (from === 'up') { // 下の階から上ってきた → entry(下り階段)に立つ
      this.px = this.map.entry.x; this.py = this.map.entry.y;
    } else if (from === 'down') { // 上の階から降りてきた → exit(上り階段)に立つ
      this.px = this.map.exit ? this.map.exit.x : this.map.entry.x;
      this.py = this.map.exit ? this.map.exit.y : this.map.entry.y;
    } else {
      this.px = this.map.entry.x; this.py = this.map.entry.y;
    }
    this.ignoreStairs = { x: this.px, y: this.py };
    this.ox = 0; this.oy = 0; this.moving = false; this.moveFromDir = this.dir;
    this.resetPartyPath();
    this.ensurePartyFieldAssets();
    for (const id of new Set(this.map.npcs.map(n => n.spr))) {
      if (this.npcDirectionSheets[id]) this.loadAssetOnce(this.npcDirectionSheets[id], `assets/v6/npc-${id}-directions-v6.webp`);
    }
    for (const n of this.map.npcs) if (this.fieldCharacters[n.spr]) this.loadFieldCharacter(n.spr);
    if (this.map.town || this.map.settlement) {
      this.map.npcs.forEach((n, i) => {
        if (!n.wander) return;
        n.homeX = n.x; n.homeY = n.y;
        n.dir = n.dir || (i % 2 ? 'l' : 'r');
        n.npcFromDir = n.dir;
        n.npcWait = .8 + ((n.x * 7 + n.y * 3 + i) % 8) * .28;
        n.npcMoving = false; n.npcMoveT = 0;
      });
    }
    this.floorLabelT = 3;
    if (this.map.town || this.map.restPoint) {
      if (!this.visitedTowns.includes(floor)) this.visitedTowns.push(floor);
      this.lastInn = floor;
      this.encounterDistance = 0;
    } else if (cameFromSafeMap || this.encounterDistance <= 0) {
      this.encounterDistance = this.rollEncounterDistance(true);
    }
  },

  // 短い緊張区間・通常区間・長い静穏区間を混ぜ、遭遇間隔に波を作る。
  rollEncounterDistance(leavingTown) {
    const r = Math.random();
    let min, max;
    if (leavingTown) { min = 14; max = 24; }
    else if (r < 0.18) { min = 11; max = 15; }
    else if (r < 0.78) { min = 17; max = 27; }
    else { min = 30; max = 43; }
    return min + Math.floor(Math.random() * (max - min + 1));
  },

  fieldCharacterSrc(id) { return `assets/v5/${id}-field-v5.webp`; },
  loadFieldCharacter(id) {
    return this.fieldCharacters && this.loadAssetOnce(this.fieldCharacters[id], this.fieldCharacterSrc(id));
  },
  ensurePartyFieldAssets() {
    for (const m of this.party) if (m.kind === 'human' && m.id !== 'hero' && this.fieldCharacters[m.id]) this.loadFieldCharacter(m.id);
  },
  resetPartyPath() {
    const point = { x: this.px, y: this.py, dir: this.dir };
    this.partyPath = Array.from({ length: 4 }, () => ({ ...point }));
    this.partyPathFrom = this.partyPath.map(p => ({ ...p }));
  },

  // 1マスの論理移動はそのままに、描画位置だけを滑らかに加減速させる。
  fieldMoveEase(t) {
    const p = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
    return p * p * (3 - 2 * p);
  },

  playFieldMusic() {
    if (this.map.music) AudioSys.playMusic(this.map.music);
    else if (this.map.town || this.map.settlement) AudioSys.playMusic('town');
    else if (this.floor === 16) AudioSys.playMusic('mystery');
    else if (this.floor === 100) AudioSys.playMusic('mystery');
    else if (this.map.tier <= 3) AudioSys.playMusic('field1');
    else if (this.map.tier <= 7) AudioSys.playMusic('field2');
    else AudioSys.playMusic('field3');
  },

  changeFloor(delta) {
    const target = this.floor + delta;
    if (target < 1) return;
    if (target > 40) {
      AudioSys.sfx('cancel');
      this.showDialog([
        'あさひの むこうで、とうの みちは まだ ねむっている。',
        '『アルカの塔 第一部』は ここまで。',
        '(40かいより さきは、こうかいごの つづきで ひらかれます。)',
      ]);
      return;
    }
    AudioSys.sfx('stairs');
    this.fadeTo(() => {
      this.loadFloor(target, delta > 0 ? 'up' : 'down');
      this.playFieldMusic();
      if (this.map.town || this.map.restPoint) this.save();
    });
  },

  fadeTo(cb) {
    this.fadeDir = 1; this.fadeCb = cb;
  },

  // ---------- 更新 ----------
  update(dt) {
    // フェード
    if (this.fadeDir !== 0) {
      this.fade += this.fadeDir * dt * 3.5;
      if (this.fade >= 1 && this.fadeDir > 0) {
        this.fade = 1;
        if (this.fadeCb) { this.fadeCb(); this.fadeCb = null; }
        this.fadeDir = -1;
      } else if (this.fade <= 0 && this.fadeDir < 0) {
        this.fade = 0; this.fadeDir = 0;
      }
      return;
    }
    this.animT += dt;
    if (this.floorLabelT > 0) this.floorLabelT -= dt;

    switch (this.state) {
      case 'title': this.updateTitle(); break;
      case 'opening': this.updateOpening(); break;
      case 'field': this.updateField(dt); break;
      case 'dialog': this.updateDialog(dt); break;
      case 'choice': this.updateChoice(); break;
      case 'menu': this.updateMenu(); break;
      case 'shop': this.updateShop(); break;
      case 'jobchange': this.updateJobChange(); break;
      case 'falling': this.updateFalling(dt); break;
      case 'chapterclear': this.updateChapterClear(dt); break;
      case 'battle':
        Battle.handleInput();
        Battle.update(dt);
        break;
      case 'ending': this.updateEnding(dt); break;
      case 'gameover': this.updateGameover(); break;
    }
  },

  // ---------- タイトル ----------
  updateTitle() {
    if (AudioSys.nowPlaying !== 'title' && !AudioSys.muted) AudioSys.playMusic('title');
    const opts = this.hasSave() ? 2 : 1;
    if (Input.pressed('up') || Input.pressed('down')) {
      if (opts === 2) { this.titleSel = 1 - this.titleSel; AudioSys.sfx('cursor'); }
    }
    if (Input.pressed('ok')) {
      AudioSys.sfx('ok');
      if (opts === 1) this.newGame();
      else if (this.titleSel === 0) {
        this.ask('いまの ぼうけんのしょは、つぎの きろくで うわがきされます。\nあたらしく はじめますか?',
          () => this.newGame(), () => { this.state = 'title'; this.titleSel = 1; });
      } else if (!this.load()) this.newGame();
    }
  },

  updateOpening() {
    const pages = this.openingPages();
    if (Input.pressed('ok') || Input.pressed('cancel')) {
      AudioSys.sfx('ok');
      this.openingPage++;
      if (this.openingPage >= pages.length) {
        this.state = 'field';
        this.playFieldMusic();
        this.showDialog([
          'むらおさ「ソラよ。ゆけ。」',
          '「まずは 40かいの あけぼのの門まで――」',
          '「よっつの まもりを こえ、とうに あさを とりもどすのじゃ。」',
          '(むらの みんなに はなしを きいてから でかけよう。きたの かいだんから うえへ いける。)',
        ]);
      }
    }
  },

  // 長い文章を描画幅で折り返し、段落をまたいで枠外へ出ないページへ組み直す。
  // 論理解像度で測るため、PC・スマホの表示倍率が変わっても同じ配置になる。
  openingPages() {
    if (this._openingPages) return this._openingPages;
    const g = this.g;
    const maxWidth = 340;
    const maxRows = 5;
    const paragraphs = [];
    let paragraph = [];
    g.save();
    g.font = `16px ${UI.FONT}`;
    const flushParagraph = () => {
      if (paragraph.length) paragraphs.push(paragraph);
      paragraph = [];
    };
    for (const raw of OPENING_TEXT) {
      if (!raw) { flushParagraph(); continue; }
      let line = '';
      for (const ch of raw) {
        const next = line + ch;
        if (line && g.measureText(next).width > maxWidth) {
          // 空白区切りの語は途中で割らず、句読点だけの行も作らない。
          const space = line.lastIndexOf(' ');
          if (space > 0) {
            paragraph.push(line.slice(0, space).trimEnd());
            line = line.slice(space + 1) + (ch === ' ' ? '' : ch);
          } else if ('、。！？）」』】'.includes(ch) && Array.from(line).length > 1) {
            const chars = Array.from(line);
            line = chars.pop() + ch;
            paragraph.push(chars.join('').trimEnd());
          } else {
            paragraph.push(line.trimEnd());
            line = ch === ' ' ? '' : ch;
          }
        } else line = next;
      }
      if (line) paragraph.push(line.trimEnd());
    }
    flushParagraph();
    g.restore();

    const pages = [];
    let page = [];
    const finishPage = () => {
      if (page.length) pages.push(page);
      page = [];
    };
    for (const rows of paragraphs) {
      let rest = [...rows];
      if (page.length && page.length + 1 + rest.length <= maxRows) {
        page.push('', ...rest);
        continue;
      }
      if (page.length) finishPage();
      while (rest.length > maxRows) pages.push(rest.splice(0, maxRows));
      page = rest;
    }
    finishPage();
    this._openingPages = pages.length ? pages : [[]];
    return this._openingPages;
  },

  // ---------- フィールド ----------
  updateField(dt) {
    this.updateTownNpcs(dt);
    // 移動アニメーション
    if (this.moving) {
      this.walkAnimT += dt;
      this.moveT += dt * 4.4;
      if (this.moveT >= 1) {
        this.moveT = 1; this.moving = false; this.ox = 0; this.oy = 0;
        this.moveFromDir = this.dir;
        this.onStep();
      } else {
        const d = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] }[this.dir];
        const eased = this.fieldMoveEase(this.moveT);
        this.ox = d[0] * (eased - 1) * 32;
        this.oy = d[1] * (eased - 1) * 32;
      }
      return;
    }

    if (Input.pressed('cancel')) { this.openMenu(); return; }
    if (Input.pressed('ok')) { this.interact(); return; }

    let dir = null;
    if (Input.held('up')) dir = 'u';
    else if (Input.held('down')) dir = 'd';
    else if (Input.held('left')) dir = 'l';
    else if (Input.held('right')) dir = 'r';
    if (!dir) return;
    const fromDir = this.dir;
    this.dir = dir;
    const d = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] }[dir];
    const nx = this.px + d[0], ny = this.py + d[1];
    if (Maps.walkable(this.map, nx, ny)) {
      if (!this.partyPath) this.resetPartyPath();
      this.partyPathFrom = this.partyPath.map(p => ({ ...p }));
      this.partyPath = [{ x: nx, y: ny, dir }, ...this.partyPath].slice(0, 4);
      this.px = nx; this.py = ny;
      this.moving = true; this.moveT = 0; this.moveFromDir = fromDir;
      this.ox = -d[0] * 32; this.oy = -d[1] * 32;
    }
  },

  updateTownNpcs(dt) {
    if (!this.map || (!this.map.town && !this.map.settlement)) return;
    const occupiedByParty = (x, y) => {
      if (x === this.px && y === this.py) return true;
      return (this.partyPath || []).slice(1, 4).some(p => p.x === x && p.y === y);
    };
    for (const n of this.map.npcs) {
      if (!n.wander || n.event || n.behindCounter) continue;
      if (n.npcMoving) {
        n.npcMoveT += dt * 2.65;
        if (n.npcMoveT >= 1) {
          n.npcMoveT = 1; n.npcMoving = false;
          n.npcWait = 1.2 + Math.random() * 2.8;
        }
        continue;
      }
      // 主人公の近くでは立ち止まり、話しかけやすさを優先する。
      if (Math.abs(n.x - this.px) + Math.abs(n.y - this.py) <= 2) {
        n.npcWait = Math.max(n.npcWait || 0, .45); continue;
      }
      n.npcWait = (n.npcWait || 0) - dt;
      if (n.npcWait > 0) continue;
      const dirs = [
        { id: 'l', dx: -1, dy: 0 }, { id: 'r', dx: 1, dy: 0 },
        { id: 'u', dx: 0, dy: -1 }, { id: 'd', dx: 0, dy: 1 },
      ];
      // 同じ方向へ進みやすくし、毎回ふらふら向きが変わるのを防ぐ。
      dirs.sort((a, b) => (a.id === n.dir ? -1 : b.id === n.dir ? 1 : Math.random() - .5));
      const radius = n.wanderRadius || 2;
      const next = dirs.find(d => {
        const nx = n.x + d.dx, ny = n.y + d.dy;
        if (Math.abs(nx - n.homeX) + Math.abs(ny - n.homeY) > radius) return false;
        // 1Fの池畔にいる男性は、描き下ろし背景の岸沿いだけを往復する。
        if (this.floor === 1 && n.homeX === 12 && n.homeY === 9
          && (ny !== 9 || nx < 10 || nx > 12)) return false;
        if (occupiedByParty(nx, ny) || !Maps.walkable(this.map, nx, ny)) return false;
        if (this.map.entry && Math.abs(nx - this.map.entry.x) + Math.abs(ny - this.map.entry.y) <= 1) return false;
        if (this.map.exit && Math.abs(nx - this.map.exit.x) + Math.abs(ny - this.map.exit.y) <= 1) return false;
        return true;
      });
      if (!next) { n.npcWait = .8 + Math.random() * 1.5; continue; }
      n.npcFromX = n.x; n.npcFromY = n.y; n.npcFromDir = n.dir || next.id;
      n.x += next.dx; n.y += next.dy; n.dir = next.id;
      n.npcMoveT = 0; n.npcMoving = true;
    }
  },

  onStep() {
    const t = this.map.tiles[this.py][this.px];
    const T = Art.T;
    const floorWarp = this.map.floorWarps && this.map.floorWarps.find(w => w.x === this.px && w.y === this.py);
    if (floorWarp) { this.triggerFloorWarp(floorWarp); return; }
    if (this.map.chapterGate && this.map.chapterGate.x === this.px && this.map.chapterGate.y === this.py) {
      this.showChapterClear(); return;
    }
    const pit = this.map.pitfalls && this.map.pitfalls.find(p => p.x === this.px && p.y === this.py);
    if (pit && !this.flags[pit.id]) { this.triggerPitfall(pit); return; }
    // 階段
    if (this.ignoreStairs && (this.ignoreStairs.x !== this.px || this.ignoreStairs.y !== this.py)) {
      this.ignoreStairs = null;
    }
    if (!this.ignoreStairs) {
      if (t === T.UP) { this.changeFloor(1); return; }
      if (t === T.DOWN) { this.changeFloor(-1); return; }
    }
    this.steps++;
    // 毒
    if (this.steps % 4 === 0) {
      for (const m of this.party) if (m.poison && m.hp > 1) m.hp--;
    }
    // エンカウント
    const inSafeZone = this.map.safeZones && this.map.safeZones.some(z => this.px >= z.x && this.px < z.x + z.w && this.py >= z.y && this.py < z.y + z.h);
    if (!this.map.safe && !inSafeZone) {
      if (this.repel > 0) { this.repel--; return; }
      this.encounterDistance--;
      if (this.encounterDistance <= 0) this.startRandomBattle();
    }
  },

  startRandomBattle() {
    const table = ENCOUNTERS[this.map.tier];
    if (!table || !table.length) return;
    const pick = () => {
      const total = table.reduce((s, e) => s + e[1], 0);
      let r = Math.random() * total;
      for (const [sp, w] of table) { r -= w; if (r <= 0) return sp; }
      return table[0][0];
    };
    const specs = [];
    const sp1 = pick();
    const maxN = this.floor <= 4 ? 1 : this.map.tier <= 1 ? 2 : this.map.tier <= 3 ? 3 : 2;
    const n1 = 1 + Math.floor(Math.random() * maxN);
    for (let i = 0; i < n1; i++) specs.push(sp1);
    if (this.map.tier >= 2 && Math.random() < 0.35 && specs.length < 3) specs.push(pick());
    this.state = 'battle';
    Battle.start({
      enemySpecs: specs, boss: false,
      onEnd: r => this.onBattleEnd(r),
    });
  },

  triggerPitfall(pit) {
    this.flags[pit.id] = true;
    this.moving = false; this.ox = 0; this.oy = 0;
    AudioSys.sfx('cancel');
    this.showDialog([
      'ミシ……。あしもとの ひびが おおきく ひろがった!',
      'ソラ「みんな、はなれ――」',
      'ゆかが くずれた!',
    ], () => {
      this.state = 'falling';
      this.fallEvent = { pit: { ...pit }, t: 0, transitioning: false };
      AudioSys.sfx('stairs');
    });
  },

  triggerFloorWarp(warp) {
    this.moving = false; this.ox = 0; this.oy = 0;
    AudioSys.sfx('spell');
    this.showDialog(['ゆかの もんようが ひかりはじめた。', 'うえへ ひきあげる ちからを かんじる……。'], () => {
      this.fadeTo(() => {
        this.loadFloor(warp.targetFloor, null);
        const target = this.map[warp.targetKey] || this.map.entry;
        this.px = target.x; this.py = target.y; this.dir = 'd';
        this.ignoreStairs = null; this.resetPartyPath();
        this.encounterDistance = this.rollEncounterDistance(false);
        this.state = 'field'; this.playFieldMusic();
        this.showDialog(['14かいへ もどってきた。', 'くずれた あなには ふるい いたが わたされている。']);
      });
    });
  },

  updateFalling(dt) {
    if (!this.fallEvent) { this.state = 'field'; return; }
    this.fallEvent.t += dt;
    if (this.fallEvent.t >= 1.25 && !this.fallEvent.transitioning) {
      this.fallEvent.transitioning = true;
      const event = this.fallEvent;
      this.fadeTo(() => {
        this.loadFloor(event.pit.targetFloor, null);
        const arrival = this.map[event.pit.targetKey] || this.map.entry;
        this.px = arrival.x; this.py = arrival.y; this.dir = 'd';
        this.ignoreStairs = null; this.resetPartyPath();
        this.encounterDistance = this.rollEncounterDistance(false);
        this.fallEvent = null; this.state = 'field'; this.playFieldMusic();
        this.showDialog([
          `……${event.pit.targetFloor}かいまで おちてしまった。`,
          'ふしぎな へやだ。ふつうの かいだんからは はいれそうにない。',
          '(14かいの あなには いたが わたされ、つぎからは あんぜんに とおれる。)',
        ]);
      });
    }
  },

  onBattleEnd(r) {
    if (r.kind === 'defeat') { this.gameOver(); return; }
    this.encounterDistance = this.rollEncounterDistance(false);
    this.state = 'field';
    this.playFieldMusic();
  },

  gameOver() {
    this.state = 'gameover';
    this.gameoverT = 0;
    AudioSys.playMusic('gameover');
  },

  updateGameover() {
    this.gameoverT = (this.gameoverT || 0) + 1 / 60;
    if (this.gameoverT > 1.5 && (Input.pressed('ok'))) {
      // 最後の宿場で復活
      this.gold = Math.floor(this.gold / 2);
      for (const m of this.party) { m.hp = m.maxhp; m.mp = m.maxmp; m.poison = false; }
      this.loadFloor(this.lastInn, null);
      const wake = this.map.restSpawn || this.map.entry;
      this.px = wake.x; this.py = wake.y; this.dir = 'u';
      this.ignoreStairs = null;
      this.resetPartyPath();
      this.state = 'field';
      this.playFieldMusic();
      this.save();
      this.showDialog(['……めが さめた。', 'やどばの ひとが かいほうして くれたようだ。', '(しょじきんが はんぶんに なってしまった)']);
    }
  },

  // ---------- しらべる/はなす ----------
  interact() {
    const d = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] }[this.dir];
    const fx = this.px + d[0], fy = this.py + d[1];
    const T = Art.T;

    // NPC
    let npc = this.map.npcs.find(n => n.x === fx && n.y === fy);
    // 歩き始めた直後の町人は、見た目がまだ出発マスに近い。
    // その出発マスへ話しかけた場合も反応させ、会話位置へ自然に戻す。
    if (!npc) {
      npc = this.map.npcs.find(n => n.npcMoving && n.npcFromX === fx && n.npcFromY === fy);
      if (npc) { npc.x = npc.npcFromX; npc.y = npc.npcFromY; }
    }
    if (npc) {
      npc.npcMoving = false; npc.npcMoveT = 1; npc.npcWait = 1.8;
      npc.dir = { u: 'd', d: 'u', l: 'r', r: 'l' }[this.dir] || npc.dir;
      this.talkTo(npc); return;
    }
    // カウンター越しのNPC
    if (fx >= 0 && fy >= 0 && fy < this.map.h && fx < this.map.w && this.map.tiles[fy][fx] === T.COUNTER) {
      const npc2 = this.map.npcs.find(n => n.x === fx + d[0] * 0 && n.y === fy - 1 && n.behindCounter);
      const npc3 = this.map.npcs.find(n => Math.abs(n.x - fx) <= 0 && n.y === fy - 1);
      const found = npc2 || npc3;
      if (found) { this.talkTo(found); return; }
    }

    // 宝箱
    const chest = this.map.chests.find(c => c.x === fx && c.y === fy);
    if (chest && this.map.tiles[fy][fx] === T.CHEST) {
      this.openChest(chest);
      return;
    }
    // セツナの手記
    if (this.map.journalAt && this.map.journalAt.x === fx && this.map.journalAt.y === fy) {
      this.readJournal();
      return;
    }
    // 立て札
    if (this.map.flavorAt && this.map.flavorAt.x === fx && this.map.flavorAt.y === fy) {
      this.showDialog(this.map.flavorAt.lines);
      return;
    }
    const flavorSpot = this.map.flavorSpots && this.map.flavorSpots.find(s => s.x === fx && s.y === fy);
    if (flavorSpot) { this.showDialog(flavorSpot.lines); return; }
    const storySpot = this.map.storySpots && this.map.storySpots.find(s => s.x === fx && s.y === fy);
    if (storySpot) { this.storySpotEvent(storySpot.event); return; }
  },

  storySpotEvent(event) {
    if (event === 'guardian_record_8' || event === 'fallen_climber_9') {
      this.guardianPreludeEvent(event); return;
    }
    if (event === 'sky_sea_16') this.skySeaMemoryEvent();
  },

  guardianPreludeEvent(event) {
    const monster = this.party.find(m => m.kind === 'monster');
    if (event === 'guardian_record_8') {
      const first = !this.flags.story_guardian_8;
      const lines = first ? [
        'ひびわれた せきばんに、ばんにんの ちかいが きざまれている。',
        '『われ ガーディオ。ちからなきものを うえへ とおさない。』',
        '『こばむためではない。みちの さきで、いのちを うしなわせないために。』',
        'いちばん したには、あとから ほられた もじがある。',
        '『それでも のぼるものには、わが すべてを もって こたえる。』',
      ] : [
        'ガーディオの ちかいが きざまれた せきばんだ。',
        '「とおさない」という ことばは、おどしではなく いのりのように みえる。',
      ];
      if (monster) lines.push(`${monster.name}は せきばんの まえで しずかに すわった。`);
      if (first) {
        this.flags.story_guardian_8 = true;
        lines.push('(ガーディオは、のぼりてを にくんでいるわけではないようだ。)');
      }
      this.showDialog(lines);
      return;
    }
    if (event === 'fallen_climber_9') {
      const first = !this.flags.story_guardian_9;
      const lines = first ? [
        'こわれた よろいと、ちいさな てちょうが そなえられている。',
        '『ガーディオは わたしたちを 3ど たすけてくれた。』',
        '『4どめ、わたしたちは かれの けいこくを きかなかった。』',
        '『なかまを うしなったのは かれの せいではない。どうか つたえてほしい。』',
        'てちょうの となりに、あおい いしの かけらが のこされていた。',
      ] : [
        'まえの のぼりてが のこした 墓標だ。',
        'ガーディオへ あてた ことばは、まだ とどいていない。',
      ];
      if (monster) lines.push(`${monster.name}は はかじるしに はなを よせ、ちいさく ないた。`);
      if (first) {
        this.flags.story_guardian_9 = true;
        this.addItem('mamoritane', 1);
        AudioSys.sfx('chest');
        lines.push('(「まもりのたね」を みつけた!)');
        lines.push('ソラ「……ぼくが つたえる。たたかうことに なっても。」');
      }
      this.showDialog(lines);
    }
  },

  skySeaMemoryEvent() {
    const first = !this.flags.story_sky_sea_16;
    const lines = first ? [
      'すいしょうの ちゅうに ふれると、あたまの うえの うみが ひかりだした。',
      'しらない せかいの こえ『わたしたちの ほしでは、うみが そらを ながれていた。』',
      '『ほしばみの きりが せかいを のみこむ まえ、アルカは この けしきを きおくした。』',
      '『せかいを すくえなくても、そこに いきた しょうこだけは うしなわないように。』',
      'リノ「ここは まぼろしじゃない。だれかが ほんとうに みた そらなのね……。」',
    ] : [
      'すいしょうの なかで、さかさまの うみが ゆっくり ながれている。',
      'ここは ほろびた せかいの きおくを のこすための かいそうだ。',
    ];
    const monster = this.party.find(m => m.kind === 'monster');
    if (monster) lines.push(`${monster.name}は うえを およぐ さかなを めで おいかけている。`);
    if (first) {
      this.flags.story_sky_sea_16 = true;
      this.addItem('manadrop', 1);
      AudioSys.sfx('spell');
      lines.push('すいしょうから しずくが こぼれ、「マナのしずく」になった!');
      lines.push('(アルカの塔は、いくつもの せかいの きおくを あつめている。)');
    }
    this.showDialog(lines);
  },

  journalCount() {
    return Object.keys(this.flags).filter(k => k.startsWith('journal_')).length;
  },

  readJournal() {
    const flagK = 'journal_' + this.floor;
    const first = !this.flags[flagK];
    const lines = [...SETSUNA_JOURNALS[this.floor]];
    if (first) {
      this.flags[flagK] = true;
      AudioSys.sfx('chest');
      const n = this.journalCount();
      lines.push(`(セツナの てがきを みつけた! ${n}/10)`);
      if (n === 10) lines.push('(すべての てがきが そろった。セツナの こえが きこえた きがする……)');
    }
    this.showDialog(lines);
  },

  talkTo(npc) {
    // 向き合う
    if (npc.bossEvent) { this.startBossEvent(npc.bossEvent); return; }
    if (npc.event === 'inn') { this.innEvent(); return; }
    if (npc.event === 'shop_items') { this.openShop('items'); return; }
    if (npc.event === 'shop_equip') { this.openShop('equip'); return; }
    if (npc.event === 'camp_rest') { this.campRestEvent(); return; }
    if (npc.event === 'camp_story') { this.campStoryEvent(); return; }
    if (npc.event === 'lake_story_18') { this.lakeStoryEvent(); return; }
    if (npc.event === 'rescue_merchant_24') { this.merchantRescueEvent(); return; }
    if (npc.event === 'thief_story_27') { this.thiefStoryEvent(); return; }
    if (npc.event === 'false_home_34') { this.falseHomeEvent(); return; }
    if (npc.event === 'dream_story_37') { this.dreamStoryEvent(); return; }
    if (npc.event === 'jobchange') { this.openJobChange(); return; }
    if (npc.event && npc.event.startsWith('join_')) { this.joinEvent(npc.event); return; }
    if (npc.lines) this.showDialog(npc.lines, null, npc.spr);
  },

  campRestEvent() {
    const first = !this.flags.camp_7_met;
    this.flags.camp_7_met = true;
    const intro = first ? [
      'ばんにん「おっ、のぼりてか。ここは おれたちの やすみばだ。」',
      '「この へやでは まものも ひに ちかづかない。すこし やすんでいけ。」',
    ] : ['ばんにん「また きたな。ひは まだ きえていないぞ。」'];
    this.showDialog(intro, () => {
      this.ask('たきびの そばで やすみますか?', () => {
        this.fadeTo(() => {
          for (const m of this.party) { m.hp = m.maxhp; m.mp = m.maxmp; m.poison = false; m.sleep = 0; }
          this.encounterDistance = this.rollEncounterDistance(false);
          this.flags.camp_7_rested = true;
          AudioSys.sfx('heal');
          this.save();
          this.showDialog(['パチパチと まきの はぜる おとがする……。', '(みんなの HPとMPが かいふくした!)']);
        });
      }, () => this.showDialog(['ばんにん「むりは するなよ。ひは いつでも あいている。」']));
    });
  },

  campStoryEvent() {
    const lines = [
      'ちょうさたい「この いしずえの かいそうは、むかし ひとの まちだったらしい。」',
      '「ガーディオは みちを ふさぐ まものじゃない。のぼるものを ためしているんだ。」',
    ];
    if (this.party.some(m => m.kind === 'human' && m.id === 'rino')) {
      lines.push('リノ「ためすために たたかうなんて……でも、まもりたいものが あるのかも。」');
    }
    const monster = this.party.find(m => m.kind === 'monster');
    if (monster) lines.push(`ちょうさたい「${monster.name}も ひの そばでは おとなしいんだな。」`);
    if (!this.flags.camp_7_story) {
      this.flags.camp_7_story = true;
      lines.push('(ガーディオは ただの てきではないようだ。)');
    }
    this.showDialog(lines);
  },

  lakeStoryEvent() {
    const first = !this.flags.story_lake_town_18;
    const lines = first ? [
      'みずべの長「ここは ミズベ。とうの なかの うみに、いかだを つないで できた町じゃ。」',
      '「町は もともと 11かいに あった。だが みずが みちを のみ、ここまで ながされてきた。」',
      '「20かいの アクエラは、あふれる きおくを ひとりで せきとめておる。」',
      '「たおすだけでは みずは しずまぬ。なぜ ないているのか、その こえを きいておくれ。」',
    ] : [
      'みずべの長「みずは ものを うつす。だが、うつった ものが すべて ほんものとは かぎらん。」',
      '「34かいで ふるさとを みても、すぐに てを のばしては ならぬぞ。」',
    ];
    const waterAlly = this.party.find(m => m.kind === 'monster' && ['aquan', 'slimeblue'].includes(m.id));
    if (waterAlly) lines.push(`${waterAlly.name}は みずべの長の ことばに あわせ、しずかに からだを ゆらした。`);
    if (first) {
      this.flags.story_lake_town_18 = true;
      this.addItem('kaerihane', 1);
      this.save();
      AudioSys.sfx('chest');
      lines.push('みずべの長「かえりのはねを もってゆけ。かえる ばしょを わすれぬためにな。」');
      lines.push('(「かえりのはね」を てにいれた!)');
    }
    this.showDialog(lines, null, 'elder');
  },

  merchantRescueEvent() {
    if (this.flags.rescued_merchant_24) {
      this.showDialog(['しょうにんを とらえていた おりは、からっぽになっている。']);
      return;
    }
    const lines = [
      'しょうにん「た、たすかった! ぬすびとに さらわれたと おもったら、まものの しわざだったんだ。」',
      '「にもつを おとりに して ここまで にげたけど、この おりに とじこめられて……。」',
      '「27かいの ネグラへ いく。あそこなら けがにんも まものも、おなじ たきびで やすめるからな。」',
    ];
    const monster = this.party.find(m => m.kind === 'monster');
    if (monster) lines.push(`しょうにん「${monster.name}も いっしょか。よし、ほしにくは おおめに しいれておくよ。」`);
    this.showDialog(lines, () => {
      this.flags.rescued_merchant_24 = true;
      this.gold += 150;
      this.addItem('hoshiniku', 1);
      if (this.map.rescueSite) this.map.rescueSite.rescued = true;
      this.map.npcs = this.map.npcs.filter(n => n.event !== 'rescue_merchant_24');
      this.save();
      AudioSys.sfx('chest');
      this.showDialog([
        'しょうにん「これは おれいだ。27かいで また あおう!」',
        '(150ゴールドと「ほしにく」を てにいれた!)',
        '(27かいの ネグラに どうぐやが ひらかれるようになった。)',
      ], null, 'merchant');
    }, 'merchant');
  },

  thiefStoryEvent() {
    const first = !this.flags.story_thief_town_27;
    const lines = first ? [
      'ネグラの頭「ここじゃ うまれも しごとも きかない。だれと たきびを かこめるか、それだけだ。」',
      '「ドロンゾも むかしは ここの なかまだった。とうに すてられた ものを ひろい、町へ くばっていた。」',
      '「だが 30かいで、塔の『砂の試練』に のみこまれた。うばうものと まもるものの くべつを なくしたんだ。」',
      '「もし あいつが まだ なまえを おぼえていたら、ドロンゾと よんでやってくれ。」',
    ] : [
      'ネグラの頭「ぬすむことより、なにを のこすかの ほうが むずかしい。」',
      '「おまえは 40かいまでに、なにを のこす?」',
    ];
    if (this.flags.rescued_merchant_24) lines.push('ネグラの頭「しょうにんを つれてかえってくれたな。町の みんなが たすかった。」');
    const monster = this.party.find(m => m.kind === 'monster');
    if (monster) lines.push(`ネグラの頭「${monster.name}、おまえにも ここで つかう なまえが ある。りっぱな 町の なかまだ。」`);
    if (first) {
      this.flags.story_thief_town_27 = true;
      this.addItem('chikaratane', 1);
      this.save();
      AudioSys.sfx('chest');
      lines.push('ネグラの頭「これは 町の たからだ。ドロンゾに あうまで あずける。」');
      lines.push('(「ちからのたね」を てにいれた!)');
    }
    this.showDialog(lines, null, 'guard');
  },

  falseHomeEvent() {
    const first = !this.flags.story_false_home_34;
    const lines = first ? [
      'むらおさ「ソラよ。よく もどった。もう とうへ いかなくてよい。」',
      '「ガーディオも アクエラも ドロンゾも、さいしょから いなかったのじゃ。」',
      '「なかまも ぼうけんも わすれ、ここで いつもの あさを くりかえそう。」',
      'ソラ「……ちがう。ぼくの村の あさは、こんなに しずかじゃない。」',
      'ソラ「だれかが パンを こがして、こどもが はしって、まものだって いびきを かく。」',
    ] : [
      'むらおさの すがたを した きおくが たっている。',
      'もう「かえってこい」とは いわない。ただ、ソラたちの あしおとを きいている。',
    ];
    if (this.party.some(m => m.kind === 'human' && m.id === 'rino')) lines.push('リノ「きれいすぎる おもいでは、だれかが けずった おもいでよ。わたしたちは すすもう。」');
    const monster = this.party.find(m => m.kind === 'monster');
    if (monster) lines.push(`${monster.name}が ひとこえ なくと、にせものの いえに ひびが はいった。`);
    if (first) {
      this.flags.story_false_home_34 = true;
      this.map.falseHomeAwake = true;
      this.addItem('fushigimi', 1);
      this.save();
      AudioSys.sfx('spell');
      lines.push('にせものの あさが くだけ、なかから ひとつの きのみが ころがりでた。');
      lines.push('(「ふしぎのきのみ」を てにいれた!)');
      lines.push('(ほんとうの ふるさとは、きれいな けしきではなく だれかと すごした じかんの なかにある。)');
    }
    this.showDialog(lines, null, 'elder');
  },

  dreamStoryEvent() {
    const first = !this.flags.story_dream_town_37;
    const lines = first ? [
      'ゆめもり「ここは ネムリ。40かいへ いくものが、いちどだけ ほんねを おいていく町。」',
      '「よわい こころを すてるのではない。こわいと いえる こころを つれていくのです。」',
      'ソラ「ぼくは こわい。40かいで まけることより、みんなを かえせなくなることが。」',
    ] : [
      'ゆめもり「こわさを ことばに できたなら、もう それだけに しはいされることは ありません。」',
      '「あさは すぐ そこです。」',
    ];
    for (const member of this.party.slice(1)) {
      if (member.kind === 'human' && member.id === 'rino') lines.push('リノ「わたしは、しんじた ひとが また いなくなるのが こわい。だから こんどは となりを あるく。」');
      else if (member.kind === 'human' && member.id === 'gald') lines.push('ガルド「おれは まもれないことが こわい。だから まもるだけじゃなく、たよることも おぼえる。」');
      else if (member.kind === 'human' && member.id === 'fio') lines.push('フィオ「わたしは ほんとうを しるのが こわい。でも、しらないまま だれかを きずつけるほうが こわい。」');
      else if (member.kind === 'monster') lines.push(`${member.name}は ソラの てに からだを よせた。ことばの かわりに、あたたかさを のこした。`);
    }
    if (first) {
      this.flags.story_dream_town_37 = true;
      for (const m of [...this.party, ...this.reserve]) {
        m.hp = m.maxhp; m.mp = m.maxmp; m.poison = false; m.sleep = 0;
      }
      this.addItem('inochimi', 1);
      this.save();
      AudioSys.sfx('heal');
      lines.push('ゆめもり「では、みなさんの あしたを おかえしします。」');
      lines.push('(みんなの HPとMPが かいふくし、「いのちのきのみ」を てにいれた!)');
    }
    this.showDialog(lines, null, 'elder');
  },

  // ---------- 転職 ----------
  openJobChange() {
    const intro = this.flags.jobintro
      ? ['みこ「こころの みちを かえますか?」']
      : ['みこ「わたしは みちびきの みこ。こころの みちを しめすもの。」',
         '「ひとは こころの もちようを かえれば、あたらしい じぶんに なれます。」',
         '「ただし みちを かえれば、つみかさねた けいけんは いちど まっさらに。」',
         '「それでも じゅもんの きおくと、きたえた からだの いちぶは のこるでしょう。」'];
    this.flags.jobintro = true;
    this.showDialog(intro, () => {
      this.state = 'jobchange';
      this.jobUI = { step: 'member', sel: 0 };
    });
  },

  updateJobChange() {
    const ui = this.jobUI;
    const backToUI = () => { this.state = 'jobchange'; };
    if (ui.step === 'member') {
      const list = this.party.filter(p => p.kind === 'human');
      if (Input.pressed('up')) { ui.sel = (ui.sel + list.length - 1) % list.length; AudioSys.sfx('cursor'); }
      if (Input.pressed('down')) { ui.sel = (ui.sel + 1) % list.length; AudioSys.sfx('cursor'); }
      if (Input.pressed('cancel')) { AudioSys.sfx('cancel'); this.state = 'field'; return; }
      if (Input.pressed('ok')) {
        AudioSys.sfx('ok');
        const mem = list[ui.sel];
        if (mem.id === 'hero') {
          this.showDialog(['みこ「のぼりての さだめは とうに えらばれしもの。」', '「その みちを かえることは わたしにも できません。」'], backToUI);
        } else if (mem.level < 12) {
          this.showDialog([`みこ「${mem.name}は まだ みちなかば(レベル12いじょうで てんしょくできます)。」`], backToUI);
        } else {
          ui.member = mem; ui.step = 'job'; ui.sel = 0;
        }
      }
      return;
    }
    // 職業選択
    // 50F以降で開く「けんじゃ」は、40F完結版の選択肢には表示しない。
    const jobs = JOB_ORDER.filter(key => key !== 'sage');
    if (Input.pressed('up')) { ui.sel = (ui.sel + jobs.length - 1) % jobs.length; AudioSys.sfx('cursor'); }
    if (Input.pressed('down')) { ui.sel = (ui.sel + 1) % jobs.length; AudioSys.sfx('cursor'); }
    if (Input.pressed('cancel')) { AudioSys.sfx('cancel'); ui.step = 'member'; ui.sel = 0; return; }
    if (Input.pressed('ok')) {
      const key = jobs[ui.sel];
      const job = JOBS[key];
      const mem = ui.member;
      if (job.needFlag && !this.flags[job.needFlag]) {
        AudioSys.sfx('cancel');
        this.showDialog(['みこ「その みちは まだ とざされています。」', '「50かいの いしぶみの しんじつに ふれたとき ひらかれるでしょう。」'], backToUI);
        return;
      }
      if (mem.job === key) {
        AudioSys.sfx('cancel');
        this.showDialog([`みこ「${mem.name}は すでに ${job.name}の みちを あゆんでいます。」`], backToUI);
        return;
      }
      AudioSys.sfx('ok');
      const nextLevel = Math.max(5, Math.floor(mem.level * 0.7));
      this.ask(`${mem.name}を ${job.name}に てんしょくさせる。\nレベルは ${nextLevel}に なる(じゅもんと ちからの いちぶは のこる)。よいですか?`, () => {
        const learned = Chars.changeJob(mem, key);
        AudioSys.sfx('levelup');
        const lines = [`${mem.name}は ${job.name}に なった!`,
          `(レベルは ${mem.level}になり、きたえた ちからの いちぶも たくわえとして のこっている)`];
        for (const s of learned) lines.push(`${mem.name}は ${SPELLS[s].name}を おもいだした!`);
        this.showDialog(lines);
      }, () => {
        this.showDialog(['みこ「こころの ままに。」']);
      });
    }
  },

  drawJobChange(g) {
    const ui = this.jobUI;
    if (ui.step === 'member') {
      const list = this.party.filter(p => p.kind === 'human');
      UI.window(g, 8, 8, 320, 44 + list.length * 44);
      UI.text(g, 'だれの みちを かえますか?', 24, 34, '#ffd', 14);
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        UI.text(g, p.name, 46, 62 + i * 44, i === ui.sel ? '#fff' : '#aab', 16);
        UI.text(g, `Lv${p.level}  ${Chars.jobNameOf(p)}`, 150, 62 + i * 44, '#9ab', 13);
      }
      UI.cursor(g, 24, 50 + ui.sel * 44, 'right');
      return;
    }
    const jobs = JOB_ORDER.filter(key => key !== 'sage');
    UI.window(g, 8, 8, 300, 44 + jobs.length * 26);
    UI.text(g, `${ui.member.name}の あたらしい みち`, 24, 34, '#ffd', 14);
    for (let i = 0; i < jobs.length; i++) {
      const job = JOBS[jobs[i]];
      const locked = job.needFlag && !this.flags[job.needFlag];
      UI.text(g, locked ? '???' : job.name, 46, 62 + i * 26, i === ui.sel ? '#fff' : (locked ? '#667' : '#aab'), 15);
    }
    UI.cursor(g, 24, 50 + ui.sel * 26, 'right');
    const sel = JOBS[jobs[ui.sel]];
    const lockedSel = sel.needFlag && !this.flags[sel.needFlag];
    UI.window(g, 8, 380, 496, 60);
    UI.text(g, lockedSel ? 'まだ とざされた みち……' : sel.desc, 26, 415, '#dde', 14);
  },

  openChest(chest) {
    AudioSys.sfx('chest');
    this.flags[chest.id] = true;
    this.map.tiles[chest.y][chest.x] = Art.T.CHEST_OPEN;
    const loot = CHEST_LOOT[chest.tier];
    const item = loot[Math.floor(Math.random() * loot.length)];
    if (item.startsWith('gold:')) {
      const gld = parseInt(item.slice(5));
      this.gold += gld;
      this.showDialog([`たからばこを あけた!`, `${gld}ゴールドを てにいれた!`]);
    } else {
      this.addItem(item);
      this.showDialog([`たからばこを あけた!`, `${ITEMS[item].name}を てにいれた!`]);
    }
  },

  innEvent() {
    const shop = SHOPS[this.floor] || SHOPS[this.map.shopFloor] || { inn: 10 };
    const price = shop.inn;
    this.ask(`やどや「いらっしゃい! ひとばん ${price}ゴールドだよ。とまっていくかい?」`, () => {
      if (this.gold < price) { this.showDialog(['やどや「おや おかねが たりないよ。」']); return; }
      this.gold -= price;
      AudioSys.stopMusic();
      this.fadeTo(() => {
        for (const m of [...this.party, ...this.reserve]) { m.hp = m.maxhp; m.mp = m.maxmp; m.poison = false; }
        AudioSys.sfx('heal');
        this.save();
      });
      setTimeout(() => {
        this.playFieldMusic();
        this.showDialog(['やどや「おはよう! きょうも いい ひに なりそうだ。」', '(みんなの HPと MPが かいふくした!)']);
      }, 700);
    });
  },

  joinEvent(ev) {
    const je = JOIN_EVENTS[ev];
    if (!je || this.flags[je.flag]) return;
    this.showDialog(je.lines, () => {
      this.flags[je.flag] = true;
      const levels = { rino: 5, gald: 14, fio: 24 };
      const lvl = Math.max(levels[je.who] || 1, this.recruitLevel() - 1);
      const member = Chars.makeHuman(je.who, lvl);
      AudioSys.sfx('join');
      if (this.party.length < 4) {
        this.party.push(member);
        this.loadFieldCharacter(member.id);
        this.resetPartyPath();
        this.showDialog([je.joined]);
      } else {
        this.reserve.push(member);
        this.showDialog([je.joined, `${member.name}は ひかえで まっている。`]);
      }
      // マップを丸ごと再生成せず加入NPCだけ消し、町人の徘徊原点を保持する。
      this.map.npcs = this.map.npcs.filter(n => n.event !== ev);
      this.save();
    });
  },

  // ---------- ボスイベント ----------
  startBossEvent(floor) {
    const be = BOSS_EVENTS[floor];
    if (!be || this.flags[be.flag]) return;
    if (be.music) AudioSys.playMusic(be.music);
    this.showDialog(be.before, () => {
      this.state = 'battle';
      Battle.start({
        enemySpecs: [be.boss], boss: true, finalBoss: floor === 100,
        onEnd: r => {
          if (r.kind === 'defeat') { this.gameOver(); return; }
          this.flags[be.flag] = true;
          this.grantBossReward(be);
          this.state = 'field';
          this.save();
          if (floor === 100) { this.finale(); return; }
          AudioSys.playMusic('town');
          this.showDialog(be.after, () => {
            this.map = Maps.build(this.floor, this.flags);
            if (floor === 40) this.showChapterClear();
            else this.playFieldMusic();
          });
        },
      });
    });
  },

  grantBossReward(be) {
    const reward = be && be.reward;
    if (!reward) return;
    const flag = `reward_${be.flag}`;
    if (this.flags[flag]) return;
    this.flags[flag] = true;
    if (reward.type === 'item') this.addItem(reward.id, reward.count || 1);
    else this.equipBag.push({ slot: reward.type, id: reward.id });
  },

  showChapterClear() {
    this.flags.chapter1_clear = true;
    this.chapterClearT = 0;
    this.state = 'chapterclear';
    this.save();
    AudioSys.playMusic('ending');
  },

  updateChapterClear(dt) {
    this.chapterClearT += dt;
    if (this.chapterClearT < 1 || (!Input.pressed('ok') && !Input.pressed('cancel'))) return;
    AudioSys.sfx('ok');
    this.state = 'field';
    this.playFieldMusic();
  },

  // 最終決戦後: 真実の開示 → 選択 → エンディング分岐
  finale() {
    AudioSys.playMusic('mystery');
    const lines = [...FINALE_AFTER];
    if (this.journalCount() >= 10) lines.push(...FINALE_SETSUNA);
    this.showDialog(lines, () => {
      this.ask('アルカ=コア『サア エラベ。イマ トビラヲ ヒラクカ?』', () => {
        this.showDialog(['ソラ「ひらこう。みんなで そとの せかいを みるんだ。」',
          'アルカ『……ウケタマワッタ。』'], () => this.startEnding('open'));
      }, () => {
        this.showDialog(['ソラ「……いや。いそがない。」',
          '「こころの じゅんびが できたものから、すこしずつ だ。」',
          'アルカ『……ソレモ マタ、ヒトツノ コタエ。』'], () => this.startEnding('stay'));
      });
    });
  },

  startEnding(variant) {
    this.endingLines = [...(variant === 'stay' ? ENDING_STAY : ENDING_OPEN)];
    if (this.journalCount() >= 10) {
      this.endingLines.splice(this.endingLines.length - 4, 0, ...EPILOGUE_SETSUNA, '');
    }
    this.state = 'ending';
    this.endingT = 0;
    this.flags.cleared = true;
    this.save();
    AudioSys.playMusic('ending');
  },

  updateEnding(dt) {
    this.endingT += dt * (Input.held('ok') ? 3 : 1);
    const totalH = (this.endingLines || ENDING_OPEN).length * 34 + 500;
    if (this.endingT * 30 > totalH && Input.pressed('ok')) {
      // クリア後は91Fへ
      this.loadFloor(91, null);
      this.px = 10; this.py = 12;
      this.state = 'field';
      this.playFieldMusic();
      this.showDialog(['(とうは しずかに たちつづけている。)', '(――ぼうけんは きろくされた。 これからも とうを じゆうに あるける。)']);
      this.save();
    }
  },

  // ---------- ダイアログ ----------
  showDialog(lines, onDone, portrait = null) {
    this.prevState = this.state === 'dialog' ? this.prevState : this.state;
    this.state = 'dialog';
    this.dialog = { lines, idx: 0, chars: 0, onDone, portrait };
  },

  updateDialog(dt) {
    const dg = this.dialog;
    if (!dg) { this.state = 'field'; return; }
    const line = dg.lines[dg.idx];
    dg.chars += dt * 40 * (Input.held('ok') ? 3 : 1);
    if (Input.pressed('ok')) {
      if (dg.chars < line.length) dg.chars = line.length;
      else {
        AudioSys.sfx('cursor');
        dg.idx++;
        dg.chars = 0;
        if (dg.idx >= dg.lines.length) {
          this.dialog = null;
          this.state = 'field';
          if (dg.onDone) dg.onDone();
        }
      }
    }
  },

  ask(text, onYes, onNo) {
    this.state = 'choice';
    this.choiceBox = { text, sel: 0, onYes, onNo };
  },

  updateChoice() {
    const c = this.choiceBox;
    if (Input.pressed('up') || Input.pressed('down')) { c.sel = 1 - c.sel; AudioSys.sfx('cursor'); }
    if (Input.pressed('ok')) {
      AudioSys.sfx('ok');
      this.choiceBox = null; this.state = 'field';
      if (c.sel === 0) { if (c.onYes) c.onYes(); } else { if (c.onNo) c.onNo(); }
    } else if (Input.pressed('cancel')) {
      AudioSys.sfx('cancel');
      this.choiceBox = null; this.state = 'field';
      if (c.onNo) c.onNo();
    }
  },

  // ---------- メニュー ----------
  openMenu() {
    AudioSys.sfx('ok');
    this.state = 'menu';
    this.menuStack = [{ kind: 'main', sel: 0 }];
  },

  closeMenu() { this.state = 'field'; this.menuStack = []; },

  curMenu() { return this.menuStack[this.menuStack.length - 1]; },

  updateMenu() {
    const m = this.curMenu();
    if (!m) { this.closeMenu(); return; }
    const move = (len) => {
      if (Input.pressed('up')) { m.sel = (m.sel + len - 1) % len; AudioSys.sfx('cursor'); }
      if (Input.pressed('down')) { m.sel = (m.sel + 1) % len; AudioSys.sfx('cursor'); }
    };
    const back = () => { AudioSys.sfx('cancel'); this.menuStack.pop(); if (!this.menuStack.length) this.closeMenu(); };

    switch (m.kind) {
      case 'main': {
        const items = this.mainMenuItems();
        move(items.length);
        if (Input.pressed('cancel')) { this.closeMenu(); AudioSys.sfx('cancel'); }
        else if (Input.pressed('ok')) {
          AudioSys.sfx('ok');
          const key = items[m.sel].key;
          if (key === 'status') this.menuStack.push({ kind: 'pickMember', sel: 0, next: 'status' });
          else if (key === 'spell') this.menuStack.push({ kind: 'pickMember', sel: 0, next: 'spell' });
          else if (key === 'item') this.menuStack.push({ kind: 'items', sel: 0 });
          else if (key === 'equip') this.menuStack.push({ kind: 'pickMember', sel: 0, next: 'equip', humansOnly: true });
          else if (key === 'party') { this.partyMsg = null; this.menuStack.push({ kind: 'party', sel: 0, picked: -1 }); }
          else if (key === 'save') {
            const ok = this.save();
            this.closeMenu();
            this.showDialog(ok ? ['ぼうけんのしょに きろくした!'] : ['きろくに しっぱいした……']);
          } else if (key === 'sound') {
            AudioSys.setMuted(!AudioSys.muted);
            if (!AudioSys.muted) this.playFieldMusic();
          }
        }
        break;
      }
      case 'pickMember': {
        const list = m.humansOnly ? this.party.filter(p => p.kind === 'human') : this.party;
        move(list.length);
        if (Input.pressed('cancel')) back();
        else if (Input.pressed('ok')) {
          AudioSys.sfx('ok');
          const mem = list[m.sel];
          if (m.next === 'status') this.menuStack.push({ kind: 'status', member: mem });
          else if (m.next === 'spell') {
            if (mem.hp <= 0) { AudioSys.sfx('cancel'); break; }
            this.menuStack.push({ kind: 'spells', member: mem, sel: 0 });
          }
          else if (m.next === 'equip') this.menuStack.push({ kind: 'equipSlot', member: mem, sel: 0 });
        }
        break;
      }
      case 'status':
        if (Input.pressed('cancel') || Input.pressed('ok')) back();
        break;
      case 'spells': {
        const fieldSpells = m.member.spells.filter(s => ['heal', 'revive', 'field_warp', 'cure'].includes(SPELLS[s].kind) || s === 'toberu');
        if (!fieldSpells.length) {
          if (Input.pressed('cancel') || Input.pressed('ok')) back();
          break;
        }
        move(fieldSpells.length);
        if (Input.pressed('cancel')) back();
        else if (Input.pressed('ok')) {
          const spId = fieldSpells[m.sel];
          const sp = SPELLS[spId];
          if (m.member.hp <= 0 || m.member.mp < sp.mp) { AudioSys.sfx('cancel'); break; }
          AudioSys.sfx('ok');
          if (spId === 'toberu') {
            this.menuStack.push({ kind: 'warp', sel: 0, cost: () => { m.member.mp -= sp.mp; } });
          } else if (sp.kind === 'heal') {
            const targets = this.party.filter(t => t.hp > 0 && t.hp < t.maxhp);
            if (!targets.length) { AudioSys.sfx('cancel'); break; }
            if (sp.target === 'party') {
              m.member.mp -= sp.mp;
              for (const t of targets) {
                const v = Math.min(t.maxhp - t.hp, sp.pow[0] + Math.floor(Math.random() * (sp.pow[1] - sp.pow[0] + 1)));
                t.hp += v;
              }
              AudioSys.sfx('heal');
            } else this.menuStack.push({ kind: 'pickTarget', targets, sel: 0, onPick: t => {
              // 対象画面を開いている間にも状態は変わり得るため、確定時にもう一度検査する。
              if (m.member.hp <= 0 || m.member.mp < sp.mp || t.hp <= 0 || t.hp >= t.maxhp) {
                AudioSys.sfx('cancel'); this.menuStack.pop(); return;
              }
              m.member.mp -= sp.mp;
              const v = Math.min(t.maxhp - t.hp, sp.pow[0] + Math.floor(Math.random() * (sp.pow[1] - sp.pow[0] + 1)));
              t.hp += v; AudioSys.sfx('heal');
              this.menuStack.pop();
            } });
          } else if (sp.kind === 'revive') {
            const targets = this.party.filter(t => t.hp <= 0);
            if (!targets.length) { AudioSys.sfx('cancel'); break; }
            this.menuStack.push({ kind: 'pickTarget', targets, sel: 0, onPick: t => {
              if (m.member.hp <= 0 || m.member.mp < sp.mp || t.hp > 0) {
                AudioSys.sfx('cancel'); this.menuStack.pop(); return;
              }
              m.member.mp -= sp.mp;
              t.hp = Math.floor(t.maxhp / 2); AudioSys.sfx('heal');
              this.menuStack.pop();
            } });
          }
        }
        break;
      }
      case 'pickTarget':
        move((m.targets || this.party).length);
        if (Input.pressed('cancel')) back();
        else if (Input.pressed('ok')) { m.onPick((m.targets || this.party)[m.sel]); }
        break;
      case 'items': {
        if (!this.bag.length) {
          if (Input.pressed('cancel') || Input.pressed('ok')) back();
          break;
        }
        move(this.bag.length);
        if (Input.pressed('cancel')) back();
        else if (Input.pressed('ok')) {
          const it = this.bag[m.sel];
          const item = ITEMS[it.id];
          AudioSys.sfx('ok');
          if (['heal', 'mp', 'cure_poison', 'seed_str', 'seed_vit', 'seed_hp', 'seed_mp'].includes(item.kind)) {
            let targets = this.party;
            if (item.kind === 'heal') targets = this.party.filter(t => t.hp > 0 && t.hp < t.maxhp);
            else if (item.kind === 'mp') targets = this.party.filter(t => t.hp > 0 && t.mp < t.maxmp);
            else if (item.kind === 'cure_poison') targets = this.party.filter(t => t.hp > 0 && t.poison);
            if (!targets.length) { AudioSys.sfx('cancel'); break; }
            this.menuStack.push({ kind: 'pickTarget', targets, sel: 0, onPick: t => {
              if (this.useItemOn(it.id, t)) {
                this.menuStack.pop();
                if (m.sel >= this.bag.length) m.sel = Math.max(0, this.bag.length - 1);
              }
            } });
          } else if (item.kind === 'field_warp') {
            this.removeItem(it.id);
            this.closeMenu();
            this.warpTo(this.lastInn);
          } else if (item.kind === 'repel') {
            this.removeItem(it.id);
            this.repel = 120;
            this.closeMenu();
            this.showDialog(['まよけのすずを ならした。', 'しばらく まものが よってこなさそうだ。']);
          } else if (item.kind === 'bait') {
            this.showDialogInMenu = null;
            AudioSys.sfx('cancel');
          }
        }
        break;
      }
      case 'equipSlot': {
        move(2);
        if (Input.pressed('cancel')) back();
        else if (Input.pressed('ok')) {
          AudioSys.sfx('ok');
          this.menuStack.push({ kind: 'equipPick', member: m.member, slot: m.sel === 0 ? 'w' : 'a', sel: 0 });
        }
        break;
      }
      case 'equipPick': {
        const cands = this.equipBag.filter(e => e.slot === m.slot);
        const listLen = cands.length + 1; // +はずす
        move(listLen);
        if (Input.pressed('cancel')) back();
        else if (Input.pressed('ok')) {
          AudioSys.sfx('ok');
          const mem = m.member;
          const cur = m.slot === 'w' ? mem.weapon : mem.armor;
          if (m.sel < cands.length) {
            const pick = cands[m.sel];
            const idx = this.equipBag.indexOf(pick);
            this.equipBag.splice(idx, 1);
            if (cur) this.equipBag.push({ slot: m.slot, id: cur });
            if (m.slot === 'w') mem.weapon = pick.id; else mem.armor = pick.id;
          } else {
            if (cur) this.equipBag.push({ slot: m.slot, id: cur });
            if (m.slot === 'w') mem.weapon = null; else mem.armor = null;
          }
          this.menuStack.pop();
        }
        break;
      }
      case 'party': {
        const all = [...this.party, ...this.reserve];
        move(all.length);
        if (Input.pressed('cancel')) { m.picked = -1; back(); }
        else if (Input.pressed('ok')) {
          AudioSys.sfx('ok');
          if (m.picked < 0) { m.picked = m.sel; }
          else if (m.picked === m.sel) { m.picked = -1; }
          else {
            this.swapMembers(m.picked, m.sel);
            m.picked = -1;
          }
        }
        break;
      }
      case 'warp': {
        const towns = [...this.visitedTowns].sort((a, b) => a - b);
        move(towns.length);
        if (Input.pressed('cancel')) back();
        else if (Input.pressed('ok')) {
          AudioSys.sfx('ok');
          if (m.cost) m.cost();
          const f = towns[m.sel];
          this.closeMenu();
          this.warpTo(f);
        }
        break;
      }
    }
  },

  mainMenuItems() {
    return [
      { key: 'status', label: 'つよさ' },
      { key: 'spell', label: 'じゅもん' },
      { key: 'item', label: 'どうぐ' },
      { key: 'equip', label: 'そうび' },
      { key: 'party', label: 'なかま' },
      { key: 'save', label: 'きろく' },
      { key: 'sound', label: AudioSys.muted ? 'おと OFF' : 'おと ON' },
    ];
  },

  swapMembers(i, j) {
    const all = [...this.party, ...this.reserve];
    const pLen = this.party.length;
    [all[i], all[j]] = [all[j], all[i]];
    const newParty = all.slice(0, pLen);
    const newReserve = all.slice(pLen);
    if (!newParty.some(m => m.kind === 'human' && m.id === 'hero')) {
      this.partyMsg = 'ソラは せんとうから はずせない!';
      return;
    }
    if (newParty.filter(m => m.kind === 'monster').length > 3) {
      this.partyMsg = 'ソラと まもの3びきまでで ぼうけんできる!';
      return;
    }
    this.party = newParty;
    this.reserve = newReserve;
    this.ensurePartyFieldAssets();
    this.resetPartyPath();
    this.partyMsg = null;
  },

  useItemOn(id, t) {
    const item = ITEMS[id];
    const roll = p => p[0] + Math.floor(Math.random() * (p[1] - p[0] + 1));
    if (item.kind === 'heal') {
      if (t.hp <= 0 || t.hp >= t.maxhp) { AudioSys.sfx('cancel'); return false; }
      t.hp = Math.min(t.maxhp, t.hp + roll(item.pow));
      AudioSys.sfx('heal');
    } else if (item.kind === 'mp') {
      if (t.hp <= 0 || t.mp >= t.maxmp) { AudioSys.sfx('cancel'); return false; }
      t.mp = Math.min(t.maxmp, t.mp + roll(item.pow));
      AudioSys.sfx('heal');
    } else if (item.kind === 'cure_poison') {
      if (t.hp <= 0 || !t.poison) { AudioSys.sfx('cancel'); return false; }
      t.poison = false; AudioSys.sfx('heal');
    } else if (item.kind === 'seed_str') { t.seeds.str += 2 + Math.floor(Math.random() * 2); Chars.recompute(t); AudioSys.sfx('levelup'); }
    else if (item.kind === 'seed_vit') { t.seeds.vit += 2 + Math.floor(Math.random() * 2); Chars.recompute(t); AudioSys.sfx('levelup'); }
    else if (item.kind === 'seed_hp') { t.seeds.hp += 4 + Math.floor(Math.random() * 3); Chars.recompute(t); AudioSys.sfx('levelup'); }
    else if (item.kind === 'seed_mp') { t.seeds.mp += 4 + Math.floor(Math.random() * 3); Chars.recompute(t); AudioSys.sfx('levelup'); }
    this.removeItem(id);
    return true;
  },

  warpTo(floor) {
    if (!PUBLIC_REST_POINTS.includes(floor) || floor > 40 || !this.visitedTowns.includes(floor)) {
      AudioSys.sfx('cancel');
      this.showDialog(['その ばしょへの みちは、いまは とざされている。']);
      return;
    }
    AudioSys.sfx('spell');
    this.fadeTo(() => {
      this.loadFloor(floor, null);
      const arrival = this.map.restSpawn || this.map.entry;
      this.px = arrival.x; this.py = arrival.y; this.dir = 'u';
      this.ignoreStairs = null;
      this.resetPartyPath();
      this.playFieldMusic();
      this.save();
    });
  },

  // ---------- ショップ ----------
  openShop(type) {
    const def = SHOPS[this.floor] || SHOPS[this.map.shopFloor];
    if (!def) { this.showDialog(['「いまは しなぎれ なんだ。すまないね。」']); return; }
    this.state = 'shop';
    // しょうにんが なかまに いると 1わり やすい
    const disc = this.party.some(m => m.job === 'merchant') ? 0.9 : 1;
    let stock;
    if (type === 'items') stock = def.items.map(id => ({ type: 'item', id, price: Math.floor(ITEMS[id].price * disc) }));
    else stock = [
      ...def.weapons.map(id => ({ type: 'w', id, price: Math.floor(WEAPONS[id].price * disc) })),
      ...def.armors.map(id => ({ type: 'a', id, price: Math.floor(ARMORS[id].price * disc) })),
    ];
    this.shop = { mode: 'top', type, stock, sel: 0, topSel: 0, disc: disc < 1 };
  },

  updateShop() {
    const s = this.shop;
    if (s.mode === 'top') {
      const opts = ['かう', 'うる', 'やめる'];
      if (Input.pressed('up')) { s.topSel = (s.topSel + 2) % 3; AudioSys.sfx('cursor'); }
      if (Input.pressed('down')) { s.topSel = (s.topSel + 1) % 3; AudioSys.sfx('cursor'); }
      if (Input.pressed('cancel')) { this.state = 'field'; this.shop = null; AudioSys.sfx('cancel'); return; }
      if (Input.pressed('ok')) {
        AudioSys.sfx('ok');
        if (s.topSel === 0) { s.mode = 'buy'; s.sel = 0; }
        else if (s.topSel === 1) { s.mode = 'sell'; s.sel = 0; }
        else { this.state = 'field'; this.shop = null; }
      }
      return;
    }
    if (s.mode === 'buy') {
      if (Input.pressed('up')) { s.sel = (s.sel + s.stock.length - 1) % s.stock.length; AudioSys.sfx('cursor'); }
      if (Input.pressed('down')) { s.sel = (s.sel + 1) % s.stock.length; AudioSys.sfx('cursor'); }
      if (Input.pressed('cancel')) { s.mode = 'top'; AudioSys.sfx('cancel'); return; }
      if (Input.pressed('ok')) {
        s.pending = s.stock[s.sel]; s.confirmSel = 0; s.mode = 'buyConfirm'; s.msg = null;
        AudioSys.sfx('ok');
      }
      return;
    }
    if (s.mode === 'buyConfirm') {
      if (Input.pressed('up') || Input.pressed('down') || Input.pressed('left') || Input.pressed('right')) {
        s.confirmSel = 1 - s.confirmSel; AudioSys.sfx('cursor');
      }
      if (Input.pressed('cancel')) { s.mode = 'buy'; s.pending = null; AudioSys.sfx('cancel'); return; }
      if (Input.pressed('ok')) {
        if (s.confirmSel === 1) { s.mode = 'buy'; s.pending = null; AudioSys.sfx('cancel'); return; }
        const e = s.pending;
        if (this.gold < e.price) {
          s.msg = 'おかねが たりないよ!'; AudioSys.sfx('cancel');
        } else {
          this.gold -= e.price;
          if (e.type === 'item') this.addItem(e.id);
          else this.equipBag.push({ slot: e.type, id: e.id });
          s.msg = 'まいど あり! たいせつに つかってね。'; AudioSys.sfx('ok');
        }
        s.mode = 'buyResult';
      }
      return;
    }
    if (s.mode === 'buyResult') {
      if (Input.pressed('ok') || Input.pressed('cancel')) {
        s.mode = 'buy'; s.pending = null; s.msg = null; AudioSys.sfx('ok');
      }
      return;
    }
    if (s.mode === 'sell') {
      const sellList = this.sellList();
      if (!sellList.length) {
        s.msg = 'うるものが ないね。';
        if (Input.pressed('cancel') || Input.pressed('ok')) { s.mode = 'top'; AudioSys.sfx('cancel'); }
        return;
      }
      if (s.sel >= sellList.length) s.sel = sellList.length - 1;
      if (Input.pressed('up')) { s.sel = (s.sel + sellList.length - 1) % sellList.length; AudioSys.sfx('cursor'); }
      if (Input.pressed('down')) { s.sel = (s.sel + 1) % sellList.length; AudioSys.sfx('cursor'); }
      if (Input.pressed('cancel')) { s.mode = 'top'; AudioSys.sfx('cancel'); return; }
      if (Input.pressed('ok')) {
        AudioSys.sfx('ok');
        const e = sellList[s.sel];
        this.gold += e.price;
        if (e.kind === 'item') this.removeItem(e.id);
        else {
          const idx = this.equipBag.findIndex(x => x.slot === e.slot && x.id === e.id);
          if (idx >= 0) this.equipBag.splice(idx, 1);
        }
        s.msg = `${e.name}を ${e.price}ゴールドで うった!`;
      }
      return;
    }
  },

  sellList() {
    const out = [];
    for (const it of this.bag) {
      const item = ITEMS[it.id];
      if (item.price > 0) out.push({ kind: 'item', id: it.id, name: item.name, n: it.n, price: Math.floor(item.price / 2) });
    }
    for (const e of this.equipBag) {
      const d = e.slot === 'w' ? WEAPONS[e.id] : ARMORS[e.id];
      out.push({ kind: 'equip', slot: e.slot, id: e.id, name: d.name, n: 1, price: Math.floor(d.price / 2) });
    }
    return out;
  },

  // ============================================================
  // 描画
  // ============================================================
  draw() {
    const g = this.g;
    g.setTransform(2, 0, 0, 2, 0, 0);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.fillStyle = '#000';
    g.fillRect(0, 0, 512, 448);

    switch (this.state) {
      case 'title': this.drawTitle(g); break;
      case 'opening': this.drawOpening(g); break;
      case 'field': case 'dialog': case 'choice': case 'menu': case 'shop': case 'jobchange':
        this.drawField(g);
        if (this.state === 'dialog') this.drawDialog(g);
        if (this.state === 'choice') this.drawChoice(g);
        if (this.state === 'menu') this.drawMenu(g);
        if (this.state === 'shop') this.drawShop(g);
        if (this.state === 'jobchange') this.drawJobChange(g);
        break;
      case 'falling': this.drawField(g); this.drawFalling(g); break;
      case 'battle': Battle.draw(g); break;
      case 'chapterclear': this.drawChapterClear(g); break;
      case 'ending': this.drawEnding(g); break;
      case 'gameover': this.drawGameover(g); break;
    }

    // フェード
    if (this.fade > 0) {
      g.fillStyle = `rgba(0,0,0,${this.fade})`;
      g.fillRect(0, 0, 512, 448);
    }
  },

  // ---------- タイトル ----------
  drawTitle(g) {
    // 星空
    const grad = g.createLinearGradient(0, 0, 0, 448);
    grad.addColorStop(0, '#060614');
    grad.addColorStop(0.7, '#101036');
    grad.addColorStop(1, '#282050');
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 448);
    // 星
    for (let i = 0; i < 60; i++) {
      const x = (i * 97 + 31) % 512, y = (i * 53 + 17) % 300;
      const tw = Math.sin(this.animT * 2 + i) * 0.5 + 0.5;
      g.fillStyle = `rgba(255,255,255,${0.3 + tw * 0.5})`;
      g.fillRect(x, y, 2, 2);
    }
    // 月
    g.fillStyle = '#f0ecd0';
    g.beginPath(); g.arc(430, 70, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#101036';
    g.beginPath(); g.arc(420, 62, 22, 0, Math.PI * 2); g.fill();
    // 塔
    g.fillStyle = '#181430';
    for (let i = 0; i < 11; i++) {
      const w = 150 - i * 11;
      g.fillRect(256 - w / 2, 448 - (i + 1) * 38, w, 38);
    }
    // 窓明かり
    for (let i = 0; i < 22; i++) {
      const fl = i % 11, side = (i * 7 + 3) % 5;
      const w = 150 - fl * 11;
      const x = 256 - w / 2 + 10 + side * (w - 24) / 4;
      const y = 448 - (fl + 1) * 38 + 14;
      const on = Math.sin(this.animT * 0.7 + i * 2.3) > -0.2;
      g.fillStyle = on ? '#e8c860' : '#403820';
      g.fillRect(x, y, 5, 7);
    }
    // 頂上の光
    const glow = Math.sin(this.animT * 1.5) * 0.3 + 0.7;
    g.fillStyle = `rgba(120,220,255,${glow * 0.8})`;
    g.beginPath(); g.arc(256, 448 - 11 * 38 - 8, 6 + glow * 3, 0, Math.PI * 2); g.fill();

    // 作品の顔となるキービジュアル。未読込時は上のプロシージャル背景を使う。
    if (this.titleArt && this.titleArt.complete && this.titleArt.naturalWidth) {
      g.drawImage(this.titleArt, 0, 0, 512, 448);
      const veil = g.createLinearGradient(0, 0, 0, 448);
      veil.addColorStop(0, 'rgba(1,7,22,0.28)');
      veil.addColorStop(0.46, 'rgba(2,8,24,0.12)');
      veil.addColorStop(0.78, 'rgba(2,4,14,0.12)');
      veil.addColorStop(1, 'rgba(0,0,8,0.62)');
      g.fillStyle = veil; g.fillRect(0, 0, 512, 448);
      const vignette = g.createRadialGradient(256, 205, 100, 256, 220, 360);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,10,0.52)');
      g.fillStyle = vignette; g.fillRect(0, 0, 512, 448);
    }

    // 新キービジュアルの静かな左上余白にロゴを置く。
    g.textAlign = 'left';
    g.font = `bold 43px ${UI.TITLE_FONT}`;
    g.fillStyle = 'rgba(0,0,8,0.88)';
    g.fillText('アルカの塔', 35, 102);
    const lg = g.createLinearGradient(0, 52, 0, 106);
    lg.addColorStop(0, '#f8f0c0'); lg.addColorStop(0.5, '#e8b040'); lg.addColorStop(1, '#f8e8a0');
    g.fillStyle = lg;
    g.fillText('アルカの塔', 31, 98);
    g.font = `16px ${UI.FONT}`;
    g.fillStyle = '#d9eef1';
    g.fillText('— 第一部・あけぼのの門 —', 42, 128);

    // メニュー
    const opts = this.hasSave() ? ['はじめから', 'つづきから'] : ['はじめから'];
    UI.window(g, 174, 320, 164, 34 + opts.length * 26);
    g.textAlign = 'left';
    for (let i = 0; i < opts.length; i++) {
      UI.text(g, opts[i], 226, 348 + i * 26, i === this.titleSel || opts.length === 1 ? '#fff7d4' : '#91a0b8', 16);
    }
    UI.cursor(g, 206, 336 + (opts.length === 1 ? 0 : this.titleSel) * 26, 'right');

    g.textAlign = 'center';
    g.font = `12px ${UI.FONT}`;
    g.fillStyle = '#667';
    g.fillText('Z / Enter で けってい', 256, 426);
    g.textAlign = 'left';
  },

  drawOpening(g) {
    // キービジュアルを物語画面用に再構成。背景を暗く沈め、塔の紋章だけを浮かせる。
    g.fillStyle = '#050b17'; g.fillRect(0, 0, 512, 448);
    if (this.titleArt && this.titleArt.complete && this.titleArt.naturalWidth) {
      g.save(); g.filter = 'blur(1.2px) saturate(.78) brightness(.63)';
      g.drawImage(this.titleArt, -18, -10, 548, 480); g.restore();
    }
    const shade = g.createLinearGradient(0, 0, 0, 448);
    shade.addColorStop(0, 'rgba(2,8,22,.48)'); shade.addColorStop(.52, 'rgba(3,10,24,.72)'); shade.addColorStop(1, 'rgba(1,3,12,.94)');
    g.fillStyle = shade; g.fillRect(0, 0, 512, 448);
    g.save(); g.translate(256, 80); g.rotate(this.animT * .025);
    g.strokeStyle = 'rgba(103,229,235,.38)'; g.lineWidth = 1.3;
    for (const r of [31, 43, 55]) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); }
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(Math.cos(a) * 27, Math.sin(a) * 27); g.lineTo(Math.cos(a) * 59, Math.sin(a) * 59); g.stroke(); }
    g.fillStyle = '#dffcff'; g.shadowColor = '#62e6ee'; g.shadowBlur = 14; g.beginPath(); g.arc(0, 0, 3.5, 0, Math.PI * 2); g.fill(); g.restore();

    const pages = this.openingPages();
    const lines = pages[Math.min(this.openingPage, pages.length - 1)] || [];
    g.fillStyle = 'rgba(5,12,28,.78)'; g.beginPath(); g.roundRect(58, 123, 396, 190, 10); g.fill();
    g.strokeStyle = 'rgba(207,181,105,.8)'; g.lineWidth = 1.5; g.stroke();
    g.strokeStyle = 'rgba(93,211,220,.35)'; g.beginPath(); g.moveTo(82, 137); g.lineTo(430, 137); g.stroke();
    g.textAlign = 'center';
    for (let i = 0; i < lines.length; i++) {
      g.font = `16px ${UI.FONT}`;
      g.fillStyle = '#edf4f0';
      g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 4;
      g.fillText(lines[i], 256, 165 + i * 29);
    }
    g.shadowBlur = 0;
    g.font = `12px ${UI.FONT}`;
    g.fillStyle = '#93abb8';
    g.fillText('Zで つぎへ', 256, 420);
    g.textAlign = 'left';
  },

  // ---------- フィールド ----------
  paintedTileIndex(t, tier) {
    const A = Art.T;
    if (t === A.WALL || t === A.HOUSE || t === A.ROOF || t === A.FENCE) return 1;
    if (t === A.UP) return 2;
    if (t === A.DOWN) return 3;
    if (t === A.WATER) return 4;
    if (t === A.GRASS || t === A.FLOWER || t === A.PATH) return 5;
    if (t === A.TREE || t === A.PILLAR) return 6;
    if (t === A.CHEST || t === A.CHEST_OPEN) return 7;
    if (t === A.CARPET || t === A.BED) return 8;
    if (t === A.VOID || t === A.CIRCLE) return 11;
    if (tier === 6) return 9;
    if (tier === 7) return 10;
    if (tier >= 9) return 11;
    return 0;
  },

  drawField(g) {
    const map = this.map;
    if (!map) return;
    const TS = 32;
    const sheet = Art.getTileSheet(map.tier);
    // カメラ
    let camX = this.px * TS + 16 + this.ox - 256;
    let camY = this.py * TS + 16 + this.oy - 224;
    camX = Math.max(0, Math.min(map.w * TS - 512, camX));
    camY = Math.max(0, Math.min(map.h * TS - 448, camY));
    if (map.w * TS < 512) camX = (map.w * TS - 512) / 2;
    if (map.h * TS < 448) camY = (map.h * TS - 448) / 2;

    const x0 = Math.floor(camX / TS), y0 = Math.floor(camY / TS);
    const x1 = Math.ceil((camX + 512) / TS), y1 = Math.ceil((camY + 448) / TS);
    const theme = Art.TIER_THEMES[map.tier] || Art.TIER_THEMES[0];
    g.fillStyle = theme.bg; g.fillRect(0, 0, 512, 448);
    const townPainting = map.town && this.townArtsV5 && this.townArtsV5[this.floor] && this.townArtsV5[this.floor].naturalWidth
      ? this.townArtsV5[this.floor] : this.villageArt;
    const hasVillagePainting = map.town && townPainting && townPainting.complete && townPainting.naturalWidth;
    if (hasVillagePainting) {
      // 村はタイルを並べず、1280×1024の描き下ろしマップをカメラで切り出す。
      const worldW = map.w * TS, worldH = map.h * TS;
      const scaleX = townPainting.naturalWidth / worldW, scaleY = townPainting.naturalHeight / worldH;
      g.drawImage(townPainting,
        camX * scaleX, camY * scaleY, 512 * scaleX, 448 * scaleY,
        0, 0, 512, 448);
      if (map.tier > 0) {
        g.fillStyle = `${theme.accent}12`; g.fillRect(0, 0, 512, 448);
      }
    } else if (map.tier <= 4 && this[`tier${map.tier}Environment`] && this[`tier${map.tier}Environment`].complete && this[`tier${map.tier}Environment`].naturalWidth) {
      this.drawV5Dungeon(g, map, camX, camY, x0, y0, x1, y1, this[`tier${map.tier}Environment`]);
    } else {
      const atlas = this.environmentAtlas;
      const hasPaintedTiles = atlas && atlas.complete && atlas.naturalWidth;
      const cell = hasPaintedTiles ? atlas.naturalWidth / 4 : 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          if (x < 0 || y < 0 || x >= map.w || y >= map.h) continue;
          const t = map.tiles[y][x];
          const dx = Math.round(x * TS - camX), dy = Math.round(y * TS - camY);
          if (hasPaintedTiles) {
            const ai = this.paintedTileIndex(t, map.tier), ax = (ai % 4) * cell, ay = Math.floor(ai / 4) * cell;
            const material = ai === 0 || ai === 4 || ai === 5 || ai >= 9;
            if (material) {
              // 大判素材を4×4マスとして切り出し、同じ模様が毎マス反復する見え方を防ぐ。
              const patch = cell / 4, sx = ax + (x & 3) * patch, sy = ay + (y & 3) * patch;
              g.drawImage(atlas, sx, sy, patch, patch, dx, dy, TS, TS);
            } else g.drawImage(atlas, ax, ay, cell, cell, dx, dy, TS, TS);
          } else {
            const src = Art.TILE_SIZE || 16;
            g.drawImage(sheet, t * src, 0, src, src, dx, dy, TS, TS);
          }
        }
      }
      if (!hasPaintedTiles) this.drawMapDetails(g, map, camX, camY, x0, y0, x1, y1);
    }

    // NPC・隊列・プレイヤーを足元Yで並べ、前後関係を自然にする。
    this.drawPitfalls(g, map, camX, camY);
    this.drawSpecialFloorDetails(g, map, camX, camY);
    this.drawCampfires(g, map, camX, camY);
    this.drawChapterGate(g, map, camX, camY);
    this.drawWorldAnchor(g, map, camX, camY);
    const frame = Math.floor(this.animT * 2.5) % 2;
    const actors = map.npcs.map(n => {
      const t = n.npcMoving ? Math.max(0, Math.min(1, n.npcMoveT || 0)) : 1;
      const eased = this.fieldMoveEase(t);
      const x = n.npcMoving ? n.npcFromX + (n.x - n.npcFromX) * eased : n.x;
      const y = n.npcMoving ? n.npcFromY + (n.y - n.npcFromY) * eased : n.y;
      return {
        kind: 'npc', n, x, y, moving: !!n.npcMoving, motionT: eased,
        fromDir: n.npcFromDir || n.dir, sortY: y * TS + 31,
      };
    });
    const pxx = Math.round(this.px * TS + this.ox - camX);
    const pyy = Math.round(this.py * TS + this.oy - camY);
    const followers = this.party.filter(m => !(m.kind === 'human' && m.id === 'hero')).slice(0, 3);
    const pathTo = this.partyPath || [];
    const pathFrom = this.partyPathFrom || pathTo;
    const rawProgress = this.moving ? this.moveT : 1;
    const progress = this.fieldMoveEase(rawProgress);
    // 階段・ワープ直後は全員の経路が先頭と同じマスから始まる。
    // その数フレームだけ全員を重ねて描くと一体化して見えるため、
    // 実際に隊列の間隔ができるまでは同じマスの後続を隠す。
    const claimedPathTiles = new Set([`${this.px},${this.py}`]);
    followers.forEach((member, i) => {
      const to = pathTo[i + 1] || pathTo[pathTo.length - 1] || { x: this.px, y: this.py, dir: this.dir };
      const from = pathFrom[i + 1] || to;
      const pathKey = `${to.x},${to.y}`;
      if (claimedPathTiles.has(pathKey)) return;
      claimedPathTiles.add(pathKey);
      const wx = (from.x + (to.x - from.x) * progress) * TS;
      const wy = (from.y + (to.y - from.y) * progress) * TS;
      const followerMoving = this.moving && (from.x !== to.x || from.y !== to.y);
      actors.push({
        kind: 'follower', member, x: wx, y: wy, dir: to.dir || this.dir,
        fromDir: from.dir || to.dir || this.dir, moving: followerMoving,
        motionT: progress, stepPolarity: i % 2 ? -1 : 1, sortY: wy + 31,
      });
    });
    actors.push({ kind: 'player', sortY: this.py * TS + this.oy + 31 });
    actors.sort((a, b) => a.sortY - b.sortY);
    for (const actor of actors) {
      if (actor.kind === 'player') this.drawFieldHero(g, pxx, pyy, frame, progress);
      else if (actor.kind === 'follower') this.drawFieldPartyMember(g, actor, camX, camY);
      else this.drawFieldNpc(g, actor.n, camX, camY, frame, actor.x, actor.y, actor.motionT, actor.fromDir);
    }

    // 木の梢や屋根を人物より後に再描画し、一枚絵でも遮蔽を成立させる。
    if (hasVillagePainting) this.drawTownForeground(g, townPainting, camX, camY);

    this.drawRegionAtmosphere(g, map.tier);
    this.drawSkySeaAtmosphere(g, map);
    this.drawSpecialFloorAtmosphere(g, map);

    // 画面の縁だけを落として中央の冒険領域へ視線を集める。
    const vignette = g.createRadialGradient(256, 218, 155, 256, 218, 345);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(3,5,13,0.32)');
    g.fillStyle = vignette; g.fillRect(0, 0, 512, 448);

    // フロア表示
    if (this.floorLabelT > 0 || map.town || map.settlement) {
      const label = map.name ? `${this.floor}F ${map.name}` : `${this.floor}F ${TIER_NAMES[map.tier] || ''}`;
      g.fillStyle = 'rgba(0,0,0,0.6)';
      const w = UI.measure(g, label, 14) + 20;
      g.fillRect(8, 8, w, 26);
      UI.text(g, label, 18, 27, '#fff', 14);
    }
  },

  drawRegionAtmosphere(g, tier) {
    if (tier < 2 || tier > 4) return;
    g.save();
    for (let i = 0; i < 18; i++) {
      const seedX = (i * 83 + this.floor * 29) % 520;
      const seedY = (i * 47 + this.floor * 17) % 470;
      const phase = this.animT * (tier === 2 ? 28 : 9) + i * 1.73;
      const x = (seedX + Math.sin(phase * .31) * 13 + 520) % 520 - 4;
      const y = tier === 2
        ? (seedY + phase * 2.1) % 470 - 10
        : (seedY - phase * (tier === 3 ? 1.2 : .65) + 470) % 470 - 8;
      if (tier === 2) {
        g.strokeStyle = `rgba(121,224,239,${.08 + (i % 3) * .035})`;
        g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y + 8); g.stroke();
      } else if (tier === 3) {
        g.fillStyle = `rgba(${i % 2 ? '202,137,77' : '164,86,192'},${.08 + (i % 4) * .025})`;
        g.beginPath(); g.arc(x, y, 1 + (i % 3) * .45, 0, Math.PI * 2); g.fill();
      } else {
        const glow = 1.2 + (i % 4) * .45;
        g.shadowColor = '#a86be5'; g.shadowBlur = 5;
        g.fillStyle = `rgba(185,126,238,${.1 + (i % 3) * .035})`;
        g.beginPath(); g.arc(x, y, glow, 0, Math.PI * 2); g.fill();
      }
    }
    g.restore();
  },

  drawSpecialFloorDetails(g, map, camX, camY) {
    const b = map.settlementBounds;
    if (b) {
      const kind = map.settlementKind;
      const base = {
        lake: ['rgba(84,55,34,.90)', 'rgba(214,167,90,.50)'],
        thief: ['rgba(75,49,42,.86)', 'rgba(206,118,65,.38)'],
        falseHome: ['rgba(95,111,117,.78)', 'rgba(220,237,230,.30)'],
        dream: ['rgba(48,42,91,.84)', 'rgba(156,199,235,.36)'],
      }[kind] || ['rgba(58,50,44,.82)', 'rgba(215,184,122,.32)'];
      g.save();
      for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
        if (map.tiles[y][x] !== Art.T.FLOOR && map.tiles[y][x] !== Art.T.PATH && map.tiles[y][x] !== Art.T.CIRCLE) continue;
        const sx = Math.round(x * 32 - camX), sy = Math.round(y * 32 - camY);
        g.fillStyle = base[0]; g.fillRect(sx, sy, 32, 32);
        g.strokeStyle = base[1]; g.lineWidth = 1;
        if (kind === 'lake') {
          // 幅の違う板と継ぎ目で、石床ではなく水上の足場に見せる。
          for (const yy of [8, 19, 30]) { g.beginPath(); g.moveTo(sx, sy + yy); g.lineTo(sx + 32, sy + yy); g.stroke(); }
          const seam = 7 + Math.abs((x * 11 + y * 7) % 18);
          g.beginPath(); g.moveTo(sx + seam, sy); g.lineTo(sx + seam - 2, sy + 8); g.stroke();
          g.fillStyle = 'rgba(240,207,131,.48)'; g.fillRect(sx + 3, sy + 3, 2, 2); g.fillRect(sx + 27, sy + 25, 2, 2);
        } else if (kind === 'thief') {
          g.strokeRect(sx + 2.5, sy + 2.5, 27, 27);
          if ((x + y) % 3 === 0) {
            g.strokeStyle = 'rgba(236,190,119,.25)'; g.beginPath();
            g.moveTo(sx + 9, sy + 22); g.lineTo(sx + 16, sy + 9); g.lineTo(sx + 23, sy + 22); g.stroke();
          }
        } else if (kind === 'falseHome') {
          g.strokeRect(sx + 1.5, sy + 1.5, 29, 29);
          g.fillStyle = `rgba(224,241,234,${.035 + ((x + y) % 3) * .018})`; g.fillRect(sx + 4, sy + 4, 24, 24);
        } else if (kind === 'dream') {
          g.strokeRect(sx + 3.5, sy + 3.5, 25, 25);
          const pulse = .25 + Math.sin(this.animT * 2 + x + y) * .08;
          g.fillStyle = `rgba(188,232,255,${pulse})`;
          g.beginPath(); g.arc(sx + 16, sy + 16, 1.5, 0, Math.PI * 2); g.fill();
        }
      }

      const sx = b.x * 32 - camX, sy = b.y * 32 - camY, sw = b.w * 32, sh = b.h * 32;
      if (kind === 'lake') {
        // 浮島の縁、係留杭、灯り。背景の水色と暖色の生活光を対比させる。
        g.strokeStyle = 'rgba(225,184,101,.82)'; g.lineWidth = 3; g.strokeRect(sx + 2, sy + 2, sw - 4, sh - 4);
        for (const [lx, ly] of [[sx + 8, sy + 9], [sx + sw - 8, sy + 9], [sx + 8, sy + sh - 9], [sx + sw - 8, sy + sh - 9]]) {
          g.strokeStyle = '#3e281b'; g.lineWidth = 3; g.beginPath(); g.moveTo(lx, ly + 14); g.lineTo(lx, ly - 8); g.stroke();
          const glow = g.createRadialGradient(lx, ly - 9, 1, lx, ly - 9, 25);
          glow.addColorStop(0, 'rgba(255,220,128,.72)'); glow.addColorStop(1, 'rgba(255,177,66,0)');
          g.fillStyle = glow; g.fillRect(lx - 25, ly - 34, 50, 50);
          g.fillStyle = '#ffd47a'; g.beginPath(); g.arc(lx, ly - 9, 3, 0, Math.PI * 2); g.fill();
        }
      } else if (kind === 'thief') {
        for (const [cx, cy, col] of [[sx + 8, sy + 10, '#9f423e'], [sx + sw - 72, sy + 10, '#b9783e']]) {
          g.fillStyle = col; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 64, cy); g.lineTo(cx + 54, cy + 25); g.lineTo(cx + 8, cy + 25); g.closePath(); g.fill();
          g.strokeStyle = 'rgba(255,222,162,.38)'; g.stroke();
        }
        g.fillStyle = '#68432c'; g.fillRect(sx + sw - 42, sy + sh - 35, 25, 22);
        g.strokeStyle = '#c49358'; g.strokeRect(sx + sw - 41.5, sy + sh - 34.5, 24, 21);
      } else if (kind === 'falseHome') {
        // どこか懐かしいのに線が二重にずれた家。記憶の不自然さを一目で出す。
        for (let i = 0; i < 3; i++) {
          const hx = sx + 20 + i * (sw - 74) / 2, hy = sy + 28 + (i % 2) * 10;
          for (const off of [0, 4]) {
            g.strokeStyle = off ? 'rgba(104,184,207,.24)' : 'rgba(231,237,216,.48)'; g.lineWidth = 2;
            g.strokeRect(hx + off, hy + 18, 48, 36);
            g.beginPath(); g.moveTo(hx - 4 + off, hy + 19); g.lineTo(hx + 24 + off, hy - 2); g.lineTo(hx + 52 + off, hy + 19); g.stroke();
          }
        }
      } else if (kind === 'dream') {
        for (let i = 0; i < 7; i++) {
          const ox = sx + 18 + ((i * 53) % Math.max(40, sw - 36));
          const oy = sy + 15 + ((i * 31) % Math.max(35, sh - 30));
          const pulse = .55 + Math.sin(this.animT * 2.4 + i) * .24;
          g.shadowColor = '#a9e9ff'; g.shadowBlur = 12;
          g.fillStyle = `rgba(202,239,255,${pulse})`; g.beginPath(); g.arc(ox, oy, 2.2, 0, Math.PI * 2); g.fill();
        }
      }
      g.restore();
    }

    if (map.rescueSite) {
      const r = map.rescueSite;
      const x = r.cx * 32 + 16 - camX, y = r.cy * 32 + 28 - camY;
      g.save();
      const glow = g.createRadialGradient(x, y - 22, 3, x, y - 22, 52);
      glow.addColorStop(0, 'rgba(225,147,78,.20)'); glow.addColorStop(1, 'rgba(70,34,26,0)');
      g.fillStyle = glow; g.fillRect(x - 54, y - 74, 108, 95);
      g.strokeStyle = r.rescued ? 'rgba(132,105,78,.72)' : 'rgba(207,176,126,.88)';
      g.lineWidth = 3;
      if (r.rescued) {
        g.beginPath(); g.moveTo(x - 28, y - 49); g.lineTo(x - 15, y + 4); g.moveTo(x + 26, y - 46); g.lineTo(x + 12, y + 5); g.stroke();
      } else {
        g.strokeRect(x - 30, y - 54, 60, 58);
        for (let bx = -20; bx <= 20; bx += 10) { g.beginPath(); g.moveTo(x + bx, y - 53); g.lineTo(x + bx, y + 3); g.stroke(); }
        g.beginPath(); g.moveTo(x - 30, y - 54); g.lineTo(x, y - 70); g.lineTo(x + 30, y - 54); g.stroke();
      }
      g.restore();
    }
  },

  drawSpecialFloorAtmosphere(g, map) {
    const kind = map.settlementKind;
    if (!kind && !map.rescueSite) return;
    g.save();
    if (kind === 'lake') {
      const wash = g.createLinearGradient(0, 0, 0, 448);
      wash.addColorStop(0, 'rgba(75,207,224,.13)'); wash.addColorStop(1, 'rgba(4,54,82,.13)');
      g.fillStyle = wash; g.fillRect(0, 0, 512, 448);
      for (let i = 0; i < 8; i++) {
        const x = ((i * 79 + this.animT * 13) % 590) - 40, y = 55 + (i * 47) % 350;
        g.strokeStyle = `rgba(177,244,250,${.08 + (i % 3) * .025})`; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + 24, y); g.stroke();
      }
    } else if (kind === 'falseHome') {
      g.fillStyle = map.falseHomeAwake ? 'rgba(36,28,60,.12)' : 'rgba(213,230,221,.16)'; g.fillRect(0, 0, 512, 448);
      for (let i = 0; i < 6; i++) {
        const y = 54 + i * 66 + Math.sin(this.animT * .7 + i) * 9;
        const mist = g.createLinearGradient(0, y, 512, y);
        mist.addColorStop(0, 'rgba(228,242,235,0)'); mist.addColorStop(.5, 'rgba(228,242,235,.11)'); mist.addColorStop(1, 'rgba(228,242,235,0)');
        g.fillStyle = mist; g.fillRect(0, y, 512, 20);
      }
    } else if (kind === 'dream') {
      g.fillStyle = 'rgba(19,12,59,.13)'; g.fillRect(0, 0, 512, 448);
      for (let i = 0; i < 20; i++) {
        const x = (i * 91 + Math.sin(this.animT * .6 + i) * 26 + 520) % 520;
        const y = (i * 43 - this.animT * (3 + i % 3) + 470) % 470;
        g.fillStyle = `rgba(196,231,255,${.09 + (i % 4) * .025})`;
        g.beginPath(); g.arc(x, y, 1 + (i % 3) * .4, 0, Math.PI * 2); g.fill();
      }
    } else if (kind === 'thief' || map.rescueSite) {
      const warm = g.createRadialGradient(256, 240, 30, 256, 240, 320);
      warm.addColorStop(0, 'rgba(210,111,58,.08)'); warm.addColorStop(1, 'rgba(30,11,18,.10)');
      g.fillStyle = warm; g.fillRect(0, 0, 512, 448);
    }
    g.restore();
  },

  drawPitfalls(g, map, camX, camY) {
    if (!map.pitfalls) return;
    for (const pit of map.pitfalls) {
      const x = Math.round(pit.x * 32 - camX), y = Math.round(pit.y * 32 - camY);
      g.save();
      g.strokeStyle = pit.known ? 'rgba(25,18,18,.92)' : 'rgba(22,28,39,.72)';
      g.lineWidth = 2;
      const cracks = [[16,4,14,13,7,17], [14,13,20,18,27,16], [14,13,13,23,7,28], [20,18,22,27,28,30]];
      for (const c of cracks) {
        g.beginPath(); g.moveTo(x + c[0], y + c[1]); g.lineTo(x + c[2], y + c[3]); g.lineTo(x + c[4], y + c[5]); g.stroke();
      }
      if (pit.known) {
        g.fillStyle = '#8b633e'; g.strokeStyle = '#d0a46b'; g.lineWidth = 1;
        for (const py of [9, 20]) { g.fillRect(x + 2, y + py, 28, 6); g.strokeRect(x + 2.5, y + py + .5, 27, 5); }
      } else {
        const pulse = .16 + Math.sin(this.animT * 3.2) * .05;
        g.fillStyle = `rgba(88,181,207,${pulse})`; g.beginPath(); g.arc(x + 16, y + 17, 11, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    }
  },

  drawCampfires(g, map, camX, camY) {
    if (!map.campfires) return;
    for (const fire of map.campfires) {
      const x = fire.x * 32 + 16 - camX, y = fire.y * 32 + 25 - camY;
      const flicker = Math.sin(this.animT * 11 + fire.x) * 2;
      g.save();
      const glow = g.createRadialGradient(x, y - 7, 2, x, y - 7, 48);
      glow.addColorStop(0, 'rgba(255,211,92,.35)'); glow.addColorStop(1, 'rgba(255,116,45,0)');
      g.fillStyle = glow; g.fillRect(x - 48, y - 55, 96, 96);
      g.strokeStyle = '#503522'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(x - 10, y + 3); g.lineTo(x + 10, y - 3); g.moveTo(x - 10, y - 3); g.lineTo(x + 10, y + 3); g.stroke();
      g.fillStyle = '#e84f2f'; g.beginPath(); g.ellipse(x, y - 10, 8, 15 + flicker, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffd45c'; g.beginPath(); g.ellipse(x + 1, y - 8, 4, 9 - flicker * .3, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  },

  drawChapterGate(g, map, camX, camY) {
    if (!map.chapterGate) return;
    const x = map.chapterGate.x * 32 + 16 - camX;
    const y = map.chapterGate.y * 32 + 17 - camY;
    const pulse = .78 + Math.sin(this.animT * 2.1) * .12;
    g.save();
    const beam = g.createLinearGradient(x, y - 92, x, y + 25);
    beam.addColorStop(0, 'rgba(255,235,169,0)');
    beam.addColorStop(.55, `rgba(255,222,139,${.18 * pulse})`);
    beam.addColorStop(1, 'rgba(255,188,92,0)');
    g.fillStyle = beam;
    g.beginPath(); g.moveTo(x - 9, y - 90); g.lineTo(x + 9, y - 90); g.lineTo(x + 26, y + 25); g.lineTo(x - 26, y + 25); g.closePath(); g.fill();
    g.shadowColor = '#ffd98c'; g.shadowBlur = 15;
    g.strokeStyle = `rgba(255,235,177,${pulse})`; g.lineWidth = 2;
    g.beginPath(); g.ellipse(x, y + 7, 18, 9, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(x, y - 5, 13, Math.PI, Math.PI * 2); g.stroke();
    g.fillStyle = `rgba(255,244,199,${.82 * pulse})`;
    g.beginPath(); g.moveTo(x, y - 29); g.lineTo(x + 5, y - 17); g.lineTo(x, y - 10); g.lineTo(x - 5, y - 17); g.closePath(); g.fill();
    g.restore();
  },

  drawWorldAnchor(g, map, camX, camY) {
    if (!map.worldAnchor) return;
    const x = map.worldAnchor.x * 32 + 16 - camX;
    const y = map.worldAnchor.y * 32 - 23 - camY;
    const pulse = .72 + Math.sin(this.animT * 2.4) * .16;
    g.save();
    const glow = g.createRadialGradient(x, y, 2, x, y, 34);
    glow.addColorStop(0, `rgba(194,249,255,${.62 * pulse})`);
    glow.addColorStop(1, 'rgba(79,194,224,0)');
    g.fillStyle = glow; g.fillRect(x - 38, y - 38, 76, 76);
    g.shadowColor = '#9ff3ff'; g.shadowBlur = 13;
    g.fillStyle = `rgba(180,244,255,${pulse})`;
    g.beginPath();
    g.moveTo(x, y - 14); g.lineTo(x + 9, y); g.lineTo(x, y + 15); g.lineTo(x - 9, y); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(230,253,255,.85)'; g.lineWidth = 1;
    g.stroke();
    g.restore();
  },

  drawSkySeaAtmosphere(g, map) {
    if (!map.skySea) return;
    g.save();
    const wash = g.createLinearGradient(0, 0, 0, 448);
    wash.addColorStop(0, 'rgba(21,151,190,.28)');
    wash.addColorStop(.42, 'rgba(45,120,164,.10)');
    wash.addColorStop(1, 'rgba(4,32,64,.20)');
    g.fillStyle = wash; g.fillRect(0, 0, 512, 448);

    // 天井側を流れる水面と、ゆっくり横切る魚影。
    for (let i = 0; i < 6; i++) {
      const y = 20 + i * 19 + Math.sin(this.animT * 1.1 + i) * 4;
      g.strokeStyle = `rgba(161,239,250,${.10 + (i % 3) * .035})`;
      g.lineWidth = 1.4; g.beginPath();
      for (let x = -20; x <= 540; x += 18) {
        const yy = y + Math.sin(x * .036 + this.animT * 1.7 + i) * 4;
        if (x === -20) g.moveTo(x, yy); else g.lineTo(x, yy);
      }
      g.stroke();
    }
    for (let i = 0; i < 5; i++) {
      const x = ((i * 137 + this.animT * (9 + i * 1.8)) % 620) - 60;
      const y = 42 + (i % 3) * 31;
      const s = 7 + (i % 3) * 3;
      g.fillStyle = 'rgba(5,45,72,.30)';
      g.beginPath(); g.ellipse(x, y, s * 1.7, s * .62, 0, 0, Math.PI * 2);
      g.moveTo(x - s * 1.55, y); g.lineTo(x - s * 2.35, y - s * .72); g.lineTo(x - s * 2.25, y + s * .72); g.closePath(); g.fill();
    }
    // 気泡は重力に逆らい、床から空の海へ吸い上げられる。
    for (let i = 0; i < 20; i++) {
      const x = (i * 79 + map.floor * 13) % 520;
      const y = (455 - ((this.animT * (11 + i % 4) + i * 37) % 490));
      const r = 1.2 + (i % 4) * .6;
      g.strokeStyle = `rgba(199,247,255,${.16 + (i % 3) * .05})`;
      g.lineWidth = 1; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
    }
    g.restore();
  },

  drawFalling(g) {
    const t = this.fallEvent ? this.fallEvent.t : 0;
    g.fillStyle = `rgba(1,4,12,${Math.min(.82, .28 + t * .42)})`; g.fillRect(0, 0, 512, 448);
    g.save(); g.strokeStyle = 'rgba(155,225,245,.38)'; g.lineWidth = 2;
    for (let i = 0; i < 24; i++) {
      const x = (i * 71 + 29) % 520, y = ((i * 97 + t * 520) % 520) - 60;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y + 38 + (i % 4) * 9); g.stroke();
    }
    g.restore();
    const shownFloor = t < .55 ? 14 : t < 1.05 ? 13 : 12;
    const label = `${shownFloor}F`;
    UI.text(g, label, 256 - UI.measure(g, label, 26) / 2, 224, '#dff8ff', 26);
  },

  drawV5Dungeon(g, map, camX, camY, x0, y0, x1, y1, atlas) {
    const T = Art.T, TS = 32;
    const cells = map.tier >= 2
      ? { floor: 0, floorAlt: map.tier === 2 ? 2 : 1, water: 1, wallFront: 4, wallBack: 5, up: 8, down: 9, chest: 10, chestOpen: 11, pillar: 13, circle: 14, sign: 12, door: 7 }
      : { floor: 0, floorAlt: 1, water: 4, wallFront: 2, wallBack: 3, up: 6, down: 7, chest: 8, chestOpen: 9, pillar: 11, circle: 12, sign: 13, door: 15 };
    const cellW = atlas.naturalWidth / 4, cellH = atlas.naturalHeight / 4;
    const drawCell = (index, dx, dy, dw = TS, dh = TS) => {
      const sx = (index % 4) * cellW, sy = Math.floor(index / 4) * cellH;
      g.drawImage(atlas, sx, sy, cellW, cellH, dx, dy, dw, dh);
    };
    // すべての歩行領域に連続する床を敷く。
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (x < 0 || y < 0 || x >= map.w || y >= map.h) continue;
      const dx = Math.round(x * TS - camX), dy = Math.round(y * TS - camY);
      const t = map.tiles[y][x];
      if (t === T.VOID && map.tier === 2) {
        drawCell(cells.water, dx, dy);
        g.fillStyle = 'rgba(2,20,34,.64)'; g.fillRect(dx, dy, TS, TS);
        const glint = (this.animT * 12 + x * 9 + y * 5) % 34;
        g.strokeStyle = 'rgba(91,197,220,.14)'; g.beginPath();
        g.moveTo(dx + glint - 10, dy + 15); g.lineTo(dx + glint + 8, dy + 15); g.stroke();
        continue;
      }
      if (t === T.VOID && map.tier === 3) {
        drawCell(cells.floorAlt, dx, dy);
        g.fillStyle = 'rgba(15,8,22,.72)'; g.fillRect(dx, dy, TS, TS);
        if ((x * 7 + y * 11) % 13 === 0) {
          g.fillStyle = 'rgba(158,82,190,.2)'; g.beginPath();
          g.arc(dx + 10, dy + 21, 3, Math.PI, Math.PI * 2); g.arc(dx + 20, dy + 24, 2.5, Math.PI, Math.PI * 2); g.fill();
        }
        continue;
      }
      if (t === T.VOID && map.tier === 4) {
        drawCell(cells.floorAlt, dx, dy);
        g.fillStyle = 'rgba(5,3,24,.78)'; g.fillRect(dx, dy, TS, TS);
        const mist = (this.animT * 9 + x * 5 + y * 8) % 40;
        g.strokeStyle = 'rgba(137,95,195,.1)'; g.beginPath();
        g.moveTo(dx + mist - 12, dy + 19); g.lineTo(dx + mist + 10, dy + 19); g.stroke();
        continue;
      }
      if (t === T.VOID || t === T.WALL) {
        const grad = g.createLinearGradient(dx, dy, dx, dy + TS);
        grad.addColorStop(0, '#111a22'); grad.addColorStop(1, '#070c13');
        g.fillStyle = grad; g.fillRect(dx, dy, TS, TS); continue;
      }
      const baseCell = t === T.WATER ? cells.water : ((x * 3 + y * 5 + map.floor) % 7 === 0 ? cells.floorAlt : cells.floor);
      drawCell(baseCell, dx, dy);
    }
    // 壁・階段・小物は床の上へ独立して描く。
    for (let y = y0 - 1; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (x < 0 || y < 0 || x >= map.w || y >= map.h) continue;
      const t = map.tiles[y][x];
      const dx = Math.round(x * TS - camX), dy = Math.round(y * TS - camY);
      if (t === T.WALL) {
        const openBelow = y + 1 < map.h && map.tiles[y + 1][x] !== T.WALL;
        const openAbove = y > 0 && map.tiles[y - 1][x] !== T.WALL;
        const openSide = (x > 0 && map.tiles[y][x - 1] !== T.WALL) || (x + 1 < map.w && map.tiles[y][x + 1] !== T.WALL);
        if (openBelow) drawCell(cells.wallFront, dx, dy - 15, TS, 47);
        else if (openAbove) drawCell(cells.wallBack, dx, dy + 4, TS, 28);
        else if (openSide) {
          g.fillStyle = '#26333c'; g.fillRect(dx + 5, dy, 22, TS);
          g.fillStyle = 'rgba(132,154,157,.3)'; g.fillRect(dx + 5, dy, 2, TS);
        }
      } else if (t === T.UP) drawCell(cells.up, dx - 3, dy - 5, 38, 38);
      else if (t === T.DOWN) drawCell(cells.down, dx - 3, dy - 5, 38, 38);
      else if (t === T.CHEST) drawCell(cells.chest, dx - 2, dy - 7, 36, 38);
      else if (t === T.CHEST_OPEN) drawCell(cells.chestOpen, dx - 2, dy - 7, 36, 38);
      else if (t === T.PILLAR) drawCell(cells.pillar, dx - 4, dy - 28, 40, 60);
      else if (t === T.CIRCLE) drawCell(cells.circle, dx, dy, TS, TS);
      else if (t === T.SIGN) drawCell(cells.sign, dx - 2, dy - 7, 36, 38);
      else if (t === T.DOOR) drawCell(cells.door, dx - 3, dy - 9, 38, 42);
      else if (t === T.WATER) {
        g.fillStyle = 'rgba(35,126,156,.24)'; g.fillRect(dx, dy, TS, TS);
        g.strokeStyle = 'rgba(137,235,247,.55)'; g.lineWidth = 1;
        const wave = (this.animT * 16 + x * 7 + y * 3) % 25;
        g.beginPath(); g.moveTo(dx + wave - 8, dy + 10); g.lineTo(dx + wave + 7, dy + 10); g.stroke();
      }
    }
    // 探索領域に冷たい光を薄く重ね、床・壁・人物を同じ空気へ馴染ませる。
    const light = g.createRadialGradient(256, 210, 35, 256, 210, 330);
    light.addColorStop(0, 'rgba(95,220,231,.055)'); light.addColorStop(1, 'rgba(3,8,18,.25)');
    g.fillStyle = light; g.fillRect(0, 0, 512, 448);
  },

  drawActorShadow(g, x, y, rx = 12, ry = 4, lift = 0, opacity = 1) {
    // filter blur は人数分重なるとスマホで重い。二重の楕円で柔らかさを保つ。
    const air = Math.max(0, Math.min(1, lift / 6));
    const spread = 1 - air * .16;
    g.save();
    g.fillStyle = `rgba(5,10,15,${.12 * opacity})`;
    g.beginPath(); g.ellipse(x, y + .5, rx * 1.14 * spread, ry * 1.25 * spread, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = `rgba(5,10,15,${(.25 - air * .065) * opacity})`;
    g.beginPath(); g.ellipse(x, y, rx * spread, ry * spread, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  },

  drawFieldHero(g, pxx, pyy, fallbackFrame, progress = 1) {
    const footX = pxx + 16, footY = pyy + 31;
    if (this.drawFieldCharacterSheet(g, 'hero', footX, footY, this.dir,
      this.moving, progress, this.moveFromDir || this.dir, 1)) return;
    const spr = Art.get(`hero_${this.dir}${fallbackFrame}`);
    if (!spr) return;
    const p = Math.max(0, Math.min(1, progress));
    const envelope = this.moving ? Math.sin(Math.PI * p) : 0;
    const phase = p * Math.PI * 2;
    const lift = Math.abs(Math.sin(phase)) * .65 * envelope;
    const lean = Math.sin(phase) * .012 * envelope;
    this.drawActorShadow(g, footX, footY, 12, 4, lift);
    g.save();
    g.translate(footX, footY - lift);
    g.rotate(lean);
    g.drawImage(spr, -16, -31, 32, 32);
    g.restore();
  },

  drawFieldCharacterSheet(g, id, footX, footY, dir, moving = false, progress = 0,
    fromDir = dir, stepPolarity = 1) {
    const sheet = this.fieldCharacters && this.fieldCharacters[id];
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return false;
    const cols = 6, rows = 4;
    const cellW = sheet.naturalWidth / cols, cellH = sheet.naturalHeight / rows;
    const rowsByDir = { d: 0, l: 1, r: 2, u: 3 };
    const row = rowsByDir[dir] ?? 0;
    const fromRow = rowsByDir[fromDir] ?? row;
    const p = Math.max(0, Math.min(1, progress));
    // 6コマを1マスの距離に固定し、足運びと地面の移動量を同期する。
    const col = moving ? Math.min(cols - 1, Math.floor(p * cols)) : 0;
    const envelope = moving ? Math.sin(Math.PI * p) : 0;
    const phase = p * Math.PI * 2;
    const stride = Math.sin(phase) * stepPolarity;
    const lift = Math.abs(Math.sin(phase)) * .68 * envelope;
    const lean = stride * .013 * envelope;
    const squash = Math.cos(phase * 2) * .006 * envelope;
    const isTurning = moving && fromRow !== row;
    const turnT = isTurning ? this.fieldMoveEase(Math.min(1, p / .24)) : 1;
    const turnSign = dir === 'l' ? -1 : dir === 'r' ? 1 : 0;
    const sizes = { rino: [47, 65], gald: [52, 68], fio: [47, 64] };
    const [dw, dh] = sizes[id] || [48, 66];
    this.drawActorShadow(g, footX, footY, Math.max(10, dw * .24), 4, lift);
    g.save();
    g.translate(footX, footY + 3 - lift);
    g.rotate(lean + Math.sin(turnT * Math.PI) * turnSign * .015);
    g.scale(1 - squash, 1 + squash);
    if (isTurning && turnT < 1) {
      g.globalAlpha = 1 - turnT;
      g.drawImage(sheet, col * cellW, fromRow * cellH, cellW, cellH, -dw / 2, -dh, dw, dh);
      g.globalAlpha = turnT;
    }
    g.drawImage(sheet, col * cellW, row * cellH, cellW, cellH, -dw / 2, -dh, dw, dh);
    g.restore();
    return true;
  },

  drawFieldPartyMember(g, actor, camX, camY) {
    const footX = actor.x + 16 - camX, footY = actor.y + 31 - camY;
    if (actor.member.kind === 'human') {
      if (this.drawFieldCharacterSheet(g, actor.member.id, footX, footY, actor.dir,
        actor.moving, actor.motionT, actor.fromDir, actor.stepPolarity)) return;
      const human = HUMANS[actor.member.id];
      const fallback = human && (Art.get(`${human.spr}_${actor.dir}0`) || Art.get(`${human.spr}_0`) || Art.get(human.spr));
      if (fallback) {
        this.drawActorShadow(g, footX, footY, 11, 3.5);
        g.drawImage(fallback, Math.round(footX - 16), Math.round(footY - 31), 32, 32);
      }
      return;
    }
    const def = MONSTERS[actor.member.id];
    const spr = def && (Art.get(`${def.spr}_0`) || Art.get(`${def.spr}_d0`) || Art.get(def.spr));
    if (!spr) return;
    const large = !!def.big;
    const size = large ? 48 : 38;
    const p = Math.max(0, Math.min(1, actor.motionT ?? 1));
    const polarity = actor.stepPolarity || 1;
    const phase = p * Math.PI * 2 + (polarity < 0 ? Math.PI : 0);
    const envelope = actor.moving ? Math.sin(Math.PI * p) : 0;
    const species = actor.member.id;
    const idleWave = Math.sin(this.animT * 2.2 + actor.x * .03);
    let lift = -idleWave * .28 * (1 - envelope);
    let sx = 1, sy = 1, lean = 0, shadowLift = 0, shadowOpacity = 1;
    if (actor.moving) {
      if (/slime/.test(species)) {
        const pulse = Math.sin(phase) * envelope;
        sx = 1 + pulse * .065; sy = 1 - pulse * .08;
        lift += Math.abs(Math.sin(phase)) * 1.05 * envelope; shadowLift = Math.max(0, lift);
      } else if (/bat/.test(species)) {
        sy = 1 + Math.sin(phase * 2) * .045 * envelope;
        lift = 2.3 + idleWave * .55 * (1 - envelope) + Math.sin(phase) * 1.2 * envelope;
        shadowLift = 4; shadowOpacity = .76;
      } else if (/ghost|wraith|mist|aquan/.test(species)) {
        lift = 1.8 + idleWave * .6 * (1 - envelope) + Math.sin(phase) * 1.35 * envelope;
        lean = Math.sin(phase) * .018 * envelope; shadowLift = 3.5; shadowOpacity = .8;
      } else if (/rock|machine/.test(species)) {
        lift += Math.abs(Math.sin(phase)) * .75 * envelope;
        sx = 1 + Math.sin(phase) * .014 * envelope; shadowLift = lift;
      } else {
        lift += Math.abs(Math.sin(phase)) * 1.05 * envelope;
        lean = Math.sin(phase) * .02 * envelope * polarity; shadowLift = lift;
      }
    } else if (/bat/.test(species)) {
      lift = 2.3 + idleWave * .55; shadowLift = 4; shadowOpacity = .76;
    } else if (/ghost|wraith|mist|aquan/.test(species)) {
      lift = 1.8 + idleWave * .6; shadowLift = 3.5; shadowOpacity = .8;
    }
    const oldFacing = actor.fromDir === 'l' ? -1 : 1;
    const newFacing = actor.dir === 'l' ? -1 : 1;
    const turning = actor.moving && oldFacing !== newFacing;
    const turnT = turning ? this.fieldMoveEase(Math.min(1, p / .24)) : 1;
    let facing = newFacing;
    if (turning && turnT < .5) facing = oldFacing * Math.max(.12, 1 - turnT * 2);
    else if (turning) facing = newFacing * Math.max(.12, (turnT - .5) * 2);
    this.drawActorShadow(g, footX, footY, large ? 17 : 12, large ? 5 : 3.5,
      shadowLift, shadowOpacity);
    g.save();
    g.translate(footX, footY + 2 - lift);
    g.rotate(lean);
    g.scale(facing * sx, sy);
    g.drawImage(spr, -size / 2, -size, size, size);
    g.restore();
  },

  drawFieldNpc(g, n, camX, camY, frame, worldX = n.x, worldY = n.y,
    motionT = 1, fromDir = n.dir) {
    const TS = 32;
    const nx = worldX * TS - camX, ny = worldY * TS - camY;
    const footX = nx + 16, footY = ny + 31;
    if (n.bossSpr) {
      const spr = Art.get(n.bossSpr);
      if (!spr) return;
      this.drawActorShadow(g, footX, footY, 22, 7);
      const dw = 72, dh = 72;
      g.drawImage(spr, footX - dw / 2, footY - dh, dw, dh);
      return;
    }
    if (!n.spr) return;
    if (this.fieldCharacters && this.fieldCharacters[n.spr]) {
      if (this.drawFieldCharacterSheet(g, n.spr, footX, footY, n.dir || 'd',
        !!n.npcMoving, motionT, fromDir || n.dir, 1)) return;
    }
    const npcSheet = this.npcDirectionSheets && this.npcDirectionSheets[n.spr];
    const npcSize = {
      elder: [44, 60], woman: [42, 58], man: [42, 58],
      child: [36, 48], merchant: [42, 58], guard: [42, 58], celest: [42, 60],
    }[n.spr];
    if (npcSize && npcSheet && npcSheet.complete && npcSheet.naturalWidth) {
      const [dw, dh] = npcSize;
      const cellW = npcSheet.naturalWidth / 4, cellH = npcSheet.naturalHeight;
      const colsByDir = { d: 0, l: 1, r: 2, u: 3 };
      const col = colsByDir[n.dir || 'd'] ?? 0;
      const fromCol = colsByDir[fromDir || n.dir || 'd'] ?? col;
      const p = Math.max(0, Math.min(1, motionT));
      const phase = n.npcMoving ? p * Math.PI * 2 : this.animT * 1.7 + n.x * .7 + n.y;
      const envelope = n.npcMoving ? Math.sin(Math.PI * p) : 0;
      const stride = Math.sin(phase);
      const lift = n.npcMoving ? Math.abs(stride) * .72 * envelope : Math.sin(phase) * .16;
      const sideStep = n.npcMoving && (n.dir === 'u' || n.dir === 'd') ? stride * .22 * envelope : 0;
      const lean = n.npcMoving ? stride * .016 * envelope : 0;
      const squash = n.npcMoving ? Math.cos(phase * 2) * .006 * envelope : 0;
      const isTurning = n.npcMoving && fromCol !== col;
      const turnT = isTurning ? this.fieldMoveEase(Math.min(1, p / .28)) : 1;
      this.drawActorShadow(g, footX, footY, Math.max(9, dw * .24), 3.5, Math.max(0, lift));
      g.save();
      g.translate(footX + sideStep, footY + 2 - lift);
      g.rotate(lean);
      g.scale(1 - squash, 1 + squash);
      if (isTurning && turnT < 1) {
        g.globalAlpha = 1 - turnT;
        g.drawImage(npcSheet, fromCol * cellW, 0, cellW, cellH, -dw / 2, -dh, dw, dh);
        g.globalAlpha = turnT;
      }
      g.drawImage(npcSheet, col * cellW, 0, cellW, cellH, -dw / 2, -dh, dw, dh);
      g.restore();
      return;
    }
    // V4全身立ち絵は会話専用。フィールドでは同一スケールの生成スプライトを使う。
    const p = Math.max(0, Math.min(1, motionT));
    const walkFrame = n.npcMoving ? Math.min(1, Math.floor(p * 2)) : frame;
    const spr = Art.get(`${n.spr}_${n.dir || 'd'}${walkFrame}`) || Art.get(`${n.spr}_${walkFrame}`) || Art.get(`${n.spr}_0`);
    if (spr) {
      const phase = p * Math.PI * 2;
      const envelope = n.npcMoving ? Math.sin(Math.PI * p) : 0;
      const lift = Math.abs(Math.sin(phase)) * .55 * envelope;
      const lean = Math.sin(phase) * .012 * envelope;
      this.drawActorShadow(g, footX, footY, 10, 3.5, lift);
      g.save();
      g.translate(footX, footY - lift);
      g.rotate(lean);
      g.drawImage(spr, -16, -31, TS, TS);
      g.restore();
    }
  },

  drawTownForeground(g, im, camX, camY) {
    if (!im || !im.naturalWidth) return;
    const worldW = this.map.w * 32, worldH = this.map.h * 32;
    const scaleX = im.naturalWidth / worldW, scaleY = im.naturalHeight / worldH;
    const regionsByFloor = {
      1: [
        { type: 'ellipse', x: 78, y: 292, rx: 54, ry: 62 },
        { type: 'ellipse', x: 548, y: 254, rx: 70, ry: 82 },
        { type: 'ellipse', x: 430, y: 382, rx: 48, ry: 52 },
      ],
      11: [
        { type: 'rect', x: 76, y: 35, w: 174, h: 160 },
        { type: 'rect', x: 386, y: 45, w: 154, h: 138 },
      ],
      21: [
        { type: 'rect', x: 0, y: 0, w: 286, h: 194 },
        { type: 'rect', x: 364, y: 0, w: 222, h: 194 },
        { type: 'ellipse', x: 132, y: 245, rx: 78, ry: 77 },
      ],
      31: [
        { type: 'rect', x: 0, y: 0, w: 278, h: 160 },
        { type: 'rect', x: 286, y: 18, w: 176, h: 148 },
        { type: 'rect', x: 480, y: 20, w: 160, h: 148 },
        { type: 'rect', x: 0, y: 145, w: 142, h: 142 },
        { type: 'rect', x: 124, y: 188, w: 174, h: 128 },
        { type: 'rect', x: 0, y: 322, w: 244, h: 190 },
        { type: 'rect', x: 356, y: 326, w: 284, h: 186 },
      ],
    };
    const regions = regionsByFloor[this.floor] || [];
    if (!regions.length) return;
    g.save();
    g.beginPath();
    for (const r of regions) {
      if (r.type === 'ellipse') {
        g.moveTo(r.x + r.rx - camX, r.y - camY);
        g.ellipse(r.x - camX, r.y - camY, r.rx, r.ry, 0, 0, Math.PI * 2);
      } else g.rect(r.x - camX, r.y - camY, r.w, r.h);
    }
    g.clip();
    g.drawImage(im,
      camX * scaleX, camY * scaleY, 512 * scaleX, 448 * scaleY,
      0, 0, 512, 448);
    g.restore();

    if (this.floor !== 1) return;
    // 1Fの水面と噴水に控えめな動きを足し、静止画感を弱める。
    const pulse = .34 + Math.sin(this.animT * 2.1) * .08;
    g.save();
    g.strokeStyle = `rgba(147, 239, 255, ${pulse})`;
    g.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      const radius = 8 + ((this.animT * 11 + i * 13) % 28);
      g.beginPath();
      g.ellipse(548 - camX, 277 - camY, radius * 1.7, radius * .55, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.restore();
  },

  drawMapDetails(g, map, camX, camY, x0, y0, x1, y1) {
    const T = Art.T, TS = 32;
    const hash = (x, y) => Math.abs(((x * 73856093) ^ (y * 19349663) ^ (map.floor * 83492791)) | 0);
    const tileAt = (x, y) => (y >= 0 && y < map.h && x >= 0 && x < map.w) ? map.tiles[y][x] : T.VOID;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (x < 0 || y < 0 || x >= map.w || y >= map.h) continue;
      const t = map.tiles[y][x], sx = Math.round(x * TS - camX), sy = Math.round(y * TS - camY), h = hash(x, y);
      if (t === T.GRASS) {
        g.fillStyle = h % 5 === 0 ? '#9bc46a' : '#477e3f';
        const bx = sx + 5 + (h % 20), by = sy + 7 + ((h >> 4) % 18);
        g.fillRect(bx, by, 2, 5); g.fillRect(bx - 2, by + 2, 2, 2); g.fillRect(bx + 2, by + 1, 2, 3);
        if (h % 13 === 0) {
          g.fillStyle = h % 2 ? '#ffe28a' : '#f3a6c8';
          g.fillRect(sx + 21, sy + 9, 3, 3); g.fillStyle = '#f8f1dc'; g.fillRect(sx + 22, sy + 10, 1, 1);
        }
      } else if (t === T.WATER) {
        const wave = (Math.floor(this.animT * 10) + x * 5 + y * 3) % 22;
        g.fillStyle = 'rgba(151,224,255,0.52)';
        g.fillRect(sx + wave - 8, sy + 8, 9, 2);
        g.fillRect(sx + ((wave + 13) % 28) - 3, sy + 23, 7, 2);
      } else if (t === T.FLOOR && h % 11 === 0) {
        g.fillStyle = 'rgba(45,39,48,0.24)';
        g.fillRect(sx + 8, sy + 11, 7, 2); g.fillRect(sx + 13, sy + 13, 2, 4);
      } else if (t === T.WALL) {
        if (tileAt(x, y + 1) !== T.WALL) {
          g.fillStyle = 'rgba(8,7,16,0.32)'; g.fillRect(sx, sy + 30, 32, 7);
          g.fillStyle = 'rgba(246,229,180,0.16)'; g.fillRect(sx + 2, sy + 28, 28, 2);
        }
        if (tileAt(x - 1, y) !== T.WALL) {
          g.fillStyle = 'rgba(244,225,178,0.15)'; g.fillRect(sx, sy + 2, 2, 27);
        }
      } else if (t === T.DOOR) {
        const glow = g.createRadialGradient(sx + 16, sy + 20, 2, sx + 16, sy + 20, 24);
        glow.addColorStop(0, 'rgba(255,205,92,0.34)'); glow.addColorStop(1, 'rgba(255,205,92,0)');
        g.fillStyle = glow; g.fillRect(sx - 8, sy, 48, 44);
      }
    }
  },

  dialogPortrait(line) {
    if (this.dialog && this.dialog.portrait) return this.dialog.portrait;
    const checks = [
      ['ソラ「', 'hero'], ['リノ「', 'rino'], ['ガルド「', 'gald'], ['フィオ「', 'fio'],
      ['むらおさ「', 'elder'], ['みこ「', 'celest'], ['やどや「', 'merchant'],
      ['ばんにん「', 'guard'], ['ちょうさたい「', 'merchant'],
    ];
    for (const [label, spr] of checks) if (line.startsWith(label)) return spr;
    return null;
  },

  drawDialog(g) {
    const dg = this.dialog;
    if (!dg) return;
    UI.window(g, 8, 336, 496, 104);
    const line = dg.lines[dg.idx];
    const shown = line.slice(0, Math.floor(dg.chars));
    const portrait = this.dialogPortrait(line);
    if (portrait && this.hdCharacters && this.hdCharacters[portrait]) {
      this.loadAssetOnce(this.hdCharacters[portrait], `assets/${portrait}-v4.png`);
    }
    let textX = 26, maxW = 458;
    if (portrait) {
      g.fillStyle = 'rgba(105,132,170,0.18)'; g.fillRect(18, 348, 66, 78);
      g.strokeStyle = '#b9cbe0'; g.lineWidth = 1; g.strokeRect(20.5, 350.5, 61, 73);
      const hd = this.hdCharacters && this.hdCharacters[portrait];
      if (hd && hd.complete && hd.naturalWidth) {
        const sh = Math.floor(hd.naturalHeight * .53);
        g.save(); g.beginPath(); g.rect(21, 351, 60, 74); g.clip();
        g.drawImage(hd, 0, 0, hd.naturalWidth, sh, 18, 349, 66, 78); g.restore();
      } else if (!this.drawVillageNpcPortrait(g, portrait, 21, 351, 60, 74)) {
        const ps = Art.get(`${portrait}_0`) || Art.get(`${portrait}_d0`);
        if (ps) g.drawImage(ps, 21, 355, 60, 60);
      }
      textX = 98; maxW = 380;
    }
    UI.textWrap(g, shown, textX, 366, maxW, '#fff', 16, 24);
    if (dg.chars >= line.length && Math.floor(this.animT * 2) % 2 === 0) {
      UI.cursor(g, 480, 422, 'down');
    }
  },

  drawVillageNpcPortrait(g, id, x, y, w, h) {
    const sheet = this.npcDirectionSheets && this.npcDirectionSheets[id];
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return false;
    const cellW = sheet.naturalWidth / 4, cellH = sheet.naturalHeight;
    const sx = 0, sy = 0;
    // 顔と上半身を会話枠へ拡大し、フィールド用の足元余白は切り落とす。
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.drawImage(sheet, sx + cellW * .12, sy + cellH * .04, cellW * .76, cellH * .67,
      x - 2, y - 2, w + 4, h + 12);
    g.restore();
    return true;
  },

  drawChoice(g) {
    const c = this.choiceBox;
    UI.window(g, 8, 336, 496, 104);
    UI.textWrap(g, c.text, 26, 366, 458, '#fff', 15, 22);
    UI.window(g, 390, 250, 110, 80);
    UI.text(g, 'はい', 428, 280, c.sel === 0 ? '#fff' : '#999', 16);
    UI.text(g, 'いいえ', 428, 306, c.sel === 1 ? '#fff' : '#999', 16);
    UI.cursor(g, 406, 268 + c.sel * 26, 'right');
  },

  // ---------- メニュー描画 ----------
  drawMenu(g) {
    const m = this.curMenu();
    if (!m) return;
    // ゴールド + 手記
    UI.window(g, 360, 8, 144, 40);
    UI.text(g, `${this.gold} G`, 378, 34, '#fd8', 16);
    if (this.journalCount() > 0) {
      UI.window(g, 360, 50, 144, 36);
      UI.text(g, `てがき ${this.journalCount()}/10`, 378, 74, '#adf', 13);
    }

    if (m.kind === 'main') {
      const items = this.mainMenuItems();
      UI.window(g, 8, 8, 150, 30 + items.length * 26);
      for (let i = 0; i < items.length; i++) {
        UI.text(g, items[i].label, 44, 36 + i * 26, i === m.sel ? '#fff' : '#aab', 16);
      }
      UI.cursor(g, 22, 24 + m.sel * 26, 'right');
      this.drawPartyPanel(g, 170, 8);
      return;
    }
    if (m.kind === 'pickMember' || m.kind === 'pickTarget') {
      const list = m.targets || (m.humansOnly ? this.party.filter(p => p.kind === 'human') : this.party);
      UI.window(g, 8, 8, 240, 30 + list.length * 44);
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        UI.text(g, p.name, 46, 36 + i * 44, i === m.sel ? '#fff' : '#aab', 16);
        UI.text(g, `HP ${p.hp}/${p.maxhp}  MP ${p.mp}/${p.maxmp}`, 46, 56 + i * 44, '#9ab', 12);
      }
      UI.cursor(g, 22, 24 + m.sel * 44, 'right');
      return;
    }
    if (m.kind === 'status') {
      const p = m.member;
      UI.window(g, 60, 40, 392, 350);
      UI.text(g, p.name, 90, 76, '#ffd', 20);
      UI.text(g, p.kind === 'monster' ? `(${MONSTERS[p.id].name})` : '', 200, 76, '#9ab', 14);
      const rows = [
        ['しょくぎょう', Chars.jobNameOf(p)],
        ['レベル', p.level],
        ['けいけんち', p.exp],
        ['つぎのレベルまで', Math.max(0, Chars.expTable(p.level + 1) - p.exp)],
        ['HP', `${p.hp} / ${p.maxhp}`],
        ['MP', `${p.mp} / ${p.maxmp}`],
        ['ちから', p.str],
        ['みのまもり', p.vit],
        ['すばやさ', p.agi],
        ['こうげきりょく', Chars.attackOf(p)],
        ['しゅびりょく', Chars.defenseOf(p)],
        ['ぶき', p.weapon ? WEAPONS[p.weapon].name : 'なし'],
        ['よろい', p.armor ? ARMORS[p.armor].name : 'なし'],
      ];
      for (let i = 0; i < rows.length; i++) {
        UI.text(g, String(rows[i][0]), 100, 104 + i * 21, '#9ab', 14);
        UI.text(g, String(rows[i][1]), 280, 104 + i * 21, '#fff', 14);
      }
      return;
    }
    if (m.kind === 'spells') {
      const p = m.member;
      const fieldSpells = p.spells.filter(s => ['heal', 'revive', 'field_warp'].includes(SPELLS[s].kind) || s === 'toberu');
      UI.window(g, 8, 8, 280, 60 + Math.max(1, fieldSpells.length) * 24);
      UI.text(g, `${p.name}の じゅもん`, 24, 34, '#ffd', 14);
      if (!fieldSpells.length) {
        UI.text(g, 'そとで つかえる じゅもんが ない', 30, 64, '#9ab', 13);
      }
      for (let i = 0; i < fieldSpells.length; i++) {
        const sp = SPELLS[fieldSpells[i]];
        UI.text(g, sp.name, 50, 64 + i * 24, i === m.sel ? '#fff' : '#aab', 15);
        UI.text(g, `MP${sp.mp}`, 210, 64 + i * 24, '#8cf', 13);
      }
      if (fieldSpells.length) UI.cursor(g, 26, 52 + m.sel * 24, 'right');
      return;
    }
    if (m.kind === 'items') {
      UI.window(g, 8, 8, 300, 60 + Math.max(1, this.bag.length) * 24);
      UI.text(g, 'どうぐぶくろ', 24, 34, '#ffd', 14);
      if (!this.bag.length) UI.text(g, 'なにも もっていない', 30, 64, '#9ab', 13);
      for (let i = 0; i < this.bag.length; i++) {
        const it = this.bag[i];
        UI.text(g, ITEMS[it.id].name, 50, 64 + i * 24, i === m.sel ? '#fff' : '#aab', 15);
        UI.text(g, `×${it.n}`, 240, 64 + i * 24, '#8cf', 13);
      }
      if (this.bag.length) {
        UI.cursor(g, 26, 52 + m.sel * 24, 'right');
        const item = ITEMS[this.bag[m.sel].id];
        UI.window(g, 8, 380, 496, 60);
        UI.text(g, item.desc, 26, 415, '#dde', 14);
      }
      return;
    }
    if (m.kind === 'equipSlot') {
      const p = m.member;
      UI.window(g, 8, 8, 300, 120);
      UI.text(g, `${p.name}の そうび`, 24, 34, '#ffd', 14);
      UI.text(g, `ぶき: ${p.weapon ? WEAPONS[p.weapon].name : 'なし'}`, 50, 66, m.sel === 0 ? '#fff' : '#aab', 15);
      UI.text(g, `よろい: ${p.armor ? ARMORS[p.armor].name : 'なし'}`, 50, 92, m.sel === 1 ? '#fff' : '#aab', 15);
      UI.cursor(g, 26, 54 + m.sel * 26, 'right');
      return;
    }
    if (m.kind === 'equipPick') {
      const cands = this.equipBag.filter(e => e.slot === m.slot);
      UI.window(g, 8, 8, 320, 60 + (cands.length + 1) * 24);
      UI.text(g, m.slot === 'w' ? 'どの ぶきに する?' : 'どの よろいに する?', 24, 34, '#ffd', 14);
      for (let i = 0; i < cands.length; i++) {
        const d = m.slot === 'w' ? WEAPONS[cands[i].id] : ARMORS[cands[i].id];
        UI.text(g, d.name, 50, 64 + i * 24, i === m.sel ? '#fff' : '#aab', 15);
        UI.text(g, m.slot === 'w' ? `こ+${d.atk}` : `しゅ+${d.def}`, 240, 64 + i * 24, '#8cf', 13);
      }
      UI.text(g, 'はずす', 50, 64 + cands.length * 24, m.sel === cands.length ? '#fff' : '#aab', 15);
      UI.cursor(g, 26, 52 + m.sel * 24, 'right');
      return;
    }
    if (m.kind === 'party') {
      const all = [...this.party, ...this.reserve];
      const pageSize = 12;
      const start = Math.floor(m.sel / pageSize) * pageSize;
      const view = all.slice(start, start + pageSize);
      UI.window(g, 8, 8, 340, 66 + view.length * 24);
      UI.text(g, 'なかま (いれかえ: ふたり えらぶ)', 24, 34, '#ffd', 13);
      UI.text(g, `${start + 1}-${start + view.length}/${all.length}`, 278, 34, '#789', 11);
      for (let i = start; i < start + view.length; i++) {
        const p = all[i];
        const inParty = i < this.party.length;
        let col = i === m.sel ? '#fff' : '#aab';
        if (i === m.picked) col = '#fd8';
        const row = i - start;
        UI.text(g, `${inParty ? '★' : '　'}${p.name}`, 44, 64 + row * 24, col, 15);
        UI.text(g, `Lv${p.level}`, 210, 64 + row * 24, '#9ab', 13);
        UI.text(g, p.kind === 'monster' ? MONSTERS[p.id].name : Chars.jobNameOf(p), 260, 64 + row * 24, '#9ab', 12);
      }
      UI.cursor(g, 24, 52 + (m.sel - start) * 24, 'right');
      UI.window(g, 8, 390, 460, 50);
      UI.text(g, this.partyMsg || '★=せんとうメンバー(4にんまで・上下でページ移動)', 24, 420, this.partyMsg ? '#fc8' : '#9ab', 13);
      return;
    }
    if (m.kind === 'warp') {
      const towns = [...this.visitedTowns].sort((a, b) => a - b);
      UI.window(g, 8, 8, 300, 60 + towns.length * 24);
      UI.text(g, 'どこへ とぶ?', 24, 34, '#ffd', 14);
      for (let i = 0; i < towns.length; i++) {
        const f = towns[i];
        const nm = TOWN_DATA[f] ? TOWN_DATA[f].name : (REST_POINT_NAMES[f] || `${f}かい`);
        UI.text(g, `${f}F ${nm}`, 50, 64 + i * 24, i === m.sel ? '#fff' : '#aab', 15);
      }
      UI.cursor(g, 26, 52 + m.sel * 24, 'right');
      return;
    }
  },

  drawPartyPanel(g, x, y) {
    const list = this.party;
    UI.window(g, x, y, 180, 28 + list.length * 52);
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const col = p.hp <= 0 ? '#f66' : '#fff';
      const sprName = p.kind === 'human' ? HUMANS[p.id].spr : MONSTERS[p.id].spr;
      const icon = Art.get(`${sprName}_0`) || Art.get(`${sprName}_d0`) || Art.get(sprName);
      if (icon) g.drawImage(icon, x + 12, y + 15 + i * 52, 36, 36);
      UI.text(g, `${p.name}  Lv${p.level}`, x + 52, y + 30 + i * 52, col, 14);
      UI.text(g, `HP ${p.hp}/${p.maxhp}`, x + 52, y + 48 + i * 52, '#bcd', 12);
      UI.text(g, `MP ${p.mp}/${p.maxmp}`, x + 122, y + 48 + i * 52, '#8cf', 12);
    }
  },

  drawShop(g) {
    const s = this.shop;
    UI.window(g, 360, 8, 144, 40);
    UI.text(g, `${this.gold} G`, 378, 34, '#fd8', 16);

    if (s.mode === 'top') {
      UI.window(g, 8, 8, 130, 108);
      const opts = ['かう', 'うる', 'やめる'];
      for (let i = 0; i < 3; i++) UI.text(g, opts[i], 44, 38 + i * 26, i === s.topSel ? '#fff' : '#aab', 16);
      UI.cursor(g, 24, 26 + s.topSel * 26, 'right');
    } else if (s.mode === 'buy' || s.mode === 'buyConfirm' || s.mode === 'buyResult') {
      UI.window(g, 8, 8, 330, 50 + s.stock.length * 24);
      for (let i = 0; i < s.stock.length; i++) {
        const e = s.stock[i];
        const name = e.type === 'item' ? ITEMS[e.id].name : (e.type === 'w' ? WEAPONS[e.id].name : ARMORS[e.id].name);
        UI.text(g, name, 46, 40 + i * 24, i === s.sel ? '#fff' : '#aab', 15);
        UI.text(g, `${e.price}G`, 260, 40 + i * 24, '#fd8', 13);
      }
      UI.cursor(g, 24, 28 + s.sel * 24, 'right');
      // 説明
      const e = s.stock[s.sel];
      UI.window(g, 8, 380, 496, 60);
      let desc;
      if (e.type === 'item') desc = ITEMS[e.id].desc;
      else if (e.type === 'w') desc = `こうげきりょく +${WEAPONS[e.id].atk}`;
      else desc = `しゅびりょく +${ARMORS[e.id].def}`;
      UI.text(g, desc, 26, 415, '#dde', 14);
      if (s.mode === 'buyConfirm') {
        const pending = s.pending;
        const name = pending.type === 'item' ? ITEMS[pending.id].name : (pending.type === 'w' ? WEAPONS[pending.id].name : ARMORS[pending.id].name);
        UI.window(g, 86, 142, 340, 138);
        const question = `${name}を ${pending.price}Gで`;
        UI.text(g, question, 256 - UI.measure(g, question, 16) / 2, 176, '#fff', 16);
        UI.text(g, 'かいますか?', 256 - UI.measure(g, 'かいますか?', 16) / 2, 202, '#fff', 16);
        const opts = ['はい', 'いいえ'];
        for (let i = 0; i < 2; i++) UI.text(g, opts[i], 192 + i * 118, 246, i === s.confirmSel ? '#fff' : '#8a9bab', 16, 'center');
        UI.cursor(g, 150 + s.confirmSel * 118, 234, 'right');
      } else if (s.mode === 'buyResult') {
        UI.window(g, 68, 174, 376, 92);
        UI.text(g, s.msg, 256 - UI.measure(g, s.msg, 14) / 2, 212, '#fff', 14);
        UI.text(g, '決定でもどる', 256 - UI.measure(g, '決定でもどる', 11) / 2, 244, '#90a8b8', 11);
      }
    } else if (s.mode === 'sell') {
      const list = this.sellList();
      UI.window(g, 8, 8, 340, 50 + Math.max(1, list.length) * 24);
      if (!list.length) UI.text(g, 'うるものが ない', 40, 40, '#9ab', 14);
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        UI.text(g, `${e.name}${e.kind === 'item' ? ` ×${e.n}` : ''}`, 46, 40 + i * 24, i === s.sel ? '#fff' : '#aab', 15);
        UI.text(g, `${e.price}G`, 270, 40 + i * 24, '#fd8', 13);
      }
      if (list.length) UI.cursor(g, 24, 28 + s.sel * 24, 'right');
    }
    if (s.msg && s.mode !== 'buyResult') {
      UI.window(g, 8, 330, 400, 44);
      UI.text(g, s.msg, 26, 358, '#fff', 14);
    }
  },

  // ---------- エンディング ----------
  drawChapterClear(g) {
    g.fillStyle = '#030817'; g.fillRect(0, 0, 512, 448);
    if (this.titleArt && this.titleArt.complete && this.titleArt.naturalWidth) {
      g.save();
      g.filter = 'saturate(.62) brightness(.42) hue-rotate(9deg)';
      g.drawImage(this.titleArt, 0, 0, 512, 448);
      g.restore();
    }
    const dawn = g.createLinearGradient(0, 0, 0, 448);
    dawn.addColorStop(0, 'rgba(37,24,76,.40)');
    dawn.addColorStop(.42, 'rgba(234,153,94,.12)');
    dawn.addColorStop(1, 'rgba(2,5,16,.93)');
    g.fillStyle = dawn; g.fillRect(0, 0, 512, 448);
    const glow = g.createRadialGradient(256, 92, 5, 256, 92, 205);
    glow.addColorStop(0, 'rgba(255,231,165,.38)'); glow.addColorStop(1, 'rgba(255,188,97,0)');
    g.fillStyle = glow; g.fillRect(40, 0, 432, 290);

    g.textAlign = 'center';
    g.shadowColor = '#05030d'; g.shadowBlur = 10;
    g.font = `15px ${UI.FONT}`; g.fillStyle = '#e7cf9d';
    g.fillText('アルカの塔', 256, 78);
    g.font = `34px ${UI.TITLE_FONT}`; g.fillStyle = '#fff4cf';
    g.fillText('第一部 完', 256, 126);
    g.shadowBlur = 0;
    g.strokeStyle = 'rgba(240,207,139,.72)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(126, 148); g.lineTo(386, 148); g.stroke();
    g.font = `17px ${UI.FONT}`; g.fillStyle = '#edf4f5';
    g.fillText('40F 夜の女王ノクターナ 撃破', 256, 186);
    g.font = `13px ${UI.FONT}`; g.fillStyle = '#b9c9ce';
    g.fillText('百年ぶりの朝が、とこよの階層へ差し込んだ。', 256, 220);
    g.fillText('ソラたちの旅は、次の扉が開く日まで続く。', 256, 246);

    const names = this.party.slice(0, 4).map(m => m.name).join('・');
    UI.window(g, 92, 278, 328, 70);
    g.font = `12px ${UI.FONT}`; g.fillStyle = '#91aab2';
    g.fillText('第一部クリアメンバー', 256, 303);
    g.font = `14px ${UI.FONT}`; g.fillStyle = '#fff1c7';
    g.fillText(names, 256, 330);
    if (this.chapterClearT > .75) {
      g.font = `13px ${UI.FONT}`; g.fillStyle = '#d9e7e6';
      g.fillText('決定：40階へ戻る（冒険は続けられます）', 256, 397);
      g.font = `11px ${UI.FONT}`; g.fillStyle = '#82959d';
      g.fillText('ここまでの冒険は自動で記録されました', 256, 423);
    }
    g.textAlign = 'left';
  },

  drawEnding(g) {
    g.fillStyle = '#050b17'; g.fillRect(0, 0, 512, 448);
    if (this.titleArt && this.titleArt.complete && this.titleArt.naturalWidth) {
      g.save(); g.filter = 'saturate(.55) brightness(.52)'; g.drawImage(this.titleArt, 0, 0, 512, 448); g.restore();
    }
    const light = g.createRadialGradient(256, 100, 15, 256, 120, 360);
    light.addColorStop(0, 'rgba(185,244,243,.26)'); light.addColorStop(.45, 'rgba(11,24,43,.52)'); light.addColorStop(1, 'rgba(1,3,12,.96)');
    g.fillStyle = light; g.fillRect(0, 0, 512, 448);
    g.strokeStyle = 'rgba(116,228,232,.22)'; g.lineWidth = 1.5;
    for (let r = 45; r <= 175; r += 42) { g.beginPath(); g.arc(256, 110, r + Math.sin(this.animT * .3 + r) * 3, Math.PI, Math.PI * 2); g.stroke(); }
    const scroll = this.endingT * 30;
    const lines = this.endingLines || ENDING_OPEN;
    g.textAlign = 'center';
    for (let i = 0; i < lines.length; i++) {
      const y = 460 + i * 34 - scroll;
      if (y < -30 || y > 480) continue;
      g.font = `16px ${UI.FONT}`;
      g.fillStyle = '#edf5f2'; g.shadowColor = '#030610'; g.shadowBlur = 5;
      g.fillText(lines[i], 256, y);
    }
    const totalH = lines.length * 34 + 500;
    if (scroll > totalH) {
      g.font = `14px ${UI.FONT}`;
      g.fillStyle = '#889';
      g.fillText('Zで タイトルの さきへ', 256, 400);
    }
    g.shadowBlur = 0;
    g.textAlign = 'left';
  },

  drawGameover(g) {
    g.fillStyle = '#030408'; g.fillRect(0, 0, 512, 448);
    if (this.titleArt && this.titleArt.complete && this.titleArt.naturalWidth) {
      g.save(); g.filter = 'grayscale(1) brightness(.19) contrast(1.2)'; g.drawImage(this.titleArt, 0, 0, 512, 448); g.restore();
    }
    const red = g.createRadialGradient(256, 214, 15, 256, 214, 310);
    red.addColorStop(0, 'rgba(91,21,31,.25)'); red.addColorStop(1, 'rgba(0,0,5,.88)'); g.fillStyle = red; g.fillRect(0, 0, 512, 448);
    g.save(); g.translate(256, 165); g.rotate(-.16); g.strokeStyle = 'rgba(174,69,71,.65)'; g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, 54, .12, 2.42); g.stroke(); g.beginPath(); g.arc(0, 0, 54, 3.02, 5.85); g.stroke();
    g.beginPath(); g.moveTo(-7, -58); g.lineTo(4, -12); g.lineTo(-5, 7); g.lineTo(9, 60); g.stroke(); g.restore();
    g.textAlign = 'center';
    g.font = `26px ${UI.TITLE_FONT}`;
    g.fillStyle = '#d57b78'; g.shadowColor = '#27040b'; g.shadowBlur = 10;
    g.fillText('ぜんめつ……', 256, 252); g.shadowBlur = 0;
    if ((this.gameoverT || 0) > 1.5) {
      g.font = `14px ${UI.FONT}`;
      g.fillStyle = '#9ba7af';
      g.fillText('Zで さいごの やどばに もどる', 256, 302);
    }
    g.textAlign = 'left';
  },
};

window.addEventListener('DOMContentLoaded', () => Game.init());
