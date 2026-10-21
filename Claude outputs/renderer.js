// 描画。ゲームの状態を読んで画面に出すだけで、状態は変更しない。
// 座標はゲーム内の単位(width x height)で描き、pixelScale 倍の細かさのキャンバスに拡大して出す。
(function () {
  'use strict';

  let canvas, ctx, background, RES = 1;

  function init(cv) {
    const D = Game.Config.display;
    RES = Math.max(1, Math.round(D.pixelScale || 1));
    canvas = cv;
    canvas.width = D.width * RES;
    canvas.height = D.height * RES;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    background = Game.Render.Background.build();
    fit();
    window.addEventListener('resize', fit);
  }

  // 画面に収まる最大の「整数倍」で拡大する(にじみ防止)
  function fit() {
    const D = Game.Config.display;
    const cw = D.width * RES, ch = D.height * RES;
    const maxW = Math.max(cw, document.documentElement.clientWidth - 40);
    const maxH = Math.max(ch, window.innerHeight - 90);
    const scale = Math.max(1, Math.min(D.maxScale, Math.floor(maxW / cw), Math.floor(maxH / ch)));
    canvas.style.width = (cw * scale) + 'px';
    canvas.style.height = (ch * scale) + 'px';
  }

  function drawFighter(f) {
    const S = Game.Data.Sprites;
    const D = Game.Config.display;
    // 細かい1マス(1/RES)の単位にそろえて置く
    const px = Math.round(f.x * RES) / RES, py = Math.round(f.y * RES) / RES;

    // 影:高く跳ぶほど小さくなる
    const air = D.floorY - f.y;
    const sw = Math.max(10, 24 - Math.floor(air / 6));
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(Math.round(f.x) - Math.floor(sw / 2), D.floorY - 1, sw, 3);

    const pose = f.pose();
    const img = S.get(pose.name, pose.frame, f.palette);
    ctx.save();
    ctx.translate(px, py);
    if (f.facing < 0) ctx.scale(-1, 1);     // 左向きは反転
    ctx.drawImage(img, -S.originX / RES, -S.originY / RES, img.width / RES, img.height / RES);
    ctx.restore();
  }

  // 楕円を1マスずつ塗る(ドットの細かさにそろえる)
  function disc(cx, cy, rx, ry, color) {
    const step = 1 / RES;
    ctx.fillStyle = color;
    for (let dy = -ry; dy < ry; dy += step) {
      const t = (dy + step / 2) / ry;
      const hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - t * t)) * RES) / RES;
      ctx.fillRect(cx - hw, cy + dy, hw * 2, step);
    }
  }

  // 飛び道具:青い気の玉と、後ろへ伸びる尾
  function drawProjectile(p) {
    const cx = Math.round(p.x * RES) / RES, cy = Math.round(p.y * RES) / RES;
    const pulse = (Math.floor(p.age / 3) % 2) * 0.6;
    for (let k = 3; k >= 1; k--) {
      disc(cx - p.dir * k * 5, cy, 5 - k * 0.9, 4.4 - k * 0.9, k === 1 ? '#3f6dff' : '#2a4fd0');
    }
    disc(cx, cy, 8 + pulse, 6.4 + pulse * 0.6, '#2f5fff');
    disc(cx, cy, 6, 4.9, '#79c6ff');
    disc(cx, cy, 3.4, 2.9, '#ffffff');
  }

  // デバッグ用:喰らい判定(青)と攻撃判定(赤)を描く
  function drawBoxes(f) {
    const C = Game.Logic.Combat;
    const hr = C.hurtRect(f);
    ctx.strokeStyle = f.vulnerable ? '#4aa8ff' : '#4a6a88';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(hr.x) + 0.5, Math.round(hr.y) + 0.5, hr.w - 1, hr.h - 1);
    if (f.attackActive) {
      const ar = C.attackRect(f);
      ctx.fillStyle = 'rgba(255,60,60,0.55)';
      ctx.fillRect(Math.round(ar.x), Math.round(ar.y), ar.w, ar.h);
    }
  }

  function draw(scene) {
    const D = Game.Config.display;
    const off = Game.Render.Effects.offset();

    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, D.width, D.height);

    ctx.save();
    ctx.translate(off.x, off.y);
    ctx.drawImage(background, 0, 0);
    scene.fighters.forEach(drawFighter);
    const shots = Game.Logic.Projectile.list();
    shots.forEach(drawProjectile);
    if (Game.Core.Debug.showBoxes()) {
      scene.fighters.forEach(drawBoxes);
      shots.forEach(function (p) {
        const r = p.rect();
        ctx.fillStyle = 'rgba(255,60,60,0.45)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
      });
    }
    Game.Render.Effects.draw(ctx);
    ctx.restore();

    // 表示物は揺らさない
    if (scene.view === 'title') Game.Render.UI.drawTitle(ctx, scene);
    else Game.Render.UI.draw(ctx, scene);
  }

  Game.Render.Renderer = { init: init, draw: draw };
})();
