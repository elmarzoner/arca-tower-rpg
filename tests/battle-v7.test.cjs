const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const battleSource = fs.readFileSync(path.join(root, 'js/battle.js'), 'utf8');
const hitAreas = [];
const pulses = [];

const MONSTERS = {
  slime: { name: 'Slime', spr: 'm_slime', hp: 20, atk: 8, def: 2, agi: 4, exp: 2, gold: 1, tame: .1, acts: ['attack'] },
  bat: { name: 'Bat', spr: 'm_bat', hp: 18, atk: 8, def: 2, agi: 7, exp: 2, gold: 1, tame: .1, acts: ['attack'] },
  rat: { name: 'Rat', spr: 'm_rat', hp: 22, atk: 8, def: 2, agi: 5, exp: 2, gold: 1, tame: .1, acts: ['attack'] },
};

function member(id = 'hero', name = 'Hero') {
  return {
    id, kind: 'human', name, hp: 50, maxhp: 50, mp: 20, maxmp: 20,
    atk: 100, def: 10, agi: 10, spells: [], level: 1, exp: 0, poison: false,
  };
}

const hero = member();
const deterministicMath = Object.create(Math);
deterministicMath.random = () => .99;
const sandbox = {
  console,
  setTimeout,
  performance: { now: () => 1000 },
  Math: deterministicMath,
  Image: class {
    constructor() { this.complete = false; this.naturalWidth = 0; this.naturalHeight = 0; }
    addEventListener() {}
  },
  MONSTERS,
  HUMANS: { hero: { spr: 'hero' }, rino: { spr: 'rino' }, gald: { spr: 'gald' }, fio: { spr: 'fio' } },
  ITEMS: {},
  SPELLS: {},
  MON_NICKNAMES: {},
  Game: {
    party: [hero], bag: [], map: { tier: 1 }, reducedMotion: false,
    gold: 0, flags: {}, reserve: [], maxRoster: 20,
    battleBackgroundsV5: {}, battleArt: { complete: false }, battleSpritesV5: {},
    partyBattleV5: { complete: false }, monsterAtlas: { complete: false },
    loadAssetOnce: () => null, removeItem() {}, rosterCount: () => 1,
    hasMonsterAlly: () => false, recruitLevel: () => 1, save() {},
  },
  AudioSys: { playMusic() {}, sfx() {}, stopMusic() {} },
  Art: { TIER_THEMES: { 1: { bg: '#102030' } }, get: () => null, drawBattleBackdrop() {} },
  Chars: {
    attackOf: m => m.atk, defenseOf: m => m.def, agiOf: m => m.agi,
    expTable: () => 9999, applyLevelUp() {}, makeMonster() {},
  },
  Input: { pressed: () => false, held: () => false, pulse: key => pulses.push(key) },
  UI: {
    FONT: 'monospace', window() {}, text() {}, textWrap() {}, cursor() {},
    measure: (g, value, size = 16) => String(value).length * size * .6,
    hitArea: (x, y, w, h, onTap) => hitAreas.push({ x, y, w, h, onTap }),
  },
};

const context = vm.createContext(sandbox);
vm.runInContext(`${battleSource}\nthis.Battle = Battle;`, context);
const Battle = context.Battle;

Battle.start({ enemySpecs: ['slime', 'bat', 'rat'], boss: false, onEnd() {} });
assert.deepEqual(Array.from(Battle.enemies, enemy => enemy.visualX), [138, 256, 374], 'initial formation is centered');
assert.equal(Battle.enemyFloats(Battle.enemies[0]), false, 'ground enemy is fixed to its ground line');
assert.equal(Battle.enemyFloats(Battle.enemies[1]), true, 'obvious flyer retains a small hover');

const middle = Battle.enemies[1];
assert.equal(Battle.defeatEnemy(middle), true, 'first defeat changes gameplay state');
assert.equal(Battle.defeatEnemy(middle), false, 'duplicate defeat cannot duplicate rewards');
const oldLeftX = Battle.enemies[0].visualX;
const oldRightX = Battle.enemies[2].visualX;
Battle.update(.05);
assert.ok(Battle.enemies[0].visualX > oldLeftX && Battle.enemies[0].visualX < 197, 'left survivor eases toward its new slot');
assert.ok(Battle.enemies[2].visualX < oldRightX && Battle.enemies[2].visualX > 315, 'right survivor eases toward its new slot');
assert.equal(middle.visualX, 256, 'dying enemy stays in its old slot during its fade');
assert.ok(middle.deathT > 0 && middle.deathT < middle.deathDuration, 'death fade remains briefly renderable');

