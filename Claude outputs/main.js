// 起動。タイトル画面から始めてループを回す。
(function () {
  'use strict';

  const SM = Game.Core.SceneManager;

  Game.Core.Input.init();
  Game.Core.Debug.init();
  Game.Render.Renderer.init(document.getElementById('screen'));
  SM.go('title');

  Game.Core.Loop.start(
    function () { SM.update(); },
    function () { SM.render(); }
  );
})();
