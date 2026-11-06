const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function target() {
  const classes = new Set();
  return { events: {}, style: {}, dataset: {}, open: false,
    classList: { toggle(key,on) { if(on) classes.add(key); else classes.delete(key); }, add(key) { classes.add(key); }, remove(key) { classes.delete(key); }, contains: key=>classes.has(key) },
    addEventListener(type, fn) { (this.events[type] ||= []).push(fn); },
    emit(type, values = {}) { for (const fn of this.events[type] || []) fn({preventDefault() {}, ...values}); },
    setAttribute() {}, setPointerCapture() {},
    getBoundingClientRect() { return {left:10, top:20, width:1024, height:896}; },
    showModal() { this.open = true; }, close() { this.open = false; this.emit('close'); },
  };
}
const clock = { now: 1000 };
const win = Object.assign(target(), {innerWidth:1280, innerHeight:720});
const elements = Object.fromEntries(['help-panel','screen','scene-label','control-help','mobile-note','help-button','help-close','gentle-motion','ok','cancel'].map(id => [id,target()]));
const doc = Object.assign(target(), {hidden:false,
  documentElement: Object.assign(target(), {style:{setProperty() {}}}),
  getElementById: id => elements[id] || null,
  querySelector: selector => elements[selector.includes('cancel') ? 'cancel':'ok'],
  querySelectorAll: () => [],
});
let coarsePointer = false;
const sandbox = { console, window:win, document:doc, performance:{now:()=>clock.now},
  AudioSys:{ensureCtx() {}}, localStorage:{getItem:()=>null,setItem() {}},
  matchMedia:query=>({matches:coarsePointer && query.includes('pointer: coarse')}), setTimeout:fn=>fn(),
};
const context = vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'js/game.js'),'utf8'),context);
const {Input,Game,UI} = vm.runInContext('({Input,Game,UI})',context);
Game.state='menu';
Input.beginFrame('menu',true);
win.emit('keydown',{key:'ArrowDown'});
assert.equal(Input.pressed('down'),true,'initial keyboard press');
Input.endFrame();
clock.now+=359; Input.beginFrame('menu',true);
assert.equal(Input.pressed('down'),false,'no early repeat');
clock.now++; Input.beginFrame('menu',true);
assert.equal(Input.pressed('down'),true,'repeat starts at 360 ms');
clock.now+=120; Input.beginFrame('menu',true);
assert.equal(Input.pressed('down'),true,'repeat continues at 120 ms');
win.emit('keyup',{key:'ArrowDown'});
clock.now+=200; Input.beginFrame('menu',true);
assert.equal(Input.pressed('down'),false,'release stops repeat');

Input.virtualDown('ok'); Input.virtualUp('ok');
assert.equal(Input.pressed('ok'),true,'tap shorter than one frame survives release');
assert.equal(Input.pressed('ok'),false,'virtual press consumed once');
Input.virtualDown('up'); Input.beginFrame('child-menu',true);
assert.equal(Input.pressed('up'),false,'held direction does not leak to child menu');
clock.now+=500; Input.beginFrame('child-menu',true);
assert.equal(Input.pressed('up'),false,'stale repeat is cancelled on context switch');
Input.clear(); Input.pulse('ok'); clock.now+=181;
assert.equal(Input.pressed('ok'),false,'old direct tap expires');

elements['help-panel'].open=true;
let defaultBlocked=false;
win.emit('keydown',{key:'Escape',preventDefault(){defaultBlocked=true;}});
assert.equal(defaultBlocked,false,'native guide receives Escape');
assert.equal(Input.held('cancel'),false,'guide key does not reach game');
elements['help-panel'].open=false;
win.emit('keydown',{key:'ArrowRight'}); win.emit('blur');
assert.equal(Input.held('right'),false,'blur clears held movement');

