// キャラの絵。関節の位置(頭・胸・腰・手・足首)からポーズを決め、
// 腕と脚は関節の曲がり(2本の骨のIK)で自動的に計算し、1ドットずつ塗って描き出す。
// 起動時に一度だけ画像へ描いて使い回す。細かさは Game.Config.display.pixelScale で決まる。
//
// 座標はゲーム内の単位。原点は足元の中央、上方向がY負、右向きで描く(左向きは描画側で反転)。
// ポーズ名:技のポーズは moves.config.js の技名と同じ。frame は 0:発生前 1:攻撃中 2:硬直。
// 将来は本物のスプライト画像へ差し替えられる(get() が同じ形の画像を返せばよい)。
(function () {
  'use strict';

  const RES = Math.max(1, Math.round(Game.Config.display.pixelScale || 1));
  const W = 64 * RES, H = 64 * RES;              // 1枚の画像の大きさ
  const OX = 32 * RES, OY = 58 * RES;            // 画像内での原点(足元)
  const LX = -0.5, LY = 0.87;                    // 影になる方向(左下)
  const ARM1 = 8.5, ARM2 = 8.5;                  // 上腕・前腕の長さ
  const LEG1 = 11, LEG2 = 10.5;                  // 太もも・すねの長さ
  const GY = -2.4;                               // 地面に立つときの足首の高さ

  // ---- 小さな道具 ----
  function hexToRgb(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }
  function mid(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
  function add(a, dx, dy) { return [a[0] + dx, a[1] + dy]; }

  // 2本の骨のIK:p0(付け根)から p1(先端)へ届く関節位置を求める。s は曲がる向き(+1/-1)
  function ik(p0, p1, l1, l2, s) {
    let dx = p1[0] - p0[0], dy = p1[1] - p0[1];
    let d = Math.hypot(dx, dy);
    const maxD = (l1 + l2) * 0.999;
    if (d > maxD) { dx *= maxD / d; dy *= maxD / d; d = maxD; }     // 届かないときは伸ばしきる
    if (d < 0.001) return { joint: [p0[0], p0[1] + l1], end: [p0[0], p0[1]] };
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const ux = dx / d, uy = dy / d;
    return {
      joint: [p0[0] + ux * a + s * uy * h, p0[1] + uy * a - s * ux * h],
      end: [p0[0] + dx, p0[1] + dy]
    };
  }

  // ---- 1ドットずつ塗る道具 ----
  const DARK = { g: 'G', G: 'G', s: 'S', S: 'S', w: 'w', t: 'T', T: 'T', x: 'x', n: 'N', N: 'N', k: 'K', K: 'K', h: 'h', b: 'b' };   // 奥側の手足は暗い色にして奥行きを出す

  function createRaster(pal) {
    const lateFns = [];
    const data = new Uint8ClampedArray(W * H * 4);
    const rgb = {};
    Object.keys(pal).forEach(function (k) { rgb[k] = hexToRgb(pal[k]); });

    function put(x, y, key) {
      const c = rgb[key], i = (y * W + x) * 4;
      data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
    }

    // 太さが変わる棒(カプセル)。shade を渡すと影側を塗り分ける
    function capsule(a, b, ra, rb, key, shade, thr, dark) {
      const ax = OX + a[0] * RES, ay = OY + a[1] * RES, bx = OX + b[0] * RES, by = OY + b[1] * RES;
      const r1 = Math.max(0.8, ra * RES), r2 = Math.max(0.8, rb * RES);
      const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy, len = Math.sqrt(len2);
      let nx = LX, ny = LY;
      if (len > 0.0001) {
        nx = dy / len; ny = -dx / len;
        if (nx * LX + ny * LY < 0) { nx = -nx; ny = -ny; }
      }
      const rmax = Math.max(r1, r2);
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - rmax)), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + rmax));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by) - rmax)), y1 = Math.min(H - 1, Math.ceil(Math.max(ay, by) + rmax));
      const k0 = dark ? DARK[key] : key;
      const k1 = shade ? (dark ? DARK[shade] : shade) : null;
      const th = thr === undefined ? 0.3 : thr;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5;
          const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
          const cx = ax + dx * t, cy = ay + dy * t, r = r1 + (r2 - r1) * t;
          const ox = px - cx, oy = py - cy;
          if (ox * ox + oy * oy <= r * r) {
            put(x, y, (k1 && (ox * nx + oy * ny) > r * th) ? k1 : k0);
          }
        }
      }
    }

    function circle(c, r, key, shade, thr, dark) { capsule(c, c, r, r, key, shade, thr, dark); }

    // 任意の形:fn(x, y) がゲーム内座標で色キーまたは null を返す
    function shape(lx0, ly0, lx1, ly1, fn) {
      const x0 = Math.max(0, Math.floor(OX + lx0 * RES)), x1 = Math.min(W - 1, Math.ceil(OX + lx1 * RES));
      const y0 = Math.max(0, Math.floor(OY + ly0 * RES)), y1 = Math.min(H - 1, Math.ceil(OY + ly1 * RES));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const k = fn((x + 0.5 - OX) / RES, (y + 0.5 - OY) / RES);
          if (k) put(x, y, k);
        }
      }
    }

    function triangle(p, q, r, key) {
      const minX = Math.min(p[0], q[0], r[0]), maxX = Math.max(p[0], q[0], r[0]);
      const minY = Math.min(p[1], q[1], r[1]), maxY = Math.max(p[1], q[1], r[1]);
      const sign = function (a, b, c) { return (a[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (a[1] - c[1]); };
      shape(minX, minY, maxX, maxY, function (x, y) {
        const pt = [x, y];
        const d1 = sign(pt, p, q), d2 = sign(pt, q, r), d3 = sign(pt, r, p);
        const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
        return (neg && pos) ? null : key;
      });
    }

    // 輪郭線を付けて画像にする。線の太さは、どの細かさでもゲーム内で同じ(0.5単位)に見えるようにする
    function toCanvas() {
      const o = rgb.o;
      const thick = Math.max(1, Math.round(RES / 2));
      for (let pass = 0; pass < thick; pass++) {
        const src = new Uint8ClampedArray(data);
        const a = function (x, y) { return (x < 0 || y < 0 || x >= W || y >= H) ? 0 : src[(y * W + x) * 4 + 3]; };
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            if (a(x, y) !== 0) continue;
            if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) {
              const i = (y * W + x) * 4;
              data[i] = o[0]; data[i + 1] = o[1]; data[i + 2] = o[2]; data[i + 3] = 255;
            }
          }
        }
      }
      lateFns.forEach(function (fn) { fn(); });                       // 輪郭線のあとに描く効果(軌跡・衝撃マーク)
      // 絵のある範囲だけに切り詰める(メモリと描画の節約)。足元の位置は originX / originY に持たせる
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (data[(y * W + x) * 4 + 3]) {
            if (x < x0) x0 = x; if (x > x1) x1 = x;
            if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
        }
      }
      if (x1 < 0) { x0 = y0 = 0; x1 = y1 = 0; }
      const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
      const crop = new Uint8ClampedArray(cw * ch * 4);
      for (let y = 0; y < ch; y++) {
        crop.set(data.subarray(((y0 + y) * W + x0) * 4, ((y0 + y) * W + x0 + cw) * 4), y * cw * 4);
      }
      const cv = document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      cv.getContext('2d').putImageData(new ImageData(crop, cw, ch), 0, 0);
      cv.originX = OX - x0;
      cv.originY = OY - y0;
      return cv;
    }

    return { capsule: capsule, circle: circle, shape: shape, triangle: triangle, toCanvas: toCanvas, late: function (fn) { lateFns.push(fn); } };
  }

  // ---- 体のパーツ ----
  function drawLeg(R, root, target, bend, back) {
    const r = ik(root, target, LEG1, LEG2, bend);
    const k = r.joint, a = r.end;
    R.capsule(root, k, 4.3, 3.7, 'g', 'G', 0.35, back);                    // 太もも(道着)
    R.capsule(k, mid(k, a, 0.6), 3.7, 3.1, 'g', 'G', 0.35, back);          // すね(道着)
    R.capsule(mid(k, a, 0.55), a, 2.6, 2.2, 's', 'S', 0.3, back);          // すねの下(素肌)
    let toe;
    if (a[1] >= -4) {
      toe = [a[0] + 5.5, a[1] + 0.3];                                      // 地面に着いている足は前向き
    } else {
      const ux = a[0] - k[0], uy = a[1] - k[1], l = Math.hypot(ux, uy) || 1;
      toe = [a[0] + ux / l * 5, a[1] + uy / l * 5];                        // 浮いている足は脚の向きに伸ばす
    }
    R.capsule([a[0] - 1, a[1]], toe, 2.4, 1.9, 's', 'S', 0.3, back);       // 足
  }

  // 開いた手:手のひらから指が扇状に出る(dir = 前腕の向き)
  function openHand(R, e, h, key, shade, back) {
    let ux = h[0] - e[0], uy = h[1] - e[1];
    const l = Math.hypot(ux, uy) || 1; ux /= l; uy /= l;
    [-0.55, -0.18, 0.18, 0.55].forEach(function (a) {
      const c = Math.cos(a), sn = Math.sin(a);
      const dx = ux * c - uy * sn, dy = ux * sn + uy * c;
      R.capsule(h, [h[0] + dx * 4.6, h[1] + dy * 4.6], 1.0, 0.7, key, shade, 0.3, back);
    });
    R.circle(h, 2.4, key, shade, 0.3, back);
  }

  function drawArm(R, sh, target, bend, back, open) {
    const r = ik(sh, target, ARM1, ARM2, bend);
    const e = r.joint, h = r.end;
    R.capsule(sh, e, 3.1, 2.8, 'g', 'G', 0.35, back);                      // 上腕(道着の袖)
    R.capsule(e, h, 2.4, 2.1, 's', 'S', 0.3, back);                        // 前腕(素肌)
    R.capsule(e, mid(e, h, 0.3), 3.0, 2.8, 'g', 'G', 0.35, back);          // 袖口
    R.capsule(mid(e, h, 0.68), mid(e, h, 0.92), 2.5, 2.5, 'w', null, 0, back);   // 手の巻き布
    if (open) openHand(R, e, h, 's', 'S', back);
    else R.circle(h, 2.9, 's', 'S', 0.3, back);                            // こぶし
  }

  function drawTorso(R, chest, hip, head) {
    const rc = 6.2, rh = 5.5;
    R.capsule([chest[0] + 1, chest[1] - 5], [head[0] - 0.5, head[1] + 2], 2.3, 2.3, 's', 'S', 0.3);   // 首
    R.capsule(chest, hip, rc, rh, 'g', 'G', 0.45);                                                    // 胴(道着)

    // 襟元:V字の素肌と合わせの線
    const ty = chest[1] - rc;
    R.triangle([chest[0] + 0.8, ty + 0.2], [chest[0] + 5.2, ty + 0.2], [chest[0] + 3.2, ty + 5], 's');
    R.capsule([chest[0] + 3.2, ty + 4.6], mid(chest, hip, 0.75), 0.45, 0.45, 'G', null, 0);

    // 帯と結び目、垂れ
    let ux = hip[0] - chest[0], uy = hip[1] - chest[1];
    const ul = Math.hypot(ux, uy) || 1;
    ux /= ul; uy /= ul;
    let vx = uy, vy = -ux;
    if (vx < 0) { vx = -vx; vy = -vy; }
    const bp = mid(chest, hip, 0.8);
    R.capsule([bp[0] - vx * 5.4, bp[1] - vy * 5.4], [bp[0] + vx * 5.4, bp[1] + vy * 5.4], 1.8, 1.8, 'b', null, 0);
    const knot = [bp[0] + vx * 4.3, bp[1] + vy * 4.3];
    R.capsule(knot, [knot[0] - 1.4, knot[1] + 6.6], 1.0, 0.85, 'b', null, 0);
    R.capsule(knot, [knot[0] + 1.7, knot[1] + 5.2], 1.0, 0.85, 'b', null, 0);
    R.circle(knot, 1.8, 'b', null, 0);
  }

  // 表情:kind = normal / shout(気合い) / strain(食いしばり) / pain(苦悶) / guard / focus / dizzy / down
  function drawFace(R, hx, hy, kind, shirt) {
    const ex = hx + 3.2, ey = hy + (shirt ? 0.8 : 1.2), by = ey - (shirt ? 2.4 : 1.9);
    kind = kind || 'normal';
    // 眉
    const brow = function (l, r) { R.capsule([ex - 1.1, by + l], [ex + 1.1, by + r], 0.32, 0.32, 'e', null, 0); };
    if (kind === 'shout' || kind === 'strain' || kind === 'guard') brow(0.7, -0.6);       // 吊り上げ(鼻側が下)
    else if (kind === 'pain') brow(-0.8, 0.5);                                           // 八の字
    else if (kind === 'focus') brow(0.35, -0.2);
    else if (kind === 'dizzy') brow(-0.5, 0.2);
    else brow(0, 0);
    // 目
    if (kind === 'pain') {
      R.capsule([ex - 1.3, ey - 1.0], [ex + 0.7, ey], 0.3, 0.3, 'e', null, 0);
      R.capsule([ex - 1.3, ey + 1.0], [ex + 0.7, ey], 0.3, 0.3, 'e', null, 0);
    } else if (kind === 'down') {
      R.capsule([ex - 1.3, ey + 0.2], [ex + 1.2, ey + 0.2], 0.3, 0.3, 'e', null, 0);
    } else if (kind === 'dizzy') {
      R.shape(ex - 2, ey - 2, ex + 2, ey + 2, function (x, y) {
        const d = Math.hypot(x - ex, y - ey);
        return ((d <= 1.6 && d >= 1.0) || d < 0.4) ? 'e' : null;
      });
    } else if (kind === 'shout' || kind === 'strain' || kind === 'guard' || kind === 'focus') {
      R.shape(ex - 1.5, ey - 0.4, ex + 1.5, ey + 0.8, function () { return 'e'; });         // 細めた目
    } else {
      R.shape(ex - 0.6, ey - 0.6, ex + 0.6, ey + 0.6, function () { return 'e'; });
    }
    // 口
    const mx = hx + 3.8, my = hy + 3.4;
    if (kind === 'shout' || kind === 'pain') {
      const ry = kind === 'pain' ? 1.5 : 1.25;
      R.shape(mx - 2, my - 2, mx + 2, my + 2, function (x, y) {
        const u = (x - mx) / 1.5, v = (y - my) / ry;
        return u * u + v * v <= 1 ? 'e' : null;
      });
    } else if (kind === 'strain' || kind === 'guard') {
      R.shape(mx - 2, my - 2, mx + 2, my + 2, function (x, y) {   // 食いしばった歯
        if (Math.abs(x - mx) > 1.6 || y < my - 0.9 || y > my + 0.9) return null;
        return (y < my - 0.45 || y > my + 0.45 || Math.abs(x - mx) > 1.3) ? 'e' : 'w';
      });
    } else if (kind === 'dizzy') {
      R.capsule([mx - 1.3, my], [mx - 0.2, my + 0.5], 0.3, 0.3, 'e', null, 0);
      R.capsule([mx - 0.2, my + 0.5], [mx + 1.4, my - 0.2], 0.3, 0.3, 'e', null, 0);
    } else if (kind === 'down') {
      R.shape(mx - 1.2, my - 0.5, mx + 1.2, my + 0.9, function () { return 'e'; });
    } else {
      R.capsule([mx - 0.8, my - 0.1], [mx + 0.8, my - 0.2], 0.35, 0.35, 'S', null, 0);
    }
  }

  function drawHead(R, hd, kind) {
    const hx = hd[0], hy = hd[1], r = 5.4;
    // 後ろに跳ねる髪と鉢巻の端は、頭より先に・後に描く
    R.capsule([hx - 3.5, hy - 4.5], [hx - 9, hy - 6.2], 1.9, 0.8, 'h', null, 0);
    R.capsule([hx - 1, hy - 5.2], [hx - 3.4, hy - 9.2], 1.7, 0.7, 'h', null, 0);
    R.capsule([hx + 1.6, hy - 5.2], [hx + 2.6, hy - 8.6], 1.5, 0.6, 'h', null, 0);

    R.shape(hx - r - 1, hy - r - 1, hx + r + 1, hy + r + 1, function (x, y) {
      const dx = x - hx, dy = y - hy;
      if (dx * dx + dy * dy > r * r) return null;
      if (dy < -2.6) return 'h';                                   // 髪(上)
      if (dy <= -1.1) return 'k';                                  // 鉢巻
      if (dx < -2.9 && dy < 2.8) return 'h';                       // 髪(後ろ)
      if (dx * LX + dy * LY > r * 0.62) return 'S';                // 顔の影
      return 's';
    });

    R.circle([hx - 0.4, hy + 0.9], 1.3, 'S', null, 0);                                     // 耳
    R.capsule([hx - 5, hy - 1.8], [hx - 11.5, hy + 1.6], 0.95, 0.7, 'k', null, 0);        // 鉢巻の端
    R.capsule([hx - 5, hy - 1.8], [hx - 10, hy - 1.2], 0.9, 0.6, 'k', null, 0);
    R.circle([hx + 5.4, hy + 1.2], 1.0, 's', 'S', 0.3);                                   // 鼻
    drawFace(R, hx, hy, kind, false);                                                    // 眉・目・口
  }

  // ---- ワイシャツ姿(style: 'shirt')のパーツ ----
  function drawLegShirt(R, root, target, bend, back) {
    const r = ik(root, target, LEG1, LEG2, bend);
    const k = r.joint, a = r.end;
    R.capsule(root, k, 4.9, 4.3, 't', 'T', 0.35, back);                    // 太もも(スラックス)
    R.capsule(k, a, 4.3, 3.7, 't', 'T', 0.35, back);                       // すね(スラックス。足首まで)
    let toe;
    if (a[1] >= -4) {
      toe = [a[0] + 6, a[1] + 0.2];
    } else {
      const ux = a[0] - k[0], uy = a[1] - k[1], l = Math.hypot(ux, uy) || 1;
      toe = [a[0] + ux / l * 5.5, a[1] + uy / l * 5.5];
    }
    R.capsule([a[0] - 1, a[1]], toe, 2.7, 2.2, 'x', null, 0, back);        // 革靴
  }

  function drawArmShirt(R, sh, target, bend, back, open) {
    const r = ik(sh, target, ARM1, ARM2, bend);
    const e = r.joint, h = r.end;
    R.capsule(sh, e, 3.3, 3.0, 'g', 'G', 0.35, back);                      // 上腕(シャツ)
    R.capsule(e, mid(e, h, 0.86), 3.0, 2.5, 'g', 'G', 0.35, back);         // 前腕(長袖)
    R.capsule(mid(e, h, 0.72), mid(e, h, 0.9), 2.6, 2.6, 'G', null, 0, back);   // 袖口(カフス)
    if (open) openHand(R, e, h, 's', 'S', back);
    else R.circle(h, 2.7, 's', 'S', 0.3, back);                            // 手
  }

  function drawTorsoShirt(R, chest, hip, head) {
    const rc = 6.6, rh = 6.0;
    const waist = mid(chest, hip, 0.72);
    R.capsule([chest[0] + 1, chest[1] - 5], [head[0] - 0.5, head[1] + 2], 2.5, 2.5, 's', 'S', 0.3);   // 首
    R.capsule(waist, hip, rh + 0.2, rh, 't', 'T', 0.4);                                              // 腰まわり(スラックス)
    // シャツはズボンの中に入れる:丸い端がベルトの線より下に出ないよう、端をその分だけ胸側に寄せる
    let tx = waist[0] - chest[0], ty0 = waist[1] - chest[1];
    const tl = Math.hypot(tx, ty0) || 1;
    const shirtEnd = [waist[0] - tx / tl * (rh - 0.6), waist[1] - ty0 / tl * (rh - 0.6)];
    R.capsule(chest, shirtEnd, rc, rh, 'g', 'G', 0.45);                                              // 胴(シャツ)

    // ベルトとバックル
    let ux = hip[0] - chest[0], uy = hip[1] - chest[1];
    const ul = Math.hypot(ux, uy) || 1;
    ux /= ul; uy /= ul;
    let vx = uy, vy = -ux;
    if (vx < 0) { vx = -vx; vy = -vy; }
    R.capsule([waist[0] - vx * 5.9, waist[1] - vy * 5.9], [waist[0] + vx * 5.9, waist[1] + vy * 5.9], 1.1, 1.1, 'b', null, 0);
    R.shape(waist[0] + vx * 3.6 - 1.2, waist[1] + vy * 3.6 - 1.2, waist[0] + vx * 3.6 + 1.2, waist[1] + vy * 3.6 + 1.2, function () { return 'm'; });

    // 襟とネクタイ
    const ty = chest[1] - rc;
    R.capsule([chest[0] - 0.6, ty + 0.6], [chest[0] + 2.6, ty + 1.8], 1.5, 1.4, 'g', 'G', 0.2);       // 襟(奥)
    R.capsule([chest[0] + 5.2, ty + 0.9], [chest[0] + 3.0, ty + 2.2], 1.5, 1.3, 'g', 'G', 0.2);       // 襟(手前)
    const kn = [chest[0] + 3.0, ty + 2.4];
    const tipX = chest[0] + 3.6 + (waist[0] - chest[0]) * 0.55;
    const tip = [tipX, mid(chest, waist, 0.8)[1]];
    R.triangle([kn[0] - 2.0, kn[1] + 1], [kn[0] + 2.0, kn[1] + 1], [tip[0], tip[1]], 'n');            // ネクタイ本体
    R.capsule([kn[0] + 0.2, kn[1] + 3], [tip[0] + 0.1, tip[1] - 2], 0.35, 0.35, 'N', null, 0);        // 柄の筋
    R.circle(kn, 1.7, 'n', 'N', 0.2);                                                                 // 結び目
  }

  function drawHeadShirt(R, hd, kind) {
    const hx = hd[0], hy = hd[1], r = 5.4;
    R.shape(hx - r - 1, hy - r - 1, hx + r + 1, hy + r + 1, function (x, y) {
      const dx = x - hx, dy = y - hy;
      if (dx * dx + dy * dy > r * r) return null;
      if (dy < -2.9 || (dy < -2.0 && dx < 1.2)) return 'h';        // 短い髪(上)
      if (dx < -2.7 && dy < 2.6) return 'h';                       // 髪(後ろ・もみあげ)
      if (dx * LX + dy * LY > r * 0.62) return 'S';                // 顔の影
      return 's';
    });
    R.circle([hx - 0.4, hy + 0.9], 1.3, 'S', null, 0);                                     // 耳
    // 眼鏡:丸いレンズの枠と、耳へのつる
    const gx = hx + 3.0, gy = hy + 0.5;
    R.shape(gx - 2.5, gy - 2.5, gx + 2.5, gy + 2.5, function (x, y) {
      const d = Math.hypot(x - gx, y - gy);
      return (d <= 2.2 && d >= 1.55) ? 'f' : null;
    });
    R.capsule([gx - 2.0, gy - 0.4], [hx - 0.8, hy - 0.2], 0.3, 0.3, 'f', null, 0);
    R.circle([hx + 5.4, hy + 1.5], 1.0, 's', 'S', 0.3);                                   // 鼻
    drawFace(R, hx, hy, kind, true);                                                     // 眉・目・口
  }

  function paintShirt(p, pal) {
    const R = createRaster(pal);
    const hipF = add(p.hip, 1.8, 0), hipB = add(p.hip, -1.8, 0);
    const shF = p.shF || add(p.chest, 2.2, -3.4), shB = p.shB || add(p.chest, -2.2, -3.4);
    drawLegShirt(R, hipB, p.ankleB, p.bendB, true);
    drawLegShirt(R, hipF, p.ankleF, p.bendF, false);
    drawTorsoShirt(R, p.chest, p.hip, p.head);
    const d = p.d || {};
    drawArmShirt(R, shB, p.handB, p.armBendB, true, d.oB);
    drawHeadShirt(R, p.head, d.f);
    drawArmShirt(R, shF, p.handF, p.armBendF, false, d.oF);
    drawFx(R, p, d.fx);
    return R.toCanvas();
  }

  // ---- 汎用の人物(style: 'casual')。髪型・服・体格を look.opts で変えて、いろいろなキャラを作る ----
  //   opts.hair   : short / spiky / buzz / bald / long / pony / bun / buns / afro
  //   opts.top    : long(長袖) / tee(半袖) / tank(袖なし) / bare(上半身裸) / dress(ワンピース・チャイナ服)
  //   opts.bottom : pants / shorts / skirt(ワンピース用。素足) / none
  //   opts.thick  : 体の太さ(1 = ふつう、1.25 = 大柄、0.9 = 細身)
  //   opts.beard / opts.band(鉢巻) / opts.gloves(グローブ) / opts.glasses
  // パレットのキー: s,S=肌 h=髪 g,G=上着 t,T=ズボン n,N=飾り b=ベルト x=靴 k=鉢巻・グローブ・髪留め f=眼鏡 w o c C e
  function drawLegC(R, o, root, target, bend, back) {
    const th = o.thick || 1, bt = o.bottom || 'pants';
    const r = ik(root, target, LEG1, LEG2, bend), k = r.joint, a = r.end;
    const skinLeg = (bt === 'skirt' || bt === 'none');
    if (bt === 'pants') {
      R.capsule(root, k, 4.7 * th, 4.0 * th, 't', 'T', 0.35, back);
      R.capsule(k, a, 4.0 * th, 3.4 * th, 't', 'T', 0.35, back);
    } else if (bt === 'shorts') {
      R.capsule(root, mid(root, k, 0.9), 4.9 * th, 4.5 * th, 't', 'T', 0.35, back);
      R.capsule(mid(root, k, 0.8), k, 4.0 * th, 3.6 * th, 's', 'S', 0.3, back);
      R.capsule(k, mid(k, a, 0.8), 3.6 * th, 2.9 * th, 's', 'S', 0.3, back);
      R.capsule(mid(k, a, 0.75), a, 3.3 * th, 3.0 * th, 'n', 'N', 0.25, back);       // ソックス
    } else {
      R.capsule(root, k, 4.2 * th, 3.5 * th, 's', 'S', 0.3, back);
      R.capsule(k, a, 3.5 * th, 2.6 * th, 's', 'S', 0.3, back);
    }
    let toe;
    if (a[1] >= -4) toe = [a[0] + 6, a[1] + 0.2];
    else { const ux = a[0] - k[0], uy = a[1] - k[1], l = Math.hypot(ux, uy) || 1; toe = [a[0] + ux / l * 5.5, a[1] + uy / l * 5.5]; }
    R.capsule([a[0] - 1, a[1]], toe, 2.7 * th, 2.2 * th, 'x', null, 0, back);
    return skinLeg;
  }

  function drawArmC(R, o, sh, target, bend, back, open) {
    const th = o.thick || 1, tp = o.top || 'long';
    const r = ik(sh, target, ARM1, ARM2, bend), e = r.joint, h = r.end;
    const sleeve = (tp === 'long' || tp === 'dress');
    if (tp === 'bare' || tp === 'tank') {
      R.capsule(sh, e, 3.3 * th, 3.0 * th, 's', 'S', 0.3, back);
      R.capsule(e, h, 2.8 * th, 2.4 * th, 's', 'S', 0.3, back);
    } else if (tp === 'tee') {
      R.capsule(sh, e, 3.5 * th, 3.2 * th, 'g', 'G', 0.35, back);
      R.capsule(e, h, 2.8 * th, 2.4 * th, 's', 'S', 0.3, back);
    } else {
      R.capsule(sh, e, 3.4 * th, 3.0 * th, 'g', 'G', 0.35, back);
      R.capsule(e, mid(e, h, 0.86), 3.0 * th, 2.5 * th, 'g', 'G', 0.35, back);
      R.capsule(mid(e, h, 0.72), mid(e, h, 0.9), 2.6 * th, 2.6 * th, 'n', null, 0, back);   // 袖口の飾り
    }
    if (o.gloves) {
      R.capsule(mid(e, h, 0.55), h, 3.2 * th, 3.2 * th, 'k', null, 0, back);
      if (open) openHand(R, e, h, 'k', null, back); else R.circle(h, 4.1 * th, 'k', 'K', 0.3, back);
    } else if (open) openHand(R, e, h, 's', 'S', back);
    else R.circle(h, 2.8 * th, 's', 'S', 0.3, back);
  }

  function drawTorsoC(R, o, chest, hip, head) {
    const th = o.thick || 1, tp = o.top || 'long', bt = o.bottom || 'pants';
    const rc = 6.3 * th, rh = 5.8 * th;
    const waist = mid(chest, hip, 0.72);
    R.capsule([chest[0] + 1, chest[1] - 5], [head[0] - 0.5, head[1] + 2], 2.5 * th, 2.5 * th, 's', 'S', 0.3);   // 首
    const dress = (tp === 'dress');
    if (!dress && bt !== 'none') R.capsule(waist, hip, rh + 0.2, rh, bt === 'skirt' ? 'g' : 't', bt === 'skirt' ? 'G' : 'T', 0.4);
    if (dress) {                                       // ワンピース:胴からスカートまで一続き。すそは少し広がる
      R.capsule(mid(chest, hip, 0.3), [hip[0], hip[1] + 6], rh + 0.4, rh + 1.3, 'g', 'G', 0.4);
    }
    let tx = waist[0] - chest[0], ty0 = waist[1] - chest[1];
    const tl = Math.hypot(tx, ty0) || 1;
    const shirtEnd = [waist[0] - tx / tl * (rh - 0.6), waist[1] - ty0 / tl * (rh - 0.6)];
    const bare = (tp === 'bare');
    R.capsule(chest, dress ? hip : shirtEnd, rc, rh, bare ? 's' : 'g', bare ? 'S' : 'G', 0.45);
    let ux = hip[0] - chest[0], uy = hip[1] - chest[1];
    const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
    let vx = uy, vy = -ux; if (vx < 0) { vx = -vx; vy = -vy; }
    if (bare) {                                         // 胸と腹の陰影
      R.capsule([chest[0] + 1.5, chest[1] - 1], [chest[0] + 4.2, chest[1] - 1], 2.0, 2.0, 'S', null, 0);
      R.capsule([waist[0] + 1.5, waist[1] - 3], [waist[0] + 3.2, waist[1] - 3], 1.0, 1.0, 'S', null, 0);
    }
    if (bt !== 'skirt' && !dress) R.capsule([waist[0] - vx * 5.9 * th, waist[1] - vy * 5.9 * th], [waist[0] + vx * 5.9 * th, waist[1] + vy * 5.9 * th], 1.2, 1.2, 'b', null, 0);
    if (dress) R.capsule([waist[0] - vx * 5.6, waist[1] - vy * 5.6], [waist[0] + vx * 5.6, waist[1] + vy * 5.6], 1.2, 1.2, 'n', null, 0);   // 帯
    // 襟元:飾り(ストライプ/縁取り)
    const ty = chest[1] - rc;
    if (tp === 'dress') R.capsule([chest[0] + 3.4, ty + 1.2], mid(chest, hip, 0.95), 0.9, 0.9, 'n', null, 0);   // チャイナ服の合わせ
    else if (tp === 'tank') {                                                                                // 肩ひもの縁
      R.capsule([chest[0] - 2.5, ty + 0.8], [chest[0] + 4.8, ty + 0.8], 1.0, 1.0, 'n', null, 0);
    } else if (tp === 'long' || tp === 'tee') R.capsule([chest[0] + 0.2, ty + 0.9], [chest[0] + 5.0, ty + 0.9], 1.1, 1.1, 'n', null, 0);
  }

  function drawHeadC(R, o, hd, kind) {
    const hx = hd[0], hy = hd[1], r = 5.4, hair = o.hair || 'short';
    // 頭の後ろ側(先に描く)
    if (hair === 'afro') R.circle([hx - 1.2, hy - 2.6], 7.8, 'h', 'h', 0);
    if (hair === 'long') R.capsule([hx - 2.6, hy - 3.5], [hx - 6.5, hy + 12], 4.4, 3.0, 'h', null, 0);
    if (hair === 'pony') {
      R.capsule([hx - 3.5, hy - 3.8], [hx - 10.5, hy + 1.2], 2.2, 1.5, 'h', null, 0);
      R.capsule([hx - 10.5, hy + 1.2], [hx - 12.5, hy + 8.5], 1.6, 0.8, 'h', null, 0);
    }
    if (hair === 'spiky') {
      R.capsule([hx - 3.5, hy - 4.5], [hx - 9, hy - 6.2], 1.9, 0.8, 'h', null, 0);
      R.capsule([hx - 1, hy - 5.2], [hx - 3.4, hy - 9.2], 1.7, 0.7, 'h', null, 0);
      R.capsule([hx + 1.6, hy - 5.2], [hx + 2.6, hy - 8.6], 1.5, 0.6, 'h', null, 0);
    }
    if (hair === 'bun' || hair === 'buns') {
      R.circle([hx - 2.2, hy - 6.4], 3.0, 'h', null, 0);
      if (hair === 'buns') R.circle([hx + 2.6, hy - 6.2], 2.6, 'h', null, 0);
    }
    const cap = { short: 2.9, spiky: 2.6, buzz: 3.7, bald: -9, long: 2.9, pony: 2.8, bun: 2.8, buns: 2.8, afro: 3.4 }[hair];
    R.shape(hx - r - 1, hy - r - 1, hx + r + 1, hy + r + 1, function (x, y) {
      const dx = x - hx, dy = y - hy;
      if (dx * dx + dy * dy > r * r) return null;
      if (dy < -cap || (hair === 'short' && dy < -2.0 && dx < 1.2)) return 'h';
      if (o.band && dy <= -1.1) return 'k';
      if (hair !== 'bald' && hair !== 'buzz' && dx < -2.8 && dy < 2.6) return 'h';
      if (hair === 'buzz' && dx < -3.6 && dy < 1.2) return 'h';
      if (o.beard && dy > 2.4 + Math.max(0, -dx - 2) * 0.4 && dx > -3.2) return 'h';     // あごひげ
      if (dx * LX + dy * LY > r * 0.62) return 'S';
      return 's';
    });
    if (hair === 'long' || hair === 'buns' || hair === 'bun') R.capsule([hx - 4.6, hy - 3], [hx - 3.4, hy + 3.4], 1.4, 1.2, 'h', null, 0);   // 横の髪
    if (o.band) {
      R.capsule([hx - 5, hy - 1.8], [hx - 11.5, hy + 1.6], 0.95, 0.7, 'k', null, 0);
      R.capsule([hx - 5, hy - 1.8], [hx - 10, hy - 1.2], 0.9, 0.6, 'k', null, 0);
    }
    if (hair === 'pony') R.circle([hx - 6.8, hy - 2.3], 1.2, 'k', null, 0);              // 髪留め
    R.circle([hx - 0.4, hy + 0.9], 1.3, 'S', null, 0);                                   // 耳
    if (o.glasses) {
      const gx = hx + 3.0, gy = hy + 0.5;
      R.shape(gx - 2.5, gy - 2.5, gx + 2.5, gy + 2.5, function (x, y) { const d = Math.hypot(x - gx, y - gy); return (d <= 2.2 && d >= 1.55) ? 'f' : null; });
    }
    R.circle([hx + 5.4, hy + 1.3], 1.0, 's', 'S', 0.3);                                  // 鼻
    drawFace(R, hx, hy, kind, true);
    if (o.lips) R.capsule([hx + 3.0, hy + 3.5], [hx + 4.6, hy + 3.4], 0.5, 0.5, 'K', null, 0);   // 口紅
    if (o.mark) R.circle([hx + 4.8, hy - 1.7], 0.6, 'n', null, 0);                         // 額の印
  }

  function paintCasual(p, pal, o) {
    o = o || {};
    const R = createRaster(pal);
    const hipF = add(p.hip, 1.8, 0), hipB = add(p.hip, -1.8, 0);
    const shF = p.shF || add(p.chest, 2.2, -3.4), shB = p.shB || add(p.chest, -2.2, -3.4);
    drawLegC(R, o, hipB, p.ankleB, p.bendB, true);
    drawLegC(R, o, hipF, p.ankleF, p.bendF, false);
    drawTorsoC(R, o, p.chest, p.hip, p.head);
    const d = p.d || {};
    drawArmC(R, o, shB, p.handB, p.armBendB, true, d.oB);
    drawHeadC(R, o, p.head, d.f);
    drawArmC(R, o, shF, p.handF, p.armBendF, false, d.oF);
    drawFx(R, p, d.fx);
    return R.toCanvas();
  }

  function paint(p, pal, style, opts) {
    if (style === 'casual') return paintCasual(p, pal, opts);
    if (style === 'shirt') return paintShirt(p, pal);
    const R = createRaster(pal);
    const hipF = add(p.hip, 1.8, 0), hipB = add(p.hip, -1.8, 0);
    const shF = p.shF || add(p.chest, 2.2, -3.4), shB = p.shB || add(p.chest, -2.2, -3.4);
    drawLeg(R, hipB, p.ankleB, p.bendB, true);
    drawLeg(R, hipF, p.ankleF, p.bendF, false);
    drawTorso(R, p.chest, p.hip, p.head);
    const d = p.d || {};
    drawArm(R, shB, p.handB, p.armBendB, true, d.oB);
    drawHead(R, p.head, d.f);
    drawArm(R, shF, p.handF, p.armBendF, false, d.oF);
    drawFx(R, p, d.fx);
    return R.toCanvas();
  }

  // ---- 打撃の軌跡・衝撃マークなど(輪郭線のあとに白で重ねる) ----
  function drawFx(R, p, fx) {
    if (!fx) return;
    R.late(function () {
      const W1 = 'w';
      const line = function (a, b, r0, r1) { R.capsule(a, b, r0, r1, W1, null, 0); };
      // 点 c から、角度 ang(ラジアン)の向きの反対へ流れる筋を複数本
      const streaks = function (c, dirx, diry, len, n, spread) {
        for (let i = 0; i < n; i++) {
          const o = (i - (n - 1) / 2) * spread;
          const sx = c[0] - dirx * 3 - diry * o, sy = c[1] - diry * 3 + dirx * o;
          const l = len * (1 - Math.abs(i - (n - 1) / 2) * 0.25);
          line([sx, sy], [sx - dirx * l, sy - diry * l], 0.55, 0.12);
        }
      };
      fx.forEach(function (name) {
        if (name === 'punch') streaks(p.handF, 1, 0, 11, 3, 2.6);
        else if (name === 'punchLow') streaks(p.handF, 1, 0.08, 11, 3, 2.6);
        else if (name === 'kick') {
          const dx = p.ankleF[0] - p.hip[0], dy = p.ankleF[1] - p.hip[1], l = Math.hypot(dx, dy) || 1;
          streaks(p.ankleF, dx / l, dy / l, 12, 3, 2.4);
        } else if (name === 'rise') {                     // 昇竜:上昇の筋(足元から)
          [-5, -1.5, 2.5, 6].forEach(function (ox, i) {
            const y0 = p.ankleF[1] + 4 + (i % 2) * 3;
            line([p.hip[0] + ox, y0], [p.hip[0] + ox, y0 + 11 - (i % 2) * 3], 0.5, 0.1);
          });
        } else if (name === 'crescent') {                 // サマーソルト:三日月の軌跡
          const c = [p.hip[0] + 7, p.hip[1] - 12];
          let prev = null;
          for (let i = 0; i <= 8; i++) {
            const a = -2.2 + i * 0.5;
            const pt = [c[0] + Math.cos(a) * 17, c[1] + Math.sin(a) * 17];
            if (prev) line(prev, pt, 0.2 + 0.65 * Math.sin(Math.PI * i / 8), 0.2 + 0.65 * Math.sin(Math.PI * (i + 1) / 8));
            prev = pt;
          }
        } else if (name === 'ki') {                       // 波動:手の先の気の光
          const c = [p.handF[0] + 5, p.handF[1]];
          R.circle(c, 3.2, W1, null, 0);
          R.circle(c, 1.7, 's', null, 0);
          for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3 + 0.3;
            line([c[0] + Math.cos(a) * 4.2, c[1] + Math.sin(a) * 4.2], [c[0] + Math.cos(a) * 7.5, c[1] + Math.sin(a) * 7.5], 0.5, 0.1);
          }
        } else if (name === 'caseHeld') {                 // 振りかぶったカバン(茶色・持ち手・留め金)
          const c = p.handF;
          R.shape(c[0] - 7, c[1] - 8, c[0] + 7, c[1] + 6, function (x, y) {
            const ax = Math.abs(x - c[0]), ay = y - c[1];
            if (ay >= -3.4 && ay <= 3.8 && ax <= 6.4) {          // 本体
              if (ax > 5.6 || ay < -2.8 || ay > 3.2) return 'o';
              return ay < -0.6 ? 'c' : 'C';
            }
            if (ay >= -6.6 && ay < -3.4 && ax >= 1.5 && ax <= 3.1) return (ax > 2.4 || ax < 2.0) ? 'o' : null;   // 持ち手
            if (ay >= -6.6 && ay < -5.8 && ax <= 3.1 && ax >= 1.5) return 'o';
            return null;
          });
          R.shape(c[0] - 1, c[1] - 0.6, c[0] + 1, c[1] + 1, function () { return 'w'; });                          // 留め金
        } else if (name === 'paperHeld') {                // 手にした書類の束
          const c = p.handF;
          [[0, 0], [1.5, -1.2], [3, -2.4]].forEach(function (o) {
            R.shape(c[0] + o[0] - 4, c[1] + o[1] - 5, c[0] + o[0] + 4, c[1] + o[1] + 5, function (x, y) {
              const ax = Math.abs(x - (c[0] + o[0])), ay = Math.abs(y - (c[1] + o[1]));
              if (ax > 3.4 || ay > 4.4) return null;
              return (ax > 2.8 || ay > 3.8) ? 'o' : 'w';
            });
          });
        } else if (name === 'papers') {                   // 撒き散らされる書類
          [[8, -9, 0.3], [14, 2, -0.4], [-2, -12, -0.2], [20, -6, 0.5], [4, 6, 0.1], [24, 4, -0.3]].forEach(function (o) {
            const cx = p.chest[0] + o[0], cy = p.chest[1] + o[1];
            R.shape(cx - 4, cy - 4, cx + 4, cy + 4, function (x, y) {
              const u = (x - cx) * Math.cos(o[2]) + (y - cy) * Math.sin(o[2]);
              const v = -(x - cx) * Math.sin(o[2]) + (y - cy) * Math.cos(o[2]);
              if (Math.abs(u) > 2.8 || Math.abs(v) > 3.4) return null;
              return (Math.abs(u) > 2.2 || Math.abs(v) > 2.8) ? 'o' : 'w';
            });
          });
        } else if (name === 'charge') {                   // ため:手元に集まる光の粒
          [[-5, -4], [3, -6], [-1, 4], [6, 2]].forEach(function (o) {
            R.circle([p.handF[0] + o[0], p.handF[1] + o[1]], 0.7, W1, null, 0);
          });
          R.circle(p.handF, 1.5, W1, null, 0);
        } else if (name === 'impact') {                   // 被弾:胸元の衝撃マーク
          const c = [p.chest[0] + 8, p.chest[1] - 1];
          for (let i = 0; i < 5; i++) {
            const a = -1.0 + i * 0.5;
            line([c[0] + Math.cos(a) * 2, c[1] + Math.sin(a) * 2], [c[0] + Math.cos(a) * 6.5, c[1] + Math.sin(a) * 6.5], 0.55, 0.1);
          }
        } else if (name === 'sweat') {                    // 汗のしずく
          const hx = p.head[0] - 5, hy = p.head[1] - 5;
          R.circle([hx, hy + 1], 0.9, W1, null, 0);
          R.circle([hx + 1.5, hy - 4], 0.6, W1, null, 0);
          line([hx + 0.2, hy - 0.6], [hx + 0.9, hy - 3], 0.3, 0.05);
        } else if (name === 'dust') {                     // ダウン:土ぼこり
          [[-10, 0, 2.2], [-4, -2, 1.7], [22, -1, 2.0], [28, 0, 1.4]].forEach(function (o) {
            R.circle([p.hip[0] + o[0], -2 + o[1]], o[2], W1, null, 0);
          });
        } else if (name === 'grab') {                     // 投げ:つかむ手の力線
          line([p.handF[0] + 3, p.handF[1] - 5], [p.handF[0] + 6, p.handF[1] - 8], 0.5, 0.1);
          line([p.handF[0] + 4, p.handF[1] + 5], [p.handF[0] + 7, p.handF[1] + 8], 0.5, 0.1);
        } else if (name === 'slamfx') {                   // 叩きつけ:地面の衝撃
          for (let i = 0; i < 4; i++) {
            const a = -2.9 + i * 0.6;
            line([p.handF[0] + 3 + Math.cos(a) * 3, -1 + Math.sin(a) * 2], [p.handF[0] + 3 + Math.cos(a) * 12, -1 + Math.sin(a) * 9], 0.7, 0.1);
          }
        }
      });
    });
  }

  // ポーズごとの描き分け:コマごとに { f: 表情, oF/oB: 手を開く, fx: 効果 }
  // 書かなかったコマは、普通の顔・握りこぶし・効果なし
  const DETAIL = {
    idle:        [{}, {}, {}, {}],
    standPunch:  [{ f: 'focus' }, { f: 'shout', fx: ['punch'] }, { f: 'focus' }],
    standKick:   [{ f: 'focus' }, { f: 'shout', fx: ['kick'] }, { f: 'focus' }],
    crouchPunch: [{ f: 'focus' }, { f: 'shout', fx: ['punchLow'] }, { f: 'focus' }],
    crouchKick:  [{ f: 'focus' }, { f: 'shout', fx: ['kick'] }, { f: 'focus' }],
    jumpPunch:   [{ f: 'focus' }, { f: 'shout', fx: ['punch'] }, { f: 'shout', fx: ['punch'] }],
    jumpKick:    [{ f: 'focus' }, { f: 'shout', fx: ['kick'] }, { f: 'shout', fx: ['kick'] }],
    paperToss:   [{ f: 'focus', fx: ['paperHeld'] }, { f: 'shout', oF: true, fx: ['punch'] }, { f: 'focus' }],
    briefcase:   [{ f: 'strain', fx: ['caseHeld'] }, { f: 'shout', oF: true, oB: true }, { f: 'focus' }],
    overtime:    [{ f: 'strain', fx: ['paperHeld'] }, { f: 'shout', oF: true, oB: true, fx: ['papers'] }, { f: 'shout', oF: true, oB: true, fx: ['papers'] }],
    fireball:    [{ f: 'focus', oF: true, oB: true, fx: ['charge'] }, { f: 'shout', oF: true, oB: true, fx: ['ki'] }, { f: 'shout', oF: true, oB: true, fx: ['ki'] }],
    uppercut:    [{ f: 'focus' }, { f: 'shout', fx: ['rise'] }, { f: 'strain', fx: ['rise'] }],
    uppercutLand:[{ f: 'strain' }],
    flashkick:   [{ f: 'focus' }, { f: 'shout', fx: ['crescent'] }, { f: 'strain' }],
    flyKick:     [{ f: 'focus' }, { f: 'shout', fx: ['kick'] }, { f: 'strain' }],
    tackle:      [{ f: 'strain' }, { f: 'shout', fx: ['dust'] }, { f: 'strain' }],
    spinKick:    [{ f: 'focus' }, { f: 'shout', fx: ['crescent', 'kick'] }, { f: 'focus' }],
    straight:    [{ f: 'focus' }, { f: 'shout', fx: ['punch'] }, { f: 'focus' }],
    palmStrike:  [{ f: 'focus', oF: true, oB: true }, { f: 'shout', oF: true, oB: true, fx: ['ki'] }, { f: 'focus', oF: true, oB: true }],
    throw:       [{ f: 'strain', oF: true, oB: true, fx: ['grab'] }, { f: 'shout', oF: true, oB: true }, { f: 'focus' }],
    slam:        [{ f: 'strain', oF: true, oB: true, fx: ['grab'] }, { f: 'shout', oF: true, oB: true }, { f: 'shout', oF: true, oB: true, fx: ['slamfx'] }, { f: 'focus' }],
    guard:       [{ f: 'guard' }],
    crouchGuard: [{ f: 'guard' }],
    dizzy:       [{ f: 'dizzy', oF: true, oB: true }, { f: 'dizzy', oF: true, oB: true }, { f: 'dizzy', oF: true, oB: true }, { f: 'dizzy', oF: true, oB: true }],
    hit:         [{ f: 'pain', oF: true, oB: true, fx: ['impact', 'sweat'] }],
    down:        [{ f: 'down', oF: true, oB: true, fx: ['dust'] }]
  };

  // ---- ポーズ(関節の位置) ----
  const STAND = {
    head: [3, -43], chest: [1, -33], hip: [-1, -22],
    handF: [12.5, -35.5], handB: [8.5, -33],
    ankleF: [9, GY], ankleB: [-9, GY],
    bendF: 1, bendB: 1, armBendF: -1, armBendB: -1
  };
  const mk = function (o) { return Object.assign({}, STAND, o); };

  const JUMP = {
    hip: [0, -25], chest: [2, -36], head: [4, -46],
    handF: [13, -38.5], handB: [9, -36], ankleF: [8, -13], ankleB: [-5, -10]
  };
  const CROUCH = {
    hip: [-3, -11], chest: [0, -20], head: [3, -26.8],
    handF: [11, -24], handB: [7, -21], ankleF: [10, GY], ankleB: [-10, GY]
  };

  const poses = {
    // 待機:胸と頭が小さく上下する
    idle: [0, 0.5, 1, 0.5].map(function (dy) {
      return mk({
        head: [3, -43 + dy], chest: [1, -33 + dy], hip: [-1, -22 + dy * 0.3],
        handF: [12.5, -35.5 + dy], handB: [8.5, -33 + dy]
      });
    }),

    // 歩き:6コマの周期
    walk: [0, 1, 2, 3, 4, 5].map(function (i) {
      const ph = Math.PI * 2 * i / 6;
      const bobY = 0.9 * Math.abs(Math.sin(ph));
      return mk({
        hip: [-1, -22 + bobY], chest: [2, -33 + bobY], head: [4, -43 + bobY],
        handF: [12.5 + 0.6 * Math.sin(2 * ph), -35.5 + bobY], handB: [8.5, -33 + bobY],
        ankleF: [4 + 8 * Math.sin(ph), GY - 4 * Math.max(0, Math.cos(ph))],
        ankleB: [-4 - 8 * Math.sin(ph), GY - 4 * Math.max(0, -Math.cos(ph))]
      });
    }),

    jump: [mk(JUMP)],
    crouch: [mk(CROUCH)],

    // 立ちパンチ:構え → 突き出す → 引く
    standPunch: [
      mk({ hip: [-1, -22], chest: [2, -33], head: [4, -43], handF: [10, -35], handB: [8, -34], ankleF: [10, GY], ankleB: [-10, GY] }),
      mk({ hip: [0, -22], chest: [5, -33.5], head: [7, -43.5], handF: [23.5, -36.5], handB: [9, -33], ankleF: [10, GY], ankleB: [-10, GY] }),
      mk({ hip: [-1, -22], chest: [3, -33], head: [5, -43], handF: [14, -35.5], handB: [8, -34], ankleF: [10, GY], ankleB: [-10, GY] })
    ],

    // 立ちキック:膝を上げる → 蹴り出す → 戻す
    standKick: (function () {
      const base = { hip: [-1, -23.5], handF: [9, -37], handB: [5, -34], ankleB: [-7, GY] };
      const pull = mk(Object.assign({}, base, { chest: [-1, -34], head: [1, -44], ankleF: [9, -14] }));
      const kick = mk(Object.assign({}, base, { hip: [-2, -23.5], chest: [-4, -34], head: [-3, -44], ankleF: [20.5, -28.5] }));
      return [pull, kick, pull];
    })(),

    // しゃがみパンチ
    crouchPunch: [
      mk(Object.assign({}, CROUCH, { chest: [1, -19.5], head: [4, -26.8], handF: [10, -22], handB: [6, -21] })),
      mk(Object.assign({}, CROUCH, { chest: [3, -19.5], head: [6, -26.8], handF: [24, -21.5], handB: [7, -21] })),
      mk(Object.assign({}, CROUCH, { chest: [2, -19.5], head: [5, -26.8], handF: [15, -21.5], handB: [6, -21] }))
    ],

    // しゃがみキック(足払い)
    crouchKick: (function () {
      const base = { hip: [-4, -9], chest: [-1, -18], head: [2, -25], handF: [8, -22], handB: [4, -20], ankleB: [-10, GY] };
      const pull = mk(Object.assign({}, base, { ankleF: [8, -6] }));
      const sweep = mk(Object.assign({}, base, { chest: [-3, -18], head: [0, -25], ankleF: [22, -4] }));
      return [pull, sweep, pull];
    })(),

    // ジャンプパンチ
    jumpPunch: (function () {
      const ready = mk(Object.assign({}, JUMP, { handF: [10, -38] }));
      const out = mk(Object.assign({}, JUMP, { chest: [3, -36], head: [5, -46], handF: [21, -37] }));
      return [ready, out, out];
    })(),

    // ジャンプキック
    jumpKick: (function () {
      const tuck = mk(JUMP);
      const out = mk(Object.assign({}, JUMP, { chest: [0, -36], head: [2, -46], ankleF: [18, -26] }));
      return [tuck, out, out];
    })(),

    // 波動拳風:腰の横で気をためる → 両手を前に突き出す(frame 2 が撃ったあとの姿勢)
    fireball: (function () {
      const base = { hip: [-1, -22], ankleF: [10, GY], ankleB: [-10, GY] };
      const charge = mk(Object.assign({}, base, { chest: [-1, -33], head: [1, -43], handF: [4, -27], handB: [1, -28] }));
      const shoot = mk(Object.assign({}, base, { chest: [4, -32], head: [6, -42], handF: [21, -33], handB: [18, -32] }));
      return [charge, shoot, shoot];
    })(),


    // MEI 飛燕脚:構えて沈む → 後ろへ反って前へ水平に蹴り出す → 戻す
    flyKick: (function () {
      const wind = mk({ hip: [-3, -21], chest: [-5, -32], head: [-4, -42], handF: [4, -36], handB: [0, -34], ankleF: [6, -16], ankleB: [-9, GY] });
      const kick = mk({ hip: [-2, -25], chest: [-8, -33], head: [-9, -43], handF: [0, -41], handB: [-5, -37], ankleF: [27, -33], ankleB: [-11, -7] });
      return [wind, kick, wind];
    })(),
    // BORIS タックル:腰を落として溜める → 肩を前に低く突っ込む → 起き上がる
    tackle: (function () {
      const wind = mk({ hip: [-4, -19], chest: [-5, -29], head: [-3, -39], handF: [3, -30], handB: [0, -28], ankleF: [8, GY], ankleB: [-13, GY] });
      const ram = mk({ hip: [3, -20], chest: [13, -27], head: [18, -34], handF: [24, -29], handB: [18, -25], ankleF: [17, GY], ankleB: [-9, -3] });
      const rec = mk({ hip: [1, -21], chest: [6, -30], head: [9, -39], handF: [16, -31], handB: [10, -29], ankleF: [12, GY], ankleB: [-8, GY] });
      return [wind, ram, rec];
    })(),
    // ISA 回転蹴り:後ろへ反って構える → 体をそらして高く蹴り上げる → 戻す
    spinKick: (function () {
      const wind = mk({ hip: [-3, -20], chest: [-8, -29], head: [-11, -38], handF: [-4, -24], handB: [-10, -27], ankleF: [8, -8], ankleB: [-9, GY] });
      const kick = mk({ hip: [-2, -23], chest: [-9, -31], head: [-13, -39], handF: [-10, -25], handB: [-15, -30], ankleF: [25, -41], ankleB: [-8, GY] });
      const rec = mk({ hip: [-2, -22], chest: [-5, -32], head: [-5, -42], handF: [4, -34], handB: [0, -31], ankleF: [8, -12], ankleB: [-9, GY] });
      return [wind, kick, rec];
    })(),
    // JAX ストレート:体を沈めて引く → 大きく踏み込んで打ち抜く → 戻す
    straight: (function () {
      const wind = mk({ hip: [-3, -21], chest: [-4, -31], head: [-2, -41], handF: [-4, -33], handB: [9, -37], ankleF: [8, GY], ankleB: [-12, GY] });
      const hit = mk({ hip: [3, -21], chest: [11, -31], head: [15, -40], handF: [31, -37], handB: [9, -35], ankleF: [21, GY], ankleB: [-7, GY] });
      const rec = mk({ hip: [1, -22], chest: [6, -32], head: [8, -42], handF: [19, -36], handB: [8, -35], ankleF: [15, GY], ankleB: [-8, GY] });
      return [wind, hit, rec];
    })(),
    // PRIYA 掌底:両手を腰へ引く → 両手の手のひらを前へ突き出す → 戻す
    palmStrike: (function () {
      const base = { hip: [-1, -22], ankleF: [11, GY], ankleB: [-10, GY] };
      const wind = mk(Object.assign({}, base, { chest: [-2, -33], head: [0, -43], handF: [0, -28], handB: [-3, -30] }));
      const push = mk(Object.assign({}, base, { chest: [4, -33], head: [6, -43], handF: [22, -36], handB: [19, -33] }));
      const rec = mk(Object.assign({}, base, { chest: [2, -33], head: [4, -43], handF: [15, -34], handB: [11, -32] }));
      return [wind, push, rec];
    })(),

    // 書類ばらまき:書類を持った腕を体の前へ引く → 横に振り抜く → 戻す
    paperToss: (function () {
      const base = { hip: [-1, -22], ankleF: [10, GY], ankleB: [-10, GY] };
      return [
        mk(Object.assign({}, base, { chest: [-2, -33], head: [0, -43], handF: [-3, -35], handB: [5, -31] })),
        mk(Object.assign({}, base, { chest: [4, -33], head: [6, -43], handF: [24, -39], handB: [-2, -30], ankleF: [11, GY] })),
        mk(Object.assign({}, base, { chest: [3, -33], head: [5, -43], handF: [17, -36], handB: [3, -31] }))
      ];
    })(),

    // カバン投げ:カバンを頭の後ろへ振りかぶる → 体ごと前へ投げ出す → 前かがみで残心
    briefcase: (function () {
      const base = { hip: [-1, -22], ankleB: [-10, GY] };
      return [
        mk(Object.assign({}, base, { chest: [-4, -33], head: [-3, -43], handF: [-10, -52], handB: [-3, -48], ankleF: [8, GY] })),
        mk(Object.assign({}, base, { hip: [0, -22], chest: [6, -31], head: [9, -40], handF: [23, -29], handB: [18, -33], ankleF: [13, GY] })),
        mk(Object.assign({}, base, { hip: [0, -21], chest: [7, -29], head: [10, -38], handF: [19, -24], handB: [13, -27], ankleF: [13, GY] }))
      ];
    })(),

    // 残業突入(超必殺技):書類を腰の後ろへ溜める → 両腕を大きく広げて撒き散らす → 前へ突き出す
    overtime: (function () {
      const base = { hip: [-1, -22], ankleF: [10, GY], ankleB: [-10, GY] };
      return [
        mk(Object.assign({}, base, { hip: [-2, -20], chest: [-3, -31], head: [-1, -41], handF: [-8, -22], handB: [-10, -24] })),
        mk(Object.assign({}, base, { chest: [2, -35], head: [4, -45], handF: [16, -54], handB: [-4, -53] })),
        mk(Object.assign({}, base, { chest: [5, -32], head: [7, -42], handF: [23, -38], handB: [19, -36] }))
      ];
    })(),

    // 昇竜拳風:身をかがめる → 拳を突き上げて上昇 → 落ちてくる
    uppercut: [
      mk({ hip: [-2, -16], chest: [0, -26], head: [3, -35], handF: [6, -26], handB: [3, -24], ankleF: [9, GY], ankleB: [-10, GY] }),
      mk({ hip: [0, -24], chest: [1, -35], head: [3, -45], handF: [8, -53], handB: [3, -34], ankleF: [8, -12], ankleB: [-2, -8] }),
      mk({ hip: [0, -24], chest: [1, -35], head: [3, -45], handF: [8, -48], handB: [4, -34], ankleF: [6, -8], ankleB: [-4, -6] })
    ],
    // 昇竜拳風のあとの着地硬直:低い姿勢で拳を上げたまま
    uppercutLand: [
      mk(Object.assign({}, CROUCH, { handF: [8, -34], handB: [5, -24] }))
    ],

    // サマーソルト風:しゃがんで構える → のけぞって後ろへ跳びながら蹴り上げる → 脚をたたんで落ちる
    flashkick: [
      mk(Object.assign({}, CROUCH, { handF: [9, -23], handB: [5, -21] })),
      mk({ hip: [-3, -27], chest: [-7, -36], head: [-10, -44.5], handF: [-4, -30], handB: [-9, -33],
           ankleF: [9, -46], ankleB: [-7, -14] }),
      mk({ hip: [-2, -25], chest: [-4, -35], head: [-6, -45], handF: [3, -29], handB: [-3, -30],
           ankleF: [7, -12], ankleB: [-6, -9] })
    ],

    // 投げ:前かがみで相手をつかむ → 両腕を振り上げて投げ飛ばす → 戻る
    throw: [
      mk({ hip: [-1, -22], chest: [4, -32], head: [8, -41], handF: [17, -34], handB: [15, -31], ankleF: [10, GY], ankleB: [-10, GY] }),
      mk({ hip: [-1, -22], chest: [1, -34], head: [3, -44], handF: [14, -53], handB: [10, -51], ankleF: [9, GY], ankleB: [-10, GY] }),
      mk({ hip: [-1, -22], chest: [2, -33], head: [4, -43], handF: [11, -36], handB: [8, -34], ankleF: [10, GY], ankleB: [-10, GY] })
    ],

    // 叩きつけ:腕を伸ばしてつかむ → 頭上に持ち上げる → 前かがみで地面へ叩きつける → 起き上がる
    slam: [
      mk({ hip: [-1, -22], chest: [5, -32], head: [9, -41], handF: [21, -33], handB: [18, -30], ankleF: [11, GY], ankleB: [-10, GY] }),
      mk({ hip: [-1, -22], chest: [1, -34], head: [3, -44], handF: [9, -57], handB: [6, -55], ankleF: [9, GY], ankleB: [-10, GY] }),
      mk({ hip: [-2, -21], chest: [7, -27], head: [11, -36], handF: [23, -21], handB: [20, -19], ankleF: [11, GY], ankleB: [-11, GY] }),
      mk({ hip: [-1, -22], chest: [3, -31], head: [6, -41], handF: [14, -30], handB: [11, -28], ankleF: [10, GY], ankleB: [-10, GY] })
    ],

    // ガード:両腕を顔の前に上げる(立ち・しゃがみ)
    guard: [
      mk({
        hip: [-1, -22], chest: [0, -33], head: [2, -43],
        handF: [10.5, -44.5], handB: [8, -40.5], ankleF: [8, GY], ankleB: [-10, GY]
      })
    ],
    crouchGuard: [
      mk(Object.assign({}, CROUCH, { handF: [10, -28.5], handB: [7, -25.5] }))
    ],

    // 気絶:ふらふら揺れる
    dizzy: [-4, -1, 2, -1].map(function (sx) {
      return mk({
        head: [3 + sx, -40], chest: [1 + sx * 0.7, -31], hip: [-1, -22],
        handF: [8, -22], handB: [4, -23], ankleF: [8, GY], ankleB: [-8, GY]
      });
    }),

    // やられ:のけぞる
    hit: [
      mk({
        hip: [-1, -22], chest: [-3, -33], head: [-5, -42],
        handF: [5, -26], handB: [-2, -26], ankleF: [7, GY], ankleB: [-9, GY]
      })
    ],

    // ダウン・KO:仰向けに倒れる(頭が左)
    down: [
      mk({
        hip: [4, -6], chest: [-8, -6.5], head: [-19, -6],
        shF: [-6, -6], shB: [-8, -6],
        handF: [2, -3.5], handB: [-3, -3], ankleF: [19, -3.5], ankleB: [23, GY]
      })
    ]
  };

  // ---- ポーズの補間(中間コマ)----
  const KEYS = ['head', 'chest', 'hip', 'handF', 'handB', 'ankleF', 'ankleB', 'shF', 'shB'];
  const LOOPING = ['idle', 'walk', 'dizzy'];

  function blendPose(A, B, t) {
    const o = Object.assign({}, t < 0.5 ? A : B);          // 曲がる向きなどは近いほうに合わせる
    KEYS.forEach(function (k) {
      if (A[k] && B[k]) o[k] = [A[k][0] + (B[k][0] - A[k][0]) * t, A[k][1] + (B[k][1] - A[k][1]) * t];
    });
    return o;
  }

  // frame は小数でもよい(2.4 = 2コマ目と3コマ目の間)。中間は tweenSteps 段階に丸める。
  // 戻り値 { a: コマ番号, step: 中間の段階(0〜), t: 0〜1, blend: 補間したポーズ または 元のポーズ }
  function resolvePose(name, frame) {
    const list = poses[name];
    const n = list.length;
    const Q = Math.max(1, (Game.Config.display.anim && Game.Config.display.anim.tweenSteps) || 1);
    const loop = LOOPING.indexOf(name) >= 0;
    let fi = Math.floor(frame), step = Math.round((frame - fi) * Q);
    if (step >= Q) { fi += 1; step = 0; }
    let a, b;
    if (loop) { a = ((fi % n) + n) % n; b = (a + 1) % n; }
    else { a = Math.max(0, Math.min(fi, n - 1)); b = Math.min(a + 1, n - 1); if (a === n - 1) step = 0; }
    const t = step / Q;
    return { a: a, step: step, t: t, pose: t > 0 && a !== b ? blendPose(list[a], list[b], t) : list[a] };
  }

  // ---- 画像(スプライトシート)----
  // Game.Data.Sheets[name] = { image: 'パス' または ['1P用', '2P用'], artScale: 絵の1ドットが何分の1単位か(2なら絵のドット2個で1単位),
  //   loop: ['idle', 'walk', ...](繰り返すポーズ。ほかは最後のコマで止まる),
  //   frames: { ポーズ名: [ { x, y, w, h, ox, oy, hurt? }, ... ] } }
  //   x,y,w,h = 画像内の切り出し範囲 / ox,oy = その範囲の中での足元の位置(絵のドット単位)
  //   hurt = 喰らい判定の箱 [[x0,y0,x1,y1], ...](ゲーム内の単位。足元が原点、右向き。省略するとポーズの関節から自動で作る)
  const sheetImgs = {};                 // look名 → [Image or null, ...]
  const SHEET_LOOP = ['idle', 'walk', 'dizzy'];

  function sheetFrame(lk, name, frame) {
    const L = Game.Data.Looks[lk];
    const def = Game.Data.Sheets[L.sheet];
    const list = def && def.frames && def.frames[name];
    if (!list || !list.length) return null;
    const loop = (def.loop || SHEET_LOOP).indexOf(name) >= 0;
    frame = Math.floor(frame);                           // 中間コマ(小数)は持たないので、整数のコマに丸める
    const f = loop ? ((frame % list.length) + list.length) % list.length : Math.max(0, Math.min(frame, list.length - 1));
    return { def: def, fr: list[f], index: f };
  }

  // 切り出した絵を、ゲームの細かさ(pixelScale)に合わせて拡大した画像にする(ドットはぼかさない)
  function paintSheet(lk, name, frame, palette) {
    const imgs = sheetImgs[lk];
    const img = imgs && (imgs[palette] || imgs[0]);
    const sf = sheetFrame(lk, name, frame);
    if (!img || !sf) return null;
    const k = RES / (sf.def.artScale || 1);
    const fr = sf.fr;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(fr.w * k)); cv.height = Math.max(1, Math.round(fr.h * k));
    const cx = cv.getContext('2d');
    cx.imageSmoothingEnabled = false;
    cx.drawImage(img, fr.x, fr.y, fr.w, fr.h, 0, 0, cv.width, cv.height);
    cv.originX = Math.round(fr.ox * k);
    cv.originY = Math.round(fr.oy * k);
    return cv;
  }

  function loadSheets() {
    const jobs = [];
    Object.keys(Game.Data.Looks).forEach(function (lk) {
      const L = Game.Data.Looks[lk];
      if (L.style !== 'sheet') return;
      const def = Game.Data.Sheets[L.sheet];
      if (!def) { console.warn('スプライトシートの定義がありません: ' + L.sheet); sheetImgs[lk] = []; return; }
      const srcs = Array.isArray(def.image) ? def.image : [def.image];
      sheetImgs[lk] = [];
      srcs.forEach(function (src, i) {
        jobs.push(new Promise(function (resolve) {
          const im = new Image();
          im.onload = function () { sheetImgs[lk][i] = im; resolve(); };
          im.onerror = function () { console.warn('スプライトシートの画像を読み込めません: ' + src); resolve(); };
          im.src = src;
        }));
      });
    });
    return Promise.all(jobs);
  }

  // ---- 取り出し口 ----
  const cache = {};
  Game.Data.Sprites = {
    originX: OX,       // 画像内での足元の位置(細かい単位)
    originY: OY,
    scale: RES,        // ゲーム内の1単位が画像の何マスか
    // name: ポーズ名, frame: 連番, palette: 0(1P) / 1(2P)
    get: function (name, frame, palette, look) {
      let lk = look || 'hero';
      let L = Game.Data.Looks[lk] || Game.Data.Looks.hero;
      if (L.style === 'sheet') {
        const fl = Math.floor(frame);                // 画像の見た目は中間コマを持たない
        const key0 = lk + ':' + name + ':' + fl + ':' + palette;
        if (cache[key0] === undefined) cache[key0] = paintSheet(lk, name, fl, palette) || null;
        if (cache[key0]) return cache[key0];
        lk = L.fallback || 'hero';                 // 画像がない・そのポーズが定義されていないときは自動生成の絵
        L = Game.Data.Looks[lk];
      }
      const rp = resolvePose(name, frame);
      const key = lk + ':' + name + ':' + rp.a + '.' + rp.step + ':' + palette;
      if (!cache[key]) {
        const dl = DETAIL[name];
        const di = rp.t < 0.5 ? rp.a : Math.min(rp.a + 1, poses[name].length - 1);   // 中間コマは近いほうの描き分けを使う
        const pose = dl ? Object.assign({}, rp.pose, { d: dl[di] || dl[rp.a] || {} }) : rp.pose;
        cache[key] = paint(pose, L.palettes[palette], L.style, L.opts);
      }
      return cache[key];
    },
    // 全コマを先に描き起こしておく(初めて技を出した瞬間のカクつきを防ぐ)
    // 戻り値:画像の読み込みが終わると解決する Promise(画像のない見た目だけなら、すぐ解決)
    preload: function () {
      const self = this;
      const L = self.list();
      Object.keys(L).forEach(function (name) {
        for (let f = 0; f < L[name]; f++) {
          Object.keys(Game.Data.Looks).forEach(function (lk) {
            if (Game.Data.Looks[lk].style === 'sheet') return;
            for (let p = 0; p < Game.Data.Looks[lk].palettes.length; p++) self.get(name, f, p, lk);
          });
        }
      });
      return loadSheets().then(function () {
        Object.keys(Game.Data.Looks).forEach(function (lk) {
          if (Game.Data.Looks[lk].style !== 'sheet') return;
          Object.keys(L).forEach(function (name) {
            for (let f = 0; f < L[name]; f++) {
              for (let p = 0; p < Game.Data.Looks[lk].palettes.length; p++) self.get(name, f, p, lk);
            }
          });
        });
      });
    },
    // 中間コマを、画面を止めないよう少しずつ先に作っておく(ゲーム開始後に呼ぶ。間に合わないコマは使うときに作られる)
    warm: function () {
      const self = this;
      const L = self.list();
      const Q = Math.max(1, (Game.Config.display.anim && Game.Config.display.anim.tweenSteps) || 1);
      const jobs = [];
      Object.keys(L).forEach(function (name) {
        for (let f = 0; f < L[name]; f++) {
          for (let s = 1; s < Q; s++) {
            if (L[name] === 1) break;
            Object.keys(Game.Data.Looks).forEach(function (lk) {
              if (Game.Data.Looks[lk].style === 'sheet') return;
              for (let p = 0; p < Game.Data.Looks[lk].palettes.length; p++) jobs.push([name, f + s / Q, p, lk]);
            });
          }
        }
      });
      let i = 0;
      (function tick() {
        const end = performance.now() + 6;                  // 1回に使う時間は約6ms(1フレームを邪魔しない)
        while (i < jobs.length && performance.now() < end) { self.get.apply(self, jobs[i++]); }
        if (i < jobs.length) setTimeout(tick, 0);
      })();
    },
    // 画像の見た目で、そのコマに喰らい判定が定義されていればその箱 [[x0,y0,x1,y1],...]、なければ null
    hurtBoxes: function (look, name, frame) {
      const L = Game.Data.Looks[look];
      if (!L || L.style !== 'sheet') return null;
      const sf = sheetFrame(look, name, frame);
      return sf && sf.fr.hurt ? sf.fr.hurt : null;
    },
    // 判定用:ポーズの関節位置(原点は足元、右向き)。なければ null
    joints: function (name, frame) {
      if (!poses[name]) return null;
      return resolvePose(name, frame).pose;
    },
    // 確認用:{ポーズ名: コマ数}
    list: function () {
      const o = {};
      Object.keys(poses).forEach(function (k) { o[k] = poses[k].length; });
      return o;
    }
  };
})();
