// キーボードとコントローラーの入力を、同じ形の「論理入力」にそろえる。
// ゲーム側は物理的なキーやボタンを知らず、up/down/left/right/punch/kick/start だけを見る。
(function () {
  'use strict';

  const ACTIONS = ['up', 'down', 'left', 'right', 'punch', 'kick', 'start'];
  const heldKeys = new Set();
  const players = [0, 1].map(function () { return { held: blank(), pressed: blank() }; });
  let padIds = [];

  function blank() {
    const o = {};
    ACTIONS.forEach(function (a) { o[a] = false; });
    return o;
  }

  function init() {
    const cfg = Game.Config.input;
    const gameKeys = new Set();
    cfg.keyboard.forEach(function (m) {
      ACTIONS.forEach(function (a) { (m[a] || []).forEach(function (c) { gameKeys.add(c); }); });
    });
    window.addEventListener('keydown', function (e) {
      if (gameKeys.has(e.code)) e.preventDefault();      // 矢印キーでページが動くのを防ぐ
      heldKeys.add(e.code);
    });
    window.addEventListener('keyup', function (e) { heldKeys.delete(e.code); });
    window.addEventListener('blur', function () { heldKeys.clear(); });
  }

  function connectedPads() {
    const all = (navigator.getGamepads ? navigator.getGamepads() : []) || [];
    return Array.from(all).filter(function (p) { return p && p.connected; });
  }

  function readKeyboard(i, out) {
    const m = Game.Config.input.keyboard[i];
    ACTIONS.forEach(function (a) {
      if ((m[a] || []).some(function (c) { return heldKeys.has(c); })) out[a] = true;
    });
  }

  function readPad(pad, out) {
    const g = Game.Config.input.gamepad;
    const btn = function (i) { return !!(pad.buttons[i] && pad.buttons[i].pressed); };
    const ax = pad.axes || [];
    if (btn(g.dpad.up) || ax[1] < -g.deadzone) out.up = true;
    if (btn(g.dpad.down) || ax[1] > g.deadzone) out.down = true;
    if (btn(g.dpad.left) || ax[0] < -g.deadzone) out.left = true;
    if (btn(g.dpad.right) || ax[0] > g.deadzone) out.right = true;
    if (g.punch.some(function (i) { return btn(i); })) out.punch = true;
    if (g.kick.some(function (i) { return btn(i); })) out.kick = true;
    if (g.start.some(function (i) { return btn(i); })) out.start = true;
  }

  // 毎フレーム1回だけ呼ぶ
  function update() {
    const pads = connectedPads();
    padIds = pads.map(function (p) { return p.id; });
    players.forEach(function (pl, i) {
      const cur = blank();
      readKeyboard(i, cur);
      if (pads[i]) readPad(pads[i], cur);
      ACTIONS.forEach(function (a) {
        pl.pressed[a] = cur[a] && !pl.held[a];           // 押した瞬間
        pl.held[a] = cur[a];                              // 押している間
      });
      Game.Core.InputHistory.push(i, pl.held);            // コマンド判定のために履歴へ記録
    });
  }

  Game.Core.Input = {
    init: init,
    update: update,
    get: function (i) { return players[i]; },
    padIds: function () { return padIds; }
  };
})();
