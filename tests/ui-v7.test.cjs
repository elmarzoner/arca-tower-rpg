const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const events = {};
const eventTarget = () => ({
  addEventListener(type, fn) { (events[type] ||= []).push(fn); },
  querySelectorAll() { return []; },
  classList: { toggle() {}, add() {}, remove() {} },
  style: {},
});

const sandbox = {
  console,
  performance: { now: () => 1000 },
  window: Object.assign(eventTarget(), { innerWidth: 1280, innerHeight: 720 }),
  document: Object.assign(eventTarget(), {
    getElementById: () => null,
    documentElement: { classList: { toggle() {} } },
  }),
  AudioSys: { sfx() {}, ensureCtx() {}, muted: false, nowPlaying: '', playMusic() {}, setMuted() {} },
  Art: { get() { return null; }, T: { CHEST: 1 } },
  CharGen: { install() {} },
  Image: function ImageMock() {
    this.src = '';
    this.complete = false;
    this.naturalWidth = 0;
    this.naturalHeight = 0;
    this.addEventListener = () => {};
  },
  location: { search: '' },
  URLSearchParams,
  requestAnimationFrame() {},
  setTimeout,
  matchMedia: () => ({ matches: false }),
  localStorage: { getItem() { return null; }, setItem() {} },
};
const context = vm.createContext(sandbox);

function run(file) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}

run('js/data.js');
run('js/game.js');

function gradient() { return { addColorStop() {} }; }
function canvasContext() {
  const calls = [];
  return {
    calls,
    save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
    quadraticCurveTo() {}, roundRect() {}, arc() {}, rect() {}, clip() {}, fill() {}, stroke() {},
    fillRect() {}, strokeRect() {}, translate() {}, drawImage() {}, setTransform() {},
    createLinearGradient: gradient, createRadialGradient: gradient,
    measureText(value) {
      let width = 0;
      for (const ch of String(value)) width += ch.charCodeAt(0) > 255 ? 14 : 7;
      return { width };
    },
    fillText(text, x, y) { calls.push({ text: String(text), x, y }); },
    font: '', fillStyle: '', strokeStyle: '', lineWidth: 1, textAlign: 'left',
    textBaseline: 'alphabetic', shadowColor: '', shadowBlur: 0, shadowOffsetY: 0, globalAlpha: 1,
  };
}

const g = canvasContext();
sandbox.__g = g;
vm.runInContext(`
  Game.drawField = function() {};
  Game.drawTitle = function() {};
  Game.hasSave = function() { return false; };
  Game.g = globalThis.__g;
`, context);
run('js/ui-v7.js');

const { Game, UI, Input, Chars, ITEMS } = vm.runInContext('({Game,UI,Input,Chars,ITEMS})', context);
const human = id => Chars.makeHuman(id, 12);

Game.party = [human('hero'), human('rino'), human('gald'), human('fio')];
Game.reserve = [];
Game.gold = 9999;
Game.flags = {};
Game.floor = 1;
Game.map = { name: 'ねもとの むら', tier: 1, safe: true, town: true };

Game.menuStack = [{ kind: 'main', sel: 0 }];
Game.state = 'menu';
UI.hitAreas = [];
Game.drawMenu(g);
assert.equal(UI.hitAreas.length, 7, 'main menu exposes seven visible rows');
for (const area of UI.hitAreas) {
  assert.deepEqual(Object.keys(area), ['x', 'y', 'w', 'h', 'onTap'], 'hit area has the shared API shape');
}
UI.hitAreas[1].onTap();
assert.equal(Game.curMenu().sel, 1, 'first tap selects a different row');
UI.hitAreas[1].onTap();
assert.equal(Input.pressed('ok'), true, 'second tap on the selected row confirms');

const itemIds = Object.keys(ITEMS);
Game.bag = Array.from({ length: 25 }, (_, i) => ({ id: itemIds[i % itemIds.length], n: i + 1 }));
Game.menuStack = [{ kind: 'items', sel: 24 }];
UI.hitAreas = [];
g.calls.length = 0;
Game.drawMenu(g);
assert.ok(UI.hitAreas.length >= 6 && UI.hitAreas.length <= 7, 'inventory only exposes viewport rows');
assert.ok(g.calls.every(call => call.y <= 448), 'inventory text stays inside the logical canvas');

