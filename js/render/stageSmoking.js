// ステージ「喫煙所の囲い」の背景。池袋の喫煙所前の写真(photo/stages/ikebukuro_smoking.png)をもとに、形をデフォルメして自動で描く(写真は使わない)。
// くもり空の街:遠くのビル(カラオケの赤い看板、丸い看板、白いデパート)、黒い枠のガラスの囲い(左右)、
// 中央の出入り口から見える喫煙スペース(つるの壁、立ち話や座っている人)、植栽ボックス、大きな敷石の歩道。
//   視差 : 空・遠景・囲いの向こう・ガラスの囲いが、奥ほど小さくずれる(歩道は動かない)
//   動き : 流れる雲、喫煙スペースの人の身じろぎと立ちのぼる煙
//   設定 : display.config.js の stage.list.smoking
(function () {
  'use strict';

  function rng(seed) {
    let s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function build() {
    const D = Game.Config.display;
    const R = Math.max(1, Math.round(D.pixelScale || 1));
    const W = D.width, H = D.height;
    const ST = D.stage || { parallax: 14, animate: true };
    const M = Math.ceil(ST.parallax);
    const rand = rng(23);
    const GY = 150;                                   // 囲いの足元(歩道の始まり)
    const FT = 62;                                    // 囲いの上の枠の高さ
    const GL = 146, GR = 208;                         // 出入り口の左右の柱の位置
    const X0 = -M, X1 = W + M;

    function layer() {
      const c = document.createElement('canvas');
      c.width = (W + 2 * M) * R; c.height = H * R;
      const x = c.getContext('2d');
      x.scale(R, R); x.translate(M, 0);
      return { cv: c, ctx: x };
    }
    const skyL = layer(), farL = layer(), wallL = layer(), fenceL = layer(), groundL = layer();
    let ctx;
    const q = function (v) { return Math.round(v * R) / R; };
    const rect = function (x, y, w, h) { ctx.fillRect(q(x), q(y), Math.max(1 / R, q(w)), Math.max(1 / R, q(h))); };
    const fill = function (c) { ctx.fillStyle = c; };

    // ---- 空(くもり)----
    ctx = skyL.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, GY);
    g.addColorStop(0, '#c4d3e2'); g.addColorStop(0.55, '#dde6ee'); g.addColorStop(1, '#eef2f5');
    ctx.fillStyle = g; ctx.fillRect(X0, 0, X1 - X0, GY + 4);

    // ---- 遠くのビル ----
    ctx = farL.ctx;
    const windows = function (x, w, top, c1, c2, stepX, stepY) {
      for (let wy = top + 5; wy < GY - 6; wy += stepY) for (let wx = x + 3; wx < x + w - 3; wx += stepX) { fill(rand() < 0.7 ? c1 : c2); rect(wx, wy, stepX - 2, stepY - 3); }
    };
    // 左の白いビルと紺色の縦看板
    fill('#eef1f4'); rect(-14, 6, 44, GY - 6); fill('#d3d9e0'); rect(26, 6, 4, GY - 6);
    windows(-14, 40, 6, '#c6cfd9', '#b4bfcb', 6, 8);
    fill('#ffffff'); rect(5, 0, 8, 50); fill('#1d3f86'); rect(6, 1, 6, 48);
    fill('#ffffff'); rect(7.4, 8, 3.2, 1); rect(7.4, 13, 3.2, 1); rect(7.4, 18, 3.2, 1); rect(7.4, 23, 3.2, 1);
    // 灰色のビル
    fill('#c9d0d8'); rect(34, 22, 30, GY - 22); fill('#b2bbc6'); rect(60, 22, 4, GY - 22);
    windows(34, 30, 22, '#e2e8ee', '#aab4c0', 5, 7);
    // 淡い青のガラスのビル
    fill('#dce6ee'); rect(66, 4, 36, GY - 4); fill('#c0ced9'); rect(98, 4, 4, GY - 4);
    fill('#b7c8d6'); for (let y = 10; y < GY - 8; y += 9) rect(68, y, 30, 5);
    fill('#f3f7fa'); for (let y = 10; y < GY - 8; y += 9) rect(68, y, 30, 1);
    // 濃紺のガラスのビル
    fill('#2f3e55'); rect(104, 26, 40, GY - 26); fill('#25324a'); rect(140, 26, 4, GY - 26);
    windows(104, 40, 26, '#4d6382', '#3a4c68', 5, 7);
    // カラオケのビル(赤い看板)と丸い看板
    fill('#e9e4dd'); rect(146, 34, 58, GY - 34); fill('#cfc7bc'); rect(200, 34, 4, GY - 34);
    windows(146, 58, 34, '#b7c3cf', '#9aa7b4', 6, 8);
    fill('#d83a3a'); rect(150, 56, 26, 10); fill('#ffffff'); rect(153, 59, 20, 1.4); rect(153, 62.4, 14, 1.4);
    fill('#f1f1f4'); ctx.beginPath(); ctx.arc(188, 50, 12.5, 0, Math.PI * 2); ctx.fill();          // 丸い看板
    fill('#e0487f'); ctx.beginPath(); ctx.arc(188, 50, 11, 0, Math.PI * 2); ctx.fill();
    fill('#f6e6a8'); ctx.beginPath(); ctx.arc(188, 50, 7.6, 0, Math.PI * 2); ctx.fill();            // 中の丸と、花のマーク
    fill('#e0487f'); for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5 - Math.PI / 2; ctx.beginPath(); ctx.arc(188 + Math.cos(a) * 3, 50 + Math.sin(a) * 3, 1.9, 0, Math.PI * 2); ctx.fill(); }
    fill('#f6d04a'); ctx.beginPath(); ctx.arc(188, 50, 1.5, 0, Math.PI * 2); ctx.fill();
    // 茶色のビル(黄色い帯)
    fill('#4b4040'); rect(206, 24, 36, GY - 24); fill('#3a3030'); rect(238, 24, 4, GY - 24);
    windows(206, 36, 24, '#6a5c5c', '#54484a', 5, 7);
    fill('#f1b83a'); rect(208, 28, 32, 6); fill('#7a4a1a'); rect(211, 30, 26, 1.4);
    // 白い小さなビルと青い看板
    fill('#f2f4f6'); rect(244, 34, 38, GY - 34); fill('#d8dde3'); rect(278, 34, 4, GY - 34);
    windows(244, 38, 34, '#c9d1da', '#aeb8c3', 6, 8);
    fill('#2f6fc0'); rect(256, 40, 16, 7); fill('#ffffff'); rect(258, 43, 12, 1.2);
    // 右の大きな白いデパート(曲線のバルコニー、緑の壁)
    const sx0 = 284, top0 = 12;
    fill('#f1f3f6'); rect(sx0, top0, X1 - sx0, GY - top0);
    for (let y0 = 22; y0 < GY - 14; y0 += 14) {
      fill('#4e5a6a'); rect(sx0, y0, X1 - sx0, 4.5);
      fill('#7d8a9b'); rect(sx0, y0 + 0.8, X1 - sx0, 1);
      fill('#ffffff'); rect(sx0, y0 + 4.5, X1 - sx0, 3);
      fill('#cdd3db'); for (let x = sx0; x < X1; x += 8) { ctx.beginPath(); ctx.ellipse(x + 4, y0 + 7.5, 4, 2.4, 0, 0, Math.PI); ctx.fill(); }
    }
    for (let y = 18; y < 108; y++) for (let x = 352; x < 378; x++) {         // 緑の壁
      const n = (Math.sin(x * 1.7 + y * 0.9) + Math.sin(x * 0.6 - y * 1.3)) * 0.5;
      fill(n > 0.2 ? '#3f7d3c' : n > -0.3 ? '#2f6a35' : '#245a2e'); ctx.fillRect(x, y, 1, 1);
    }
    // 街路樹(左)
    [[24, 74, 13], [40, 68, 11], [32, 80, 12]].forEach(function (t) {
      fill(rand() < 0.5 ? '#3f7a3c' : '#356b34'); ctx.beginPath(); ctx.ellipse(t[0], t[1], t[2], t[2] * 0.85, 0, 0, Math.PI * 2); ctx.fill();
    });
    fill('#5a4a3a'); rect(31, 82, 2.4, 20);

    // ---- 囲いの向こう:つるの壁と喫煙スペースの床(全体に広がる)----
    ctx = wallL.ctx;
    fill('#d5dcd8'); rect(X0, 82, X1 - X0, 50);
    fill('#2f7a45'); for (let x = X0; x < X1; x += 15) rect(x + 1, 86, 13, 44);          // 緑のパネル
    fill('#5da56a'); for (let i = 0; i < 220; i++) rect(X0 + rand() * (X1 - X0), 88 + rand() * 40, 1.6, 2.6);
    fill('#1f2933'); rect(X0, 83, X1 - X0, 3);                                            // 上の枠
    fill('#e6efe8'); for (let x = X0; x < X1; x += 15) rect(x + 14, 86, 1.6, 44);
    fill('#c3c8c8'); rect(X0, 130, X1 - X0, 24);                                          // 床の敷石
    fill('#aeb3b4'); rect(X0, 138, X1 - X0, 0.8); rect(X0, 146, X1 - X0, 0.8);
    for (let x = X0; x < X1; x += 16) rect(x + (((x - X0) / 16) % 2 ? 8 : 0), 130, 0.8, 8);

    // ---- ガラスの囲い(左右)----
    ctx = fenceL.ctx;
    const POST = '#23262c', POST2 = '#454a54';
    const glassArea = function (x0, x1, y0, y1) {                                         // 向こうの植え込みと人影 → ガラス
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
      for (let x = x0 - 6; x < x1 + 6; x += 9 + rand() * 4) {                             // 向こうの低木
        const hh = 12 + rand() * 12;
        fill(rand() < 0.5 ? '#2d6d3a' : '#3b8148'); ctx.beginPath(); ctx.ellipse(x, y1 - hh * 0.35, 7, hh * 0.6, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 0.42;                                                              // ぼやけた人影
      for (let x = x0 + 8; x < x1 - 6; x += 20 + rand() * 18) {
        const top = [['#f2f2f2', '#3a4a6a'], ['#9aa0a8', '#2a2a30'], ['#e8eef6', '#555a66'], ['#2c2f45', '#33343c']][Math.floor(rand() * 4)];
        fill(top[0]); rect(x - 4, y1 - 30, 8, 12); fill(top[1]); rect(x - 3.4, y1 - 18, 7, 10);
        fill('#d9b08c'); ctx.beginPath(); ctx.arc(x, y1 - 33, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const gg = ctx.createLinearGradient(0, y0, 0, y1);
      gg.addColorStop(0, 'rgba(214,232,242,0.36)'); gg.addColorStop(1, 'rgba(150,182,196,0.28)');
      ctx.fillStyle = gg; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';                                            // 反射のすじ
      for (let x = x0 + 8; x < x1 - 4; x += 17) {
        ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + 4, y0); ctx.lineTo(x - 8, y1); ctx.lineTo(x - 12, y1); ctx.fill();
      }
      ctx.restore();
    };
    const post = function (x, w) { fill(POST); rect(x - w / 2, FT - 2, w, GY - FT + 2); fill(POST2); rect(x - w / 2, FT - 2, 0.9, GY - FT + 2); };
    const base = function (x0, x1, top) {
      for (let x = x0 + 5; x < x1 - 4; x += 10) {                                         // 箱からあふれる緑
        const hh = 5 + rand() * 6; fill(rand() < 0.5 ? '#2d6d3a' : '#3b8148');
        ctx.beginPath(); ctx.ellipse(x, top - hh * 0.2, 6, hh, 0, 0, Math.PI * 2); ctx.fill();
      }
      fill('#2f323b'); rect(x0, top, x1 - x0, GY - top);
      fill('#4b505c'); rect(x0, top, x1 - x0, 1.6);
      fill('#22252b'); for (let x = x0 + 22; x < x1 - 4; x += 36) rect(x, top + 2, 1, GY - top - 2);
    };
    const LB = 124, RB = 120;                                                              // 左右の植栽ボックスの上の高さ
    glassArea(X0, GL, FT + 3, LB); glassArea(GR, X1, FT + 3, RB);
    fill(POST); rect(X0, FT, GL - X0, 3.6); rect(GR, FT, X1 - GR, 3.6);                     // 上の黒い枠
    fill(POST2); rect(X0, FT, GL - X0, 0.9); rect(GR, FT, X1 - GR, 0.9);
    [-10, 18, 46, 74, 102, 128].forEach(function (x) { post(x, 3.2); });
    post(GL, 4.2);
    post(GR, 4.6); [250, 292, 334, 376].forEach(function (x) { post(x, 4.4); });
    base(X0, GL, LB); base(GR, X1, RB);
    // 左:SMOKING AREA の看板、青い注意書き、黄色い注意書き
    fill('#f6f8fa'); rect(106, 70, 18, 26);
    fill('#394150'); rect(109, 74, 11, 2); fill('#e8873a'); rect(118.6, 74, 1.4, 2);
    fill('#b3bcc8'); rect(112, 71.4, 0.8, 2.2); rect(114.4, 71, 0.8, 2.6);                 // 煙
    fill('#394150'); rect(108.5, 82, 13, 1); rect(110, 85.4, 10, 1); rect(108.5, 88.8, 12, 1);
    fill('#ffffff'); rect(106, 99, 18, 10); fill('#2f6fc0'); rect(106, 99, 18, 1); rect(106, 108, 18, 1);
    fill('#2f6fc0'); rect(108, 101.6, 2.4, 5); rect(119.6, 101.6, 2.4, 5); rect(111.4, 103.8, 7, 0.9);
    fill('#f3d33f'); rect(106, 111, 18, 12); fill('#d9463a'); rect(108, 113, 14, 1.6); fill('#444'); rect(108, 116.4, 11, 0.9); rect(108, 119, 9, 0.9);
    // 右:黄色い注意書き、青い人の絵の注意書き
    fill('#f3d33f'); rect(214, 80, 24, 20); fill('#d9463a'); rect(217, 83, 18, 2); fill('#3a3a3a'); rect(217, 88, 16, 1); rect(217, 91.4, 13, 1); rect(217, 94.8, 15, 1);
    fill('#ffffff'); rect(256, 80, 28, 20); fill('#2f6fc0'); rect(256, 80, 28, 1.2); rect(256, 98.8, 28, 1.2);
    fill('#2f6fc0'); rect(259, 84, 3.2, 8); rect(277.8, 84, 3.2, 8); rect(264, 87, 12, 1.1);
    fill('#2f6fc0'); ctx.beginPath(); ctx.arc(260.6, 83, 1.5, 0, Math.PI * 2); ctx.arc(279.4, 83, 1.5, 0, Math.PI * 2); ctx.fill();

    // ---- 歩道 ----
    ctx = groundL.ctx;
    fill('#3d3f48'); rect(X0, GY, X1 - X0, 4);                                             // 植栽ボックスの足元
    fill('#5a5d68'); rect(X0, GY, X1 - X0, 1);
    fill('#b7b8be'); rect(X0, GY + 4, X1 - X0, H - GY - 4);
    const rows = [GY + 4, GY + 16, GY + 30, GY + 50, H];
    for (let r = 0; r < rows.length - 1; r++) {                                           // 大きな敷石:手前ほど大きく、濃淡のむら
      const y0 = rows[r], y1 = rows[r + 1], w = 26 + r * 14;
      for (let x = X0 - (r % 2 ? w / 2 : 0), i = 0; x < X1; x += w, i++) {
        const v = rand();
        fill(v < 0.4 ? '#c9c9ce' : v < 0.72 ? '#b3b3ba' : '#9d9da5'); rect(x, y0, w, y1 - y0);
        fill('#8a8a93'); rect(x, y0, 1, y1 - y0);
      }
      fill('#8a8a93'); rect(X0, y0, X1 - X0, 1);
    }
    fill('#4e505c'); rect(GL, GY + 4, GR - GL, 4); fill('#8a8d99'); rect(GL, GY + 4, GR - GL, 1);   // 出入り口の段差
    fill('#d5d8de'); rect(262, 208, 26, 6); fill('#9aa0aa'); rect(262, 208, 26, 1); rect(262, 213, 26, 1);  // 銀色の板

    // ---- 動くもの ----
    const clouds = [{ y: 18, x: 40, sp: 0.012, s: 1.2 }, { y: 36, x: 210, sp: 0.018, s: 1.5 }, { y: 26, x: 330, sp: 0.009, s: 1 }];
    const FAC = { sky: 0.08, far: 0.2, wall: 0.5, fence: 0.8 };
    const FEET = 147;
    const folks = [                                                                        // 出入り口から見える人
      { x: 172, kind: 'stripe', sp: 0.045, ph: 0.3, h: 33 },
      { x: 202, kind: 'grey', sp: 0.05, ph: 2.1, h: 36 },
      { x: 158, kind: 'sit', sp: 0.04, ph: 4.0, h: 22 },
      { x: 186, kind: 'sit', sp: 0.035, ph: 5.2, h: 20 }
    ];
    function person(out, f, bob) {
      const x = f.x, y = FEET + bob;
      out.fillStyle = 'rgba(0,0,0,0.22)'; out.fillRect(x - 5, FEET - 0.5, 10, 1.5);
      if (f.kind === 'sit') {                                                              // 座っている人
        out.fillStyle = '#2f3136'; out.fillRect(x - 4, y - 10, 9, 4); out.fillRect(x + 3, y - 10, 3, 10);
        out.fillStyle = '#e3b48f'; out.fillRect(x + 3, y - 4, 3, 4);
        out.fillStyle = '#e9ecef'; out.fillRect(x - 4, y - f.h * 0.9, 8, 11);
        out.fillStyle = '#e3b48f'; out.beginPath(); out.arc(x, y - f.h * 0.98, 3, 0, Math.PI * 2); out.fill();
        out.fillStyle = '#1a1a1a'; out.beginPath(); out.arc(x, y - f.h * 1.02, 3.2, Math.PI, 0); out.fill();
        return;
      }
      const legC = f.kind === 'stripe' ? '#3d5a8c' : '#2c2c30';
      out.fillStyle = legC; out.fillRect(x - 3.2, y - f.h * 0.46, 2.8, f.h * 0.46); out.fillRect(x + 0.4, y - f.h * 0.46, 2.8, f.h * 0.46);
      out.fillStyle = '#17171c'; out.fillRect(x - 3.6, y - 1.4, 3.4, 1.4); out.fillRect(x + 0.2, y - 1.4, 3.4, 1.4);
      const topY = y - f.h * 0.8, th = f.h * 0.36;
      if (f.kind === 'stripe') {                                                           // しまのシャツ
        for (let i = 0; i < 6; i++) { out.fillStyle = i % 2 ? '#2d3a63' : '#f4f4f4'; out.fillRect(x - 4, topY + i * th / 6, 8, th / 6 + 0.2); }
      } else { out.fillStyle = '#8f918f'; out.fillRect(x - 4.4, topY, 8.8, th); }
      out.fillStyle = '#e3b48f'; out.fillRect(x - 5.4, topY + 0.6, 1.4, th * 0.8); out.fillRect(x + 4, topY + 0.6, 1.4, th * 0.8);
      out.beginPath(); out.arc(x, y - f.h * 0.9, 3.2, 0, Math.PI * 2); out.fill();
      out.fillStyle = '#1e1a18'; out.beginPath(); out.arc(x, y - f.h * 0.92, 3.4, Math.PI, 0); out.fill();
    }

    function draw(out, midX, now) {
      const tf = (ST.animate === false) ? 0 : now / (1000 / 60);
      const sh = function (f) { return Math.round(-(midX / W - 0.5) * 2 * ST.parallax * f * R) / R; };
      const place = function (L, f) { out.drawImage(L.cv, -M + sh(f), 0, W + 2 * M, H); };

      place(skyL, FAC.sky);
      out.save(); out.translate(sh(FAC.sky), 0);                          // 流れる雲
      clouds.forEach(function (c) {
        const cx = ((c.x + tf * c.sp * 5) % (W + 160)) - 60;
        out.fillStyle = 'rgba(255,255,255,0.78)';
        [[0, 0, 22, 4.5], [-11, 2, 14, 3.4], [12, 2, 16, 3.6], [2, -2.5, 13, 3.4]].forEach(function (e) {
          out.beginPath(); out.ellipse(cx + e[0] * c.s, c.y + e[1], e[2] * c.s, e[3] * c.s, 0, 0, Math.PI * 2); out.fill();
        });
      });
      out.restore();
      place(farL, FAC.far);
      place(wallL, FAC.wall);
      out.save(); out.translate(sh(FAC.wall), 0);                         // 喫煙スペースの人と煙
      folks.forEach(function (f) { person(out, f, Math.sin(tf * f.sp + f.ph) * 0.6); });
      [[172, 0], [186, 1.7], [202, 3.3]].forEach(function (s) {
        for (let k = 0; k < 3; k++) {
          const t = ((tf * 0.012 + s[1] * 0.3 + k / 3) % 1);
          out.fillStyle = 'rgba(235,238,242,' + (0.55 * (1 - t)).toFixed(3) + ')';
          out.beginPath(); out.arc(s[0] + 4 + Math.sin(t * 6 + s[1]) * 1.6, 120 - t * 20, 1 + t * 1.8, 0, Math.PI * 2); out.fill();
        }
      });
      out.restore();
      place(fenceL, FAC.fence);
      out.drawImage(groundL.cv, -M, 0, W + 2 * M, H);                      // 歩道は動かさない
    }

    return { draw: draw };
  }

  Game.Render.StageSmoking = { build: build };
})();
