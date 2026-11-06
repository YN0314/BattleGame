// ステージ「繁華街の交差点」の背景。駅前のカラオケ店がある交差点の写真をもとに、形をデフォルメして自動で描く(写真は使わない)。
// 看板の文字は実在の店名ではなく、一般名詞の「カラオケ」を線で描いた文字。
// 青空、立ち並ぶ雑居ビルとガラス張りのビル、赤いネオン看板と青い縦看板、電柱と標識、植え込みの柵、赤い舗装の道路。
//   視差 : 空・遠景・ビル・電柱と街路樹が、奥ほど小さくずれる(歩道から手前は動かない)
//   動き : 流れる雲、ネオンの明滅、歩く人、遠くの道を走る車
//   設定 : display.config.js の stage.list.karaoke
(function () {
  'use strict';

  function rng(seed) {
    let s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  // 文字を線で描く(カ ラ オ ケ)。座標は 0〜1 の正方形
  const GLYPH = {
    'カ': [[.1, .32, .86, .32], [.86, .32, .78, .9], [.42, .05, .36, .5], [.36, .5, .1, .95]],
    'ラ': [[.25, .1, .75, .1], [.1, .42, .9, .42], [.9, .42, .62, .95], [.1, .42, .1, .62]],
    'オ': [[.1, .35, .9, .35], [.5, .05, .5, .95], [.45, .5, .1, .9], [.72, .18, .86, .3]],
    'ケ': [[.35, .05, .15, .4], [.12, .4, .86, .4], [.56, .4, .4, .95]]
  };
  function glyph(ctx, ch, x, y, s, lw, color) {
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    GLYPH[ch].forEach(function (l) { ctx.moveTo(x + l[0] * s, y + l[1] * s); ctx.lineTo(x + l[2] * s, y + l[3] * s); });
    ctx.stroke();
  }

  function build() {
    const D = Game.Config.display;
    const R = Math.max(1, Math.round(D.pixelScale || 1));
    const W = D.width, H = D.height;
    const ST = D.stage || { parallax: 14, animate: true };
    const M = Math.ceil(ST.parallax);
    const rand = rng(31);
    const X0 = -M, X1 = W + M;
    const PLAZA = 118, CURB = 168, ROAD = 174;
    const SX = 100, SY = 66, SW = 150, SH = 20;           // 赤いネオン看板の位置

    function layer() {
      const c = document.createElement('canvas');
      c.width = (W + 2 * M) * R; c.height = H * R;
      const x = c.getContext('2d');
      x.scale(R, R); x.translate(M, 0);
      return { cv: c, ctx: x };
    }
    const skyL = layer(), farL = layer(), bldgL = layer(), propL = layer(), groundL = layer(), fenceL = layer();
    let ctx;
    const q = function (v) { return Math.round(v * R) / R; };
    const rect = function (x, y, w, h) { ctx.fillRect(q(x), q(y), Math.max(1 / R, q(w)), Math.max(1 / R, q(h))); };
    const fill = function (c) { ctx.fillStyle = c; };

    // ---- 空 ----
    ctx = skyL.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, PLAZA);
    g.addColorStop(0, '#4f9be0'); g.addColorStop(1, '#bfe0f4');
    ctx.fillStyle = g; ctx.fillRect(X0, 0, X1 - X0, PLAZA + 4);

    // ---- 遠景(右へ遠ざかる街並み)----
    ctx = farL.ctx;
    const far = [[290, 22, 26, '#c9ccd2'], [316, 34, 18, '#d9d4c8'], [334, 14, 16, '#b8bcc4'], [350, 40, 22, '#d6d2c6'], [372, 6, 28, '#c4c8d0']];
    far.forEach(function (b) {
      fill(b[3]); rect(b[0], b[1] + 30, b[2], PLAZA - b[1] - 30);
      fill('rgba(60,70,90,0.18)'); for (let y = b[1] + 34; y < PLAZA - 6; y += 6) rect(b[0] + 2, y, b[2] - 4, 2.4);
    });
    fill('#2e9a5a'); rect(322, 56, 22, 8); fill('#ffffff'); rect(325, 59, 16, 1.4); rect(325, 61.5, 12, 1.4);        // 遠くの緑の看板(文字なしの帯)
    fill('#2a6fc0'); rect(368, 48, 20, 10); fill('#ffffff'); rect(371, 51, 14, 1.4);

    // ---- ビル ----
    ctx = bldgL.ctx;
    // 左の茶色いマンション
    fill('#c9b49a'); rect(X0, 0, 62, PLAZA - 0);
    fill('#a8947a'); for (let y = 8; y < PLAZA - 14; y += 14) rect(X0, y, 62, 2.4);                       // バルコニーの帯
    fill('#5a5a64'); for (let y = 12; y < PLAZA - 16; y += 14) for (let x = X0 + 4; x < 56; x += 11) rect(x, y, 6, 8);
    fill('#7a6a58'); rect(48, 0, 4, PLAZA);
    // 灰色の段々ビル
    fill('#a7a9ae'); rect(52, 4, 52, PLAZA - 4);
    fill('#8c8f96'); for (let y = 10; y < 96; y += 9) rect(52, y, 52, 3.2);
    fill('#c3c5c9'); for (let y = 8; y < 96; y += 9) rect(52, y, 52, 1);
    // 赤い小さなビル(左の電柱の奥)
    fill('#c43a36'); rect(60, 70, 24, 48); fill('#f4e6e2'); rect(64, 76, 16, 5); fill('#2f2f38'); rect(64, 90, 16, 24);
    // ガラス張りのカラオケビル(中央)
    fill('#d8d2c4'); rect(SX - 6, 0, SW + 12, SY);                                                       // ベージュの外枠
    const gl = ctx.createLinearGradient(0, 0, 0, SY);
    gl.addColorStop(0, '#9fc2dc'); gl.addColorStop(1, '#7fa6c4');
    ctx.fillStyle = gl; ctx.fillRect(SX, 4, SW, SY - 6);
    fill('#d8d2c4'); for (let x = SX + 14; x < SX + SW; x += 17) rect(x, 4, 1.6, SY - 6);               // 柱
    for (let y = 14; y < SY - 4; y += 15) rect(SX, y, SW, 1.6);                                          // 床の帯
    fill('rgba(255,255,255,0.35)'); for (let x = SX + 4; x < SX + SW - 6; x += 34) { ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x + 8, 4); ctx.lineTo(x - 4, SY - 2); ctx.lineTo(x - 12, SY - 2); ctx.fill(); }
    fill('#e8b8c4'); for (let k = 0; k < 7; k++) rect(SX + 18 + k * 17, 18 + (k % 2) * 15, 11, 9);       // 窓の中のポスター
    fill('#3b6a98'); rect(SX + SW, 4, 6, PLAZA - 4);                                                      // 右の青いガラス面
    fill('#7fa6c4'); for (let y = 10; y < 100; y += 12) rect(SX + SW, y, 6, 1);
    // 1階の入口(ガラス)
    fill('#d8d2c4'); rect(SX - 4, SY + SH, SW + 4, PLAZA - SY - SH);
    fill('#7e8a98'); rect(SX, SY + SH + 2, SW - 2, PLAZA - SY - SH - 2);
    fill('#d4e2ec'); rect(SX + 4, SY + SH + 4, SW - 10, 22);
    fill('#2c2f3a'); rect(SX + 62, SY + SH + 4, 22, 28);                                                  // 入口
    fill('#a8c8dc'); rect(SX + 64, SY + SH + 6, 18, 24);
    fill('#f4f4f6'); for (let x = SX + 6; x < SX + SW - 12; x += 30) if (x < SX + 56 || x > SX + 90) rect(x, SY + SH + 8, 20, 18);
    // 右の細いビル群(縦看板の裏)
    fill('#b9b4a8'); rect(SX + SW + 6, 0, 56, PLAZA); fill('#8a8478'); for (let y = 6; y < 100; y += 10) rect(SX + SW + 6, y, 56, 2);
    fill('#cfd0d6'); rect(SX + SW + 62, 12, 22, PLAZA - 12); fill('#9a9ba6'); for (let y = 20; y < 100; y += 8) rect(SX + SW + 64, y, 18, 4);
    fill('#b9b4a8'); rect(SX + SW + 84, 26, 18, PLAZA - 26); fill('#8a8478'); for (let y = 34; y < 100; y += 8) rect(SX + SW + 86, y, 14, 3);

    // ---- ネオン看板の土台(文字は draw で光らせる)----
    fill('#1a2038'); rect(SX - 2, SY, SW + 4, SH);
    fill('#2c5cc4'); rect(SX - 2, SY, SW + 4, 1.4); rect(SX - 2, SY + SH - 1.4, SW + 4, 1.4);
    fill('#2a3050'); for (let i = 0; i < 8; i++) rect(SX + SW - 36 + i * 3, SY + 4 + (i % 2) * 5, 2, 8);          // 右端の飾り模様

    // ---- 電柱・標識・街路樹・青い縦看板(中景)----
    ctx = propL.ctx;
    // 青い縦看板
    fill('#ffffff'); rect(262, 10, 20, 82); fill('#1f6cc4'); rect(264, 12, 16, 78);
    fill('#1f6cc4'); rect(262, 2, 20, 8);
    // 左の電柱と標識
    fill('#8a8d94'); rect(54, 18, 2.4, PLAZA - 18); fill('#6c6f76'); rect(54, 18, 0.8, PLAZA - 18);
    fill('#8a8d94'); rect(22, 24, 36, 1.6);
    fill('#e8e8ea'); rect(40, 52, 1.6, 66);                                                               // 白い柱(バス停風)
    [[48, 56], [60, 56]].forEach(function (p) { fill('#d83a36'); ctx.beginPath(); ctx.arc(p[0] - 4, p[1], 4, 0, Math.PI * 2); ctx.fill(); fill('#fff'); ctx.beginPath(); ctx.arc(p[0] - 4, p[1], 2.8, 0, Math.PI * 2); ctx.fill(); });
    fill('#d83a36'); rect(44.4, 55.2, 7.2, 1.6);
    // 右の電柱と青い丸標識、街路樹
    fill('#7d6a58'); rect(296, 4, 2.4, PLAZA - 4); fill('#7d6a58'); rect(298, 26, 18, 1.2);
    [[306, 62], [306, 76]].forEach(function (p) { fill('#2a62c4'); ctx.beginPath(); ctx.arc(p[0], p[1], 4.6, 0, Math.PI * 2); ctx.fill(); fill('#d83a36'); ctx.beginPath(); ctx.arc(p[0], p[1], 3.4, 0, Math.PI * 2); ctx.fill(); fill('#fff'); ctx.beginPath(); ctx.arc(p[0], p[1], 2.2, 0, Math.PI * 2); ctx.fill(); });
    fill('#4a3c30'); rect(318, 52, 1.6, 66);
    fill('#78a050'); [[318, 46, 9], [312, 56, 6], [324, 58, 6], [319, 66, 5]].forEach(function (c) { ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, Math.PI * 2); ctx.fill(); });
    fill('#9cc468'); ctx.beginPath(); ctx.arc(316, 44, 3.6, 0, Math.PI * 2); ctx.fill();
    // 置き看板(青い掲示板と立て看板)
    fill('#3b6ec0'); rect(212, 94, 24, 22); fill('#27528f'); rect(213.5, 95.5, 21, 19);
    fill('#e8e8ec'); rect(212, 116, 24, 2);
    fill('#4ab0e0'); rect(140, 100, 9, 16); fill('#ffffff'); rect(142, 103, 5, 5); fill('#e8d84a'); rect(142, 110, 5, 3);
    fill('#4ab0e0'); rect(160, 100, 9, 16); fill('#ffffff'); rect(162, 103, 5, 5); fill('#d83a36'); rect(162, 110, 5, 3);

    // ---- 歩道・縁石・赤い道路(動かない)----
    ctx = groundL.ctx;
    fill('#bfa896'); rect(X0, PLAZA, X1 - X0, CURB - PLAZA);                                             // れんが色の歩道
    fill('#a8917f');
    for (let y = PLAZA + 4; y < CURB; y += 8) rect(X0, y, X1 - X0, 0.7);
    for (let y = PLAZA, r = 0; y < CURB; y += 8, r++) for (let x = X0 + (r % 2) * 7; x < X1; x += 14) rect(x, y, 0.7, 8);
    fill('#e8c84a'); ctx.beginPath(); ctx.moveTo(X0, 156); ctx.lineTo(X0, 150); ctx.lineTo(190, 128); ctx.lineTo(190, 134); ctx.fill();         // 黄色い線(点字ブロック風)
    fill('#9a9aa2'); rect(X0, CURB, X1 - X0, ROAD - CURB);                                               // 縁石
    fill('#b4b4bc'); rect(X0, CURB, X1 - X0, 1.4);
    fill('#d2615b'); rect(X0, ROAD, X1 - X0, H - ROAD);                                                  // 赤い舗装の道路
    fill('#a84f4c');
    for (let x = -60; x < X1 + 40; x += 34) {                                                             // 斜めの暗いすじ(ゼブラ)
      ctx.beginPath(); ctx.moveTo(x, ROAD); ctx.lineTo(x + 18, ROAD); ctx.lineTo(x + 70, H); ctx.lineTo(x + 40, H); ctx.fill();
    }
    fill('#e48a84');
    for (let x = -50; x < X1 + 40; x += 34) { ctx.beginPath(); ctx.moveTo(x + 20, ROAD); ctx.lineTo(x + 22, ROAD); ctx.lineTo(x + 74, H); ctx.lineTo(x + 72, H); ctx.fill(); }
    fill('#c8504a'); for (let i = 0; i < 80; i++) rect(X0 + rand() * (X1 - X0), ROAD + rand() * (H - ROAD), 2, 0.7);
    // 奥の道(右、遠近)
    ctx = propL.ctx;
    fill('#9a9ca4'); ctx.beginPath(); ctx.moveTo(330, PLAZA); ctx.lineTo(X1, PLAZA - 4); ctx.lineTo(X1, PLAZA + 26); ctx.lineTo(300, PLAZA + 26); ctx.fill();
    fill('#e8e8ec'); rect(350, PLAZA + 8, 16, 1); rect(372, PLAZA + 10, 22, 1);

    // ---- 緑の柵と植え込み(動かない)----
    ctx = fenceL.ctx;
    const GR = '#3c8a6a', GR2 = '#2a6a4e';
    for (let x = X0; x < 224; x += 104) {
      fill(GR); rect(x, 148, 104, 1.6); rect(x, 160, 104, 1.6);                                        // 横木
      for (let p = x + 6; p < x + 100; p += 9) rect(p, 150, 0.9, 10);
      fill(GR2); ctx.beginPath(); ctx.arc(x + 52, 156, 16, Math.PI * 1.1, Math.PI * 1.9); ctx.lineWidth = 0.9; ctx.strokeStyle = GR; ctx.stroke();
    }
    for (let x = X0 + 1; x < 224; x += 104) { fill(GR); rect(x - 1.2, 142, 2.4, 28); fill('#5ab090'); rect(x - 1.2, 142, 0.8, 28); }
    fill('#4a3a2c'); rect(X0, 166, 232, 3);                                                              // 植え込みの土
    for (let i = 0; i < 70; i++) { fill(rand() < 0.5 ? '#5c8a3c' : '#7aa44c'); rect(X0 + rand() * 230, 154 + rand() * 12, 2.4, 3 + rand() * 6); }
    // 右の低い柵と生け垣
    fill('#5a5a62'); rect(236, 140, 62, 1.4); rect(236, 152, 62, 1.4);
    for (let p = 240; p < 296; p += 9) rect(p, 142, 0.9, 10);
    fill('#2f6a34'); ctx.beginPath(); ctx.moveTo(300, 150); ctx.lineTo(X1, 126); ctx.lineTo(X1, 150); ctx.lineTo(300, 160); ctx.fill();
    fill('#3f8a40'); ctx.beginPath(); ctx.moveTo(300, 150); ctx.lineTo(X1, 126); ctx.lineTo(X1, 132); ctx.lineTo(300, 154); ctx.fill();
    fill('#d8a840'); ctx.beginPath(); ctx.moveTo(296, 160); ctx.lineTo(X1, 150); ctx.lineTo(X1, 152); ctx.lineTo(296, 163); ctx.fill();   // 黄色い縁石線

    // ---- 動くもの ----
    const clouds = [{ y: 22, x: 300, sp: 0.014, s: 1.1 }, { y: 40, x: 120, sp: 0.01, s: 0.8 }];
    const FAC = { sky: 0.08, far: 0.18, bldg: 0.3, prop: 0.5 };
    const walkers = [
      { x: 170, sp: 0.12, top: '#2a4aa8', bot: '#2a4aa8', bag: true, y: 150 },        // 青いスーツの人
      { x: 60, sp: 0.1, top: '#d84a3a', bot: '#2a2a34', bag: false, y: 140 },
      { x: 80, sp: 0.09, top: '#e8e4dc', bot: '#3a3a44', bag: false, y: 141 },
      { x: 250, sp: -0.08, top: '#3a3a46', bot: '#4a4a56', bag: true, y: 146 }
    ];
    function person(out, x, f, tf) {
      const y = f.y, st = Math.sin(tf * 0.3 + x) * 0.6;
      out.fillStyle = 'rgba(0,0,0,0.2)'; out.fillRect(x - 5, y - 0.4, 10, 1.4);
      out.fillStyle = f.bot; out.fillRect(x - 2.8, y - 14, 2.5, 14 - Math.abs(st) * 0.5); out.fillRect(x + 0.4, y - 14, 2.5, 14 + st * 0.3);
      out.fillStyle = '#1a1a20'; out.fillRect(x - 3.2, y - 1.2, 3, 1.2); out.fillRect(x + 0.2, y - 1.2, 3, 1.2);
      out.fillStyle = f.top; out.fillRect(x - 3.8, y - 27, 7.6, 14);
      out.fillStyle = '#e3b48f'; out.fillRect(x - 5, y - 26, 1.4, 10); out.fillRect(x + 3.6, y - 26, 1.4, 10);
      out.beginPath(); out.arc(x, y - 30, 3.3, 0, Math.PI * 2); out.fill();
      out.fillStyle = '#1c1816'; out.beginPath(); out.arc(x, y - 31, 3.5, Math.PI, 0); out.fill();
      if (f.bag) { out.fillStyle = '#f4f4f4'; out.fillRect(x + 4.8, y - 18, 5, 7); out.fillStyle = '#c04a4a'; out.fillRect(x + 4.8, y - 18, 5, 1.4); }
    }
    const letters = ['カ', 'ラ', 'オ', 'ケ'];

    function draw(out, midX, now) {
      const tf = (ST.animate === false) ? 0 : now / (1000 / 60);
      const sh = function (f) { return Math.round(-(midX / W - 0.5) * 2 * ST.parallax * f * R) / R; };
      const place = function (L, f) { out.drawImage(L.cv, -M + sh(f), 0, W + 2 * M, H); };
      place(skyL, FAC.sky);
      out.save(); out.translate(sh(FAC.sky), 0);
      clouds.forEach(function (c) {
        const cx = ((c.x + tf * c.sp * 5) % (W + 160)) - 60;
        out.fillStyle = 'rgba(255,255,255,0.8)';
        [[0, 0, 22, 4.5], [-11, 2, 14, 3.4], [12, 2, 16, 3.6]].forEach(function (e) { out.beginPath(); out.ellipse(cx + e[0] * c.s, c.y + e[1], e[2] * c.s, e[3] * c.s, 0, 0, Math.PI * 2); out.fill(); });
      });
      out.restore();
      place(farL, FAC.far);
      place(bldgL, FAC.bldg);

      // 赤いネオン文字と、青い縦看板の文字(ゆっくり明滅)
      out.save(); out.translate(sh(FAC.bldg), 0);
      const pulse = 0.65 + 0.35 * Math.sin(tf * 0.07);
      const cw = 24;
      letters.forEach(function (ch, i) {
        const x = SX + 8 + i * (cw + 4), y = SY + 2;
        glyph(out, ch, x, y, 16, 2.4, '#ff2c3c');
        glyph(out, ch, x, y, 16, 1.0, 'rgba(255,200,200,' + (0.35 + 0.5 * pulse).toFixed(2) + ')');
      });
      out.restore();
      place(propL, FAC.prop);
      out.save(); out.translate(sh(FAC.prop), 0);
      letters.forEach(function (ch, i) { glyph(out, ch, 266.5, 14 + i * 18, 11, 1.7, '#e8283a'); });
      out.fillStyle = '#ffffff'; out.fillRect(264, 12, 16, 1); out.fillRect(264, 88, 16, 1);
      out.restore();

      out.drawImage(groundL.cv, -M, 0, W + 2 * M, H);
      walkers.forEach(function (w) {
        const span = W + 80;
        const x = (((w.x + tf * w.sp) % span) + span) % span - 40;
        person(out, x, w, tf);
      });
      out.drawImage(fenceL.cv, -M, 0, W + 2 * M, H);
    }

    return { draw: draw };
  }

  Game.Render.StageKaraoke = { build: build };
})();
