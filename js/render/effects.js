// 演出:ヒット火花と画面揺れ。ゲームの判定には影響しない。
(function () {
  'use strict';

  const sparks = [];
  let shakeMag = 0;
  let shakeLeft = 0;

  const RADII = [3, 6, 8, 8, 7, 5, 4, 2];

  function reset() {
    sparks.length = 0;
    shakeMag = 0;
    shakeLeft = 0;
  }

  function spawnHit(x, y, strong) {
    sparks.push({ x: x, y: y, age: 0, strong: !!strong });
    shake(Game.Config.display.effects.shakeHit, Game.Config.display.effects.shakeFrames);
  }

  // ガード火花:小さく青白い。画面は揺らさない
  function spawnGuard(x, y) {
    sparks.push({ x: x, y: y, age: 0, guard: true });
  }

  function shake(mag, frames) {
    shakeMag = mag;
    shakeLeft = frames;
  }

  function update() {
    for (let i = sparks.length - 1; i >= 0; i--) {
      sparks[i].age++;
      if (sparks[i].age >= Game.Config.display.effects.sparkFrames) sparks.splice(i, 1);
    }
    if (shakeLeft > 0) shakeLeft--;
  }

  function res() { return Math.max(1, Math.round(Game.Config.display.pixelScale || 1)); }

  // 画面揺れの現在のずれ(細かい1マス単位に丸める)
  function offset() {
    if (shakeLeft <= 0) return { x: 0, y: 0 };
    const m = shakeMag, R = res();
    return {
      x: Math.round((Math.random() * 2 - 1) * m * R) / R,
      y: Math.round((Math.random() * 2 - 1) * m * R) / R
    };
  }

  // 4方向にとがった星を、細かい1マスずつ塗る。r=とがりの長さ、t=根元の太さ
  function star(ctx, cx, cy, r, t, color) {
    const R = res(), step = 1 / R;
    cx = Math.round(cx * R) / R;
    cy = Math.round(cy * R) / R;
    ctx.fillStyle = color;
    for (let dy = -r; dy < r; dy += step) {
      const ay = Math.abs(dy + step / 2);
      let runStart = null;
      for (let dx = -r; dx <= r + step / 2; dx += step) {
        const ax = Math.abs(dx + step / 2);
        const m = Math.max(ax, ay), n = Math.min(ax, ay);
        const inside = dx < r && m <= r && n <= t * 0.5 + (r - m) * 0.2;
        if (inside && runStart === null) runStart = dx;
        if (!inside && runStart !== null) {
          ctx.fillRect(cx + runStart, cy + dy, dx - runStart, step);
          runStart = null;
        }
      }
    }
  }

  function draw(ctx) {
    sparks.forEach(function (s) {
      const r = RADII[Math.min(s.age, RADII.length - 1)];
      const x = s.x, y = s.y;
      if (s.guard) {
        // 細い青白い火花
        star(ctx, x, y, Math.max(2, r * 0.7), 1.2, '#9fd8ff');
        if (s.age < 4) star(ctx, x, y, 1.6, 2.6, '#ffffff');
        return;
      }
      star(ctx, x, y, r + 0.5, s.strong ? 3.4 : 2.8, s.strong ? '#ff9a4a' : '#fff0a0');
      // 斜めの小さな火花
      const d = r * 0.62;
      [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(function (v) {
        star(ctx, x + v[0] * d, y + v[1] * d, Math.max(1, r * 0.28), 1.0, s.strong ? '#ff9a4a' : '#fff0a0');
      });
      if (s.age < 5) star(ctx, x, y, 3, 4, '#ffffff');
    });
  }

  Game.Render.Effects = {
    reset: reset, spawnHit: spawnHit, spawnGuard: spawnGuard, shake: shake,
    update: update, offset: offset, draw: draw
  };
})();
