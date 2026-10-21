// 固定タイムステップのゲームループ。
// 画面の更新間隔が60Hzでなくても、ゲームの更新は常に1秒60回で進む。
(function () {
  'use strict';

  let running = false;
  let last = 0;
  let acc = 0;
  let fps = 0, fpsCount = 0, fpsTime = 0;

  function start(update, render) {
    const cfg = Game.Config.game;
    const step = 1000 / cfg.fps;
    running = true;
    last = performance.now();

    function tick(now) {
      if (!running) return;
      const dt = Math.min(now - last, cfg.maxFrameSkipMs);
      last = now;
      acc += dt;
      while (acc >= step) {
        update();
        acc -= step;
        fpsCount++;
      }
      fpsTime += dt;
      if (fpsTime >= 500) {
        fps = Math.round(fpsCount * 1000 / fpsTime);
        fpsCount = 0; fpsTime = 0;
      }
      render();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  Game.Core.Loop = {
    start: start,
    stop: function () { running = false; },
    fps: function () { return fps; }       // 実測の更新回数/秒
  };
})();
