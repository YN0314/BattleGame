// 画面の表示物:体力ゲージ、名前、KO・勝敗の表示。
(function () {
  'use strict';

  const trail = [1, 1];                  // 減ったぶんを遅れて追いかける赤い帯(割合)

  function reset() {
    trail[0] = 1; trail[1] = 1;
  }

  // ゲームの更新1回ごとに呼ぶ(描画の頻度に左右されないようにするため)
  function update(fighters) {
    const speed = Game.Config.display.gauge.trailSpeed;
    const max = Game.Config.game.fighter.maxHealth;
    fighters.forEach(function (f, i) {
      const ratio = f.health / max;
      if (trail[i] > ratio) trail[i] = Math.max(ratio, trail[i] - speed);
      else trail[i] = ratio;
    });
  }

  function res() { return Math.max(1, Math.round(Game.Config.display.pixelScale || 1)); }

  // 上から下へ色が変わる塗り(細かい1行ずつ)
  function gradFill(ctx, x, y, w, h, c1, c2) {
    const R = res(), rows = Math.max(1, Math.round(h * R));
    for (let i = 0; i < rows; i++) {
      const t = rows === 1 ? 0 : i / (rows - 1);
      const m = function (k) { return Math.round(c1[k] + (c2[k] - c1[k]) * t); };
      ctx.fillStyle = 'rgb(' + m(0) + ',' + m(1) + ',' + m(2) + ')';
      ctx.fillRect(x, y + i / R, w, 1 / R);
    }
  }

  function bar(ctx, x, y, w, h, ratio, trailRatio, mirror) {
    const R = res(), px = 1 / R;
    ctx.fillStyle = '#05050a';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#d8d8e6';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#7c7c92';                       // 枠の内側の影
    ctx.fillRect(x - 1, y + h, w + 2, 1);
    ctx.fillStyle = '#3d1016';
    ctx.fillRect(x, y, w, h);

    const tw = Math.round(w * trailRatio * R) / R;
    const fw = Math.round(w * ratio * R) / R;
    const tx = mirror ? x + w - tw : x;
    const fx = mirror ? x + w - fw : x;
    ctx.fillStyle = '#e8503a';
    ctx.fillRect(tx, y, tw, h);
    if (fw > 0) {
      gradFill(ctx, fx, y, fw, h, [255, 240, 130], [226, 150, 30]);   // 体力:上が明るい黄、下がオレンジ
      ctx.fillStyle = 'rgba(255,255,255,0.45)';                     // 上端のつや
      ctx.fillRect(fx, y, fw, px * 2);
    }
    // 目盛り(10%ごとの細い線)
    ctx.fillStyle = 'rgba(5,5,10,0.35)';
    for (let k = 1; k < 10; k++) ctx.fillRect(Math.round((x + w * k / 10) * R) / R, y + h - px * 2, px, px * 2);
  }

  // 勝ち数のしるし(先取り数だけ並べ、取ったぶんを黄色く塗る)
  function pips(ctx, scene) {
    const D = Game.Config.display;
    const g = D.gauge;
    const need = Game.Config.game.round.winsToTake;
    const y = g.top + g.height + 4;
    for (let p = 0; p < 2; p++) {
      for (let k = 0; k < need; k++) {
        // 中央に近い側から外へ並べる
        const x = p === 0 ? D.width / 2 - 14 - k * 8 : D.width / 2 + 8 + k * 8;
        ctx.fillStyle = '#05050a';
        ctx.fillRect(x - 1, y - 1, 8, 8);
        ctx.fillStyle = scene.wins[p] > k ? '#ffe56a' : '#3a3a52';
        ctx.fillRect(x, y, 6, 6);
      }
    }
  }

  // 必殺技ゲージ(画面下の左右)。1本ぶん(segment)ずつ区切り、たまった本数を数字でも出す
  function meterBar(ctx, fighter, mirror) {
    const D = Game.Config.display;
    const M = Game.Config.game.meter;
    const w = 96, h = 6, y = D.height - 15;
    const x = mirror ? D.width - 16 - w : 16;
    const stocks = Math.floor(fighter.meter / M.segment);
    const full = fighter.meter >= M.max;
    const blink = (full || fighter.meterFlash > 0) && Math.floor(Date.now() / 90) % 2 === 0;

    ctx.fillStyle = '#05050a';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#d8d8e6';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#10141f';
    ctx.fillRect(x, y, w, h);

    const fw = Math.round(w * Math.min(1, fighter.meter / M.max));
    const fx = mirror ? x + w - fw : x;
    if (fw > 0) {
      if (blink) { ctx.fillStyle = '#ffffff'; ctx.fillRect(fx, y, fw, h); }
      else if (stocks > 0) gradFill(ctx, fx, y, fw, h, [140, 240, 255], [30, 150, 210]);
      else gradFill(ctx, fx, y, fw, h, [60, 160, 190], [30, 100, 140]);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(fx, y, fw, 1 / res() * 2);
    }

    // 1本ごとの区切り線
    ctx.fillStyle = '#05050a';
    const segs = Math.round(M.max / M.segment);
    for (let k = 1; k < segs; k++) {
      const sx = Math.round(x + w * k / segs);
      ctx.fillRect(sx, y, 1, h);
    }
    Game.Render.Font.draw(ctx, String(stocks), mirror ? x - 6 : x + w + 5, y + 1, 1,
      stocks > 0 ? '#4ae0ff' : '#6a6a80', mirror ? 'right' : 'left', '#05050a');
  }

  // 超必殺技の発動演出:画面を暗くして、技名の帯を流す
  function superFlash(ctx, scene) {
    const D = Game.Config.display;
    const fl = scene.flash;
    const t = fl.frame / fl.len;
    ctx.fillStyle = 'rgba(0,0,12,0.55)';
    ctx.fillRect(0, 0, D.width, D.height);
    const bandY = 74, bandH = 30;
    const slide = Math.max(0, 1 - fl.frame / 8);               // 最初の8フレームで帯が飛び込む
    const dir = fl.owner === 0 ? -1 : 1;
    const ox = Math.round(dir * slide * D.width);
    ctx.fillStyle = fl.owner === 0 ? '#1c2a6a' : '#7a1c10';
    ctx.fillRect(ox, bandY, D.width, bandH);
    ctx.fillStyle = fl.owner === 0 ? '#79c6ff' : '#ffb347';
    ctx.fillRect(ox, bandY, D.width, 2);
    ctx.fillRect(ox, bandY + bandH - 2, D.width, 2);
    Game.Render.Font.draw(ctx, fl.title, D.width / 2 + ox, bandY + 6, 3, '#ffffff', 'center', '#05050a');
    if (t > 0.8) {                                             // 終わり際に白く光る
      ctx.fillStyle = 'rgba(255,255,255,' + ((t - 0.8) * 3).toFixed(2) + ')';
      ctx.fillRect(0, 0, D.width, D.height);
    }
  }

  function timer(ctx, scene) {
    const D = Game.Config.display;
    const sec = scene.seconds();
    const low = sec <= 10 && scene.phase === 'fight' && Math.floor(scene.phaseFrame / 15) % 2 === 0;
    Game.Render.Font.draw(ctx, String(sec).padStart(2, '0'), D.width / 2, D.gauge.top - 1, 2,
      low ? '#ff6a4a' : '#ffffff', 'center', '#05050a');
  }

  // 選択中の項目につける三角(細かい1行ずつ)
  function marker(ctx, x, y, scale) {
    const R = res(), step = 1 / R, h = 5 * scale;
    ctx.fillStyle = '#ffe56a';
    for (let dy = 0; dy < h; dy += step) {
      const t = (dy + step / 2) / h;
      const w = (1 - Math.abs(t * 2 - 1)) * 3 * scale;
      ctx.fillRect(x, y + dy, Math.round(w * R) / R, step);
    }
  }

  function menu(ctx, labels, enabled, index, top, scale) {
    const D = Game.Config.display;
    const Font = Game.Render.Font;
    labels.forEach(function (label, i) {
      const y = top + i * (5 * scale + 8);
      const on = enabled ? enabled[i] : true;
      const color = !on ? '#6a6a80' : (i === index ? '#ffffff' : '#b8b8cc');
      Font.draw(ctx, label, D.width / 2, y, scale, color, 'center', '#05050a');
      if (i === index) {
        const w = Font.measure(label, scale);
        marker(ctx, Math.round(D.width / 2 - w / 2) - 4 * scale - 2, y, scale);
      }
    });
  }

  function draw(ctx, scene) {
    const D = Game.Config.display;
    const g = D.gauge;
    const Font = Game.Render.Font;
    const max = Game.Config.game.fighter.maxHealth;
    const R = Game.Config.game.round;
    const f = scene.fighters;
    const cx = D.width / 2;

    bar(ctx, g.margin, g.top, g.width, g.height, f[0].health / max, trail[0], false);
    bar(ctx, D.width - g.margin - g.width, g.top, g.width, g.height, f[1].health / max, trail[1], true);
    Font.draw(ctx, 'P1', g.margin, g.top + g.height + 5, 1, '#e6e6f2', 'left', '#05050a');
    Font.draw(ctx, 'P2', D.width - g.margin, g.top + g.height + 5, 1, '#e6e6f2', 'right', '#05050a');
    timer(ctx, scene);
    pips(ctx, scene);
    meterBar(ctx, f[0], false);
    meterBar(ctx, f[1], true);

    if (scene.flash) superFlash(ctx, scene);

    if (scene.phase === 'intro') {
      if (scene.phaseFrame < R.roundCallFrames) {
        Font.draw(ctx, 'ROUND ' + scene.roundNo, cx, 66, 5, '#ffffff', 'center', '#1c2a6a');
      } else {
        Font.draw(ctx, 'FIGHT!', cx, 62, 8, '#ffe56a', 'center', '#7a1c10');
      }
    } else if (scene.phase === 'ko') {
      Font.draw(ctx, scene.reason === 'time' ? 'TIME UP' : 'KO!', cx, 56, scene.reason === 'time' ? 6 : 8,
        '#ffe56a', 'center', '#7a1c10');
      if (scene.phaseFrame > 40) {
        const text = scene.winner < 0 ? 'DRAW' : 'P' + (scene.winner + 1) + ' WIN';
        Font.draw(ctx, text, cx, 108, 3, '#ffffff', 'center', '#05050a');
      }
    } else if (scene.phase === 'result') {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, D.width, D.height);
      const text = scene.matchWinner < 0 ? 'DRAW' : 'P' + (scene.matchWinner + 1) + ' WIN';
      Font.draw(ctx, text, cx, 48, 7, '#ffe56a', 'center', '#7a1c10');
      Font.draw(ctx, scene.wins[0] + ' - ' + scene.wins[1], cx, 92, 3, '#ffffff', 'center', '#05050a');
      if (scene.phaseFrame > R.resultLockFrames) {
        menu(ctx, scene.menuItems, null, scene.menuIndex, 122, 2);
      }
    }
  }

  // タイトル画面
  function drawTitle(ctx, scene) {
    const D = Game.Config.display;
    const Font = Game.Render.Font;
    const cx = D.width / 2;

    Font.draw(ctx, 'NIGHT', cx, 22, 8, '#ffe56a', 'center', '#7a1c10');
    Font.draw(ctx, 'FIGHTER', cx, 68, 8, '#ffffff', 'center', '#1c2a6a');

    if (scene.stage === 'press') {
      if (Math.floor(scene.frame / 30) % 2 === 0) {
        Font.draw(ctx, 'PRESS ENTER OR START', cx, 140, 1, '#e6e6f2', 'center', '#05050a');
      }
      Font.draw(ctx, 'PUNCH OR KICK BUTTON ALSO WORKS', cx, 152, 1, '#9a9ab4', 'center', '#05050a');
    } else if (scene.stage === 'level') {
      Font.draw(ctx, 'CPU LEVEL', cx, 122, 1, '#9a9ab4', 'center', '#05050a');
      menu(ctx, scene.levelItems().map(function (it) { return it.label; }), null, scene.levelIndex, 138, 2);
    } else {
      const items = scene.items();
      menu(ctx, items.map(function (it) { return it.label; }),
        items.map(function (it) { return it.enabled; }), scene.index, 126, 2);
      if (!items[1].enabled) {
        Font.draw(ctx, 'CPU SOON', cx, 170, 1, '#6a6a80', 'center', '#05050a');
      }
    }
  }

  Game.Render.UI = { reset: reset, update: update, draw: draw, drawTitle: drawTitle };
})();
