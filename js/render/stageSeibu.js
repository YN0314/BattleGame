// ステージ「西武側の通り」の背景。駅前の通りの写真(photo/stages/seibu_front.png)をもとに、形をデフォルメして自動で描く(写真は使わない)。
// 青空の下の街:左に商店(丸い看板、縦のネオン、街路樹)、中央〜右に白いデパート(曲線のバルコニー、斜めの青い看板帯、縦のたれ幕)、
// 右手前にガラスの囲い(向こうに低木と人影)、手前に道路(白線、矢印)と、奥を走る車。看板に文字や実在のロゴは描かない。
//   視差 : 空・遠景・建物・車・囲いが、奥ほど小さくずれる(道路は動かない)
//   動き : 流れる雲、奥の道路を走る白いバン、囲いの向こうの人の身じろぎと煙
//   設定 : display.config.js の stage.list.seibu
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
    const rand = rng(31);
    const HZ = 136;                                   // 建物の足元(道路の奥の端)
    const KB = 178;                                   // 右の囲いの足元(縁石の上)
    const X0 = -M, X1 = W + M;

    function layer() {
      const c = document.createElement('canvas');
      c.width = (W + 2 * M) * R; c.height = H * R;
      const x = c.getContext('2d');
      x.scale(R, R); x.translate(M, 0);
      return { cv: c, ctx: x };
    }
    const skyL = layer(), farL = layer(), midL = layer(), groundL = layer(), propL = layer(), backL = layer(), frontL = layer();
    let ctx;
    const q = function (v) { return Math.round(v * R) / R; };
    const rect = function (x, y, w, h) { ctx.fillRect(q(x), q(y), Math.max(1 / R, q(w)), Math.max(1 / R, q(h))); };
    const fill = function (c) { ctx.fillStyle = c; };
    const poly = function (pts) { ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.fill(); };
    const disc = function (x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };

    // ---- 空 ----
    ctx = skyL.ctx;
    const sg = ctx.createLinearGradient(0, 0, 0, HZ + 4);
    sg.addColorStop(0, '#2f7fd8'); sg.addColorStop(0.5, '#66aeea'); sg.addColorStop(1, '#c4e2f6');
    ctx.fillStyle = sg; ctx.fillRect(X0, 0, X1 - X0, HZ + 4);

    // ---- 遠景:左の商店と遠くのビル ----
    ctx = farL.ctx;
    const grid = function (x, w, top, bot, c1, c2, sx, sy) {
      for (let wy = top + 4; wy < bot - 5; wy += sy) for (let wx = x + 3; wx < x + w - 3; wx += sx) { fill(rand() < 0.7 ? c1 : c2); rect(wx, wy, sx - 2, sy - 3); }
    };
    fill('#8db0d2'); rect(96, 58, 26, HZ - 58); fill('#7798bb'); rect(118, 58, 4, HZ - 58);             // 遠くの青いガラスのビル
    fill('#a9c8e4'); for (let y = 62; y < HZ - 6; y += 7) rect(98, y, 20, 3);
    fill('#eceff3'); rect(X0, 30, 38, HZ - 30); fill('#cdd4db'); rect(20, 30, 4, HZ - 30);              // 白いビルと丸い看板
    grid(X0, 38, 30, HZ, '#bcc8d4', '#a7b4c2', 7, 9);
    fill('#ffffff'); disc(6, 60, 14.5); fill('#e0364c'); disc(6, 60, 12.6); fill('#f4a53a'); disc(6, 60, 8.6);
    fill('#ffffff'); rect(1.6, 58.6, 8.8, 1.6); rect(1.6, 62, 8.8, 1.6);
    fill('#2a2d37'); rect(26, 36, 36, HZ - 36); fill('#1c1f27'); rect(58, 36, 4, HZ - 36);              // 暗いビルと縦のネオン
    fill('#f2c43a'); rect(26, 38, 36, 6);
    [['#f2d23a', 29], ['#e8573d', 35], ['#46b4e6', 41], ['#f2d23a', 47], ['#e8573d', 53]].forEach(function (n) {
      for (let y = 50; y < 112; y += 14 + Math.floor(rand() * 6)) { fill(n[0]); rect(n[1], y, 3, 9 + rand() * 4); }
    });
    fill('#8c4a3a'); rect(64, 74, 22, HZ - 74); fill('#6f392d'); rect(82, 74, 4, HZ - 74);              // 赤茶のビル
    grid(64, 22, 74, HZ, '#c9a79a', '#a98577', 5, 8);
    fill('#f0f2f5'); rect(80, 96, 22, HZ - 96); fill('#d3d9df'); rect(98, 96, 4, HZ - 96);              // 白い小さなビル
    grid(80, 22, 96, HZ, '#b9c4cf', '#9eabb8', 5, 7);
    fill('#2d6fc2'); rect(84, 100, 14, 6); fill('#ffffff'); rect(86, 102.6, 10, 1.1);
    fill('#5c4838'); rect(26, 108, 2.6, 22);                                                              // 街路樹
    [[24, 96, 13], [38, 92, 11], [30, 104, 12], [18, 106, 8]].forEach(function (t) {
      fill(rand() < 0.5 ? '#3f8040' : '#356f37'); ctx.beginPath(); ctx.ellipse(t[0], t[1], t[2], t[2] * 0.85, 0, 0, Math.PI * 2); ctx.fill();
    });

    // ---- 建物:白いデパート ----
    ctx = midL.ctx;
    const floors = function (x0, x1, y0, y1, step) {                       // 窓の帯と、曲線のバルコニー
      for (let y = y0; y < y1 - step + 1; y += step) {
        fill('#f6f7f9'); rect(x0, y, x1 - x0, step);
        fill('#586a80'); rect(x0, y + 1.4, x1 - x0, 3.2);
        fill('#9fb0c4'); rect(x0, y + 1.4, x1 - x0, 0.8);
        fill('#d2d9e1');
        for (let x = x0; x < x1; x += 8) { ctx.beginPath(); ctx.ellipse(x + 4, y + step - 2.4, 4, 2.4, 0, 0, Math.PI); ctx.fill(); }
      }
    };
    // 低い棟
    fill('#f4f5f7'); rect(72, 78, 114, HZ - 78);
    floors(72, 186, 82, HZ - 8, 9);
    fill('#dfe3e9'); rect(72, 78, 114, 3);
    fill('#e4e8ed'); rect(98, 70, 22, 8); rect(146, 72, 20, 6);                                            // 屋上の機械
    fill('#9ba3ac'); rect(119.6, 54, 0.9, 24); fill('#d9463a'); rect(119.2, 54, 1.7, 4);                   // 赤い先端のアンテナ
    fill('#e0e4ea'); rect(72, HZ - 10, 114, 10);                                                           // 1階
    fill('#2f6b4d'); rect(118, HZ - 9, 62, 3); fill('#244f3a'); rect(118, HZ - 6, 62, 0.9);                // 緑のひさし
    fill('#3b4452'); rect(76, HZ - 5, 40, 5); rect(122, HZ - 5, 56, 5);
    // 塔(斜めの看板の下に窓の帯)
    fill('#f2f4f6'); poly([[184, 52], [334, -2], [334, HZ], [184, HZ]]);
    ctx.save(); ctx.beginPath(); ctx.moveTo(184, 68); ctx.lineTo(334, 14); ctx.lineTo(334, HZ); ctx.lineTo(184, HZ); ctx.closePath(); ctx.clip();
    floors(184, 312, 18, HZ - 8, 11);
    ctx.restore();
    fill('#dfe3e8'); rect(306, 0, 6, HZ);
    fill('#e4e7eb'); rect(312, -2, 20, HZ + 2); fill('#c9ced5'); rect(312, -2, 1.2, HZ + 2); rect(330.6, -2, 1.4, HZ + 2);   // 縦の柱
    fill('#2c7bd0'); poly([[184, 52], [334, -2], [334, 14], [184, 68]]);                                   // 斜めの青い看板帯
    fill('#79b6f0'); poly([[184, 52], [334, -2], [334, 0.6], [184, 53.6]]);
    fill('#1f5fae'); poly([[184, 66.4], [334, 12.4], [334, 14], [184, 68]]);
    fill('#ffffff');                                                                                       // 看板の白いかたまり(文字は描かない)
    [[198, 7, 9], [214, 5, 9], [226, 7, 9], [240, 6, 9], [254, 8, 9]].forEach(function (b) {
      const by = 60.4 - (b[0] - 184) * 0.3649;
      poly([[b[0], by - 3], [b[0] + b[1], by - 3 - b[1] * 0.3649], [b[0] + b[1], by + b[2] - 3 - b[1] * 0.3649], [b[0], by + b[2] - 3]]);
    });
    fill('#3a63b0'); rect(181, 84, 5.6, 44); fill('#cfe0f6'); rect(182, 86, 1, 40);                         // 縦の青い看板
    fill('#6d4a3a'); rect(258, 46, 14, 56); fill('#85604b');                                              // 茶色の壁
    for (let y = 48; y < 100; y += 4) rect(258, y, 14, 0.8);
    const BN = ['#2d5fb8', '#f4f4f4', '#d9503f', '#2d5fb8', '#f4f4f4', '#7fb6e6', '#d9503f'];              // 縦のたれ幕
    BN.forEach(function (c, i) { fill(c); rect(214 + i * 4.8, 66 + (i % 2) * 2, 4.2, 56 - (i % 2) * 2); fill('rgba(255,255,255,0.35)'); rect(214 + i * 4.8, 66 + (i % 2) * 2, 4.2, 1.2); });
    // 右の白いビル
    fill('#f6f7f9'); rect(332, -2, X1 - 332, HZ + 2);
    fill('#dde2e7'); for (let y = 14; y < HZ; y += 18) rect(332, y, X1 - 332, 1); for (let x = 350; x < X1; x += 24) rect(x, -2, 1, HZ + 2);
    fill('#8c6b4a'); rect(336, 2, 14, 74); fill('#a98458'); for (let y = 6; y < 74; y += 6) rect(336, y, 14, 1);   // 茶色のガラス
    fill('#d0d6dd'); rect(X0, HZ - 4, X1 - X0, 4);

    // ---- 道路 ----
    ctx = groundL.ctx;
    const rg = ctx.createLinearGradient(0, HZ, 0, H);
    rg.addColorStop(0, '#7b7f88'); rg.addColorStop(0.35, '#666a73'); rg.addColorStop(1, '#4b4f58');
    ctx.fillStyle = rg; ctx.fillRect(X0, HZ, X1 - X0, H - HZ);
    for (let i = 0; i < 140; i++) {                                                                        // アスファルトのむら
      const py = HZ + 2 + rand() * (H - HZ - 4);
      fill(rand() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)'); rect(X0 + rand() * (X1 - X0), py, 6 + rand() * 18, 1 + rand() * 1.4);
    }
    fill('#9fa3ab'); rect(X0, HZ, X1 - X0, 1.2);
    fill('#f1f2f4');                                                                                       // 奥へ伸びる白線
    poly([[X0, 214], [X0, 217], [176, 156], [176, 153.6]]);
    for (let k = 0; k < 6; k++) {                                                                          // 破線
      const t0 = 0.12 + k * 0.145, t1 = t0 + 0.07, ax = 70, ay = 224, bx = 190, by = 160;
      const x0 = ax + (bx - ax) * t0, y0 = ay + (by - ay) * t0, x1 = ax + (bx - ax) * t1, y1 = ay + (by - ay) * t1, wd = 2.4 - t0 * 1.4;
      poly([[x0, y0], [x1, y1], [x1 + wd, y1], [x0 + wd, y0]]);
    }
    poly([[262, 150], [290, 150], [296, 153], [266, 153]]); poly([[236, 146], [262, 146], [265, 148.4], [240, 148.4]]);   // 奥の停止線
    fill('#f1f2f4'); poly([[34, 196], [44, 186], [54, 196], [48, 196], [48, 222], [40, 222], [40, 196]]);   // 路面の矢印
    fill('rgba(0,0,0,0.12)'); rect(X0, 218, X1 - X0, 6);

    // ---- 建物の足元の物:ガードレール、標識、停まっている車 ----
    ctx = propL.ctx;
    fill('#6e7884'); rect(78, 140, 56, 1.1); rect(78, 144, 56, 1.1);
    for (let x = 78; x <= 134; x += 7) rect(x, 138, 1.4, 8);
    fill('#9aa2ab'); rect(131.4, 108, 1.3, 36); fill('#d9302c'); disc(132, 110, 4); fill('#ffffff'); rect(129.6, 109.4, 4.8, 1.4);   // 進入禁止の標識
    fill('#bfc5cc'); rect(128, 126, 8, 12); fill('#2f9b6a'); rect(129, 127, 6, 5);                          // 緑の案内板
    const car = function (x, y, w, h, body, glass) {
      fill('rgba(0,0,0,0.25)'); ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 0.6, w * 0.5, 1.6, 0, 0, Math.PI * 2); ctx.fill();
      fill(body); rect(x, y + h * 0.35, w, h * 0.55); poly([[x + w * 0.16, y + h * 0.36], [x + w * 0.28, y], [x + w * 0.74, y], [x + w * 0.88, y + h * 0.36]]);
      fill(glass); poly([[x + w * 0.2, y + h * 0.34], [x + w * 0.3, y + h * 0.1], [x + w * 0.5, y + h * 0.1], [x + w * 0.5, y + h * 0.34]]);
      poly([[x + w * 0.54, y + h * 0.34], [x + w * 0.54, y + h * 0.1], [x + w * 0.72, y + h * 0.1], [x + w * 0.84, y + h * 0.34]]);
      fill('#15171c'); disc(x + w * 0.22, y + h * 0.92, h * 0.22); disc(x + w * 0.78, y + h * 0.92, h * 0.22);
      fill('#c9ced6'); disc(x + w * 0.22, y + h * 0.92, h * 0.1); disc(x + w * 0.78, y + h * 0.92, h * 0.1);
    };
    car(172, 134, 46, 18, '#1a2236', '#7fa6c2');                                                           // 黒いタクシー
    fill('#f1f3f5'); rect(180, 143, 8, 2.4); fill('#f2c43a'); rect(193, 131.6, 6, 2.4);                     // 白い帯と屋根の行灯
    car(40, 138, 24, 13, '#f2f4f6', '#6f8aa6');                                                            // 左の遠い車
    car(66, 138, 20, 12, '#262a33', '#6f8aa6');

    // ---- 右の囲いの向こう(低木と人影)----
    ctx = backL.ctx;
    const RT = function (x) { return 84 - (x - 258) * 0.157; };                                            // 囲いの上の枠の高さ(右へ上がる)
    const bays = [[258, 283], [283, 326], [326, 368], [368, X1]];
    bays.forEach(function (b) {
      fill('#cfdde3'); poly([[b[0], RT(b[0])], [b[1], RT(b[1])], [b[1], 148], [b[0], 148]]);
      fill('#b9ccd4'); rect(b[0], 116, b[1] - b[0], 32);
      for (let x = b[0] - 4; x < b[1] + 4; x += 7 + rand() * 4) {                                           // 低木:枯れ葉の茶色と緑
        const hh = 10 + rand() * 12, cc = rand();
        fill(cc < 0.4 ? '#a26a3a' : cc < 0.7 ? '#c28a3e' : '#2f5f3c'); ctx.beginPath(); ctx.ellipse(x, 142 - hh * 0.4, 6, hh * 0.65, 0, 0, Math.PI * 2); ctx.fill();
      }
    });
    fill('#3b3f48'); rect(258, 112, X1 - 258, 2);                                                         // 向こうの手すり

    // ---- 右の囲い(ガラスと柱、灰色の壁)----
    ctx = frontL.ctx;
    bays.forEach(function (b) {                                                                            // ガラスの色と、斜めの反射
      const gg = ctx.createLinearGradient(0, 80, 0, 148);
      gg.addColorStop(0, 'rgba(190,222,242,0.50)'); gg.addColorStop(1, 'rgba(140,176,192,0.34)');
      ctx.fillStyle = gg; poly([[b[0], RT(b[0])], [b[1], RT(b[1])], [b[1], 148], [b[0], 148]]);
      ctx.save(); ctx.beginPath(); ctx.moveTo(b[0], RT(b[0])); ctx.lineTo(b[1], RT(b[1])); ctx.lineTo(b[1], 148); ctx.lineTo(b[0], 148); ctx.closePath(); ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      for (let x = b[0] + 4; x < b[1]; x += 15) { ctx.beginPath(); ctx.moveTo(x, 70); ctx.lineTo(x + 5, 70); ctx.lineTo(x - 9, 150); ctx.lineTo(x - 14, 150); ctx.fill(); }
      ctx.restore();
    });
    fill('#9aa2a8'); poly([[258, 84], [X1, 62], [X1, 68], [258, 90]]);                                    // 上の枠
    fill('#c8cdd1'); poly([[258, 84], [X1, 62], [X1, 63.4], [258, 85.4]]);
    [258, 283, 326, 368].forEach(function (x, i) {                                                         // 柱
      const w = i === 0 ? 5 : 3.6, top = RT(x) - 1;
      fill('#8b9399'); rect(x - w / 2, top, w, 148 - top); fill('#c0c6cb'); rect(x - w / 2, top, 1, 148 - top); fill('#6a7177'); rect(x + w / 2 - 0.8, top, 0.8, 148 - top);
    });
    fill('#8d949a'); rect(258, 146, X1 - 258, KB - 146);                                                   // 下の灰色の壁
    fill('#adb4b9'); rect(258, 146, X1 - 258, 2.4); fill('#767d83'); rect(258, 150, X1 - 258, 0.8);
    fill('#737a80'); [283, 326, 368].forEach(function (x) { rect(x - 0.5, 148, 1, KB - 148); });
    fill('#7c848a'); rect(258, KB - 3, X1 - 258, 3);
    fill('#7d848a'); poly([[234, 96], [258, 84], [258, KB], [234, KB]]);                                  // 手前の大きな灰色の壁
    fill('#9ea5aa'); poly([[234, 96], [240, 93], [240, KB], [234, KB]]); fill('#686f75'); rect(256.6, 84, 1.4, KB - 84);
    fill('#868d92'); poly([[240, 93], [258, 84], [258, 87], [240, 96]]);
    fill('#d0d2d5'); rect(230, KB, X1 - 230, 5); fill('#a1a5a9'); rect(230, KB + 5, X1 - 230, 1.4);        // 縁石
    fill('rgba(0,0,0,0.14)'); rect(230, KB + 6.4, X1 - 230, 3);

    // ---- 動くもの ----
    const clouds = [{ y: 20, x: 20, sp: 0.014, s: 1.3 }, { y: 40, x: 150, sp: 0.02, s: 1.6 }, { y: 14, x: 300, sp: 0.009, s: 1 }];
    const FAC = { sky: 0.08, far: 0.2, mid: 0.45, fence: 0.8 };
    const folks = [                                                                                        // 囲いの向こうの人影(ガラス越し)
      { x: 300, c: '#26262e', h: 22, sp: 0.04, ph: 0.4 }, { x: 314, c: '#3c3a46', h: 24, sp: 0.05, ph: 1.9 },
      { x: 346, c: '#4a4036', h: 22, sp: 0.045, ph: 3.1 }, { x: 358, c: '#23252e', h: 25, sp: 0.04, ph: 4.4 },
      { x: 384, c: '#30303a', h: 23, sp: 0.05, ph: 5.3 }
    ];
    function person(out, f, bob) {
      const x = f.x, y = 130 + bob;
      out.fillStyle = f.c;
      out.beginPath(); out.moveTo(x - 4.6, y); out.lineTo(x - 4.6, y - f.h * 0.48); out.quadraticCurveTo(x - 4.6, y - f.h * 0.64, x, y - f.h * 0.64);
      out.quadraticCurveTo(x + 4.6, y - f.h * 0.64, x + 4.6, y - f.h * 0.48); out.lineTo(x + 4.6, y); out.closePath(); out.fill();
      out.beginPath(); out.arc(x, y - f.h * 0.76, 3.1, 0, Math.PI * 2); out.fill();
      out.fillStyle = 'rgba(255,255,255,0.18)'; out.fillRect(x - 4, y - f.h * 0.62, 1.6, f.h * 0.5);
    }

    function draw(out, midX, now) {
      const tf = (ST.animate === false) ? 0 : now / (1000 / 60);
      const sh = function (f) { return Math.round(-(midX / W - 0.5) * 2 * ST.parallax * f * R) / R; };
      const place = function (L, f) { out.drawImage(L.cv, -M + sh(f), 0, W + 2 * M, H); };

      place(skyL, FAC.sky);
      out.save(); out.translate(sh(FAC.sky), 0);                                  // 流れる雲
      clouds.forEach(function (c) {
        const cx = ((c.x + tf * c.sp * 5) % (W + 160)) - 60;
        out.fillStyle = 'rgba(255,255,255,0.82)';
        [[0, 0, 24, 4.6], [-12, 2, 15, 3.4], [13, 2, 17, 3.6], [2, -2.6, 14, 3.5]].forEach(function (e) {
          out.beginPath(); out.ellipse(cx + e[0] * c.s, c.y + e[1], e[2] * c.s, e[3] * c.s, 0, 0, Math.PI * 2); out.fill();
        });
      });
      out.restore();
      place(farL, FAC.far);
      place(midL, FAC.mid);
      out.drawImage(groundL.cv, -M, 0, W + 2 * M, H);                             // 道路は動かさない
      out.save(); out.translate(sh(FAC.mid), 0);                                  // 奥の道路を走る白いバン
      {
        const vx = ((tf * 0.22 + 300) % 520) - 70;
        out.fillStyle = 'rgba(0,0,0,0.22)'; out.beginPath(); out.ellipse(vx + 11, 150.4, 12, 1.4, 0, 0, Math.PI * 2); out.fill();
        out.fillStyle = '#f4f5f7'; out.fillRect(vx, 140, 22, 9); out.fillRect(vx + 17, 142, 6, 7);
        out.fillStyle = '#6f8aa6'; out.fillRect(vx + 18, 142.6, 4, 2.6); out.fillRect(vx + 2, 141.6, 5, 2.4);
        out.fillStyle = '#15171c'; out.beginPath(); out.arc(vx + 5, 149.4, 1.9, 0, Math.PI * 2); out.arc(vx + 18, 149.4, 1.9, 0, Math.PI * 2); out.fill();
      }
      out.restore();
      place(propL, FAC.mid);
      place(backL, FAC.fence);
      out.save(); out.translate(sh(FAC.fence), 0);                                // ガラスの向こうの人と煙
      folks.forEach(function (f) { person(out, f, Math.sin(tf * f.sp + f.ph) * 0.6); });
      [[314, 0], [358, 1.7]].forEach(function (s) {
        for (let k = 0; k < 3; k++) {
          const t = ((tf * 0.012 + s[1] * 0.3 + k / 3) % 1);
          out.fillStyle = 'rgba(240,242,246,' + (0.5 * (1 - t)).toFixed(3) + ')';
          out.beginPath(); out.arc(s[0] + 4 + Math.sin(t * 6 + s[1]) * 1.6, 106 - t * 16, 1 + t * 1.6, 0, Math.PI * 2); out.fill();
        }
      });
      out.restore();
      place(frontL, FAC.fence);
    }

    return { draw: draw };
  }

  Game.Render.StageSeibu = { build: build };
})();
