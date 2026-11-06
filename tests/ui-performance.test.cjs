const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const fontEvents = {};
const target = { addEventListener() {}, querySelectorAll() { return []; }, style: {}, classList: { toggle() {} } };
const sandbox = {
  console, performance: { now: () => 1000 }, window: target,
  document: { ...target, getElementById: () => null, documentElement: target,
    fonts: { addEventListener(name, fn) { fontEvents[name] = fn; } } },
  AudioSys: { sfx() {}, ensureCtx() {}, muted: false },
  Art: { get() { return null; } }, Image: function() { this.complete = false; this.naturalWidth = 0; },
  localStorage: { getItem: () => null },
};
const context = vm.createContext(sandbox);
for (const file of ['js/data.js', 'js/game.js', 'js/ui-v7.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
const { Game, UI, Chars, ITEMS } = vm.runInContext('({Game,UI,Chars,ITEMS})', context);
function canvas(scale = 1) {
  const saved = [];
  const g = {
    measurements: 0, font: '16px sans-serif', direction: 'ltr', letterSpacing: '0px',
    save() { saved.push(this.font); }, restore() { this.font = saved.pop(); },
    measureText(value) {
      this.measurements++;
      const size = parseFloat(this.font) || 16;
      const factor = this.font.includes('Alternate') ? 1.5 : 1;
      return { width: [...String(value)].reduce((sum, c) => sum + (c.charCodeAt(0) > 255 ? 1 : .5), 0)
        * size * scale * factor + parseFloat(this.letterSpacing) * String(value).length };
    },
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  };
  for (const name of ['beginPath','closePath','moveTo','lineTo','quadraticCurveTo','roundRect','arc','rect','clip',
    'fill','stroke','fillRect','strokeRect','translate','drawImage','setTransform','fillText']) g[name] = () => {};
  return g;
}
const g = canvas();
Game.g = g;
Game.party = ['hero','rino','gald','fio'].map(id => Chars.makeHuman(id, 12));
Game.reserve = []; Game.gold = 9999; Game.flags = {}; Game.floor = 1;
Game.map = { name: 'ねもとの むら', tier: 1, safe: true, town: true };
Game.bag = Object.keys(ITEMS).map(id => ({ id, n: 10 }));
Game.state = 'menu'; Game.menuStack = [{ kind: 'items', sel: 0 }];
UI.hitAreas = []; Game.drawMenu(g);
const firstFrame = g.measurements;
UI.hitAreas = []; Game.drawMenu(g);
const secondFrame = g.measurements - firstFrame;
console.log(`Inventory drawMenu measureText calls: first=${firstFrame}, second=${secondFrame}`);
if (process.argv.includes('--baseline')) process.exit(0);
assert.ok(firstFrame > 0, 'the first real menu draw measures text');
assert.equal(secondFrame, 0, 'unchanged menu reuses text measurements on its second draw');

UI.clearTextCache();
const a = canvas(), b = canvas(2);
assert.equal(UI.measure(a, 'same', 12), 24);
assert.equal(UI.measure(a, 'same', 12), 24);
assert.equal(a.measurements, 1, 'same context/font/size/text is measured once');
assert.equal(UI.measure(b, 'same', 12), 48, 'contexts never share cached metrics');
assert.equal(UI.measure(a, 'same', 24), 48, 'different font sizes have separate metrics');
const normalFont = UI.FONT;
UI.FONT = 'Alternate';
assert.equal(UI.measure(a, 'same', 12), 36, 'font family participates in the cache key');
UI.FONT = normalFont;
a.letterSpacing = '2px';
assert.equal(UI.measure(a, 'same', 12), 32, 'context text spacing participates in the cache key');

const sample = 'あいうえおかきくけこ';
const wide = UI.wrapLines(g, sample, 100, 16);
const narrow = UI.wrapLines(g, sample, 32, 16);
assert.ok(narrow.length > wide.length, 'different wrap widths never reuse an incompatible layout');
const expectedNarrow = [...narrow];
narrow[0] = 'mutated'; narrow.push('extra');
assert.deepEqual([...UI.wrapLines(g, sample, 32, 16)], expectedNarrow, 'caller mutations cannot corrupt the cached wrapped array');
assert.notEqual(UI.fitText(g, sample, 100, 16), UI.fitText(g, sample, 32, 16), 'fit width is part of its cache key');
assert.equal(UI.fitText(g, null, 100), '', 'empty values retain their existing behavior');
assert.deepEqual([...UI.wrapLines(g, 'a\n', 100)], ['a', ''], 'explicit trailing line breaks are preserved');

const beforeLoad = a.measurements;
fontEvents.loadingdone();
UI.measure(a, 'same', 12);
assert.equal(a.measurements, beforeLoad + 1, 'font loading completion invalidates every context');
const beforeError = a.measurements;
fontEvents.loadingerror();
UI.measure(a, 'same', 12);
assert.equal(a.measurements, beforeError + 1, 'font load failure invalidates fallback metrics');

UI.clearTextCache();
UI.measure(a, 'old-entry', 12);
for (let i = 0; i < 1100; i++) UI.measure(a, `entry-${i}`, 12);
const afterOverflow = a.measurements;
UI.measure(a, 'old-entry', 12);
assert.equal(a.measurements, afterOverflow + 1, 'per-context cache evicts old entries instead of growing without bound');
console.log('PASS UI text performance: reuse, context/font/size/width separation, font invalidation, safe arrays, bounded cache');
