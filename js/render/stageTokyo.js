// ステージ「赤レンガの駅舎」の背景。東京駅の丸の内側の写真をもとに、形をデフォルメして自動で描く(写真は使わない)。
// くもり空、ガラスの高層ビル、赤レンガの駅舎(ドームと切妻屋根)、並木、芝生の広場、道路と横断歩道、黒い柵、敷石の歩道。
//   視差 : 空・高層ビル・駅舎・並木が、奥ほど小さくずれる(広場から手前は動かない)
//   動き : 流れる雲、広場を歩く人、道路を走る車
//   設定 : display.config.js の stage.list.tokyo
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
    const X0 = -M, X1 = W + M;
    const PLAZA = 110, ROAD0 = 126, ROAD1 = 180, WALK = 182;

    function layer() {
      const c = document.createElement('canvas');
      c.width = (W + 2 * M) * R; c.height = H * R;
      const x = c.getContext('2d');
      x.scale(R, R); x.translate(M, 0);
      return { cv: c, ctx: x };
    }
    const skyL = layer(), towerL = layer(), stationL = layer(), treeL = layer(), groundL = layer(), railL = layer();
    let ctx;
    const q = function (v) { return Math.round(v * R) / R; };
    const rect = function (x, y, w, h) { ctx.fillRect(q(x), q(y), Math.max(1 / R, q(w)), Math.max(1 / R, q(h))); };
    const fill = function (c) { ctx.fillStyle = c; };
    const tri = function (a, b, c) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.closePath(); ctx.fill(); };

    // ---- 空(くもり)----
    ctx = skyL.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, PLAZA);
    g.addColorStop(0, '#8a98a8'); g.addColorStop(0.55, '#c3ccd5'); g.addColorStop(1, '#e6e9ec');
    ctx.fillStyle = g; ctx.fillRect(X0, 0, X1 - X0, PLAZA + 4);

    // ---- ガラスの高層ビル ----
    ctx = towerL.ctx;
    const tower = function (x, w, top, c0, c1) {
      const gg = ctx.createLinearGradient(x, top, x + w, top + 80);
      gg.addColorStop(0, c0); gg.addColorStop(1, c1);
      ctx.fillStyle = gg; ctx.fillRect(x, top, w, PLAZA - top);
      fill('rgba(255,255,255,0.14)');
      for (let yy = top + 3; yy < PLAZA; yy += 4) rect(x, yy, w, 0.6);                       // 階のすじ
      fill('rgba(20,40,80,0.18)');
      for (let xx = x + 5; xx < x + w; xx += 6) rect(xx, top, 0.6, PLAZA - top);             // 縦の柱
      fill('rgba(255,255,255,0.22)'); tri([x + w * 0.2, top], [x + w * 0.45, top], [x + w * 0.1, top + 70]);   // 反射
      fill('rgba(30,50,90,0.30)'); rect(x + w - 3, top, 3, PLAZA - top);                     // 影の面
    };
    tower(-6, 22, 18, '#7d97b4', '#5e7893');
    tower(30, 64, 0, '#6a8fc4', '#4f78b0');
    tower(94, 50, 8, '#7e94aa', '#5f778f');
    tower(150, 44, 36, '#8d9eb0', '#6f8296');
    tower(250, 52, 0, '#5f8ccc', '#4673b3');
    tower(304, 22, 40, '#83939f', '#667a8c');
    tower(322, 28, 14, '#74869a', '#5a6e84');
    tower(352, 50, 2, '#7d98b8', '#5f7b9c');

    // ---- 赤レンガの駅舎 ----
    ctx = stationL.ctx;
    const BR = '#9b4a3b', BR2 = '#b25c47', WH = '#ece0cd', SL = '#383c4a', SL2 = '#505466';
    const wing = function (x0, x1, top) {
      fill(BR); rect(x0, top, x1 - x0, PLAZA - top);
      fill(WH); rect(x0, top, x1 - x0, 1.6); rect(x0, top + 15, x1 - x0, 1.2);              // 軒の白い帯
      for (let x = x0 + 2; x < x1 - 1; x += 7) {
        fill(WH); rect(x, top + 1.6, 1.4, PLAZA - top - 1.6);                                 // 白い柱
        fill('#2f2a38'); rect(x + 2.4, top + 4, 2.6, 9); rect(x + 2.4, top + 19, 2.6, 8);    // 窓
        fill('#6c5a62'); rect(x + 2.4, top + 4, 2.6, 1.4); rect(x + 2.4, top + 19, 2.6, 1.4);
      }
      fill(BR2); rect(x0, top + 28, x1 - x0, 1);
      fill(SL); rect(x0, top - 6, x1 - x0, 6);                                                // 屋根(スレート)
      fill(SL2); rect(x0, top - 6, x1 - x0, 1);
      fill('#6a4a44'); for (let x = x0 + 3; x < x1; x += 9) rect(x, top - 4.5, 3, 2.4);     // 屋根窓
    };
    wing(X0, X1, 74);
    const pavilion = function (cx, w, top, roofTop) {                                          // 切妻の張り出し部分
      const x0 = cx - w / 2, x1 = cx + w / 2;
      fill(BR); rect(x0, top, w, PLAZA - top);
      fill(WH); rect(x0, top, w, 1.6); rect(x0, top + 15, w, 1.2);
      fill(WH); rect(x0, top, 1.6, PLAZA - top); rect(x1 - 1.6, top, 1.6, PLAZA - top);
      for (let x = x0 + 4; x < x1 - 3; x += 6.5) { fill('#2f2a38'); rect(x, top + 4, 3, 9); rect(x, top + 19, 3, 8); fill(WH); rect(x + 3.2, top + 2, 0.9, PLAZA - top - 2); }
      fill(SL); tri([x0 - 2, top], [x1 + 2, top], [cx, roofTop]);                              // 三角屋根
      fill(SL2); ctx.beginPath(); ctx.moveTo(cx, roofTop); ctx.lineTo(x1 + 2, top); ctx.lineTo(x1 - 3, top); ctx.closePath(); ctx.fill();
      fill(WH); rect(cx - 0.4, roofTop - 6, 0.8, 7); tri([cx - 1.2, roofTop - 1], [cx + 1.2, roofTop - 1], [cx, roofTop - 7]);   // 避雷針
    };
    pavilion(92, 34, 62, 40);
    pavilion(292, 34, 62, 40);
    pavilion(192, 78, 56, 22);
    fill('#2a2430'); ctx.beginPath(); ctx.arc(192, 77, 5, Math.PI, 0); ctx.fill(); rect(187, 77, 10, 9);            // 中央のアーチ窓
    fill(WH); rect(186, 76, 1, 10); rect(197, 76, 1, 10);
    // ドーム(左右の端)
    [28, 362].forEach(function (cx) {
      fill('#5c6f6a'); ctx.beginPath(); ctx.ellipse(cx, 66, 17, 11, 0, Math.PI, 0); ctx.fill();
      fill('#7d918a'); ctx.beginPath(); ctx.ellipse(cx - 4, 63, 9, 6, 0, Math.PI, 0); ctx.fill();
      fill(WH); rect(cx - 17, 66, 34, 2);
      fill(BR); rect(cx - 15, 68, 30, 6);
      fill('#4a5560'); rect(cx - 0.6, 52, 1.2, 4);
    });

    // ---- 並木と街灯 ----
    ctx = treeL.ctx;
    const tree = function (x, h, s) {
      fill('#3a2b24'); rect(x - 1.2, PLAZA - h * 0.55, 2.4, h * 0.55 + 2);
      [[0, -h * 0.8, 11 * s, '#2b6232'], [-7 * s, -h * 0.55, 9 * s, '#2f6c36'], [7 * s, -h * 0.55, 9 * s, '#2a5f30'], [-2 * s, -h * 1.0, 8 * s, '#3b7a3e']].forEach(function (c) {
        fill(c[3]); ctx.beginPath(); ctx.arc(x + c[0], PLAZA + c[1], c[2], 0, Math.PI * 2); ctx.fill();
      });
      fill('#5c9a4c'); ctx.beginPath(); ctx.arc(x - 3 * s, PLAZA - h * 0.95, 3.4 * s, 0, Math.PI * 2); ctx.fill();
      fill('#3f8442'); ctx.beginPath(); ctx.arc(x + 5 * s, PLAZA - h * 0.7, 3 * s, 0, Math.PI * 2); ctx.fill();
    };
    [-4, 18, 44, 70, 96, 118].forEach(function (x, i) { tree(x, 40 + (i % 3) * 8, 1.1 - i * 0.05); });
    [276, 304, 332, 360, 384, 400].forEach(function (x, i) { tree(x, 36 + ((i + 1) % 3) * 9, 0.95 + (i % 3) * 0.08); });
    fill('#2d3138');                                                                           // 街灯
    [8, 52, 112, 270, 318, 372].forEach(function (x) { rect(x, PLAZA - 34, 0.9, 34); rect(x - 2, PLAZA - 36, 4.8, 2); fill('#e8ecf0'); rect(x - 1.5, PLAZA - 34, 3.8, 1.2); fill('#2d3138'); });

    // ---- 広場・道路・歩道(動かない)----
    ctx = groundL.ctx;
    fill('#cfcdc9'); rect(X0, PLAZA, X1 - X0, ROAD0 - PLAZA);                                  // 広場の石畳
    fill('#bdbbb7'); for (let x = X0; x < X1; x += 20) rect(x, PLAZA + 5, 0.8, 4); rect(X0, PLAZA + 9, X1 - X0, 0.8);
    fill('#4f8f45');                                                                           // 芝生
    tri([30, PLAZA + 3], [150, PLAZA + 3], [120, PLAZA + 13]); ctx.fillRect(30, PLAZA + 3, 120, 0.1);
    fill('#4f8f45'); tri([234, PLAZA + 3], [338, PLAZA + 3], [356, PLAZA + 13]);
    fill('#3f7c3a'); rect(36, PLAZA + 5, 110, 1.4); rect(240, PLAZA + 5, 96, 1.4);
    fill('#7d7c7c'); rect(X0, ROAD0 - 4, X1 - X0, 4);                                          // 広場の端の低い柵・縁石
    fill('#1f2024'); for (let x = X0 + 4; x < X1; x += 12) rect(x, ROAD0 - 6, 0.9, 6);
    fill('#2a2b30'); rect(X0, ROAD0 - 6, X1 - X0, 0.8);
    fill('#5f636b'); rect(X0, ROAD0, X1 - X0, ROAD1 - ROAD0);                                  // 道路
    fill('#555961'); for (let i = 0; i < 120; i++) rect(X0 + rand() * (X1 - X0), ROAD0 + rand() * (ROAD1 - ROAD0), 1.6, 0.6);
    fill('#e6e6e6');
    for (let x = X0 + 6; x < X1; x += 22) rect(x, ROAD0 + 6, 9, 0.9);                           // 車線(破線)
    for (let x = X0 + 14; x < X1; x += 24) rect(x, ROAD0 + 30, 11, 0.9);
    for (let i = 0; i < 12; i++) {                                                             // 横断歩道(遠近で細く)
      const x = 40 + i * 22; ctx.beginPath(); ctx.moveTo(x, ROAD0 + 10); ctx.lineTo(x + 16, ROAD0 + 10); ctx.lineTo(x + 24, ROAD0 + 18); ctx.lineTo(x + 6, ROAD0 + 18); ctx.fill();
    }
    fill('#8c8b8f'); rect(X0, ROAD1, X1 - X0, WALK - ROAD1);                                   // 縁石
    fill('#a8a7ac'); rect(X0, WALK, X1 - X0, H - WALK);                                        // 歩道
    const rows = [WALK, WALK + 9, WALK + 21, WALK + 36, H];
    for (let r = 0; r < rows.length - 1; r++) {
      const y0 = rows[r], y1 = rows[r + 1], w = 20 + r * 14;
      fill('#8f8e96'); rect(X0, y0, X1 - X0, 0.9);
      for (let x = X0 - (r % 2 ? w / 2 : 0); x < X1; x += w) {
        fill('#8f8e96'); rect(x, y0, 0.9, y1 - y0);
        if (rand() < 0.4) { fill(rand() < 0.5 ? '#b4b3ba' : '#9b9aa2'); rect(x + 1, y0 + 1, w - 1, y1 - y0 - 1); }
      }
    }

    // ---- 手前の黒い柵(動かない)----
    ctx = railL.ctx;
    for (let x = X0; x < X1 + 60; x += 112) {
      fill('#1b1c20'); rect(x, 150, 112, 1.6); rect(x, 166, 112, 1.6);                         // 横木
      for (let p = x + 8; p < x + 108; p += 7) rect(p, 152, 0.9, 14);                         // 縦棒
    }
    for (let x = X0 + 2; x < X1 + 60; x += 112) {
      fill('#1b1c20'); rect(x - 2.2, 144, 4.4, WALK - 144 + 2); fill('#3c3d44'); rect(x - 2.2, 144, 1, WALK - 144 + 2);
      fill('#1b1c20'); ctx.beginPath(); ctx.arc(x, 144, 2.2, Math.PI, 0); ctx.fill();
    }

    // ---- 動くもの ----
    const clouds = [{ y: 24, x: 20, sp: 0.012, s: 1.3 }, { y: 12, x: 170, sp: 0.016, s: 1.8 }, { y: 40, x: 300, sp: 0.01, s: 1.1 }];
    const walkers = [];
    for (let i = 0; i < 9; i++) walkers.push({ x: rand() * (W + 40), y: PLAZA + 8 + rand() * 8, sp: (0.05 + rand() * 0.08) * (rand() < 0.5 ? 1 : -1), c: ['#2b2f45', '#e8e8ee', '#3a3a46', '#6a4a3a', '#2a4a6a'][i % 5] });
    const cars = [
      { x: 40, lane: ROAD0 + 14, sp: 0.9, c: '#d9d9de', w: 26 }, { x: 260, lane: ROAD0 + 14, sp: 0.7, c: '#2c3a5e', w: 24 },
      { x: 150, lane: ROAD0 + 38, sp: -1.1, c: '#e8c23a', w: 26 }, { x: 330, lane: ROAD0 + 38, sp: -0.8, c: '#b8453a', w: 24 }
    ];
    const FAC = { sky: 0.08, tower: 0.18, station: 0.3, tree: 0.45 };

    function car(out, c, x) {
      const y = c.lane;
      out.fillStyle = 'rgba(0,0,0,0.22)'; out.fillRect(x - 1, y + 7, c.w + 2, 2);
      out.fillStyle = c.c; out.fillRect(x, y, c.w, 6);
      out.fillStyle = '#233042'; out.fillRect(x + 4, y - 4.5, c.w - 10, 4.5);
      out.fillStyle = c.c; out.fillRect(x + 3, y - 5.5, c.w - 8, 1.5);
      out.fillStyle = '#aebfd0'; out.fillRect(x + 6, y - 3.8, 4, 3); out.fillRect(x + c.w - 11, y - 3.8, 4, 3);
      out.fillStyle = '#111'; out.fillRect(x + 3, y + 5, 5, 3.2); out.fillRect(x + c.w - 8, y + 5, 5, 3.2);
    }

    function draw(out, midX, now) {
      const tf = (ST.animate === false) ? 0 : now / (1000 / 60);
      const sh = function (f) { return Math.round(-(midX / W - 0.5) * 2 * ST.parallax * f * R) / R; };
      const place = function (L, f) { out.drawImage(L.cv, -M + sh(f), 0, W + 2 * M, H); };
      place(skyL, FAC.sky);
      out.save(); out.translate(sh(FAC.sky), 0);
      clouds.forEach(function (c) {
        const cx = ((c.x + tf * c.sp * 5) % (W + 180)) - 70;
        out.fillStyle = 'rgba(255,255,255,0.7)';
        [[0, 0, 24, 5], [-12, 2, 15, 3.6], [13, 2, 17, 4], [2, -3, 14, 3.6]].forEach(function (e) {
          out.beginPath(); out.ellipse(cx + e[0] * c.s, c.y + e[1], e[2] * c.s, e[3] * c.s, 0, 0, Math.PI * 2); out.fill();
        });
      });
      out.restore();
      place(towerL, FAC.tower);
      place(stationL, FAC.station);
      place(treeL, FAC.tree);
      out.drawImage(groundL.cv, -M, 0, W + 2 * M, H);                                        // 広場から手前は動かさない

      walkers.forEach(function (w) {                                                         // 広場を歩く人(小さく)
        const x = ((w.x + tf * w.sp) % (W + 40) + (W + 40)) % (W + 40) - 20, y = w.y;
        const step = Math.sin(tf * 0.4 + w.x) * 0.5;
        out.fillStyle = '#25252c'; out.fillRect(x - 1.2, y - 3 + step * 0.3, 1, 3); out.fillRect(x + 0.4, y - 3 - step * 0.3, 1, 3);
        out.fillStyle = w.c; out.fillRect(x - 1.8, y - 7, 3.6, 4.2);
        out.fillStyle = '#d9ac8a'; out.fillRect(x - 1.1, y - 9.6, 2.2, 2.4);
        out.fillStyle = '#1c1816'; out.fillRect(x - 1.3, y - 9.9, 2.6, 1);
      });
      cars.forEach(function (c) {                                                            // 道路を走る車
        const span = W + 120;
        const x = (((c.x + tf * c.sp) % span) + span) % span - 60;
        car(out, c, x);
      });
      out.drawImage(railL.cv, -M, 0, W + 2 * M, H);
    }
    return { draw: draw };
  }

  Game.Render.StageTokyo = { build: build };
})();
