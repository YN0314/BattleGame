// 固定タイムステップのゲームループ。
// 画面の更新間隔が60Hzでなくても、ゲームの更新は常に1秒60回で進む。
(function () {
  'use strict';

  let running = false;
  let last = 0;
  let acc = 0;
  let fps = 0, fpsCount = 0, fpsTime = 0;

  // 例外が起きてもループは止めない。内容は画面の左上に出す(原因調査用。クリックで消える)
  let errBox = null, errCount = 0;
  function report(where, e) {
    errCount++;
    if (errCount <= 3) console.error('[' + where + '] ' + (e && e.stack || e));
    if (!errBox) {
      errBox = document.createElement('pre');
      errBox.style.cssText = 'position:fixed;left:4px;top:4px;max-width:90vw;margin:0;padding:6px 8px;background:rgba(160,0,0,.9);color:#fff;font:12px/1.4 monospace;white-space:pre-wrap;z-index:9999;cursor:pointer';
      errBox.onclick = function () { errBox.style.display = 'none'; };
      document.body.appendChild(errBox);
    }
    errBox.style.display = 'block';
    errBox.textContent = 'ERROR in ' + where + ' (x' + errCount + ')\n' + (e && e.stack || e);
  }

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
        try { update(); } catch (e) { report('update', e); }
        acc -= step;
        fpsCount++;
      }
      fpsTime += dt;
      if (fpsTime >= 500) {
        fps = Math.round(fpsCount * 1000 / fpsTime);
        fpsCount = 0; fpsTime = 0;
      }
      try { render(); } catch (e) { report('render', e); }
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
