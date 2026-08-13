// ============================================================
// アルカの塔 - 高解像度キャラクター生成 (32x32)
// art.js の16x16キャラを置き換える。陰影+自動アウトライン付き。
// ============================================================
'use strict';

const CharGen = (() => {
  const S = 32;
  const OUTLINE = '#16142a';
  const EYE = '#20242c';

  function newBuf() { return Array.from({ length: S }, () => new Array(S).fill(null)); }
  function rect(b, x0, y0, x1, y1, c) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++)
      if (x >= 0 && y >= 0 && x < S && y < S) b[y][x] = c;
  }
  function pxl(b, x, y, c) { if (x >= 0 && y >= 0 && x < S && y < S) b[y][x] = c; }

  function toCanvas(b) {
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const g = c.getContext('2d');
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (b[y][x]) { g.fillStyle = b[y][x]; g.fillRect(x, y, 1, 1); }
    }
    // 自動アウトライン
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (b[y][x]) continue;
      let adj = false;
      if (x > 0 && b[y][x - 1]) adj = true;
      else if (x < S - 1 && b[y][x + 1]) adj = true;
      else if (y > 0 && b[y - 1][x]) adj = true;
      else if (y < S - 1 && b[y + 1][x]) adj = true;
      if (adj) { g.fillStyle = OUTLINE; g.fillRect(x, y, 1, 1); }
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

  // ---------------- 頭部 (正面/背面/側面) ----------------
  function headDown(b, sp, dy) {
    const hT = 3 + dy, fT = 9 + dy, fB = 14 + dy, eY = 11 + dy;
    // 顔
    rect(b, 9, fT, 22, fB, sp.skin);
    rect(b, 9, fB - 1, 9, fB, sp.skinShade);
    rect(b, 22, fB - 1, 22, fB, sp.skinShade);
    const st = sp.style;
    if (st === 'short' || st === 'long' || st === 'circlet') {
      rect(b, 9, hT, 22, fT - 1, sp.hair);
      rect(b, 8, hT + 3, 8, fT + 1, sp.hair);
      rect(b, 23, hT + 3, 23, fT + 1, sp.hair);
      rect(b, 9, fT - 1, 22, fT - 1, sp.hairShade);
      pxl(b, 11, fT, sp.hairShade); pxl(b, 16, fT, sp.hairShade); pxl(b, 20, fT, sp.hairShade);
      if (st === 'long') {
        rect(b, 7, hT + 4, 8, fB + 3, sp.hair);
        rect(b, 23, hT + 4, 24, fB + 3, sp.hair);
        rect(b, 7, fB + 2, 8, fB + 3, sp.hairShade);
        rect(b, 23, fB + 2, 24, fB + 3, sp.hairShade);
      }
      if (st === 'circlet') rect(b, 8, hT + 3, 23, hT + 3, sp.accent);
    } else if (st === 'bald') {
      rect(b, 9, hT + 2, 22, fT - 1, sp.skin);
      rect(b, 9, hT + 2, 22, hT + 2, sp.skinShade);
      rect(b, 8, fT - 2, 9, fT + 2, sp.hair);
      rect(b, 22, fT - 2, 23, fT + 2, sp.hair);
      rect(b, 10, eY - 1, 13, eY - 1, sp.hair); // まゆ
      rect(b, 18, eY - 1, 21, eY - 1, sp.hair);
    } else if (st === 'hat') {
      rect(b, 10, hT, 21, hT + 4, sp.hat);
      rect(b, 10, hT + 2, 21, hT + 2, sp.hatShade);
      rect(b, 6, hT + 5, 25, hT + 5, sp.hatShade);
      rect(b, 7, hT + 4, 24, hT + 4, sp.hat);
    } else if (st === 'helmet') {
      rect(b, 8, hT - 1, 23, fT, sp.hat);
      rect(b, 8, fT, 23, fT, sp.hatShade);
      rect(b, 9, hT, 12, hT + 1, '#e8eef8');
      rect(b, 15, hT - 3, 16, hT - 1, sp.plume);
      rect(b, 14, hT - 2, 17, hT - 2, sp.plume);
    }
    // 目
    rect(b, 12, eY, 13, eY + 1, EYE);
    rect(b, 18, eY, 19, eY + 1, EYE);
    // ひげ
    if (sp.beard) {
      rect(b, 10, fB - 1, 21, fB + 3, sp.beard);
      rect(b, 12, fB - 2, 19, fB - 2, sp.beard);
      rect(b, 10, fB + 3, 21, fB + 3, sp.hairShade || sp.beard);
      rect(b, 14, fB - 1, 17, fB - 1, sp.skinShade); // 口元
    }
  }

  function headUp(b, sp, dy) {
    const hT = 3 + dy, fB = 14 + dy;
    const st = sp.style;
    if (st === 'bald') {
      rect(b, 9, hT + 2, 22, fB, sp.skin);
      rect(b, 9, hT + 2, 22, hT + 3, sp.skinShade);
      rect(b, 8, hT + 6, 23, fB, sp.hair);
    } else if (st === 'hat') {
      rect(b, 10, hT, 21, hT + 4, sp.hat);
      rect(b, 6, hT + 5, 25, hT + 5, sp.hatShade);
      rect(b, 7, hT + 4, 24, hT + 4, sp.hat);
      rect(b, 9, hT + 6, 22, fB, sp.hair);
    } else if (st === 'helmet') {
      rect(b, 8, hT - 1, 23, fB, sp.hat);
      rect(b, 8, fB - 2, 23, fB, sp.hatShade);
      rect(b, 15, hT - 3, 16, hT - 1, sp.plume);
      rect(b, 14, hT - 2, 17, hT - 2, sp.plume);
    } else {
      rect(b, 9, hT, 22, fB, sp.hair);
      rect(b, 8, hT + 3, 8, fB - 2, sp.hair);
      rect(b, 23, hT + 3, 23, fB - 2, sp.hair);
      rect(b, 9, fB - 2, 22, fB, sp.hairShade);
      if (st === 'long') {
        rect(b, 7, hT + 4, 8, fB + 4, sp.hair);
        rect(b, 23, hT + 4, 24, fB + 4, sp.hair);
        rect(b, 9, fB + 1, 22, fB + 4, sp.hair);
        rect(b, 9, fB + 3, 22, fB + 4, sp.hairShade);
      }
      if (st === 'circlet') rect(b, 8, hT + 3, 23, hT + 3, sp.accent);
    }
  }

  function headSide(b, sp, dy) {
    const hT = 3 + dy, fT = 9 + dy, fB = 14 + dy, eY = 11 + dy;
    // 顔 (右向き)
    rect(b, 13, fT, 22, fB, sp.skin);
    rect(b, 13, fB, 15, fB, sp.skinShade);
    const st = sp.style;
    if (st === 'short' || st === 'long' || st === 'circlet') {
      rect(b, 9, hT, 22, fT - 1, sp.hair);
      rect(b, 9, fT - 1, 12, fB - 1, sp.hair);
      rect(b, 9, fB - 2, 12, fB - 1, sp.hairShade);
      pxl(b, 21, fT, sp.hairShade); pxl(b, 17, fT, sp.hairShade);
      if (st === 'long') {
        rect(b, 8, fT, 10, fB + 4, sp.hair);
        rect(b, 8, fB + 3, 10, fB + 4, sp.hairShade);
      }
      if (st === 'circlet') rect(b, 9, hT + 3, 22, hT + 3, sp.accent);
    } else if (st === 'bald') {
      rect(b, 10, hT + 2, 22, fT - 1, sp.skin);
      rect(b, 10, hT + 2, 22, hT + 2, sp.skinShade);
      rect(b, 9, fT - 1, 12, fT + 3, sp.hair);
      rect(b, 17, eY - 1, 21, eY - 1, sp.hair);
    } else if (st === 'hat') {
      rect(b, 10, hT, 20, hT + 4, sp.hat);
      rect(b, 8, hT + 5, 25, hT + 5, sp.hatShade);
      rect(b, 9, hT + 4, 24, hT + 4, sp.hat);
      rect(b, 10, fT - 1, 12, fB - 2, sp.hair);
    } else if (st === 'helmet') {
      rect(b, 9, hT - 1, 23, fT + 1, sp.hat);
      rect(b, 9, fT + 1, 23, fT + 1, sp.hatShade);
      rect(b, 15, hT - 3, 16, hT - 1, sp.plume);
    }
    // 目 (片方)
    rect(b, 19, eY, 20, eY + 1, EYE);
    if (sp.beard) {
      rect(b, 15, fB - 1, 22, fB + 3, sp.beard);
      rect(b, 15, fB + 3, 22, fB + 3, sp.hairShade || sp.beard);
    }
  }

  // ---------------- 体 (正面/背面) ----------------
  function bodyFront(b, sp, f, dy, isBack) {
    const bT = 15 + dy, bB = 24 + Math.min(dy, 1);
    // 脚
    if (sp.dress) {
      rect(b, 10, bB - 2, 21, 29, sp.bottom);
      rect(b, 9, 26, 22, 29, sp.bottom);
      rect(b, 9, 28, 22, 29, sp.bottomShade);
      pxl(b, 13, 27, sp.bottomShade); pxl(b, 18, 27, sp.bottomShade);
      if (f === 0) { rect(b, 11, 30, 13, 30, sp.boot); rect(b, 18, 30, 20, 30, sp.boot); }
      else { rect(b, 12, 30, 14, 30, sp.boot); rect(b, 17, 30, 19, 30, sp.boot); }
    } else {
      const lu = f === 1 ? 1 : 0, ru = f === 1 ? 0 : 1;
      rect(b, 11, 25, 14, 27 - lu, sp.bottom);
      rect(b, 11, 28 - lu, 14, 30 - lu, sp.boot);
      rect(b, 17, 25, 20, 27 - ru, sp.bottom);
      rect(b, 17, 28 - ru, 20, 30 - ru, sp.boot);
    }
    // マント (背面では全面)
    if (sp.cape && isBack) {
      rect(b, 8, bT - 1, 23, 27, sp.cape);
      rect(b, 8, 25, 23, 27, sp.capeShade);
      rect(b, 8, bT - 1, 9, 27, sp.capeShade);
      return; // 背面マントは胴を覆う
    }
    // 胴
    rect(b, 9, bT, 22, bB, sp.top);
    rect(b, 9, bB - 1, 22, bB, sp.topShade);
    rect(b, 21, bT, 22, bB, sp.topShade);
    if (!isBack && sp.accent && !sp.dress) rect(b, 9, bT + 6, 22, bT + 6, sp.accent);
    if (!isBack && sp.accent && sp.dress) rect(b, 9, bT + 4, 22, bT + 4, sp.accent);
    // 腕 or マント肩
    if (sp.cape) {
      rect(b, 6, bT, 8, 26, sp.cape);
      rect(b, 23, bT, 25, 26, sp.cape);
      rect(b, 6, 24, 8, 26, sp.capeShade);
      rect(b, 23, 24, 25, 26, sp.capeShade);
      rect(b, 6, bT, 25, bT, sp.cape);
    } else {
      const laY = bT + (f === 1 ? 1 : 0), raY = bT + (f === 1 ? 0 : 1);
      rect(b, 6, laY, 8, laY + 5, sp.top);
      rect(b, 6, laY + 4, 8, laY + 5, sp.topShade);
      rect(b, 6, laY + 6, 8, laY + 7, sp.skin);
      rect(b, 23, raY, 25, raY + 5, sp.top);
      rect(b, 23, raY + 4, 25, raY + 5, sp.topShade);
      rect(b, 23, raY + 6, 25, raY + 7, sp.skin);
    }
  }

  // ---------------- 体 (側面) ----------------
  function bodySide(b, sp, f, dy) {
    const bT = 15 + dy, bB = 24 + Math.min(dy, 1);
    // 脚 (歩幅)
    if (sp.dress) {
      rect(b, 11, bB - 2, 20, 29, sp.bottom);
      rect(b, 10, 26, 21, 29, sp.bottom);
      rect(b, 10, 28, 21, 29, sp.bottomShade);
      if (f === 0) { rect(b, 16, 30, 19, 30, sp.boot); rect(b, 12, 30, 14, 30, sp.boot); }
      else { rect(b, 14, 30, 17, 30, sp.boot); }
    } else if (f === 0) {
      rect(b, 16, 25, 19, 27, sp.bottom);
      rect(b, 17, 28, 20, 30, sp.boot);
      rect(b, 12, 25, 15, 27, sp.bottom);
      rect(b, 11, 28, 14, 30, sp.boot);
    } else {
      rect(b, 13, 25, 16, 27, sp.bottom);
      rect(b, 13, 28, 16, 30, sp.boot);
      rect(b, 15, 25, 18, 27, sp.bottom);
      rect(b, 15, 28, 18, 30, sp.boot);
    }
    // マント (後方になびく)
    if (sp.cape) {
      const cx = f === 1 ? -1 : 0;
      rect(b, 8 + cx, bT, 11 + cx, 27, sp.cape);
      rect(b, 8 + cx, 25, 11 + cx, 27, sp.capeShade);
      rect(b, 8 + cx, bT, 8 + cx, 27, sp.capeShade);
    }
    // 胴
    rect(b, 11, bT, 20, bB, sp.top);
    rect(b, 11, bB - 1, 20, bB, sp.topShade);
    if (sp.accent && !sp.dress) rect(b, 11, bT + 6, 20, bT + 6, sp.accent);
    // 腕 (前後スイング)
    const ax = f === 1 ? 15 : 13;
    rect(b, ax, bT + 1, ax + 3, bT + 6, sp.top);
    rect(b, ax, bT + 5, ax + 3, bT + 6, sp.topShade);
    rect(b, ax + 1, bT + 7, ax + 3, bT + 8, sp.skin);
  }

  // ---------------- 固有キャラクターの意匠 ----------------
  // 共通素体の上に「遠目でも誰か分かる」シルエットと装備を重ねる。
  function drawDetails(b, sp, dir, f, dy) {
    const role = sp.role;
    if (!role) return;

    if (role === 'hero') {
      // 乱れた前髪、塔の紋章、マント留め。
      if (dir === 'd') {
        pxl(b, 10, 2 + dy, sp.hair); pxl(b, 14, 1 + dy, sp.hair); pxl(b, 20, 2 + dy, sp.hair);
        rect(b, 14, 16 + dy, 17, 17 + dy, sp.accent);
        pxl(b, 15, 18 + dy, sp.crest); pxl(b, 16, 18 + dy, sp.crest);
        pxl(b, 14, 19 + dy, sp.crest); pxl(b, 17, 19 + dy, sp.crest);
        pxl(b, 15, 20 + dy, sp.crest); pxl(b, 16, 20 + dy, sp.crest);
      } else if (dir === 'u') {
        pxl(b, 10, 2 + dy, sp.hairShade); pxl(b, 20, 2 + dy, sp.hairShade);
        rect(b, 13, 15 + dy, 18, 16 + dy, sp.accent);
      } else {
        pxl(b, 10, 2 + dy, sp.hair); pxl(b, 15, 1 + dy, sp.hair); pxl(b, 21, 3 + dy, sp.hair);
        rect(b, 18, 16 + dy, 20, 17 + dy, sp.accent);
        pxl(b, 19, 19 + dy, sp.crest);
      }
    }

    if (role === 'rino') {
      // 大きな白リボン、巡礼者の肩掛け、薬草ポーチと杖。
      if (dir === 'd') {
        rect(b, 23, 6 + dy, 26, 8 + dy, sp.ribbon); rect(b, 25, 4 + dy, 27, 6 + dy, sp.ribbonShade);
        rect(b, 8, 15 + dy, 23, 18 + dy, sp.capelet); rect(b, 10, 18 + dy, 21, 19 + dy, sp.capeletShade);
        rect(b, 21, 21 + dy, 24, 25 + dy, sp.pouch); pxl(b, 22, 22 + dy, sp.pouchLight);
        rect(b, 27, 17 + dy, 28, 29, sp.staff); rect(b, 26, 16 + dy, 29, 18 + dy, sp.staffLight);
      } else if (dir === 'u') {
        rect(b, 5, 6 + dy, 8, 8 + dy, sp.ribbon); rect(b, 4, 4 + dy, 6, 6 + dy, sp.ribbonShade);
        rect(b, 8, 15 + dy, 23, 18 + dy, sp.capeletShade);
        rect(b, 27, 17 + dy, 28, 29, sp.staff); rect(b, 26, 16 + dy, 29, 18 + dy, sp.staffLight);
      } else {
        rect(b, 8, 6 + dy, 11, 8 + dy, sp.ribbon); rect(b, 6, 4 + dy, 8, 6 + dy, sp.ribbonShade);
        rect(b, 10, 15 + dy, 20, 18 + dy, sp.capelet); rect(b, 11, 18 + dy, 19, 19 + dy, sp.capeletShade);
        rect(b, 8, 21 + dy, 11, 25 + dy, sp.pouch);
        rect(b, 23, 17 + dy, 24, 29, sp.staff); rect(b, 22, 16 + dy, 25, 18 + dy, sp.staffLight);
      }
    }

    if (role === 'gald') {
      // 赤い片肩鎧、傷、鋼の縁取り、背の大盾。
      if (dir === 'd') {
        rect(b, 6, 15, 10, 19, sp.pauldron); rect(b, 7, 15, 10, 16, sp.pauldronLight);
        pxl(b, 13, 11, sp.scar); pxl(b, 14, 12, sp.scar);
        rect(b, 10, 16, 21, 17, sp.metalLight); rect(b, 15, 18, 16, 23, sp.metalDark);
        rect(b, 25, 18, 28, 28, sp.shield); rect(b, 26, 19, 27, 27, sp.shieldLight);
      } else if (dir === 'u') {
        rect(b, 7, 14, 24, 27, sp.shield); rect(b, 9, 16, 22, 25, sp.shieldDark);
        rect(b, 10, 17, 21, 19, sp.shieldLight); rect(b, 15, 15, 16, 26, sp.shieldLight);
      } else {
        rect(b, 7, 14, 11, 27, sp.shield); rect(b, 8, 16, 10, 25, sp.shieldLight);
        rect(b, 17, 15, 21, 19, sp.pauldron); rect(b, 18, 15, 21, 16, sp.pauldronLight);
        pxl(b, 20, 11, sp.scar);
      }
    }

    if (role === 'fio') {
      // 非対称の金刺繍、古書、青い結晶のペンダント。
      if (dir === 'd') {
        rect(b, 15, 15 + dy, 16, 17 + dy, sp.chain); pxl(b, 15, 18 + dy, sp.crystal); pxl(b, 16, 18 + dy, sp.crystal);
        for (let y = 20 + dy; y < 28; y += 2) pxl(b, 10 + (y % 4), y, sp.trim);
        rect(b, 21, 20 + dy, 25, 26 + dy, sp.book); rect(b, 22, 21 + dy, 24, 22 + dy, sp.bookLight);
      } else if (dir === 'u') {
        rect(b, 9, 16 + dy, 10, 27, sp.trim); rect(b, 21, 20 + dy, 24, 26 + dy, sp.book);
      } else {
        rect(b, 18, 15 + dy, 19, 17 + dy, sp.chain); pxl(b, 19, 18 + dy, sp.crystal);
        rect(b, 8, 20 + dy, 12, 26 + dy, sp.book); rect(b, 9, 21 + dy, 11, 22 + dy, sp.bookLight);
        rect(b, 12, 19 + dy, 13, 27, sp.trim);
      }
    }
  }

  function gen(sp) {
    const dy = sp.small ? 4 : 0;
    const set = {};
    for (const f of [0, 1]) {
      let b = newBuf();
      bodyFront(b, sp, f, dy, false);
      headDown(b, sp, dy);
      drawDetails(b, sp, 'd', f, dy);
      set['d' + f] = toCanvas(b);
      b = newBuf();
      bodyFront(b, sp, f, dy, true);
      headUp(b, sp, dy);
      drawDetails(b, sp, 'u', f, dy);
      set['u' + f] = toCanvas(b);
      b = newBuf();
      bodySide(b, sp, f, dy);
      headSide(b, sp, dy);
      drawDetails(b, sp, 'r', f, dy);
      set['r' + f] = toCanvas(b);
      set['l' + f] = flipH(set['r' + f]);
    }
    return set;
  }

  // ---------------- キャラ定義 ----------------
  const SPECS = {
    hero: { skin: '#f8cfa0', skinShade: '#d8a06c', hair: '#8a4f24', hairShade: '#653a16',
      top: '#3f6fd8', topShade: '#2b4fa8', bottom: '#2e4470', bottomShade: '#1f3054',
      boot: '#6f4526', cape: '#d03a3a', capeShade: '#9a2525', accent: '#e8c34a', crest: '#64e4ff', style: 'short', role: 'hero' },
    rino: { skin: '#fad2a8', skinShade: '#dcaa78', hair: '#d8752f', hairShade: '#9f481d',
      top: '#d55d88', topShade: '#a83d68', bottom: '#c94d78', bottomShade: '#943254',
      boot: '#72422d', accent: '#f1c15a', style: 'long', dress: true, role: 'rino',
      ribbon: '#fff8e8', ribbonShade: '#d8d0ca', capelet: '#fff4df', capeletShade: '#d9c9b2',
      pouch: '#6d4930', pouchLight: '#bf8a45', staff: '#694126', staffLight: '#8de8cf' },
    gald: { skin: '#d6a176', skinShade: '#a96f4e', hair: '#382c2c', hairShade: '#201a20', beard: '#382c2c',
      top: '#7d8998', topShade: '#4f5968', bottom: '#35445c', bottomShade: '#202d42',
      boot: '#3a302e', accent: '#bd963f', style: 'short', role: 'gald',
      pauldron: '#a82f37', pauldronLight: '#e15a4c', scar: '#8e4e46', metalLight: '#cbd4dc', metalDark: '#303b4c',
      shield: '#3e4a58', shieldLight: '#9ba8b1', shieldDark: '#222b35' },
    fio: { skin: '#eac7ad', skinShade: '#bd9078', hair: '#dce4e8', hairShade: '#98a5b5',
      top: '#176d78', topShade: '#104752', bottom: '#155966', bottomShade: '#0c3944',
      boot: '#263b47', accent: '#d7ae50', style: 'long', dress: true, role: 'fio',
      trim: '#e3bd59', chain: '#d8b95c', crystal: '#55dcf3', book: '#684231', bookLight: '#d4ae68' },
    man: { skin: '#f8cfa0', skinShade: '#d8a06c', hair: '#5a462e', hairShade: '#3f2f1c',
      top: '#4d9a4f', topShade: '#357036', bottom: '#6b5138', bottomShade: '#4d3a26',
      boot: '#543d24', accent: '#8a6a42', style: 'short' },
    woman: { skin: '#fad2a8', skinShade: '#dcaa78', hair: '#c06a2c', hairShade: '#944d1e',
      top: '#d06a9a', topShade: '#a84f78', bottom: '#c85888', bottomShade: '#9c4067',
      boot: '#8a4f3a', accent: '#f0e0d0', style: 'long', dress: true },
    elder: { skin: '#f0c8a0', skinShade: '#cca078', hair: '#e8e8e8', hairShade: '#c0c0c8',
      beard: '#e8e8e8', top: '#8a5cb8', topShade: '#654098', bottom: '#7950a8', bottomShade: '#5a3585',
      boot: '#4a3a5c', accent: '#e8c34a', style: 'bald', dress: true },
    merchant: { skin: '#f8cfa0', skinShade: '#d8a06c', hair: '#5a462e', hairShade: '#3f2f1c',
      hat: '#8a5c30', hatShade: '#66401e', top: '#e0913a', topShade: '#b06a22',
      bottom: '#6b5138', bottomShade: '#4d3a26', boot: '#543d24', accent: '#f0e0c0', style: 'hat' },
    guard: { skin: '#f8cfa0', skinShade: '#d8a06c', hair: '#5a462e', hairShade: '#3f2f1c',
      hat: '#b8c2d0', hatShade: '#8892a4', plume: '#cf3838', top: '#aab4c4', topShade: '#7e8898',
      bottom: '#4d5870', bottomShade: '#38445a', boot: '#3a4356', accent: '#6a758a', style: 'helmet' },
    child: { skin: '#fad2a8', skinShade: '#dcaa78', hair: '#cf7d2e', hairShade: '#a05a1c',
      top: '#4aa4d8', topShade: '#3579a8', bottom: '#3d5a9c', bottomShade: '#2b4174',
      boot: '#7a5236', style: 'short', small: true },
    sage: { skin: '#fad2a8', skinShade: '#dcaa78', hair: '#e8e2c8', hairShade: '#beb89a',
      top: '#3d90b0', topShade: '#286884', bottom: '#357e9c', bottomShade: '#25596e',
      boot: '#33526e', accent: '#e8c34a', style: 'long', dress: true },
    celest: { skin: '#f8e4cc', skinShade: '#d8bc9c', hair: '#e8d370', hairShade: '#c4ad4a',
      top: '#f4f4fc', topShade: '#c6cade', bottom: '#e8e8f4', bottomShade: '#bfc2d8',
      boot: '#c8cce0', accent: '#e8c34a', style: 'circlet', dress: true },
  };

  function install() {
    for (const [name, sp] of Object.entries(SPECS)) {
      const set = gen(sp);
      if (name === 'hero') {
        for (const k of ['d0', 'd1', 'u0', 'u1', 'r0', 'r1', 'l0', 'l1']) {
          Art.register('hero_' + k, set[k]);
        }
      } else {
        for (const k of ['d0', 'd1', 'u0', 'u1', 'r0', 'r1', 'l0', 'l1']) {
          Art.register(name + '_' + k, set[k]);
        }
        // 既存マップ用の下向きエイリアス。
        Art.register(name + '_0', set.d0);
        Art.register(name + '_1', set.d1);
      }
    }
  }

  return { install };
})();
