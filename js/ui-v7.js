// ============================================================
// アルカの塔 - Visual System VII / interface layer
// game.js の状態と入力規約はそのままに、描画とタップ領域だけを拡張する。
// ============================================================
'use strict';

(() => {
  if (typeof UI === 'undefined' || typeof Game === 'undefined' || UI.__v7Installed) return;
  UI.__v7Installed = true;

  const COLORS = Object.freeze({
    navy0: '#030812',
    navy1: '#071425',
    navy2: '#0c2034',
    ink: '#eaf4f3',
    muted: '#91a8b6',
    faint: '#607786',
    brass: '#c7a45b',
    brassHi: '#f1d68a',
    cyan: '#67d9e3',
    cyanSoft: '#9eeaf0',
    red: '#f18a86',
    green: '#79d6af',
  });

  UI.FONT = "'Hiragino Sans', 'Yu Gothic UI', 'Yu Gothic', 'Noto Sans JP', sans-serif";
  UI.TITLE_FONT = "'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif";
  UI.colors = COLORS;
  UI.hitAreas = [];
  UI._focusTracks = new Map();
  // Menu objects are short-lived. Keep viewport state separate from save data,
  // and let it be collected when that menu is closed.
  const listViewports = new WeakMap();

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const now = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
  const reducedMotion = () => !!Game.reducedMotion;

  function roundedPath(g, x, y, w, h, radius = 8) {
    const r = clamp(radius, 0, Math.min(Math.abs(w), Math.abs(h)) / 2);
    g.beginPath();
    if (typeof g.roundRect === 'function') {
      g.roundRect(x, y, w, h, r);
      return;
    }
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }

  UI.hitArea = function hitArea(x, y, w, h, onTap) {
    if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0 || typeof onTap !== 'function') return null;
    const area = { x, y, w, h, onTap };
    UI.hitAreas.push(area);
    return area;
  };

  UI.window = function drawWindow(g, x, y, w, h, options = {}) {
    if (w <= 0 || h <= 0) return;
    const radius = options.radius === undefined ? 9 : options.radius;
    const opacity = options.opacity === undefined ? .97 : options.opacity;
    g.save();

    roundedPath(g, x + 2, y + 4, w, h, radius);
    g.fillStyle = 'rgba(0,2,8,.78)';
    g.shadowColor = 'rgba(0,0,0,.64)';
    g.shadowBlur = options.flat ? 5 : 12;
    g.shadowOffsetY = 4;
    g.fill();
    g.shadowColor = 'transparent';

    roundedPath(g, x, y, w, h, radius);
    const bg = g.createLinearGradient(x, y, x + w * .25, y + h);
    bg.addColorStop(0, `rgba(13,35,55,${opacity})`);
    bg.addColorStop(.55, `rgba(5,19,34,${opacity})`);
    bg.addColorStop(1, `rgba(3,10,23,${opacity})`);
    g.fillStyle = bg;
    g.fill();

    roundedPath(g, x + .5, y + .5, w - 1, h - 1, Math.max(1, radius - .5));
    g.lineWidth = 1;
    g.strokeStyle = options.muted ? 'rgba(121,147,157,.58)' : 'rgba(206,171,91,.84)';
    g.stroke();

    roundedPath(g, x + 3, y + 3, w - 6, h - 6, Math.max(1, radius - 2));
    g.lineWidth = .7;
    g.strokeStyle = options.muted ? 'rgba(90,139,151,.22)' : 'rgba(94,216,226,.32)';
    g.stroke();

    g.globalAlpha = options.muted ? .16 : .28;
    const sheen = g.createLinearGradient(x + 10, y, x + w - 10, y);
    sheen.addColorStop(0, 'rgba(103,217,227,0)');
    sheen.addColorStop(.48, 'rgba(103,217,227,1)');
    sheen.addColorStop(1, 'rgba(103,217,227,0)');
    g.fillStyle = sheen;
    roundedPath(g, x + 10, y + 3, Math.max(0, w - 20), 1, .5);
    g.fill();

    g.globalAlpha = 1;
    g.fillStyle = options.muted ? '#718b96' : COLORS.brassHi;
    for (const [cx, cy] of [[x + 8, y + 8], [x + w - 8, y + 8], [x + 8, y + h - 8], [x + w - 8, y + h - 8]]) {
      g.beginPath();
      g.arc(cx, cy, 1.25, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  };

  UI.text = function drawText(g, value, x, y, color = COLORS.ink, size = 16, align) {
    const str = value === undefined || value === null ? '' : String(value);
    g.save();
    g.font = `${size}px ${UI.FONT}`;
    if (align) g.textAlign = align;
    g.textBaseline = 'alphabetic';
    g.fillStyle = color;
    g.shadowColor = 'rgba(0,2,8,.78)';
    g.shadowBlur = 2.5;
    g.shadowOffsetY = 1;
    g.fillText(str, x, y);
    g.restore();
  };

  UI.measure = function measure(g, value, size = 16) {
    g.save();
    g.font = `${size}px ${UI.FONT}`;
    const width = g.measureText(value === undefined || value === null ? '' : String(value)).width;
    g.restore();
    return width;
  };

  UI.fitText = function fitText(g, value, maxW, size = 16) {
    const str = value === undefined || value === null ? '' : String(value);
    if (UI.measure(g, str, size) <= maxW) return str;
    const ellipsis = '…';
    let out = '';
    for (const ch of str) {
      if (UI.measure(g, out + ch + ellipsis, size) > maxW) break;
      out += ch;
    }
    return out + ellipsis;
  };

  UI.wrapLines = function wrapLines(g, value, maxW, size = 16) {
    const text = value === undefined || value === null ? '' : String(value);
    const lines = [];
    let line = '';
    for (const ch of text) {
      if (ch === '\n') {
        lines.push(line);
        line = '';
        continue;
      }
      if (line && UI.measure(g, line + ch, size) > maxW) {
        lines.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    if (line || !lines.length || text.endsWith('\n')) lines.push(line);
    return lines;
  };

  UI.textWrap = function textWrap(g, value, x, y, maxW, color = COLORS.ink, size = 16, lineH = 23, maxLines = Infinity) {
    const lines = UI.wrapLines(g, value, maxW, size).slice(0, maxLines);
    for (let i = 0; i < lines.length; i++) UI.text(g, lines[i], x, y + i * lineH, color, size);
    return y + Math.max(0, lines.length - 1) * lineH;
  };

  UI.cursor = function drawCursor(g, x, y, direction = 'right') {
    const drift = reducedMotion() ? 0 : Math.sin(now() / 175) * 1.7;
    g.save();
    g.translate(direction === 'right' ? drift : 0, direction === 'down' ? drift : 0);
    g.shadowColor = COLORS.cyan;
    g.shadowBlur = reducedMotion() ? 0 : 5;
    g.fillStyle = COLORS.brassHi;
    g.beginPath();
    if (direction === 'down') {
      g.moveTo(x, y + 2); g.lineTo(x + 11, y + 2); g.lineTo(x + 5.5, y + 9);
    } else {
      g.moveTo(x + 1, y); g.lineTo(x + 10, y + 5.5); g.lineTo(x + 1, y + 11);
    }
    g.closePath();
    g.fill();
    g.restore();
  };

  UI.selection = function drawSelection(g, x, y, w, h, key = 'default', options = {}) {
    const stamp = now();
    let track = UI._focusTracks.get(key);
    if (!track) {
      track = { x, y, w, h, stamp };
      UI._focusTracks.set(key, track);
    }
    const dt = clamp(stamp - track.stamp, 0, 50);
    const ease = reducedMotion() ? 1 : 1 - Math.exp(-dt / 48);
    track.x += (x - track.x) * ease;
    track.y += (y - track.y) * ease;
    track.w += (w - track.w) * ease;
    track.h += (h - track.h) * ease;
    track.stamp = stamp;

    const pulse = reducedMotion() ? .72 : .68 + Math.sin(stamp / 330) * .08;
    g.save();
    roundedPath(g, track.x, track.y, track.w, track.h, Math.min(7, track.h / 3));
    const fill = g.createLinearGradient(track.x, track.y, track.x + track.w, track.y);
    fill.addColorStop(0, `rgba(66,173,193,${pulse * .34})`);
    fill.addColorStop(.7, `rgba(35,104,132,${pulse * .2})`);
    fill.addColorStop(1, 'rgba(21,63,88,.06)');
    g.fillStyle = fill;
    g.fill();
    g.lineWidth = options.picked ? 1.2 : .8;
    g.strokeStyle = options.picked ? 'rgba(241,214,138,.88)' : 'rgba(110,225,233,.64)';
    g.stroke();
    g.fillStyle = options.picked ? COLORS.brassHi : COLORS.cyan;
    roundedPath(g, track.x + 3, track.y + 4, 2.5, Math.max(2, track.h - 8), 1.2);
    g.fill();
    if (!reducedMotion()) {
      const sweepX = track.x + 12 + ((stamp / 9) % Math.max(1, track.w - 35));
      const sweep = g.createLinearGradient(sweepX - 12, 0, sweepX + 12, 0);
      sweep.addColorStop(0, 'rgba(255,255,255,0)');
      sweep.addColorStop(.5, 'rgba(189,247,249,.08)');
      sweep.addColorStop(1, 'rgba(255,255,255,0)');
      roundedPath(g, track.x + 1, track.y + 1, track.w - 2, track.h - 2, Math.min(6, track.h / 3));
      g.clip();
      g.fillStyle = sweep;
      g.fillRect(sweepX - 12, track.y, 24, track.h);
    }
    g.restore();
    return track;
  };

  UI.meter = function meter(g, x, y, w, value, maxValue, color, label) {
    const max = Math.max(1, Number(maxValue) || 1);
    const val = clamp(Number(value) || 0, 0, max);
    if (label) UI.text(g, label, x, y, COLORS.muted, 10);
    UI.text(g, `${val}/${max}`, x + w, y, COLORS.ink, 10, 'right');
    roundedPath(g, x, y + 5, w, 5, 2.5);
    g.fillStyle = 'rgba(2,8,17,.82)'; g.fill();
    const fw = w * val / max;
    if (fw > 0) {
      roundedPath(g, x, y + 5, Math.max(2, fw), 5, 2.5);
      const grad = g.createLinearGradient(x, 0, x + w, 0);
      grad.addColorStop(0, color); grad.addColorStop(1, '#d8fbfa');
      g.fillStyle = grad; g.fill();
    }
  };

  function modalVeil(g, alpha = .56) {
    g.save();
    const shade = g.createRadialGradient(256, 210, 80, 256, 210, 370);
    shade.addColorStop(0, `rgba(2,8,17,${alpha * .72})`);
    shade.addColorStop(1, `rgba(1,4,12,${alpha})`);
    g.fillStyle = shade;
    g.fillRect(0, 0, 512, 448);
    g.restore();
  }

  function virtualOk() {
    Input.virtualDown('ok');
    Input.virtualUp('ok');
  }

  function selectByTap(getSelection, setSelection, index) {
    return () => {
      if (getSelection() === index) {
        virtualOk();
      } else {
        setSelection(index);
        if (typeof AudioSys !== 'undefined') AudioSys.sfx('cursor');
      }
    };
  }

  function safeSelection(holder, key, length) {
    if (!length) return 0;
    const next = clamp(Number.isFinite(holder[key]) ? holder[key] : 0, 0, length - 1);
    if (holder[key] !== next) holder[key] = next;
    return next;
  }

  function locationName(game) {
    if (!game.map) return `${game.floor || 1}F`;
    const place = game.map.name || (typeof TIER_NAMES !== 'undefined' && TIER_NAMES[game.map.tier]) || 'アルカの塔';
    return `${game.floor}F  ${place}`;
  }

  function nextObjective(game) {
    const goals = [
      [10, 'boss10', '石の守り'], [20, 'boss20', '水霊の間'],
      [30, 'boss30', '砂の王'], [40, 'boss40', 'あけぼのの門'],
    ];
    const next = goals.find(([, flag]) => !(game.flags && game.flags[flag]));
    if (next) return `${next[0]}F  ${next[2]}`;
    return game.flags && game.flags.chapter1_clear ? '第一部の記録をたどる' : '40F  あけぼのの門';
  }

  function drawGlassChip(g, x, y, w, h, accent = COLORS.cyan) {
    g.save();
    roundedPath(g, x, y, w, h, 8);
    g.fillStyle = 'rgba(4,14,27,.78)';
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 7; g.shadowOffsetY = 2;
    g.fill();
    g.shadowColor = 'transparent';
    g.lineWidth = .8; g.strokeStyle = 'rgba(205,176,103,.62)'; g.stroke();
    g.fillStyle = accent; roundedPath(g, x + 5, y + 7, 2, h - 14, 1); g.fill();
    g.restore();
  }

  function drawFieldHud(g, game) {
    const loc = locationName(game);
    drawGlassChip(g, 8, 8, 304, 45);
    UI.text(g, UI.fitText(g, loc, 278, 13), 20, 27, COLORS.ink, 13);
    UI.text(g, `目的地  ${UI.fitText(g, nextObjective(game), 224, 10)}`, 20, 43, COLORS.muted, 10);
    const safe = !!(game.map && (game.map.safe || game.map.town || game.map.settlement || game.map.restPoint));
    drawGlassChip(g, 419, 8, 85, 28, safe ? COLORS.green : COLORS.red);
    UI.text(g, safe ? 'SAFE' : 'DANGER', 464, 27, safe ? COLORS.green : COLORS.red, 10, 'center');
    if (game.repel > 0) {
      drawGlassChip(g, 419, 40, 85, 24, COLORS.cyan);
      UI.text(g, `まよけ ${Math.ceil(game.repel)}`, 461, 56, COLORS.cyanSoft, 9, 'center');
    }
  }

  const originalDrawField = Game.drawField;
  Game.drawField = function drawFieldV7(g) {
    originalDrawField.call(this, g);
    if (this.state === 'field') drawFieldHud(g, this);
  };

  function drawTopBar(g, title, subtitle, game, options = {}) {
    UI.window(g, 12, 10, 488, 42, { flat: true });
    UI.text(g, title, 28, 36, COLORS.brassHi, 16);
    if (subtitle) UI.text(g, UI.fitText(g, subtitle, options.gold === false ? 300 : 225, 11), 164, 35, COLORS.muted, 11);
    if (options.gold !== false) UI.text(g, `${game.gold} G`, 482, 36, COLORS.brassHi, 14, 'right');
  }

  function footer(g, text, tone = 'normal') {
    UI.window(g, 12, 380, 488, 56, { flat: true, muted: tone === 'muted' });
    const color = tone === 'warn' ? COLORS.red : tone === 'good' ? COLORS.green : COLORS.muted;
    const rows = UI.wrapLines(g, text, 452, 12).slice(0, 2);
    for (let i = 0; i < rows.length; i++) UI.text(g, rows[i], 30, 405 + i * 18, color, 12);
  }

  function drawPanelHeading(g, x, y, title, kicker) {
    if (kicker) UI.text(g, kicker.toUpperCase(), x, y, COLORS.cyan, 9);
    UI.text(g, title, x, y + (kicker ? 18 : 2), COLORS.brassHi, 14);
  }

  function drawScrollRail(g, x, y, h, start, shown, total) {
    if (total <= shown || total <= 0) return;
    const trackH = Math.max(10, h);
    const thumbH = Math.max(14, trackH * shown / total);
    const maxStart = Math.max(1, total - shown);
    const thumbY = y + (trackH - thumbH) * start / maxStart;
    roundedPath(g, x, y, 2, trackH, 1);
    g.fillStyle = 'rgba(106,143,157,.24)'; g.fill();
    roundedPath(g, x - 1, thumbY, 4, thumbH, 2);
    g.fillStyle = COLORS.cyan; g.fill();
  }

  function drawListPanel(g, config) {
    const {
      x = 12, y = 60, w = 304, h = 312, title = '', kicker = 'SELECT',
      items = [], selection = 0, rowHeight = 38, key = title,
      scrollOwner = items,
      label = value => String(value), meta = () => '', secondary = null,
      itemColor = () => COLORS.ink, picked = () => false,
      onSelect = null, interactive = true, emptyText = 'なにも ありません', emptyTap = null,
    } = config;
    UI.window(g, x, y, w, h);
    drawPanelHeading(g, x + 16, y + 19, title, kicker);
    const listTop = y + 43;
    const capacity = Math.max(1, Math.floor((h - 51) / rowHeight));
    const len = items.length;
    const sel = len ? clamp(selection, 0, len - 1) : 0;
    const priorViewport = listViewports.get(scrollOwner);
    let start = clamp(priorViewport && priorViewport.key === key ? priorViewport.start : 0, 0, Math.max(0, len - capacity));
    // Only scroll when selection leaves the visible range. Recentring a clicked
    // row made a second tap at the same coordinates choose a different item.
    if (sel < start) start = sel;
    else if (sel >= start + capacity) start = sel - capacity + 1;
    listViewports.set(scrollOwner, { key, start });
    const end = Math.min(len, start + capacity);
    if (len) UI.text(g, `${sel + 1} / ${len}`, x + w - 20, y + 30, COLORS.faint, 9, 'right');

    if (!len) {
      UI.text(g, '—', x + w / 2, listTop + 56, COLORS.faint, 22, 'center');
      UI.text(g, emptyText, x + w / 2, listTop + 88, COLORS.muted, 13, 'center');
      if (interactive && emptyTap) UI.hitArea(x + 8, listTop, w - 16, h - 51, emptyTap);
      return { start: 0, end: 0, capacity, selected: null };
    }

    for (let i = start; i < end; i++) {
      const row = i - start;
      const ry = listTop + row * rowHeight;
      const isSelected = i === sel;
      const isPicked = !!picked(items[i], i);
      if (isPicked && !isSelected) {
        roundedPath(g, x + 9, ry + 3, w - 22, rowHeight - 6, 6);
        g.fillStyle = 'rgba(199,164,91,.11)'; g.fill();
        g.lineWidth = .6; g.strokeStyle = 'rgba(199,164,91,.42)'; g.stroke();
      }
      if (isSelected) UI.selection(g, x + 8, ry + 2, w - 20, rowHeight - 4, `${key}:${start}`, { picked: isPicked });
      const primaryY = ry + (secondary ? 17 : Math.floor(rowHeight / 2) + 5);
      UI.text(g, UI.fitText(g, label(items[i], i), w - (meta(items[i], i) ? 116 : 52), secondary ? 13 : 14), x + 23, primaryY,
        isSelected ? COLORS.ink : itemColor(items[i], i), secondary ? 13 : 14);
      const metadata = meta(items[i], i);
      if (metadata) UI.text(g, UI.fitText(g, metadata, 90, 11), x + w - 23, primaryY, isSelected ? COLORS.cyanSoft : COLORS.muted, 11, 'right');
      if (secondary) UI.text(g, UI.fitText(g, secondary(items[i], i), w - 50, 10), x + 23, ry + rowHeight - 7, COLORS.faint, 10);
      if (interactive && onSelect) UI.hitArea(x + 8, ry + 1, w - 16, rowHeight - 2, () => onSelect(i));
    }
    drawScrollRail(g, x + w - 11, listTop + 4, capacity * rowHeight - 8, start, capacity, len);
    return { start, end, capacity, selected: items[sel], selection: sel };
  }

  function drawInfoShell(g, title, kicker = 'DETAIL') {
    UI.window(g, 324, 60, 176, 312);
    drawPanelHeading(g, 340, 79, title, kicker);
    g.strokeStyle = 'rgba(103,217,227,.18)'; g.lineWidth = .7;
    g.beginPath(); g.moveTo(340, 108); g.lineTo(484, 108); g.stroke();
  }

  function memberSprite(member) {
    if (!member || typeof Art === 'undefined') return null;
    const sprName = member.kind === 'human' ? HUMANS[member.id].spr : MONSTERS[member.id].spr;
    return Art.get(`${sprName}_0`) || Art.get(`${sprName}_d0`) || Art.get(sprName);
  }

  function watchAssetFailure(image) {
    if (!image || image.__v7FailureWatched) return image;
    image.__v7FailureWatched = true;
    if (typeof image.addEventListener === 'function') {
      image.addEventListener('error', () => { image.__v7Failed = true; }, { once: true });
    }
    return image;
  }

  function drawHumanIllustration(g, member, x, y, size) {
    const portrait = watchAssetFailure(Game.hdCharacters && Game.hdCharacters[member.id]);
    if (portrait) Game.loadAssetOnce(portrait, `assets/${member.id}-v4.png`);
    if (portrait && portrait.complete && portrait.naturalWidth && portrait.naturalHeight) {
      const sourceSize = Math.min(portrait.naturalWidth, portrait.naturalHeight * .48);
      const sourceX = Math.max(0, (portrait.naturalWidth - sourceSize) / 2);
      g.drawImage(portrait, sourceX, 0, sourceSize, sourceSize, x, y, size, size);
      return true;
    }

    const field = watchAssetFailure(Game.fieldCharacters && Game.fieldCharacters[member.id]);
    if (field && !field.src) Game.loadFieldCharacter(member.id);
    if (field && field.complete && field.naturalWidth && field.naturalHeight) {
      const cellW = field.naturalWidth / 6;
      const cellH = field.naturalHeight / 4;
      const fit = Math.min(size / cellW, size / cellH);
      const drawW = cellW * fit, drawH = cellH * fit;
      g.drawImage(field, 0, 0, cellW, cellH, x + (size - drawW) / 2, y + size - drawH, drawW, drawH);
      return true;
    }
    return !!(portrait && portrait.__v7Failed && (!field || field.__v7Failed) && (() => {
      const fallback = memberSprite(member);
      if (!fallback) return false;
      g.drawImage(fallback, x, y, size, size);
      return true;
    })());
  }

  function loadV5EnemyAtlas(crop) {
    if (!crop) return null;
    const sources = {
      battleSpritesV5: 'assets/v5/tier1-enemies-v5.webp',
      battleSpritesV5Tier2: 'assets/v5/tier2-enemies-v5.webp',
      battleSpritesV5Tier3: 'assets/v5/tier3-enemies-v5.webp',
      battleSpritesV5Tier4: 'assets/v5/tier4-enemies-v5.webp',
    };
    const atlas = watchAssetFailure(Game[crop.atlas]);
    if (atlas && sources[crop.atlas]) Game.loadAssetOnce(atlas, sources[crop.atlas]);
    return atlas;
  }

  function drawMonsterIllustration(g, member, x, y, size) {
    if (typeof Battle !== 'undefined') {
      if (Battle.v6EnemySources && Battle.v6EnemySources[member.id]) {
        const image = watchAssetFailure(Battle.ensureV6Enemy(member.id));
        if (image && Battle.drawV6Enemy(g, member.id, x, y, size, size)) return true;
      }
      const crop = Battle.v5EnemyCrops && Battle.v5EnemyCrops[member.id];
      const atlas = loadV5EnemyAtlas(crop);
      if (crop && atlas && Battle.drawV5Enemy(g, member.id, x, y, size, size)) return true;

      const painted = watchAssetFailure(Game.monsterAtlas);
      if (painted) Game.loadAssetOnce(painted, 'assets/monster-atlas-v4.png');
      if (painted && painted.complete && painted.naturalWidth && painted.naturalHeight) {
        const cell = painted.naturalWidth / 4;
        const index = Battle.atlasIndex(MONSTERS[member.id].spr);
        g.drawImage(painted, (index % 4) * cell, Math.floor(index / 4) * cell, cell, cell, x, y, size, size);
        return true;
      }
      const preferredFailed = (!crop || (atlas && atlas.__v7Failed)) && painted && painted.__v7Failed;
      if (!preferredFailed) return false;
    }
    const fallback = memberSprite(member);
    if (!fallback) return false;
    g.drawImage(fallback, x, y, size, size);
    return true;
  }

  function drawMemberMedallion(g, member, x, y, size = 44) {
    g.save();
    roundedPath(g, x, y, size, size, 9);
    const bg = g.createLinearGradient(x, y, x, y + size);
    bg.addColorStop(0, 'rgba(43,91,112,.65)'); bg.addColorStop(1, 'rgba(7,22,38,.9)');
    g.fillStyle = bg; g.fill();
    g.clip();
    const illustrated = member && (member.kind === 'human'
      ? drawHumanIllustration(g, member, x + 2, y + 2, size - 4)
      : drawMonsterIllustration(g, member, x + 2, y + 2, size - 4));
    if (!illustrated) UI.text(g, member ? member.name.slice(0, 1) : '?', x + size / 2, y + size * .68, COLORS.cyanSoft, Math.floor(size * .45), 'center');
    g.restore();
    roundedPath(g, x + .5, y + .5, size - 1, size - 1, 8.5);
    g.lineWidth = .8; g.strokeStyle = 'rgba(199,164,91,.7)'; g.stroke();
  }

  function memberRole(member) {
    if (!member) return '';
    return member.kind === 'monster' ? MONSTERS[member.id].name : Chars.jobNameOf(member);
  }

  // ---------- フィールドメニュー ----------
  function drawMainMenu(g, game, menu) {
    const items = game.mainMenuItems();
    safeSelection(menu, 'sel', items.length);
    drawTopBar(g, '旅の手帖', locationName(game), game);

    UI.window(g, 12, 60, 142, 376);
    UI.text(g, 'COMMAND', 28, 83, COLORS.cyan, 9);
    const rowTop = 91, rowH = 43;
    for (let i = 0; i < items.length; i++) {
      const ry = rowTop + i * rowH;
      if (i === menu.sel) UI.selection(g, 20, ry, 126, 36, 'menu-main');
      UI.text(g, items[i].label, 47, ry + 24, i === menu.sel ? COLORS.ink : COLORS.muted, 14);
      if (i === menu.sel) UI.cursor(g, 29, ry + 13, 'right');
      UI.hitArea(20, ry, 126, 37, selectByTap(() => menu.sel, value => { menu.sel = value; }, i));
    }
    UI.text(g, '戻る  メニューを閉じる', 28, 422, COLORS.faint, 9);

    UI.window(g, 162, 60, 338, 376);
    UI.text(g, 'ACTIVE PARTY', 178, 83, COLORS.cyan, 9);
    UI.text(g, `次の目的地  ${UI.fitText(g, nextObjective(game), 205, 11)}`, 484, 84, COLORS.muted, 11, 'right');
    const list = game.party.slice(0, 4);
    const cardTop = 94, cardH = 76;
    for (let i = 0; i < 4; i++) {
      const p = list[i];
      const cy = cardTop + i * 81;
      roundedPath(g, 173, cy, 316, cardH, 8);
      g.fillStyle = p ? 'rgba(15,42,61,.55)' : 'rgba(5,17,29,.33)'; g.fill();
      g.lineWidth = .6; g.strokeStyle = p ? 'rgba(106,170,180,.34)' : 'rgba(94,113,125,.2)'; g.stroke();
      if (!p) {
        UI.text(g, '空き', 331, cy + 44, COLORS.faint, 12, 'center');
        continue;
      }
      drawMemberMedallion(g, p, 183, cy + 15, 46);
      const dead = p.hp <= 0;
      UI.text(g, p.name, 241, cy + 22, dead ? COLORS.red : COLORS.ink, 14);
      UI.text(g, `${memberRole(p)}  Lv${p.level}`, 478, cy + 21, COLORS.muted, 10, 'right');
      UI.meter(g, 241, cy + 39, 106, p.hp, p.maxhp, dead ? COLORS.red : COLORS.green, 'HP');
      UI.meter(g, 363, cy + 39, 106, p.mp, p.maxmp, COLORS.cyan, 'MP');
      if (p.poison) UI.text(g, 'POISON', 478, cy + 66, COLORS.red, 8, 'right');
    }
  }

  function drawMemberPicker(g, game, menu) {
    const list = menu.targets || (menu.humansOnly ? game.party.filter(p => p.kind === 'human') : game.party);
    const sel = safeSelection(menu, 'sel', list.length);
    const title = menu.kind === 'pickTarget' ? '対象を選ぶ' : menu.next === 'equip' ? '装備する仲間' : menu.next === 'spell' ? '唱える仲間' : '仲間の強さ';
    drawTopBar(g, title, locationName(game), game);
    UI.window(g, 48, 62, 416, 310);
    UI.text(g, 'PARTY', 66, 87, COLORS.cyan, 9);
    if (!list.length) {
      UI.text(g, '選べる仲間がいません', 256, 210, COLORS.muted, 14, 'center');
      footer(g, '決定または戻るで前の画面へ', 'muted');
      return;
    }
    const rowH = 65, top = 99;
    for (let i = 0; i < list.length; i++) {
      const p = list[i], ry = top + i * rowH;
      if (i === sel) UI.selection(g, 59, ry, 394, 58, `member-picker:${menu.kind}`);
      drawMemberMedallion(g, p, 70, ry + 7, 44);
      UI.text(g, p.name, 126, ry + 24, p.hp <= 0 ? COLORS.red : COLORS.ink, 14);
      UI.text(g, `${memberRole(p)}  Lv${p.level}`, 436, ry + 23, COLORS.muted, 10, 'right');
      UI.meter(g, 126, ry + 43, 132, p.hp, p.maxhp, p.hp <= 0 ? COLORS.red : COLORS.green, 'HP');
      UI.meter(g, 282, ry + 43, 132, p.mp, p.maxmp, COLORS.cyan, 'MP');
      UI.hitArea(59, ry, 394, 59, selectByTap(() => menu.sel, value => { menu.sel = value; }, i));
    }
    footer(g, menu.kind === 'pickTarget' ? '回復・効果を与える仲間を選びます' : '仲間を選んで決定', 'muted');
  }

  function drawStatus(g, game, menu) {
    const p = menu.member;
    drawTopBar(g, '強さ', p ? `${p.name} / ${memberRole(p)}` : '', game);
    UI.window(g, 34, 62, 444, 310);
    if (!p) { footer(g, '戻るで前の画面へ', 'muted'); return; }
    drawMemberMedallion(g, p, 54, 84, 66);
    UI.text(g, p.name, 138, 103, p.hp <= 0 ? COLORS.red : COLORS.brassHi, 20);
    UI.text(g, `${memberRole(p)}   Lv ${p.level}`, 138, 126, COLORS.muted, 12);
    UI.meter(g, 138, 148, 138, p.hp, p.maxhp, p.hp <= 0 ? COLORS.red : COLORS.green, 'HP');
    UI.meter(g, 300, 148, 138, p.mp, p.maxmp, COLORS.cyan, 'MP');

    g.strokeStyle = 'rgba(103,217,227,.17)'; g.lineWidth = .7;
    g.beginPath(); g.moveTo(52, 178); g.lineTo(460, 178); g.stroke();
    const nextExp = Math.max(0, Chars.expTable(p.level + 1) - p.exp);
    const left = [
      ['経験値', p.exp], ['次のレベルまで', nextExp], ['ちから', p.str], ['みのまもり', p.vit], ['すばやさ', p.agi],
    ];
    const right = [
      ['攻撃力', Chars.attackOf(p)], ['守備力', Chars.defenseOf(p)],
      ['武器', p.weapon ? WEAPONS[p.weapon].name : 'なし'], ['鎧', p.armor ? ARMORS[p.armor].name : 'なし'],
      ['状態', p.hp <= 0 ? '戦闘不能' : p.poison ? 'どく' : '良好'],
    ];
    for (let i = 0; i < left.length; i++) {
      const yy = 207 + i * 29;
      UI.text(g, left[i][0], 58, yy, COLORS.muted, 11);
      UI.text(g, left[i][1], 245, yy, COLORS.ink, 12, 'right');
      UI.text(g, right[i][0], 274, yy, COLORS.muted, 11);
      UI.text(g, UI.fitText(g, right[i][1], 105, 12), 454, yy, i === 4 && right[i][1] !== '良好' ? COLORS.red : COLORS.ink, 12, 'right');
    }
    footer(g, '決定または戻るで仲間選択へ', 'muted');
    UI.hitArea(34, 62, 444, 310, virtualOk);
  }

  function fieldSpellIds(member) {
    return member.spells.filter(id => {
      const spell = SPELLS[id];
      return spell && (['heal', 'revive', 'field_warp', 'cure'].includes(spell.kind) || id === 'toberu');
    });
  }

  function drawSpells(g, game, menu) {
    const p = menu.member;
    const ids = fieldSpellIds(p);
    const sel = safeSelection(menu, 'sel', ids.length);
    drawTopBar(g, '呪文', `${p.name}  MP ${p.mp}/${p.maxmp}`, game);
    const list = drawListPanel(g, {
      title: `${p.name}の呪文`, kicker: 'FIELD MAGIC', items: ids, selection: sel, key: 'menu-spells',
      scrollOwner: menu,
      label: id => SPELLS[id].name,
      meta: id => `MP ${SPELLS[id].mp}`,
      itemColor: id => p.mp < SPELLS[id].mp ? COLORS.red : COLORS.muted,
      onSelect: i => selectByTap(() => menu.sel, value => { menu.sel = value; }, i)(),
      emptyText: '外で使える呪文がありません', emptyTap: virtualOk,
    });
    drawInfoShell(g, '呪文の効果', 'DETAIL');
    const id = list.selected;
    if (id) {
      const sp = SPELLS[id];
      UI.text(g, sp.name, 340, 133, COLORS.ink, 16);
      UI.text(g, `消費 MP  ${sp.mp}`, 340, 158, COLORS.cyanSoft, 11);
      const target = sp.target === 'party' ? '仲間全体' : sp.target === 'field' ? '移動' : '仲間ひとり';
      UI.text(g, `対象  ${target}`, 340, 180, COLORS.muted, 11);
      UI.textWrap(g, sp.desc || '不思議な力を起こす', 340, 216, 139, COLORS.ink, 12, 20, 5);
      if (p.mp < sp.mp) UI.text(g, 'MPが足りません', 340, 345, COLORS.red, 11);
    }
    footer(g, ids.length ? '呪文を選んで決定 / 戻るで仲間選択へ' : '使える呪文を覚えると、ここに表示されます', 'muted');
  }

  const ITEM_KIND_LABELS = Object.freeze({
    heal: 'HP回復', mp: 'MP回復', cure_poison: 'どく治療', field_warp: '移動',
    bait: '戦闘専用', repel: 'まよけ', seed_str: '能力上昇', seed_vit: '能力上昇',
    seed_hp: '能力上昇', seed_mp: '能力上昇',
  });

  function drawItems(g, game, menu) {
    const sel = safeSelection(menu, 'sel', game.bag.length);
    drawTopBar(g, '道具袋', `${game.bag.length} 種類`, game);
    const list = drawListPanel(g, {
      title: '持ち物', kicker: 'INVENTORY', items: game.bag, selection: sel, key: 'menu-items',
      scrollOwner: menu,
      label: entry => ITEMS[entry.id].name,
      meta: entry => `× ${entry.n}`,
      secondary: entry => ITEM_KIND_LABELS[ITEMS[entry.id].kind] || '大切な道具',
      rowHeight: 40,
      onSelect: i => selectByTap(() => menu.sel, value => { menu.sel = value; }, i)(),
      emptyText: '道具を持っていません', emptyTap: virtualOk,
    });
    drawInfoShell(g, '道具の説明');
    const entry = list.selected;
    if (entry) {
      const item = ITEMS[entry.id];
      UI.text(g, UI.fitText(g, item.name, 140, 15), 340, 135, COLORS.ink, 15);
      UI.text(g, ITEM_KIND_LABELS[item.kind] || '道具', 340, 160, COLORS.cyanSoft, 10);
      UI.text(g, `所持数  ${entry.n}`, 340, 184, COLORS.muted, 11);
      UI.textWrap(g, item.desc, 340, 221, 138, COLORS.ink, 12, 21, 5);
      if (item.kind === 'bait') UI.textWrap(g, '戦闘中に使います', 340, 337, 138, COLORS.brassHi, 10, 17, 2);
    }
    footer(g, game.bag.length ? '道具を選んで決定 / 戻るで旅の手帖へ' : '宝箱や店で手に入れた道具が並びます', 'muted');
  }

  function drawEquipSlot(g, game, menu) {
    const p = menu.member;
    safeSelection(menu, 'sel', 2);
    drawTopBar(g, '装備', `${p.name} / ${memberRole(p)}`, game);
    UI.window(g, 12, 62, 304, 310);
    drawPanelHeading(g, 28, 81, '装備する場所', 'EQUIPMENT');
    const slots = [
      { label: '武器', value: p.weapon ? WEAPONS[p.weapon].name : 'なし', stat: `攻撃力 ${Chars.attackOf(p)}` },
      { label: '鎧', value: p.armor ? ARMORS[p.armor].name : 'なし', stat: `守備力 ${Chars.defenseOf(p)}` },
    ];
    for (let i = 0; i < 2; i++) {
      const ry = 112 + i * 105;
      if (menu.sel === i) UI.selection(g, 23, ry, 282, 88, 'equip-slot');
      UI.text(g, slots[i].label, 42, ry + 26, COLORS.cyanSoft, 11);
      UI.text(g, UI.fitText(g, slots[i].value, 220, 15), 42, ry + 51, menu.sel === i ? COLORS.ink : COLORS.muted, 15);
      UI.text(g, slots[i].stat, 286, ry + 74, COLORS.muted, 11, 'right');
      UI.hitArea(23, ry, 282, 88, selectByTap(() => menu.sel, value => { menu.sel = value; }, i));
    }
    drawInfoShell(g, '現在の能力', 'STATUS');
    UI.text(g, p.name, 340, 134, COLORS.brassHi, 16);
    UI.text(g, 'ちから', 340, 169, COLORS.muted, 11); UI.text(g, p.str, 480, 169, COLORS.ink, 12, 'right');
    UI.text(g, 'みのまもり', 340, 196, COLORS.muted, 11); UI.text(g, p.vit, 480, 196, COLORS.ink, 12, 'right');
    UI.text(g, '攻撃力', 340, 239, COLORS.muted, 11); UI.text(g, Chars.attackOf(p), 480, 239, COLORS.cyanSoft, 15, 'right');
    UI.text(g, '守備力', 340, 270, COLORS.muted, 11); UI.text(g, Chars.defenseOf(p), 480, 270, COLORS.cyanSoft, 15, 'right');
    footer(g, '武器または鎧を選んで決定', 'muted');
  }

  function equipDefinition(slot, id) {
    return slot === 'w' ? WEAPONS[id] : ARMORS[id];
  }

  function drawEquipPick(g, game, menu) {
    const candidates = game.equipBag.filter(entry => entry.slot === menu.slot);
    const rows = [...candidates, null];
    const sel = safeSelection(menu, 'sel', rows.length);
    const weapon = menu.slot === 'w';
    const member = menu.member;
    drawTopBar(g, weapon ? '武器を選ぶ' : '鎧を選ぶ', member.name, game);
    const list = drawListPanel(g, {
      title: weapon ? '武器袋' : '防具袋', kicker: 'EQUIPMENT', items: rows, selection: sel, key: `equip-pick:${menu.slot}`,
      scrollOwner: menu,
      label: entry => entry ? equipDefinition(menu.slot, entry.id).name : 'はずす',
      meta: entry => entry ? `${weapon ? '攻' : '守'} +${weapon ? equipDefinition(menu.slot, entry.id).atk : equipDefinition(menu.slot, entry.id).def}` : '—',
      secondary: entry => entry ? '装備候補' : '何も装備しない', rowHeight: 40,
      onSelect: i => selectByTap(() => menu.sel, value => { menu.sel = value; }, i)(),
    });
    drawInfoShell(g, '能力比較', 'COMPARE');
    const currentId = weapon ? member.weapon : member.armor;
    const current = currentId ? equipDefinition(menu.slot, currentId) : null;
    const candidate = list.selected ? equipDefinition(menu.slot, list.selected.id) : null;
    const currentBonus = current ? (weapon ? current.atk : current.def) : 0;
    const nextBonus = candidate ? (weapon ? candidate.atk : candidate.def) : 0;
    const base = weapon ? member.str : member.vit;
    const delta = nextBonus - currentBonus;
    UI.text(g, '現在', 340, 132, COLORS.muted, 10);
    UI.text(g, UI.fitText(g, current ? current.name : 'なし', 138, 13), 340, 154, COLORS.ink, 13);
    UI.text(g, '変更後', 340, 190, COLORS.muted, 10);
    UI.text(g, UI.fitText(g, candidate ? candidate.name : 'なし', 138, 13), 340, 212, COLORS.ink, 13);
    g.strokeStyle = 'rgba(103,217,227,.17)'; g.beginPath(); g.moveTo(340, 231); g.lineTo(482, 231); g.stroke();
    UI.text(g, weapon ? '攻撃力' : '守備力', 340, 260, COLORS.muted, 11);
    UI.text(g, `${base + currentBonus} → ${base + nextBonus}`, 482, 260, COLORS.ink, 14, 'right');
    const deltaText = delta > 0 ? `+${delta}` : String(delta);
    UI.text(g, delta === 0 ? '変化なし' : deltaText, 482, 294, delta > 0 ? COLORS.green : delta < 0 ? COLORS.red : COLORS.muted, 18, 'right');
    footer(g, '候補を選んで決定 / 「はずす」で装備を外します', 'muted');
  }

  function drawParty(g, game, menu) {
    const members = [...game.party, ...game.reserve];
    const sel = safeSelection(menu, 'sel', members.length);
    drawTopBar(g, '仲間の編成', `前列 ${game.party.length}人 / 控え ${game.reserve.length}人`, game);
    const list = drawListPanel(g, {
      x: 12, y: 60, w: 304, h: 312, title: '仲間一覧', kicker: 'ROSTER', items: members, selection: sel,
      key: 'menu-party', rowHeight: 40,
      scrollOwner: menu,
      label: member => `${members.indexOf(member) < game.party.length ? '◆ ' : ''}${member.name}`,
      meta: member => `Lv ${member.level}`,
      secondary: (member, i) => `${i < game.party.length ? '旅の仲間' : '控え'} / ${memberRole(member)}`,
      picked: (_member, i) => i === menu.picked,
      onSelect: i => selectByTap(() => menu.sel, value => { menu.sel = value; }, i)(),
      emptyText: '仲間がいません',
    });
    drawInfoShell(g, '仲間の詳細', 'PROFILE');
    const p = list.selected;
    if (p) {
      drawMemberMedallion(g, p, 340, 122, 54);
      UI.text(g, UI.fitText(g, p.name, 78, 15), 405, 139, p.hp <= 0 ? COLORS.red : COLORS.ink, 15);
      UI.text(g, UI.fitText(g, memberRole(p), 78, 10), 405, 158, COLORS.muted, 10);
      UI.text(g, `Lv ${p.level}`, 480, 181, COLORS.cyanSoft, 11, 'right');
      UI.meter(g, 340, 211, 140, p.hp, p.maxhp, p.hp <= 0 ? COLORS.red : COLORS.green, 'HP');
      UI.meter(g, 340, 240, 140, p.mp, p.maxmp, COLORS.cyan, 'MP');
      const index = list.selection;
      UI.text(g, index < game.party.length ? 'ACTIVE' : 'RESERVE', 340, 282, index < game.party.length ? COLORS.green : COLORS.muted, 10);
      if (menu.picked >= 0) {
        const pickedMember = members[menu.picked];
        UI.text(g, '入れ替える仲間', 340, 315, COLORS.brassHi, 10);
        UI.text(g, pickedMember ? UI.fitText(g, pickedMember.name, 138, 14) : '—', 340, 339, COLORS.ink, 14);
      } else {
        UI.textWrap(g, '決定で、入れ替えるひとり目を選びます', 340, 314, 138, COLORS.muted, 10, 18, 2);
      }
    }
    footer(g, game.partyMsg || (menu.picked >= 0 ? '入れ替えるふたり目を選んで決定' : 'ふたりを順番に選ぶと、旅の仲間と控えを入れ替えます'), game.partyMsg ? 'warn' : 'muted');
  }

  function drawWarp(g, game, menu) {
    const towns = [...game.visitedTowns].sort((a, b) => a - b);
    const sel = safeSelection(menu, 'sel', towns.length);
    const names = towns.map(floor => ({
      floor,
      name: TOWN_DATA[floor] ? TOWN_DATA[floor].name : (REST_POINT_NAMES[floor] || `${floor}階`),
    }));
    drawTopBar(g, '移動先', 'トベール', game);
    const list = drawListPanel(g, {
      title: '訪れた場所', kicker: 'DESTINATION', items: names, selection: sel, key: 'menu-warp',
      scrollOwner: menu,
      label: entry => entry.name, meta: entry => `${entry.floor}F`, secondary: () => '記録済みの休息地', rowHeight: 40,
      onSelect: i => selectByTap(() => menu.sel, value => { menu.sel = value; }, i)(),
      emptyText: '移動できる場所がありません',
    });
    drawInfoShell(g, '目的地', 'TRAVEL');
    const entry = list.selected;
    if (entry) {
      UI.text(g, `${entry.floor}F`, 340, 147, COLORS.brassHi, 26);
      UI.textWrap(g, entry.name, 340, 183, 138, COLORS.ink, 13, 22, 4);
      UI.textWrap(g, '決定すると、この休息地へ移動します', 340, 286, 138, COLORS.muted, 10, 18, 3);
    }
    footer(g, towns.length ? '目的地を選んで決定 / 戻るで呪文一覧へ' : '訪れた休息地がここに記録されます', 'muted');
  }

  const originalDrawMenu = Game.drawMenu;
  Game.drawMenu = function drawMenuV7(g) {
    const menu = this.curMenu();
    if (!menu) return;
    modalVeil(g, .68);
    switch (menu.kind) {
      case 'main': drawMainMenu(g, this, menu); break;
      case 'pickMember':
      case 'pickTarget': drawMemberPicker(g, this, menu); break;
      case 'status': drawStatus(g, this, menu); break;
      case 'spells': drawSpells(g, this, menu); break;
      case 'items': drawItems(g, this, menu); break;
      case 'equipSlot': drawEquipSlot(g, this, menu); break;
      case 'equipPick': drawEquipPick(g, this, menu); break;
      case 'party': drawParty(g, this, menu); break;
      case 'warp': drawWarp(g, this, menu); break;
      default: originalDrawMenu.call(this, g); break;
    }
  };

  // battle.js や既存コードから呼ばれる場合にも、新しいカード表現を共有する。
  Game.drawPartyPanel = function drawPartyPanelV7(g, x, y) {
    const members = this.party.slice(0, 4);
    const width = 196, rowH = 58;
    UI.window(g, x, y, width, 28 + Math.max(1, members.length) * rowH);
    UI.text(g, 'PARTY', x + 13, y + 20, COLORS.cyan, 8);
    if (!members.length) UI.text(g, '仲間がいません', x + width / 2, y + 58, COLORS.muted, 11, 'center');
    members.forEach((p, i) => {
      const ry = y + 25 + i * rowH;
      drawMemberMedallion(g, p, x + 10, ry + 8, 38);
      UI.text(g, UI.fitText(g, p.name, 78, 12), x + 57, ry + 21, p.hp <= 0 ? COLORS.red : COLORS.ink, 12);
      UI.text(g, `Lv${p.level}`, x + width - 12, ry + 21, COLORS.muted, 9, 'right');
      UI.meter(g, x + 57, ry + 36, width - 70, p.hp, p.maxhp, p.hp <= 0 ? COLORS.red : COLORS.green, 'HP');
    });
  };

  // ---------- 会話 ----------
  const PORTRAIT_BY_SPEAKER = Object.freeze({
    'ソラ': 'hero', 'リノ': 'rino', 'ガルド': 'gald', 'フィオ': 'fio',
    'むらおさ': 'elder', 'みこ': 'celest', 'やどや': 'merchant',
    'ばんにん': 'guard', 'ちょうさたい': 'merchant',
  });

  function portraitFromLine(raw, explicitPortrait) {
    if (explicitPortrait) return explicitPortrait;
    const match = String(raw).match(/^([^「\n]{1,14})「/);
    return match ? (PORTRAIT_BY_SPEAKER[match[1]] || null) : null;
  }

  function makeDialogPages(game, sourceLines, explicitPortrait) {
    const pages = [];
    let inheritedSpeaker = null;
    let inheritedPortrait = explicitPortrait || null;
    const lines = Array.isArray(sourceLines) ? sourceLines : [sourceLines];
    for (const value of lines) {
      const raw = value === undefined || value === null ? '' : String(value);
      let speaker = null;
      let body = raw;
      const named = raw.match(/^([^「\n]{1,14})「([\s\S]*)$/);
      if (named) {
        speaker = named[1];
        body = named[2];
        inheritedSpeaker = speaker;
        inheritedPortrait = explicitPortrait || PORTRAIT_BY_SPEAKER[speaker] || portraitFromLine(raw, null);
      } else if (raw.startsWith('「') && inheritedSpeaker) {
        speaker = inheritedSpeaker;
        body = raw.slice(1);
      } else {
        inheritedSpeaker = null;
        if (!explicitPortrait) inheritedPortrait = null;
      }
      const portrait = explicitPortrait || portraitFromLine(raw, null) || (speaker ? inheritedPortrait : null);
      const maxWidth = portrait ? 348 : 448;
      const wrapped = UI.wrapLines(game.g, body, maxWidth, 16);
      const rows = wrapped.length ? wrapped : [''];
      for (let start = 0; start < rows.length; start += 3) {
        const chunk = rows.slice(start, start + 3);
        pages.push({
          text: chunk.join('\n'), rows: chunk, raw,
          speaker, portrait,
          continuation: start > 0,
        });
      }
    }
    return pages.length ? pages : [{ text: '', rows: [''], raw: '', speaker: null, portrait: explicitPortrait || null }];
  }

  Game.showDialog = function showDialogV7(lines, onDone, portrait = null) {
    this.prevState = this.state === 'dialog' ? this.prevState : this.state;
    this.state = 'dialog';
    const pages = makeDialogPages(this, lines, portrait);
    this.dialog = {
      lines: pages.map(page => page.text),
      pages,
      idx: 0,
      chars: 0,
      onDone,
      portrait,
      sourceLines: Array.isArray(lines) ? lines.slice() : [lines],
    };
  };

  function ensureDialogPages(game, dialog) {
    if (!dialog.pages) {
      dialog.pages = makeDialogPages(game, dialog.lines || [''], dialog.portrait || null);
      dialog.lines = dialog.pages.map(page => page.text);
    }
    return dialog.pages;
  }

  Game.updateDialog = function updateDialogV7(dt) {
    const dialog = this.dialog;
    if (!dialog) { this.state = 'field'; return; }
    const pages = ensureDialogPages(this, dialog);
    const page = pages[clamp(dialog.idx, 0, pages.length - 1)] || pages[0];
    const text = page.text || '';
    dialog.chars += dt * 42 * (Input.held('ok') ? 3 : 1);
    if (!Input.pressed('ok')) return;
    if (dialog.chars < text.length) {
      dialog.chars = text.length;
      return;
    }
    AudioSys.sfx('cursor');
    dialog.idx++;
    dialog.chars = 0;
    if (dialog.idx < pages.length) return;
    const done = dialog.onDone;
    this.dialog = null;
    this.state = 'field';
    if (typeof done === 'function') done();
  };

  const originalDialogPortrait = Game.dialogPortrait;
  Game.dialogPortrait = function dialogPortraitV7(line) {
    if (this.dialog && this.dialog.pages) {
      const page = this.dialog.pages[this.dialog.idx];
      if (page && page.portrait) return page.portrait;
    }
    return originalDialogPortrait.call(this, line);
  };

  Game.drawDialog = function drawDialogV7(g) {
    const dialog = this.dialog;
    if (!dialog) return;
    const pages = ensureDialogPages(this, dialog);
    const page = pages[clamp(dialog.idx, 0, pages.length - 1)] || pages[0];
    const complete = dialog.chars >= page.text.length;
    const shown = page.text.slice(0, Math.floor(dialog.chars));

    g.save();
    const fade = g.createLinearGradient(0, 274, 0, 448);
    fade.addColorStop(0, 'rgba(2,6,14,0)'); fade.addColorStop(1, 'rgba(1,4,10,.5)');
    g.fillStyle = fade; g.fillRect(0, 274, 512, 174);
    g.restore();
    UI.window(g, 12, 314, 488, 122);

    let textX = 29;
    let maxWidth = 448;
    let portraitDrawn = false;
    if (page.portrait) {
      const id = page.portrait;
      if (this.hdCharacters && this.hdCharacters[id]) this.loadAssetOnce(this.hdCharacters[id], `assets/${id}-v4.png`);
      roundedPath(g, 25, 329, 78, 91, 8);
      const portraitBg = g.createLinearGradient(25, 329, 25, 420);
      portraitBg.addColorStop(0, 'rgba(48,94,113,.45)'); portraitBg.addColorStop(1, 'rgba(5,17,30,.94)');
      g.fillStyle = portraitBg; g.fill();
      g.save(); roundedPath(g, 27, 331, 74, 87, 6); g.clip();
      const hd = this.hdCharacters && this.hdCharacters[id];
      if (hd && hd.complete && hd.naturalWidth) {
        const sourceH = Math.max(1, Math.floor(hd.naturalHeight * .58));
        g.drawImage(hd, 0, 0, hd.naturalWidth, sourceH, 22, 328, 84, 96);
        portraitDrawn = true;
      } else if (this.drawVillageNpcPortrait(g, id, 27, 331, 74, 87)) {
        portraitDrawn = true;
      } else {
        const sprite = Art.get(`${id}_0`) || Art.get(`${id}_d0`) || Art.get(id);
        if (sprite) { g.drawImage(sprite, 33, 343, 62, 62); portraitDrawn = true; }
      }
      if (!portraitDrawn) UI.text(g, page.speaker ? page.speaker.slice(0, 1) : '…', 64, 381, COLORS.cyanSoft, 26, 'center');
      g.restore();
      roundedPath(g, 25.5, 329.5, 77, 90, 8);
      g.lineWidth = .8; g.strokeStyle = 'rgba(199,164,91,.72)'; g.stroke();
      textX = 121;
      maxWidth = 350;
    }

    if (page.speaker) {
      const speaker = page.continuation ? `${page.speaker} · 続き` : page.speaker;
      const badgeW = clamp(UI.measure(g, speaker, 11) + 24, 66, 146);
      roundedPath(g, textX, 326, badgeW, 22, 6);
      g.fillStyle = 'rgba(31,86,104,.78)'; g.fill();
      g.lineWidth = .6; g.strokeStyle = 'rgba(103,217,227,.56)'; g.stroke();
      UI.text(g, speaker, textX + 12, 341, COLORS.brassHi, 11);
    }

    const baseY = page.speaker ? 367 : 351;
    const visibleRows = shown.split('\n');
    g.save();
    g.beginPath(); g.rect(textX, baseY - 18, maxWidth + 2, 73); g.clip();
    for (let i = 0; i < visibleRows.length && i < 3; i++) UI.text(g, visibleRows[i], textX, baseY + i * 23, COLORS.ink, 16);
    g.restore();

    UI.text(g, `${dialog.idx + 1} / ${pages.length}`, 475, 333, COLORS.faint, 8, 'right');
    if (complete) UI.cursor(g, 473, 415, 'down');
    UI.hitArea(12, 314, 488, 122, virtualOk);
  };

  // ---------- 選択肢 ----------
  Game.drawChoice = function drawChoiceV7(g) {
    const choice = this.choiceBox;
    if (!choice) return;
    modalVeil(g, .28);
    UI.window(g, 14, 284, 484, 152);
    UI.text(g, 'CHOICE', 30, 308, COLORS.cyan, 9);
    const rows = UI.wrapLines(g, choice.text, 448, 14).slice(0, 3);
    for (let i = 0; i < rows.length; i++) UI.text(g, rows[i], 30, 333 + i * 20, COLORS.ink, 14);
    const optionY = 386, optionW = 151;
    const options = ['はい', 'いいえ'];
    for (let i = 0; i < 2; i++) {
      const ox = 96 + i * 169;
      if (choice.sel === i) UI.selection(g, ox, optionY, optionW, 36, 'choice');
      UI.text(g, options[i], ox + optionW / 2, optionY + 24, choice.sel === i ? COLORS.ink : COLORS.muted, 14, 'center');
      UI.hitArea(ox, optionY, optionW, 36, selectByTap(() => choice.sel, value => { choice.sel = value; }, i));
    }
  };

  // ---------- 店 ----------
  function shopEntryName(entry) {
    if (!entry) return '';
    return entry.type === 'item' ? ITEMS[entry.id].name : entry.type === 'w' ? WEAPONS[entry.id].name : ARMORS[entry.id].name;
  }

  function drawShopDetail(g, game, entry, selling = false) {
    drawInfoShell(g, selling ? '売値と説明' : '品物の説明', 'DETAIL');
    if (!entry) return;
    UI.text(g, UI.fitText(g, entry.name || shopEntryName(entry), 140, 14), 340, 134, COLORS.ink, 14);
    UI.text(g, `${selling ? '売値' : '価格'}  ${entry.price} G`, 340, 160, COLORS.brassHi, 11);
    if (entry.type === 'item' || entry.kind === 'item') {
      const item = ITEMS[entry.id];
      UI.text(g, ITEM_KIND_LABELS[item.kind] || '道具', 340, 185, COLORS.cyanSoft, 10);
      UI.textWrap(g, item.desc, 340, 218, 138, COLORS.ink, 11, 19, 5);
      return;
    }
    const slot = entry.type || entry.slot;
    const def = slot === 'w' ? WEAPONS[entry.id] : ARMORS[entry.id];
    const bonus = slot === 'w' ? def.atk : def.def;
    UI.text(g, `${slot === 'w' ? '攻撃力' : '守備力'}  +${bonus}`, 340, 190, COLORS.cyanSoft, 12);
    const humans = game.party.filter(member => member.kind === 'human').slice(0, 4);
    UI.text(g, '装備したとき', 340, 225, COLORS.muted, 9);
    humans.forEach((member, i) => {
      const currentId = slot === 'w' ? member.weapon : member.armor;
      const current = currentId ? (slot === 'w' ? WEAPONS[currentId].atk : ARMORS[currentId].def) : 0;
      const delta = bonus - current;
      UI.text(g, UI.fitText(g, member.name, 70, 10), 340, 249 + i * 23, COLORS.ink, 10);
      UI.text(g, delta > 0 ? `+${delta}` : String(delta), 480, 249 + i * 23, delta > 0 ? COLORS.green : delta < 0 ? COLORS.red : COLORS.muted, 11, 'right');
    });
  }

  function drawShopTop(g, game, shop) {
    safeSelection(shop, 'topSel', 3);
    drawTopBar(g, shop.type === 'items' ? '道具屋' : '武具屋', locationName(game), game);
    UI.window(g, 12, 62, 180, 256);
    drawPanelHeading(g, 28, 82, 'ご用件', 'WELCOME');
    const options = ['買う', '売る', '店を出る'];
    for (let i = 0; i < options.length; i++) {
      const ry = 118 + i * 57;
      if (shop.topSel === i) UI.selection(g, 23, ry, 158, 44, 'shop-top');
      UI.text(g, options[i], 58, ry + 28, shop.topSel === i ? COLORS.ink : COLORS.muted, 15);
      if (shop.topSel === i) UI.cursor(g, 36, ry + 17, 'right');
      UI.hitArea(23, ry, 158, 44, selectByTap(() => shop.topSel, value => { shop.topSel = value; }, i));
    }
    UI.window(g, 200, 62, 300, 256);
    drawPanelHeading(g, 218, 82, shop.type === 'items' ? '旅の支度をどうぞ' : '塔で鍛えた品です', 'MERCHANT');
    UI.textWrap(g, shop.type === 'items'
      ? '回復の品や、探索を助ける道具を取りそろえています。'
      : '武器と鎧は、いまの装備と能力差を見比べられます。',
    218, 133, 258, COLORS.ink, 13, 23, 4);
    if (shop.disc) {
      roundedPath(g, 218, 230, 248, 45, 7); g.fillStyle = 'rgba(43,111,103,.24)'; g.fill();
      g.lineWidth = .7; g.strokeStyle = 'rgba(121,214,175,.58)'; g.stroke();
      UI.text(g, '商人の仲間割引  10% OFF', 342, 258, COLORS.green, 12, 'center');
    }
    footer(g, '用件を選んで決定 / 戻るでも店を出られます', 'muted');
  }

  function drawShopList(g, game, shop) {
    const buying = shop.mode === 'buy' || shop.mode === 'buyConfirm' || shop.mode === 'buyResult';
    const entries = buying ? shop.stock : game.sellList();
    const sel = safeSelection(shop, 'sel', entries.length);
    const interactive = shop.mode === 'buy' || shop.mode === 'sell';
    drawTopBar(g, buying ? '品物を買う' : '持ち物を売る', shop.disc && buying ? '仲間割引 適用中' : locationName(game), game);
    const list = drawListPanel(g, {
      title: buying ? '品ぞろえ' : '売れるもの', kicker: buying ? 'BUY' : 'SELL', items: entries, selection: sel,
      key: buying ? 'shop-buy' : 'shop-sell', rowHeight: 40, interactive,
      scrollOwner: shop,
      label: entry => entry.name || shopEntryName(entry),
      meta: entry => `${entry.price} G`,
      secondary: entry => entry.kind === 'item' || entry.type === 'item'
        ? `${entry.n && !buying ? `×${entry.n} / ` : ''}${ITEM_KIND_LABELS[ITEMS[entry.id].kind] || '道具'}`
        : (entry.type || entry.slot) === 'w' ? '武器' : '鎧',
      itemColor: entry => buying && game.gold < entry.price ? COLORS.red : COLORS.muted,
      onSelect: i => selectByTap(() => shop.sel, value => { shop.sel = value; }, i)(),
      emptyText: buying ? '品切れです' : '売れるものがありません',
      emptyTap: !buying ? virtualOk : null,
    });
    drawShopDetail(g, game, list.selected, !buying);
    const message = shop.msg || (buying ? '品物を選んで決定すると、購入確認へ進みます' : '売る品を選んで決定 / 戻るで用件へ');
    footer(g, message, shop.msg ? 'good' : 'muted');
  }

  function drawBuyConfirm(g, game, shop) {
    const entry = shop.pending;
    if (!entry) return;
    g.fillStyle = 'rgba(1,4,11,.58)'; g.fillRect(0, 0, 512, 448);
    UI.window(g, 70, 128, 372, 190);
    UI.text(g, 'PURCHASE', 88, 154, COLORS.cyan, 9);
    UI.text(g, UI.fitText(g, shopEntryName(entry), 320, 17), 256, 187, COLORS.ink, 17, 'center');
    UI.text(g, `${entry.price} G で買いますか？`, 256, 217, game.gold >= entry.price ? COLORS.brassHi : COLORS.red, 13, 'center');
    UI.text(g, `所持金  ${game.gold} G`, 256, 239, COLORS.muted, 10, 'center');
    const choices = ['はい', 'いいえ'];
    for (let i = 0; i < 2; i++) {
      const x = 102 + i * 158;
      if (shop.confirmSel === i) UI.selection(g, x, 259, 146, 40, 'shop-confirm');
      UI.text(g, choices[i], x + 73, 285, shop.confirmSel === i ? COLORS.ink : COLORS.muted, 14, 'center');
      UI.hitArea(x, 259, 146, 40, selectByTap(() => shop.confirmSel, value => { shop.confirmSel = value; }, i));
    }
  }

  function drawBuyResult(g, shop) {
    g.fillStyle = 'rgba(1,4,11,.52)'; g.fillRect(0, 0, 512, 448);
    UI.window(g, 64, 154, 384, 136);
    UI.text(g, 'MERCHANT', 82, 180, COLORS.cyan, 9);
    UI.textWrap(g, shop.msg || 'ありがとうございました', 82, 216, 348, COLORS.ink, 14, 23, 2);
    UI.text(g, '決定で品ぞろえへ', 430, 270, COLORS.muted, 9, 'right');
    UI.hitArea(64, 154, 384, 136, virtualOk);
  }

  Game.drawShop = function drawShopV7(g) {
    const shop = this.shop;
    if (!shop) return;
    modalVeil(g, .67);
    if (shop.mode === 'top') {
      drawShopTop(g, this, shop);
      return;
    }
    drawShopList(g, this, shop);
    if (shop.mode === 'buyConfirm') drawBuyConfirm(g, this, shop);
    else if (shop.mode === 'buyResult') drawBuyResult(g, shop);
  };

  // ---------- タイトル ----------
  const originalDrawTitle = Game.drawTitle;
  Game.drawTitle = function drawTitleV7(g) {
    originalDrawTitle.call(this, g);
    const options = this.hasSave() ? ['はじめから', 'つづきから'] : ['はじめから'];
    if (options.length === 1) this.titleSel = 0;
    else this.titleSel = clamp(this.titleSel, 0, options.length - 1);

    // 既存キービジュアルとロゴを生かし、下部の操作面だけを再構成する。
    const cover = g.createLinearGradient(0, 278, 0, 448);
    cover.addColorStop(0, 'rgba(2,7,17,0)'); cover.addColorStop(.32, 'rgba(2,7,17,.72)'); cover.addColorStop(1, 'rgba(1,4,11,.96)');
    g.fillStyle = cover; g.fillRect(0, 274, 512, 174);
    // 旧タイトルの操作ヒントを完全に隠し、新しい一行だけを残す。
    g.fillStyle = '#01040b'; g.fillRect(0, 417, 512, 31);
    UI.window(g, 154, 310, 204, 92 + Math.max(0, options.length - 1) * 38, { flat: true });
    UI.text(g, 'NEW / CONTINUE', 256, 334, COLORS.cyan, 8, 'center');
    for (let i = 0; i < options.length; i++) {
      const y = 344 + i * 38;
      if (this.titleSel === i) UI.selection(g, 167, y, 178, 34, 'title');
      UI.text(g, options[i], 256, y + 23, this.titleSel === i ? COLORS.ink : COLORS.muted, 14, 'center');
      UI.hitArea(167, y, 178, 34, selectByTap(() => this.titleSel, value => { this.titleSel = value; }, i));
    }
    UI.text(g, '決定  Z / Enter', 256, 432, COLORS.faint, 9, 'center');
  };
})();
