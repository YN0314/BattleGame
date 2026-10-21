// 画面下のデバッグ表示と、当たり判定の箱の表示切り替え(H キー)。
// Game.Config.display.debug が false なら表示を出さない。
(function () {
  'use strict';

  let el = null;
  let counter = 0;
  let boxes = false;

  function init() {
    window.addEventListener('keydown', function (e) {
      if (e.code === 'KeyH' && !e.repeat) boxes = !boxes;
    });
  }

  function dirs(h) {
    return (h.up ? '↑' : '-') + (h.down ? '↓' : '-') + (h.left ? '←' : '-') + (h.right ? '→' : '-') +
      (h.punch ? ' P' : ' -') + (h.kick ? 'K' : '-');
  }

  function line(label, i, f) {
    return label + ' ' + dirs(Game.Core.Input.get(i).held) +
      '  体力:' + String(f.health).padStart(3, ' ') + '  ゲージ:' + String(Math.floor(f.meter)).padStart(3, ' ') +
      '  状態:' + f.state + (f.move ? '(' + f.move + ' ' + f.attackFrame + ')' : '') +
      '\n   直近の入力(テンキー・向き基準): ' + Game.Core.InputHistory.recent(i, f.facing, 10);
  }

  function show(scene) {
    if (!Game.Config.display.debug) return;
    if (!el) el = document.getElementById('debug');
    if (!el) return;
    if (++counter % 6 !== 0) return;               // 表示の更新は間引く

    const pads = Game.Core.Input.padIds();
    const f = scene.fighters;
    const lines = [
      '更新: ' + Game.Core.Loop.fps() + ' /秒(目標 ' + Game.Config.game.fps + ')   判定の箱: ' + (boxes ? '表示中' : '非表示') + '(Hキーで切替)',
      'コントローラー: ' + (pads.length ? pads.length + '台 [' + pads.join(' | ') + ']'
        : '未接続(接続後にボタンを1回押してください)'),
      line('1P', 0, f[0]),
      line('2P', 1, f[1])
    ];
    el.textContent = lines.join('\n');
  }

  Game.Core.Debug = {
    init: init,
    show: show,
    showBoxes: function () { return boxes; },
    setShowBoxes: function (v) { boxes = !!v; }
  };
})();
