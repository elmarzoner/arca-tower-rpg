// Shared canvas hit testing, responsive stage and contextual controls.
'use strict';
(() => {
  const doc = document.documentElement;
  const mode = () => {
    if (Game.state === 'menu') return Game.curMenu() || 'menu';
    if (Game.state === 'battle') return Battle.choice || (Battle.queue.length ? Battle.queue[0] : Battle.menu) || Battle.phase;
    if (Game.state === 'choice') return Game.choiceBox;
    if (Game.state === 'shop') return `shop:${Game.shop && Game.shop.mode}`;
    if (Game.state === 'jobchange') return `job:${Game.jobUI && Game.jobUI.step}`;
    return Game.state;
  };
  const navigation = () => ['menu', 'choice', 'shop', 'jobchange', 'title'].includes(Game.state)
    || (Game.state === 'battle' && (Battle.choice || (Battle.phase === 'command' && !Battle.queue.length)));
  let renderedMode = null, lastHud = '', nodes, pointer = null, lastTap = 0;
  const resetPointer = () => { pointer = null; };
  const prefsKey = 'arca_presentation_v7';
  try { Game.reducedMotion = JSON.parse(localStorage.getItem(prefsKey) || 'null')?.reducedMotion
    ?? matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { Game.reducedMotion = false; }

  function frontAction() {
    if (!Game.map) return 'しらべる';
    const delta = {u:[0,-1],d:[0,1],l:[-1,0],r:[1,0]}[Game.dir] || [0,0];
    const x = Game.px + delta[0], y = Game.py + delta[1];
    const npc = Game.map.npcs.find(n => n.x === x && n.y === y
      || n.npcMoving && n.npcFromX === x && n.npcFromY === y);
    if (npc) return npc.event?.startsWith('shop_') ? 'おみせ' : npc.event === 'inn' ? 'やどや' : 'はなす';
    if (Game.map.chests.some(c => c.x === x && c.y === y && Game.map.tiles[y]?.[x] === Art.T.CHEST)) return 'あける';
    return 'しらべる';
  }
  function syncHud() {
    if (!nodes) return;
    const field = Game.state === 'field';
    const selecting = navigation();
    const confirm = field ? frontAction() : Game.state === 'dialog' || Game.state === 'opening' ? 'つぎへ' : '決定';
    const back = field ? 'メニュー' : '戻る';
    const scene = field || ['dialog','menu','choice','shop','jobchange'].includes(Game.state)
      ? `${Game.floor}F  ${Game.map?.name || ''}`
      : Game.state === 'battle' ? (Battle.boss ? '守護者との戦い' : 'BATTLE') : '第一部 · あけぼのの門';
    const help = selecting ? '項目をタップして選択。もう一度タップで決定'
      : field ? '左側の好きな位置からスライドして移動' : '「つぎへ」または画面をタップ';
    const key = [Game.state, selecting, confirm, back, scene, help].join('|');
    if (key === lastHud) return;
    lastHud = key;
    doc.dataset.gameState = Game.state;
    doc.classList.toggle('canvas-ui', !field);
    nodes.ok.textContent = confirm; nodes.back.textContent = back;
    nodes.scene.textContent = scene; nodes.help.textContent = help;
    nodes.ok.setAttribute('aria-label', confirm); nodes.back.setAttribute('aria-label', back);
    nodes.mobileNote.textContent = selecting ? '上下にスライドでも選択できます' : '指に追従するフローティング操作';
  }
  function resizeStage() {
    if (!Game.canvas) return;
    const w = window.innerWidth, h = window.innerHeight;
    const touch = matchMedia('(hover: none) and (pointer: coarse)').matches || w <= 700 || h <= 600;
    const portrait = touch && h > w;
    doc.classList.toggle('touch-ui', touch);
    doc.classList.toggle('portrait-game', portrait);
    doc.classList.toggle('landscape-game', touch && !portrait);
    const availableW = Math.max(200, w - (portrait ? 16 : touch ? 144 : 40));
    const availableH = Math.max(160, h - (portrait ? 248 : touch ? 22 : 104));
    const scale = Math.min(availableW / 512, availableH / 448);
    Game.canvas.style.width = `${512 * scale}px`;
    Game.canvas.style.height = `${448 * scale}px`;
    doc.style.setProperty('--stage-width', `${512 * scale}px`);
    doc.style.setProperty('--stage-height', `${448 * scale}px`);
  }
  function pulse(key) { Input.pulse(key); AudioSys.ensureCtx(); }
  function dispatchTap(x, y) {
    if (Game.fadeDir || Game.fade > .05 || renderedMode !== mode()) return;
    const areas = UI.hitAreas || [];
    for (let i = areas.length - 1; i >= 0; i--) {
      const a = areas[i];
      if (x >= a.x && y >= a.y && x <= a.x + a.w && y <= a.y + a.h) { a.onTap(); return; }
    }
    if (['dialog','opening','chapterclear','ending','gameover'].includes(Game.state)) pulse('ok');
    else if (Game.state === 'battle' && Battle.queue.length && !Battle.choice) pulse('ok');
  }
  const update = Game.update;
  Game.update = function(dt) {
    if (document.hidden || nodes?.panel.open) { Input.clear(); return; }
    Input.beginFrame(mode(), navigation());
    update.call(this, dt);
  };
  const draw = Game.draw;
  Game.draw = function() {
    UI.hitAreas = [];
    // ガイドの背後や非表示タブでは静止した画面を保ち、同じ絵を描き直さない。
    // 復帰時は通常のdrawでタップ領域も作り直す。
    if (document.hidden || nodes?.panel.open) { renderedMode = null; return; }
    draw.call(this);
    renderedMode = mode();
    syncHud();
  };
  const init = Game.init;
  Game.init = function() {
    init.call(this);
    nodes = {
      ok: document.querySelector('[data-key="ok"]'), back: document.querySelector('[data-key="cancel"]'),
      scene: document.getElementById('scene-label'), help: document.getElementById('control-help'),
      mobileNote: document.getElementById('mobile-note'), panel: document.getElementById('help-panel'),
    };
    const canvas = this.canvas;
    canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0 || pointer) return;
      pointer = {id:e.pointerId,x:e.clientX,y:e.clientY,mode:mode()};
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener('pointerup', e => {
      if (!pointer || pointer.id !== e.pointerId) return;
      const start = pointer; pointer = null;
      if (start.mode !== mode()) return;
      const dy = e.clientY - start.y, distance = Math.hypot(e.clientX-start.x,dy);
      if (distance > 22) { if (navigation() && Math.abs(dy) > 22) pulse(dy > 0 ? 'down':'up'); return; }
      if (performance.now() - lastTap < 140) return;
      lastTap = performance.now();
      const bounds = canvas.getBoundingClientRect();
      dispatchTap((e.clientX-bounds.left)*512/bounds.width,(e.clientY-bounds.top)*448/bounds.height);
    });
    canvas.addEventListener('pointercancel', resetPointer);
    canvas.addEventListener('lostpointercapture', e => {
      if (pointer?.id === e.pointerId) resetPointer();
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    let lastWheel = 0;
    canvas.addEventListener('wheel', e => {
      if (!navigation()) return;
      e.preventDefault();
      if (performance.now()-lastWheel > 95 && Math.abs(e.deltaY) > 2) {
        pulse(e.deltaY>0?'down':'up'); lastWheel=performance.now();
      }
    }, {passive:false});
    window.addEventListener('blur', () => { resetPointer(); Input.clear(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { resetPointer(); Input.clear(); }
    });
    window.addEventListener('resize', resizeStage);
    window.addEventListener('orientationchange', () => setTimeout(resizeStage,100));
    window.visualViewport?.addEventListener('resize',resizeStage);
    document.getElementById('help-button').addEventListener('click', () => {
      resetPointer(); Input.clear(); nodes.panel.showModal();
    });
    document.getElementById('help-close').addEventListener('click',()=>nodes.panel.close());
    nodes.panel.addEventListener('close',()=>{ Input.clear(); Game.last=performance.now(); });
    const motion = document.getElementById('gentle-motion');
    motion.checked=Game.reducedMotion;
    motion.addEventListener('change',()=>{
      Game.reducedMotion=motion.checked;
      try { localStorage.setItem(prefsKey,JSON.stringify({reducedMotion:motion.checked})); } catch {}
    });
    resizeStage(); syncHud();
  };
})();
