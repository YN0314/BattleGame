// 画面(シーン)の切り替え。シーンは enter(params) / update() / render() を持つオブジェクト。
// あわせて、メニュー操作用に「どちらのプレイヤーの入力でも」受け付ける操作をまとめて返す。
(function () {
  'use strict';

  const scenes = {};
  let current = null;

  function register(name, scene) { scenes[name] = scene; }

  function go(name, params) {
    current = scenes[name];
    if (current.enter) current.enter(params || {});
  }

  // メニュー用:1P・2Pどちらの「押した瞬間」も受け付ける
  function nav() {
    const out = { up: false, down: false, confirm: false, back: false };
    [0, 1].forEach(function (i) {
      const p = Game.Core.Input.get(i).pressed;
      if (p.up) out.up = true;
      if (p.down) out.down = true;
      if (p.start || p.punch) out.confirm = true;
      if (p.kick) out.back = true;
    });
    if (out.up || out.down || out.confirm || out.back) Game.Core.Sound.unlock();   // パッド操作でも音を有効にする
    return out;
  }

  Game.Core.SceneManager = {
    register: register,
    go: go,
    nav: nav,
    current: function () { return current; },
    update: function () { if (current) current.update(); },
    render: function () { if (current) current.render(); }
  };
})();
