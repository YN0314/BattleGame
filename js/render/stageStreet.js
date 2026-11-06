// ステージ「駅前の喫煙所」の背景。池袋の喫煙所前の写真をもとに、形をデフォルメして自動で描く(写真は使わない)。
// 昼の街:空と雲、白いデパート(曲線のバルコニーと垂れ幕)、ガラスの囲いと緑の壁、植え込み、敷石の歩道。
//   視差 : 空・遠景・デパート・植え込み・ガラスの囲いが、奥ほど小さくずれる(歩道は動かない)
//   動き : 流れる雲、アンテナの点滅、囲いの向こうで立ち話をする人たち、傘をさして歩く人
//   設定 : display.config.js の stage.list.street
(function () {
  'use strict';

  function rng(seed) {
    let s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function build() {
    const D = Game.Config.display;
    const R = Math.max(1, Math.round(D.pixelScale || 1));
    const W = D.width, H = D.height, F = D.floorY;
    const ST = D.stage || { parallax: 14, animate: true };
    const M = Math.ceil(ST.parallax);
    const rand = rng(11);
    const GY = 152;                                   // 歩道の始まり(囲いの足元)

    function layer() {
      const c = document.createElement('canvas');
      c.width = (W + 2 * M) * R; c.height = H * R;
      const x = c.getContext('2d');
      x.scale(R, R); x.translate(M, 0);
      return { cv: c, ctx: x };
    }
    const skyL = layer(), farL = layer(), storeL = layer(), hedgeL = layer(), fenceL = layer(), groundL = layer();
    let ctx;
    const q = function (v) { return Math.round(v * R) / R; };
    const rect = function (x, y, w, h) { ctx.fillRect(q(x), q(y), Math.max(1 / R, q(w)), Math.max(1 / R, q(h))); };
    const fill = function (c) { ctx.fillStyle = c; };
    const X0 = -M, X1 = W + M;

    // ---- 空 ----
    ctx = skyL.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, GY);
    g.addColorStop(0, '#6aaee6'); g.addColorStop(0.6, '#a9d3ef'); g.addColorStop(1, '#d6ebf6');
    ctx.fillStyle = g; ctx.fillRect(X0, 0, X1 - X0, GY + 4);

    // ---- 遠くのビル ----
    ctx = farL.ctx;
    for (let x = X0; x < X1;) {
      const w = 16 + Math.floor(rand() * 20), h = 36 + Math.floor(rand() * 44);
      fill(rand() < 0.5 ? '#98abc2' : '#a6b8cc'); rect(x, GY - h, w, h);
      fill('#b9c9da');
      for (let wy = GY - h + 4; wy < GY - 10; wy += 6) for (let wx = x + 3; wx < x + w - 3; wx += 5) rect(wx, wy, 2, 3);
      fill('#8497ad'); rect(x + w - 2, GY - h, 2, h);                // 影の面
      if (rand() < 0.25) { fill('#8497ad'); rect(x + w * 0.5, GY - h - 7, 0.8, 7); }
      x += w + Math.floor(rand() * 3);
    }
    // 赤白の鉄塔(左のほう)
    fill('#d9d9de'); rect(66, 30, 1.2, 70);
    fill('#d86a6a'); for (let y = 36; y < 90; y += 10) rect(66, y, 1.2, 4);

    // ---- 白いデパート(曲線のバルコニー、垂れ幕、緑の壁)----
    ctx = storeL.ctx;
    const sx0 = 96;
    const topAt = function (x) { return Math.max(4, 64 - (x - sx0) * 0.24); };     // 右へ向かって屋根が上がる
    for (let x = sx0; x < X1; x++) {
      const t = topAt(x);
      fill('#eceff3'); rect(x, t, 1.05, GY - t);
    }
    for (let y0 = 12; y0 < GY - 14; y0 += 15) {                                    // バルコニーの帯
      for (let x = sx0; x < X1; x++) {
        const t = topAt(x);
        const by = y0 + 4;                                                          // 帯は水平(屋根の線だけ斜め)
        if (by < t + 3 || by > GY - 14) continue;
        fill('#3a4350'); rect(x, by, 1.05, 5);                                    // 窓の帯
        fill('#7a8798'); rect(x, by + 0.8, 1.05, 1);
        fill('#ffffff'); rect(x, by + 5, 1.05, 3.2);                              // 白い手すり
        fill('#c4cad4');
        if (Math.floor((x - sx0) / 6) % 2 === 0) rect(x, by + 8.2, 1.05, 1.6);    // 手すり下のアーチ影
      }
    }
    // 青い縦の看板
    fill('#ffffff'); rect(sx0 + 8, topAt(sx0 + 8) + 2, 11, 80);
    fill('#1f66b8'); rect(sx0 + 9.5, topAt(sx0 + 8) + 3, 8, 78);
    fill('#9cc3ea'); rect(sx0 + 9.5, topAt(sx0 + 8) + 3, 1.2, 78);
    // 白い垂れ幕(青と赤の帯)
    [[262, 0], [274, 6], [286, 2], [298, 8]].forEach(function (b, i) {
      fill('#fafafa'); rect(b[0], b[1], 10, 66 + (i % 2) * 8);
      fill(i % 2 ? '#d9534f' : '#2f6fc0'); rect(b[0] + 1.5, b[1] + 6, 7, 3);
      fill('#2f6fc0'); rect(b[0] + 1.5, b[1] + 14, 7, 18);
      fill('#ffffff'); rect(b[0] + 3, b[1] + 17, 4, 1); rect(b[0] + 3, b[1] + 21, 4, 1); rect(b[0] + 3, b[1] + 25, 4, 1);
      fill('#d9d9de'); rect(b[0] + 9, b[1], 1, 66 + (i % 2) * 8);
    });
    // 緑の壁面緑化(右上)
    for (let y = 0; y < 66; y++) for (let x = 330; x < 364; x += 1) {
      const n = (Math.sin(x * 1.7 + y * 0.9) + Math.sin(x * 0.6 - y * 1.3)) * 0.5;
      fill(n > 0.2 ? '#3f7d3c' : n > -0.3 ? '#2f6a35' : '#245a2e'); ctx.fillRect(x, y, 1, 1);
    }
    // 屋上の設備
    fill('#d4d9e0'); rect(120, topAt(120) - 6, 14, 6); rect(150, topAt(150) - 4, 10, 4);

    // ---- 植え込みと、囲いの向こうの緑の壁(中央の切れ目から見える)----
    ctx = hedgeL.ctx;
    fill('#e8f1ea'); rect(86, 82, 172, 58);
    fill('#2f7a45');
    for (let x = 86; x < 258; x += 14) { rect(x, 84, 12, 54); }                              // 緑のパネル
    fill('#5da56a');
    for (let i = 0; i < 90; i++) { rect(88 + rand() * 168, 86 + rand() * 50, 1.6, 2.6); }    // つるの葉
    fill('#eaf3ec');
    for (let x = 86; x < 258; x += 14) { rect(x + 12, 84, 2, 54); rect(x, 100, 12, 0.8); rect(x, 118, 12, 0.8); }
    fill('#1f2933'); rect(86, 80, 172, 3);                                                   // 上の枠
    // 手前の低木と植栽ボックス
    for (let x = 96; x < 252; x += 7) {
      const hh = 10 + rand() * 8;
      fill(rand() < 0.5 ? '#2d6d3a' : '#3b8148'); ctx.beginPath(); ctx.ellipse(x, 136 - hh * 0.4, 6.5, hh * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    }
    fill('#3b3d48'); rect(92, 136, 164, 16);
    fill('#4b4e5c'); rect(92, 136, 164, 1.6);
    fill('#2c2e38');
    for (let x = 94; x < 254; x += 4) rect(x, 139, 0.8, 12);                                 // 格子のすじ

    // ---- ガラスの囲い(左と右)----
    ctx = fenceL.ctx;
    const POST = '#2c3037', POST2 = '#454a54';
    const glass = function (x0, x1, top) {
      const gg = ctx.createLinearGradient(0, top, 0, 142);
      gg.addColorStop(0, 'rgba(210,232,246,0.38)'); gg.addColorStop(1, 'rgba(150,185,200,0.30)');
      ctx.fillStyle = gg; ctx.fillRect(x0, top, x1 - x0, 142 - top);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';                                              // 反射のすじ
      for (let x = x0 + 6; x < x1 - 4; x += 15) {
        ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + 4, top); ctx.lineTo(x - 7, 142); ctx.lineTo(x - 11, 142); ctx.fill();
      }
    };
    const post = function (x, top) { fill(POST); rect(x - 2, top, 4, 150 - top); fill(POST2); rect(x - 2, top, 1, 150 - top); };
    const base = function (x0, x1) {
      fill('#3d3f4a'); rect(x0, 138, x1 - x0, 16);
      fill('#555866'); rect(x0, 138, x1 - x0, 1.6);
      fill('#2b2d36'); for (let x = x0; x < x1; x += 44) rect(x, 140, 1, 14);
    };
    glass(X0, 92, 18); glass(252, X1, 34);
    // 左:帯と白い掲示板、ピンクの花の看板
    fill('#2c3037'); rect(X0, 14, 106, 4); rect(252, 30, X1 - 252, 4);
    post(94, 14); post(24, 14);
    fill('#f6f6f8'); rect(X0, 62, 50, 18); fill('#d9467a'); ctx.beginPath(); ctx.arc(X0 + 8, 71, 3.4, 0, Math.PI * 2); ctx.fill();
    fill('#8892a4'); rect(X0 + 16, 66, 28, 1.4); rect(X0 + 16, 71, 24, 1.4);
    fill('#fbfbf4'); rect(34, 84, 34, 26); fill('#b3b8c4'); for (let y = 88; y < 108; y += 4) rect(37, y, 28, 1);
    fill('#4aa3e0'); rect(70, 80, 14, 20); fill('#ffe27a'); rect(72, 83, 10, 6); fill('#ffffff'); rect(72, 92, 10, 5);
    // 右:SMOKING AREA の看板、黄色い注意書き、柱
    [252, 300, 348].forEach(function (x) { post(x, 30); });
    post(X1 - 2, 30);
    fill('#fbfbfd'); rect(256, 50, 34, 62); fill('#2a62b0'); rect(259, 54, 11, 12);
    fill('#2f3540'); rect(259, 70, 28, 2); rect(259, 75, 22, 1.2); rect(259, 79, 26, 1.2);
    fill('#8a93a3'); rect(259, 86, 20, 1); rect(259, 90, 24, 1);
    fill('#ffe45e'); rect(256, 118, 34, 16); fill('#d9463a'); rect(259, 121, 28, 2); fill('#555'); rect(259, 126, 24, 1); rect(259, 129, 20, 1);
    fill('#f1f1f1'); rect(310, 82, 22, 18); fill('#cfd3da'); rect(313, 86, 16, 1); rect(313, 90, 16, 1);
    base(X0, 92); base(252, X1);

    // ---- 歩道 ----
    ctx = groundL.ctx;
    fill('#b9b9bf'); rect(X0, GY, X1 - X0, 18);                                              // 奥の通路(明るい敷石)
    fill('#a8a8af');
    for (let x = X0; x < X1; x += 18) rect(x + ((GY / 6) % 2 ? 9 : 0), GY + 5, 0.8, 7);
    fill('#9d9ca3'); rect(X0, GY + 6, X1 - X0, 0.8); rect(X0, GY + 13, X1 - X0, 0.8);
    fill('#61606a'); rect(X0, GY + 18, X1 - X0, 4);                                          // 縁石
    fill('#7a7984'); rect(X0, GY + 18, X1 - X0, 1.2);
    fill('#a3a3aa'); rect(X0, GY + 22, X1 - X0, H - GY - 22);                                // 手前の歩道
    // 敷石:手前ほど大きく
    const rows = [GY + 22, GY + 32, GY + 46, GY + 64, H];
    for (let r = 0; r < rows.length - 1; r++) {
      const y0 = rows[r], y1 = rows[r + 1], w = 22 + r * 14;
      fill('#8d8c95'); rect(X0, y0, X1 - X0, 1);
      for (let x = X0 - (r % 2 ? w / 2 : 0); x < X1; x += w) {
        fill('#8d8c95'); rect(x, y0, 1, y1 - y0);
        if (rand() < 0.35) { fill(rand() < 0.5 ? '#aeaeb5' : '#9a99a1'); rect(x + 1, y0 + 1, w - 1, y1 - y0 - 1); }
      }
    }
    fill('#b8b8c0'); rect(X0, GY + 22, X1 - X0, 1);

    // ---- 動く人たち(囲いの向こう:デフォルメした通行人)----
    const folks = [
      { x: 132, top: '#f2f2f2', bot: '#3a5a8a', hair: '#2a2420', sp: 0.045, ph: 0.2, h: 34 },
      { x: 160, top: '#9a9488', bot: '#1d1d22', hair: '#1a1a1a', sp: 0.05, ph: 1.7, h: 33 },
      { x: 190, top: '#e8eef6', bot: '#4a4f5c', hair: '#3a2c22', sp: 0.04, ph: 3.1, h: 32 },
      { x: 230, top: '#2c2f45', bot: '#2a2a33', hair: '#1a1a1a', sp: 0.055, ph: 4.4, h: 34 }
    ];
    const clouds = [{ y: 20, x: 30, sp: 0.014, s: 1.1 }, { y: 44, x: 190, sp: 0.02, s: 1.4 }, { y: 30, x: 320, sp: 0.01, s: 0.9 }];
    const FAC = { sky: 0.08, far: 0.2, store: 0.35, hedge: 0.55, fence: 0.8 };
    const FEET = 146;

    function person(out, x, f, bob) {
      const y = FEET + bob;
      out.fillStyle = 'rgba(0,0,0,0.25)'; out.fillRect(x - 5, FEET - 0.5, 10, 1.5);
      out.fillStyle = f.bot; out.fillRect(x - 3.2, y - f.h * 0.42, 2.8, f.h * 0.42); out.fillRect(x + 0.4, y - f.h * 0.42, 2.8, f.h * 0.42);
      out.fillStyle = '#17171c'; out.fillRect(x - 3.6, y - 1.4, 3.4, 1.4); out.fillRect(x + 0.2, y - 1.4, 3.4, 1.4);
      out.fillStyle = f.top; out.fillRect(x - 4, y - f.h * 0.78, 8, f.h * 0.38);
      out.fillStyle = '#e3b48f'; out.fillRect(x - 5.2, y - f.h * 0.76, 1.4, f.h * 0.3); out.fillRect(x + 3.8, y - f.h * 0.76, 1.4, f.h * 0.3);
      out.beginPath(); out.arc(x, y - f.h * 0.88, 3.2, 0, Math.PI * 2); out.fill();
      out.fillStyle = f.hair; out.beginPath(); out.arc(x, y - f.h * 0.9, 3.4, Math.PI, 0); out.fill();
    }

    function draw(out, midX, now) {
      const tf = (ST.animate === false) ? 0 : now / (1000 / 60);
      const sh = function (f) { return Math.round(-(midX / W - 0.5) * 2 * ST.parallax * f * R) / R; };
      const place = function (L, f) { out.drawImage(L.cv, -M + sh(f), 0, W + 2 * M, H); };

      place(skyL, FAC.sky);
      out.save(); out.translate(sh(FAC.sky), 0);                          // 流れる雲
      clouds.forEach(function (c) {
        const cx = ((c.x + tf * c.sp * 5) % (W + 160)) - 60;
        out.fillStyle = 'rgba(255,255,255,0.85)';
        [[0, 0, 22, 4.5], [-11, 2, 14, 3.4], [12, 2, 16, 3.6], [2, -2.5, 13, 3.4]].forEach(function (e) {
          out.beginPath(); out.ellipse(cx + e[0] * c.s, c.y + e[1], e[2] * c.s, e[3] * c.s, 0, 0, Math.PI * 2); out.fill();
        });
      });
      out.restore();
      place(farL, FAC.far);
      out.save(); out.translate(sh(FAC.far), 0);                          // アンテナの点滅
      if (Math.floor(tf / 40) % 2 === 0) { out.fillStyle = '#ff4a4a'; out.fillRect(65.6, 28.5, 2, 2); }
      out.restore();
      place(storeL, FAC.store);

      place(hedgeL, FAC.hedge);
      out.save(); out.translate(sh(FAC.hedge), 0);                        // 緑の壁の前で立ち話をする人たち
      folks.forEach(function (f) { person(out, f.x, f, Math.sin(tf * f.sp + f.ph) * 0.6); });
      const wx = ((tf * 0.25) % (W + 120)) - 60;                           // 傘をさして歩く人
      if (wx > 100 && wx < 250) {
        const wy = FEET + Math.abs(Math.sin(tf * 0.18)) * 0.5 * -1;
        person(out, wx, { top: '#2b2b33', bot: '#2e2e38', hair: '#1a1a1a', h: 34 }, 0);
        out.fillStyle = '#16161c'; out.beginPath(); out.ellipse(wx + 1, wy - 36, 13, 6, 0, Math.PI, 0); out.fill();
        out.fillStyle = '#f2f2f2'; out.fillRect(wx - 12, wy - 36.4, 26, 0.8);
        out.fillStyle = '#16161c'; out.fillRect(wx + 0.6, wy - 36, 0.8, 8);
      }
      out.restore();

      place(fenceL, FAC.fence);
      out.drawImage(groundL.cv, -M, 0, W + 2 * M, H);                      // 歩道は動かさない
    }

    return { draw: draw };
  }

  Game.Render.StageStreet = { build: build };
})();