const left = Battle.enemies[0];
left.hp = 5;
const oldDisplayHp = left.displayHp;
Battle.update(.05);
assert.ok(left.displayHp < oldDisplayHp && left.displayHp > left.hp, 'HP display interpolates without changing actual HP');
context.Game.reducedMotion = true;
Battle.update(.05);
assert.equal(left.visualX, 197, 'reduced motion snaps formation to its final slot');
assert.equal(left.displayHp, left.hp, 'reduced motion also snaps informational HP');
context.Game.reducedMotion = false;

const longMenu = { kind: 'spell', sel: 12, scroll: 0, list: Array.from({ length: 13 }, (_, i) => i) };
assert.equal(Battle.keepMenuSelectionVisible(longMenu), 9, 'long list scrolls to its four-row last page');
longMenu.sel = 0;
assert.equal(Battle.keepMenuSelectionVisible(longMenu), 0, 'wrapped selection scrolls back to the first page');

const tapMenu = { sel: 0, list: [1, 2, 3] };
Battle.tapSelection(tapMenu, 0);
assert.equal(pulses.length, 0, 'first tap only selects, even when it is the default row');
Battle.tapSelection(tapMenu, 0);
assert.deepEqual(pulses, ['ok'], 'second tap of the same row confirms through Input.pulse');

// The visual death state must not delay combat logic or allow a second kill.
Battle.start({ enemySpecs: ['slime'], boss: false, onEnd() {} });
Battle.queue = [];
Battle.execMemberAction({ member: hero, cmd: 'attack', target: Battle.enemies[0] });
assert.ok(Battle.queue.length >= 2, 'attack keeps the existing announcement/damage queue');
Battle.queue[0].fn();
assert.ok(Battle.partyMotion[0].attackT > 0, 'announcement starts the attacker lunge');
Battle.queue[1].fn();
assert.equal(Battle.enemies[0].dead, true, 'lethal damage is immediately dead to turn logic');
assert.equal(Battle.enemies[0].hp, 0, 'lethal HP is clamped for display and rules');
assert.ok(Battle.enemies[0].recoilT > 0 && Battle.enemies[0].deathT === 0, 'hit recoil hands off to death fade');

const gradient = { addColorStop() {} };
const canvas = new Proxy({
  createLinearGradient: () => gradient,
  measureText: value => ({ width: String(value).length * 8 }),
}, {
  get(target, key) { return key in target ? target[key] : () => {}; },
  set(target, key, value) { target[key] = value; return true; },
});

Battle.start({ enemySpecs: ['slime'], boss: false, onEnd() {} });
Battle.queue = [];
Battle.phase = 'command';
Battle.memberIdx = 0;
Battle.menu = { kind: 'cmd', sel: 0 };
Battle.visualTime = 1;
hitAreas.length = 0;
Battle.draw(canvas);
assert.equal(hitAreas.filter(area => area.y === 336).length, 5, 'all five commands expose tap regions');
assert.ok(hitAreas.filter(area => area.y === 336).every(area => area.y >= 300), 'command regions stay below the enemy ground line');

for (let i = 0; i < 13; i++) context.SPELLS[`s${i}`] = { name: `S${i}`, mp: i, desc: 'desc', kind: 'atk', target: 'enemy' };
Battle.menu = { kind: 'spell', sel: 12, scroll: 0, list: Object.keys(context.SPELLS) };
hitAreas.length = 0;
Battle.draw(canvas);
assert.equal(Battle.menu.scroll, 9, 'drawing a long spell list keeps the selected row visible');
const spellRows = hitAreas.filter(area => area.x === 15);
assert.equal(spellRows.length, 4, 'only four readable spell rows receive tap regions');
assert.ok(spellRows.every(area => area.h === 32 && area.y >= 306 && area.y + area.h <= 434), 'all spell rows offer 32px touch height inside the panel');
assert.ok(spellRows.every((area, i) => i === 0 || spellRows[i - 1].y + spellRows[i - 1].h <= area.y), 'adjacent spell touch regions do not overlap');
context.Input.pressed = key => key === 'down';
Battle.handleInput();
assert.equal(Battle.menu.sel, 0, 'keyboard wrap returns to first entry');
assert.equal(Battle.menu.scroll, 0, 'keyboard uses the same four-row capacity as rendering');
context.Input.pressed = () => false;

