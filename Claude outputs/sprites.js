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
  const DARK = { g: 'G', G: 'G', s: 'S', S: 'S', w: 'w' };   // 奥側の手足は暗い色にして奥行きを出す

  function createRaster(pal) {
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

    // 輪郭線を付けて画像にする
    function toCanvas() {
      const src = new Uint8ClampedArray(data);
      const o = rgb.o;
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
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      cv.getContext('2d').putImageData(new ImageData(data, W, H), 0, 0);
      return cv;
    }

    return { capsule: capsule, circle: circle, shape: shape, triangle: triangle, toCanvas: toCanvas };
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

  function drawArm(R, sh, target, bend, back) {
    const r = ik(sh, target, ARM1, ARM2, bend);
    const e = r.joint, h = r.end;
    R.capsule(sh, e, 3.1, 2.8, 'g', 'G', 0.35, back);                      // 上腕(道着の袖)
    R.capsule(e, h, 2.4, 2.1, 's', 'S', 0.3, back);                        // 前腕(素肌)
    R.capsule(e, mid(e, h, 0.3), 3.0, 2.8, 'g', 'G', 0.35, back);          // 袖口
    R.capsule(mid(e, h, 0.68), mid(e, h, 0.92), 2.5, 2.5, 'w', null, 0, back);   // 手の巻き布
    R.circle(h, 2.9, 's', 'S', 0.3, back);                                 // こぶし
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

  function drawHead(R, hd) {
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
    R.capsule([hx + 2.2, hy - 0.7], [hx + 4.2, hy - 0.4], 0.3, 0.3, 'e', null, 0);        // 眉(細く)
    R.shape(hx + 2.6, hy + 0.6, hx + 3.8, hy + 1.8, function () { return 'e'; });         // 目(小さく)
    R.circle([hx + 5.4, hy + 1.2], 1.0, 's', 'S', 0.3);                                   // 鼻
    R.capsule([hx + 3, hy + 3.3], [hx + 4.6, hy + 3.2], 0.35, 0.35, 'S', null, 0);        // 口
  }

  function paint(p, pal) {
    const R = createRaster(pal);
    const hipF = add(p.hip, 1.8, 0), hipB = add(p.hip, -1.8, 0);
    const shF = p.shF || add(p.chest, 2.2, -3.4), shB = p.shB || add(p.chest, -2.2, -3.4);
    drawLeg(R, hipB, p.ankleB, p.bendB, true);
    drawLeg(R, hipF, p.ankleF, p.bendF, false);
    drawTorso(R, p.chest, p.hip, p.head);
    drawArm(R, shB, p.handB, p.armBendB, true);
    drawHead(R, p.head);
    drawArm(R, shF, p.handF, p.armBendF, false);
    return R.toCanvas();
  }

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

  // ---- 取り出し口 ----
  const cache = {};
  Game.Data.Sprites = {
    originX: OX,       // 画像内での足元の位置(細かい単位)
    originY: OY,
    scale: RES,        // ゲーム内の1単位が画像の何マスか
    // name: ポーズ名, frame: 連番, palette: 0(1P) / 1(2P)
    get: function (name, frame, palette) {
      const list = poses[name];
      const f = ((frame % list.length) + list.length) % list.length;
      const key = name + ':' + f + ':' + palette;
      if (!cache[key]) cache[key] = paint(list[f], Game.Data.Palettes[palette]);
      return cache[key];
    },
    // 確認用:{ポーズ名: コマ数}
    list: function () {
      const o = {};
      Object.keys(poses).forEach(function (k) { o[k] = poses[k].length; });
      return o;
    }
  };
})();
