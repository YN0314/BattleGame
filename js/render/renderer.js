// 描画。ゲームの状態を読んで画面に出すだけで、状態は変更しない。
// 座標はゲーム内の単位(width x height)で描き、pixelScale 倍の細かさのキャンバスに拡大して出す。
(function () {
  'use strict';

  let canvas, ctx, background, RES = 1, stageIds = [], stageIdx = 0, backgrounds = {};
  function stageBackground() {
    const id = stageIds[stageIdx];
    return backgrounds[id] || (backgrounds[id] = Game.Render.Background.buildStage(id));
  }

  function init(cv) {
    const D = Game.Config.display;
    RES = Math.max(1, Math.round(D.pixelScale || 1));
    canvas = cv;
    canvas.width = D.width * RES;
    canvas.height = D.height * RES;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    stageIds = Object.keys(D.stage.list || { night: {} });
    stageIdx = Math.max(0, stageIds.indexOf(D.stage.id));
    backgrounds = {};
    background = stageBackground();
    window.addEventListener('keydown', function (e) {       // B: ステージ切り替え
      if (e.code === 'KeyB' && !e.repeat) { stageIdx = (stageIdx + 1) % stageIds.length; background = stageBackground(); }
    });
    fit();
    window.addEventListener('resize', fit);
  }

  // 画面に収まる最大の「整数倍」で拡大する(にじみ防止)
  function fit() {
    const D = Game.Config.display;
    const cw = D.width * RES, ch = D.height * RES;
    const maxW = document.documentElement.clientWidth - 40;
    const maxH = window.innerHeight - 90;
    // ウィンドウに収まる最大の倍率(細かい描画なので、小数の倍率でもきれいに見える)
    let scale = Math.min(D.maxScale, maxW / cw, maxH / ch);
    // 整数倍にできるときは整数倍(にじみ・ゆがみが出ない)。それ以外はなめらかに縮小する
    const whole = Math.floor(scale);
    if (whole >= 1 && scale - whole < 0.15) scale = whole;
    scale = Math.max(0.25, scale);
    canvas.style.width = Math.round(cw * scale) + 'px';
    canvas.style.height = Math.round(ch * scale) + 'px';
    canvas.style.imageRendering = (scale >= 1 && scale === Math.floor(scale)) ? 'pixelated' : 'auto';
  }

  function drawFighter(f) {
    const S = Game.Data.Sprites;
    const D = Game.Config.display;
    // 細かい1マス(1/RES)の単位にそろえて置く
    const px = Math.round(f.x * RES) / RES, py = Math.round(f.y * RES) / RES;

    // 影:高く跳ぶほど小さくなる
    const air = D.floorY - f.y;
    const sw = Math.max(10, 24 - Math.floor(air / 6));
    disc(Math.round(f.x * RES) / RES, D.floorY + 0.5, sw / 2, 1.6, 'rgba(0,0,0,0.35)');

    const pose = f.pose();
    const img = S.get(pose.name, pose.frame, f.palette, f.char.sprite);
    ctx.save();
    ctx.translate(px, py);
    if (f.facing < 0) ctx.scale(-1, 1);     // 左向きは反転
    const ox = img.originX !== undefined ? img.originX : S.originX;       // 画像の見た目は、コマごとに足元の位置が違う
    const oy = img.originY !== undefined ? img.originY : S.originY;
    ctx.drawImage(img, -ox / RES, -oy / RES, img.width / RES, img.height / RES);
    ctx.restore();

    // 気絶:頭の上を星が回る
    if (f.state === 'dizzy') {
      const t = Date.now() / 90;
      for (let k = 0; k < 3; k++) {
        const a = t + k * 2.094;
        const sx = Math.round((f.x + Math.cos(a) * 10) * RES) / RES;
        const sy = Math.round((f.y - 56 + Math.sin(a) * 3) * RES) / RES;
        ctx.fillStyle = '#05050a';
        ctx.fillRect(sx - 3.5, sy - 1, 7, 2); ctx.fillRect(sx - 1, sy - 3.5, 2, 7);
        ctx.fillStyle = '#ffe56a';
        ctx.fillRect(sx - 3, sy - 0.5, 6, 1); ctx.fillRect(sx - 0.5, sy - 3, 1, 6);
      }
    }

    // ため完了の合図:頭の上に小さな印(ため技ごとに色が違う)
    if (f.chargeReady && f.chargeReady.length && Math.floor(Date.now() / 120) % 3 !== 2) {
      f.chargeReady.forEach(function (name, i) {
        const cx = Math.round(f.x) - (f.chargeReady.length - 1) * 3 + i * 6;
        const cy = Math.round(f.y) - f.height - 8;
        ctx.fillStyle = '#05050a';
        ctx.fillRect(cx - 3, cy - 1, 6, 5);
        ctx.fillStyle = name === 'flashkick' ? '#ff9a4a' : '#ffe56a';
        ctx.fillRect(cx - 2, cy, 4, 3);
      });
    }
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
  // 書類(紙)・カバンの飛び道具
  function drawThrown(p, cx, cy) {
    const s = p.def.big ? 2.1 : 1;
    const rect = function (x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x * RES) / RES, Math.round(y * RES) / RES, Math.round(w * RES) / RES, Math.round(h * RES) / RES); };
    if (p.def.look === 'case') {
      const bob = Math.floor(p.age / 4) % 2 ? 0.5 : 0;
      rect(cx - 9, cy - 6 + bob, 18, 12, '#1a1a1a');
      rect(cx - 8, cy - 5 + bob, 16, 10, '#6b4a2a');
      rect(cx - 8, cy - 5 + bob, 16, 3, '#8a6238');
      rect(cx - 3, cy - 9 + bob, 6, 3, '#1a1a1a');
      rect(cx - 2, cy - 8 + bob, 4, 1.5, '#6b4a2a');
      rect(cx - 1, cy - 1 + bob, 2, 2.5, '#e8c24a');
      return;
    }
    // paper: 紙が何枚か、向きをくるくる変えながら飛ぶ
    const n = p.def.big ? 7 : 3;
    for (let i = 0; i < n; i++) {
      const ph = (p.age + i * 5) % 12;
      const w = ph < 6 ? 8 - ph : ph - 4, h = 10 - Math.abs(ph - 6) * 0.3;
      const ox = -p.dir * i * 4.5 * s * (p.def.big ? 1.2 : 1) + (i % 2 ? 0 : 1), oy = Math.sin((p.age + i * 3) * 0.5) * 3 * s + (i - n / 2) * (p.def.big ? 4 : 2);
      const x = cx + ox - (w * s) / 2, y = cy + oy - (h * s) / 2 * 0.8;
      rect(x - 0.5, y - 0.5, w * s + 1, h * s * 0.8 + 1, '#1a1f2e');
      rect(x, y, w * s, h * s * 0.8, '#f4f6fb');
      if (w > 4) { rect(x + 1, y + 1.5 * s, (w - 2) * s, 0.7, '#8892a8'); rect(x + 1, y + 3.5 * s, (w - 3) * s, 0.7, '#8892a8'); }
    }
  }

  function drawProjectile(p) {
    const cx = Math.round(p.x * RES) / RES, cy = Math.round(p.y * RES) / RES;
    if (p.def.look) { drawThrown(p, cx, cy); return; }
    const pulse = (Math.floor(p.age / 3) % 2) * 0.6;
    const s = p.def.big ? 2.1 : 1;                  // 超必殺技の飛び道具は大きく
    const col = p.def.big ? ['#ff7a2a', '#ff5a1a', '#ffb347', '#fff2a8', '#ffffff'] : ['#3f6dff', '#2a4fd0', '#2f5fff', '#79c6ff', '#ffffff'];
    for (let k = 3; k >= 1; k--) {
      disc(cx - p.dir * k * 5 * s, cy, (5 - k * 0.9) * s, (4.4 - k * 0.9) * s, k === 1 ? col[0] : col[1]);
    }
    disc(cx, cy, (8 + pulse) * s, (6.4 + pulse * 0.6) * s, col[2]);
    disc(cx, cy, 6 * s, 4.9 * s, col[3]);
    disc(cx, cy, 3.4 * s, 2.9 * s, col[4]);
  }

  // デバッグ用:喰らい判定(青)と攻撃判定(赤)を描く
  function drawBoxes(f) {
    const C = Game.Logic.Combat;
    ctx.strokeStyle = f.vulnerable ? '#4aa8ff' : '#4a6a88';
    ctx.lineWidth = 0.5;
    C.hurtRects(f).forEach(function (hr) {
      ctx.strokeRect(Math.round(hr.x) + 0.25, Math.round(hr.y) + 0.25, hr.w - 0.5, hr.h - 0.5);
    });
    if (f.attackActive) {
      const ar = C.attackRect(f);
      ctx.fillStyle = 'rgba(255,60,60,0.55)';
      ctx.fillRect(Math.round(ar.x), Math.round(ar.y), ar.w, ar.h);
    }
  }

  // ステージを選ぶ(対戦の開始時に、1Pのキャラのステージへ切り替える)
  function setStage(id) {
    const i = stageIds.indexOf(id);
    if (i < 0) return;
    stageIdx = i; background = stageBackground();
  }
  // 指定したステージの背景(選択画面の予告などに使う)
  function backgroundOf(id) {
    return backgrounds[id] || (backgrounds[id] = Game.Render.Background.buildStage(id));
  }

  function draw(scene) {
    const D = Game.Config.display;
    if (scene.drawScreen) {                       // 選択画面・VS画面など、シーン自身が画面全体を描くもの
      ctx.setTransform(RES, 0, 0, RES, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, D.width, D.height);
      scene.drawScreen(ctx);
      return;
    }
    const off = Game.Render.Effects.offset();

    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, D.width, D.height);

    ctx.save();
    ctx.translate(off.x, off.y);
    let mid = D.width / 2;                       // 背景の視差は、戦っている2人の中間の位置に合わせる
    if (scene.fighters && scene.fighters.length === 2) mid = (scene.fighters[0].x + scene.fighters[1].x) / 2;
    background.draw(ctx, mid, performance.now());
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

  Game.Render.Renderer = { init: init, draw: draw, setStage: setStage, backgroundOf: backgroundOf };
})();
