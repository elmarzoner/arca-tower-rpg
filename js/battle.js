// ============================================================
// アルカの塔 - 戦闘システム (フロントビュー・ターン制)
// ============================================================
'use strict';

const Battle = {
  active: false,

  // V5縦切り素材。文字列推測ではなく、敵IDを明示的にセルへ割り当てる。
  v5EnemyCells: {
    slime: 0,
    bat: 1,
    rat: 2,
    b_guardio: 3,
  },
  v5EnemyCellsTier2: { goblin: 0, aquan: 1, slimered: 2, b_aquera: 3 },
  v5EnemyCellsTier3: { mush: 0, thief: 1, gobsold: 2, rock3: 3, b_dronzo: 4 },
  v5EnemyCellsTier4: { ghost: 0, shadowrat: 1, darkbat: 2, b_nocturna: 3 },

  atlasIndex(spr) {
    const s = spr || '';
    if (s.includes('slime') || s === 'b_aquera') return 0;
    if (s.includes('bat')) return 1;
    if (s.includes('goblin')) return 2;
    if (s.includes('mush')) return 3;
    if (s.includes('rock') || s === 'b_guardio') return 4;
    if (s.includes('ghost')) return 5;
    if (s.includes('plant') || s.includes('gardura')) return 6;
    if (s.includes('machine') || s.includes('makinas')) return 7;
    if (s.includes('dragon') || s.includes('dragnoa')) return 8;
    if (s.includes('angel') || s.includes('seraphos')) return 9;
    if (s.includes('shadow') || s.includes('nocturna') || s.includes('dronzo') || s.includes('arcacore')) return 10;
    if (s.includes('rat')) return 11;
    return 0;
  },

  start(opts) {
    // opts: { enemySpecs: [id...], boss: bool, onEnd: fn(result) }
    this.active = true;
    const tier = Game.map ? Game.map.tier : 1;
    const regionalBg = Game.battleBackgroundsV5 && Game.battleBackgroundsV5[tier];
    if (regionalBg) Game.loadAssetOnce(regionalBg, `assets/v5/tier${tier}-battle-bg-v5.webp`);
    else Game.loadAssetOnce(Game.battleArt, 'assets/battle-bg-v4.png');
    if (tier === 1) Game.loadAssetOnce(Game.battleSpritesV5, 'assets/v5/tier1-enemies-v5.webp');
    else if (tier === 2) Game.loadAssetOnce(Game.battleSpritesV5Tier2, 'assets/v5/tier2-enemies-v5.webp');
    else if (tier === 3) Game.loadAssetOnce(Game.battleSpritesV5Tier3, 'assets/v5/tier3-enemies-v5.webp');
    else if (tier === 4) Game.loadAssetOnce(Game.battleSpritesV5Tier4, 'assets/v5/tier4-enemies-v5.webp');
    else Game.loadAssetOnce(Game.monsterAtlas, 'assets/monster-atlas-v4.png');
    Game.loadAssetOnce(Game.partyBattleV5, 'assets/v5/party-battle-v5.webp');
    this.opts = opts;
    this.boss = !!opts.boss;
    this.enemies = [];
    const counts = {};
    for (const sp of opts.enemySpecs) counts[sp] = (counts[sp] || 0) + 1;
    const seen = {};
    for (const sp of opts.enemySpecs) {
      const m = MONSTERS[sp];
      seen[sp] = (seen[sp] || 0) + 1;
      const suffix = counts[sp] > 1 ? String.fromCharCode(64 + seen[sp]) : '';
      this.enemies.push({
        spec: sp, name: m.name + suffix, hp: m.hp, maxhp: m.hp,
        atk: m.atk, def: m.def, agi: m.agi, sleep: 0, flash: 0, dead: false,
      });
    }
    this.phase = 'intro';
    this.queue = [];
    this.qTimer = 0;
    this.cmdIndex = 0;
    this.memberIdx = 0;
    this.actions = [];
    this.menu = null; // {kind:'cmd'|'spell'|'item'|'targetE'|'targetA', sel, list}
    this.bait = false;
    this.shake = 0;
    this.fx = [];
    this.turn = 0;
    this.result = null;
    this.tameCandidate = null;
    this.choice = null; // {text, sel, yes, no}
    this.defeatedTameable = [];
    for (const m of Game.party) { m.sleep = 0; m.defend = false; m.atkBuff = 1; m.defBuff = 1; }
    const names = [...new Set(this.enemies.map(e => MONSTERS[e.spec].name))];
    this.push(names.length === 1 && this.enemies.length > 1
      ? `${names[0]}が むれで あらわれた!`
      : `${names.join('と ')}が あらわれた!`);
    AudioSys.playMusic(this.boss ? (this.opts.finalBoss ? 'lastboss' : 'boss') : 'battle');
  },

  push(text, fn) { this.queue.push({ text, fn }); },

  aliveEnemies() { return this.enemies.filter(e => !e.dead); },
  aliveParty() { return Game.party.filter(m => m.hp > 0); },

  // ---------------- 更新 ----------------
  update(dt) {
    if (this.shake > 0) this.shake -= dt;
    for (const e of this.enemies) if (e.flash > 0) e.flash -= dt;
    for (const fx of this.fx) fx.t += dt;
    this.fx = this.fx.filter(fx => fx.t < fx.duration);

    if (this.choice) return; // 選択待ち(handleInputで処理)

    if (this.queue.length > 0) {
      this.qTimer += dt;
      const cur = this.queue[0];
      if (!cur.applied) { cur.applied = true; if (cur.fn) cur.fn(); }
      if (this.qTimer > 0.85 || (this.qTimer > 0.18 && (Input.pressed('ok') || Input.held('ok')))) {
        this.queue.shift();
        this.qTimer = 0;
      }
      return;
    }

    // キュー消化後のフェーズ遷移
    switch (this.phase) {
      case 'intro':
        this.phase = 'command';
        this.startCommandPhase();
        break;
      case 'resolve':
        this.checkEnd() || this.nextResolveStep();
        break;
      case 'victory_msgs':
        this.finishVictory();
        break;
      case 'ending':
        this.active = false;
        this.opts.onEnd(this.result);
        break;
    }
  },

  startCommandPhase() {
    this.turn++;
    this.actions = [];
    this.memberIdx = 0;
    this.skipToFirstAlive();
    if (this.memberIdx >= Game.party.length) { this.beginResolve(); return; }
    this.menu = { kind: 'cmd', sel: 0 };
  },

  skipToFirstAlive() {
    while (this.memberIdx < Game.party.length) {
      const m = Game.party[this.memberIdx];
      if (m.hp > 0 && m.sleep === 0) break;
      if (m.hp > 0 && m.sleep > 0) this.actions.push({ member: m, cmd: 'sleep' });
      this.memberIdx++;
    }
  },

  // ---------------- 入力 ----------------
  handleInput() {
    if (this.choice) {
      if (Input.pressed('left') || Input.pressed('right') || Input.pressed('up') || Input.pressed('down')) {
        this.choice.sel = 1 - this.choice.sel; AudioSys.sfx('cursor');
      }
      if (Input.pressed('ok')) {
        AudioSys.sfx('ok');
        const c = this.choice; this.choice = null;
        (c.sel === 0 ? c.yes : c.no)();
      }
      if (Input.pressed('cancel')) {
        AudioSys.sfx('cancel');
        const c = this.choice; this.choice = null; c.no();
      }
      return;
    }
    if (this.queue.length > 0 || this.phase !== 'command' || !this.menu) return;

    const menu = this.menu;
    const listLen = menu.kind === 'cmd' ? 5 : (menu.list ? menu.list.length : 0);

    if (menu.kind === 'targetE') {
      const alive = this.aliveEnemies();
      if (Input.pressed('left') || Input.pressed('up')) { menu.sel = (menu.sel + alive.length - 1) % alive.length; AudioSys.sfx('cursor'); }
      if (Input.pressed('right') || Input.pressed('down')) { menu.sel = (menu.sel + 1) % alive.length; AudioSys.sfx('cursor'); }
      if (Input.pressed('ok')) { AudioSys.sfx('ok'); menu.onPick(alive[menu.sel]); }
      if (Input.pressed('cancel')) { AudioSys.sfx('cancel'); this.menu = menu.back; }
      return;
    }
    if (menu.kind === 'targetA') {
      const n = Game.party.length;
      if (Input.pressed('up') || Input.pressed('left')) { menu.sel = (menu.sel + n - 1) % n; AudioSys.sfx('cursor'); }
      if (Input.pressed('down') || Input.pressed('right')) { menu.sel = (menu.sel + 1) % n; AudioSys.sfx('cursor'); }
      if (Input.pressed('ok')) { AudioSys.sfx('ok'); menu.onPick(Game.party[menu.sel]); }
      if (Input.pressed('cancel')) { AudioSys.sfx('cancel'); this.menu = menu.back; }
      return;
    }

    if (Input.pressed('up')) { menu.sel = (menu.sel + listLen - 1) % listLen; AudioSys.sfx('cursor'); }
    if (Input.pressed('down')) { menu.sel = (menu.sel + 1) % listLen; AudioSys.sfx('cursor'); }

    if (Input.pressed('cancel')) {
      if (menu.kind !== 'cmd') { AudioSys.sfx('cancel'); this.menu = { kind: 'cmd', sel: 0 }; }
      else if (this.memberIdx > 0) {
        // 前のキャラのコマンドをやり直し
        AudioSys.sfx('cancel');
        do { this.memberIdx--; } while (this.memberIdx > 0 && (Game.party[this.memberIdx].hp <= 0 || Game.party[this.memberIdx].sleep > 0));
        this.actions = this.actions.filter(a => a.member !== Game.party[this.memberIdx]);
        this.menu = { kind: 'cmd', sel: 0 };
      }
      return;
    }
    if (!Input.pressed('ok')) return;

    const member = Game.party[this.memberIdx];

    if (menu.kind === 'cmd') {
      AudioSys.sfx('ok');
      switch (menu.sel) {
        case 0: // たたかう
          this.pickEnemy(t => this.commitAction({ member, cmd: 'attack', target: t }), menu);
          break;
        case 1: { // じゅもん
          const list = member.spells.filter(s => SPELLS[s].kind !== 'field_warp');
          if (list.length === 0) { this.push(`${member.name}は じゅもんを つかえない!`); return; }
          this.menu = { kind: 'spell', sel: 0, list, back: menu };
          break;
        }
        case 2: // ぼうぎょ
          this.commitAction({ member, cmd: 'defend' });
          break;
        case 3: { // どうぐ
          const list = Game.bag.filter(it => ['heal', 'mp', 'cure_poison', 'bait'].includes(ITEMS[it.id].kind));
          if (list.length === 0) { this.push('つかえる どうぐが ない!'); return; }
          this.menu = { kind: 'item', sel: 0, list, back: menu };
          break;
        }
        case 4: // にげる
          if (this.boss) { this.push('にげられない!'); return; }
          this.commitAction({ member, cmd: 'run' });
          break;
      }
      return;
    }

    if (menu.kind === 'spell') {
      const spId = menu.list[menu.sel];
      const sp = SPELLS[spId];
      if (member.mp < sp.mp) { AudioSys.sfx('cancel'); this.push('MPが たりない!'); return; }
      AudioSys.sfx('ok');
      if (sp.target === 'enemy') this.pickEnemy(t => this.commitAction({ member, cmd: 'spell', spell: spId, target: t }), menu);
      else if (sp.target === 'enemies') this.commitAction({ member, cmd: 'spell', spell: spId });
      else if (sp.target === 'ally') this.pickAlly(t => this.commitAction({ member, cmd: 'spell', spell: spId, target: t }), menu);
      else this.commitAction({ member, cmd: 'spell', spell: spId });
      return;
    }

    if (menu.kind === 'item') {
      const it = menu.list[menu.sel];
      const item = ITEMS[it.id];
      AudioSys.sfx('ok');
      if (item.kind === 'bait') this.commitAction({ member, cmd: 'item', item: it.id });
      else this.pickAlly(t => this.commitAction({ member, cmd: 'item', item: it.id, target: t }), menu);
      return;
    }
  },

  pickEnemy(onPick, back) {
    const alive = this.aliveEnemies();
    if (alive.length === 1) { onPick(alive[0]); return; }
    this.menu = { kind: 'targetE', sel: 0, onPick, back };
  },
  pickAlly(onPick, back) {
    if (Game.party.length === 1) { onPick(Game.party[0]); return; }
    this.menu = { kind: 'targetA', sel: 0, onPick, back };
  },

  commitAction(a) {
    this.actions.push(a);
    this.memberIdx++;
    this.skipToFirstAlive();
    if (this.memberIdx >= Game.party.length) this.beginResolve();
    else this.menu = { kind: 'cmd', sel: 0 };
  },

  // ---------------- ターン解決 ----------------
  beginResolve() {
    this.menu = null;
    // 敵の行動を追加
    for (const e of this.aliveEnemies()) {
      this.actions.push({ enemy: e, cmd: 'enemy' });
    }
    // 素早さ順 (乱数込み)
    this.actions.sort((a, b) => {
      const agiA = a.member ? Chars.agiOf(a.member) : a.enemy.agi;
      const agiB = b.member ? Chars.agiOf(b.member) : b.enemy.agi;
      return (agiB * (0.8 + Math.random() * 0.4)) - (agiA * (0.8 + Math.random() * 0.4));
    });
    // にげるは最優先
    this.actions.sort((a, b) => (b.cmd === 'run' ? 1 : 0) - (a.cmd === 'run' ? 1 : 0));
    this.phase = 'resolve';
    this.resolveIdx = 0;
    this.nextResolveStep();
  },

  nextResolveStep() {
    if (this.resolveIdx >= this.actions.length) {
      // ターン終了処理: 毒・目覚め
      for (const m of this.aliveParty()) {
        if (m.poison) {
          const d = Math.max(1, Math.floor(m.maxhp / 10));
          m.hp = Math.max(1, m.hp - d);
          this.push(`${m.name}は どくに おかされている! ${d}の ダメージ!`);
        }
        if (m.sleep > 0) {
          m.sleep--;
          if (m.sleep === 0) this.push(`${m.name}は めを さました!`);
        }
        m.defend = false;
      }
      for (const e of this.aliveEnemies()) {
        if (e.sleep > 0) { e.sleep--; }
      }
      this.phase = 'command';
      if (this.queue.length === 0) this.startCommandPhase();
      else this._afterQueue = 'command';
      // キューがあれば消化後にcommandへ(updateで処理される)
      if (this.queue.length > 0) {
        const self = this;
        this.push('', () => {}); // 区切り
        this.queue[this.queue.length - 1].fn = () => { self.startCommandPhase(); };
        this.queue[this.queue.length - 1].text = null;
      }
      return;
    }
    const a = this.actions[this.resolveIdx++];
    if (a.member) this.execMemberAction(a);
    else this.execEnemyAction(a.enemy);
    if (this.queue.length === 0) this.nextResolveStep();
  },

  physDamage(atk, def, guard) {
    let d = atk / 2 - def / 4;
    d *= 0.85 + Math.random() * 0.3;
    if (guard) d /= 2;
    return Math.max(0, Math.floor(d));
  },

  addFx(kind, target, duration = .55) {
    this.fx.push({ kind, target, t: 0, duration, seed: Math.random() * 1000 });
  },

  execMemberAction(a) {
    const m = a.member;
    if (m.hp <= 0) return;
    if (a.cmd === 'sleep' || m.sleep > 0) { this.push(`${m.name}は ねむっている……`); return; }
    switch (a.cmd) {
      case 'attack': {
        let t = a.target;
        if (t.dead) { const alive = this.aliveEnemies(); if (!alive.length) return; t = alive[0]; }
        this.push(`${m.name}の こうげき!`);
        const crit = Math.random() < (m.job === 'monk' ? 1 / 12 : 1 / 24);
        const atk = Chars.attackOf(m) * m.atkBuff;
        let dmg;
        if (crit) dmg = Math.floor(atk * (0.9 + Math.random() * 0.2));
        else dmg = this.physDamage(atk, t.def, false);
        const self = this;
        if (crit) this.push('かいしんの いちげき!!', () => AudioSys.sfx('crit'));
        if (dmg === 0) this.push('ミス! ダメージを あたえられない!');
        else this.push(`${t.name}に ${dmg}の ダメージ!`, () => {
          AudioSys.sfx('hit'); t.flash = 0.3; this.addFx(crit ? 'critical' : 'slash', { enemy: t }); t.hp -= dmg;
          if (t.hp <= 0) { t.dead = true; self.push(`${t.name}を たおした!`, () => AudioSys.sfx('dead')); self.recordKill(t); }
        });
        break;
      }
      case 'defend':
        m.defend = true;
        this.push(`${m.name}は みを まもっている。`);
        break;
      case 'run': {
        this.push(`${m.name}たちは にげだした!`);
        const pAgi = Math.max(...this.aliveParty().map(x => Chars.agiOf(x)));
        const eAgi = Math.max(...this.aliveEnemies().map(x => x.agi));
        const thiefBonus = this.aliveParty().some(x => x.job === 'thief') ? 0.2 : 0;
        const ok = Math.random() < 0.55 + (pAgi - eAgi) * 0.008 + thiefBonus;
        const self = this;
        if (ok) {
          this.push('うまく にげきれた!', () => { AudioSys.sfx('run'); self.result = { kind: 'run' }; self.phase = 'ending'; self.queue.length = 0; });
        } else {
          this.push('しかし まわりこまれて しまった!');
        }
        break;
      }
      case 'spell': this.castSpell(m, a); break;
      case 'item': {
        const item = ITEMS[a.item];
        Game.removeItem(a.item);
        this.push(`${m.name}は ${item.name}を つかった!`);
        if (item.kind === 'bait') {
          this.bait = true;
          this.push('まものたちが においに きょうみを もったようだ!');
        } else if (item.kind === 'heal') {
          const t = a.target;
          const v = item.pow[0] + Math.floor(Math.random() * (item.pow[1] - item.pow[0] + 1));
          const healed = Math.min(t.maxhp - t.hp, v);
          t.hp += healed;
          this.push(`${t.name}の HPが ${healed} かいふくした!`, () => AudioSys.sfx('heal'));
        } else if (item.kind === 'mp') {
          const t = a.target;
          const v = Math.min(t.maxmp - t.mp, item.pow[0]);
          t.mp += v;
          this.push(`${t.name}の MPが ${v} かいふくした!`, () => AudioSys.sfx('heal'));
        } else if (item.kind === 'cure_poison') {
          a.target.poison = false;
          this.push(`${a.target.name}の どくが なおった!`, () => AudioSys.sfx('heal'));
        }
        break;
      }
    }
  },

  castSpell(m, a) {
    const sp = SPELLS[a.spell];
    if (m.mp < sp.mp) { this.push(`${m.name}は じゅもんを となえたが MPが たりない!`); return; }
    m.mp -= sp.mp;
    this.push(`${m.name}は ${sp.name}を となえた!`, () => {
      AudioSys.sfx(sp.fx);
      this.addFx(sp.kind === 'heal' || sp.kind === 'revive' ? 'heal' :
        a.spell.startsWith('hini') ? 'fire' : a.spell.startsWith('biri') ? 'lightning' :
        a.spell.startsWith('hiya') ? 'ice' : sp.kind === 'sleep' ? 'sleep' : 'magic',
        sp.target === 'ally' ? { party: a.target || m } : { enemies: true }, .75);
    });
    const self = this;
    const dmgRoll = () => sp.pow[0] + Math.floor(Math.random() * (sp.pow[1] - sp.pow[0] + 1));
    switch (sp.kind) {
      case 'atk': {
        const targets = sp.target === 'enemies' ? this.aliveEnemies() : [a.target && !a.target.dead ? a.target : this.aliveEnemies()[0]];
        for (const t of targets) {
          if (!t) continue;
          const dmg = Math.max(1, Math.floor(dmgRoll() * (t.sleep > 0 ? 1.2 : 1)));
          this.push(`${t.name}に ${dmg}の ダメージ!`, () => {
            t.flash = 0.3; t.hp -= dmg;
            if (t.hp <= 0 && !t.dead) { t.dead = true; self.push(`${t.name}を たおした!`, () => AudioSys.sfx('dead')); self.recordKill(t); }
          });
        }
        break;
      }
      case 'heal': {
        const t = a.target || m;
        const v = Math.min(t.maxhp - t.hp, dmgRoll());
        this.push(`${t.name}の HPが ${v} かいふくした!`, () => { t.hp += v; });
        break;
      }
      case 'revive': {
        const t = a.target;
        if (t.hp > 0) { this.push('しかし なにも おこらなかった。'); break; }
        this.push(`${t.name}が いきかえった!`, () => { t.hp = Math.floor(t.maxhp / 2); });
        break;
      }
      case 'sleep': {
        for (const t of this.aliveEnemies()) {
          const isBoss = MONSTERS[t.spec].boss;
          if (Math.random() < (isBoss ? 0.15 : 0.55)) {
            t.sleep = 2 + Math.floor(Math.random() * 2);
            this.push(`${t.name}は ねむってしまった!`);
          } else {
            this.push(`${t.name}には きかなかった!`);
          }
        }
        break;
      }
      case 'buff_def':
        for (const t of this.aliveParty()) t.defBuff = 1.6;
        this.push('なかまたちが ひかりの まくに つつまれた!');
        break;
      case 'buff_atk': {
        const t = a.target || m;
        t.atkBuff = 1.6;
        this.push(`${t.name}の こうげきりょくが あがった!`);
        break;
      }
    }
  },

  execEnemyAction(e) {
    if (e.dead) return;
    if (e.sleep > 0) { this.push(`${e.name}は ねむっている……`); return; }
    const spec = MONSTERS[e.spec];
    const act = spec.acts[Math.floor(Math.random() * spec.acts.length)];
    const alive = this.aliveParty();
    if (!alive.length) return;
    const target = alive[Math.floor(Math.random() * alive.length)];
    const self = this;

    const dealDamage = (t, dmg, msg) => {
      this.push(msg || `${t.name}に ${dmg}の ダメージ!`, () => {
        AudioSys.sfx('hit'); self.shake = 0.3; self.addFx('impact', { party: t });
        t.hp = Math.max(0, t.hp - dmg);
        if (t.hp <= 0) { t.sleep = 0; self.push(`${t.name}は ちからつきた……`, () => AudioSys.sfx('dead')); self.checkWipe(); }
      });
    };
    const defOf = t => Chars.defenseOf(t) * t.defBuff * (t.defend ? 2 : 1);

    if (act === 'attack' || act === 'doubleattack' || act === 'strongattack') {
      const times = act === 'doubleattack' ? 2 : 1;
      const mult = act === 'strongattack' ? 1.7 : 1;
      if (act === 'strongattack') this.push(`${e.name}は ちからを ためて つよく きりつけた!`);
      else this.push(`${e.name}の こうげき!`);
      for (let i = 0; i < times; i++) {
        const t = i === 0 ? target : alive[Math.floor(Math.random() * alive.length)];
        if (t.hp <= 0) continue;
        const dmg = this.physDamage(e.atk * mult, defOf(t), false);
        if (dmg === 0) this.push(`${t.name}は ひらりと みをかわした!`);
        else dealDamage(t, dmg);
      }
    } else if (act === 'sleepattack') {
      this.push(`${e.name}は ねむりの こなを まきちらした!`);
      for (const t of alive) {
        if (Math.random() < 0.35 && t.sleep === 0) {
          t.sleep = 1 + Math.floor(Math.random() * 2);
          this.push(`${t.name}は ねむってしまった!`);
        }
      }
    } else if (act === 'poisonattack') {
      this.push(`${e.name}は どくの キバで かみついた!`);
      const dmg = this.physDamage(e.atk, defOf(target), false);
      if (dmg > 0) dealDamage(target, dmg);
      if (Math.random() < 0.4 && !target.poison && target.hp > 0) {
        this.push(`${target.name}は どくに おかされた!`, () => { target.poison = true; });
      }
    } else if (act === 'steal') {
      const g = Math.min(Game.gold, 10 + Math.floor(Math.random() * 30));
      if (g > 0 && Math.random() < 0.5) {
        this.push(`${e.name}は ${g}ゴールド ぬすんで ニヤリと わらった!`, () => { Game.gold -= g; });
      } else {
        this.push(`${e.name}は ふところを さぐろうとして しっぱいした!`);
      }
    } else if (act === 'defend') {
      this.push(`${e.name}は からだを まるめて みをまもっている。`);
      e.defendTurn = true;
    } else if (act === 'flee') {
      this.push(`${e.name}は にげだした!`, () => { e.dead = true; e.fled = true; self.checkVictoryAfterQueue(); });
    } else if (Array.isArray(act) && act[0] === 'spell') {
      const sp = SPELLS[act[1]];
      this.push(`${e.name}は ${sp.name}を となえた!`, () => AudioSys.sfx(sp.fx));
      if (sp.kind === 'atk') {
        const targets = sp.target === 'enemies' ? alive : [target];
        for (const t of targets) {
          if (t.hp <= 0) continue;
          const dmg = Math.max(1, Math.floor((sp.pow[0] + Math.random() * (sp.pow[1] - sp.pow[0])) * 0.8 / (t.defend ? 2 : 1)));
          dealDamage(t, dmg);
        }
      } else if (sp.kind === 'heal') {
        const hurt = this.aliveEnemies().filter(x => x.hp < x.maxhp).sort((a2, b2) => a2.hp / a2.maxhp - b2.hp / b2.maxhp)[0] || e;
        const v = Math.min(hurt.maxhp - hurt.hp, sp.pow[0]);
        this.push(`${hurt.name}の きずが かいふくした!`, () => { hurt.hp += v; });
      } else if (sp.kind === 'sleep') {
        for (const t of alive) {
          if (Math.random() < 0.35 && t.sleep === 0) {
            t.sleep = 1 + Math.floor(Math.random() * 2);
            this.push(`${t.name}は ねむってしまった!`);
          } else {
            this.push(`${t.name}には きかなかった!`);
          }
        }
      } else if (sp.kind === 'buff_atk') {
        e.atk = Math.floor(e.atk * 1.3);
        this.push(`${e.name}の こうげきりょくが あがった!`);
      }
    } else if (Array.isArray(act) && act[0] === 'breath') {
      this.push(`${e.name}は ほのおを はいた!`);
      for (const t of alive) {
        if (t.hp <= 0) continue;
        const dmg = Math.max(1, Math.floor(act[1] * (0.85 + Math.random() * 0.3) / (t.defend ? 2 : 1)));
        dealDamage(t, dmg);
      }
    }
  },

  recordKill(e) {
    const spec = MONSTERS[e.spec];
    if (!spec.boss && spec.tame) this.defeatedTameable.push(e.spec);
    this.checkVictoryAfterQueue();
  },

  checkVictoryAfterQueue() {},

  checkWipe() {
    if (this.aliveParty().length === 0) {
      this.result = { kind: 'defeat' };
      const self = this;
      this.push('ぜんめつ してしまった……', () => { AudioSys.stopMusic(); });
      this.queue.push({ text: null, fn: () => { self.phase = 'ending'; } });
    }
  },

  checkEnd() {
    if (this.result) { if (this.phase !== 'ending') this.phase = 'ending'; return true; }
    if (this.aliveParty().length === 0) return false; // checkWipeで処理済み
    if (this.aliveEnemies().length === 0) {
      this.startVictory();
      return true;
    }
    return false;
  },

  // ---------------- 勝利処理 ----------------
  startVictory() {
    this.phase = 'victory_msgs';
    this.menu = null;
    let exp = 0, gold = 0;
    for (const e of this.enemies) {
      if (e.fled) continue;
      const m = MONSTERS[e.spec];
      exp += m.exp; gold += m.gold;
    }
    // とうぞく/しょうにんの おかねボーナス
    const hasThief = this.aliveParty().some(x => x.job === 'thief');
    const hasMerchant = this.aliveParty().some(x => x.job === 'merchant');
    gold = Math.floor(gold * (1 + (hasThief ? 0.3 : 0) + (hasMerchant ? 0.5 : 0)));
    this.rewardExp = exp; this.rewardGold = gold;
    AudioSys.playMusic('victory');
    this.push('まものたちを やっつけた!');
    this.push(`けいけんち ${exp}ポイントを かくとく!`, () => { });
    this.push(`${gold}ゴールドを てにいれた!`, () => { Game.gold += gold; });
    // レベルアップ
    for (const m of this.aliveParty()) {
      m.exp += exp;
      let lv = m.level;
      while (m.exp >= Chars.expTable(lv + 1) && lv < 60) {
        lv++;
        const gains = Chars.applyLevelUp(m, lv);
        this.push(`${m.name}は レベル${lv}に あがった!`, () => AudioSys.sfx('levelup'));
        if (gains.newSpells.length) {
          for (const s of gains.newSpells) this.push(`${m.name}は ${SPELLS[s].name}を おぼえた!`);
        }
      }
    }
    // なかま勧誘 (レア。ほしにくで確率3倍)
    this.tameCandidate = null;
    if (!this.boss && this.defeatedTameable.length > 0 && Game.rosterCount() < 12) {
      // 同種はパーティと控えを合わせて1体まで。倒した順の最後から未加入種を探す。
      const eligible = [...new Set(this.defeatedTameable)].filter(sp => !Game.hasMonsterAlly(sp));
      const sp = eligible[eligible.length - 1];
      if (sp) {
        const rate = Math.min(0.5, MONSTERS[sp].tame * (this.bait ? 3 : 1));
        if (Math.random() < rate) this.tameCandidate = sp;
      }
    }
  },

  finishVictory() {
    if (this.tameCandidate) {
      const sp = this.tameCandidate;
      this.tameCandidate = null;
      const m = MONSTERS[sp];
      AudioSys.sfx('join');
      const self = this;
      this.choice = {
        text: `${m.name}が おきあがり こちらを みている。\nなかまに したそうな めを している。\nなかまに むかえますか?`,
        sel: 0,
        yes: () => {
          // 確認画面中に編成状態が変わった場合にも重複加入を防ぐ最終ガード。
          if (Game.hasMonsterAlly(sp)) {
            self.push(`${m.name}と おなじ しゅるいは すでに なかまに いる。`);
            self.push(`${m.name}は なっとくしたように さっていった……`);
            return;
          }
          const nick = MON_NICKNAMES[sp] || m.name;
          const member = Chars.makeMonster(sp, Math.max(1, Game.party[0].level - 1), nick);
          if (Game.party.length < 4) {
            Game.party.push(member);
            self.push(`${m.name}は なかまに なった!`, () => AudioSys.sfx('join'));
            self.push(`${nick}という なまえを つけた!`);
          } else {
            Game.reserve.push(member);
            self.push(`${m.name}は なかまに なった!`, () => AudioSys.sfx('join'));
            self.push(`${nick}という なまえを つけた!`);
            self.push(`${nick}は ひかえで まっている。`);
          }
        },
        no: () => {
          self.push(`${m.name}は さびしそうに さっていった……`);
        },
      };
      return;
    }
    this.result = { kind: 'win' };
    this.phase = 'ending';
  },

  // ---------------- 描画 ----------------
  draw(g) {
    const W = 512, H = 448;
    const tier = Game.map ? Game.map.tier : 1;
    const theme = Art.TIER_THEMES[tier] || Art.TIER_THEMES[1];
    // 描き下ろしの大型背景を優先。ロード前だけ従来の生成背景へフォールバックする。
    const regionalBg = Game.battleBackgroundsV5 && Game.battleBackgroundsV5[tier];
    const battleBg = regionalBg && regionalBg.complete && regionalBg.naturalWidth ? regionalBg : Game.battleArt;
    if (battleBg && battleBg.complete && battleBg.naturalWidth) {
      g.drawImage(battleBg, 0, 0, 512, 448);
      const tint = g.createLinearGradient(0, 0, 0, 448);
      tint.addColorStop(0, `${theme.bg}18`); tint.addColorStop(.68, 'rgba(2,7,15,.06)'); tint.addColorStop(1, 'rgba(2,5,13,.46)');
      g.fillStyle = tint; g.fillRect(0, 0, 512, 448);
    } else {
      Art.drawBattleBackdrop(g, tier, performance.now() / 1000);
    }

    let sx = 0, sy = 0;
    if (this.shake > 0) { sx = (Math.random() - 0.5) * 10; sy = (Math.random() - 0.5) * 8; }

    // 敵
    const alive = this.aliveEnemies();
    const n = alive.length;
    for (let i = 0; i < n; i++) {
      const e = alive[i];
      const spec = MONSTERS[e.spec];
      const spr = Art.get(spec.spr);
      const sw = spec.boss ? 174 : 108, sh = spec.boss ? 174 : 108;
      const cx = W / 2 + (i - (n - 1) / 2) * (spec.boss ? 150 : 118);
      const baseY = H * 0.62;
      const bob = Math.sin(performance.now() / 400 + i * 1.7) * 3;
      const x = cx - sw / 2 + sx, y = baseY - sh + bob + sy;
      // 接地影
      g.fillStyle = 'rgba(0,0,0,0.32)';
      g.beginPath();
      g.ellipse(cx + sx, baseY - 3 + sy, sw * 0.34, 6, 0, 0, Math.PI * 2);
      g.fill();
      const v5Atlas = Game.battleSpritesV5;
      const v5Cell = this.v5EnemyCells[e.spec];
      const tier2Cell = this.v5EnemyCellsTier2[e.spec];
      const tier2Atlas = Game.battleSpritesV5Tier2;
      const tier3Cell = this.v5EnemyCellsTier3[e.spec];
      const tier3Atlas = Game.battleSpritesV5Tier3;
      const tier4Cell = this.v5EnemyCellsTier4[e.spec];
      const tier4Atlas = Game.battleSpritesV5Tier4;
      if (tier4Cell !== undefined && tier4Atlas && tier4Atlas.complete && tier4Atlas.naturalWidth) {
        const cellW = tier4Atlas.naturalWidth / 4;
        const inset = cellW * .065;
        g.drawImage(tier4Atlas, tier4Cell * cellW + inset, inset,
          cellW - inset * 2, tier4Atlas.naturalHeight - inset * 2, x, y, sw, sh);
      } else if (tier3Cell !== undefined && tier3Atlas && tier3Atlas.complete && tier3Atlas.naturalWidth) {
        const cellW = tier3Atlas.naturalWidth / 5;
        // 生成時の白いセルガイド(約15px)を除外する。
        const inset = Math.max(18, cellW * .046);
        g.drawImage(tier3Atlas, tier3Cell * cellW + inset, inset,
          cellW - inset * 2, tier3Atlas.naturalHeight - inset * 2, x, y, sw, sh);
      } else if (tier2Cell !== undefined && tier2Atlas && tier2Atlas.complete && tier2Atlas.naturalWidth) {
        const cellW = tier2Atlas.naturalWidth / 4;
        g.drawImage(tier2Atlas, tier2Cell * cellW, 0, cellW, tier2Atlas.naturalHeight, x, y, sw, sh);
      } else if (v5Cell !== undefined && v5Atlas && v5Atlas.complete && v5Atlas.naturalWidth) {
        const cellW = v5Atlas.naturalWidth / 4;
        g.drawImage(v5Atlas, v5Cell * cellW, 0, cellW, v5Atlas.naturalHeight, x, y, sw, sh);
      } else {
        const atlas = Game.monsterAtlas;
        if (atlas && atlas.complete && atlas.naturalWidth) {
        const cell = atlas.naturalWidth / 4, ai = this.atlasIndex(spec.spr);
        const ax = (ai % 4) * cell, ay = Math.floor(ai / 4) * cell;
        g.drawImage(atlas, ax, ay, cell, cell, x, y, sw, sh);
        } else if (spr) g.drawImage(spr, x, y, sw, sh);
      }
      if (e.flash > 0 && Math.floor(e.flash * 20) % 2 === 0) {
        g.globalCompositeOperation = 'source-atop';
        g.globalAlpha = 0.7;
        g.fillStyle = '#fff';
        g.fillRect(x, y, sw, sh);
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }
      if (e.sleep > 0) UI.text(g, 'zzz', cx - 12, y - 8, '#a8d8f8', 14);
      // ターゲットカーソル
      if (this.menu && this.menu.kind === 'targetE' && this.menu.sel === i) {
        UI.cursor(g, cx - 8, y - 20, 'down');
        UI.text(g, e.name, cx - UI.measure(g, e.name, 14) / 2, y - 34, '#fff', 14);
      }
    }

    this.drawEffects(g, sx, sy);

    // パーティーステータス
    this.drawPartyStatus(g);

    // コマンドメニュー
    if (this.phase === 'command' && this.menu) {
      const m = this.menu;
      if (m.kind === 'cmd') {
        const member = Game.party[this.memberIdx];
        UI.window(g, 8, 258, 150, 26);
        UI.text(g, member.name, 20, 276, '#ffd', 15);
        UI.window(g, 8, 288, 150, 118);
        const cmds = ['たたかう', 'じゅもん', 'ぼうぎょ', 'どうぐ', 'にげる'];
        for (let i = 0; i < cmds.length; i++) {
          UI.text(g, cmds[i], 40, 312 + i * 19, i === m.sel ? '#fff' : '#bbb', 15);
        }
        UI.cursor(g, 22, 300 + m.sel * 19, 'right');
      } else if (m.kind === 'spell') {
        UI.window(g, 8, 258, 240, 148);
        for (let i = 0; i < m.list.length; i++) {
          const sp = SPELLS[m.list[i]];
          UI.text(g, sp.name, 40, 282 + i * 19, i === m.sel ? '#fff' : '#bbb', 15);
          UI.text(g, String(sp.mp), 210, 282 + i * 19, '#8cf', 14);
        }
        UI.cursor(g, 22, 270 + m.sel * 19, 'right');
        const sp = SPELLS[m.list[m.sel]];
        UI.window(g, 252, 258, 252, 44);
        UI.text(g, sp.desc, 264, 284, '#dde', 13);
      } else if (m.kind === 'item') {
        UI.window(g, 8, 258, 260, 148);
        for (let i = 0; i < Math.min(7, m.list.length); i++) {
          const it = m.list[i];
          UI.text(g, ITEMS[it.id].name, 40, 282 + i * 19, i === m.sel ? '#fff' : '#bbb', 15);
          UI.text(g, `×${it.n}`, 220, 282 + i * 19, '#8cf', 14);
        }
        UI.cursor(g, 22, 270 + m.sel * 19, 'right');
      } else if (m.kind === 'targetA') {
        UI.window(g, 8, 258, 200, 30 + Game.party.length * 19);
        for (let i = 0; i < Game.party.length; i++) {
          const p = Game.party[i];
          UI.text(g, `${p.name}  HP${p.hp}`, 40, 282 + i * 19, i === m.sel ? '#fff' : '#bbb', 15);
        }
        UI.cursor(g, 22, 270 + m.sel * 19, 'right');
      }
    }

    // メッセージ
    if (this.queue.length > 0 && this.queue[0].text) {
      UI.window(g, 8, 336, 496, 104);
      UI.textWrap(g, this.queue[0].text, 26, 366, 460, '#fff', 16, 22);
    }

    // 選択肢
    if (this.choice) {
      UI.window(g, 8, 310, 496, 92);
      const lines = this.choice.text.split('\n');
      for (let i = 0; i < lines.length; i++) UI.text(g, lines[i], 26, 336 + i * 20, '#fff', 15);
      UI.window(g, 370, 350, 120, 76);
      UI.text(g, 'はい', 404, 378, this.choice.sel === 0 ? '#fff' : '#bbb', 15);
      UI.text(g, 'いいえ', 404, 400, this.choice.sel === 1 ? '#fff' : '#bbb', 15);
      UI.cursor(g, 386, 366 + this.choice.sel * 22, 'right');
    }

    function shade(hex, f) {
      const r = parseInt(hex.slice(1, 3), 16) * f | 0;
      const gg = parseInt(hex.slice(3, 5), 16) * f | 0;
      const b = parseInt(hex.slice(5, 7), 16) * f | 0;
      return `rgb(${r},${gg},${b})`;
    }
  },

  drawPartyStatus(g) {
    const n = Game.party.length;
    const w = 118;
    for (let i = 0; i < n; i++) {
      const m = Game.party[i];
      const x = 8 + i * (w + 6);
      UI.window(g, x, 8, w, 74);
      const col = m.hp <= 0 ? '#f66' : (m.hp < m.maxhp * 0.25 ? '#fc6' : '#fff');
      const partyAtlas = Game.partyBattleV5;
      const heroCell = m.kind === 'human' ? { hero: 0, rino: 1, gald: 2, fio: 3 }[m.id] : undefined;
      if (heroCell !== undefined && partyAtlas && partyAtlas.complete && partyAtlas.naturalWidth) {
        const cw = partyAtlas.naturalWidth / 4;
        g.save(); g.beginPath(); g.roundRect(x + 7, 16, 32, 38, 4); g.clip();
        g.drawImage(partyAtlas, heroCell * cw + cw * .13, 0, cw * .74, partyAtlas.naturalHeight * .74,
          x + 5, 14, 36, 43); g.restore();
      } else {
        const sprName = m.kind === 'human' ? HUMANS[m.id].spr : MONSTERS[m.id].spr;
        const icon = Art.get(`${sprName}_0`) || Art.get(`${sprName}_d0`) || Art.get(sprName);
        if (icon) g.drawImage(icon, x + 8, 18, 30, 30);
      }
      UI.text(g, m.name, x + 40, 28, col, 13);
      UI.text(g, `HP ${m.hp}`, x + 40, 48, col, 13);
      UI.text(g, `MP ${m.mp}`, x + 40, 66, '#8cf', 13);
      if (m.sleep > 0) UI.text(g, 'ねむり', x + 66, 28, '#a8d8f8', 11);
      if (m.poison) UI.text(g, 'どく', x + 74, 28, '#c8f', 11);
    }
  },

  drawEffects(g, sx, sy) {
    if (!this.fx || !this.fx.length) return;
    const enemyPoint = target => {
      const alive = this.aliveEnemies(), i = Math.max(0, alive.indexOf(target));
      return { x: 256 + (i - (alive.length - 1) / 2) * (MONSTERS[target.spec].boss ? 150 : 118) + sx, y: 190 + sy };
    };
    const partyPoint = target => ({ x: 67 + Math.max(0, Game.party.indexOf(target)) * 124, y: 48 });
    for (const fx of this.fx) {
      const p = fx.t / fx.duration, alpha = Math.sin(Math.PI * p);
      let center = { x: 256 + sx, y: 190 + sy };
      if (fx.target && fx.target.enemy) center = enemyPoint(fx.target.enemy);
      else if (fx.target && fx.target.party) center = partyPoint(fx.target.party);
      g.save(); g.globalAlpha = alpha;
      if (fx.kind === 'slash' || fx.kind === 'critical') {
        g.translate(center.x, center.y); g.rotate(-.62);
        g.strokeStyle = fx.kind === 'critical' ? '#ffe87a' : '#dffaff';
        g.shadowColor = fx.kind === 'critical' ? '#ff9f43' : '#6ee8ff'; g.shadowBlur = 12;
        g.lineWidth = fx.kind === 'critical' ? 8 : 5;
        g.beginPath(); g.moveTo(-45 + p * 16, 22); g.quadraticCurveTo(0, -18, 45 - p * 10, -24); g.stroke();
      } else if (fx.kind === 'impact') {
        g.strokeStyle = '#fff3c4'; g.lineWidth = 3; g.shadowColor = '#ff8d55'; g.shadowBlur = 10;
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.beginPath(); g.moveTo(center.x + Math.cos(a) * 5, center.y + Math.sin(a) * 5); g.lineTo(center.x + Math.cos(a) * (18 + p * 20), center.y + Math.sin(a) * (18 + p * 20)); g.stroke(); }
      } else {
        const colors = fx.kind === 'fire' ? ['#ff5b32','#ffd45b'] : fx.kind === 'ice' ? ['#7deaff','#e9ffff'] :
          fx.kind === 'lightning' ? ['#8ed8ff','#fff39a'] : fx.kind === 'heal' ? ['#72f0a8','#e8ffbf'] : ['#a78bff','#e7d8ff'];
        g.shadowColor = colors[0]; g.shadowBlur = 13;
        for (let i = 0; i < 12; i++) {
          const a = i * 2.399 + fx.seed, radius = 12 + p * 48 + (i % 3) * 5;
          const x = center.x + Math.cos(a) * radius, y = center.y + Math.sin(a) * radius * .62 - p * 24;
          g.fillStyle = colors[i % 2]; g.beginPath(); g.arc(x, y, 2.5 + (i % 3), 0, Math.PI * 2); g.fill();
        }
        g.strokeStyle = colors[1]; g.lineWidth = 2;
        g.beginPath(); g.ellipse(center.x, center.y + 26, 34 + p * 24, 10 + p * 5, 0, 0, Math.PI * 2); g.stroke();
      }
      g.restore();
    }
  },
};
