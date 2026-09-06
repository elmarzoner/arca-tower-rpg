const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function createRuntime() {
  let now = 0;
  const listeners = {};
  const document = {
    getElementById() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    documentElement: { classList: { toggle() {} } },
  };
  const sandbox = {
    console,
    document,
    window: {
      addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
      innerWidth: 1000,
      innerHeight: 800,
    },
    performance: { now: () => now },
    requestAnimationFrame() {},
    matchMedia() { return { matches: false }; },
    setTimeout() {},
    clearTimeout() {},
    location: { search: '' },
    URLSearchParams,
    Image: class {},
    localStorage: { getItem() { return null; }, setItem() {} },
    AudioSys: {
      ensureCtx() {}, sfx() {}, playMusic() {}, stopMusic() {}, muted: false,
    },
    Art: { T: {}, get() {}, TILE_SIZE: 16 },
    Maps: {
      walkable(map, x, y) {
        return x >= 0 && y >= 0 && x < map.w && y < map.h
          && !(map.blocked || new Set()).has(`${x},${y}`);
      },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(
    `${fs.readFileSync(path.join(root, 'js/game.js'), 'utf8')}\nthis.TestGame=Game;this.TestInput=Input;`,
    sandbox,
    { filename: 'game-movement.vm.js' },
  );
  return {
    sandbox,
    Game: sandbox.TestGame,
    Input: sandbox.TestInput,
    advanceClock(seconds) { now += seconds * 1000; },
  };
}

function movementHarness() {
  const runtime = createRuntime();
  const { Game, Input } = runtime;
  Game.updateTownNpcs = () => {};
  Game.openMenu = function openMenu() { this.state = 'menu'; };
  Game.interact = function interact() { this.interactions += 1; };

  function reset() {
    Input.clear();
    Object.assign(Game, {
      state: 'field', fadeDir: 0,
      px: 10, py: 10, dir: 'r', ox: 0, oy: 0,
      moving: false, moveT: 0, moveFromDir: 'r',
      walkDistance: 0, walkAnimT: 0, fieldStopAction: null,
      cameraFocusX: null, cameraFocusY: null,
      party: [
        { kind: 'human', id: 'hero' }, { id: 'a' }, { id: 'b' }, { id: 'c' },
      ],
      map: { w: 80, h: 80, blocked: new Set(), npcs: [], safe: true },
      stepsSeen: 0, interactions: 0,
    });
    Game.resetPartyPath();
    Game.onStep = function onStep() { this.stepsSeen += 1; };
  }

  function frame(dt) {
    runtime.advanceClock(dt);
    Game.updateField(dt);
    Input.endFrame();
  }

  function visualPosition() {
    return { x: Game.px * 32 + Game.ox, y: Game.py * 32 + Game.oy };
  }

  return { ...runtime, reset, frame, visualPosition };
}

test('continuous field movement is deterministic at 60/120fps and variable dt', () => {
  const h = movementHarness();
  const { Game, Input, reset, frame, visualPosition } = h;

  function runFixed(fps) {
    reset();
    Input.virtualDown('right');
    for (let i = 0; i < fps; i += 1) frame(1 / fps);
    return {
      steps: Game.stepsSeen,
      position: visualPosition(),
      walkDistance: Game.walkDistance,
      cameraFocusX: Game.cameraFocusX,
    };
  }

  const at60 = runFixed(60);
  const at120 = runFixed(120);
  assert.equal(at60.steps, 4);
  assert.equal(at120.steps, 4);
  assert.ok(Math.abs(at60.position.x - (10 * 32 + 4.4 * 32)) < 1e-7);
  assert.ok(Math.abs(at60.position.x - at120.position.x) < 1e-7);
  assert.ok(Math.abs(at60.walkDistance - 4.4) < 1e-7);
  assert.ok(Math.abs(at60.walkDistance - at120.walkDistance) < 1e-7);
  assert.ok(Math.abs(at60.cameraFocusX - at120.cameraFocusX) < 1.5);

  reset();
  Input.virtualDown('right');
  const pattern = [.007, .013, .029, .05, .011, .041, .019, .033];
  let elapsed = 0;
  let patternIndex = 0;
  while (elapsed < 1 - 1e-10) {
    const dt = Math.min(pattern[patternIndex % pattern.length], 1 - elapsed);
    frame(dt);
    elapsed += dt;
    patternIndex += 1;
  }
  assert.equal(Game.stepsSeen, 4);
  assert.ok(Math.abs(visualPosition().x - at60.position.x) < 1e-7);
  assert.ok(Math.abs(Game.walkDistance - 4.4) < 1e-7);
});

test('tile boundaries carry time remainder and still stop exactly for input and events', () => {
  const h = movementHarness();
  const { Game, Input, reset, frame, visualPosition } = h;

  reset();
  Input.virtualDown('right');
  frame(1.1 / 4.4);
  assert.equal(Game.stepsSeen, 1);
  assert.equal(Game.moving, true);
  assert.ok(Math.abs(Game.moveT - .1) < 1e-8);
  assert.ok(Math.abs(Game.walkDistance - 1.1) < 1e-8);

  reset();
  Game.map.blocked.add('12,10');
  Input.virtualDown('right');
  frame(1);
  assert.deepEqual([Game.px, Game.py], [11, 10]);
  assert.equal(Game.stepsSeen, 1);
  assert.equal(Game.moving, false);
  assert.deepEqual(visualPosition(), { x: 11 * 32, y: 10 * 32 });

  reset();
  Game.onStep = function onStep() {
    this.stepsSeen += 1;
    if (this.stepsSeen === 2) this.state = 'battle';
  };
  Input.virtualDown('right');
  frame(.75);
  assert.equal(Game.stepsSeen, 2);
  assert.equal(Game.state, 'battle');
  assert.equal(Game.moving, false);
  assert.deepEqual([Game.px, Game.py], [12, 10]);

  reset();
  Game.onStep = function onStep() { this.stepsSeen += 1; this.fadeDir = 1; };
  Input.virtualDown('right');
  frame(.75);
  assert.equal(Game.stepsSeen, 1);
  assert.equal(Game.fadeDir, 1);
  assert.equal(Game.moving, false);
});

test('release and queued actions resolve on the next tile contact', () => {
  const h = movementHarness();
  const { Game, Input, reset, frame, visualPosition } = h;

  reset();
  Input.virtualDown('right');
  frame(.05);
  Input.virtualUp('right');
  for (let guard = 0; Game.moving && guard < 100; guard += 1) frame(.01);
  assert.equal(Game.stepsSeen, 1);
  assert.equal(Game.moving, false);
  assert.deepEqual(visualPosition(), { x: 11 * 32, y: 10 * 32 });

  reset();
  Input.virtualDown('right');
  frame(.05);
  Input.pulse('cancel');
  frame(.01);
  for (let guard = 0; Game.state === 'field' && guard < 100; guard += 1) frame(.01);
  assert.equal(Game.state, 'menu');
  assert.equal(Game.stepsSeen, 1);
  assert.equal(Game.moving, false);
  assert.deepEqual(visualPosition(), { x: 11 * 32, y: 10 * 32 });

  reset();
  Input.virtualDown('right');
  frame(.05);
  Input.pulse('ok');
  frame(.01);
  for (let guard = 0; Game.moving && guard < 100; guard += 1) frame(.01);
  assert.equal(Game.interactions, 1);
  assert.equal(Game.stepsSeen, 1);
  assert.equal(Game.moving, false);
});

test('followers stay on orthogonal trail segments and advance their own travel phases', () => {
  const h = movementHarness();
  const { Game, Input, reset, frame } = h;
  reset();
  Input.virtualDown('right');

  function assertOrthogonalTrail() {
    for (let i = 1; i < 4; i += 1) {
      const from = Game.partyPathFrom[i];
      const to = Game.partyPath[i];
      const dx = Math.abs(to.x - from.x);
      const dy = Math.abs(to.y - from.y);
      assert.ok(dx + dy <= 1, `follower ${i} skipped a tile`);
      assert.ok(dx === 0 || dy === 0, `follower ${i} cut a corner`);
    }
  }

  for (let i = 0; i < 35; i += 1) { frame(1 / 60); assertOrthogonalTrail(); }
  Input.virtualUp('right');
  Input.virtualDown('down');
  for (let i = 0; i < 35; i += 1) { frame(1 / 60); assertOrthogonalTrail(); }

  assert.ok(Game.partyWalkDistances[0] > Game.partyWalkDistances[1]);
  assert.ok(Game.partyWalkDistances[1] > Game.partyWalkDistances[2]);
  for (const distance of Game.partyWalkDistances) {
    assert.ok(Number.isFinite(distance));
    assert.ok(distance >= 0 && distance <= Game.walkDistance);
  }
});

test('wandering NPC movement is linear and distance-based at 60/120fps', () => {
  const { sandbox, Game } = createRuntime();
  vm.runInContext('Math.random = () => 0', sandbox);

  function run(fps) {
    const npc = {
      x: 20, y: 20, homeX: 20, homeY: 20, dir: 'r', wander: true,
      wanderRadius: 2, npcWait: 0, npcMoving: false, npcMoveT: 0,
      npcWalkDistance: 0,
    };
    Object.assign(Game, {
      floor: 2, px: 5, py: 5, partyPath: [],
      map: {
        w: 50, h: 50, blocked: new Set(), town: true, npcs: [npc],
        entry: { x: 1, y: 1 }, exit: { x: 48, y: 48 },
      },
    });
    Game.updateTownNpcs(1 / fps);
    assert.equal(npc.npcMoving, true);
    Game.updateTownNpcs(.1);
    assert.ok(Math.abs(npc.npcMoveT - .265) < 1e-10);
    assert.ok(Math.abs(npc.npcWalkDistance - .265) < 1e-10);
    for (let guard = 0; npc.npcMoving && guard < fps; guard += 1) {
      Game.updateTownNpcs(1 / fps);
    }
    return npc;
  }

  const at60 = run(60);
  const at120 = run(120);
  for (const npc of [at60, at120]) {
    assert.deepEqual([npc.npcFromX, npc.npcFromY], [20, 20]);
    assert.deepEqual([npc.x, npc.y], [21, 20]);
    assert.equal(npc.npcMoveT, 1);
    assert.equal(npc.npcMoving, false);
    assert.equal(npc.npcWalkDistance, 1);
  }
});

test('sprite baseline scan is clamped and cached per sheet layout', () => {
  const { Game, sandbox } = createRuntime();
  let reads = 0;
  const canvas = {
    width: 0,
    height: 0,
    getContext() {
      return {
        clearRect() {},
        drawImage() {},
        getImageData() {
          reads += 1;
          const data = new Uint8ClampedArray(canvas.width * canvas.height * 4);
          const sampleW = 40;
          for (const [column, bottom] of [50, 54].entries()) {
            for (let x = 0; x < sampleW; x += 1) {
              data[(bottom * canvas.width + column * sampleW + x) * 4 + 3] = 255;
            }
          }
          return { data };
        },
      };
    },
  };
  sandbox.document.createElement = kind => {
    assert.equal(kind, 'canvas');
    return canvas;
  };
  const sheet = { naturalWidth: 200, naturalHeight: 100 };
  const first = Game.fieldSheetBaselineShift(sheet, 2, 1, 0, 0, 100);
  const second = Game.fieldSheetBaselineShift(sheet, 2, 1, 1, 0, 100);
  const cached = Game.fieldSheetBaselineShift(sheet, 2, 1, 0, 0, 100);
  assert.equal(first, 3);
  assert.equal(second, -3);
  assert.equal(cached, first);
  assert.equal(reads, 1);
});