Game.equipBag = Array.from({ length: 28 }, (_, i) => ({
  slot: 'w', id: ['stick', 'club', 'copper', 'spear'][i % 4],
}));
Game.menuStack = [{ kind: 'equipPick', member: Game.party[0], slot: 'w', sel: 28 }];
UI.hitAreas = [];
Game.drawMenu(g);
assert.ok(UI.hitAreas.length <= 7, 'equipment candidates are viewport bounded');

Game.party = [human('hero'), human('rino'), human('gald'), human('fio')];
Game.reserve = Array.from({ length: 16 }, (_, i) => Object.assign(human(i % 2 ? 'rino' : 'gald'), { name: `控え${i}` }));
Game.menuStack = [{ kind: 'party', sel: 19, picked: -1 }];
UI.hitAreas = [];
Game.drawMenu(g);
assert.ok(UI.hitAreas.length <= 7, 'twenty-member roster is viewport bounded');

Game.party = [human('hero')];
Game.reserve = [];
Game.bag = [];
Game.equipBag = [];
Game.floor = 1;
Game.map = { name: '村', tier: 1, safe: true };
Game.gold = 100;
Game.openShop('items');
Game.shop.mode = 'buy';
Game.shop.sel = 0;
UI.hitAreas = [];
Game.drawShop(g);
const goldBeforePurchase = Game.gold;
UI.hitAreas[0].onTap();
Game.updateShop();
assert.equal(Game.shop.mode, 'buyConfirm', 'buy row enters the existing confirmation state');
assert.equal(Game.gold, goldBeforePurchase, 'selecting a buy row cannot spend money');

UI.hitAreas = [];
Game.drawShop(g);
const confirmAreas = UI.hitAreas.filter(area => area.y === 259);
assert.equal(confirmAreas.length, 2, 'purchase confirmation exposes yes and no');
confirmAreas[0].onTap();
Game.updateShop();
assert.equal(Game.shop.mode, 'buyResult');
assert.ok(Game.gold < goldBeforePurchase, 'money changes only after confirming the purchase');

let completed = 0;
const longLine = `むらおさ「${'これは とてもながい たいせつな はなしです。'.repeat(18)}」`;
Game.showDialog([longLine], () => completed++, 'elder');
assert.ok(Game.dialog.pages.length > 1, 'long dialogue becomes multiple pages');
for (const page of Game.dialog.pages) {
  assert.ok(page.rows.length <= 3, 'a dialogue page has at most three rows');
  for (const row of page.rows) assert.ok(UI.measure(g, row, 16) <= 348, 'portrait dialogue uses measured width');
}
const pageCount = Game.dialog.pages.length;
for (let i = 0; i < pageCount; i++) {
  Game.dialog.chars = 1e6;
  Input.pulse('ok');
  Game.updateDialog(0);
}
assert.equal(completed, 1, 'dialogue completion callback runs once');
assert.equal(Game.dialog, null);
assert.equal(Game.state, 'field');

Game.showDialog(['一つ目'], () => Game.showDialog(['二つ目'], () => completed++));
Game.dialog.chars = 99;
Input.pulse('ok');
Game.updateDialog(0);
assert.equal(Game.state, 'dialog', 'completion callback may open another dialogue');
assert.equal(Game.dialog.pages[0].text, '二つ目', 'chained dialogue is not overwritten');

Game.choiceBox = { text: '進みますか?', sel: 0 };
Game.state = 'choice';
UI.hitAreas = [];
Game.drawChoice(g);
assert.equal(UI.hitAreas.length, 2, 'choice exposes its two options');

Game.state = 'title';
UI.hitAreas = [];
Game.drawTitle(g);
assert.equal(UI.hitAreas.length, 1, 'new game only title exposes one option');

console.log('PASS ui-v7: bounded lists, taps, purchase gate, dialogue pagination/callbacks, choice and title');
