// ============================================================
// アルカの塔 - フロア生成
// 1F/x1F: 宿場町(手作り) x0F: ボス階(手作り) その他: シード付き自動生成
// ============================================================
'use strict';

const Maps = (() => {
  const T = Art.T;

  // シード付き乱数
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const LEGEND = {
    '#': T.WALL, '.': T.FLOOR, ',': T.GRASS, 'T': T.TREE, '~': T.WATER,
    'B': T.COUNTER, 'b': T.BED, '>': T.UP, '<': T.DOWN, 'c': T.CARPET,
    'P': T.PILLAR, 's': T.SIGN, '*': T.CIRCLE, 't': T.TABLE, 'D': T.DOOR,
    'x': T.VOID, 'C': T.CHEST, 'h': T.HOUSE, 'r': T.ROOF, ':': T.PATH,
    'f': T.FLOWER, 'l': T.LAMP, 'E': T.FENCE,
  };

  // ---------------- 宿場町テンプレート ----------------
  const TOWN_ROWS = [
    '##########>#########',
    '######........######',
    '######........######',
    '#####..........#####',
    '##................##',
    '##................##',
    '##................##',
    '##............~~~~##',
    '##............~~~~##',
    '##............~~~~##',
    '##............~~~~##',
    '##................##',
    '##................##',
    '##.C..............##',
    '##########<#########',
    '####################',
  ];

  // ---------------- ボス階テンプレート ----------------
  const BOSS_ROWS = [
    '####################',
    '#PP,,,,,,,,,,,,,,PP#',
    '#,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,>,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,#',
    '#,P,,,,,,,,,,,,,P,,#',
    '#,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,#',
    '#,P,,,,,,,,,,,,,P,,#',
    '#,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,<,,,,,,,,#',
    '####################',
  ];

  // ---------------- 最終階 (100F) ----------------
  const FINAL_ROWS = [
    '####################',
    '#xxxxxxx,,,,xxxxxxx#',
    '#xxxxx,,,,,,,,xxxxx#',
    '#xxxx,,,,,,,,,,xxxx#',
    '#xxxx,,P,,,,P,,xxxx#',
    '#xxxx,,,,,,,,,,xxxx#',
    '#xxxx,,,,,,,,,,xxxx#',
    '#xxxx,,P,,,,P,,xxxx#',
    '#xxxx,,,,,,,,,,xxxx#',
    '#xxxxx,,,,,,,,xxxxx#',
    '#xxxxxx,,,,,,xxxxxx#',
    '#xxxxxxx,,,,xxxxxxx#',
    '#xxxxxxxx,<,xxxxxxx#',
    '####################',
  ];

  function parseRows(rows) {
    const h = rows.length, w = rows[0].length;
    const tiles = [];
    let entry = null, exit = null;
    const chestSpots = [];
    for (let y = 0; y < h; y++) {
      tiles.push([]);
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        let t = LEGEND[ch] !== undefined ? LEGEND[ch] : T.FLOOR;
        if (ch === '<') entry = { x, y };
        if (ch === '>') exit = { x, y };
        if (ch === 'C') { chestSpots.push({ x, y }); t = T.CHEST; }
        tiles[y].push(t);
      }
    }
    return { w, h, tiles, entry, exit, chestSpots };
  }

  function tierOf(floor) {
    if (floor <= 0) return 1;
    return Math.min(10, Math.floor((floor - 1) / 10) + 1);
  }

  function isTown(floor) { return floor === 1 || (floor % 10 === 1 && floor > 1); }
  function isBossFloor(floor) { return floor % 10 === 0; }

  // ---------------- 町の生成 ----------------
  function buildTown(floor, flags) {
    const p = parseRows(TOWN_ROWS);
    const tier = tierOf(floor === 1 ? 1 : floor + 1);
    const map = {
      floor, tier: floor === 1 ? 0 : tier, w: p.w, h: p.h, tiles: p.tiles,
      entry: p.entry, exit: p.exit, safe: true, town: true,
      npcs: [], chests: [],
    };
    // 1Fは下り階段なし
    if (floor === 1) {
      map.tiles[p.entry.y][p.entry.x] = T.GRASS;
      map.entry = { x: 10, y: 12 };
    }
    const td = TOWN_DATA[floor];
    if (td) {
      map.name = td.name;
      for (const n of td.npcs) {
        if (n.event && flags[n.event]) continue; // 加入済みは消える
        map.npcs.push({ x: n.x, y: n.y, spr: n.spr, lines: n.lines, event: n.event || null });
      }
    }
    // リノは11Fで待っている
    if (floor === 11 && !flags['join_rino']) {
      map.npcs.push({ x: 10, y: 6, spr: 'rino', event: 'join_rino', lines: null });
    }
    // 宿屋のおやじ・道具屋・武具屋
    map.npcs.push({ x: 5, y: 5, spr: 'merchant', event: 'inn', lines: null });
    map.npcs.push({ x: 12, y: 4, spr: 'merchant', event: 'shop_items', behindCounter: true, lines: null });
    map.npcs.push({ x: 13, y: 4, spr: 'guard', event: 'shop_equip', behindCounter: true, lines: null });
    // 宝箱
    let ci = 0;
    for (const cs of p.chestSpots) {
      const id = `chest_${floor}_${ci++}`;
      if (flags[id]) map.tiles[cs.y][cs.x] = T.CHEST_OPEN;
      map.chests.push({ x: cs.x, y: cs.y, id, tier: tierOf(floor) });
    }
    return map;
  }

  // ---------------- ボス階の生成 ----------------
  function buildBossFloor(floor, flags) {
    const p = parseRows(floor === 100 ? FINAL_ROWS : BOSS_ROWS);
    const be = BOSS_EVENTS[floor];
    const cleared = be && flags[be.flag];
    const map = {
      floor, tier: tierOf(floor), w: p.w, h: p.h, tiles: p.tiles,
      entry: p.entry, exit: p.exit, safe: true, bossFloor: true,
      npcs: [], chests: [], name: floor === 100 ? 'てんがいの ま' : null,
    };
    if (!cleared) {
      // 階段を隠す
      if (p.exit) map.tiles[p.exit.y][p.exit.x] = T.FLOOR;
      map.npcs.push({ x: 10, y: floor === 100 ? 6 : 6, spr: null, bossEvent: floor, lines: null,
        bossSpr: MONSTERS[be.boss].spr });
    }
    // 100F: セツナの墓 (てんがいの まの かたすみ)
    if (floor === 100) {
      map.tiles[10][8] = T.SIGN;
      map.flavorAt = { x: 8, y: 10, lines: [
        'ちいさな はかが ある。ふるいが、ていねいに みがかれている。',
        '『セツナ ここに ねむる。そらに いちばん ちかい ばしょで。』',
        'はかの まえに、かれない はなが そなえられていた。',
      ] };
    }
    return map;
  }

  // ---------------- 自動生成ダンジョン ----------------
  function buildDungeon(floor, flags) {
    const rng = mulberry32(floor * 7919 + 1327);
    const W = 30, H = 26;
    const tiles = [];
    for (let y = 0; y < H; y++) { tiles.push([]); for (let x = 0; x < W; x++) tiles[y].push(T.WALL); }

    // 部屋を作る
    const nRooms = 5 + Math.floor(rng() * 3);
    const rooms = [];
    let attempts = 0;
    while (rooms.length < nRooms && attempts < 80) {
      attempts++;
      const rw = 4 + Math.floor(rng() * 5);
      const rh = 3 + Math.floor(rng() * 4);
      const rx = 1 + Math.floor(rng() * (W - rw - 2));
      const ry = 1 + Math.floor(rng() * (H - rh - 2));
      let ok = true;
      for (const r of rooms) {
        if (rx < r.x + r.w + 1 && rx + rw + 1 > r.x && ry < r.y + r.h + 1 && ry + rh + 1 > r.y) { ok = false; break; }
      }
      if (!ok) continue;
      rooms.push({ x: rx, y: ry, w: rw, h: rh });
      for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) tiles[y][x] = T.FLOOR;
    }
    // 廊下でつなぐ
    const cx = r => Math.floor(r.x + r.w / 2), cy = r => Math.floor(r.y + r.h / 2);
    for (let i = 1; i < rooms.length; i++) {
      let x = cx(rooms[i - 1]), y = cy(rooms[i - 1]);
      const tx = cx(rooms[i]), ty = cy(rooms[i]);
      const horizFirst = rng() < 0.5;
      const carve = (x2, y2) => { tiles[y2][x2] = T.FLOOR; };
      if (horizFirst) {
        while (x !== tx) { x += Math.sign(tx - x); carve(x, y); }
        while (y !== ty) { y += Math.sign(ty - y); carve(x, y); }
      } else {
        while (y !== ty) { y += Math.sign(ty - y); carve(x, y); }
        while (x !== tx) { x += Math.sign(tx - x); carve(x, y); }
      }
    }

    // 入口(下り階段)と出口(上り階段)を最も離れた部屋に
    let bestPair = [rooms[0], rooms[rooms.length - 1]], bestD = -1;
    for (const a of rooms) for (const b of rooms) {
      const d = Math.abs(cx(a) - cx(b)) + Math.abs(cy(a) - cy(b));
      if (d > bestD) { bestD = d; bestPair = [a, b]; }
    }
    const entry = { x: cx(bestPair[0]), y: cy(bestPair[0]) };
    const exit = { x: cx(bestPair[1]), y: cy(bestPair[1]) };
    tiles[entry.y][entry.x] = T.DOWN;
    tiles[exit.y][exit.x] = T.UP;

    const tier = tierOf(floor);
    const map = {
      floor, tier, w: W, h: H, tiles, entry, exit, safe: false,
      npcs: [], chests: [],
    };

    // 装飾 (階層テーマごと)
    for (const r of rooms) {
      if (rng() < 0.4) {
        const dx = r.x + 1 + Math.floor(rng() * (r.w - 2));
        const dy = r.y + 1 + Math.floor(rng() * (r.h - 2));
        if (tiles[dy][dx] === T.FLOOR && !(dx === entry.x && dy === entry.y) && !(dx === exit.x && dy === exit.y)) {
          if (tier === 2) tiles[dy][dx] = T.WATER;
          else if (tier === 5) tiles[dy][dx] = T.TREE;
          else if (rng() < 0.5) tiles[dy][dx] = T.PILLAR;
        }
      }
    }

    // 宝箱 (0〜2個)
    const nChests = rng() < 0.55 ? (rng() < 0.3 ? 2 : 1) : 0;
    let ci = 0;
    for (let i = 0; i < nChests; i++) {
      const r = rooms[Math.floor(rng() * rooms.length)];
      const chx = r.x + 1 + Math.floor(rng() * Math.max(1, r.w - 2));
      const chy = r.y + 1 + Math.floor(rng() * Math.max(1, r.h - 2));
      if (tiles[chy][chx] !== T.FLOOR) continue;
      if ((chx === entry.x && chy === entry.y) || (chx === exit.x && chy === exit.y)) continue;
      const id = `chest_${floor}_${ci++}`;
      tiles[chy][chx] = flags[id] ? T.CHEST_OPEN : T.CHEST;
      map.chests.push({ x: chx, y: chy, id, tier });
    }

    // セツナの手記 / 小イベント(立て札)
    const journal = typeof SETSUNA_JOURNALS !== 'undefined' && SETSUNA_JOURNALS[floor];
    if (journal || FLAVOR_EVENTS[floor]) {
      for (const r of rooms) {
        const sx = cx(r), sy = cy(r);
        if (tiles[sy][sx] === T.FLOOR && !(sx === entry.x && sy === entry.y) && !(sx === exit.x && sy === exit.y)) {
          tiles[sy][sx] = T.SIGN;
          if (journal) map.journalAt = { x: sx, y: sy };
          else map.flavorAt = { x: sx, y: sy, lines: FLAVOR_EVENTS[floor] };
          break;
        }
      }
    }
    return map;
  }

  function build(floor, flags) {
    if (isTown(floor)) return buildTown(floor, flags);
    if (isBossFloor(floor)) return buildBossFloor(floor, flags);
    return buildDungeon(floor, flags);
  }

  const WALKABLE = new Set([T.FLOOR, T.GRASS, T.UP, T.DOWN, T.CARPET, T.CIRCLE, T.CHEST_OPEN, T.DOOR, T.BED, T.PATH, T.FLOWER]);

  function walkable(map, x, y) {
    if (x < 0 || y < 0 || x >= map.w || y >= map.h) return false;
    const t = map.tiles[y][x];
    if (!WALKABLE.has(t)) return false;
    // 1Fの描き下ろし背景に合わせたV5衝突マスク。
    // 中央路・広場・西側の生活路・東側の池沿いだけを通行可能にする。
    if (map.floor === 1 && map.town) {
      const central = x >= 9 && x <= 11 && y >= 1 && y <= 14;
      const plaza = x >= 6 && x <= 14 && y >= 5 && y <= 10;
      const westLane = x >= 3 && x <= 8 && y >= 5 && y <= 12;
      const eastLane = x >= 12 && x <= 16 && y >= 3 && y <= 7;
      const pondEdge = x >= 11 && x <= 13 && y >= 8 && y <= 12;
      if (!(central || plaza || westLane || eastLane || pondEdge)) return false;
    }
    for (const n of map.npcs) if (n.x === x && n.y === y) return false;
    return true;
  }

  return { build, walkable, tierOf, isTown, isBossFloor };
})();
