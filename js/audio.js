// ============================================================
// アルカの塔 - チップチューン音源エンジン (WebAudio)
// 全楽曲オリジナル作曲。外部素材は一切使用していません。
// ============================================================
'use strict';

const AudioSys = (() => {
  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let currentSong = null;
  let currentSongName = null;
  let schedulerTimer = null;
  let trackStates = [];
  let songStartTime = 0;
  let muted = false;

  const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function noteToFreq(name) {
    // "C4" "C#4" "Bb3" etc.
    const m = name.match(/^([A-G])([#b]?)(-?\d)$/);
    if (!m) return 0;
    let semi = NOTE_BASE[m[1]];
    if (m[2] === '#') semi++;
    if (m[2] === 'b') semi--;
    const oct = parseInt(m[3]);
    const midi = (oct + 1) * 12 + semi;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // 譜面パース: "C4:1 E4:0.5 r:2" → [{f, beats}]
  function parseNotes(str) {
    const out = [];
    for (const tok of str.trim().split(/\s+/)) {
      const [p, d] = tok.split(':');
      const beats = parseFloat(d || '1');
      if (p === 'r') out.push({ f: 0, beats });
      else out.push({ f: noteToFreq(p), beats });
    }
    return out;
  }

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.5;
      masterGain.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.55;
      musicGain.connect(masterGain);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.8;
      sfxGain.connect(masterGain);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  // ---- 波形生成 ----
  let noiseBuf = null;
  function getNoiseBuf() {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  function scheduleNote(track, note, when, dur) {
    if (note.f === 0) return; // 休符
    const g = ctx.createGain();
    g.connect(musicGain);
    const vol = track.vol;
    const attack = 0.005;
    const gateDur = dur * (track.gate || 0.9);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + attack);
    if (track.decay) {
      g.gain.setTargetAtTime(vol * 0.3, when + attack, track.decay);
    }
    g.gain.setValueAtTime(g.gain.value !== undefined ? vol : vol, when + gateDur - 0.02);
    g.gain.linearRampToValueAtTime(0, when + gateDur);

    if (track.wave === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = getNoiseBuf();
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = note.f * 2;
      f.Q.value = 0.8;
      src.connect(f); f.connect(g);
      src.start(when); src.stop(when + gateDur);
    } else {
      const osc = ctx.createOscillator();
      osc.type = track.wave || 'square';
      osc.frequency.value = note.f;
      if (track.vibrato) {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 5.5;
        const lg = ctx.createGain();
        lg.gain.value = note.f * 0.008;
        lfo.connect(lg); lg.connect(osc.frequency);
        lfo.start(when); lfo.stop(when + gateDur);
      }
      osc.connect(g);
      osc.start(when); osc.stop(when + gateDur);
    }
  }

  const LOOKAHEAD = 0.35; // 秒

  function schedulerTick() {
    if (!currentSong) return;
    const song = currentSong;
    const spb = 60 / song.bpm;
    const now = ctx.currentTime;
    for (const ts of trackStates) {
      while (ts.nextTime < now + LOOKAHEAD) {
        const note = ts.notes[ts.idx];
        const dur = note.beats * spb;
        scheduleNote(ts.track, note, Math.max(ts.nextTime, now), dur);
        ts.nextTime += dur;
        ts.idx++;
        if (ts.idx >= ts.notes.length) {
          if (song.loop === false) { ts.done = true; break; }
          ts.idx = 0;
        }
      }
    }
    if (trackStates.every(t => t.done)) {
      stopMusic();
    }
  }

  function playMusic(name) {
    if (muted) { currentSongName = name; return; }
    if (currentSongName === name && currentSong) return;
    ensureCtx();
    stopMusicInternal();
    const song = SONGS[name];
    if (!song) return;
    currentSong = song;
    currentSongName = name;
    songStartTime = ctx.currentTime + 0.06;
    trackStates = song.tracks.map(tr => ({
      track: tr,
      notes: parseNotes(tr.notes),
      idx: 0,
      nextTime: songStartTime,
      done: false,
    }));
    schedulerTimer = setInterval(schedulerTick, 90);
    schedulerTick();
  }

  function stopMusicInternal() {
    if (schedulerTimer) { clearInterval(schedulerTimer); schedulerTimer = null; }
    currentSong = null;
    trackStates = [];
  }

  function stopMusic() {
    stopMusicInternal();
    currentSongName = null;
  }

  // ---- 効果音 ----
  function sfx(kind) {
    if (muted) return;
    ensureCtx();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(sfxGain);
    const env = (v0, dur) => {
      g.gain.setValueAtTime(v0, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.start(t); o.stop(t + dur);
    };
    switch (kind) {
      case 'cursor':
        o.type = 'square'; o.frequency.value = 1100; env(0.16, 0.05); break;
      case 'ok':
        o.type = 'square';
        o.frequency.setValueAtTime(880, t);
        o.frequency.setValueAtTime(1320, t + 0.06);
        env(0.18, 0.14); break;
      case 'cancel':
        o.type = 'square';
        o.frequency.setValueAtTime(660, t);
        o.frequency.setValueAtTime(440, t + 0.06);
        env(0.15, 0.12); break;
      case 'hit':
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(220, t);
        o.frequency.exponentialRampToValueAtTime(55, t + 0.16);
        env(0.3, 0.18); break;
      case 'crit':
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(440, t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.3);
        env(0.4, 0.32); break;
      case 'spell':
        o.type = 'triangle';
        o.frequency.setValueAtTime(440, t);
        o.frequency.linearRampToValueAtTime(1760, t + 0.25);
        env(0.28, 0.3); break;
      case 'heal':
        o.type = 'triangle';
        o.frequency.setValueAtTime(660, t);
        o.frequency.setValueAtTime(880, t + 0.08);
        o.frequency.setValueAtTime(1320, t + 0.16);
        env(0.25, 0.3); break;
      case 'stairs':
        o.type = 'square';
        o.frequency.setValueAtTime(330, t);
        o.frequency.setValueAtTime(392, t + 0.08);
        o.frequency.setValueAtTime(494, t + 0.16);
        env(0.15, 0.28); break;
      case 'chest':
        o.type = 'square';
        o.frequency.setValueAtTime(523, t);
        o.frequency.setValueAtTime(659, t + 0.09);
        o.frequency.setValueAtTime(784, t + 0.18);
        o.frequency.setValueAtTime(1046, t + 0.27);
        env(0.2, 0.42); break;
      case 'run':
        o.type = 'square';
        o.frequency.setValueAtTime(700, t);
        o.frequency.exponentialRampToValueAtTime(200, t + 0.25);
        env(0.18, 0.28); break;
      case 'dead':
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(200, t);
        o.frequency.exponentialRampToValueAtTime(30, t + 0.5);
        env(0.3, 0.55); break;
      case 'join':
        o.type = 'square';
        o.frequency.setValueAtTime(523, t);
        o.frequency.setValueAtTime(659, t + 0.07);
        o.frequency.setValueAtTime(784, t + 0.14);
        o.frequency.setValueAtTime(659, t + 0.21);
        o.frequency.setValueAtTime(1046, t + 0.28);
        env(0.2, 0.45); break;
      case 'levelup':
        o.type = 'square';
        o.frequency.setValueAtTime(392, t);
        o.frequency.setValueAtTime(523, t + 0.1);
        o.frequency.setValueAtTime(659, t + 0.2);
        o.frequency.setValueAtTime(784, t + 0.3);
        env(0.2, 0.5); break;
    }
  }

  function setMuted(m) {
    muted = m;
    if (m) stopMusicInternal();
    else if (currentSongName) { const n = currentSongName; currentSongName = null; playMusic(n); }
  }

  // ============================================================
  // 楽曲データ(全曲オリジナル)
  // ============================================================
  const SONGS = {

    // ---- タイトル『塔のもとに生まれて』----
    title: {
      bpm: 92, loop: true,
      tracks: [
        { wave: 'square', vol: 0.16, vibrato: true, notes: `
          A4:1.5 E5:0.5 D5:1 C5:1 B4:1.5 C5:0.5 D5:2
          C5:1.5 B4:0.5 A4:1 G4:1 A4:3 r:1
          A4:1.5 E5:0.5 D5:1 C5:1 B4:1.5 C5:0.5 E5:2
          F5:1 E5:1 D5:1 B4:1 C5:3 r:1
          F5:1.5 E5:0.5 D5:1 C5:1 D5:1.5 C5:0.5 B4:2
          E5:1.5 D5:0.5 C5:1 B4:1 A4:3 r:1
          F4:1 G4:1 A4:1 C5:1 B4:1.5 G4:0.5 E5:2
          A4:4 A4:3 r:1` },
        { wave: 'square', vol: 0.10, notes: `
          C4:1 E4:1 A4:1 E4:1 G3:1 D4:1 G4:1 D4:1
          A3:1 C4:1 E4:1 C4:1 A3:1 C4:1 E4:1 C4:1
          C4:1 E4:1 A4:1 E4:1 C4:1 E4:1 G4:1 E4:1
          D4:1 F4:1 A4:1 F4:1 C4:1 E4:1 G4:1 E4:1
          D4:1 F4:1 A4:1 F4:1 E4:1 G4:1 B4:1 G4:1
          C4:1 E4:1 A4:1 E4:1 A3:1 C4:1 E4:1 C4:1
          D4:1 F4:1 A4:1 F4:1 E4:1 G4:1 C5:1 G4:1
          A3:1 C4:1 E4:1 C4:1 A3:1 C4:1 E4:1 C4:1` },
        { wave: 'triangle', vol: 0.22, notes: `
          A2:2 A2:2 G2:2 G2:2 F2:2 F2:2 A2:2 A2:2
          A2:2 A2:2 C3:2 C3:2 D2:2 D2:2 C2:2 C2:2
          D2:2 D2:2 E2:2 E2:2 F2:2 G2:2 A2:2 E2:2
          D2:2 E2:2 A2:2 A2:2 A2:2 A2:2 A2:2 A2:2` },
      ],
    },

    // ---- 宿場町『灯りのともる階(フロア)』----
    town: {
      bpm: 104, loop: true,
      tracks: [
        { wave: 'square', vol: 0.14, vibrato: true, notes: `
          G4:1 C5:1 E5:1 D5:0.5 C5:0.5 D5:1 G4:3
          G4:1 C5:1 E5:1 G5:0.5 E5:0.5 D5:1 C5:3
          A4:1 D5:1 F5:1 E5:0.5 D5:0.5 E5:1 A4:3
          A4:1 B4:1 C5:1 D5:0.5 E5:0.5 D5:1 G4:3
          E5:1 E5:0.5 F5:0.5 G5:1 E5:1 C5:1 G4:3
          F5:1 F5:0.5 G5:0.5 A5:1 F5:1 D5:1 A4:3
          G5:1 E5:1 C5:1 A4:0.5 B4:0.5 C5:1 D5:3
          E5:1 D5:1 C5:1 B4:0.5 A4:0.5 G4:1 C5:3` },
        { wave: 'triangle', vol: 0.2, notes: `
          C3:1 G3:1 E3:1 G3:1 C3:1 G3:1 E3:1 G3:1
          C3:1 G3:1 E3:1 G3:1 C3:1 G3:1 E3:1 G3:1
          F3:1 A3:1 D3:1 A3:1 F3:1 A3:1 D3:1 A3:1
          G3:1 B3:1 D3:1 B3:1 G3:1 B3:1 G3:1 B3:1
          C3:1 G3:1 E3:1 G3:1 C3:1 G3:1 E3:1 G3:1
          D3:1 A3:1 F3:1 A3:1 D3:1 A3:1 F3:1 A3:1
          E3:1 G3:1 C3:1 G3:1 F3:1 A3:1 G3:1 B3:1
          C3:1 G3:1 E3:1 G3:1 C3:1 G3:1 C3:1 G3:1` },
      ],
    },

    // ---- 塔・下層『百段のはじまり』----
    field1: {
      bpm: 116, loop: true,
      tracks: [
        { wave: 'square', vol: 0.15, vibrato: true, notes: `
          E4:1 G4:1 A4:1.5 B4:0.5 C5:1 B4:1 A4:1 G4:1
          E4:1 G4:1 A4:1.5 C5:0.5 B4:2 r:1 G4:1
          A4:1 C5:1 D5:1.5 E5:0.5 F5:1 E5:1 D5:1 C5:1
          B4:1 D5:1 C5:1 A4:1 G4:2 r:1 E4:1
          F4:1 A4:1 C5:1.5 A4:0.5 D5:1 C5:1 B4:1 A4:1
          G4:1 B4:1 D5:1.5 B4:0.5 E5:2 r:1 B4:1
          C5:1 B4:1 A4:1.5 G4:0.5 F4:1 G4:1 A4:1 B4:1
          A4:1 G4:1 E4:1 D4:1 E4:2 r:2` },
        { wave: 'triangle', vol: 0.22, notes: `
          E2:1 E3:1 E2:1 E3:1 A2:1 A3:1 A2:1 A3:1
          E2:1 E3:1 E2:1 E3:1 E2:1 B2:1 E2:1 G2:1
          A2:1 A3:1 A2:1 A3:1 D3:1 D3:1 D2:1 D3:1
          G2:1 G3:1 G2:1 G3:1 C3:1 C3:1 E2:1 E3:1
          D2:1 D3:1 D2:1 D3:1 G2:1 G3:1 G2:1 G3:1
          E2:1 E3:1 E2:1 E3:1 E2:1 E3:1 B2:1 B2:1
          A2:1 A3:1 F2:1 F3:1 D2:1 D3:1 G2:1 G3:1
          A2:1 E2:1 A2:1 D2:1 E2:1 E2:1 E2:1 E2:1` },
        { wave: 'noise', vol: 0.05, notes: `
          C6:1 C7:1 C6:0.5 C6:0.5 C7:1 C6:1 C7:1 C6:0.5 C6:0.5 C7:1
          C6:1 C7:1 C6:0.5 C6:0.5 C7:1 C6:1 C7:1 C6:0.5 C6:0.5 C7:1
          C6:1 C7:1 C6:0.5 C6:0.5 C7:1 C6:1 C7:1 C6:0.5 C6:0.5 C7:1
          C6:1 C7:1 C6:0.5 C6:0.5 C7:1 C6:1 C7:1 C6:1 C7:1` },
      ],
    },

    // ---- 塔・中層『雲を抜けて』----
    field2: {
      bpm: 108, loop: true,
      tracks: [
        { wave: 'square', vol: 0.15, vibrato: true, notes: `
          D5:1.5 C5:0.5 A4:1 F4:1 G4:1.5 A4:0.5 Bb4:2
          A4:1.5 G4:0.5 F4:1 D4:1 E4:3 r:1
          D5:1.5 C5:0.5 A4:1 F4:1 G4:1.5 Bb4:0.5 A4:2
          G4:1.5 F4:0.5 E4:1 C4:1 D4:3 r:1
          F4:1 A4:1 C5:1.5 D5:0.5 Bb4:1 D5:1 G4:2
          A4:1 C5:1 E5:1.5 F5:0.5 D5:1 C5:1 A4:2
          Bb4:1.5 A4:0.5 G4:1 Bb4:1 A4:1.5 G4:0.5 F4:1 A4:1
          G4:1 E4:1 C4:1 E4:1 D4:3 r:1` },
        { wave: 'triangle', vol: 0.22, notes: `
          D3:2 A3:2 G2:2 Bb2:2
          A2:2 E3:2 A2:2 A2:2
          D3:2 A3:2 G2:2 A2:2
          G2:2 A2:2 D3:2 D3:2
          F2:2 C3:2 G2:2 Bb2:2
          A2:2 E3:2 D3:2 A3:2
          G2:2 Eb3:2 F2:2 A2:2
          G2:2 A2:2 D3:2 D3:2` },
      ],
    },

    // ---- 塔・上層『星に近いところ』----
    field3: {
      bpm: 100, loop: true,
      tracks: [
        { wave: 'square', vol: 0.15, vibrato: true, notes: `
          E5:2 B4:1 E5:1 G5:1.5 F5:0.5 E5:1 B4:1
          C5:2 G4:1 C5:1 E5:3 r:1
          D5:2 A4:1 D5:1 F5:1.5 E5:0.5 D5:1 A4:1
          B4:2 G4:1 B4:1 E5:3 r:1
          G5:1.5 F5:0.5 E5:1 D5:1 C5:1.5 B4:0.5 A4:1 C5:1
          B4:1.5 A4:0.5 G4:1 F4:1 E4:3 r:1
          A4:1 C5:1 E5:1 A5:1 G5:1.5 E5:0.5 C5:1 E5:1
          F5:1 D5:1 B4:1 D5:1 E5:3 r:1` },
        { wave: 'triangle', vol: 0.22, notes: `
          E3:4 E3:2 B2:2 C3:4 C3:2 G2:2
          D3:4 D3:2 A2:2 E3:4 E3:2 B2:2
          A2:4 F2:4 G2:4 C3:2 B2:2
          A2:4 E3:4 D3:2 G2:2 E3:2 E2:2` },
        { wave: 'square', vol: 0.07, notes: `
          r:1 B3:1 E4:1 B3:1 r:1 B3:1 E4:1 B3:1
          r:1 C4:1 E4:1 C4:1 r:1 C4:1 E4:1 C4:1
          r:1 A3:1 D4:1 A3:1 r:1 A3:1 D4:1 A3:1
          r:1 B3:1 E4:1 B3:1 r:1 B3:1 E4:1 B3:1
          r:1 C4:1 F4:1 C4:1 r:1 A3:1 C4:1 A3:1
          r:1 B3:1 D4:1 B3:1 r:1 G3:1 B3:1 G3:1
          r:1 C4:1 E4:1 C4:1 r:1 C4:1 E4:1 C4:1
          r:1 B3:1 D4:1 B3:1 r:1 B3:1 E4:1 B3:1` },
      ],
    },

    // ---- 戦闘『牙をむく塔』----
    battle: {
      bpm: 150, loop: true,
      tracks: [
        { wave: 'square', vol: 0.15, notes: `
          A4:0.5 A4:0.5 C5:0.5 A4:0.5 E5:1 D5:0.5 C5:0.5
          B4:0.5 B4:0.5 D5:0.5 B4:0.5 F5:1 E5:0.5 D5:0.5
          C5:0.5 C5:0.5 E5:0.5 C5:0.5 G5:1 F5:0.5 E5:0.5
          F5:0.5 E5:0.5 D5:0.5 C5:0.5 B4:1 E5:1
          A4:0.5 A4:0.5 C5:0.5 A4:0.5 E5:1 D5:0.5 C5:0.5
          B4:0.5 B4:0.5 D5:0.5 B4:0.5 F5:1 E5:0.5 D5:0.5
          G5:0.5 G5:0.5 F5:0.5 E5:0.5 F5:0.5 F5:0.5 E5:0.5 D5:0.5
          E5:0.5 D5:0.5 C5:0.5 B4:0.5 A4:1 r:1` },
        { wave: 'sawtooth', vol: 0.09, notes: `
          A2:0.5 A2:0.5 A2:0.5 A2:0.5 A2:0.5 G2:0.5 A2:0.5 B2:0.5
          B2:0.5 B2:0.5 B2:0.5 B2:0.5 B2:0.5 A2:0.5 B2:0.5 C3:0.5
          C3:0.5 C3:0.5 C3:0.5 C3:0.5 C3:0.5 B2:0.5 C3:0.5 D3:0.5
          D3:0.5 D3:0.5 E3:0.5 E3:0.5 E2:0.5 E2:0.5 E3:0.5 E2:0.5
          A2:0.5 A2:0.5 A2:0.5 A2:0.5 A2:0.5 G2:0.5 A2:0.5 B2:0.5
          B2:0.5 B2:0.5 B2:0.5 B2:0.5 B2:0.5 A2:0.5 B2:0.5 C3:0.5
          C3:0.5 C3:0.5 D3:0.5 D3:0.5 D3:0.5 D3:0.5 E3:0.5 E3:0.5
          E2:0.5 E2:0.5 E2:0.5 E2:0.5 A2:0.5 A2:0.5 A2:0.5 A2:0.5` },
        { wave: 'noise', vol: 0.06, notes: `
          C5:0.5 C7:0.5 C6:0.5 C7:0.5 C5:0.5 C7:0.5 C6:0.5 C7:0.5
          C5:0.5 C7:0.5 C6:0.5 C7:0.5 C5:0.5 C7:0.5 C6:0.5 C7:0.5
          C5:0.5 C7:0.5 C6:0.5 C7:0.5 C5:0.5 C7:0.5 C6:0.5 C7:0.5
          C5:0.5 C7:0.5 C6:0.5 C7:0.5 C5:0.5 C6:0.5 C6:0.5 C6:0.5` },
      ],
    },

    // ---- ボス戦『階(きざはし)の守り手』----
    boss: {
      bpm: 160, loop: true,
      tracks: [
        { wave: 'square', vol: 0.16, notes: `
          D5:0.5 D5:0.5 D5:0.5 Eb5:0.5 D5:0.5 C5:0.5 Bb4:1
          Bb4:0.5 Bb4:0.5 Bb4:0.5 C5:0.5 Bb4:0.5 A4:0.5 G4:1
          G4:0.5 A4:0.5 Bb4:0.5 C5:0.5 D5:0.5 Eb5:0.5 F5:1
          Eb5:0.5 D5:0.5 C5:0.5 D5:0.5 Bb4:1 r:1
          D5:0.5 D5:0.5 D5:0.5 Eb5:0.5 D5:0.5 C5:0.5 Bb4:1
          G5:0.5 G5:0.5 G5:0.5 F5:0.5 Eb5:0.5 D5:0.5 C5:1
          Bb4:0.5 C5:0.5 D5:0.5 Eb5:0.5 F5:0.5 G5:0.5 A5:1
          Bb5:0.5 A5:0.5 G5:0.5 F5:0.5 D5:1 r:1` },
        { wave: 'sawtooth', vol: 0.1, notes: `
          G2:0.5 G2:0.5 G3:0.5 G2:0.5 G2:0.5 G3:0.5 G2:0.5 F2:0.5
          Eb2:0.5 Eb2:0.5 Eb3:0.5 Eb2:0.5 Eb2:0.5 Eb3:0.5 Eb2:0.5 D2:0.5
          C2:0.5 C2:0.5 C3:0.5 C2:0.5 C2:0.5 C3:0.5 C2:0.5 Bb1:0.5
          D2:0.5 D2:0.5 D3:0.5 D2:0.5 D2:0.5 D3:0.5 D2:0.5 D2:0.5
          G2:0.5 G2:0.5 G3:0.5 G2:0.5 G2:0.5 G3:0.5 G2:0.5 F2:0.5
          Eb2:0.5 Eb2:0.5 Eb3:0.5 Eb2:0.5 Eb2:0.5 Eb3:0.5 Eb2:0.5 D2:0.5
          C2:0.5 C3:0.5 C2:0.5 C3:0.5 F2:0.5 F3:0.5 F2:0.5 F3:0.5
          Bb1:0.5 Bb2:0.5 D2:0.5 D3:0.5 G2:0.5 G2:0.5 G2:0.5 G2:0.5` },
        { wave: 'noise', vol: 0.07, notes: `
          C5:0.5 C7:0.5 C6:0.25 C6:0.25 C7:0.5 C5:0.5 C7:0.5 C6:0.5 C7:0.5
          C5:0.5 C7:0.5 C6:0.25 C6:0.25 C7:0.5 C5:0.5 C7:0.5 C6:0.5 C7:0.5
          C5:0.5 C7:0.5 C6:0.25 C6:0.25 C7:0.5 C5:0.5 C7:0.5 C6:0.5 C7:0.5
          C5:0.5 C7:0.5 C6:0.25 C6:0.25 C7:0.5 C5:0.25 C5:0.25 C6:0.25 C6:0.25 C7:0.5 C7:0.5` },
      ],
    },

    // ---- 最終決戦『アルカ=コア』----
    lastboss: {
      bpm: 168, loop: true,
      tracks: [
        { wave: 'square', vol: 0.16, notes: `
          E5:0.5 F5:0.5 E5:0.5 D#5:0.5 E5:1 B4:1
          C5:0.5 D5:0.5 C5:0.5 B4:0.5 C5:1 A4:1
          A4:0.5 B4:0.5 C5:0.5 D5:0.5 E5:0.5 F5:0.5 G5:0.5 A5:0.5
          G5:0.5 F5:0.5 E5:0.5 D5:0.5 E5:1 r:1
          E5:0.5 F5:0.5 E5:0.5 D#5:0.5 E5:1 G5:1
          A5:0.5 G5:0.5 F5:0.5 E5:0.5 F5:1 D5:1
          B4:0.5 C5:0.5 D5:0.5 E5:0.5 F5:0.5 E5:0.5 D5:0.5 C5:0.5
          D#5:1 E5:1 B4:1 E5:1` },
        { wave: 'sawtooth', vol: 0.1, notes: `
          E2:0.5 E3:0.5 E2:0.5 E3:0.5 E2:0.5 E3:0.5 D2:0.5 D3:0.5
          C2:0.5 C3:0.5 C2:0.5 C3:0.5 A1:0.5 A2:0.5 A1:0.5 A2:0.5
          F2:0.5 F3:0.5 F2:0.5 F3:0.5 G2:0.5 G3:0.5 G2:0.5 G3:0.5
          A2:0.5 A3:0.5 B2:0.5 B3:0.5 E2:0.5 E3:0.5 E2:0.5 E2:0.5
          E2:0.5 E3:0.5 E2:0.5 E3:0.5 C2:0.5 C3:0.5 C2:0.5 C3:0.5
          D2:0.5 D3:0.5 D2:0.5 D3:0.5 B1:0.5 B2:0.5 B1:0.5 B2:0.5
          G2:0.5 G3:0.5 A2:0.5 A3:0.5 B2:0.5 B3:0.5 C3:0.5 C3:0.5
          B2:0.5 B2:0.5 B1:0.5 B1:0.5 E2:0.5 E2:0.5 E2:0.5 E2:0.5` },
        { wave: 'noise', vol: 0.07, notes: `
          C5:0.5 C7:0.5 C6:0.5 C7:0.5 C5:0.5 C7:0.5 C6:0.5 C7:0.5
          C5:0.5 C7:0.5 C6:0.5 C7:0.5 C5:0.5 C7:0.5 C6:0.25 C6:0.25 C7:0.5` },
      ],
    },

    // ---- 勝利ファンファーレ ----
    victory: {
      bpm: 140, loop: false,
      tracks: [
        { wave: 'square', vol: 0.16, notes: `
          C5:0.33 C5:0.33 C5:0.34 C5:1 Ab4:1 Bb4:1 C5:0.66 Bb4:0.34 C5:2` },
        { wave: 'square', vol: 0.1, notes: `
          E4:0.33 E4:0.33 E4:0.34 E4:1 C4:1 D4:1 E4:0.66 D4:0.34 E4:2` },
        { wave: 'triangle', vol: 0.2, notes: `
          C3:0.33 C3:0.33 C3:0.34 C3:1 Ab2:1 Bb2:1 C3:1 C3:2` },
      ],
    },

    // ---- イベント(悲)『霧のむこう』----
    sad: {
      bpm: 72, loop: true,
      tracks: [
        { wave: 'triangle', vol: 0.2, vibrato: true, notes: `
          A4:2 C5:1 B4:1 A4:2 E4:2
          F4:2 A4:1 G4:1 E4:4
          A4:2 C5:1 B4:1 A4:2 D5:2
          C5:2 B4:1 G4:1 A4:4` },
        { wave: 'triangle', vol: 0.16, notes: `
          A2:4 F2:4 D2:4 E2:4
          A2:4 F2:4 G2:2 E2:2 A2:4` },
      ],
    },

    // ---- イベント(神秘)『箱舟の記憶』----
    mystery: {
      bpm: 80, loop: true,
      tracks: [
        { wave: 'square', vol: 0.1, vibrato: true, notes: `
          E5:1 B4:1 G5:1 B4:1 F#5:1 B4:1 E5:1 B4:1
          D5:1 A4:1 F#5:1 A4:1 E5:1 A4:1 D5:1 A4:1
          C5:1 G4:1 E5:1 G4:1 D5:1 G4:1 C5:1 G4:1
          B4:1 F#4:1 D#5:1 F#4:1 B4:2 r:2` },
        { wave: 'triangle', vol: 0.18, notes: `
          E3:8 D3:8 C3:8 B2:8` },
      ],
    },

    // ---- エンディング『ひらかれた空』----
    ending: {
      bpm: 84, loop: true,
      tracks: [
        { wave: 'square', vol: 0.15, vibrato: true, notes: `
          G4:1 C5:1.5 D5:0.5 E5:1 E5:1.5 D5:0.5 C5:1 D5:1
          E5:1 G5:2 E5:1 D5:3 r:1
          G4:1 C5:1.5 D5:0.5 E5:1 A5:1.5 G5:0.5 E5:1 C5:1
          D5:1 E5:2 D5:1 C5:3 r:1
          E5:1 F5:1.5 E5:0.5 D5:1 G5:1.5 F5:0.5 E5:1 D5:1
          C5:1 E5:2 G5:1 A5:3 r:1
          G5:1 F5:1.5 E5:0.5 F5:1 E5:1.5 D5:0.5 C5:1 D5:1
          C5:4 C5:3 r:1` },
        { wave: 'triangle', vol: 0.2, notes: `
          C3:2 G3:2 A2:2 E3:2 F2:2 C3:2 G2:2 D3:2
          C3:2 G3:2 A2:2 E3:2 F2:2 G2:2 C3:2 G2:2
          A2:2 E3:2 F2:2 C3:2 C3:2 G3:2 F2:2 C3:2
          D3:2 A3:2 G2:2 G2:2 C3:2 G3:2 C3:2 C3:2` },
      ],
    },

    // ---- ゲームオーバー ----
    gameover: {
      bpm: 60, loop: false,
      tracks: [
        { wave: 'triangle', vol: 0.22, notes: `
          E4:1 B3:1 C4:1 A3:1 G#3:2 A3:2 E3:4` },
        { wave: 'triangle', vol: 0.15, notes: `
          A2:2 A2:2 E2:2 F2:2 E2:4` },
      ],
    },
  };

  return { playMusic, stopMusic, sfx, setMuted, ensureCtx,
    get muted() { return muted; },
    get nowPlaying() { return currentSongName; } };
})();
