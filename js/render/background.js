// ステージ「夜の街」の背景。起動時に層(空・遠いビル・近いビル・地面)の画像へ描き出して使い回す。
// pixelScale に合わせた細かさで描く(窓の枠・空のグラデーション・月・路面などが細かくなる)。
//   視差 : 戦っている2人の位置に合わせて、奥の層ほど小さく・手前の層ほど大きくずれる(地面は動かない)
//   動き : 星のまたたき、窓の点滅、ゆっくり流れる雲、柵の向こうでゆれる観客
//   設定 : js/config/display.config.js の stage(parallax = ずれる量、animate = false で動きを止める)
(function () {
  'use strict';

  // 毎回同じ絵になる疑似乱数
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
  function mix(c1, c2, t) {
    return 'rgb(' + lerp(c1[0], c2[0], t) + ',' + lerp(c1[1], c2[1], t) + ',' + lerp(c1[2], c2[2], t) + ')';
  }

  function build() {
    const D = Game.Config.display;
    const R = Math.max(1, Math.round(D.pixelScale || 1));      // 細かさ(1ゲーム単位が何ドットか)
    const W = D.width, H = D.height, F = D.floorY;
    const ST = D.stage || { parallax: 14, animate: true };
    const M = Math.ceil(ST.parallax);                          // 視差でずれても端が見えないための余白(左右それぞれ)
    const rand = rng(7);

    // 層の画像を作る。座標は「画面の左端 = 0」のゲーム単位で描ける(左右に余白 M がある)
    function layer(h) {
      const c = document.createElement('canvas');
      c.width = (W + 2 * M) * R; c.height = (h || H) * R;
      const x = c.getContext('2d');
      x.scale(R, R);
      x.translate(M, 0);
      return { cv: c, ctx: x };
    }
    const skyL = layer(), farL = layer(), nearL = layer(), groundL = layer();
    let ctx = skyL.ctx;
    const stars = [];            // またたく星
    const blinkers = [];         // 点滅する窓
    const q = function (v) { return Math.round(v * R) / R; };  // 細かい1マスに丸める
    const rect = function (x, y, w, h) { ctx.fillRect(q(x), q(y), Math.max(1 / R, q(w)), Math.max(1 / R, q(h))); };

    // 空:色の帯。細かさに応じて帯の数を増やし、なめらかな夜空にする
    const top = [8, 10, 34], bottom = [58, 52, 110];
    const bands = 12 + (R - 1) * 12;
    const bandH = F / bands;
    for (let i = 0; i < bands; i++) {
      ctx.fillStyle = mix(top, bottom, i / (bands - 1));
      rect(-M, i * bandH, W + 2 * M, bandH + 1 / R);
    }

    // 星:細かさに応じて小さく、数も増やす。少数の明るい星は十字にきらめく
    const starN = 46 + (R - 1) * 40;
    for (let i = 0; i < starN; i++) {
      const x = rand() * W - M * 0 + (rand() * 2 - 1) * M * 0, y = rand() * (F * 0.55);
      const bright = rand() < 0.3;
      if (bright && R >= 2 && stars.length < 18 && rand() < 0.5) { stars.push({ x: x, y: y, ph: rand() * 6.28, sp: 0.04 + rand() * 0.05 }); continue; }
      ctx.fillStyle = bright ? '#ffffff' : '#9fa6d8';
      const s = (R >= 2 && rand() < 0.7) ? 0.5 : 1;
      rect(x, y, s, s);
      if (bright && R >= 2 && rand() < 0.25) {
        ctx.fillStyle = '#9fa6d8';
        rect(x - 1, y, 1, s); rect(x + s, y, 1, s); rect(x, y - 1, s, 1); rect(x, y + s, s, 1);
      }
    }

    // 月(三日月):細かい1マスずつ塗り、欠けた縁に影をつける
    const mx = 300, my = 40, mr = 13, step = 1 / R;
    for (let y = -mr; y <= mr; y += step) {
      for (let x = -mr; x <= mr; x += step) {
        const cx = x + step / 2, cy = y + step / 2;
        const inMoon = cx * cx + cy * cy <= mr * mr;
        const inCut = (cx - 5) * (cx - 5) + (cy + 2) * (cy + 2) <= (mr - 1) * (mr - 1);
        if (inMoon && !inCut) {
          // 欠けの縁に近いほど黄みを濃く、外側は少し暗く
          const dCut = Math.sqrt((cx - 5) * (cx - 5) + (cy + 2) * (cy + 2)) - (mr - 1);
          ctx.fillStyle = dCut < 1.2 ? '#f4efc8' : (Math.sqrt(cx * cx + cy * cy) > mr - 1.3 ? '#e2dcae' : '#efe9bc');
          ctx.fillRect(mx + x, my + y, step, step);
        }
      }
    }

    // 遠くのビル(窓の明かり付き)
    function buildings(color, rim, minH, maxH, minW, maxW, windows) {
      let x = -4 - M;
      while (x < W + M) {
        const w = Math.floor(minW + rand() * (maxW - minW));
        const h = Math.floor(minH + rand() * (maxH - minH));
        ctx.fillStyle = color;
        rect(x, F - h, w, h);
        ctx.fillStyle = rim;                                   // 屋上の縁と左の縁に淡い光
        rect(x, F - h, w, 1 / R * 2);
        rect(x, F - h, 1 / R * 2, h);
        if (windows) {
          // 屋上の設備(アンテナ・箱)
          if (rand() < 0.4) { ctx.fillStyle = color; rect(x + w * 0.3, F - h - 3, w * 0.25, 3); }
          if (rand() < 0.3) { ctx.fillStyle = color; rect(x + w * 0.7, F - h - 7, 0.5, 7); ctx.fillStyle = '#ff5a5a'; rect(x + w * 0.7 - 0.25, F - h - 8, 1, 1); }
          for (let wy = F - h + 5; wy < F - 6; wy += 6) {
            for (let wx = x + 3; wx < x + w - 4; wx += 5) {
              if (rand() < 0.32) {
                const warm = rand() < 0.7;
                if (R >= 2 && blinkers.length < 28 && rand() < 0.22) {     // 一部の窓は、あとで点滅させる
                  blinkers.push({ x: wx, y: wy, warm: warm, next: 60 + Math.floor(rand() * 600), on: true });
                  continue;
                }
                ctx.fillStyle = warm ? '#f6d36b' : '#8fd6f0';
                rect(wx, wy, 2, 3);
                ctx.fillStyle = warm ? '#fff3b8' : '#d8f4ff';  // 窓の中の明るい部分
                rect(wx, wy, 2, 1 / R * 2);
              } else if (R >= 2 && rand() < 0.5) {
                ctx.fillStyle = 'rgba(40,44,100,0.55)';        // 消えている窓
                rect(wx, wy, 2, 3);
              }
            }
          }
        }
        x += w + Math.floor(rand() * 3);
      }
    }
    ctx = farL.ctx;
    buildings('#101230', '#1a1c46', 28, 70, 20, 40, false);          // 遠いビル
    ctx = nearL.ctx;
    buildings('#1b1d46', '#2c2f6a', 70, 130, 22, 38, true);          // 近いビル(窓の明かり付き)

    // 地平線のもや:ビルの足元をぼかす
    ctx = nearL.ctx;
    const haze = ctx.createLinearGradient(0, F - 46, 0, F);
    haze.addColorStop(0, 'rgba(90,70,150,0)');
    haze.addColorStop(1, 'rgba(90,70,150,0.28)');
    ctx.fillStyle = haze;
    ctx.fillRect(-M, F - 46, W + 2 * M, 46);

    // 地面
    ctx = groundL.ctx;
    ctx.fillStyle = '#2b2540';
    rect(-M, F, W + 2 * M, H - F);
    ctx.fillStyle = '#4d4468';
    rect(-M, F, W + 2 * M, 2);
    ctx.fillStyle = '#5d5480';
    rect(-M, F, W + 2 * M, 1 / R * 2);
    ctx.fillStyle = '#1d1830';
    rect(-M, F + 16, W + 2 * M, 1);
    ctx.fillStyle = '#3a3252';
    for (let x = -M; x < W + M; x += 32) rect(x, F + 5, 14, 1);
    for (let x = 16 - M; x < W + M; x += 32) rect(x, F + 22, 14, 1);
    // 路面のざらつき(細かさに応じて)
    if (R >= 2) {
      for (let i = 0; i < 160 * R; i++) {
        ctx.fillStyle = rand() < 0.5 ? '#332c4a' : '#241f38';
        rect(rand() * W - M * 0, F + 3 + rand() * (H - F - 3), 1 / R * (1 + Math.floor(rand() * 3)), 1 / R);
      }
    }

    // ---- 動く部分と、層の重ね方 ----
    const crowd = [];
    const shirts = ['#3a3f7a', '#6a2f55', '#2f5a5a', '#7a5a2f', '#4a3a6a', '#2f3a4a'];
    for (let x = -M + 4; x < W + M; x += 9 + Math.floor(rand() * 4)) {
      crowd.push({ x: x, shirt: shirts[Math.floor(rand() * shirts.length)], ph: rand() * 6.28, sp: 0.06 + rand() * 0.05,
        h: 9 + Math.floor(rand() * 3), arms: rand() < 0.5 });
    }
    const clouds = [
      { y: 26, x: 40, sp: 0.012, s: 1.0 }, { y: 52, x: 210, sp: 0.018, s: 1.4 },
      { y: 38, x: 330, sp: 0.008, s: 0.8 }, { y: 70, x: 120, sp: 0.015, s: 1.1 }
    ];
    const FAC = { sky: 0.15, far: 0.35, near: 0.6, crowd: 0.85 };

    function draw(out, midX, now) {
      const tf = (ST.animate === false) ? 0 : now / (1000 / 60);     // 60分の1秒を単位にした時間
      const sh = function (f) {                                    // 層ごとのずれ(1/R に丸める)
        const v = -(midX / W - 0.5) * 2 * ST.parallax * f;
        return Math.round(v * R) / R;
      };
      const place = function (L, f) { out.drawImage(L.cv, -M + sh(f), 0, W + 2 * M, H); };
      place(skyL, FAC.sky);

      // またたく星と、ゆっくり流れる雲(空と一緒にずれる)
      out.save();
      out.translate(sh(FAC.sky), 0);
      stars.forEach(function (st) {
        const a = 0.45 + 0.55 * Math.sin(tf * st.sp + st.ph);
        out.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
        const x = Math.round(st.x * R) / R, y = Math.round(st.y * R) / R;
        out.fillRect(x, y, 1, 1);
        if (a > 0.85) { out.fillStyle = 'rgba(159,166,216,0.8)'; out.fillRect(x - 1, y, 1, 0.5); out.fillRect(x + 1, y, 1, 0.5); out.fillRect(x, y - 1, 0.5, 1); out.fillRect(x, y + 1, 0.5, 1); }
      });
      clouds.forEach(function (c) {
        const cx = ((c.x + tf * c.sp * 6) % (W + 160)) - 60;
        out.fillStyle = 'rgba(70,60,130,0.30)';
        [[0, 0, 22, 4], [-10, 2, 14, 3], [11, 2, 16, 3.2], [2, -2, 12, 3]].forEach(function (e) {
          out.beginPath();
          out.ellipse(cx + e[0] * c.s, c.y + e[1], e[2] * c.s, e[3] * c.s, 0, 0, Math.PI * 2);
          out.fill();
        });
      });
      out.restore();

      place(farL, FAC.far);
      place(nearL, FAC.near);

      // 点滅する窓(近いビルと一緒にずれる)
      out.save();
      out.translate(sh(FAC.near), 0);
      blinkers.forEach(function (w) {
        if (tf > w.next) { w.on = !w.on; w.next = tf + 120 + Math.floor(Math.abs(Math.sin(w.x * 12.9 + w.y + tf)) * 900); }
        if (ST.animate === false) w.on = true;
        if (!w.on) return;
        out.fillStyle = w.warm ? '#f6d36b' : '#8fd6f0'; out.fillRect(w.x, w.y, 2, 3);
        out.fillStyle = w.warm ? '#fff3b8' : '#d8f4ff'; out.fillRect(w.x, w.y, 2, 0.5);
      });
      out.restore();

      // 柵の向こうの観客(体が小さくゆれる)と柵
      out.save();
      out.translate(sh(FAC.crowd), 0);
      crowd.forEach(function (c) {
        const bob = Math.sin(tf * c.sp + c.ph) * 0.9;
        const bx = c.x, by = F - 8 + bob;
        out.fillStyle = '#05050a';
        out.fillRect(bx - 3.5, by - c.h - 0.5, 7, c.h + 1.5);
        out.fillStyle = c.shirt;
        out.fillRect(bx - 3, by - c.h * 0.55, 6, c.h * 0.55 + 1);                       // 体
        out.fillStyle = '#c99a78';
        out.beginPath(); out.arc(bx, by - c.h * 0.55 - 2.2, 2.4, 0, Math.PI * 2); out.fill();   // 頭
        out.fillStyle = '#17141f';
        out.beginPath(); out.arc(bx, by - c.h * 0.55 - 3.4, 2.5, Math.PI, 0); out.fill();      // 髪
        if (c.arms && Math.sin(tf * c.sp * 0.5 + c.ph) > 0.3) {                           // ときどき手を上げる
          out.fillStyle = '#c99a78';
          out.fillRect(bx - 4.3, by - c.h * 0.55 - 4, 1.4, 4); out.fillRect(bx + 2.9, by - c.h * 0.55 - 4, 1.4, 4);
        }
      });
      out.fillStyle = '#413a66'; out.fillRect(-M, F - 7, W + 2 * M, 1.2);                // 柵の横棒
      out.fillStyle = '#231f3a'; out.fillRect(-M, F - 5.8, W + 2 * M, 5.8);
      out.fillStyle = '#524a82';
      for (let x = -M; x < W + M; x += 24) out.fillRect(x, F - 9, 1.2, 9);                 // 柵の柱
      out.restore();

      out.drawImage(groundL.cv, -M, 0, W + 2 * M, H);                                      // 地面は動かさない
    }

    return { draw: draw };
  }

  // 写真から作った背景画像(tools/make_stage.py で作る)を使うステージ。
  //   画像は左右に余白 M を持つ。戦っている2人に合わせて少しだけ横にずらす(視差 factor)。
  //   読み込めない間・読み込みに失敗したときは、夜の街の背景を代わりに出す。
  function buildImage(src, fallback, factor) {
    const D = Game.Config.display;
    const W = D.width, H = D.height;
    const ST = D.stage || { parallax: 14 };
    const M = Math.ceil(ST.parallax);
    const img = new Image();
    let ready = false;
    img.onload = function () { ready = true; };
    img.onerror = function () { console.warn('ステージ画像を読み込めません: ' + src); };
    img.src = src;
    return {
      draw: function (out, midX, now) {
        if (!ready) { fallback.draw(out, midX, now); return; }
        const t = Math.max(-1, Math.min(1, (midX - W / 2) / (W / 2)));
        const shift = Math.round(-t * M * (factor === undefined ? 0.5 : factor) * 4) / 4;
        out.imageSmoothingEnabled = false;
        out.drawImage(img, -M + shift, 0, W + 2 * M, H);
      }
    };
  }

  // ステージの一覧(display.config.js の stage.list)から、背景を作る
  function buildStage(id) {
    const def = (Game.Config.display.stage.list || {})[id];
    if (def && def.builder && Game.Render[def.builder]) return Game.Render[def.builder].build();     // 自動で描くステージ
    const night = build();
    if (!def || !def.image) return night;
    return buildImage(def.image, night, def.parallax);
  }

  Game.Render.Background = { build: build, buildStage: buildStage };
})();
