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

  function bar(ctx, x, y, w, h, ratio, trailRatio, mirror) {
    ctx.fillStyle = '#05050a';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = '#d8d8e6';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#3d1016';
    ctx.fillRect(x, y, w, h);

    const tw = Math.round(w * trailRatio);
    const fw = Math.round(w * ratio);
    const tx = mirror ? x + w - tw : x;
    const fx = mirror ? x + w - fw : x;
    ctx.fillStyle = '#e8503a';
    ctx.fillRect(tx, y, tw, h);
    ctx.fillStyle = '#ffe56a';
    ctx.fillRect(fx, y, fw, Math.ceil(h / 2));
    ctx.fillStyle = '#e8a82a';
    ctx.fillRect(fx, y + Math.ceil(h / 2), fw, Math.floor(h / 2));
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

  function timer(ctx, scene) {
    const D = Game.Config.display;
    const sec = scene.seconds();
    const low = sec <= 10 && scene.phase === 'fight' && Math.floor(scene.phaseFrame / 15) % 2 === 0;
    Game.Render.Font.draw(ctx, String(sec).padStart(2, '0'), D.width / 2, D.gauge.top - 1, 2,
      low ? '#ff6a4a' : '#ffffff', 'center', '#05050a');
  }

  // 選択中の項目につける三角
  function marker(ctx, x, y, scale) {
    const w = [1, 2, 3, 2, 1];
    ctx.fillStyle = '#ffe56a';
    for (let r = 0; r < 5; r++) ctx.fillRect(x, y + r * scale, w[r] * scale, scale);
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