context.ITEMS.herb = { name: 'Herb', kind: 'heal', desc: 'Healing herb' };
Battle.menu = { kind: 'item', sel: 7, scroll: 0, list: Array.from({length:8}, () => ({id:'herb',n:1})) };
hitAreas.length = 0;
Battle.draw(canvas);
assert.equal(Battle.menu.scroll, 4, 'item list uses the same page size');
const itemRows = hitAreas.filter(area => area.x === 15);
assert.equal(itemRows.length, 4);
itemRows[0].onTap();
assert.equal(Battle.menu.sel, 4, 'touch chooses the visible absolute row index');
assert.equal(Battle.menu.scroll, 4, 'touch keeps the same four-row viewport');

Battle.start({ enemySpecs: ['slime', 'bat', 'rat'], boss: false, onEnd() {} });
Battle.queue = [];
Battle.phase = 'command';
Battle.menu = { kind: 'targetE', sel: 1, onPick() {}, back: null };
Battle.visualTime = 1;
hitAreas.length = 0;
Battle.draw(canvas);
assert.ok(hitAreas.length >= 6, 'enemy sprites and lower target choices are both tappable');

context.Game.party = [member('hero', 'Hero'), member('rino', 'Rino'), member('gald', 'Gald'), member('fio', 'Fio')];
Battle.start({ enemySpecs: ['slime'], boss: false, onEnd() {} });
Battle.queue = [];
Battle.phase = 'command';
Battle.menu = { kind: 'targetA', sel: 3, list: context.Game.party, onPick() {}, back: null };
Battle.visualTime = 1;
hitAreas.length = 0;
Battle.draw(canvas);
assert.equal(hitAreas.length, 8, 'all four status cards and four lower ally choices are tappable');

Battle.choice = { text: 'Question', sel: 0, yes() {}, no() {} };
Battle.menu = null;
hitAreas.length = 0;
Battle.draw(canvas);
assert.equal(hitAreas.length, 2, 'yes/no choice exposes exactly two tap regions');

// Simultaneous pointer/keyboard pulses must resolve a prompt only once.
let accepted = 0, declined = 0;
Battle.choice = { sel: 0, yes() { accepted++; }, no() { declined++; } };
context.Input.pressed = key => key === 'ok' || key === 'cancel';
assert.doesNotThrow(() => Battle.handleInput(), 'confirm+back cannot dereference a cleared prompt');
assert.equal(accepted, 1);
assert.equal(declined, 0, 'one frame cannot both accept and decline');
for (const kind of ['targetE', 'targetA']) {
  const nextMenu = {kind:'cmd',sel:0};
  const previousMenu = {kind:'cmd',sel:1};
  Battle.menu = {kind,sel:0,list:context.Game.party,back:previousMenu,onPick(){Battle.menu=nextMenu;}};
  Battle.handleInput();
  assert.equal(Battle.menu,nextMenu,'confirm+back cannot restore the stale target selection');
}
context.Input.pressed = () => false;

const effectCalls = [];
const effectCanvas = new Proxy({
  arc: (...args) => effectCalls.push(['arc', ...args]),
  fillText: (...args) => effectCalls.push(['text', ...args]),
}, { get(target,key){return key in target ? target[key] : () => {};}, set(target,key,value){target[key]=value;return true;} });
Battle.fx = [{kind:'fire',target:{enemy:Battle.enemies[0]},t:.3,duration:.6,seed:0}];
context.Game.reducedMotion=false;
Battle.drawEffects(effectCanvas,0,0);
assert.equal(effectCalls.filter(call=>call[0]==='arc').length,12,'normal magic retains full particles');
effectCalls.length=0;
context.Game.reducedMotion=true;
Battle.drawEffects(effectCanvas,0,0);
assert.equal(effectCalls.filter(call=>call[0]==='arc').length,4,'reduced motion uses fewer, quieter particles');
for (const stamp of [.1,.4,.8]) {
  effectCalls.length=0;
  Battle.fx=[{kind:'popup',target:{party:context.Game.party[0]},t:stamp,duration:.86,seed:0,value:20,tone:'critical',label:'CRITICAL'}];
  context.Game.reducedMotion=false;
  Battle.drawEffects(effectCanvas,0,0);
  assert.ok(effectCalls.filter(call=>call[0]==='text').every(call=>call[3]>=9),'damage value and critical label remain inside the screen');
}
context.Game.reducedMotion=false;

