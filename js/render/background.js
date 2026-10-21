// ステージ「夜の街」の背景。起動時に1枚の画像へ描き出して使い回す。
// pixelScale に合わせた細かさで描く(窓の枠・空のグラデーション・月・路面などが細かくなる)。
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
    const cv = document.createElement('canvas');
    cv.width = W * R; cv.height = H * R;
    const ctx = cv.getContext('2d');
    ctx.scale(R, R);                                           // 以降の座標はゲーム単位
    const rand = rng(7);
    const q = function (v) { return Math.round(v * R) / R; };  // 細かい1マスに丸める
    const rect = function (x, y, w, h) { ctx.fillRect(q(x), q(y), Math.max(1 / R, q(w)), Math.max(1 / R, q(h))); };

    // 空:色の帯。細かさに応じて帯の数を増やし、なめらかな夜空にする
    const top = [8, 10, 34], bottom = [58, 52, 110];
    const bands = 12 + (R - 1) * 12;
    const bandH = F / bands;
    for (let i = 0; i < bands; i++) {
      ctx.fillStyle = mix(top, bottom, i / (bands - 1));
      rect(0, i * bandH, W, bandH + 1 / R);
    }

    // 星:細かさに応じて小さく、数も増やす。少数の明るい星は十字にきらめく
    const starN = 46 + (R - 1) * 40;
    for (let i = 0; i < starN; i++) {
      const x = rand() * W, y = rand() * (F * 0.55);
      const bright = rand() < 0.3;
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
      let x = -4;
      while (x < W) {
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
    buildings('#1b1d46', '#2c2f6a', 70, 130, 22, 38, true);
    buildings('#101230', '#1a1c46', 28, 70, 20, 40, false);

    // 地平線のもや:ビルの足元をぼかす
    const haze = ctx.createLinearGradient(0, F - 46, 0, F);
    haze.addColorStop(0, 'rgba(90,70,150,0)');
    haze.addColorStop(1, 'rgba(90,70,150,0.28)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, F - 46, W, 46);

    // 地面
    ctx.fillStyle = '#2b2540';
    rect(0, F, W, H - F);
    ctx.fillStyle = '#4d4468';
    rect(0, F, W, 2);
    ctx.fillStyle = '#5d5480';
    rect(0, F, W, 1 / R * 2);
    ctx.fillStyle = '#1d1830';
    rect(0, F + 16, W, 1);
    ctx.fillStyle = '#3a3252';
    for (let x = 0; x < W; x += 32) rect(x, F + 5, 14, 1);
    for (let x = 16; x < W; x += 32) rect(x, F + 22, 14, 1);
    // 路面のざらつき(細かさに応じて)
    if (R >= 2) {
      for (let i = 0; i < 160 * R; i++) {
        ctx.fillStyle = rand() < 0.5 ? '#332c4a' : '#241f38';
        rect(rand() * W, F + 3 + rand() * (H - F - 3), 1 / R * (1 + Math.floor(rand() * 3)), 1 / R);
      }
    }

    return cv;
  }

  Game.Render.Background = { build: build };
})();