let updates=0, draws=0, selected=0;
Game.canvas=elements.screen; Game.map={name:'Test map',npcs:[],chests:[]};
Game.floor=1; Game.fadeDir=0; Game.fade=0; Game.menuStack=[{kind:'main',sel:0}];
Game.init=function() {};
Game.update=function(){ updates++; };
Game.draw=function(){ draws++; UI.hitAreas.push({x:20,y:30,w:80,h:40,onTap:()=>selected++}); };
sandbox.Battle={queue:[],phase:'command',menu:{}};
vm.runInContext(fs.readFileSync(path.join(root,'js/controls-v7.js'),'utf8'),context);
Game.init(); Game.draw();
assert.equal(elements.screen.style.width,'704px','desktop stage fits chrome');
assert.equal(elements.screen.style.height,'616px');
Game.update(1/60); assert.equal(updates,1);
elements['help-panel'].open=true; Game.update(1/60);
assert.equal(updates,1,'guide pauses gameplay');
elements['help-panel'].open=false; doc.hidden=true; Game.update(1/60);
assert.equal(updates,1,'hidden page pauses gameplay'); doc.hidden=false;
Game.draw(); assert.equal(UI.hitAreas.length,1,'tap regions reset every draw');
function tap() {
  clock.now+=200;
  elements.screen.emit('pointerdown',{pointerId:1,button:0,clientX:90,clientY:100});
  elements.screen.emit('pointerup',{pointerId:1,button:0,clientX:90,clientY:100});
}
tap(); assert.equal(selected,1,'screen coordinates map to logical hit regions');
Game.fadeDir=1; tap(); assert.equal(selected,1,'transition blocks stale hit');
Game.fadeDir=0;
Game.menuStack.push({kind:'items',sel:0});
tap(); assert.equal(selected,1,'old menu regions cannot activate new menu');
Game.draw(); tap(); assert.equal(selected,2,'fresh menu is interactive');
clock.now+=200;
elements.screen.emit('pointerdown',{pointerId:2,button:0,clientX:90,clientY:100});
elements.screen.emit('pointerup',{pointerId:2,button:0,clientX:90,clientY:170});
assert.equal(Input.pressed('down'),true,'vertical swipe moves menu selection');
assert.equal(selected,2,'swipe is not also a tap');
// An interrupted pointer must not block the next tap, nor activate after returning.
elements.screen.emit('pointerdown',{pointerId:3,button:0,clientX:90,clientY:100});
elements.screen.emit('lostpointercapture',{pointerId:3});
tap(); assert.equal(selected,3,'lost capture releases the active gesture');
elements.screen.emit('pointerdown',{pointerId:4,button:0,clientX:90,clientY:100});
doc.hidden=true; doc.emit('visibilitychange'); doc.hidden=false;
clock.now+=200;
elements.screen.emit('pointerup',{pointerId:4,button:0,clientX:90,clientY:100});
assert.equal(selected,3,'returning from a hidden tab does not finish an old tap');
tap(); assert.equal(selected,4,'fresh tap after visibility change works');
win.innerWidth=390; win.innerHeight=844; win.emit('resize');
assert.equal(elements.screen.style.width,'374px','portrait fits within device width');
assert.ok(parseFloat(elements.screen.style.height)+248<=844,'portrait reserves controls');
win.innerWidth=844; win.innerHeight=390; win.emit('resize');
assert.ok(parseFloat(elements.screen.style.width)+144<=844,'landscape reserves side controls');
assert.ok(parseFloat(elements.screen.style.height)+22<=390,'landscape fits viewport');
assert.equal(doc.documentElement.classList.contains('landscape-game'),true);
coarsePointer=true; win.innerWidth=1024; win.innerHeight=768; win.emit('resize');
assert.equal(doc.documentElement.classList.contains('landscape-game'),true,'tall touch tablets use the same side-control layout as short landscape phones');
assert.equal(doc.documentElement.classList.contains('portrait-game'),false);
const css=fs.readFileSync(path.join(root,'css/presentation-v7.css'),'utf8');
assert.match(css,/\.landscape-game #wrap\{padding:11px 72px\}/,'CSS padding matches the touch landscape sizing calculation at every height');
coarsePointer=false; win.emit('resize');
assert.equal(doc.documentElement.classList.contains('landscape-game'),false,'desktop restores normal chrome');
console.log('PASS presentation controls: keyboard repeat, fast tap, context isolation, native guide, pause, hit testing, swipe, responsive sizes');
