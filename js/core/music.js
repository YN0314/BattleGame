// BGM。楽譜のデータ(js/config/music.config.js)を、Web Audio で演奏する(音声ファイルは使わない)。
//   Game.Core.Music.play('battle1')  : 曲を流す(同じ曲がもう流れていれば何もしない)。音が有効になる前に呼んでも、有効になったら流れる
//   Game.Core.Music.stop(秒)         : 曲を止める(指定の秒数でフェードアウト)
//   Game.Core.Music.jingle('win')    : 短い曲を1回だけ流す(流れていた曲は止める)
//   Game.Core.Music.duck(0.4)        : 音量を一時的に下げる(ポーズ中など。1で元に戻す)
// 楽譜の書き方は js/config/music.config.js の先頭を参照。
(function () {
  'use strict';

  const NOTE_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const QUALITY = { '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus4: [0, 5, 7], dim: [0, 3, 6] };
  const VEL = { g: 0.45, x: 0.8, X: 1.0 };
  const LOOKAHEAD = 0.5;                       // 何秒先の小節まで予約しておくか

  // ---- 楽譜の読み取り ---------------------------------------------
  function pcOf(letter, acc) { return (NOTE_PC[letter] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0) + 12) % 12; }
  function noteNum(name) {                     // 'A4' → 69
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
    if (!m) throw new Error('music: 音名が読めません: ' + name);
    return 12 * (+m[3] + 1) + pcOf(m[1], m[2]);
  }
  function chordOf(sym) {                      // 'Am' → { pc: 9, tones: [0,3,7] }
    const m = /^([A-G])([#b]?)(.*)$/.exec(sym);
    if (!m || !QUALITY[m[3]]) throw new Error('music: コードが読めません: ' + sym);
    return { pc: pcOf(m[1], m[2]), tones: QUALITY[m[3]] };
  }
  function inRange(pc, lo) { return lo + (((pc - lo) % 12) + 12) % 12; }   // pc を lo 以上 lo+12 未満の音にする
  const hz = function (n) { return 440 * Math.pow(2, (n - 69) / 12); };
  const per = function (v, i) { return Array.isArray(v) ? v[i % v.length] : v; };

  // 1小節ぶんのメロディ文字列 → [{ s, l, m }]
  function parseMelody(str, steps, where) {
    const out = [];
    let pos = 0;
    str.trim().split(/\s+/).forEach(function (tok) {
      const p = tok.split(':'), len = p[1] === undefined ? 1 : +p[1];
      if (!(len >= 1)) throw new Error('music: 長さが読めません(' + where + '): ' + tok);
      if (p[0] !== 'r') out.push({ s: pos, l: len, m: noteNum(p[0]) });
      pos += len;
    });
    if (pos !== steps) throw new Error('music: 1小節の長さが ' + steps + ' になっていません(' + where + '): ' + pos + ' ← ' + str);
    return out;
  }

  // 16文字のパターン → [{ s, l, c }]  (c = 先頭の文字。'-' が続くあいだ長さが延びる)
  function parseRuns(pat, steps, where) {
    if (pat.length !== steps) throw new Error('music: パターンが ' + steps + ' 文字ではありません(' + where + '): ' + pat);
    const out = [];
    for (let i = 0; i < pat.length; i++) {
      const c = pat[i];
      if (c === '.') continue;
      if (c === '-') { if (out.length) out[out.length - 1].l++; continue; }
      out.push({ s: i, l: 1, c: c });
    }
    return out;
  }

  const compiled = {};
  function compile(name) {
    if (compiled[name]) return compiled[name];
    const C = Game.Config.music, def = C.songs[name], P = C.patterns;
    if (!def) throw new Error('music: 曲がありません: ' + name);
    const steps = def.steps || 16;
    const bars = [];
    let loopStart = 0;
    def.sections.forEach(function (sec, si) {
      if (sec.loop) loopStart = bars.length;
      for (let i = 0; i < sec.chords.length; i++) {
        const where = name + ' / ' + (sec.name || si) + ' / ' + (i + 1) + '小節目';
        const ch = chordOf(sec.chords[i]), ev = [];
        // メロディ(複数の声部を重ねられる。tr.transpose で何半音か上げ下げ)
        (sec.melody || []).forEach(function (tr) {
          let s = tr.bars[i];
          if (s === '%') s = tr.bars[i - 1];
          if (s === undefined || s === null) return;
          parseMelody(s, steps, where + ' / ' + tr.inst).forEach(function (n) {
            ev.push({ k: 'note', inst: tr.inst, s: n.s, l: n.l, m: [n.m + (tr.transpose || 0)], v: tr.vol === undefined ? 1 : tr.vol });
          });
        });
        // ベース
        const bn = per(sec.bass, i);
        if (bn) {
          const root = inRange(ch.pc, 38), pick = { '1': 0, '3': ch.tones[1], '5': 7, '8': 12 };
          parseRuns(P.bass[bn], steps, where + ' / bass ' + bn).forEach(function (r) {
            ev.push({ k: 'note', inst: 'bass', s: r.s, l: r.l, m: [root + pick[r.c]], v: 1 });
          });
        }
        // コードの刻み・パッド
        const sn = per(sec.stab, i);
        if (sn) {
          const sp = P.stab[sn], base = inRange(ch.pc, 52);
          parseRuns(sp.p, steps, where + ' / stab ' + sn).forEach(function (r) {
            ev.push({ k: 'note', inst: sp.inst, s: r.s, l: r.l, m: ch.tones.map(function (t) { return base + t; }), v: 1 });
          });
        }
        // アルペジオ
        const an = per(sec.arp, i);
        if (an) {
          const base = inRange(ch.pc, 60);
          const pick = { '1': ch.tones[0], '3': ch.tones[1], '5': ch.tones[2], '7': ch.tones[3] === undefined ? 12 : ch.tones[3], '8': 12, '9': ch.tones[1] + 12, '0': ch.tones[2] + 12 };
          parseRuns(P.arp[an], steps, where + ' / arp ' + an).forEach(function (r) {
            ev.push({ k: 'note', inst: 'arp', s: r.s, l: 1, m: [base + pick[r.c]], v: 1 });
          });
        }
        // ドラム
        const dn = per(sec.drums, i);
        if (dn) {
          const dp = P.drums[dn];
          if (!dp) throw new Error('music: ドラムのパターンがありません: ' + dn);
          Object.keys(dp).forEach(function (row) {
            if (dp[row].length !== steps) throw new Error('music: ドラムが ' + steps + ' 文字ではありません(' + where + ' / ' + dn + '.' + row + ')');
            for (let s = 0; s < steps; s++) { const c = dp[row][s]; if (c !== '.') ev.push({ k: 'drum', d: row, s: s, v: VEL[c] }); }
          });
        }
        bars.push(ev);
      }
    });
    return (compiled[name] = { name: name, def: def, steps: steps, bars: bars, loopStart: loopStart,
      stepSec: 60 / def.bpm / 4 * (16 / steps) });
  }

  // ---- 音色 -------------------------------------------------------
  const waveCache = new WeakMap(), noiseCache = new WeakMap();
  function pulse(ctx, duty) {                  // デューティ比を変えられる矩形波
    let m = waveCache.get(ctx);
    if (!m) { m = {}; waveCache.set(ctx, m); }
    if (!m[duty]) {
      const N = 64, re = new Float32Array(N + 1), im = new Float32Array(N + 1);
      for (let n = 1; n <= N; n++) {
        re[n] = Math.sin(2 * Math.PI * n * duty) / (n * Math.PI);
        im[n] = (1 - Math.cos(2 * Math.PI * n * duty)) / (n * Math.PI);
      }
      m[duty] = ctx.createPeriodicWave(re, im);
    }
    return m[duty];
  }
  function noiseBuf(ctx) {                     // 毎回同じ並びのノイズ(書き出しても同じ音になる)
    let b = noiseCache.get(ctx);
    if (!b) {
      b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = b.getChannelData(0);
      let x = 12345;
      for (let i = 0; i < d.length; i++) { x = (x * 1664525 + 1013904223) >>> 0; d[i] = x / 2147483648 - 1; }
      noiseCache.set(ctx, b);
    }
    return b;
  }
  function osc(ctx, type, f, t, stop, detune) {
    const o = ctx.createOscillator();
    if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type);
    o.frequency.value = f;
    if (detune) o.detune.value = detune;
    o.start(t); o.stop(stop);
    return o;
  }
  // 音の大きさの形:立ち上がり a 秒 → 減衰(時定数 dec)→ 保つ量 sus → 音を止めたら rel 秒で消える。止める時刻を返す
  function adsr(p, t, dur, peak, a, dec, sus, rel) {
    const end = t + Math.max(dur, 0.03);
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(peak, t + a);
    p.setTargetAtTime(peak * sus, t + a, dec);
    p.setTargetAtTime(0.0001, end, rel);
    return end + rel * 7;
  }
  function filter(ctx, type, f, q) {
    const fl = ctx.createBiquadFilter();
    fl.type = type; fl.frequency.value = f; if (q) fl.Q.value = q;
    return fl;
  }

  // メロディの音:デューティ比の違う矩形波を2本ずらして重ね、ゆっくりビブラートをかける
  function voiceLead(ctx, out, send, t, dur, m, vol, o) {
    const f = hz(m[0]), g = ctx.createGain(), lp = filter(ctx, 'lowpass', o.cut || 5200, 0.4);
    const stop = adsr(g.gain, t, dur * 0.96, vol, 0.006, o.dec || 0.08, o.sus === undefined ? 0.8 : o.sus, o.rel || 0.04);
    const wave = o.type || pulse(ctx, o.duty || 0.25);
    const lfo = osc(ctx, 'sine', 5.6, t, stop), lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t); lg.gain.setValueAtTime(0, t + 0.12); lg.gain.linearRampToValueAtTime(o.vib === undefined ? 14 : o.vib, t + 0.35);
    lfo.connect(lg);
    [-5, 5].forEach(function (dt) {
      const a = osc(ctx, wave, f, t, stop, dt);
      lg.connect(a.detune);
      a.connect(lp);
    });
    lp.connect(g); g.connect(out);
    if (send && o.send) { const s = ctx.createGain(); s.gain.value = o.send; g.connect(s); s.connect(send); }
  }
  // コードの刻み・パッド:のこぎり波を重ね、ローパスで音色を作る(刻みは音の頭が明るく、すぐ丸くなる)
  function voiceChord(ctx, out, send, t, dur, m, vol, o) {
    const g = ctx.createGain(), lp = filter(ctx, 'lowpass', o.cut0, o.q || 1);
    lp.frequency.setValueAtTime(o.cut0, t);
    lp.frequency.setTargetAtTime(o.cut1, t + 0.01, o.tau);
    const stop = adsr(g.gain, t, dur * 0.95, vol / Math.sqrt(m.length), o.a, o.dec, o.sus, o.rel);
    m.forEach(function (n) {
      [-9, 9].forEach(function (dt) { const a = osc(ctx, o.type || 'sawtooth', hz(n), t, stop, dt); a.connect(lp); });
    });
    lp.connect(g); g.connect(out);
    if (send && o.send) { const s = ctx.createGain(); s.gain.value = o.send; g.connect(s); s.connect(send); }
  }
  // ベース:のこぎり波(ローパスで締める)+ 下の支え(サイン波)
  function voiceBass(ctx, out, t, dur, m, vol) {
    const f = hz(m[0]), g = ctx.createGain(), lp = filter(ctx, 'lowpass', 1700, 2.5);
    lp.frequency.setValueAtTime(1700, t);
    lp.frequency.setTargetAtTime(420, t + 0.005, 0.07);
    const stop = adsr(g.gain, t, dur * 0.9, vol, 0.004, 0.1, 0.72, 0.035);
    osc(ctx, 'sawtooth', f, t, stop).connect(lp);
    const sub = ctx.createGain(); sub.gain.value = 0.55;
    osc(ctx, 'sine', f, t, stop).connect(sub); sub.connect(g);
    lp.connect(g); g.connect(out);
  }
  // アルペジオ:細い矩形波の短い音。エコーを多めにかける
  function voiceArp(ctx, out, send, t, m, vol) {
    const g = ctx.createGain(), lp = filter(ctx, 'lowpass', 6500, 0.5);
    const stop = adsr(g.gain, t, 0.05, vol, 0.002, 0.03, 0.2, 0.04);
    osc(ctx, pulse(ctx, 0.125), hz(m[0]), t, stop).connect(lp);
    lp.connect(g); g.connect(out);
    if (send) { const s = ctx.createGain(); s.gain.value = 0.55; g.connect(s); s.connect(send); }
  }

  // ドラム
  function noiseHit(ctx, out, t, len, type, f, q, peak, tau) {
    const s = ctx.createBufferSource(), fl = filter(ctx, type, f, q), g = ctx.createGain();
    s.buffer = noiseBuf(ctx);
    g.gain.setValueAtTime(peak, t);
    g.gain.setTargetAtTime(0.0001, t + 0.002, tau);
    s.connect(fl); fl.connect(g); g.connect(out);
    s.start(t, ((t * 7.13) % 1) * 0.9); s.stop(t + len);
  }
  function drum(ctx, out, d, t, v, mix) {
    if (d === 'k') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.1);
      g.gain.setValueAtTime(mix.kick * v, t); g.gain.setTargetAtTime(0.0001, t + 0.03, 0.07);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.5);
      noiseHit(ctx, out, t, 0.04, 'highpass', 1800, 0.7, mix.kick * v * 0.28, 0.006);
    } else if (d === 's') {
      noiseHit(ctx, out, t, 0.4, 'bandpass', 2300, 0.6, mix.snare * v, 0.07);
      noiseHit(ctx, out, t, 0.1, 'highpass', 6000, 0.7, mix.snare * v * 0.4, 0.025);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(230, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.07);
      g.gain.setValueAtTime(mix.snare * v * 0.6, t); g.gain.setTargetAtTime(0.0001, t + 0.01, 0.035);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.3);
    } else if (d === 'h') {
      noiseHit(ctx, out, t, 0.15, 'highpass', 7500, 0.7, mix.hat * v, 0.018);
    } else if (d === 'o') {
      noiseHit(ctx, out, t, 0.5, 'highpass', 7000, 0.7, mix.hat * v * 0.9, 0.09);
    } else if (d === 'c') {
      noiseHit(ctx, out, t, 2.6, 'highpass', 4800, 0.6, mix.crash * v, 0.5);
    } else if (d === 't1' || d === 't2' || d === 't3') {
      const f = { t1: 230, t2: 165, t3: 118 }[d];
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(f * 1.35, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
      g.gain.setValueAtTime(mix.tom * v, t); g.gain.setTargetAtTime(0.0001, t + 0.02, 0.09);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.6);
      noiseHit(ctx, out, t, 0.03, 'bandpass', 1800, 1, mix.tom * v * 0.2, 0.008);
    }
  }

  // 1小節を予約する。t0 = 小節の頭の時刻(秒)
  function scheduleBar(ctx, out, send, song, barIdx, t0) {
    const C = Game.Config.music, mix = C.mix, I = C.instruments, ss = song.stepSec;
    song.bars[barIdx].forEach(function (e) {
      const t = t0 + e.s * ss;
      if (e.k === 'drum') { drum(ctx, out, e.d, t, e.v, mix); return; }
      const dur = e.l * ss, inst = e.inst;
      if (inst === 'bass') voiceBass(ctx, out, t, dur, e.m, mix.bass * e.v);
      else if (inst === 'arp') voiceArp(ctx, out, send, t, e.m, mix.arp * e.v);
      else if (inst === 'stab' || inst === 'pad') voiceChord(ctx, out, send, t, dur, e.m, mix[inst] * e.v, I[inst]);
      else voiceLead(ctx, out, send, t, dur, e.m, mix[inst] * e.v, I[inst]);
    });
  }

  // 曲全体の出力の組み立て:(予約した音)→ bus →(コンプレッサー)→ dest。エコー用の送り先 send も返す
  function buildGraph(ctx, dest, song) {
    const C = Game.Config.music;
    const bus = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.14;
    const level = ctx.createGain(); level.gain.value = C.level;
    const send = ctx.createGain(), delay = ctx.createDelay(1), fb = ctx.createGain(), dl = filter(ctx, 'lowpass', 3200, 0.5), wet = ctx.createGain();
    delay.delayTime.value = song.stepSec * C.echoSteps;
    fb.gain.value = C.echoFeedback; wet.gain.value = C.echoLevel;
    send.connect(delay); delay.connect(dl); dl.connect(fb); fb.connect(delay); dl.connect(wet); wet.connect(bus);
    bus.connect(comp); comp.connect(level); level.connect(dest);
    return { bus: bus, send: send, nodes: [bus, comp, level, send, delay, dl, fb, wet] };
  }

  // ---- 書き出し・試聴用:曲を OfflineAudioContext などに全部予約する ----
  function scheduleSong(ctx, dest, name, t0, o) {
    o = o || {};
    const song = compile(name), g = buildGraph(ctx, dest, song);
    const order = [];
    for (let i = 0; i < song.bars.length; i++) order.push(i);
    for (let l = 0; l < (o.loops || 0); l++) for (let i = song.loopStart; i < song.bars.length; i++) order.push(i);
    order.forEach(function (b, n) { scheduleBar(ctx, g.bus, g.send, song, b, t0 + n * song.steps * song.stepSec); });
    return order.length * song.steps * song.stepSec;
  }

  // ---- ゲーム中の再生 ---------------------------------------------
  let cur = null, want = null, duckV = 1;
  const Snd = function () { return Game.Core.Sound; };

  function start(name, o) {
    const ctx = Snd().context();
    if (!ctx) return;
    const song = compile(name), dest = Snd().musicOut();
    want = null;
    const g = buildGraph(ctx, dest, song);
    const I = cur = { name: name, song: song, ctx: ctx, g: g, bar: 0, t: ctx.currentTime + 0.1, done: false, onEnd: o && o.onEnd, once: !!(o && o.once) };
    g.bus.gain.value = 0.0001;
    g.bus.gain.linearRampToValueAtTime(duckV, ctx.currentTime + ((o && o.fadeIn) || 0.05));
    I.timer = setInterval(tick, 40);
    tick();
  }
  function tick() {
    const I = cur;
    if (!I || I.done) return;
    const ctx = I.ctx;
    while (I.t < ctx.currentTime + LOOKAHEAD) {
      scheduleBar(ctx, I.g.bus, I.g.send, I.song, I.bar, I.t);
      I.t += I.song.steps * I.song.stepSec;
      if (++I.bar >= I.song.bars.length) {
        if (I.once) {                          // 1回だけの曲:最後まで予約したら、終わる時刻に合わせて片付ける
          I.done = true; clearInterval(I.timer);
          const wait = Math.max(0, (I.t - ctx.currentTime) * 1000) + 1500;
          setTimeout(function () { if (cur === I) { cur = null; if (I.onEnd) I.onEnd(); } disconnect(I); }, wait);
          return;
        }
        I.bar = I.song.loopStart;
      }
    }
  }
  function disconnect(I) { I.g.nodes.forEach(function (n) { try { n.disconnect(); } catch (e) { /* もう切れている */ } }); }

  function stop(fade) {
    want = null;
    const I = cur;
    if (!I) return;
    cur = null;
    clearInterval(I.timer);
    const ctx = I.ctx, t = ctx.currentTime, f = fade === undefined ? 0.4 : fade;
    I.g.bus.gain.cancelScheduledValues(t);
    I.g.bus.gain.setValueAtTime(I.g.bus.gain.value, t);
    I.g.bus.gain.linearRampToValueAtTime(0.0001, t + f);
    setTimeout(function () { disconnect(I); }, f * 1000 + 300);
  }

  // 音が出せる状態か。まだなら動き出すのを待ち、動き出したら頼まれていた曲を流す
  function ready() {
    const c = Snd().context();
    if (!c) return false;
    if (c.state === 'running') return true;
    if (c.resume) c.resume();
    if (!c.musicWatch) { c.musicWatch = true; c.addEventListener('statechange', function () { if (c.state === 'running') onUnlock(); }); }
    return false;
  }
  function play(name, o) {
    if (!Game.Config.music.enabled) return;
    if (cur && cur.name === name && !cur.done) return;
    stop(o && o.fadeOut !== undefined ? o.fadeOut : 0.3);
    want = { name: name, o: o };
    if (ready()) start(name, o);
  }
  function jingle(name, onEnd) {
    if (!Game.Config.music.enabled) return;
    stop(0.15);
    want = { name: name, o: { once: true, onEnd: onEnd } };
    if (ready()) start(name, want.o);
  }
  function onUnlock() { if (want && !cur && ready()) start(want.name, want.o); }
  function duck(v, sec) {
    duckV = v;
    if (cur) { const t = cur.ctx.currentTime; cur.g.bus.gain.cancelScheduledValues(t); cur.g.bus.gain.setValueAtTime(cur.g.bus.gain.value, t); cur.g.bus.gain.linearRampToValueAtTime(v, t + (sec === undefined ? 0.15 : sec)); }
  }

  Game.Core.Music = { play: play, stop: stop, jingle: jingle, duck: duck, onUnlock: onUnlock,
    // 試聴・書き出し用(tools/sound_test.html、書き出しの確認)
    compile: compile, scheduleSong: scheduleSong, current: function () { return cur && cur.name; } };
})();
