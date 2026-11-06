// ステージ「スクランブル交差点」の背景。渋谷の交差点と円筒形のファッションビルの写真をもとに、形をデフォルメして自動で描く(写真は使わない)。
// ビルの看板・ポスターは実在のものではなく、文字なしの抽象的な図柄にしてある。
// くもり空、銀色の円筒形のビルと左右の箱形、青いガラスの格子、周りのビル群と大型ビジョン、信号と電柱、人だかり、横断歩道。
//   視差 : 空・遠景・円筒ビル・手前の建物が、奥ほど小さくずれる(歩道から手前は動かない)
//   動き : 流れる雲、信号の点滅、人だかりのゆれ、横断歩道を渡る人、手前の道を走る車
//   設定 : display.config.js の stage.list.scramble
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
    const rand = rng(47);
    const X0 = -M, X1 = W + M;
    const BASE = 132, WALK = 146;                 // ビルの足元、歩道の縁

    function layer() {
      const c = document.createElement('canvas');
      c.width = (W + 2 * M) * R; c.height = H * R;
      const x = c.getContext('2d');
      x.scale(R, R); x.translate(M, 0);
      return { cv: c, ctx: x };
    }
    const skyL = layer(), farL = layer(), towerL = layer(), nearL = layer(), groundL = layer();
    let ctx;
    const q = function (v) { return Math.round(v * R) / R; };
    const rect = function (x, y, w, h) { ctx.fillRect(q(x), q(y), Math.max(1 / R, q(w)), Math.max(1 / R, q(h))); };
    const fill = function (c) { ctx.fillStyle = c; };
    const poly = function (pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); };

    // ---- 空 ----
    ctx = skyL.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, BASE);
    g.addColorStop(0, '#c4ccd6'); g.addColorStop(1, '#eceff2');
    ctx.fillStyle = g; ctx.fillRect(X0, 0, X1 - X0, BASE + 4);

    // ---- 遠景のビル群(左右)----
    ctx = farL.ctx;
    const bl = function (x, w, top, c) {
      fill(c); rect(x, top, w, BASE - top);
      fill('rgba(70,80,100,0.2)'); for (let y = top + 4; y < BASE - 6; y += 5) rect(x + 1.5, y, w - 3, 2);
      fill('rgba(255,255,255,0.25)'); rect(x, top, 1, BASE - top);
    };
    bl(X0, 22, 40, '#a9b0ba'); bl(10, 18, 62, '#c2c6cc'); bl(26, 26, 78, '#b8bcc4'); bl(52, 22, 92, '#cfd2d6'); bl(70, 16, 84, '#bdb09a');
    bl(262, 14, 96, '#c6c9ce'); bl(276, 18, 84, '#b3b8c0'); bl(292, 16, 90, '#cdd0d4'); bl(306, 20, 72, '#b9bdc4');
    // 左端の大きなビジョン(抽象図柄)
    fill('#f4f4f6'); poly([[X0, 20], [20, 24], [20, 54], [X0, 52]]); fill('#d83f7a'); ctx.beginPath(); ctx.arc(2, 38, 8, 0, Math.PI * 2); ctx.fill();
    fill('#8c8f98'); rect(X0, 52, 34, 2);

    // ---- 銀色の円筒ビルと、左右の箱形・青いガラスの格子 ----
    ctx = towerL.ctx;
    const cx = 194, rr = 44;
    // 左右の箱形(斜めの下面)
    fill('#b8bcc2'); poly([[108, 30], [150, 18], [150, 74], [100, 74]]);
    fill('#7a808a'); poly([[100, 74], [150, 74], [150, 64], [118, 54]]);
    fill('#d4d7dc'); poly([[108, 30], [150, 18], [150, 22], [110, 34]]);
    fill('#c4c8ce'); poly([[238, 36], [256, 40], [256, 88], [238, 82]]);
    fill('#868c96'); poly([[238, 82], [256, 88], [256, 78], [238, 72]]);
    fill('#d8363a'); rect(256, 38, 3, 24);                                                      // 赤い縦帯
    // 背後の細長いビル(右)
    fill('#6a7684'); rect(256, 54, 22, BASE - 54);
    fill('#8794a4'); for (let y = 60; y < BASE - 6; y += 5) rect(257, y, 20, 1.6);
    fill('#2f3a4a'); rect(262, 60, 2, BASE - 60);
    // 円筒本体(横方向に陰影)
    const cg = ctx.createLinearGradient(cx - rr, 0, cx + rr, 0);
    cg.addColorStop(0, '#8d939b'); cg.addColorStop(0.3, '#c9cdd2'); cg.addColorStop(0.55, '#b4b9bf'); cg.addColorStop(1, '#7f858d');
    ctx.fillStyle = cg; ctx.fillRect(cx - rr, -4, rr * 2, BASE + 4);
    fill('rgba(70,76,88,0.35)');
    for (let y = 3; y < BASE; y += 7) rect(cx - rr, y, rr * 2, 0.7);                           // 横の継ぎ目
    for (let a = -80; a <= 80; a += 16) rect(cx + rr * Math.sin(a * Math.PI / 180), -4, 0.7, BASE + 4);   // 縦の継ぎ目(円筒の丸み)
    fill('#3a3f4a'); [[34, 30], [58, 26], [74, 24]].forEach(function (s) { ctx.beginPath(); ctx.ellipse(cx - 2, s[0], s[1] / 2 + 6, 2.6, 0, 0, Math.PI * 2); ctx.fill(); });   // 細長い窓
    fill('rgba(255,255,255,0.18)'); rect(cx - rr * 0.55, -4, 3, BASE + 4);
    // 円筒に掛かる大きな垂れ幕(抽象図柄:文字なし)
    fill('#2a1d3a'); rect(cx - 17, 6, 34, 38);
    fill('#c9a14a'); poly([[cx - 17, 40], [cx - 6, 36], [cx - 4, 44], [cx - 17, 44]]); poly([[cx + 17, 38], [cx + 8, 34], [cx + 10, 44], [cx + 17, 44]]);
    [[-9, 16], [0, 14], [9, 17], [-5, 26], [5, 27], [13, 25], [-12, 28]].forEach(function (p) {
      fill('#d9b89a'); ctx.beginPath(); ctx.arc(cx + p[0], p[1] + 2, 3.2, 0, Math.PI * 2); ctx.fill();
      fill('#171320'); ctx.beginPath(); ctx.arc(cx + p[0], p[1], 3.5, Math.PI, 0); ctx.fill();
      fill(['#3a3550', '#6a5a7a', '#232030'][Math.abs(p[0]) % 3]); rect(cx + p[0] - 3, p[1] + 5, 6, 6);
    });
    // 青いガラスの格子(左下)
    fill('#2a4a8a'); rect(96, 76, 56, BASE - 76);
    fill('#4f74b8'); for (let y = 78; y < BASE; y += 6) rect(96, y, 56, 0.8);
    for (let x = 98; x < 150; x += 6) rect(x, 76, 0.8, BASE - 76);
    fill('rgba(255,255,255,0.12)'); poly([[96, 76], [110, 76], [96, 100]]);
    fill('#1d3566'); ctx.lineWidth = 0.9; ctx.strokeStyle = '#1d3566'; ctx.beginPath(); for (let k = 0; k < 6; k++) { ctx.moveTo(98 + k * 9, 78); ctx.lineTo(116 + k * 9, BASE); } ctx.stroke();
    // 左の白い垂れ幕(抽象図柄)
    fill('#f6f6fa'); rect(112, 98, 24, 34); fill('#e6b6d0'); ctx.beginPath(); ctx.arc(124, 110, 6, 0, Math.PI * 2); ctx.fill();
    fill('#9fb8e0'); poly([[112, 126], [124, 116], [136, 124], [136, 132], [112, 132]]);
    fill('#b8b8c0'); rect(111, 98, 1, 34); rect(136, 98, 1, 34);
    // 入口:金色の庇とピンクの看板(文字なし)
    fill('#5a1a3a'); rect(152, 110, 62, 11); fill('#d4a84a'); rect(152, 110, 62, 1.4); rect(152, 120, 62, 1.4);
    fill('#d4a84a'); rect(151, 108, 2, 24); rect(213, 108, 2, 24);
    fill('#d83f90'); rect(158, 123, 46, 10); fill('#f6a6d0'); rect(158, 123, 46, 1.4);
    fill('#ffffff'); ctx.beginPath(); ctx.arc(172, 128, 3.6, 0, Math.PI * 2); ctx.fill(); fill('#d83f90'); ctx.beginPath(); ctx.arc(172, 128, 2.2, 0, Math.PI * 2); ctx.fill();
    fill('#ffffff'); rect(180, 126, 18, 1.4); rect(180, 129.5, 14, 1.4);

    // ---- 手前の建物(右:大型ビジョンのあるビル、左:電柱と街路樹)----
    ctx = nearL.ctx;
    // 右のビル群(遠近:右へ大きく)
    fill('#b4bac2'); poly([[300, 60], [340, 40], [340, BASE], [300, BASE]]);
    fill('#9aa2ac'); for (let y = 46; y < BASE - 6; y += 6) poly([[300, y + 14], [340, y], [340, y + 2], [300, y + 16]]);
    fill('#d0d4da'); poly([[336, 14], [X1, 0], [X1, BASE], [336, BASE]]);
    fill('#7e8794'); for (let y = 8; y < BASE - 8; y += 9) rect(342, y, X1 - 342, 3.4);
    fill('#2a2f3a'); poly([[372, 36], [X1, 20], [X1, BASE], [372, BASE]]);
    fill('#4a5260'); for (let y = 40; y < BASE - 6; y += 8) rect(374, y, X1 - 374, 1);
    fill('#9a64c8'); poly([[352, 46], [372, 40], [372, 96], [352, 100]]);                                 // 紫の大型ビジョン(図柄なし)
    fill('#c4a0e4'); rect(354, 52, 16, 2); rect(354, 58, 12, 2);
    fill('#d8363a'); rect(316, 70, 12, 8); fill('#fff'); rect(318, 72, 8, 1.4);                            // 赤い看板(文字なし)
    fill('#e8e8ee'); rect(332, 88, 3, 22); fill('#d8363a'); rect(332, 88, 3, 5);
    // 左の電柱と信号
    fill('#2a2e36'); rect(78, 56, 2.6, BASE - 56 + 14);
    fill('#2a2e36'); rect(50, 62, 32, 1.6);
    fill('#2a2e36'); rect(46, 62, 10, 8);
    fill('#4a505c'); rect(44, 60, 12, 12);
    // 信号の箱の光は draw で出す
    // 左の街路樹(葉のない冬の木)
    fill('#4a3a30');
    [[20, BASE, 22, 56], [32, BASE, 34, 66], [8, BASE, 6, 74]].forEach(function (t) {
      ctx.lineWidth = 2; ctx.strokeStyle = '#4a3a30'; ctx.beginPath(); ctx.moveTo(t[0], t[1]); ctx.lineTo(t[2], t[3]); ctx.stroke();
      ctx.lineWidth = 0.8; ctx.beginPath();
      for (let k = 0; k < 6; k++) { const by = t[3] + k * 8, bx = t[2]; ctx.moveTo(bx, by + 10); ctx.lineTo(bx + (k % 2 ? 10 : -10), by - 4); }
      ctx.stroke();
    });
    // 右の標識(青い丸・赤い丸)
    fill('#7a7d86'); rect(282, 78, 1.6, BASE - 78);
    [[283, 84, '#2a62c4'], [283, 96, '#d83a36']].forEach(function (p) { fill(p[2]); ctx.beginPath(); ctx.arc(p[0], p[1], 4.4, 0, Math.PI * 2); ctx.fill(); fill('#fff'); ctx.beginPath(); ctx.arc(p[0], p[1], 2.4, 0, Math.PI * 2); ctx.fill(); });

    // ---- 歩道・道路・横断歩道(動かない)----
    ctx = groundL.ctx;
    fill('#cdc8c0'); rect(X0, BASE, X1 - X0, WALK - BASE);                                               // 歩道
    fill('#b7b2aa'); for (let x = X0; x < X1; x += 14) rect(x, BASE + 6, 0.7, 8); rect(X0, BASE + 6, X1 - X0, 0.7);
    fill('#9c9aa0'); rect(X0, WALK, X1 - X0, 3);                                                         // 縁石
    fill('#e0ddd8'); rect(X0, WALK, X1 - X0, 1);
    fill('#6c6e75'); rect(X0, WALK + 3, X1 - X0, H - WALK - 3);                                          // 道路
    fill('#62646b'); for (let i = 0; i < 150; i++) rect(X0 + rand() * (X1 - X0), WALK + 4 + rand() * (H - WALK - 4), 1.8, 0.7);
    fill('#c76a62'); poly([[X0, 168], [150, 162], [210, 170], [150, 178], [X0, 182]]);                    // 赤い舗装の部分
    fill('#ededed'); for (let x = X0 + 8; x < X1; x += 26) rect(x, 154, 10, 1);                             // 車線の破線
    // 横断歩道:奥ほど細く、手前ほど太い縞
    for (let r = 0; r < 14; r++) {
      const x = -30 + r * 32;
      fill('#e8e8ea'); poly([[x, 160], [x + 14, 160], [x + 24, 224], [x - 6, 224]]);
      fill('#d2d2d6'); poly([[x + 11, 160], [x + 14, 160], [x + 24, 224], [x + 21, 224]]);
    }
    fill('#e8e8ea'); rect(X0, 156, X1 - X0, 1.6);                                                        // 停止線

    // ---- 動くもの ----
    const clouds = [{ y: 26, x: 40, sp: 0.01, s: 1.5 }, { y: 14, x: 250, sp: 0.014, s: 1.9 }, { y: 50, x: 320, sp: 0.008, s: 1.1 }];
    const FAC = { sky: 0.06, far: 0.16, tower: 0.28, near: 0.5 };
    const crowd = [];
    const coats = ['#232530', '#2e2a35', '#3a342e', '#c9b490', '#1c1f2a', '#8a4a44', '#e8e4dc', '#30343f'];
    for (let x = 156; x < 296; x += 4.6 + rand() * 2.4) crowd.push({ x: x, y: BASE + 8 + rand() * 7, c: coats[Math.floor(rand() * coats.length)], h: 17 + rand() * 6, ph: rand() * 6.28, sp: 0.04 + rand() * 0.05 });
    crowd.sort(function (a, b) { return a.y - b.y; });
    const walkers = [];
    for (let i = 0; i < 7; i++) walkers.push({ x: rand() * (W + 60), y: 176 + (i % 3) * 5, sp: (0.1 + rand() * 0.12) * (i % 2 ? 1 : -1), c: coats[(i * 3) % coats.length] });
    const cars = [
      { x: 20, y: 148, sp: 0.8, w: 26, c: '#efefef', van: true }, { x: 230, y: 148, sp: 0.5, w: 38, c: '#2f63b8', bus: true },
      { x: 120, y: 150, sp: -0.9, w: 30, c: '#f2f2f4', truck: true }
    ];

    function person(out, x, y, h, c, tf, ph) {
      const bob = Math.sin(tf * 0.07 + ph) * 0.5;
      out.fillStyle = '#17171c'; out.fillRect(x - 1.8, y - h * 0.38, 1.6, h * 0.38); out.fillRect(x + 0.2, y - h * 0.38, 1.6, h * 0.38);
      out.fillStyle = c; out.fillRect(x - 2.6, y - h * 0.82 + bob, 5.2, h * 0.46);
      out.fillStyle = '#e0b090'; out.beginPath(); out.arc(x, y - h * 0.9 + bob, 2.3, 0, Math.PI * 2); out.fill();
      out.fillStyle = '#1c1816'; out.beginPath(); out.arc(x, y - h * 0.94 + bob, 2.5, Math.PI, 0); out.fill();
    }
    function vehicle(out, c, x) {
      const y = c.y;
      out.fillStyle = 'rgba(0,0,0,0.2)'; out.fillRect(x - 1, y + 1, c.w + 2, 2);
      if (c.bus) {
        out.fillStyle = c.c; out.fillRect(x, y - 15, c.w, 15); out.fillStyle = '#dfe7f0'; out.fillRect(x + 2, y - 12, c.w - 4, 5);
        out.fillStyle = '#ffffff'; out.fillRect(x, y - 6, c.w, 2);
      } else if (c.truck) {
        out.fillStyle = c.c; out.fillRect(x, y - 15, c.w - 9, 15); out.fillRect(x + c.w - 9, y - 10, 9, 10);
        out.fillStyle = '#b9c8d8'; out.fillRect(x + c.w - 7, y - 9, 5, 4);
      } else {
        out.fillStyle = c.c; out.fillRect(x, y - 11, c.w, 11); out.fillStyle = '#9fb4c8'; out.fillRect(x + 3, y - 10, c.w - 6, 4);
      }
      out.fillStyle = '#16161a'; out.fillRect(x + 3, y - 2, 5, 4); out.fillRect(x + c.w - 8, y - 2, 5, 4);
    }

    function draw(out, midX, now) {
      const tf = (ST.animate === false) ? 0 : now / (1000 / 60);
      const sh = function (f) { return Math.round(-(midX / W - 0.5) * 2 * ST.parallax * f * R) / R; };
      const place = function (L, f) { out.drawImage(L.cv, -M + sh(f), 0, W + 2 * M, H); };
      place(skyL, FAC.sky);
      out.save(); out.translate(sh(FAC.sky), 0);
      clouds.forEach(function (c) {
        const x = ((c.x + tf * c.sp * 5) % (W + 180)) - 70;
        out.fillStyle = 'rgba(255,255,255,0.75)';
        [[0, 0, 26, 5], [-13, 2, 16, 3.6], [14, 2, 18, 4], [2, -3, 15, 3.6]].forEach(function (e) {
          out.beginPath(); out.ellipse(x + e[0] * c.s, c.y + e[1], e[2] * c.s, e[3] * c.s, 0, 0, Math.PI * 2); out.fill();
        });
      });
      out.restore();
      place(farL, FAC.far);
      place(towerL, FAC.tower);
      place(nearL, FAC.near);
      out.save(); out.translate(sh(FAC.near), 0);                                  // 信号(赤と青がゆっくり入れ替わる)
      const red = Math.floor(tf / 240) % 2 === 0;
      out.fillStyle = red ? '#ff3a3a' : '#2a1a1a'; out.beginPath(); out.arc(48, 66, 1.8, 0, Math.PI * 2); out.fill();
      out.fillStyle = red ? '#1a2a2a' : '#3adf9a'; out.beginPath(); out.arc(54, 66, 1.8, 0, Math.PI * 2); out.fill();
      out.restore();

      out.drawImage(groundL.cv, -M, 0, W + 2 * M, H);
      out.save(); out.translate(sh(FAC.tower), 0);                                // ビルの足元の人だかり
      crowd.forEach(function (p) { person(out, p.x, p.y, p.h, p.c, tf, p.ph); });
      out.restore();
      cars.forEach(function (c) {                                                 // 奥の道路を走る車
        const span = W + 140, x = (((c.x + tf * c.sp) % span) + span) % span - 70;
        vehicle(out, c, x);
      });
      walkers.forEach(function (w) {                                              // 横断歩道を渡る人
        const span = W + 60, x = (((w.x + tf * w.sp) % span) + span) % span - 30;
        person(out, x, w.y, 26, w.c, tf, w.x);
      });
    }
    return { draw: draw };
  }

  Game.Render.StageScramble = { build: build };
})();
