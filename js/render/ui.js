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

  // コマンドの表記:テンキー配置(6=前 4=後ろ 2=下 8=上 3=前下)
  function commandText(m) {
    const C = Game.Config.input.commands, btn = (m.button === 'kick') ? 'K' : 'P';
    if (m.throw && !m.command) return 'P + K';
    const c = C[m.command];
    if (!c) return '';
    if (c.type === 'charge') return 'HOLD ' + c.hold[0] + ' > ' + c.release[0] + ' + ' + btn;
    const seq = c.motions[0].map(function (st) { return st[0]; }).join('');
    return seq + ' + ' + btn;
  }

  // 技の確認(トレーニング)の技リスト
  function drawTrain(ctx, scene) {
    const Font = Game.Render.Font, D = Game.Config.display;
    const list = scene.moveList();
    const x = 4, y = 30, w = 138, rowH = 8, h = 20 + list.length * rowH + 16;
    ctx.fillStyle = 'rgba(5,5,12,0.72)';
    ctx.fillRect(x, y, w, h);
    Font.draw(ctx, 'TRAINING', x + 4, y + 4, 1, '#ffe56a', 'left', null);
    Font.draw(ctx, scene.fighters[0].char.name || '', x + w - 4, y + 4, 1, '#9fb0e8', 'right', null);
    list.forEach(function (it, i) {
      const yy = y + 16 + i * rowH, on = scene.demoName === it.name;
      if (on) { ctx.fillStyle = 'rgba(255,229,106,0.18)'; ctx.fillRect(x + 1, yy - 1, w - 2, rowH); }
      Font.draw(ctx, String((i + 1) % 10), x + 4, yy, 1, '#ffe56a', 'left', null);
      Font.draw(ctx, it.move.label || it.name.toUpperCase(), x + 12, yy, 1, on ? '#ffffff' : '#c8d0f0', 'left', null);
      Font.draw(ctx, commandText(it.move), x + w - 4, yy, 1, on ? '#ffffff' : '#8fa0d8', 'right', null);
    });
    const by = y + 16 + list.length * rowH + 2;
    Font.draw(ctx, 'NUMBER KEY: DEMO   ENTER: BACK', x + 4, by, 1, '#7a86b8', 'left', null);
    Font.draw(ctx, '6 FWD  4 BACK  2 DOWN  8 UP', x + 4, by + 7, 1, '#7a86b8', 'left', null);
  }

  // ポーズ画面:技の一覧(コマンド付き)と、選んだ技の動きの再生
  function drawPause(ctx, scene) {
    const Font = Game.Render.Font, D = Game.Config.display, S = Game.Data.Sprites, RES = res();
    const side = scene.pauseSide, fi = scene.fighters[side], list = scene.moveList(side);
    const sel = list[Math.min(scene.pauseIdx, list.length - 1)], m = sel.move;
    ctx.fillStyle = 'rgba(5,5,14,0.82)'; ctx.fillRect(0, 0, D.width, D.height);
    Font.draw(ctx, 'PAUSE', D.width / 2, 8, 3, '#ffe56a', 'center', '#7a1c10');
    Font.draw(ctx, 'P' + (side + 1) + ' ' + (fi.char.name || ''), D.width / 2, 34, 2, side ? '#4a8aff' : '#ff4a3a', 'center', '#05050a');
    // 一覧
    const x = 8, y = 56, w = 176, rowH = 11;
    ctx.fillStyle = 'rgba(30,34,70,0.7)'; ctx.fillRect(x, y - 4, w, list.length * rowH + 8);
    list.forEach(function (it, i) {
      const yy = y + i * rowH, on = it === sel;
      if (on) { ctx.fillStyle = 'rgba(255,229,106,0.25)'; ctx.fillRect(x + 1, yy - 2, w - 2, rowH); }
      Font.draw(ctx, it.move.label || it.name.toUpperCase(), x + 5, yy, 1, on ? '#ffffff' : '#a8b0d8', 'left', null);
      Font.draw(ctx, commandText(it.move), x + w - 5, yy, 1, on ? '#ffe56a' : '#7f8ac0', 'right', null);
    });
    // 動きの再生(技の時間どおりに、終わったら少し止めて繰り返す)
    const ax = 290, ay = 150;
    ctx.fillStyle = 'rgba(30,34,70,0.7)'; ctx.fillRect(196, 52, 180, 130);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(200, ay + 1, 172, 1);
    let name = m.pose || sel.name, frame = 0;
    if (m.throw || m.hitFrame !== undefined) {
      const at = m.poseAt || [0, m.hitFrame, m.hitFrame + 10], total = at[2] + 18, t = scene.pauseT % (total + 20);
      at.forEach(function (st, i) { if (t >= st) frame = i; });
    } else {
      const total = m.startup + (m.active || 0) + (m.recovery || 0), t = Math.min(scene.pauseT % (total + 24), total);
      const xx = t < m.startup ? t / Math.max(1, m.startup) : 1;
      frame = xx * xx;
      if (t >= m.startup + (m.active || 0)) {
        const r = (t - m.startup - (m.active || 0)) / Math.max(1, m.recovery || 1), e = Math.min(1, r * 1.5);
        frame = 1 + e * e * (3 - 2 * e);
      }
    }
    const img = S.get(name, frame, fi.palette, fi.char.sprite), k = 1.5;
    const ox = img.originX !== undefined ? img.originX : S.originX, oy = img.originY !== undefined ? img.originY : S.originY;
    ctx.drawImage(img, ax - ox / RES * k, ay - oy / RES * k, img.width / RES * k, img.height / RES * k);
    // 数値
    const st = [];
    if (m.damage !== undefined) st.push('DMG ' + m.damage);
    else if (m.projectile) st.push('DMG ' + m.projectile.damage);
    if (m.startup !== undefined) st.push('START ' + m.startup);
    if (m.active) st.push('ACTIVE ' + m.active);
    if (m.recovery) st.push('RECOVER ' + m.recovery);
    if (m.cost) st.push('GAUGE ' + m.cost);
    Font.draw(ctx, st.join('  '), 286, 164, 1, '#c8d0f0', 'center', null);
    Font.draw(ctx, 'UP DOWN: MOVE   LEFT RIGHT: PLAYER   ENTER: RESUME', D.width / 2, 192, 1, '#9fb0e8', 'center', '#05050a');
  }

  function draw(ctx, scene) {
    const D = Game.Config.display;
    const g = D.gauge;
    const Font = Game.Render.Font;
    const max = Game.Config.game.fighter.maxHealth;
    const R = Game.Config.game.round;
    const f = scene.fighters;
    const cx = D.width / 2;

    if (scene.train) { drawTrain(ctx, scene); }
    bar(ctx, g.margin, g.top, g.width, g.height, f[0].health / max, trail[0], false);
    bar(ctx, D.width - g.margin - g.width, g.top, g.width, g.height, f[1].health / max, trail[1], true);
    Font.draw(ctx, 'P1', g.margin, g.top + g.height + 5, 1, '#e6e6f2', 'left', '#05050a');
    Font.draw(ctx, 'P2', D.width - g.margin, g.top + g.height + 5, 1, '#e6e6f2', 'right', '#05050a');
    if (!scene.train) { timer(ctx, scene); pips(ctx, scene); }
    meterBar(ctx, f[0], false);
    meterBar(ctx, f[1], true);

    if (scene.combo) {                     // コンボ表示(攻撃した側の画面端に出す)
      const c = scene.combo, left = c.owner === 0;
      const x = left ? 12 : D.width - 12, al = left ? 'left' : 'right';
      Font.draw(ctx, c.hits + ' HITS', x, 62, 3, '#ffe56a', al, '#7a1c10');
      Font.draw(ctx, 'DMG ' + c.damage, x, 84, 1, '#ffffff', al, '#05050a');
    }

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
    if (scene.paused) drawPause(ctx, scene);
  }

  // ロゴ:押し出し(影を重ねる)+ 光の帯が横切る
  function logo(ctx, text, cx, y, scale, face, edge, deep, t, phase) {
    const Font = Game.Render.Font;
    for (let k = 4; k >= 1; k--) Font.draw(ctx, text, cx, y + k, scale, deep, 'center', null);        // 厚み
    Font.draw(ctx, text, cx, y, scale, face, 'center', edge);
    // 光の帯(ロゴの上だけ明るくする)
    const w = Font.measure(text, scale), left = cx - w / 2;
    const sx = left - 30 + ((t * 2 + phase) % (w + 120));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sx, y - 4); ctx.lineTo(sx + 12, y - 4); ctx.lineTo(sx - 6, y + scale * 5 + 6); ctx.lineTo(sx - 18, y + scale * 5 + 6);
    ctx.clip();
    Font.draw(ctx, text, cx, y, scale, '#ffffff', 'center', null);
    ctx.restore();
  }

  // タイトル画面(ストリートファイター2風:ロゴ → PRESS START → メニュー)
  function drawTitle(ctx, scene) {
    const D = Game.Config.display;
    const Font = Game.Render.Font;
    const cx = D.width / 2, t = scene.frame || 0;

    // 上は暗くしてロゴを読みやすく、下は文字のために少し暗くする
    const g = ctx.createLinearGradient(0, 0, 0, D.height);
    g.addColorStop(0, 'rgba(5,6,20,0.78)'); g.addColorStop(0.5, 'rgba(5,6,20,0.25)'); g.addColorStop(1, 'rgba(5,6,20,0.6)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, D.width, D.height);

    logo(ctx, 'NIGHT', cx, 18, 8, '#ffe56a', '#7a1c10', '#b0361c', t, 0);
    logo(ctx, 'FIGHTER', cx, 64, 8, '#ffffff', '#1c2a6a', '#3a56b8', t, 60);

    if (scene.stage === 'press') {
      if (Math.floor(t / 30) % 2 === 0) {
        Font.draw(ctx, 'PRESS START BUTTON', cx, 144, 2, '#ffffff', 'center', '#05050a');
      }
      Font.draw(ctx, 'ENTER OR ANY BUTTON', cx, 166, 1, '#9a9ab4', 'center', '#05050a');
      Font.draw(ctx, 'PROTOTYPE VERSION', cx, D.height - 12, 1, '#6a6a88', 'center', '#05050a');
    } else if (scene.stage === 'level') {
      Font.draw(ctx, 'CPU LEVEL', cx, 122, 1, '#9a9ab4', 'center', '#05050a');
      menu(ctx, scene.levelItems().map(function (it) { return it.label; }), null, scene.levelIndex, 138, 2);
    } else {
      const items = scene.items();
      menu(ctx, items.map(function (it) { return it.label; }),
        items.map(function (it) { return it.enabled; }), scene.index, 126, 2);
      if (!items[0].enabled) {
        Font.draw(ctx, 'CPU SOON', cx, 170, 1, '#6a6a80', 'center', '#05050a');
      }
    }
  }

  Game.Render.UI = { reset: reset, update: update, draw: draw, drawTitle: drawTitle };
})();
