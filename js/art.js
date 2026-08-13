// ============================================================
// アルカの塔 - グラフィックエンジン
// 全ドット絵はコード内で定義したオリジナル。外部画像は不使用。
// 内部解像度 512x448 (SNES 256x224 の整数2倍)。タイルは16px絵を2倍描画。
// ============================================================
'use strict';

const Art = (() => {
  const cache = {};

  // ピクセル文字列 → canvas (outline=true で1pxの輪郭線を付与)
  function mkSprite(def, outline) {
    const w = def.rows[0].length, h = def.rows.length;
    const off = outline ? 1 : 0;
    const c = document.createElement('canvas');
    c.width = w + off * 2; c.height = h + off * 2;
    const g = c.getContext('2d');
    const filled = [];
    for (let y = 0; y < h; y++) {
      filled.push([]);
      const row = def.rows[y];
      for (let x = 0; x < w; x++) {
        const ch = row[x];
        const ok = !(ch === '.' || ch === ' ');
        filled[y].push(ok);
        if (!ok) continue;
        g.fillStyle = def.pal[ch] || '#f0f';
        g.fillRect(x + off, y + off, 1, 1);
      }
    }
    if (outline) {
      g.fillStyle = '#16142a';
      const has = (x, y) => x >= 0 && y >= 0 && x < w && y < h && filled[y][x];
      for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
        if (has(x, y)) continue;
        if (has(x - 1, y) || has(x + 1, y) || has(x, y - 1) || has(x, y + 1)) {
          g.fillRect(x + off, y + off, 1, 1);
        }
      }
    }
    return c;
  }

  function flipH(canvas) {
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    const g = c.getContext('2d');
    g.translate(canvas.width, 0); g.scale(-1, 1);
    g.drawImage(canvas, 0, 0);
    return c;
  }

  function get(name) { return cache[name]; }

  // ============================================================
  // マップキャラクター 16x16 (下2フレーム/上2/右2、左は右の反転)
  // ============================================================
  const heroPal = { k: '#1a1c2c', s: '#f4c690', h: '#7a4a20', b: '#3868c8', c: '#c03030', y: '#e8c840', w: '#ffffff' };

  const CHAR_DEFS = {
    hero_d0: { pal: heroPal, rows: [
      '................',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '....ssssssss....',
      '....sksskss.....',
      '....ssssssss....',
      '.....ssssss.....',
      '..ccbbbbbbbbcc..',
      '.ccsbbybbybbscc.',
      '.ccsbbbbbbbbscc.',
      '.cc.bbbbbbbb.cc.',
      '....bbb..bbb....',
      '....bbb..bbb....',
      '....kk....kk....',
      '................'] },
    hero_d1: { pal: heroPal, rows: [
      '................',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '....ssssssss....',
      '....sksskss.....',
      '....ssssssss....',
      '.....ssssss.....',
      '..ccbbbbbbbbcc..',
      '.ccsbbybbybbscc.',
      '.ccsbbbbbbbbscc.',
      '.cc.bbbbbbbb.cc.',
      '....bbb..bbb....',
      '.....bbb.bbb....',
      '.....kk...kk....',
      '................'] },
    hero_u0: { pal: heroPal, rows: [
      '................',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '.....hhhhhh.....',
      '.....cccccc.....',
      '..cccccccccccc..',
      '.csccccccccccs..',
      '.csccccccccccs..',
      '.c..cccccccc..c.',
      '....bbb..bbb....',
      '....bbb..bbb....',
      '....kk....kk....',
      '................'] },
    hero_u1: { pal: heroPal, rows: [
      '................',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '.....hhhhhh.....',
      '.....cccccc.....',
      '..cccccccccccc..',
      '.csccccccccccs..',
      '.csccccccccccs..',
      '.c..cccccccc..c.',
      '....bbb..bbb....',
      '.....bbb.bbb....',
      '.....kk...kk....',
      '................'] },
    hero_r0: { pal: heroPal, rows: [
      '................',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '....sssssss.....',
      '....ss.ks.ks....',
      '....ssssssss....',
      '.....ssssss.....',
      '..ccbbbbbbbb....',
      '..ccbbybybbbs...',
      '..ccbbbbbbbbs...',
      '..cc.bbbbbb.....',
      '....bbb.bbb.....',
      '....bbb.bbb.....',
      '....kk...kk.....',
      '................'] },
    hero_r1: { pal: heroPal, rows: [
      '................',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '....sssssss.....',
      '....ss.ks.ks....',
      '....ssssssss....',
      '.....ssssss.....',
      '..ccbbbbbbbb....',
      '..ccbbybybbbs...',
      '..ccbbbbbbbbs...',
      '..cc.bbbbbb.....',
      '.....bbbbb......',
      '.....bb.bb......',
      '.....kk.kk......',
      '................'] },

    // 村人(男)
    man_0: { pal: { k: '#1a1c2c', s: '#f4c690', h: '#504038', g: '#4a8848', w: '#e8e0d0' }, rows: [
      '................',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '....ssssssss....',
      '....sksskss.....',
      '....ssssssss....',
      '.....ssssss.....',
      '....gggggggg....',
      '...sgggggggg s..',
      '...sggggggggs...',
      '....gggggggg....',
      '....ggg..ggg....',
      '....ggg..ggg....',
      '....kk....kk....',
      '................'] },
    man_1: { pal: { k: '#1a1c2c', s: '#f4c690', h: '#504038', g: '#4a8848', w: '#e8e0d0' }, rows: [
      '................',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '....ssssssss....',
      '....sksskss.....',
      '....ssssssss....',
      '.....ssssss.....',
      '....gggggggg....',
      '...sggggggggs...',
      '...sggggggggs...',
      '....gggggggg....',
      '....ggg..ggg....',
      '.....ggg.ggg....',
      '.....kk...kk....',
      '................'] },
    // 村人(女)
    woman_0: { pal: { k: '#1a1c2c', s: '#f8d0a0', h: '#a04818', r: '#c85888', w: '#f0e8e0' }, rows: [
      '................',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '...hssssssssh...',
      '...hsksskssh....',
      '...hssssssssh...',
      '....hssssssh....',
      '....rrrrrrrr....',
      '...srrrrrrrrs...',
      '...srrrrrrrrs...',
      '...rrrrrrrrrr...',
      '...rrrrrrrrrr...',
      '...rrrrrrrrrr...',
      '....kk....kk....',
      '................'] },
    woman_1: { pal: { k: '#1a1c2c', s: '#f8d0a0', h: '#a04818', r: '#c85888', w: '#f0e8e0' }, rows: [
      '................',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '...hssssssssh...',
      '...hsksskssh....',
      '...hssssssssh...',
      '....hssssssh....',
      '....rrrrrrrr....',
      '...srrrrrrrrs...',
      '...srrrrrrrrs...',
      '...rrrrrrrrrr...',
      '....rrrrrrrr....',
      '...rrrrrrrrrr...',
      '.....kk..kk.....',
      '................'] },
    // 長老
    elder_0: { pal: { k: '#1a1c2c', s: '#f0c8a0', w: '#e8e8e8', p: '#8858b0', y: '#e8c840' }, rows: [
      '................',
      '.....wwwwww.....',
      '....wwwwwwww....',
      '....ssssssss....',
      '....sksskss.....',
      '....ssssssss....',
      '....wwwwwwww....',
      '.....wwwwww.....',
      '....pppppppp....',
      '...sppppppppps..',
      '...sppyyyyppps..',
      '...ppppppppppp..',
      '...ppppppppppp..',
      '...ppppppppppp..',
      '....pp....pp....',
      '................'] },
    elder_1: { pal: { k: '#1a1c2c', s: '#f0c8a0', w: '#e8e8e8', p: '#8858b0', y: '#e8c840' }, rows: [
      '................',
      '.....wwwwww.....',
      '....wwwwwwww....',
      '....ssssssss....',
      '....sksskss.....',
      '....ssssssss....',
      '....wwwwwwww....',
      '.....wwwwww.....',
      '....pppppppp....',
      '...spppppppps...',
      '...sppyyyypps...',
      '...ppppppppppp..',
      '...ppppppppppp..',
      '....pppppppp....',
      '....pp....pp....',
      '................'] },
    // 商人
    merchant_0: { pal: { k: '#1a1c2c', s: '#f4c690', h: '#805030', o: '#d88828', w: '#f0e0c0' }, rows: [
      '................',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '...hh.ssss.hh...',
      '....ssssssss....',
      '....sksskss.....',
      '....ssssssss....',
      '.....ssssss.....',
      '....oooooooo....',
      '...soooooooos...',
      '...soowwwwoos...',
      '...ooowwwwooo...',
      '...oooooooooo...',
      '...oooooooooo...',
      '....kk....kk....',
      '................'] },
    merchant_1: { pal: { k: '#1a1c2c', s: '#f4c690', h: '#805030', o: '#d88828', w: '#f0e0c0' }, rows: [
      '................',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '...hh.ssss.hh...',
      '....ssssssss....',
      '....sksskss.....',
      '....ssssssss....',
      '.....ssssss.....',
      '....oooooooo....',
      '...soooooooos...',
      '...soowwwwoos...',
      '...ooowwwwooo...',
      '....oooooooo....',
      '...oooooooooo...',
      '.....kk..kk.....',
      '................'] },
    // 兵士
    guard_0: { pal: { k: '#1a1c2c', s: '#f4c690', m: '#a8b0c0', d: '#687080', r: '#c03030' }, rows: [
      '................',
      '.....mmmmmm.....',
      '....mmmmmmmm....',
      '....mrrrrrrm....',
      '....ssssssss....',
      '....sksskss.....',
      '....ssssssss....',
      '.....ssssss.....',
      '....mmmmmmmm....',
      '...smmmmmmmms...',
      '...smmddddmms...',
      '...mmmddddmmm...',
      '....mmm..mmm....',
      '....mmm..mmm....',
      '....kk....kk....',
      '................'] },
    guard_1: { pal: { k: '#1a1c2c', s: '#f4c690', m: '#a8b0c0', d: '#687080', r: '#c03030' }, rows: [
      '................',
      '.....mmmmmm.....',
      '....mmmmmmmm....',
      '....mrrrrrrm....',
      '....ssssssss....',
      '....sksskss.....',
      '....ssssssss....',
      '.....ssssss.....',
      '....mmmmmmmm....',
      '...smmmmmmmms...',
      '...smmddddmms...',
      '...mmmddddmmm...',
      '.....mmm.mmm....',
      '.....mmm.mmm....',
      '.....kk...kk....',
      '................'] },
    // 子ども
    child_0: { pal: { k: '#1a1c2c', s: '#f8d0a0', h: '#c87828', t: '#48a0d8' }, rows: [
      '................',
      '................',
      '................',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '....ssssssss....',
      '....sksskss.....',
      '....ssssssss....',
      '.....ssssss.....',
      '....tttttttt....',
      '...stttttttts...',
      '....tttttttt....',
      '....ttt..ttt....',
      '....ttt..ttt....',
      '....kk....kk....',
      '................'] },
    child_1: { pal: { k: '#1a1c2c', s: '#f8d0a0', h: '#c87828', t: '#48a0d8' }, rows: [
      '................',
      '................',
      '................',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '....ssssssss....',
      '....sksskss.....',
      '....ssssssss....',
      '.....ssssss.....',
      '....tttttttt....',
      '...stttttttts...',
      '....tttttttt....',
      '.....ttt.ttt....',
      '....ttt..ttt....',
      '.....kk..kk.....',
      '................'] },
    // 賢者フィオ
    sage_0: { pal: { k: '#1a1c2c', s: '#f8d0a0', h: '#e8e0c0', b: '#3888a8', y: '#e8c840' }, rows: [
      '................',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '...hssssssssh...',
      '...hsksskssh....',
      '...hssssssssh...',
      '....hssssssh....',
      '....bbbbbbbb....',
      '...sbbbbbbbbs...',
      '...sbbyyyybbs...',
      '...bbbbbbbbbb...',
      '...bbbbbbbbbb...',
      '...bbbbbbbbbb...',
      '....bb....bb....',
      '................'] },
    sage_1: { pal: { k: '#1a1c2c', s: '#f8d0a0', h: '#e8e0c0', b: '#3888a8', y: '#e8c840' }, rows: [
      '................',
      '.....hhhhhh.....',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '...hssssssssh...',
      '...hsksskssh....',
      '...hssssssssh...',
      '....hssssssh....',
      '....bbbbbbbb....',
      '...sbbbbbbbbs...',
      '...sbbyyyybbs...',
      '...bbbbbbbbbb...',
      '....bbbbbbbb....',
      '...bbbbbbbbbb...',
      '.....bb..bb.....',
      '................'] },
    // 天人
    celest_0: { pal: { k: '#1a1c2c', s: '#f8e8d8', h: '#d8d8f0', w: '#f8f8ff', y: '#e8d060' }, rows: [
      '................',
      '.....yyyyyy.....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '....ssssssss....',
      '....sksskss.....',
      '....ssssssss....',
      '.....ssssss.....',
      '..w.wwwwwwww.w..',
      '.wwswwwwwwwwsww.',
      '.wwswwwwwwwwsww.',
      '.ww.wwwwwwww.ww.',
      '....wwwwwwww....',
      '....wwwwwwww....',
      '.....ww..ww.....',
      '................'] },
    celest_1: { pal: { k: '#1a1c2c', s: '#f8e8d8', h: '#d8d8f0', w: '#f8f8ff', y: '#e8d060' }, rows: [
      '................',
      '.....yyyyyy.....',
      '....hhhhhhhh....',
      '....hhhhhhhh....',
      '....ssssssss....',
      '....sksskss.....',
      '....ssssssss....',
      '.....ssssss.....',
      '.w..wwwwwwww..w.',
      'wwswwwwwwwwwsww.',
      'wwswwwwwwwwwsww.',
      'ww..wwwwwwww.ww.',
      '....wwwwwwww....',
      '....wwwwwwww....',
      '.....ww..ww.....',
      '................'] },
  };

  // ============================================================
  // モンスター 24x24 (戦闘用)
  // ============================================================
  const MON_DEFS = {
    // スライム系「プルル」
    slime: { pal: { b: '#4890f0', d: '#2858b0', w: '#ffffff', k: '#101828', m: '#e05858' }, rows: [
      '........................',
      '........................',
      '........................',
      '........................',
      '..........bbbb..........',
      '........bbbbbbbb........',
      '.......bbbbbbbbbb.......',
      '......bbwwbbbbbbbb......',
      '.....bbwwbbbbbbbbbb.....',
      '.....bbwbbbbbbbbbbb.....',
      '....bbbbbbbbbbbbbbbb....',
      '....bbkkbbbbbbkkbbbb....',
      '....bbkkbbbbbbkkbbbb....',
      '...bbbbbbbbbbbbbbbbbb...',
      '...bbbbbbbbbbbbbbbbbb...',
      '...bbbbbmmmmmmbbbbbbb...',
      '...bbbbbbbbbbbbbbbbbb...',
      '...dbbbbbbbbbbbbbbbbd...',
      '....ddbbbbbbbbbbbbdd....',
      '.....ddddddddddddd......',
      '........................',
      '........................',
      '........................',
      '........................'] },
    // コウモリ系「コウモリン」
    bat: { pal: { p: '#8858c8', d: '#503078', w: '#ffffff', k: '#101828', y: '#e8c840' }, rows: [
      '........................',
      '........................',
      '........................',
      '..pp................pp..',
      '..pppp............pppp..',
      '..pppppp........pppppp..',
      '..pppppppp....pppppppp..',
      '..pppppppppppppppppppp..',
      '..ppddppppppppppppddpp..',
      '..ppddpppppppppppddpp...',
      '...ppppppyppyppppppp....',
      '....ppppyyppyypppppp....',
      '....ppppkyppkypppppp....',
      '.....ppppppppppppppp....',
      '.....pppwwwwwwpppp......',
      '......ppppppppppp.......',
      '.......pppppppp.........',
      '......dd.pppp.dd........',
      '.....dd...pp...dd.......',
      '..........pp............',
      '........................',
      '........................',
      '........................',
      '........................'] },
    // ネズミ系「トゲネズミ」
    rat: { pal: { g: '#a08868', d: '#705838', w: '#f8f0e0', k: '#101828', p: '#e89898' }, rows: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '....g..............g....',
      '...ggg....gggg....ggg...',
      '...gpg..gggggggg..gpg...',
      '...ggggggggggggggggg....',
      '....ggggggggggggggg.....',
      '....ggkkgggggggkkgg.....',
      '....ggkkgggggggkkgg.....',
      '.....ggggggpggggggg.....',
      '.....gggggpppgggggg.....',
      '....gggggggggggggggg....',
      '...ggggwwgggggwwggggg...',
      '...gggggggggggggggggg...',
      '...gggggggggggggggggdd..',
      '....gggggggggggggg..dd..',
      '.....dgg.dggg.ggd..dd...',
      '.....dd...dd...dddd.....',
      '........................',
      '........................',
      '........................'] },
    // ゴブリン系「ゴブ」
    goblin: { pal: { g: '#58a848', d: '#387030', s: '#c8a058', k: '#101828', w: '#f8f8f0', r: '#b03030' }, rows: [
      '........................',
      '........................',
      '........................',
      '......g........g........',
      '.....gg..gggg..gg.......',
      '.....ggggggggggg........',
      '.....ggggggggggg........',
      '....gggkkggggkkgg.......',
      '....gggkkggggkkgg.......',
      '.....ggggggggggg........',
      '.....ggwwwwwwwgg........',
      '......ggggggggg.........',
      '....ggggsssssggg....r...',
      '...gg.ssssssss.gg...r...',
      '...g..ssssssss..g..rr...',
      '......ssssssss...gg.r...',
      '......sssssssss.gg..r...',
      '......ssssssss......r...',
      '......sss..sss......r...',
      '......sss..sss.....rrr..',
      '.....ddd....ddd....rrr..',
      '........................',
      '........................',
      '........................'] },
    // 水の精「アクアン」
    aquan: { pal: { b: '#40c8e8', d: '#2080b8', w: '#ffffff', k: '#103048' }, rows: [
      '........................',
      '........................',
      '...........b............',
      '..........bbb...........',
      '..........bbb...........',
      '.........bbbbb..........',
      '........bbbbbbb.........',
      '.......bbbbbbbbb........',
      '......bbwwbbbbbbb.......',
      '.....bbwwbbbbbbbbb......',
      '.....bbwbbbbbbbbbb......',
      '....bbbbbbbbbbbbbbb.....',
      '....bbkkbbbbbkkbbbb.....',
      '....bbkkbbbbbkkbbbb.....',
      '....bbbbbbbbbbbbbbb.....',
      '....bbbbkbbbbkbbbbb.....',
      '.....bbbbkkkkbbbbb......',
      '.....dbbbbbbbbbbbd......',
      '......ddbbbbbbbdd.......',
      '....b..ddddddddd..b.....',
      '...bbb...ddddd...bbb....',
      '....b.............b.....',
      '........................',
      '........................'] },
    // キノコ系「カサドン」
    mush: { pal: { r: '#d05848', d: '#983828', w: '#f8f0e0', s: '#e8d8b8', k: '#101828' }, rows: [
      '........................',
      '........................',
      '........................',
      '.........rrrrrr.........',
      '.......rrrrrrrrrr.......',
      '......rrwwrrrrrrrr......',
      '.....rrwwrrrrwwrrrr.....',
      '....rrrrrrrrrwwrrrrr....',
      '....rrrrwwrrrrrrrrrr....',
      '...rrrrrwwrrrrrwwrrrr...',
      '...rrrrrrrrrrrrwwrrrr...',
      '...ddddddddddddddddddd..',
      '.....sssssssssssss......',
      '.....sskkssssskksss.....',
      '.....sskkssssskksss.....',
      '.....sssssssssssss......',
      '.....ssskssssksss.......',
      '.....sssskkkksssss......',
      '......sssssssssss.......',
      '.......sss...sss........',
      '......dss.....ssd.......',
      '........................',
      '........................',
      '........................'] },
    // 盗賊「ドロボーグ」
    thief: { pal: { c: '#585868', d: '#383844', s: '#e0b088', k: '#101828', w: '#f8f8f0', r: '#c03030' }, rows: [
      '........................',
      '........................',
      '.......cccccccc.........',
      '......cccccccccc........',
      '......ccrrrrrrcc........',
      '......cccccccccc........',
      '......ssswwsswws........',
      '......ssskssksss........',
      '......ssssssssss........',
      '.......cssssssc.........',
      '......cccccccccc........',
      '.....cccccccccccc.......',
      '....cc.cccccccc.cc......',
      '...cc..cccccccc..cc.....',
      '...c...cccccccc...k.....',
      '.......cccccccc..kkk....',
      '.......cccccccc...k.....',
      '.......ccc..ccc.........',
      '.......ccc..ccc.........',
      '.......ddd..ddd.........',
      '......ddd....ddd........',
      '........................',
      '........................',
      '........................'] },
    // 岩「イワコロ」
    rock: { pal: { g: '#909890', d: '#606860', l: '#c0c8c0', k: '#101828', r: '#d84040' }, rows: [
      '........................',
      '........................',
      '........................',
      '........gggggggg........',
      '......gggggggggggg......',
      '.....glgggggggggggg.....',
      '....gllggggggggggggg....',
      '....glgggggggggggggg....',
      '...ggggggggggggggggggg..',
      '...ggkkkgggggggkkkgggg..',
      '...ggkrkgggggggkrkgggg..',
      '...ggkkkgggggggkkkgggg..',
      '...ggggggggggggggggggg..',
      '...gggggggdddgggggggg...',
      '...ggggggddgddggggggg...',
      '...gggggddgggddgggggg...',
      '...ggggggggggggggggg....',
      '....gggggggggggggggg....',
      '....dggggggggggggggd....',
      '.....ddddddddddddddd....',
      '......ddd..dd..ddd......',
      '........................',
      '........................',
      '........................'] },
    // 幽霊「ユラリ」
    ghost: { pal: { w: '#d8e0f0', d: '#9098c0', k: '#182030', b: '#6878d8' }, rows: [
      '........................',
      '........................',
      '.........wwwwww.........',
      '........wwwwwwww........',
      '.......wwwwwwwwww.......',
      '......wwwwwwwwwwww......',
      '......wwkkwwwwkkww......',
      '......wwkkwwwwkkww......',
      '......wwwwwwwwwwww......',
      '......wwwwbbbbwwww......',
      '......wwwbwwwwbwww......',
      '.....wwwwwwwwwwwww......',
      '.....wwwwwwwwwwwww......',
      '.....wwwwwwwwwwwwww.....',
      '....wwwwwwwwwwwwwww.....',
      '....wwwwwwwwwwwwwwww....',
      '....wwdwwwdwwwdwwdww....',
      '....wd.wwd.wwd.wwd.w....',
      '.......w...w...w........',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................'] },
    // 植物「ツタウネ」
    plant: { pal: { g: '#48a048', d: '#286828', y: '#e8d040', r: '#d05878', k: '#101828', w: '#f8f8f0' }, rows: [
      '........................',
      '........................',
      '..........rrrr..........',
      '........rrrrrrrr........',
      '.......rryyyyyyrr.......',
      '......rryyyyyyyyrr......',
      '......ryykkyykkyyr......',
      '......ryykkyykkyyr......',
      '......rryyyyyyyyrr......',
      '......rryywwwwyyrr......',
      '.......rryywwyyrr.......',
      '........rrrrrrrr........',
      '..g.......gg......g.....',
      '..gg......gg.....gg.....',
      '...gg....gggg...gg......',
      '....ggg..gggg..gg.......',
      '.....ggggggggggg........',
      '.......gggggggg.........',
      '......ddgggggddd........',
      '.....dddddddddddd.......',
      '....dddddddddddddd......',
      '........................',
      '........................',
      '........................'] },
    // カラクリ兵
    machine: { pal: { m: '#a0a8b8', d: '#606878', r: '#e04040', y: '#e8c840', k: '#101828', c: '#40c8d8' }, rows: [
      '........................',
      '........................',
      '.........y..............',
      '........yyy.............',
      '......mmmmmmmm..........',
      '.....mmmmmmmmmm.........',
      '.....mmrrmmmmrrm........',
      '.....mmrrmmmmrrm........',
      '.....mmmmmmmmmmm........',
      '.....mmmkkkkkmmm........',
      '......mmmmmmmmm.........',
      '....ddmmmmmmmmdd........',
      '...dd.mmccccmm.dd.......',
      '...d..mmccccmm..d.......',
      '...mm.mmccccmm.mm.......',
      '......mmmmmmmm..........',
      '......mmmmmmmm..........',
      '......mmm..mmm..........',
      '......mmm..mmm..........',
      '......ddd..ddd..........',
      '.....dddd..dddd.........',
      '........................',
      '........................',
      '........................'] },
    // 子竜「プチドラ」
    dragonchild: { pal: { g: '#e88848', d: '#b05828', y: '#f8e8a0', k: '#101828', w: '#f8f8f0' }, rows: [
      '........................',
      '........................',
      '.......gg...............',
      '......gggg..gggg........',
      '......gggggggggggg......',
      '.....ggggggggggggg......',
      '.....ggkkggggkkggg......',
      '.....ggkkggggkkggg......',
      '.....gggggggggggg.......',
      '......ggwwggwwgg........',
      '......gggggggggg........',
      '....d..gggggggg..d......',
      '...dd.gyyyyyyyyg.dd.....',
      '...ddggyyyyyyyygg dd....',
      '....dggyyyyyyyygg.d.....',
      '.....ggyyyyyyyygg.......',
      '.....gggyyyyyygg....g...',
      '......gggggggggg...gg...',
      '......ggg....ggg..gg....',
      '......ggg....ggg.gg.....',
      '.....ddd......dddgg.....',
      '........................',
      '........................',
      '........................'] },
    // 成竜「ドラゴノイド」
    dragon: { pal: { g: '#48a058', d: '#287038', y: '#e8d888', k: '#101828', r: '#d04040', w: '#f8f8f0' }, rows: [
      '........................',
      '....g..............g....',
      '...ggg.....gg.....ggg...',
      '...gggg...gggg...gggg...',
      '...ggggg.gggggg.ggggg...',
      '...gggggggggggggggggg...',
      '....ggggggggggggggggg...',
      '....ggggrrggggrrgggg....',
      '.....gggrrggggrrggg.....',
      '.....ggggggggggggggg....',
      '.....gggwwwwwwwwggg.....',
      '......ggwgwgwgwggg......',
      '......gggggggggggg......',
      '.....ggyyyyyyyyyygg.....',
      '....gggyyyyyyyyyyggg....',
      '....gggyyyyyyyyyyggg....',
      '...ggggyyyyyyyyyygggg...',
      '...gg.gyyyyyyyyyyg.gg...',
      '...g..ggyyyyyyyygg..g...',
      '......ggggggggggggg.....',
      '......ggg.gggg..ggg.....',
      '.....ddd..dddd..ddd.....',
      '........................',
      '........................'] },
    // 天使「セラフ」
    angel: { pal: { w: '#f8f8ff', d: '#c0c8e8', s: '#f8e0c8', y: '#e8d060', k: '#101828', b: '#88a0e8' }, rows: [
      '........................',
      '..........yyyy..........',
      '.........y....y.........',
      '..........ssss..........',
      '.........ssssss.........',
      '.........skssks.........',
      '.........ssssss.........',
      '..........ssss..........',
      '..w.....wwwwwww.....w...',
      '.www...wwwwwwwww...www..',
      'wwwww..wwwwwwwww..wwwww.',
      'wwwwww.wwbbbbbww.wwwwww.',
      'wwwwwwwwwbwwwbwwwwwwwww.',
      '.wwwww.wwwwwwwww.wwwww..',
      '..wwww.wwwwwwwww.wwww...',
      '...www.wwwwwwwww.www....',
      '....ww..wwwwwww..ww.....',
      '.....w..wwwwwww..w......',
      '.........wwwww..........',
      '..........www...........',
      '...........w............',
      '........................',
      '........................',
      '........................'] },
    // 影「シャドウ」(主人公の影)
    shadow: { pal: { k: '#282038', d: '#181020', r: '#e03858', b: '#483858' }, rows: [
      '........................',
      '........................',
      '........kkkkkk..........',
      '.......kkkkkkkk.........',
      '.......kkkkkkkk.........',
      '.......kkkkkkkk.........',
      '.......krrkkrrk.........',
      '.......kkkkkkkk.........',
      '........kkkkkk..........',
      '.....bbkkkkkkkkbb.......',
      '....bbkkkkkkkkkkbb......',
      '....bbkkkkkkkkkkbb......',
      '....bb.kkkkkkkk.bb......',
      '....b..kkkkkkkk..b......',
      '.......kkkkkkkk.........',
      '.......kkkkkkkk.........',
      '.......kkk..kkk.........',
      '.......kkk..kkk.........',
      '.......ddd..ddd.........',
      '......ddd....ddd........',
      '........................',
      '........................',
      '........................',
      '........................'] },
  };

  // ============================================================
  // ボス 32x32
  // ============================================================
  const BOSS_DEFS = {
    // F10 門番ガーディオ (石の巨人)
    guardio: { pal: { g: '#a89878', d: '#786848', l: '#d8c8a8', k: '#101828', r: '#e05838', m: '#585048' }, rows: [
      '................................',
      '..........gggggggggg............',
      '.........gggggggggggg...........',
      '.........glgggggggggg...........',
      '.........ggkkkggkkkgg...........',
      '.........ggkrkggkrkgg...........',
      '.........ggkkkggkkkgg...........',
      '.........gggggggggggg...........',
      '.........ggmmmmmmmmgg...........',
      '..........gggggggggg............',
      '......gggggggggggggggggg........',
      '.....gggggggggggggggggggg.......',
      '....gggg.ggggggggggggg.gggg.....',
      '...gggg..ggglllllllggg..gggg....',
      '...ggg...gglllllllllgg...ggg....',
      '...ggg...gglllrrrlllgg...ggg....',
      '...ggg...gglllrrrlllgg...ggg....',
      '...ggg...gglllllllllgg...ggg....',
      '...ggg...ggglllllllggg...ggg....',
      '..gggg...gggggggggggg...gggg....',
      '..ggg....gggggggggggg....ggg....',
      '..ggg....gggggggggggg....ggg....',
      '..gg.....ggggg..ggggg.....gg....',
      '.........ggggg..ggggg...........',
      '.........ggggg..ggggg...........',
      '.........ggggg..ggggg...........',
      '........dggggg..gggggd..........',
      '.......ddggggg..gggggdd.........',
      '......dddddddd..dddddddd........',
      '................................',
      '................................',
      '................................'] },
    // F20 水霊アクエラ
    aquera: { pal: { b: '#48b8e8', d: '#2870b8', w: '#ffffff', k: '#103048', c: '#a8e8f8' }, rows: [
      '................................',
      '...............b................',
      '..............bbb...............',
      '.............bbbbb..............',
      '.............bbbbb..............',
      '............bbbbbbb.............',
      '...........bbcccccbb............',
      '..........bbcccccccbb...........',
      '.........bbccwwcccccbb..........',
      '........bbccwwcccccccbb.........',
      '........bbccccccccccccb.........',
      '.......bbcckkkccckkkccbb........',
      '.......bbcckwkccckwkccbb........',
      '.......bbcckkkccckkkccbb........',
      '.......bbcccccccccccccbb........',
      '.......bbcccccccccccccbb........',
      '........bccccwwwwwcccb..........',
      '..b.....bbcccwwwwwccbb.....b....',
      '.bbb.....bbcccccccbb......bbb...',
      'bbbbb.....bbbbbbbbbb.....bbbbb..',
      '.bbb....bbbbbbbbbbbbbb....bbb...',
      '..b....bbbbbbbbbbbbbbbb....b....',
      '.......bbbdbbbbbbbbdbbb.........',
      '......bbbd.bbbbbbbb.dbbb........',
      '......bbd..dbbbbbbd..dbb........',
      '.....bbd....dbbbbd....dbb.......',
      '.....bd......dbbd......db.......',
      '..............bb................',
      '...........bbbbbbbb.............',
      '..........bbbbbbbbbb............',
      '................................',
      '................................'] },
    // F40 夜の女王ノクターナ
    nocturna: { pal: { p: '#7048a8', d: '#482878', w: '#f0e8f8', s: '#e8d0e0', k: '#181028', y: '#e8c060', m: '#281840' }, rows: [
      '................................',
      '.............yyyyy..............',
      '............yy.y.yy.............',
      '............y.yyy.y.............',
      '............ppppppp.............',
      '...........ppppppppp............',
      '...........ppppppppp............',
      '...........ssssssss.............',
      '...........skssssks.............',
      '...........ssssssss.............',
      '............ssssss..............',
      '.......mm..ppppppp...mm.........',
      '......mmm.ppppppppp..mmm........',
      '.....mmm.ppppppppppp..mmm.......',
      '....mmm..ppwppppppwpp..mmm......',
      '....mm..pppwppppppwppp..mm......',
      '...mmm..pppppppppppppp..mmm.....',
      '...mm..pppppppppppppppp..mm.....',
      '...mm..pppppppppppppppp..mm.....',
      '...m..pppppppppppppppppp..m.....',
      '......pppppppppppppppppp........',
      '.....pppppppppppppppppppp.......',
      '.....pppppppppppppppppppp.......',
      '....pppppppppppppppppppppp......',
      '....pppppppppppppppppppppp......',
      '...pppppppppppppppppppppppp.....',
      '...dddddddddddddddddddddddd.....',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................'] },
    // F60 機械神マキナス
    makinas: { pal: { m: '#b0b8c8', d: '#687080', r: '#e04040', y: '#e8c840', k: '#101828', c: '#40d8e8', o: '#f09048' }, rows: [
      '................................',
      '..........y..........y.........',
      '.........yyy........yyy........',
      '..........mmmmmmmmmmmm..........',
      '........mmmmmmmmmmmmmmmm........',
      '.......mmmmmmmmmmmmmmmmmm.......',
      '.......mmrrrmmmmmmmmrrrmm.......',
      '.......mmrrrmmmmmmmmrrrmm.......',
      '.......mmmmmmmmmmmmmmmmmm.......',
      '.......mmmmkkkkkkkkkkmmmm.......',
      '.......mmmmkcccccccckmmmm.......',
      '........mmmkkkkkkkkkkmmm........',
      '.........mmmmmmmmmmmmmm.........',
      '....ddmmmmmmmmmmmmmmmmmmmdd.....',
      '...dd.mmmmmoooooooommmmm.dd.....',
      '..dd..mmmmooccccccoommmm..dd....',
      '..d...mmmmocccccccc oomm...d....',
      '..mm..mmmmoccccccccoomm...mm....',
      '..mm..mmmmooccccccoommmm..mm....',
      '..mm..mmmmmoooooooommmmm..mm....',
      '......mmmmmmmmmmmmmmmmm.........',
      '......mmmmmmmmmmmmmmmmm.........',
      '.......mmmmmm...mmmmmm..........',
      '.......mmmmmm...mmmmmm..........',
      '.......mmmmmm...mmmmmm..........',
      '.......dddddd...dddddd..........',
      '......ddddddd...ddddddd.........',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................'] },
    // F100 アルカ=コア
    arcacore: { pal: { w: '#f0f4ff', b: '#5878e8', d: '#3048a0', y: '#f8e080', k: '#101830', c: '#78e8f0', p: '#a858c8' }, rows: [
      '................................',
      '...............ww...............',
      '..............wwww..............',
      '............wwwwwwww............',
      '...........wwwbbbbwww...........',
      '..........wwbbbbbbbbww..........',
      '.........wwbbccccccbbww.........',
      '.........wbbccccccccbbw.........',
      '........wwbcckkcckkccbww........',
      '........wwbcckycckyccbww........',
      '........wwbcckkcckkccbww........',
      '........wwbccccccccccbww........',
      '.........wbbccyyyyccbbw.........',
      '.........wwbbccccccbbww.........',
      '..........wwbbbbbbbbww..........',
      '....p.....wwwwbbbbwwww.....p....',
      '...ppp...wwwwwwwwwwwwww...ppp...',
      '..ppppp.wwyywwwwwwwwyyww.ppppp..',
      '...ppp..wyyyywwwwwwyyyyw..ppp...',
      '....p...wwyywwwwwwwwyyww...p....',
      '........wwwwwwwwwwwwwwww........',
      '.........wwwwwwwwwwwwww.........',
      '....d.....wwwwwwwwwwww.....d....',
      '...ddd.....wwwwwwwwww.....ddd...',
      '..ddddd......wwwwww......ddddd..',
      '...ddd........wwww........ddd...',
      '....d..........ww..........d....',
      '...............ww...............',
      '..............wwww..............',
      '................................',
      '................................',
      '................................'] },
  };

  // パレット差し替え(色違いモンスター)
  function variant(baseDef, palOverride) {
    return { pal: Object.assign({}, baseDef.pal, palOverride), rows: baseDef.rows };
  }

  const VARIANTS = {
    slime_red:   variant(MON_DEFS.slime, { b: '#e86848', d: '#a83820' }),
    slime_metal: variant(MON_DEFS.slime, { b: '#b8c0c8', d: '#788088', m: '#8890a0' }),
    slime_gold:  variant(MON_DEFS.slime, { b: '#e8c040', d: '#a88018' }),
    bat_dark:    variant(MON_DEFS.bat, { p: '#485068', d: '#283048', y: '#e04040' }),
    bat_frost:   variant(MON_DEFS.bat, { p: '#68b8d8', d: '#3878a8' }),
    rat_shadow:  variant(MON_DEFS.rat, { g: '#585068', d: '#383048', p: '#a858c8' }),
    goblin_soldier: variant(MON_DEFS.goblin, { g: '#5878b8', d: '#385088' }),
    goblin_lord: variant(MON_DEFS.goblin, { g: '#b04848', d: '#802828', s: '#a8a8b8' }),
    aquan_mist:  variant(MON_DEFS.aquan, { b: '#b0b8d8', d: '#7880a8' }),
    aquan_abyss: variant(MON_DEFS.aquan, { b: '#4858c8', d: '#283090' }),
    mush_poison: variant(MON_DEFS.mush, { r: '#9858c8', d: '#603088' }),
    thief_master: variant(MON_DEFS.thief, { c: '#804858', d: '#502830', r: '#e8c840' }),
    rock_metal:  variant(MON_DEFS.rock, { g: '#8898b0', d: '#586880', l: '#c8d8e8' }),
    rock_lava:   variant(MON_DEFS.rock, { g: '#a85838', d: '#702818', l: '#e89848', r: '#f8e040' }),
    ghost_wraith: variant(MON_DEFS.ghost, { w: '#a888c8', d: '#684898', b: '#e04040' }),
    ghost_death: variant(MON_DEFS.ghost, { w: '#607080', d: '#384858', b: '#e8c840' }),
    plant_eater: variant(MON_DEFS.plant, { g: '#807838', d: '#504818', r: '#c83030', y: '#e88848' }),
    machine_guard: variant(MON_DEFS.machine, { m: '#c8a858', d: '#907028', c: '#e04040' }),
    machine_makina: variant(MON_DEFS.machine, { m: '#8088a8', d: '#485068', c: '#e8c840' }),
    dragon_noir: variant(MON_DEFS.dragon, { g: '#585068', d: '#302838', y: '#a8a0b8', r: '#e8c840' }),
    angel_dark:  variant(MON_DEFS.angel, { w: '#786888', d: '#504860', y: '#e04040', b: '#302838' }),
    // ボス(24x24流用系)
    boss_dronzo: variant(MON_DEFS.thief, { c: '#583048', d: '#301828', r: '#e8c840' }),
    boss_gardura: variant(MON_DEFS.plant, { g: '#288048', d: '#104828', r: '#e83880', y: '#f8e888' }),
    boss_dragnoa: variant(MON_DEFS.dragon, { g: '#c03838', d: '#801818', y: '#f8d888' }),
    boss_seraphos: variant(MON_DEFS.angel, { y: '#f8d030', b: '#e8b838' }),
    boss_shadowsora: variant(MON_DEFS.shadow, { r: '#40d8f0' }),
  };

  // ============================================================
  // タイル 16x16 プロシージャル生成
  // ============================================================
  // 階層テーマ配色 tier 0(村)〜10
  const TIER_THEMES = [
    { wall: '#7a6a58', wallD: '#4a3e30', wallL: '#9a8a70', floor: '#c8b088', floorD: '#b09870', bg: '#181420' }, // 汎用/村
    { wall: '#787878', wallD: '#484850', wallL: '#a0a0a0', floor: '#a89878', floorD: '#907e60', bg: '#141420' }, // 1-9 石
    { wall: '#5878a0', wallD: '#304860', wallL: '#88a8c8', floor: '#90a8b8', floorD: '#7890a0', bg: '#101828' }, // 11-19 水
    { wall: '#a08050', wallD: '#684e28', wallL: '#c8a878', floor: '#c0a070', floorD: '#a88858', bg: '#181410' }, // 21-29 砂岩
    { wall: '#585070', wallD: '#302c48', wallL: '#787098', floor: '#686080', floorD: '#504868', bg: '#0c0a18' }, // 31-39 夜
    { wall: '#48784f', wallD: '#284830', wallL: '#68a070', floor: '#88a878', floorD: '#709060', bg: '#101810' }, // 41-49 庭園
    { wall: '#708090', wallD: '#404c58', wallL: '#98a8b8', floor: '#8890a0', floorD: '#707888', bg: '#101418' }, // 51-59 機械
    { wall: '#985040', wallD: '#602c20', wallL: '#c07858', floor: '#a87858', floorD: '#886048', bg: '#180c08' }, // 61-69 竜
    { wall: '#b0a8c8', wallD: '#787098', wallL: '#d8d0e8', floor: '#c8c0d8', floorD: '#a8a0c0', bg: '#181828' }, // 71-79 雲上
    { wall: '#605878', wallD: '#383048', wallL: '#8880a0', floor: '#787090', floorD: '#605878', bg: '#0c0818' }, // 81-89 記憶
    { wall: '#c8b878', wallD: '#907e40', wallL: '#e8dca8', floor: '#d8c890', floorD: '#c0ac70', bg: '#181408' }, // 91-99 天
  ];

  const T = { FLOOR: 0, WALL: 1, UP: 2, DOWN: 3, WATER: 4, GRASS: 5, TREE: 6, CHEST: 7, CHEST_OPEN: 8,
    COUNTER: 9, CARPET: 10, PILLAR: 11, VOID: 12, BED: 13, SIGN: 14, CIRCLE: 15, TABLE: 16, DOOR: 17 };

  const tileCache = {}; // key: tier -> canvas sheet

  function hashNoise(x, y, s) {
    let h = (x * 374761393 + y * 668265263 + s * 987643) | 0;
    h = (h ^ (h >> 13)) * 1274126177 | 0;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
  }

  function drawTileTo(g, id, px, py, th) {
    const P = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(px + x, py + y, w, h); };
    switch (id) {
      case T.FLOOR: {
        P(0, 0, 16, 16, th.floor);
        // 面ではなく厚みのある石畳に見せる三段階の明暗。
        g.fillStyle = th.floorD;
        g.fillRect(px, py + 7, 16, 1); g.fillRect(px, py + 15, 16, 1);
        g.fillRect(px + 7, py, 1, 8); g.fillRect(px + 15, py, 1, 8);
        g.fillRect(px + 3, py + 8, 1, 8); g.fillRect(px + 11, py + 8, 1, 8);
        g.fillStyle = '#ffffff20';
        g.fillRect(px + 1, py + 1, 6, 1); g.fillRect(px + 9, py + 9, 3, 1);
        g.fillStyle = '#00000016';
        g.fillRect(px + 1, py + 6, 6, 1); g.fillRect(px + 4, py + 14, 7, 1);
        break;
      }
      case T.WALL: {
        P(0, 0, 16, 16, th.wall);
        g.fillStyle = th.wallD;
        for (let r = 0; r < 4; r++) g.fillRect(px, py + r * 4 + 3, 16, 1);
        g.fillRect(px + 7, py, 1, 4); g.fillRect(px + 3, py + 4, 1, 4);
        g.fillRect(px + 11, py + 4, 1, 4); g.fillRect(px + 7, py + 8, 1, 4);
        g.fillRect(px + 3, py + 12, 1, 4); g.fillRect(px + 11, py + 12, 1, 4);
        g.fillStyle = th.wallL;
        g.fillRect(px, py, 16, 1); g.fillRect(px + 1, py + 1, 6, 1);
        g.fillStyle = '#00000024';
        g.fillRect(px, py + 15, 16, 1); g.fillRect(px + 15, py + 3, 1, 12);
        break;
      }
      case T.UP: { // のぼり階段
        drawTileTo(g, T.FLOOR, 0, 0, th); // 実座標で塗り直すため下で再描画
        P(0, 0, 16, 16, th.floorD);
        P(0, 12, 16, 4, th.wallL);
        P(2, 8, 14, 4, '#d0c8b0');
        P(4, 4, 12, 4, th.wallL);
        P(6, 0, 10, 4, '#d0c8b0');
        g.fillStyle = th.wallD;
        g.fillRect(px, py + 11, 16, 1); g.fillRect(px + 2, py + 7, 14, 1);
        g.fillRect(px + 4, py + 3, 12, 1);
        break;
      }
      case T.DOWN: { // くだり階段(穴)
        P(0, 0, 16, 16, th.floorD);
        P(2, 2, 12, 12, '#000000');
        P(2, 2, 12, 3, th.wallD);
        P(2, 2, 3, 12, th.wallD);
        break;
      }
      case T.WATER: {
        P(0, 0, 16, 16, '#2855a8');
        P(0, 0, 16, 2, '#3d75c9'); P(0, 8, 16, 2, '#234b97');
        g.fillStyle = '#73a9e8';
        g.fillRect(px + 1, py + 3, 5, 1); g.fillRect(px + 9, py + 6, 5, 1);
        g.fillRect(px + 3, py + 11, 5, 1); g.fillRect(px + 11, py + 13, 4, 1);
        g.fillStyle = '#b0dcf4'; g.fillRect(px + 2, py + 3, 2, 1); g.fillRect(px + 12, py + 13, 2, 1);
        break;
      }
      case T.GRASS: {
        P(0, 0, 16, 16, '#659752');
        P(0, 0, 16, 1, '#81ad63'); P(0, 15, 16, 1, '#4b773e');
        g.fillStyle = '#3f6e36';
        g.fillRect(px + 2, py + 2, 1, 3); g.fillRect(px + 6, py + 5, 1, 2);
        g.fillRect(px + 11, py + 3, 1, 3); g.fillRect(px + 4, py + 10, 1, 2);
        g.fillRect(px + 9, py + 12, 1, 3); g.fillRect(px + 13, py + 9, 1, 2);
        g.fillStyle = '#95bd70';
        g.fillRect(px + 3, py + 3, 1, 2); g.fillRect(px + 12, py + 4, 1, 2); g.fillRect(px + 10, py + 12, 1, 2);
        break;
      }
      case T.TREE: {
        P(0, 0, 16, 16, '#659752');
        P(6, 8, 5, 8, '#684323'); P(7, 8, 2, 8, '#a06d35'); P(10, 10, 2, 5, '#462b1b');
        P(3, 2, 11, 8, '#285f32'); P(1, 5, 14, 6, '#285f32'); P(5, 0, 8, 5, '#347a3d');
        P(3, 3, 5, 4, '#4c9850'); P(7, 1, 4, 3, '#62ad5b'); P(11, 5, 3, 3, '#3b843f');
        P(2, 9, 12, 2, '#1f4f2b'); P(5, 5, 2, 2, '#83c36c');
        break;
      }
      case T.CHEST: {
        drawFloorBase(g, px, py, th);
        P(2, 4, 12, 10, '#a06828');
        P(2, 4, 12, 4, '#c08838');
        P(2, 7, 12, 1, '#684018');
        P(7, 7, 2, 4, '#e8c840');
        P(2, 13, 12, 1, '#684018');
        break;
      }
      case T.CHEST_OPEN: {
        drawFloorBase(g, px, py, th);
        P(2, 2, 12, 3, '#684018');
        P(2, 6, 12, 8, '#a06828');
        P(3, 7, 10, 5, '#302010');
        break;
      }
      case T.COUNTER: {
        P(0, 0, 16, 16, '#986838');
        P(0, 0, 16, 6, '#c89858');
        P(0, 6, 16, 1, '#684018');
        break;
      }
      case T.CARPET: {
        P(0, 0, 16, 16, '#a83838');
        g.fillStyle = '#c85858';
        g.fillRect(px + 2, py + 2, 12, 12);
        g.fillStyle = '#a83838';
        g.fillRect(px + 4, py + 4, 8, 8);
        break;
      }
      case T.PILLAR: {
        drawFloorBase(g, px, py, th);
        P(3, 0, 10, 16, th.wallL);
        P(3, 0, 2, 16, '#ffffff22');
        P(11, 0, 2, 16, th.wallD);
        P(2, 0, 12, 2, th.wallL);
        P(2, 14, 12, 2, th.wallD);
        break;
      }
      case T.VOID: {
        P(0, 0, 16, 16, th.bg);
        if (hashNoise(px, py, 7) > 0.92) P(hashNoise(px, py, 3) * 14 | 0, hashNoise(px, py, 5) * 14 | 0, 1, 1, '#8898b8');
        break;
      }
      case T.BED: {
        drawFloorBase(g, px, py, th);
        P(1, 1, 14, 14, '#b03838');
        P(1, 1, 14, 4, '#e8e8e0');
        P(1, 13, 14, 2, '#802828');
        break;
      }
      case T.SIGN: {
        drawFloorBase(g, px, py, th);
        P(3, 2, 10, 7, '#c09858');
        P(4, 3, 8, 1, '#684018');
        P(4, 5, 8, 1, '#684018');
        P(7, 9, 2, 6, '#8a6838');
        break;
      }
      case T.CIRCLE: {
        drawFloorBase(g, px, py, th);
        g.strokeStyle = '#58c8e8';
        g.lineWidth = 1;
        g.strokeRect(px + 2.5, py + 2.5, 11, 11);
        g.strokeRect(px + 4.5, py + 4.5, 7, 7);
        P(7, 7, 2, 2, '#a8e8f8');
        break;
      }
      case T.TABLE: {
        drawFloorBase(g, px, py, th);
        P(1, 3, 14, 9, '#c89858');
        P(1, 3, 14, 2, '#e0b878');
        P(2, 12, 2, 3, '#684018');
        P(12, 12, 2, 3, '#684018');
        break;
      }
      case T.DOOR: {
        P(0, 0, 16, 16, th.wall);
        P(2, 2, 12, 14, '#8a5828');
        P(3, 3, 10, 13, '#a87038');
        P(11, 9, 2, 2, '#e8c840');
        break;
      }
    }
    function drawFloorBase(g2, x2, y2, th2) {
      g2.fillStyle = th2.floor;
      g2.fillRect(x2, y2, 16, 16);
      g2.fillStyle = th2.floorD;
      g2.fillRect(x2, y2 + 7, 16, 1); g2.fillRect(x2, y2 + 15, 16, 1);
      g2.fillRect(x2 + 7, y2, 1, 8); g2.fillRect(x2 + 3, y2 + 8, 1, 8);
      g2.fillRect(x2 + 11, y2 + 8, 1, 8); g2.fillRect(x2 + 15, y2, 1, 8);
    }
  }

  function getTileSheet(tier) {
    if (tileCache[tier]) return tileCache[tier];
    const th = TIER_THEMES[tier] || TIER_THEMES[0];
    const NUM = 18;
    const c = document.createElement('canvas');
    c.width = 16 * NUM; c.height = 16;
    const g = c.getContext('2d');
    for (let i = 0; i < NUM; i++) drawTileTo(g, i, i * 16, 0, th);
    tileCache[tier] = c;
    return c;
  }

  // ============================================================
  // 初期化: 全スプライトをキャッシュ
  // ============================================================
  function init() {
    // 16x16の旧キャラ定義(CHAR_DEFS)はchars.jsの32x32生成スプライトで上書きされる
    for (const [k, v] of Object.entries(CHAR_DEFS)) cache[k] = mkSprite(v);
    cache['hero_l0'] = flipH(cache['hero_r0']);
    cache['hero_l1'] = flipH(cache['hero_r1']);
    // モンスター・ボスは輪郭線付きで生成
    for (const [k, v] of Object.entries(MON_DEFS)) cache['m_' + k] = mkSprite(v, true);
    for (const [k, v] of Object.entries(VARIANTS)) cache['m_' + k] = mkSprite(v, true);
    for (const [k, v] of Object.entries(BOSS_DEFS)) cache['b_' + k] = mkSprite(v, true);
  }

  function register(name, canvas) { cache[name] = canvas; }

  return { init, get, register, getTileSheet, T, TIER_THEMES };
})();
