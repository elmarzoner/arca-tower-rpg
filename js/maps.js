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
    } else if (floor === 40 && p.exit) {
      // 公開第一部の終着点。階段の代わりに、クリア画面を再訪できる朝の門を置く。
      map.tiles[p.exit.y][p.exit.x] = T.CIRCLE;
      map.chapterGate = { x: p.exit.x, y: p.exit.y };
      map.name = 'あけぼのの ま';
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

    // 12F: 14Fの落とし穴からだけ入れる、壁に囲まれた小さな宝物庫。
    if (floor === 12) addSecretVault(map, flags);

    // 14F: 見て避けられる固定配置の落とし穴。初回だけ12Fへ落下する。
    if (floor === 14 && addPitfall(map, flags)) {
      map.name = 'みずうつろの回廊';
    }

    // 7F: 通過階ではなく、冒険者と火を囲める中間拠点にする。
    if (floor === 7) addAdventurerCamp(map, rooms);

    // 8〜9F: 10Fの門番ガーディオへつながる、調べられる物語の痕跡。
    if (floor === 8 || floor === 9) addGuardianPrelude(map, rooms, floor);

    // 16F: 塔が保存した異世界の記憶。戦闘のない景観・物語階にする。
    if (floor === 16) addUpsideDownSea(map, rooms);
    return map;
  }

  function addUpsideDownSea(map, rooms) {
    const occupied = (x, y) => map.chests.some(c => c.x === x && c.y === y)
      || (map.journalAt && map.journalAt.x === x && map.journalAt.y === y)
      || (map.flavorAt && map.flavorAt.x === x && map.flavorAt.y === y);
    const candidates = rooms.map(r => ({
      x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2), area: r.w * r.h,
    })).filter(p => map.tiles[p.y][p.x] === T.FLOOR && !occupied(p.x, p.y)
      && !(p.x === map.entry.x && p.y === map.entry.y)
      && !(p.x === map.exit.x && p.y === map.exit.y));
    candidates.sort((a, b) => b.area - a.area || a.y - b.y || a.x - b.x);
    const anchor = candidates[0];
    if (!anchor) return false;
    map.tiles[anchor.y][anchor.x] = T.PILLAR;
    map.storySpots = [{ x: anchor.x, y: anchor.y, event: 'sky_sea_16' }];
    map.worldAnchor = { x: anchor.x, y: anchor.y };
    map.safeZones = [{ x: anchor.x - 3, y: anchor.y - 3, w: 7, h: 7 }];
    map.safe = true;
    map.skySea = true;
    map.name = 'さかさ海の空庭';
    return true;
  }

  function addGuardianPrelude(map, rooms, floor) {
    const occupied = (x, y) => map.chests.some(c => c.x === x && c.y === y)
      || (map.journalAt && map.journalAt.x === x && map.journalAt.y === y)
      || (map.flavorAt && map.flavorAt.x === x && map.flavorAt.y === y);
    const centers = rooms.map(r => ({
      x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2),
    })).filter(p => map.tiles[p.y][p.x] === T.FLOOR && !occupied(p.x, p.y)
      && !(p.x === map.entry.x && p.y === map.entry.y)
      && !(p.x === map.exit.x && p.y === map.exit.y));
    centers.sort((a, b) => {
      const da = Math.abs(a.x - map.entry.x) + Math.abs(a.y - map.entry.y);
      const db = Math.abs(b.x - map.entry.x) + Math.abs(b.y - map.entry.y);
      return db - da || a.y - b.y || a.x - b.x;
    });
    const spot = centers[0];
    if (!spot) return false;
    map.tiles[spot.y][spot.x] = floor === 8 ? T.SIGN : T.PILLAR;
    map.storySpots = [{ ...spot, event: floor === 8 ? 'guardian_record_8' : 'fallen_climber_9' }];
    map.safeZones = [{ x: spot.x - 2, y: spot.y - 2, w: 5, h: 5 }];
    map.name = floor === 8 ? 'ちかいの回廊' : 'まもりびとの墓標';
    return true;
  }

  function addAdventurerCamp(map, rooms) {
    const occupied = (x, y) => map.chests.some(c => c.x === x && c.y === y)
      || (map.journalAt && map.journalAt.x === x && map.journalAt.y === y)
      || (map.flavorAt && map.flavorAt.x === x && map.flavorAt.y === y);
    const candidates = [];
    for (let y = 2; y < map.h - 2; y++) for (let x = 2; x < map.w - 2; x++) {
      const spots = [[x,y], [x-1,y-1], [x+1,y-1], [x,y+1]];
      if (spots.some(([sx, sy]) => map.tiles[sy][sx] !== T.FLOOR || occupied(sx, sy))) continue;
      const fromEntry = Math.abs(x - map.entry.x) + Math.abs(y - map.entry.y);
      const fromExit = Math.abs(x - map.exit.x) + Math.abs(y - map.exit.y);
      if (fromEntry >= 5 && fromExit >= 5) candidates.push({ x, y, score: fromEntry + fromExit });
    }
    if (!candidates.length) return false;
    candidates.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
    const cx = candidates[0].x, cy = candidates[0].y;
    const npcSpots = [{ x: cx - 1, y: cy - 1 }, { x: cx + 1, y: cy - 1 }];
    map.name = 'ほしあかりの野営地';
    map.tiles[cy][cx] = T.CIRCLE;
    map.campfires = [{ x: cx, y: cy }];
    map.safeZones = [{ x: cx - 2, y: cy - 2, w: 5, h: 5 }];
    map.npcs.push(
      { ...npcSpots[0], spr: 'guard', event: 'camp_rest', dir: 'd', lines: null },
      { ...npcSpots[1], spr: 'merchant', event: 'camp_story', dir: 'd', lines: null },
    );
    map.campCenter = { x: cx, y: cy };
    return true;
  }

  function addSecretVault(map, flags) {
    let block = null;
    // 5×5の完全な壁領域を探し、外周を残したまま3×3の密室を掘る。
    for (let y = 1; y <= map.h - 6 && !block; y++) {
      for (let x = 1; x <= map.w - 6; x++) {
        let solid = true;
        for (let yy = y; yy < y + 5 && solid; yy++) {
          for (let xx = x; xx < x + 5; xx++) if (map.tiles[yy][xx] !== T.WALL) { solid = false; break; }
        }
        if (solid) { block = { x, y }; break; }
      }
    }
    if (!block) return false;
    for (let y = block.y + 1; y <= block.y + 3; y++) {
      for (let x = block.x + 1; x <= block.x + 3; x++) map.tiles[y][x] = T.FLOOR;
    }
    const arrival = { x: block.x + 2, y: block.y + 2 };
    const chest = { x: block.x + 1, y: block.y + 1, id: 'chest_vault_12', tier: 2 };
    const sign = { x: block.x + 3, y: block.y + 1 };
    const portal = { x: block.x + 2, y: block.y + 3, targetFloor: 14, targetKey: 'pitReturn' };
    map.tiles[chest.y][chest.x] = flags[chest.id] ? T.CHEST_OPEN : T.CHEST;
    map.tiles[sign.y][sign.x] = T.SIGN;
    map.tiles[portal.y][portal.x] = T.CIRCLE;
    map.chests.push(chest);
    map.secretArrival = arrival;
    map.floorWarps = [portal];
    map.flavorSpots = map.flavorSpots || [];
    map.flavorSpots.push({ ...sign, lines: [
      'ぬれた いしぶみに もじが うかんでいる。',
      '『みずは うえから したへ。きおくは したから うえへ。』',
      'この へやは、とうが わすれた きおくの かけららしい。',
    ] });
    return true;
  }

  function addPitfall(map, flags) {
    const occupied = (x, y) => map.chests.some(c => c.x === x && c.y === y)
      || (map.journalAt && map.journalAt.x === x && map.journalAt.y === y)
      || (map.flavorAt && map.flavorAt.x === x && map.flavorAt.y === y);
    const candidates = [];
    for (let y = 2; y < map.h - 2; y++) for (let x = 2; x < map.w - 2; x++) {
      if (map.tiles[y][x] !== T.FLOOR || occupied(x, y)) continue;
      const openAround = [[0,-1], [0,1], [-1,0], [1,0]].filter(([dx, dy]) => map.tiles[y + dy][x + dx] === T.FLOOR).length;
      const fromEntry = Math.abs(x - map.entry.x) + Math.abs(y - map.entry.y);
      const fromExit = Math.abs(x - map.exit.x) + Math.abs(y - map.exit.y);
      if (openAround >= 3 && fromEntry >= 7 && fromExit >= 5) candidates.push({ x, y, score: fromEntry + fromExit });
    }
    if (!candidates.length) return false;
    candidates.sort((a, b) => b.score - a.score || a.y - b.y || a.x - b.x);
    const spot = candidates[0];
    map.pitfalls = [{
      x: spot.x, y: spot.y, id: 'pit_known_14_to_12',
      targetFloor: 12, targetKey: 'secretArrival', known: !!flags.pit_known_14_to_12,
    }];
    const returnDirs = [[0,1], [0,-1], [1,0], [-1,0]];
    const returnSpot = returnDirs.map(([dx, dy]) => ({ x: spot.x + dx, y: spot.y + dy }))
      .find(p => map.tiles[p.y][p.x] === T.FLOOR);
    map.pitReturn = returnSpot || { x: map.entry.x, y: map.entry.y };
    return true;
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
      // 北端 y=0 の塔入口（上り階段）まで中央道を接続する。
      const central = x >= 9 && x <= 11 && y >= 0 && y <= 14;
      const plaza = x >= 6 && x <= 14 && y >= 5 && y <= 10;
      const westLane = x >= 3 && x <= 8 && y >= 5 && y <= 12;
      const eastLane = x >= 12 && x <= 16 && y >= 3 && y <= 7;
      const pondEdge = x >= 11 && x <= 13 && y >= 8 && y <= 12;
      if (!(central || plaza || westLane || eastLane || pondEdge)) return false;
    }
    for (const n of map.npcs) if (n.x === x && n.y === y) return false;
    if (map.campfires && map.campfires.some(f => f.x === x && f.y === y)) return false;
    return true;
  }

  return { build, walkable, tierOf, isTown, isBossFloor };
})();
