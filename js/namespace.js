// 共通の名前空間。全ファイルはここにぶら下がる(file:// でも動かすため ES Modules は使わない)。
(function () {
  'use strict';
  window.Game = {
    Config: {},   // config/ : 調整用の数値
    Data: {},     // data/   : ドット絵、パレットなどの素材データ
    Core: {},     // core/   : 入力、ループなど、ゲームに依存しない基盤
    Logic: {},    // game/   : ゲームのルール(描画に触れない)
    Render: {},   // render/ : 描画(状態を読むだけ)
    Scenes: {}    // scenes/ : 画面ごとの流れ
  };
})();
