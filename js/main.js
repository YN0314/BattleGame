// 起動。タイトル画面から始めてループを回す。
(function () {
  'use strict';

  const SM = Game.Core.SceneManager;

  Game.Core.Input.init();
  Game.Core.Debug.init();
  Game.Core.Sound.init();
  Game.Render.Renderer.init(document.getElementById('screen'));
  // 画像(スプライトシート)の読み込みを待ってから始める。画像がなければすぐ始まる
  Promise.resolve(Game.Data.Sprites.preload()).then(function () {
    SM.go('title');
    if (Game.Data.Sprites.warm) Game.Data.Sprites.warm();
    Game.Core.Loop.start(
      function () { SM.update(); },
      function () { SM.render(); }
    );
  });
})();
