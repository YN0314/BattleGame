// 効果音。Web Audio API で合成する(音声ファイル不要)。
// ブラウザの決まりで、キー操作などのあとでないと音が出せないため、最初の操作で有効にする。
(function () {
  'use strict';

  let ctx = null, master = null, noiseBuf = null, muted = false;

  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = Game.Config.sound.master;
    master.connect(ctx.destination);
    // 白色ノイズを1秒ぶん用意
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function init() {
    const on = function () { unlock(); };
    window.addEventListener('keydown', function (e) {
      on();
      if (e.code === 'KeyM' && !e.repeat) muted = !muted;
    });
    window.addEventListener('pointerdown', on);
  }

  // 音の部品 ---------------------------------------------------
  // 音程が変化する音。type: 波形 / f0→f1: 周波数の変化 / dur: 秒 / delay: 開始の遅れ
  function tone(type, f0, f1, dur, vol, delay) {
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // ノイズ。filter: 'lowpass' | 'highpass' | 'bandpass' / freq0→freq1: フィルタの周波数の変化
  function noise(filter, f0, f1, dur, vol, delay) {
    const t = ctx.currentTime + (delay || 0);
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    fl.type = filter;
    fl.frequency.setValueAtTime(f0, t);
    fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  // 音の定義 ---------------------------------------------------
  const SOUNDS = {
    swing:    function (v) { noise('bandpass', 1800, 700, 0.09, 0.35 * v); },
    hitLight: function (v) { noise('lowpass', 3500, 400, 0.09, 0.8 * v); tone('sine', 220, 70, 0.1, 0.7 * v); },
    hitHeavy: function (v) { noise('lowpass', 4500, 250, 0.16, 1.0 * v); tone('sine', 170, 45, 0.2, 0.9 * v); tone('square', 120, 50, 0.08, 0.25 * v); },
    guard:    function (v) { tone('square', 520, 380, 0.05, 0.25 * v); noise('highpass', 3000, 1500, 0.06, 0.4 * v); },
    fireball: function (v) { tone('sawtooth', 260, 900, 0.28, 0.25 * v); noise('bandpass', 600, 2400, 0.28, 0.3 * v); },
    uppercut: function (v) { tone('sawtooth', 180, 760, 0.3, 0.3 * v); noise('bandpass', 500, 2000, 0.3, 0.3 * v); },
    ko:       function (v) { noise('lowpass', 5000, 150, 0.4, 1.0 * v); tone('sine', 200, 35, 0.6, 1.0 * v); tone('sawtooth', 300, 60, 0.4, 0.25 * v, 0.03); },
    super:    function (v) { tone('sawtooth', 120, 900, 0.5, 0.35 * v); noise('bandpass', 300, 4000, 0.5, 0.5 * v); tone('square', 60, 60, 0.25, 0.3 * v, 0.3); },
    charge:   function (v) { tone('square', 1320, 1320, 0.05, 0.12 * v); },
    ready:    function (v) { [660, 880, 1320].forEach(function (fr, i) { tone('square', fr, fr, 0.09, 0.18 * v, i * 0.07); }); },
    move:     function (v) { tone('square', 660, 660, 0.04, 0.2 * v); },
    ok:       function (v) { tone('square', 660, 660, 0.06, 0.2 * v); tone('square', 990, 990, 0.1, 0.2 * v, 0.06); },
    back:     function (v) { tone('square', 500, 500, 0.06, 0.2 * v); tone('square', 330, 330, 0.08, 0.2 * v, 0.06); },
    round:    function (v) { tone('square', 440, 440, 0.18, 0.22 * v); tone('triangle', 220, 220, 0.18, 0.3 * v); },
    fight:    function (v) { tone('square', 660, 660, 0.1, 0.22 * v); tone('square', 880, 880, 0.25, 0.22 * v, 0.1); tone('triangle', 330, 330, 0.3, 0.3 * v); },
    timeup:   function (v) { tone('sawtooth', 220, 180, 0.4, 0.3 * v); tone('sawtooth', 110, 90, 0.4, 0.3 * v); },
    win:      function (v) {
      [523, 659, 784, 1047].forEach(function (f, i) { tone('square', f, f, 0.16, 0.2 * v, i * 0.12); });
    }
  };

  function play(name) {
    const C = Game.Config.sound;
    if (!C.enabled || muted || !ctx || ctx.state !== 'running') return;
    const fn = SOUNDS[name];
    if (!fn) return;
    master.gain.value = C.master;
    fn(C.volumes[name] === undefined ? 1 : C.volumes[name]);
  }

  Game.Core.Sound = { init: init, unlock: unlock, play: play, isMuted: function () { return muted; } };
})();