// Use the real engine input queue: unlike a boolean stub, unconsumed virtual
// pulses survive endFrame() and can otherwise undo a choice one frame later.
const gameSource = fs.readFileSync(path.join(root, 'js/game.js'), 'utf8');
const realInputSource = gameSource.slice(0, gameSource.indexOf('// ---------------- UI 描画'));
assert.ok(realInputSource.includes('const Input ='), 'load the actual engine input implementation');
const pulseGame = {...sandbox.Game, party:[member(),member('rino','Rino')]};
const pulseContext = vm.createContext({...sandbox, Game:pulseGame,
  window:{addEventListener(){}}, document:{getElementById(){return null;}},
});
vm.runInContext(realInputSource + '\n' + battleSource, pulseContext);
const actual = vm.runInContext('({Input,Battle})', pulseContext);
const simultaneous = () => {actual.Input.pulse('ok');actual.Input.pulse('cancel');};
const secondFrame = () => {actual.Input.endFrame();actual.Battle.handleInput();actual.Input.endFrame();};
for (const kind of ['targetE','targetA']) {
  actual.Input.clear();
  actual.Battle.start({enemySpecs:['slime','bat'],boss:false,onEnd(){}});
  actual.Battle.queue=[]; actual.Battle.phase='command';
  actual.Battle.menu={kind,sel:0,list:pulseGame.party,back:{kind:'cmd',sel:0},onPick(target){
    actual.Battle.commitAction({member:pulseGame.party[0],cmd:kind==='targetE'?'attack':'spell',target});
  }};
  simultaneous(); actual.Battle.handleInput();
  assert.equal(actual.Battle.memberIdx,1,`${kind}: first frame advances to the second member`);
  assert.equal(actual.Battle.actions.length,1);
  secondFrame();
  assert.equal(actual.Battle.memberIdx,1,`${kind}: cancel cannot leak into the next frame`);
  assert.equal(actual.Battle.actions.length,1,`${kind}: confirmed action stays queued`);
}
actual.Input.clear();
let chainedDeclines=0;
const chainedChoice={sel:0,yes(){},no(){chainedDeclines++;}};
actual.Battle.choice={sel:0,yes(){actual.Battle.choice=chainedChoice;},no(){throw new Error('wrong choice');}};
simultaneous(); actual.Battle.handleInput(); secondFrame();
assert.equal(actual.Battle.choice,chainedChoice,'choice confirm does not leak cancel into a chained prompt');
assert.equal(chainedDeclines,0);

actual.Input.clear(); actual.Battle.choice=null;
actual.Battle.memberIdx=1; actual.Battle.actions=[{member:pulseGame.party[0],cmd:'defend'}];
actual.Battle.menu={kind:'cmd',sel:0};
simultaneous(); actual.Battle.handleInput();
const cancelledMenu=actual.Battle.menu;
assert.equal(actual.Battle.memberIdx,0,'command cancel keeps its established priority');
assert.equal(actual.Battle.actions.length,0);
secondFrame();
assert.equal(actual.Battle.menu,cancelledMenu,'unused confirm cannot open a target menu on the following frame');

actual.Input.clear(); actual.Battle.queue=[{text:'Combat message'}];
actual.Input.pulse('ok'); actual.Battle.handleInput();
assert.equal(actual.Input.pressed('ok'),true,'message queue still receives confirmation in Battle.update');

assert.doesNotMatch(battleSource, /fillRect\(x, y, drawW, drawH\)/, 'sprite hit feedback no longer uses a rectangular white flash');
console.log('PASS battle v7: formation, HP, motion preference, kill flow, scrolling, 1+1 tap, targets, four-party status');
