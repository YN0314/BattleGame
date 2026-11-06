// キャラクターの顔・上半身の絵(選択画面とVS画面で使う)。
// ゲーム中の立ち絵(待機ポーズ)を切り出して拡大する。専用の絵を用意しなくても、キャラを足せばそのまま出る。
(function () {
  'use strict';

  function res() { return Math.max(1, Math.round(Game.Config.display.pixelScale || 1)); }

  // id のキャラの待機ポーズ(画像)。palette は 0:1P色 / 1:2P色
  function sprite(id, palette) {
    const ch = Game.Logic.Character.get(id);
    return Game.Data.Sprites.get('idle', 0, palette || 0, ch.sprite);
  }

  // 箱 (x,y,w,h) の中に、絵の上から frac(0〜1)の部分を収まるように描く(下端をそろえる)。flip で左右反転
  function draw(ctx, id, palette, x, y, w, h, frac, flip) {
    const img = sprite(id, palette);
    if (!img) return;
    const sh = Math.max(1, Math.round(img.height * frac));
    const k = Math.min(w / img.width, h / sh);            // 画像1ドットを何単位で描くか
    const dw = img.width * k, dh = sh * k;
    const dx = x + (w - dw) / 2, dy = y + h - dh;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (flip) { ctx.translate(dx + dw / 2, 0); ctx.scale(-1, 1); ctx.translate(-(dx + dw / 2), 0); }
    ctx.drawImage(img, 0, 0, img.width, sh, dx, dy, dw, dh);
    ctx.restore();
  }

  // シート絵:画素は読めない(file:// だと禁止される)ので、足元の位置からの目安で頭の辺りを拡大して切り出す
  function sheetFace(ctx, img, x, y, w, h) {
    const S = Game.Data.Sprites;
    const ox = img.originX !== undefined ? img.originX : img.width / 2, oy = img.originY !== undefined ? img.originY : img.height;
    const u = img.height / 128;                                   // 1ドット(シートの素の大きさ128基準)
    const cw = 44 * u * (w / h > 1 ? w / h : 1), chh = 44 * u * (w / h < 1 ? h / w : 1);
    const sx = ox + 2 * u - cw / 2, sy = oy - 86 * u - chh / 2;   // 頭の中心は足元から約86ドット上
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, sy, cw, chh, x, y, w, h);
    ctx.restore();
  }

  Game.Render.Portrait = {
    bust: function (ctx, id, palette, x, y, w, h, flip) { draw(ctx, id, palette, x, y, w, h, 0.62, flip); },   // 上半身
    // 顔:頭の関節の位置を中心に切り出す(絵の大きさや余白が違うキャラでも、顔が真ん中に来る)
    face: function (ctx, id, palette, x, y, w, h) {
      const ch = Game.Logic.Character.get(id), S = Game.Data.Sprites, look = Game.Data.Looks[ch.sprite];
      const img = sprite(id, palette);
      if (!img) return;
      if (!look || look.style === 'sheet' || !S.joints) { sheetFace(ctx, img, x, y, w, h); return; }
      const R = res(), J = S.joints('idle', 0);
      const ox = img.originX !== undefined ? img.originX : S.originX, oy = img.originY !== undefined ? img.originY : S.originY;
      const cw = 26 * R, chh = 30 * R;                             // 切り出す大きさ(単位26×30)
      const sx = Math.round(ox + J.head[0] * R - cw / 2 + 1.5 * R), sy = Math.round(oy + J.head[1] * R - chh * 0.42);
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.imageSmoothingEnabled = false;
      const k = Math.max(w / cw, h / chh);
      ctx.drawImage(img, sx, sy, cw, chh, x + (w - cw * k) / 2, y + (h - chh * k) / 2, cw * k, chh * k);
      ctx.restore();
    }
  };
})();
