// 「ベクター描き → ドット絵」の描画(style: 'vec')。
// 関節の位置(sprites.js のポーズ)から、曲線で体・服・髪・顔を描き、ゲームの細かさ(pixelScale)のドットに落とす。
//   ・図形は3段階で塗る(ふつう / 影 / ハイライト)。光は右上から。
//   ・奥側の手足は暗くして奥行きを出す。
//   ・最後に sprites.js の輪郭線の処理を通すので、他の見た目と同じ輪郭線になる。
// 見た目の違いは opts(髪型・メガネ・服・小物)と palettes(色)で決まる。色のキーは palettes.js の vec の見本を参照。
(function () {
  'use strict';

  const I = Game.Data.SpriteInternals;
  const RES = I.RES, SS = 3;                                  // SS: 1ドットを何分割して描くか(縁をなめらかに取るため)
  const LIGHT = [0.5, -0.87];                                 // 光の来る向き(右上)
  let cv = null, cx = null;
  let SOFT = 0;                                               // 影・ハイライトの帯を細く、色の差を小さくする度合い(0〜1)

  // ---- 色の道具 ----
  function rgb(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  function hex(c) { return '#' + c.map(function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); }).join(''); }
  function mix(a, b, t) { const x = rgb(a), y = rgb(b); return hex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]); }

  // ---- 形(Path2D)----
  function capPath(a, b, ra, rb) {
    const p = new Path2D();
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
    if (d < 0.001 || d <= Math.abs(ra - rb)) { const r = Math.max(ra, rb), c = ra >= rb ? a : b; p.arc(c[0], c[1], r, 0, Math.PI * 2); return p; }
    const ang = Math.atan2(dy, dx), phi = Math.acos((ra - rb) / d);
    p.arc(a[0], a[1], ra, ang + phi, ang - phi + Math.PI * 2, false);
    p.arc(b[0], b[1], rb, ang - phi, ang + phi, false);
    p.closePath();
    return p;
  }
  function polyPath(pts) {
    const p = new Path2D();
    pts.forEach(function (q, i) { if (i) p.lineTo(q[0], q[1]); else p.moveTo(q[0], q[1]); });
    p.closePath();
    return p;
  }
  // n=2 で楕円、大きいほど四角に近い(角ばった輪郭のとき)
  function superPath(rx, ry, n, ryLow) {                                           // ryLow:下半分(あご側)だけ縦の半径を変える(面長・丸顔)
    const p = new Path2D();
    for (let i = 0; i <= 72; i++) {
      const t = i / 72 * Math.PI * 2, c = Math.cos(t), sn = Math.sin(t);
      const x = rx * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), y = (sn > 0 && ryLow ? ryLow : ry) * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
      if (i) p.lineTo(x, y); else p.moveTo(x, y);
    }
    p.closePath();
    return p;
  }
  // 関節でつなぎ目のない、ひとつながりの手足の形。P=関節の位置の列、R=各関節の半径、soft=外側の丸みを減らす割合(0〜1)
  function limbPath(P, R, soft, flatEnd) {
    const n = P.length, seg = [];
    for (let i = 0; i < n - 1; i++) seg.push(Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]));
    const at = function (i, a, r) { return [P[i][0] + Math.cos(a) * r, P[i][1] + Math.sin(a) * r]; };
    const side = function (sgn) {
      const pts = [at(0, seg[0] + sgn * Math.PI / 2, R[0])];
      for (let i = 1; i < n - 1; i++) {
        const a0 = seg[i - 1] + sgn * Math.PI / 2;
        let dl = seg[i] - seg[i - 1]; while (dl > Math.PI) dl -= 2 * Math.PI; while (dl < -Math.PI) dl += 2 * Math.PI;
        if (sgn * dl < 0) {                                                       // 曲がりの外側:丸みでつなぐ(soft で少しへこませる)
          const steps = Math.max(2, Math.ceil(Math.abs(dl) / 0.3));
          for (let q = 0; q <= steps; q++) { const t = q / steps; pts.push(at(i, a0 + dl * t, R[i] * (1 - (soft || 0) * 0.22 * Math.sin(Math.PI * t)))); }
        } else {                                                                  // 曲がりの内側:2本の縁の交点
          const a1 = seg[i] + sgn * Math.PI / 2;
          const p0 = at(i - 1, a0, R[i - 1]), p1 = at(i, a0, R[i]), q0 = at(i, a1, R[i]), q1 = at(i + 1, a1, R[i + 1]);
          const d1x = p1[0] - p0[0], d1y = p1[1] - p0[1], d2x = q1[0] - q0[0], d2y = q1[1] - q0[1], det = d1x * d2y - d1y * d2x;
          let hit = null;
          if (Math.abs(det) > 1e-6) {
            const t = ((q0[0] - p0[0]) * d2y - (q0[1] - p0[1]) * d2x) / det;
            const c = [p0[0] + d1x * t, p0[1] + d1y * t];
            if (t > 0 && Math.hypot(c[0] - P[i][0], c[1] - P[i][1]) < R[i] * 2.2) hit = c;
          }
          pts.push(hit || at(i, (a0 + a0 + dl) / 2, R[i] * 0.8));
        }
      }
      pts.push(at(n - 1, seg[n - 2] + sgn * Math.PI / 2, R[n - 1]));
      return pts;
    };
    const A = side(1), B = side(-1), poly = A.slice(), ae = seg[n - 2], as = seg[0];
    if (!flatEnd) for (let q = 1; q < 12; q++) poly.push(at(n - 1, ae + Math.PI / 2 - Math.PI * q / 12, R[n - 1]));   // 先の丸み(flatEnd のときは平らに切る)
    for (let q = B.length - 1; q >= 0; q--) poly.push(B[q]);
    for (let q = 1; q < 12; q++) poly.push(at(0, as - Math.PI / 2 - Math.PI * q / 12, R[0]));                // 付け根の丸み
    return polyPath(poly);
  }
  function ellPath(c, rx, ry, rot) {
    const p = new Path2D();
    p.ellipse(c[0], c[1], rx, ry, rot || 0, 0, Math.PI * 2);
    return p;
  }

  // 3段階で塗る:base → 影(光と反対側のふち) → ハイライト(光の側のふち)
  function paintShape(path, c3, o) {
    o = o || {};
    let sd = o.sd === undefined ? 0.9 : o.sd, hd = o.hd === undefined ? 0.42 : o.hd;
    if (SOFT) { sd *= 1 - 0.5 * SOFT; hd *= 1 - 0.5 * SOFT; c3 = { c: c3.c, s: c3.s ? mix(c3.c, c3.s, 1 - 0.45 * SOFT) : c3.s, h: c3.h ? mix(c3.c, c3.h, 1 - 0.45 * SOFT) : c3.h }; }
    cx.fillStyle = c3.c; cx.fill(path);
    cx.save();
    cx.clip(path);
    if (sd > 0 && c3.s) {
      const hole = new Path2D(); hole.rect(-200, -200, 400, 400);
      hole.addPath(path, new DOMMatrix().translate(LIGHT[0] * sd, LIGHT[1] * sd));
      cx.fillStyle = c3.s; cx.fill(hole, 'evenodd');
    }
    if (hd > 0 && c3.h) {
      const hole2 = new Path2D(); hole2.rect(-200, -200, 400, 400);
      hole2.addPath(path, new DOMMatrix().translate(-LIGHT[0] * hd, -LIGHT[1] * hd));
      cx.fillStyle = c3.h; cx.fill(hole2, 'evenodd');
    }
    if (o.inside) o.inside();
    cx.restore();
  }

  function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }

  function line(pts, w, color, cap) {
    cx.strokeStyle = color; cx.lineWidth = w; cx.lineCap = cap || 'round'; cx.lineJoin = 'round';
    cx.beginPath(); pts.forEach(function (q, i) { if (i) cx.lineTo(q[0], q[1]); else cx.moveTo(q[0], q[1]); }); cx.stroke();
  }

  // ---- ふさふさしたくせ毛(imai)用:輪郭に細かなこぶ(カール)をつけた1枚の形をつくる ----
  function smoothPath(pts) {                                                       // 点を結ぶなめらかな閉じた線(中点を通る2次曲線)
    const n = pts.length, mid = function (a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; };
    const m0 = mid(pts[n - 1], pts[0]);
    let d = 'M' + m0[0].toFixed(1) + ',' + m0[1].toFixed(1);
    for (let i = 0; i < n; i++) { const q = pts[i], m = mid(pts[i], pts[(i + 1) % n]); d += ' Q' + q[0].toFixed(1) + ',' + q[1].toFixed(1) + ' ' + m[0].toFixed(1) + ',' + m[1].toFixed(1); }
    return d + ' Z';
  }
  function bumpArc(cx0, cy0, rx, ry, a0, a1, n, amp, ph) {                          // 楕円の弧に沿って、細かなこぶのある点列
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n, w = 1 + amp * Math.sin(i * 2.4 + ph) * 0.6 + amp * 0.5 * Math.sin(i * 5.1 + ph * 2);
      pts.push([cx0 + rx * w * Math.cos(a), cy0 - ry * w * Math.sin(a)]);
    }
    return pts;
  }
  const CURLY_BACK = bumpArc(-15, -7, 40, 45, 0, Math.PI * 2, 38, 0.08, 0.7).map(function (q) { return (q[0] < -22 && q[1] > -6) ? [q[0] - 2, q[1] + 6] : q; });
  const CURLY_FRONT = bumpArc(-3, -14, 41, 39, Math.PI * 1.02, 0.1, 26, 0.07, 1.9).concat([
    [37, -17], [33, -12.5], [29, -17], [25, -11.5], [20, -16.5], [15.5, -10.5], [10, -16], [5, -9.5], [-1, -15], [-6, -8.5], [-12, -13.5], [-17, -6], [-23, -9], [-27, -1], [-31, 3]]);
  function inPoly(pts, x, y) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { if (((pts[i][1] > y) !== (pts[j][1] > y)) && (x < (pts[j][0] - pts[i][0]) * (y - pts[i][1]) / (pts[j][1] - pts[i][1]) + pts[i][0])) c = !c; } return c; }
  // 髪の中の細かなカール(小さな弧)。位置は決め打ちの乱数で、コマが変わってもちらつかない
  function curlyDetail(pal, poly, x0, y0, nx, ny, sx, sy, back) {
    const h1 = pal.hs || mix(pal.h, '#000000', 0.45), h2 = pal.hh || mix(pal.h, '#ffffff', 0.3);
    const rnd = function (i, j) { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
      const x = x0 + ix * sx + rnd(ix, iy) * 5 - 2.5, y = y0 + iy * sy + rnd(iy + 7, ix + 3) * 4 - 2;
      if (!inPoly(poly, x, y)) continue;
      const r = 3.8 + rnd(ix + 11, iy + 5) * 3, a0 = rnd(ix + 2, iy + 9) * Math.PI * 2, span = Math.PI * (1.1 + rnd(ix + 5, iy + 1) * 0.6);
      cx.lineCap = 'round';
      cx.strokeStyle = h1; cx.lineWidth = 1.7; cx.beginPath(); cx.arc(x, y, r, a0, a0 + span); cx.stroke();
      if (!back) { cx.strokeStyle = h2; cx.lineWidth = 1.5; cx.beginPath(); cx.arc(x - 0.9, y - 0.9, r, a0 + Math.PI * 1.15, a0 + Math.PI * 1.15 + span * 0.45); cx.stroke(); }
    }
  }

  // ---- 髪の形(頭の中心が原点、絵の1マス = 頭の大きさ 1/34)----
  const HAIR = {
    recede: ['M-30,4 C-36,-30 -10,-44 8,-32 C-2,-32 -12,-26 -18,-12 C-14,-2 -18,10 -22,14 Z', 'M-6,-36 C4,-40 14,-34 12,-28 C6,-34 0,-34 -6,-30 Z'],
    slick: ['M-30,8 C-38,-30 -8,-46 16,-42 C28,-44 36,-32 30,-24 C22,-28 12,-30 2,-24 C-6,-20 -8,-10 -12,6 C-18,14 -24,16 -30,8 Z'],
    // 額が広く、こめかみが後退した短髪(前髪を上げている)
    high: ['M-30,8 C-38,-28 -10,-47 12,-46 C26,-46 35,-38 32,-30 C27,-33 22,-35 17,-30 C13,-35 6,-34 2,-27 C-3,-24 -8,-14 -12,6 C-18,14 -24,16 -30,8 Z'],
    // 写真の髪(生え際が後退した、短く立ち上がる黒茶髪)
    nak: ['M-34,10 C-44,-18 -30,-38 -8,-39 C-4,-40 -2,-43 2,-41 C5,-43 8,-40 8,-37 C4,-35 -2,-33 -8,-27 C-13,-21 -14,-12 -15,-4 C-15,4 -16,10 -19,14 C-25,19 -32,17 -34,10 Z'],
    // kira:きれいにまとまったマッシュ(前髪が額をおおい、横に流れる)
    kira: ['M-30,11 C-37,-4 -35,-30 -14,-40 C-4,-45 10,-45 20,-41 C28,-38 34,-31 35,-21 C34,-17 32,-14 31,-12.5 C29.5,-16 28,-19 26.5,-20.5 C25,-18 23.5,-16.5 22,-15.5 C20.5,-17 18.5,-20 16.5,-21.5 C15,-18 13,-15 12,-13 C10,-15 8,-18 6.5,-19.5 C4,-18 2,-18 -0.5,-17.5 C-5,-14 -8,-9 -9,1 C-12,2 -15,3 -17,6 C-19,10 -23,13 -27,13 Z'],
    // nakano:短くととのえた髪を、横に流す
    swept: ['M-31,8 C-38,-26 -12,-44 12,-42 C26,-40 35,-30 34,-19 C27,-26 17,-28 6,-23 C0,-19 -6,-15 -10,-4 C-12,2 -14,8 -18,12 Z', 'M2,-41 C10,-44 18,-42 24,-37 C16,-37 8,-35 2,-31 Z'],
    // sasaki:ふんわりしたくせ毛のマッシュ(上にボリューム、毛先がはねる)
    mop: ['M-34,12 C-48,-26 -22,-56 6,-54 C22,-58 42,-46 38,-28 C43,-20 33,-19 25,-16 C28,-24 16,-22 10,-29 C3,-21 -6,-24 -14,-12 C-12,0 -17,8 -21,14 Z'],
    // takahashi:生え際が M 字にさがり、上に短く残る髪
    tk: ['M-31,10 C-41,-22 -17,-41 3,-41 C13,-43 21,-40 23,-34 C17,-35 12,-34 7,-27 C1,-23 -7,-16 -11,-3 C-13,4 -15,9 -19,13 Z', 'M-4,-42 C4,-47 14,-46 19,-40 C12,-41 5,-39 -4,-36 Z'],
    // imai:ボリュームのあるくせ毛(前髪がおでこにかかる)
    curlyBig: [smoothPath(CURLY_FRONT)],
    bowl: ['M-32,18 C-40,-26 -4,-46 22,-36 C32,-30 34,-18 32,-8 C20,-12 8,-16 -2,-18 C-8,-4 -12,2 -12,14 C-20,20 -26,22 -32,18 Z'],
    long: ['M-34,20 C-42,-28 -6,-46 18,-38 C30,-34 34,-22 31,-8 C20,-24 8,-30 -4,-30 C-12,-14 -16,6 -18,22 C-24,28 -30,26 -34,20 Z'],
    wavy: ['M-32,6 C-40,-26 -16,-44 6,-42 C22,-42 36,-28 34,-12 C28,-14 22,-20 20,-24 C14,-20 12,-28 4,-20 C0,-26 -6,-16 -8,-22 C-14,-12 -12,-4 -12,12 Z'],
    buzz: ['M-30,6 C-34,-24 -8,-38 14,-35 C26,-32 32,-20 32,-12 C22,-24 6,-26 -8,-24 C-14,-4 -16,0 -24,8 Z'],
    // ishii:短く整えた髪(頭の上までしっかり覆い、横と後ろはさらに短い)
    crop: ['M-32,3 C-40,-22 -14,-41 12,-39 C26,-38 33,-30 33,-22 C27,-27 14,-29 0,-27 C-7,-22 -11,-15 -14,-9 C-19,-8 -26,-6 -31,3 Z'],
    bob: ['M-34,30 C-44,-24 -8,-46 18,-38 C30,-32 34,-16 28,-6 C18,-18 6,-24 -8,-22 C-6,-10 -10,6 -14,20 C-18,34 -24,36 -34,30 Z'],
    tousled: ['M-30,6 C-40,-30 -14,-54 8,-52 C20,-60 36,-44 34,-30 C38,-22 24,-24 20,-22 C22,-28 10,-20 4,-26 C-2,-18 -8,-20 -14,-10 C-12,-2 -14,8 -18,10 Z'],
    curly: ['M-10,-26 m-13,0 a13,13 0 1,0 26,0 a13,13 0 1,0 -26,0 Z', 'M4,-34 m-14,0 a14,14 0 1,0 28,0 a14,14 0 1,0 -28,0 Z', 'M18,-30 m-13,0 a13,13 0 1,0 26,0 a13,13 0 1,0 -26,0 Z', 'M-22,-12 m-12,0 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0 Z', 'M28,-20 m-10,0 a10,10 0 1,0 20,0 a10,10 0 1,0 -20,0 Z']
  };
  // 胸の前に垂れる髪の束(胴体や腕よりも手前に描く)
  const HAIR_FRONT = {
    long: ['M-26,10 C-26,50 -27,92 -32,128 C-20,138 4,134 11,118 C4,86 5,46 -3,12 Z']
  };
  const HAIR_BACK = {
    curly: ['M-30,4 m-16,0 a16,16 0 1,0 32,0 a16,16 0 1,0 -32,0 Z', 'M-26,-16 m-18,0 a18,18 0 1,0 36,0 a18,18 0 1,0 -36,0 Z', 'M-12,-30 m-19,0 a19,19 0 1,0 38,0 a19,19 0 1,0 -38,0 Z', 'M6,-34 m-19,0 a19,19 0 1,0 38,0 a19,19 0 1,0 -38,0 Z', 'M22,-28 m-17,0 a17,17 0 1,0 34,0 a17,17 0 1,0 -34,0 Z', 'M-30,20 m-12,0 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0 Z'],
    long: ['M-6,-34 C-52,-30 -63,30 -70,130 L-26,136 C-17,92 -4,50 6,20 Z'],
    bob: ['M-4,-36 C-48,-30 -54,20 -46,46 C-45,54 -51,58 -50,66 C-40,66 -28,60 -12,52 C-4,36 2,10 8,-10 Z'],
    curlyBig: [smoothPath(CURLY_BACK)],
    mop: ['M-30,2 m-14,0 a14,14 0 1,0 28,0 a14,14 0 1,0 -28,0 Z', 'M-26,-20 m-16,0 a16,16 0 1,0 32,0 a16,16 0 1,0 -32,0 Z', 'M-8,-38 m-17,0 a17,17 0 1,0 34,0 a17,17 0 1,0 -34,0 Z']
  };

  function tri(pal, k, ks, dark, hk) {
    let c = pal[k] || '#ff00ff';
    let s = (ks && pal[ks]) ? pal[ks] : mix(c, '#12142c', 0.3);
    let h = hk && pal[hk] ? pal[hk] : mix(c, '#ffffff', 0.2);
    if (dark) { c = mix(c, '#0d0e1c', 0.2); s = mix(s, '#0d0e1c', 0.22); h = mix(h, '#0d0e1c', 0.2); }
    return { c: c, s: s, h: h };
  }

  // ---- 写真から作った顔(tools/photo_face.py)----
  const faceCv = {};
  function faceImage(name) {
    if (faceCv[name] !== undefined) return faceCv[name];
    const F = Game.Data.Faces && Game.Data.Faces[name];
    if (!F) { faceCv[name] = null; return null; }
    const c = document.createElement('canvas'); c.width = F.w; c.height = F.h;
    const x = c.getContext('2d');
    const ids = '0123456789abcdefghij';
    F.rows.forEach(function (row, yy) {
      for (let xx = 0; xx < F.w; xx++) {
        const ch = row[xx]; if (ch === '.') continue;
        x.fillStyle = F.pal[ids.indexOf(ch)]; x.fillRect(xx, yy, 1, 1);
      }
    });
    faceCv[name] = c;
    return c;
  }

  // ---- 写真から作った体のパーツ(tools/photo_parts.py)----
  const partCv = {};
  function texImg(name, part) {
    const key = name + '/' + part;
    if (partCv[key] !== undefined) return partCv[key];
    const T = Game.Data.PartTex && Game.Data.PartTex[name], P = T && T.parts[part];
    if (!P) { partCv[key] = null; return null; }
    const c = document.createElement('canvas'); c.width = P.w; c.height = P.h;
    const x = c.getContext('2d'), ids = '0123456789abcdefghijklmnopqrstuv';
    P.rows.forEach(function (row, yy) {
      for (let xx = 0; xx < P.w; xx++) { const ch = row[xx]; if (ch === '.') continue; x.fillStyle = T.pal[ids.indexOf(ch)]; x.fillRect(xx, yy, 1, 1); }
    });
    partCv[key] = c;
    return c;
  }
  // 骨 a→b にそって、パーツの絵を貼る(上=付け根、下=先)。along0〜along1 は骨の上の範囲(単位)、width は幅
  function texFill(path, name, part, a, b, along0, along1, width, dark) {
    const t = texImg(name, part);
    if (!t) return false;
    let ux = b[0] - a[0], uy = b[1] - a[1];
    const l = Math.hypot(ux, uy) || 1; ux /= l; uy /= l;
    cx.save();
    cx.clip(path);
    cx.transform(uy, -ux, ux, uy, a[0], a[1]);                                 // 絵のx → 体の前側、絵のy → 骨の向き
    cx.imageSmoothingEnabled = false;
    cx.drawImage(t, -width / 2, along0, width, along1 - along0);
    if (dark) { cx.fillStyle = 'rgba(8,10,30,0.3)'; cx.fillRect(-width / 2, along0, width, along1 - along0); }
    cx.restore();
    return true;
  }

  // ---- 生地の模様:origin から軸 u(長さ方向)・n(幅方向)にそって、格子状に点を撒く(体といっしょに動く)----
  function texGrid(o, pal, origin, ux, uy, nx, ny, nU, nN, key) {
    const kind = o.texture;
    if (!kind || (kind === 'print' && !pal.pr)) return;
    const cs = kind === 'fluff' ? 1.25 : (o.printCell || 1.7);
    const hash = function (i, j) { let h = (i * 374761393 + j * 668265263 + (key || 0) * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    for (let i = -1; i <= Math.ceil(nU / cs); i++) {
      for (let j = -Math.ceil(nN / cs); j <= Math.ceil(nN / cs); j++) {
        const r1 = hash(i, j), r2 = hash(j + 91, i - 17), r3 = hash(i * 7 + 3, j * 5 + 11);
        const px = origin[0] + ux * (i + r1 * 0.9) * cs + nx * (j + r2 * 0.9) * cs, py = origin[1] + uy * (i + r1 * 0.9) * cs + ny * (j + r2 * 0.9) * cs;
        if (kind === 'print') {                                                  // 小さな柄(ブルーのプリントシャツ・花柄)
          if (r3 > (o.printDensity || 0.62)) continue;
          cx.fillStyle = r3 < (o.printAlt || 0.18) && pal.pr2 ? pal.pr2 : pal.pr; cx.globalAlpha = 0.8;
          cx.fill(ellPath([px, py], 0.3 + r2 * 0.22, 0.26 + r1 * 0.2, r3 * 6));
        } else if (kind === 'fluff') {                                           // ボア・フリースのもこもこ
          cx.fillStyle = r3 < 0.5 ? (pal.gh || '#ffffff') : pal.G; cx.globalAlpha = r3 < 0.5 ? 0.55 : 0.3;
          cx.fill(ellPath([px, py], 0.36 + r2 * 0.2, 0.3 + r1 * 0.16, r3 * 6));
        }
        cx.globalAlpha = 1;
      }
    }
  }

  // ---- 頭 ----
  function headBack(pal, o, hd) {
    const k = 0.158 * (o.headScale || 1), list = HAIR_BACK[o.hair];
    if (!list) return;
    cx.save(); cx.translate(hd[0], hd[1] + (o.headDy || 0)); cx.scale(k, k);
    list.forEach(function (d) { paintShape(new Path2D(d), tri(pal, 'h', null, false, null), { sd: 4, hd: 3 }); });
    if (o.hair === 'curlyBig') { cx.save(); cx.clip(new Path2D(list[0])); curlyDetail(pal, CURLY_BACK, -62, -60, 10, 9, 9.4, 9, true); cx.restore(); }
    if (o.hair === 'bob') {                                                              // 毛束の筋(根もとは明るい、毛先は影)
      cx.save(); cx.clip(new Path2D(HAIR_BACK.bob[0])); cx.strokeStyle = pal.hh || mix(pal.h, '#ffffff', 0.25); cx.lineCap = 'round'; cx.globalAlpha = 0.5;
      [[[-18,-33],[-40,-20],[-46,24],[-46,62],1.3], [[-10,-33],[-30,-10],[-34,26],[-30,56],1.1], [[-26,-30],[-48,0],[-52,32],[-49,64],1.4]].forEach(function (s) { cx.lineWidth = s[4]; cx.beginPath(); cx.moveTo(s[0][0], s[0][1]); cx.bezierCurveTo(s[1][0], s[1][1], s[2][0], s[2][1], s[3][0], s[3][1]); cx.stroke(); });
      cx.restore();
    }
    if (o.hair === 'long') {
      const g = cx.createLinearGradient(0, 28, 0, 108); g.addColorStop(0, rgba(pal.H || pal.h, 0)); g.addColorStop(0.55, rgba(pal.H || pal.h, 0.8)); g.addColorStop(1, pal.H || pal.h);
      cx.save(); cx.clip(new Path2D(HAIR_BACK.long[0])); cx.fillStyle = g; cx.fillRect(-80, 0, 100, 190);
      cx.strokeStyle = pal.hh || mix(pal.h, '#ffffff', 0.25); cx.lineCap = 'round'; cx.globalAlpha = 0.5;                                   // 毛束の筋(根もとは明るい、毛先は影になる)
      [[[-18,-33],[-42,-20],[-50,45],[-54,128],1.3], [[-10,-33],[-34,-10],[-38,45],[-40,130],1.1], [[-26,-30],[-52,0],[-60,55],[-64,128],1.5], [[-4,-30],[-24,0],[-24,48],[-24,132],1.0]].forEach(function (s) { cx.lineWidth = s[4]; cx.beginPath(); cx.moveTo(s[0][0], s[0][1]); cx.bezierCurveTo(s[1][0], s[1][1], s[2][0], s[2][1], s[3][0], s[3][1]); cx.stroke(); });
      cx.restore();
    }
    cx.restore();
  }

  function hairFront(pal, o, hd) {
    const list = HAIR_FRONT[o.hair];
    if (!list || o.hairFront === false) return;
    const k = 0.158 * (o.headScale || 1);
    cx.save(); cx.translate(hd[0], hd[1] + (o.headDy || 0)); cx.scale(k, k);
    list.forEach(function (d) { paintShape(new Path2D(d), tri(pal, 'h', 'hs', false, 'hh'), { sd: 3.2, hd: 2.4 }); });
    if (o.hair === 'long') {
      cx.save(); cx.clip(new Path2D(list[0]));
      if (pal.H) { const g2 = cx.createLinearGradient(0, 26, 0, 106); g2.addColorStop(0, rgba(pal.H, 0)); g2.addColorStop(0.5, rgba(pal.H, 0.8)); g2.addColorStop(1, pal.H); cx.fillStyle = g2; cx.fillRect(-40, 0, 60, 145); }
      cx.strokeStyle = pal.hh || mix(pal.h, '#ffffff', 0.25); cx.lineCap = 'round'; cx.globalAlpha = 0.5;
      [[[-18,14],[-19,50],[-20,90],[-24,124],1.0], [[-10,14],[-10,50],[-9,90],[-5,126],1.0], [[-2,14],[0,50],[2,86],[7,116],0.9]].forEach(function (s) { cx.lineWidth = s[4]; cx.beginPath(); cx.moveTo(s[0][0], s[0][1]); cx.bezierCurveTo(s[1][0], s[1][1], s[2][0], s[2][1], s[3][0], s[3][1]); cx.stroke(); });
      cx.restore();
    }
    cx.restore();
  }

  function head(pal, o, hd, kind, p) {
    const fi = o.tex ? texImg(o.tex, 'head') : (o.face ? faceImage(o.face) : null);
    if (fi) {                                                                      // 写真の顔
      const sc = (o.faceScale || 1) / RES;
      cx.save(); cx.imageSmoothingEnabled = false;
      cx.drawImage(fi, hd[0] - fi.width * sc / 2 + (o.faceDx || 0), hd[1] - fi.height * sc / 2 + (o.faceDy || 0), fi.width * sc, fi.height * sc);
      cx.restore();
      return;
    }
    const k = 0.158 * (o.headScale || 1);
    const skin = tri(pal, 's', 'S', false, 'sh'), hair = tri(pal, 'h', 'hs', false, 'hh');
    const rx = o.faceRx || 31, ry = o.faceRy || 35;
    cx.save(); cx.translate(hd[0], hd[1] + (o.headDy || 0)); cx.scale(k, k);
    const smile = o.smile && !kind;
    const fight = kind === 'focus' || kind === 'shout' || kind === 'strain' || kind === 'guard';
    const shut = kind === 'pain' || kind === 'down' || kind === 'dizzy';
    // 顔
    const ryLow = ry * (o.faceLow || 1);                                              // 面長(1より大きい):目から下を縦にのばす
    paintShape(o.faceN ? superPath(rx, ry, o.faceN, ryLow) : ellPath([0, 0], rx, ry), skin, { sd: 4.4, hd: 2.4 });
    if (o.shine) { cx.fillStyle = pal.sh || pal.s; cx.globalAlpha = 0.75; cx.fill(ellPath([4, -24], 9, 5.2, -0.25)); cx.globalAlpha = 1; }   // 広いおでこのつや
    // 頬の赤み
    if (o.blush !== 0) { cx.fillStyle = mix(pal.s, '#e06a60', 0.35); cx.globalAlpha = 0.55 * (o.blush === undefined ? 1 : o.blush); cx.fill(ellPath([13, 15], 7, 4.5)); cx.globalAlpha = 1; }
    // 耳
    paintShape(ellPath([-12, 4], 5.6, 8.4), tri(pal, 's', 'S', false, 'sh'), { sd: 2, hd: 0 });
    cx.fillStyle = pal.S; cx.fill(ellPath([-12.5, 5], 2.6, 4.6));
    // ひげ(あごひげ・無精ひげ)
    if (o.beard === 'stubble') {                                                       // 薄い無精ひげ+あごの先のひげ(肌がほとんど見える)。点を散らして描く
      cx.save(); cx.clip(o.faceN ? superPath(rx, ry, o.faceN, ryLow) : ellPath([0, 0], rx, ry));
      const bh = function (i, j) { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
      const bc = mix(pal.h, pal.s, o.stubbleMix === undefined ? 0.15 : o.stubbleMix);
      const bs = 0.5;                                                                   // 点の間隔(ゲーム座標)
      for (let iy = 0; iy < 48; iy++) for (let ix = 0; ix < 80; ix++) {
        const x = -6 + ix * bs, y = 15 + iy * bs;
        const gx = (x - 14) / 9.5, gy = (y - 31) / 7, gd = gx * gx + gy * gy;            // あごの先
        const mx = (x - 19) / 9, my = (y - 17.6) / 2.2, md = mx * mx + my * my;        // 口の上(薄い口ひげ)
        let pr = 0;
        if (gd < 1) pr = 0.95 * (1 - gd * 0.35) * (o.chinK === undefined ? 1 : o.chinK);
        else if (md < 1 && o.mustache) pr = 0.7 * (1 - md * 0.4);                          // 口ひげ(o.mustache を指定したときだけ)
        else if (y > 24) pr = (o.stubble === undefined ? 0.42 : o.stubble) * Math.min(1, (y - 22) / 4);
        if (pr > 0 && bh(ix, iy) < pr) { cx.fillStyle = bc; cx.fill(ellPath([x + bh(iy, ix) * 0.3, y + bh(ix + 5, iy + 9) * 0.3], 0.46, 0.46)); }
      }
      cx.restore();
    } else if (o.beard) {
      cx.fillStyle = mix(pal.h, pal.s, 0.12); cx.globalAlpha = 0.85;
      cx.fill(new Path2D('M2,14 Q18,17 31,12 Q33,32 14,40 Q-2,34 -6,24 Z')); cx.globalAlpha = 1;
      cx.fillStyle = pal.h; cx.fill(new Path2D('M12,17 Q20,13 28,17 Q20,21 12,17 Z'));
    }
    // 鼻
    if (o.nose === 'round') {
      cx.fillStyle = pal.S; cx.fill(new Path2D('M26.5,1.5 Q37,6 35.4,12.4 Q33.4,15.6 28,14.4 Q24.6,13 26,8.6 Z'));
      cx.fillStyle = pal.sh || pal.s; cx.globalAlpha = 0.7; cx.fill(ellPath([30.6, 5.4], 1.9, 1.3)); cx.globalAlpha = 1;
    } else {
      const nk = o.noseK || 1;                                                       // 鼻の高さ(1=従来。大きいほど、根もとが高く、先が前へ出る)
      const nA = [28, 3 - 4.5 * (nk - 1)], nB = [34 + 7 * (nk - 1), 12 + 0.6 * (nk - 1)], nC = [27, 13];
      cx.fillStyle = pal.S; cx.fill(new Path2D('M' + nA[0] + ',' + nA[1] + ' L' + nB[0] + ',' + nB[1] + ' L' + nC[0] + ',' + nC[1] + ' Z'));
      if (nk > 1) {                                                                  // 鼻すじのハイライト
        cx.strokeStyle = pal.sh || pal.s; cx.globalAlpha = 0.8; cx.lineWidth = 1.1; cx.lineCap = 'round';
        cx.beginPath(); cx.moveTo(nA[0] - 0.4, nA[1] + 1.4); cx.lineTo(nB[0] - 1.2, nB[1] - 1.6); cx.stroke(); cx.globalAlpha = 1;
      }
    }
    // 眉
    const bw = o.browW || 3.2;
    const bcol = o.browCol ? pal[o.browCol] : pal.h;
    if (fight) line([[6, -14], [24, -8.5]], bw + 0.6, bcol);
    else if (kind === 'pain') line([[6, -8], [24, -14]], bw, bcol);
    else line([[7, -10], [16, -12.5], [24, -10]], bw, bcol);
    // 目
    const ex = 15, ey = 3;
    if (shut) {
      line([[ex - 6, ey], [ex + 5, ey + 3]], 2.6, pal.e || '#15151c');
    } else if (smile && !o.calm) {
      if (o.calm) line([[ex - 6, ey + 1], [ex, ey - 1.6], [ex + 6, ey + 1]], 2.2, pal.e || '#15151c');   // ゆったりした目
      else line([[ex - 6, ey + 2], [ex, ey - 4], [ex + 6, ey + 2]], 2.8, pal.e || '#15151c');
    } else {
      const ek = o.eyeK || 1;                                                       // 目の縦の大きさ(小さいほど細い)
      cx.fillStyle = '#f4f1ee'; cx.fill(ellPath([ex, ey], 5.4, 4.6 * ek));
      cx.fillStyle = pal.e || '#15151c'; cx.fill(ellPath([ex + 1.6, ey], 3.0, 4.2 * ek));
      cx.fillStyle = '#ffffff'; cx.fill(ellPath([ex + 2.6, ey - 1.6 * ek], 1.0, 1.0));
      if (ek < 1) line([[ex - 6.2, ey - 4.6 * ek - 0.2], [ex + 6.6, ey - 4.2 * ek - 0.4]], 1.8, pal.e || '#15151c');   // 重たいまぶた
      if (fight) line([[ex - 6, ey - 4.6], [ex + 6.5, ey - 3]], 2.2, pal.e || '#15151c');       // 睨むまぶた
      if (o.lash) { line([[ex - 6.4, ey - 3.4 * ek], [ex + 6.4, ey - 4.2 * ek]], 2.2, pal.e || '#15151c'); line([[ex - 6.4, ey - 3.4 * ek], [ex - 8.6, ey - 5.2 * ek]], 1.3, pal.e || '#15151c'); }   // まつ毛
    }
    if (o.bags && !shut) line([[ex - 5.4, ey + 5.6], [ex, ey + 6.8], [ex + 5.6, ey + 5.6]], 1.1, mix(pal.s, pal.S, 0.85));   // 目の下のくま
    // 口(顔を細くしたとき、輪郭からはみ出さないように左へ寄せる)
    cx.save();
    if (o.mouthFit) cx.translate(Math.min(0, (o.faceN ? rx * Math.pow(Math.max(0, 1 - Math.pow(24 / ry, o.faceN)), 1 / o.faceN) : rx * Math.sqrt(Math.max(0, 1 - (24 / ry) * (24 / ry)))) - 27), 0);
    if (o.mouthDy) cx.translate(0, o.mouthDy);                                       // 口を下げる(面長のとき)
    if (kind === 'shout' || kind === 'pain') {
      cx.fillStyle = '#4a1a1e'; cx.fill(ellPath([20, 24], 6.6, kind === 'pain' ? 4.2 : 5.4));
      cx.fillStyle = '#f2eeea'; cx.fillRect(15, 19.4, 10.5, 2.6);
      cx.fillStyle = '#b4545c'; cx.fill(ellPath([20, 27], 3.6, 2));
    } else if (kind === 'strain') {
      cx.fillStyle = '#f2eeea'; cx.fillRect(13, 19.6, 15, 6);
      line([[13, 22.6], [28, 22.6]], 1.2, '#7a6a68');
      line([[13, 19.6], [28, 19.6], [28, 25.6], [13, 25.6], [13, 19.6]], 1.4, '#4a2a2a');
    } else if (smile && o.mouthClosed) {
      line([[12, 22.6], [18, 24.6], [25, 23], [28.2, 20.6]], 1.6, mix(pal.S, '#7a3a34', 0.55));
      line([[16, 27.4], [23, 27.2]], 1.2, mix(pal.s, pal.S, 0.6));                  // 下くちびるの影
    } else if (smile) {
      cx.fillStyle = '#5a2428'; cx.fill(new Path2D('M12,21 Q20,33 29,21 Z'));
      cx.fillStyle = '#f2eeea'; cx.fillRect(14, 21, 13, 2.6);
    } else if (o.lips) {
      cx.fillStyle = '#c24a54'; cx.fill(new Path2D('M13,23 Q19,20 26,23 Q19,28 13,23 Z'));
    } else {
      line([[13, 23], [26, 24]], 2.4, '#8a4036');
    }
    cx.restore();
    // 髪(前)
    const list = HAIR[o.hair];
    if (list) {
      list.forEach(function (d) { paintShape(new Path2D(d), hair, { sd: o.hair === 'buzz' ? 0 : 3.2, hd: o.hair === 'buzz' ? 0 : 2.4 }); });
      if (o.hair === 'kira') {                                                             // つや(頭のカーブに沿う明るい帯)と、前髪・後ろの短い毛束
        cx.save(); cx.clip(new Path2D(list[0])); cx.strokeStyle = pal.hh || mix(pal.h, '#ffffff', 0.25); cx.lineCap = 'round';
        const arc = function (pts, w) { cx.lineWidth = w; cx.beginPath(); cx.moveTo(pts[0][0], pts[0][1]); for (let q = 1; q < pts.length; q++) cx.lineTo(pts[q][0], pts[q][1]); cx.stroke(); };
        arc([[-26,-30], [-19,-36], [-9,-39.5], [2,-40.5]], 2.2); arc([[9,-41], [17,-39], [24,-34], [28,-28]], 1.8);   // つや
        arc([[18,-33], [22,-27], [24,-21]], 1.1); arc([[10,-35], [13,-28], [14.5,-22]], 1.1); arc([[2,-36], [5,-30], [6,-24]], 1.0);   // 前髪の毛束
        arc([[-14,-34], [-22,-27], [-27,-17]], 1.1); arc([[-8,-30], [-16,-24], [-21,-14]], 1.0);                                      // 後ろの毛束
        cx.restore();
      }
      if (o.hair === 'bob') {                                                               // つやと毛束の流れ
        cx.save(); cx.clip(new Path2D(list[0])); cx.strokeStyle = pal.hh || mix(pal.h, '#ffffff', 0.25); cx.lineCap = 'round';
        const sb = function (pts, w, al) { cx.lineWidth = w; cx.globalAlpha = al; cx.beginPath(); cx.moveTo(pts[0][0], pts[0][1]); cx.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]); cx.stroke(); };
        sb([[-26,-24], [-16,-36], [0,-38], [14,-34]], 2.0, 0.8);
        sb([[6,-36], [-2,-28], [-8,-12], [-13,10]], 1.1, 0.55); sb([[-6,-37], [-16,-26], [-20,-6], [-23,18]], 1.0, 0.5); sb([[-16,-34], [-26,-22], [-30,0], [-31,24]], 1.0, 0.45);
        cx.globalAlpha = 1; cx.restore();
      }
      if (o.hair === 'long') {                                                              // つやと毛束の流れ(分け目から下へ)
        cx.save(); cx.clip(new Path2D(list[0])); cx.strokeStyle = pal.hh || mix(pal.h, '#ffffff', 0.25); cx.lineCap = 'round';
        const st = function (pts, w, a) { cx.lineWidth = w; cx.globalAlpha = a; cx.beginPath(); cx.moveTo(pts[0][0], pts[0][1]); cx.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]); cx.stroke(); };
        st([[-26,-26], [-16,-36], [0,-38], [14,-34]], 2.0, 0.8);                                     // つや
        st([[6,-36], [-2,-28], [-8,-12], [-13,8]], 1.1, 0.55); st([[-6,-37], [-16,-26], [-19,-6], [-22,16]], 1.0, 0.45);   // 毛束
        cx.globalAlpha = 1; cx.restore();
      }
      if (o.hair === 'recede') { line([[-14, -30], [-4, -35]], 1.4, pal.hh || mix(pal.h, '#ffffff', 0.25)); }
      if (o.hairBuzz) {                                                                   // 坊主(丸刈り):髪の中に、短い毛を点でびっしり描く
        const bz = function (i, j) { let h = (i * 2246822519 + j * 3266489917) | 0; h = (h ^ (h >>> 15)) * 2654435761 | 0; return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };
        cx.save(); cx.clip(new Path2D(list[0]));
        for (let iy = 0; iy < 52; iy++) for (let ix = 0; ix < 80; ix++) {
          const x = -34 + ix * 0.9, y = -44 + iy * 0.9, r = bz(ix, iy);
          if (r < 0.5 * o.hairBuzz) { cx.fillStyle = pal.hs || mix(pal.h, '#000000', 0.4); cx.fill(ellPath([x + bz(iy, ix) * 0.5, y + bz(ix + 7, iy + 2) * 0.5], 0.42, 0.42)); }
          else if (r > 1 - 0.18 * o.hairBuzz) { cx.fillStyle = pal.hh || mix(pal.h, '#ffffff', 0.3); cx.fill(ellPath([x + bz(iy, ix) * 0.5, y + bz(ix + 7, iy + 2) * 0.5], 0.36, 0.36)); }
        }
        cx.restore();
      }
      if (o.hairFade) {                                                                   // 刈り上げ(側頭部と後ろは、点で描いた短い髪)
        const fh = function (i, j) { let h = (i * 668265263 + j * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
        const fc = mix(pal.h, pal.s, 0.28);
        for (let iy = 0; iy < 40; iy++) for (let ix = 0; ix < 40; ix++) {
          const x = -33 + ix * 0.5, y = -12 + iy * 0.5;
          if (!inPoly([[-33, 1], [-14, -10], [-12, -4], [-13, 6], [-19, 15], [-28, 14], [-33, 8]], x, y)) continue;
          if ((x + 12) * (x + 12) / 44 + (y - 4) * (y - 4) / 88 < 1) continue;           // 耳の上には描かない
          if (fh(ix, iy) < Math.max(0.1, 0.85 - (y + 6) * 0.045) * o.hairFade) { cx.fillStyle = fc; cx.fill(ellPath([x + fh(iy, ix) * 0.3, y + fh(ix + 3, iy + 8) * 0.3], 0.4, 0.4)); }
        }
      }
      if (o.hair === 'curlyBig') { cx.save(); cx.clip(new Path2D(list[0])); curlyDetail(pal, CURLY_FRONT, -38, -52, 8, 6, 10, 8.2, false); cx.restore(); }
    }
    if (o.hair === 'shave') {                                                           // 丸刈り:頭の形にぴったり沿う薄い髪。生え際は点でぼかす
      const sh = function (i, j) { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
      const HL = [[40, -14], [31, -21], [24, -27.5], [10, -30], [-2, -26.5], [-9, -17], [-13, -9], [-19, -6], [-24, 2], [-28, 10], [-40, 14]];   // 生え際(前→後ろ)
      const REG = HL.concat([[-60, 14], [-60, -60], [60, -60], [60, -14]]);
      const dHL = function (x, y) {                                                       // 生え際までの距離(中:正/外:負)
        let d = 1e9;
        for (let i = 0; i < HL.length - 1; i++) {
          const ax = HL[i][0], ay = HL[i][1], bx = HL[i + 1][0], by = HL[i + 1][1], vx = bx - ax, vy = by - ay;
          const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
          d = Math.min(d, Math.hypot(x - ax - vx * t, y - ay - vy * t));
        }
        return inPoly(REG, x, y) ? d : -d;
      };
      const gap = o.shaveSoft === undefined ? 2.4 : o.shaveSoft;                         // 生え際のぼかしの幅
      const sk = superPath(rx + (o.shaveT || 1.7), ry + (o.shaveT || 1.7), o.faceN || 2);   // 頭より少しだけ大きい(毛の厚み)
      const regP = new Path2D(); REG.forEach(function (q, i) { if (i) regP.lineTo(q[0], q[1]); else regP.moveTo(q[0], q[1]); }); regP.closePath();
      const base = mix(pal.h, pal.s, o.shaveMix === undefined ? 0.2 : o.shaveMix);        // 地肌が透ける毛の色
      cx.save(); cx.clip(regP);
      cx.fillStyle = base; cx.fill(sk);
      cx.restore();
      cx.save(); cx.clip(sk);
      for (let iy = 0; iy < 110; iy++) for (let ix = 0; ix < 130; ix++) {
        const x = -42 + ix * 0.55, y = -44 + iy * 0.55, d = dHL(x, y), r = sh(ix, iy);
        const jx = x + sh(iy, ix) * 0.55 - 0.1, jy = y + sh(ix + 5, iy + 9) * 0.55 - 0.1;
        if (d > 0) {
          if (d < gap && r > 0.18 + 0.82 * (d / gap)) { cx.fillStyle = pal.s; cx.fill(ellPath([jx, jy], 0.5, 0.5)); }       // 生え際:肌色の点を重ねて、毛をまばらに
          else if (r < 0.42 * (o.shaveDark === undefined ? 1 : o.shaveDark)) { cx.fillStyle = pal.hs || mix(pal.h, '#000000', 0.4); cx.fill(ellPath([jx, jy], 0.42, 0.42)); }   // 毛の濃い点
          else if (r > 0.9) { cx.fillStyle = mix(pal.s, pal.h, 0.2); cx.fill(ellPath([jx, jy], 0.38, 0.38)); }                                                                      // 地肌のつぶ
        } else if (d > -gap * 0.7 && r < 0.32 * (1 + d / (gap * 0.7))) { cx.fillStyle = base; cx.fill(ellPath([jx, jy], 0.46, 0.46)); }    // 生え際の外にも少しだけ毛
      }
      cx.restore();
    }
    // メガネ
    if (o.glasses) {
      const fr = pal.f || '#22232b', gx = 16, gy = 3, lw = o.glassLine || 2.8, gw = (o.glassW || 22) / 2, gh = (o.glassH || 17) / 2;
      cx.fillStyle = 'rgba(200,225,240,0.22)';
      if (o.glasses === 'half') {                                                                  // ハーフリム(上だけ枠)
        const rr = new Path2D(); rr.roundRect(gx - gw, gy - gh, gw * 2, gh * 2, 3.2); cx.fill(rr);
        line([[gx - gw, gy - gh + 0.4], [gx + gw, gy - gh - 0.2]], lw, fr);
        line([[gx - gw, gy + gh], [gx + gw, gy + gh - 0.4]], lw * 0.35, fr);
        line([[gx - gw, gy - gh * 0.35], [-13, gy - gh * 0.35]], lw * 0.8, fr);
      } else if (o.glasses === 'round') {
        cx.fill(ellPath([gx, gy], 11, 11));
        cx.strokeStyle = fr; cx.lineWidth = 2.8; cx.stroke(ellPath([gx, gy], 11, 11));
        line([[gx + 11, gy - 2], [gx + 25, gy - 1]], 2.2, fr);                                      // ブリッジ側
        line([[gx - 11, gy - 2], [-13, gy - 2]], 2.2, fr);                                           // つる
      } else {
        const rr = new Path2D(); rr.roundRect(gx - gw, gy - gh, gw * 2, gh * 2, 3.6);
        cx.fill(rr); cx.strokeStyle = fr; cx.lineWidth = lw; cx.stroke(rr);
        line([[gx - gw, gy - gh * 0.35], [-13, gy - gh * 0.35]], lw * 0.8, fr);
        line([[gx + gw - 0.6, gy - gh + 1.4], [gx + gw + 2.6, gy - gh + 1.2]], lw * 0.7, fr);    // 鼻あて側の枠
      }
    }
    cx.restore();
  }

  // ---- 腕 ----
  function openHand(e, h, c3) {
    let ux = h[0] - e[0], uy = h[1] - e[1];
    const l = Math.hypot(ux, uy) || 1; ux /= l; uy /= l;
    [-0.55, -0.18, 0.18, 0.55].forEach(function (a) {
      const c = Math.cos(a), sn = Math.sin(a);
      const dx = ux * c - uy * sn, dy = ux * sn + uy * c;
      paintShape(capPath(h, [h[0] + dx * 4.8, h[1] + dy * 4.8], 1.0, 0.75), c3, { sd: 0.3, hd: 0 });
    });
    paintShape(ellPath(h, 2.5, 2.5), c3, { sd: 0.8, hd: 0.3 });
  }

  function arm(pal, o, sh, target, bend, back, open) {
    const r = I.ik(sh, target, I.ARM1, I.ARM2, bend), e = r.joint, h = r.end;
    const th = (o.thick || 1) * (o.armK || 1);
    const shirt = tri(pal, 'g', 'G', back, 'gh'), skin = tri(pal, 's', 'S', back, 'sh'), cuff = tri(pal, 'G', null, back);
    const m = function (t) { return [e[0] + (h[0] - e[0]) * t, e[1] + (h[1] - e[1]) * t]; };
    if (o.tex && texImg(o.tex, 'uarm')) {                                          // 写真のパーツ
      const up = capPath(sh, e, 3.4 * th, 3.2 * th), fo = capPath(e, h, 3.2 * th, 2.6 * th);
      paintShape(fo, shirt, { sd: 0, hd: 0 }); texFill(fo, o.tex, 'farm', e, h, 0, Math.hypot(h[0] - e[0], h[1] - e[1]), 6.2 * th, back);
      paintShape(up, shirt, { sd: 0, hd: 0 }); texFill(up, o.tex, 'uarm', sh, e, 0, Math.hypot(e[0] - sh[0], e[1] - sh[1]), 7.4 * th, back);
    } else if (o.sleeve !== undefined && o.limb) {                                  // 袖の長さを指定(0〜1=二の腕の途中まで、1〜2=ひじから先の途中まで)。そこから先は素肌
      const sl = o.sleeve;
      paintShape(limbPath([sh, e, m(0.86)], [2.9 * th, 2.6 * th, 2.2 * th], 0.3), skin, { sd: 0.7, hd: 0.3 });
      let pts, rad;
      if (sl <= 1) { pts = [sh, [sh[0] + (e[0] - sh[0]) * sl, sh[1] + (e[1] - sh[1]) * sl]]; rad = [3.3 * th, (3.3 - 0.3 * sl) * th]; }
      else { const f = Math.min(1, sl - 1); pts = [sh, e, m(f * 0.86)]; rad = [3.3 * th, 3.0 * th, (3.0 - 0.5 * f) * th]; }
      const sp = limbPath(pts, rad, o.limb, true);
      paintShape(sp, shirt, { sd: 0.9, hd: 0.4, inside: function () {
        const eu = Math.hypot(e[0] - sh[0], e[1] - sh[1]) || 1, ex1 = (e[0] - sh[0]) / eu, ey1 = (e[1] - sh[1]) / eu;
        texGrid(o, pal, sh, ex1, ey1, -ey1, ex1, eu, 4.5 * th, 3);
        const fu = Math.hypot(h[0] - e[0], h[1] - e[1]) || 1, fx1 = (h[0] - e[0]) / fu, fy1 = (h[1] - e[1]) / fu;
        texGrid(o, pal, e, fx1, fy1, -fy1, fx1, fu, 4 * th, 5);
      } });
      if (o.shoulderSoft && !back) {
        cx.save(); cx.clip(sp);
        const R = 7.2 * th, g = cx.createRadialGradient(sh[0], sh[1], 0, sh[0], sh[1], R), c = shirt.c, k = Math.min(1, o.shoulderSoft);
        const rc = rgb(c), col = function (al) { return 'rgba(' + rc[0] + ',' + rc[1] + ',' + rc[2] + ',' + (al * k).toFixed(3) + ')'; };
        g.addColorStop(0, col(1)); g.addColorStop(0.5, col(0.9)); g.addColorStop(1, col(0));
        cx.fillStyle = g; cx.fillRect(sh[0] - R, sh[1] - R, R * 2, R * 2);
        cx.restore();
      }
      const pe = pts[pts.length - 1], pq = pts[pts.length - 2], dl = Math.hypot(pe[0] - pq[0], pe[1] - pq[1]) || 1, dx = (pe[0] - pq[0]) / dl, dy = (pe[1] - pq[1]) / dl, rr = rad[rad.length - 1];
      line([[pe[0] - dy * rr, pe[1] + dx * rr], [pe[0] + dy * rr, pe[1] - dx * rr]], o.sleeveBand || 0.9, o.rolled ? (pal.gh || shirt.h) : cuff.c);      // 袖口(まくった折り返し)
    } else if (o.rolled) {
      paintShape(capPath(m(0.25), h, 2.6 * th, 2.3 * th), skin, { sd: 0.7, hd: 0.3 });                 // まくった前腕(素肌)
      paintShape(capPath(sh, m(0.28), 3.3 * th, 3.2 * th), shirt, { sd: 0.9, hd: 0.4 });               // 袖
      paintShape(capPath(m(0.16), m(0.32), 3.2 * th, 3.1 * th), cuff, { sd: 0, hd: 0 });               // まくり口
    } else if (o.limb) {                                                            // 肩〜手首をひとつながりの形で塗る(ひじにつなぎ目の丸みが出ない)
      const lp = limbPath([sh, e, m(0.86)], [3.3 * th, 3.0 * th, 2.5 * th], o.limb);
      paintShape(lp, shirt, { sd: 0.9, hd: 0.4, inside: o.texture ? function () {
        const eu = Math.hypot(e[0] - sh[0], e[1] - sh[1]) || 1, ex1 = (e[0] - sh[0]) / eu, ey1 = (e[1] - sh[1]) / eu;
        texGrid(o, pal, sh, ex1, ey1, -ey1, ex1, eu, 4.5 * th, 3);
        const fu = Math.hypot(h[0] - e[0], h[1] - e[1]) || 1, fx1 = (h[0] - e[0]) / fu, fy1 = (h[1] - e[1]) / fu;
        texGrid(o, pal, e, fx1, fy1, -fy1, fx1, fu, 4 * th, 5);
      } : undefined });
      if (o.shoulderSoft && !back) {                                                // 肩のつけ根:腕の縁の影とハイライトをぼかして胴になじませる
        cx.save(); cx.clip(lp);
        const R = 7.2 * th, g = cx.createRadialGradient(sh[0], sh[1], 0, sh[0], sh[1], R), c = shirt.c, k = Math.min(1, o.shoulderSoft);
        const rc = rgb(c), col = function (al) { return 'rgba(' + rc[0] + ',' + rc[1] + ',' + rc[2] + ',' + (al * k).toFixed(3) + ')'; };
        g.addColorStop(0, col(1)); g.addColorStop(0.5, col(0.9)); g.addColorStop(1, col(0));
        cx.fillStyle = g; cx.fillRect(sh[0] - R, sh[1] - R, R * 2, R * 2);
        cx.restore();
      }
      paintShape(capPath(m(0.72), m(0.9), 2.7 * th, 2.7 * th), cuff, { sd: 0, hd: 0 });                // カフス
    } else {
      paintShape(capPath(sh, e, 3.3 * th, 3.0 * th), shirt, { sd: 0.9, hd: 0.4 });
      paintShape(capPath(e, m(0.86), 3.0 * th, 2.5 * th), shirt, { sd: 0.9, hd: 0.4 });
      paintShape(capPath(m(0.72), m(0.9), 2.7 * th, 2.7 * th), cuff, { sd: 0, hd: 0 });                // カフス
    }
    if (o.watch) {
      const w0 = [e[0] + (h[0] - e[0]) * 0.8, e[1] + (h[1] - e[1]) * 0.8], w1 = [e[0] + (h[0] - e[0]) * 0.9, e[1] + (h[1] - e[1]) * 0.9];
      paintShape(capPath(w0, w1, 2.6, 2.6), tri(pal, 'm', null, back), { sd: 0, hd: 0 });
    }
    if (open) openHand(e, h, skin);
    else {
      paintShape(ellPath(h, 2.8, 2.7), skin, { sd: 0.8, hd: 0.3 });
      const ux = h[0] - e[0], uy = h[1] - e[1], l = Math.hypot(ux, uy) || 1;
      line([[h[0] + ux / l * 0.2 - uy / l * 1.4, h[1] + uy / l * 0.2 + ux / l * 1.4], [h[0] + ux / l * 0.2 + uy / l * 1.4, h[1] + uy / l * 0.2 - ux / l * 1.4]], 0.26, mix(pal.S, '#3a2018', 0.4));
    }
    // ひじの影
    if (!back && !o.limb) line([[e[0] - 0.9, e[1] + 0.5], [e[0] - 0.2, e[1] + 1.6]], 0.3, pal.G);
  }

  // ---- 脚と靴 ----
  function leg(pal, o, root, target, bend, back) {
    const r = I.ik(root, target, I.LEG1, I.LEG2, bend), k = r.joint, a = r.end;
    const th = o.legThick || 1;
    const pants = tri(pal, 't', 'T', back, 'th');
    const useTex = o.tex && texImg(o.tex, 'thigh');
    const tp0 = 1 - 0.24 * (o.taper || 0);                                          // 裾にむけて細くする割合
    const thP = capPath(root, k, 4.9 * th, 4.3 * th * (1 - 0.06 * (o.taper || 0))), shP = capPath(k, a, 4.3 * th * (1 - 0.06 * (o.taper || 0)), 3.5 * th * tp0);
    if (useTex) {
      paintShape(shP, pants, { sd: 0, hd: 0 }); texFill(shP, o.tex, 'shin', k, a, 0, Math.hypot(a[0] - k[0], a[1] - k[1]), 8.4 * th, back);
      paintShape(thP, pants, { sd: 0, hd: 0 }); texFill(thP, o.tex, 'thigh', root, k, 0, Math.hypot(k[0] - root[0], k[1] - root[1]), 9.8 * th, back);
    } else if (o.limb) {                                                            // 付け根〜足首をひとつながりの形で塗る(ひざにつなぎ目の丸みが出ない)
      const tk = 1 - 0.06 * (o.taper || 0), tE = o.crop || 1;
      if (tE < 1) {                                                               // 九分丈:すねの途中でズボンが終わり、足首はソックス
        const P3 = [k[0] + (a[0] - k[0]) * tE, k[1] + (a[1] - k[1]) * tE], r3 = (4.3 * tk + (3.5 * tp0 - 4.3 * tk) * tE) * th;
        const sockc = pal.sk ? tri(pal, 'sk', null, back) : tri(pal, 's', 'S', back, 'sh');
        paintShape(capPath([k[0] + (a[0] - k[0]) * (tE - 0.1), k[1] + (a[1] - k[1]) * (tE - 0.1)], a, 2.5 * th, 2.4 * th), sockc, { sd: 0.5, hd: 0.2 });
        paintShape(limbPath([root, k, P3], [4.9 * th, 4.3 * th * tk, r3], o.limb, true), pants, { sd: 1.0, hd: 0.45 });
        line([[P3[0] - (a[1] - k[1]) / (Math.hypot(a[0] - k[0], a[1] - k[1]) || 1) * r3, P3[1] + (a[0] - k[0]) / (Math.hypot(a[0] - k[0], a[1] - k[1]) || 1) * r3], [P3[0] + (a[1] - k[1]) / (Math.hypot(a[0] - k[0], a[1] - k[1]) || 1) * r3, P3[1] - (a[0] - k[0]) / (Math.hypot(a[0] - k[0], a[1] - k[1]) || 1) * r3]], 0.5, mix(pal.T || pal.t, '#000000', 0.25));   // すそ
      } else {
        paintShape(limbPath([root, k, a], [4.9 * th, 4.3 * th * tk, 3.5 * th * tp0], o.limb), pants, { sd: 1.0, hd: 0.45 });
      }
    } else {
      paintShape(thP, pants, { sd: 1.0, hd: 0.45 });
      paintShape(shP, pants, { sd: 1.0, hd: 0.45 });
    }
    if (o.pleat && !back) {                                                         // 前タックの折り目
      const dx = k[0] - root[0], dy = k[1] - root[1], dl = Math.hypot(dx, dy) || 1;
      let px = dy / dl, py = -dx / dl; if (px < 0) { px = -px; py = -py; }
      line([[root[0] + dx / dl * 1.6 + px * 1.6, root[1] + dy / dl * 1.6 + py * 1.6], [root[0] + dx / dl * dl * 0.62 + px * 1.3, root[1] + dy / dl * dl * 0.62 + py * 1.3]], 0.3, mix(pal.T || pal.t, '#000000', 0.45));
    }
    // すその折り目
    const ux = a[0] - k[0], uy = a[1] - k[1], ul = Math.hypot(ux, uy) || 1;
    line([[k[0] + ux / ul * 1.2 + uy / ul * 0.8, k[1] + uy / ul * 1.2 - ux / ul * 0.8], [a[0] - ux / ul * 1.6 + uy / ul * 0.8, a[1] - uy / ul * 1.6 - ux / ul * 0.8]], 0.26, mix(pal.T || pal.t, '#000000', 0.15));
    // 靴
    let toe;
    if (a[1] >= -4) toe = [a[0] + 6.0, a[1] + 0.3];
    else toe = [a[0] + ux / ul * 5.4, a[1] + uy / ul * 5.4];
    const heel = [a[0] - 1.3, a[1] + 0.2];
    const shoe = tri(pal, 'x', 'X', back, 'xh');
    const sk = o.shoeK || 1;
    const path = capPath(heel, toe, 3.0 * sk, 2.2 * sk);
    if (o.tex && texImg(o.tex, 'shoe')) {
      paintShape(path, shoe, { sd: 0, hd: 0 });
      texFill(path, o.tex, 'shoe', heel, toe, -0.8, Math.hypot(toe[0] - heel[0], toe[1] - heel[1]) + 1.4, 5.8, back);
      return;
    }
    paintShape(path, shoe, { sd: 0.9, hd: 0.5, inside: function () {
      if (o.shoe === 'wave') {                                                    // 波模様
        const col = back ? mix('#f2f2f2', '#0d0e1c', 0.2) : '#f2f2f2';
        for (let i = 0; i < 4; i++) {
          const x0 = heel[0] - 0.4 + i * 1.7, y0 = heel[1] - 1.0 + (toe[1] - heel[1]) * i / 4;
          line([[x0, y0], [x0 + 0.85, y0 - 0.8], [x0 + 1.7, y0]], 0.3, col);
          line([[x0 + 0.4, y0 + 1.5], [x0 + 1.25, y0 + 0.7], [x0 + 2.1, y0 + 1.5]], 0.3, col);
        }
      }
      if (o.shoe === 'derby') {                                                   // 紐つきの革靴(つや・靴ひも)
        const hl = back ? mix(pal.xh || '#666a7a', '#0d0e1c', 0.2) : (pal.xh || '#666a7a');
        line([[heel[0] + 1.3, heel[1] - 1.5], [toe[0] - 1.5, toe[1] - 1.5]], 0.55, hl);
        for (let i = 0; i < 3; i++) { const x0 = heel[0] + 1.6 + i * 0.95; line([[x0, heel[1] - 2.0], [x0 + 0.7, heel[1] - 1.0]], 0.22, hl); }
      }
      if (o.shoe === 'zebra') {                                                   // ゼブラ柄のソックス
        const col = back ? mix('#15151c', '#0d0e1c', 0.2) : '#15151c';
        for (let i = 0; i < 5; i++) { const x0 = heel[0] - 1.2 + i * 1.5; line([[x0, heel[1] - 2.6], [x0 + 1.3, heel[1] + 1.8]], 0.6, col); }
      }
      if (o.shoe === 'sneaker') {                                                // ソール
        line([[heel[0] - 0.4, heel[1] + 2.0], [toe[0] + 0.4, toe[1] + 1.7]], 0.9, back ? mix('#ffffff', '#0d0e1c', 0.2) : '#ffffff');
      }
    } });
  }

  // ---- 胴・服 ----
  function torso(pal, o, chest, hip, hd) {
    const th = o.thick || 1;
    const rc = 6.6 * th * (o.chestK || 1), rh = 6.0 * th;                         // rc:胸の半径 rh:腰(ズボン)の半径
    const rs = rh * (o.waist || 1);                                                 // rs:シャツのウエストの半径(小さいほど絞られる)
    const waist = [chest[0] + (hip[0] - chest[0]) * 0.72, chest[1] + (hip[1] - chest[1]) * 0.72];
    let ux = hip[0] - chest[0], uy = hip[1] - chest[1];
    const len = Math.hypot(ux, uy) || 1; ux /= len; uy /= len;
    const nx = uy, ny = -ux;                                                      // 体の前側
    const skin = tri(pal, 's', 'S', false, 'sh');
    const T0 = [chest[0] + nx * rc * 0.55 - ux * 2.2 + 0.5, chest[1] + ny * rc * 0.55 - uy * 2.2];     // 襟もとの位置
    // 首
    paintShape(capPath([chest[0] + 1, chest[1] - 5], [hd[0] - 0.5, hd[1] + 2], 2.5, 2.5), skin, { sd: 0.8, hd: 0.2 });
    // ベルトの位置と、腰まわり(スラックス)
    const B = [chest[0] + (hip[0] - chest[0]) * 0.77, chest[1] + (hip[1] - chest[1]) * 0.77];
    const wb = rs * 1.06 + 0.3;                                                     // tuck:ウエストバンドの半幅
    const drawPants = function () {
      const pc = tri(pal, 't', 'T', false, 'th');
      if (!o.tuck) { paintShape(capPath(waist, hip, rh + 0.2, rh), pc, { sd: 1.1, hd: 0.5 }); return; }
      // シャツを入れた腰:ベルトの高さで横にまっすぐ切れ、腰骨に向かってなだらかに広がる(丸いこぶを作らない)
      const dBH = Math.hypot(hip[0] - B[0], hip[1] - B[1]), rr = rh * 1.04;
      const wAt = function (t) { return wb + (rr - wb) * Math.pow(t, 0.7); };
      const pts = [[B[0] - ux * 0.5 - nx * wb, B[1] - uy * 0.5 - ny * wb], [B[0] - ux * 0.5 + nx * wb, B[1] - uy * 0.5 + ny * wb]];
      for (let q = 1; q <= 6; q++) { const t = q / 6; pts.push([B[0] + ux * dBH * t + nx * wAt(t), B[1] + uy * dBH * t + ny * wAt(t)]); }
      const th0 = Math.atan2(ny, nx);                                               // 前側(n)→下(u)→後ろ側(-n)と回る
      for (let q = 1; q < 10; q++) { const a = th0 + Math.PI * q / 10, rq = rr * (1 - 0.1 * q / 10); pts.push([hip[0] + Math.cos(a) * rq, hip[1] + Math.sin(a) * rq]); }   // 後ろ側はややすっきり
      for (let q = 6; q >= 1; q--) { const t = q / 6; pts.push([B[0] + ux * dBH * t - nx * wAt(t) * 0.9, B[1] + uy * dBH * t - ny * wAt(t) * 0.9]); }
      paintShape(polyPath(pts), pc, { sd: 1.1, hd: 0.5 });
    };
    if (!o.tuck) drawPants();
    // 胴(シャツ。ズボンの中に入れる)
    const shirtEnd = o.tuck ? [B[0] + ux * 0.8, B[1] + uy * 0.8] : [waist[0] - ux * (rh - 0.6), waist[1] - uy * (rh - 0.6)];
    const shirt = tri(pal, 'g', 'G', false, 'gh');
    const hemP = o.hem === 'flat' ? [chest[0] + (hip[0] - chest[0]) * (o.hemAt || 0.93), chest[1] + (hip[1] - chest[1]) * (o.hemAt || 0.93)] : null;
    const rE = rh * (o.waist || 1) * (o.hemK || 1);                                  // すそ(平らに切るとき)の半径
    const tp = hemP ? limbPath([chest, hemP], [rc, rE], 0, true) : capPath(chest, shirtEnd, rc, rs);
    if (o.tex && texImg(o.tex, 'torso')) {                                         // 写真の胴(襟〜ベルト)をそのまま貼る
      paintShape(tp, shirt, { sd: 0, hd: 0 });
      texFill(tp, o.tex, 'torso', [chest[0] - ux * 5.5, chest[1] - uy * 5.5], hip, 0, len * 0.77 + 5.5 + 0.8, 13.2 * th, false);
      return;
    }
    paintShape(tp, shirt, { sd: 1.4, hd: 0.6, inside: function () {
      texGrid(o, pal, [chest[0] - ux * 5, chest[1] - uy * 5], ux, uy, nx, ny, len + 5, rc * 1.15, 1);
      if (o.stripe) {                                                              // 縦縞
        cx.strokeStyle = pal.G; cx.globalAlpha = 0.5; cx.lineWidth = 0.22;
        for (let i = -5; i <= 5; i++) {
          const ox = nx * i * 1.15, oy = ny * i * 1.15;
          cx.beginPath(); cx.moveTo(chest[0] + ox, chest[1] + oy - 4); cx.lineTo(waist[0] + ox, waist[1] + oy); cx.stroke();
        }
        cx.globalAlpha = 1;
      }
      if (o.wrinkles) {                                                            // ベルトまわりのしわ
        const bw0 = [chest[0] + (hip[0] - chest[0]) * 0.6, chest[1] + (hip[1] - chest[1]) * 0.6];
        for (let i = 0; i < 3; i++) {
          const sx = bw0[0] + nx * (1.2 + i * 1.3) - ux * 0.2, sy = bw0[1] + ny * (1.2 + i * 1.3) - uy * 0.2;
          line([[sx, sy], [sx - nx * 1.4 + ux * 2.2, sy - ny * 1.4 + uy * 2.2]], 0.3, pal.G);
        }
      }
    } });
    if (hemP && o.hemRib) {                                                          // すそのリブ(セーター)
      const hb = [hemP[0] - ux * 0.5, hemP[1] - uy * 0.5];
      line([[hb[0] - nx * rE * 0.96, hb[1] - ny * rE * 0.96], [hb[0] + nx * rE * 0.96, hb[1] + ny * rE * 0.96]], 1.1, pal.G);
    }
    if (o.vneck) {                                                                 // Vネック(素肌が見える)
      const A = [T0[0] + nx * 0.8 - ux * 0.4, T0[1] + ny * 0.8 - uy * 0.4], Bk = [T0[0] - nx * 2.9 - ux * 0.2, T0[1] - ny * 2.9 - uy * 0.2], C = [T0[0] + ux * (o.vneckD || 6.6) - nx * 0.7, T0[1] + uy * (o.vneckD || 6.6) - ny * 0.7];
      paintShape(polyPath([A, Bk, C]), skin, { sd: 0.4, hd: 0 });
      line([A, C], 0.55, pal.G); line([Bk, C], 0.55, pal.G);
    }
    if (o.jacket && pal.i) {                                                       // ジャケットの前あき(中のトップスが見える)
      const hemE = hemP || shirtEnd, Tt = [chest[0] - ux * 3.4, chest[1] - uy * 3.4];
      const pa = [Tt[0] + nx * rc * 0.8, Tt[1] + ny * rc * 0.8], pb = [hemE[0] + nx * rE * 0.8, hemE[1] + ny * rE * 0.8];
      const qa = [Tt[0] + nx * rc * 0.4, Tt[1] + ny * rc * 0.4], qb = [hemE[0] + nx * rE * 0.4, hemE[1] + ny * rE * 0.4];
      const jf = o.jacketV === undefined ? 1 : o.jacketV, Mf = [pa[0] + (pb[0] - pa[0]) * jf, pa[1] + (pb[1] - pa[1]) * jf];
      if (jf >= 1) { paintShape(polyPath([qa, pa, pb, qb]), tri(pal, 'i', null, false), { sd: 0.3, hd: 0 }); line([pa, pb], 0.5, pal.G); line([qa, qb], 0.35, pal.G); }
      else { paintShape(polyPath([qa, pa, Mf]), tri(pal, 'i', null, false), { sd: 0.3, hd: 0 }); line([pa, pb], 0.5, pal.G); line([qa, Mf], 0.35, pal.G); }   // 黒いニットはV字(下ほど細い)
    }
    if (o.belly) {                                                                 // おなかのふくらみ
      const bc = [chest[0] + (hip[0] - chest[0]) * 0.66 + nx * rs * 0.5 * o.belly, chest[1] + (hip[1] - chest[1]) * 0.66 + ny * rs * 0.5 * o.belly];
      paintShape(ellPath(bc, rs * 0.62, rs * 0.82, Math.atan2(uy, ux) - Math.PI / 2 + 0), shirt, { sd: 1.0, hd: 0.4 });
    }
    if (o.tuck) drawPants();
    // ベルト
    const bwid = o.tuck ? wb : Math.max(rs, rh * 0.9) * 1.0 + (o.belly ? 0.8 : 0);
    const belt = polyPath([[B[0] - nx * bwid - ux * 0.55, B[1] - ny * bwid - uy * 0.55], [B[0] + nx * bwid - ux * 0.55, B[1] + ny * bwid - uy * 0.55], [B[0] + nx * bwid + ux * 0.55, B[1] + ny * bwid + uy * 0.55], [B[0] - nx * bwid + ux * 0.55, B[1] - ny * bwid + uy * 0.55]]);
    if (o.belt !== false) paintShape(belt, tri(pal, 'b', null, false), { sd: 0, hd: 0 });
    if (o.belt !== false) paintShape(polyPath([[B[0] + nx * bwid * 0.35 - ux * 0.7, B[1] + ny * bwid * 0.35 - uy * 0.7], [B[0] + nx * bwid * 0.68 - ux * 0.7, B[1] + ny * bwid * 0.68 - uy * 0.7], [B[0] + nx * bwid * 0.68 + ux * 0.7, B[1] + ny * bwid * 0.68 + uy * 0.7], [B[0] + nx * bwid * 0.35 + ux * 0.7, B[1] + ny * bwid * 0.35 + uy * 0.7]]), tri(pal, 'm', null, false), { sd: 0, hd: 0 });
    if (o.tuck) {                                                                   // ベルトの上にシャツが少しかぶさる(ズボンに入れたときのたるみ)
      const sc = tri(pal, 'g', 'G', false, 'gh');
      const bl = new Path2D();
      const p0 = [B[0] - ux * 3.2 + nx * (wb - 0.6), B[1] - uy * 3.2 + ny * (wb - 0.6)], p1 = [B[0] - ux * 0.55 + nx * (wb + 0.9), B[1] - uy * 0.55 + ny * (wb + 0.9)];
      const p2 = [B[0] + ux * 0.05 + nx * (wb - 1.0), B[1] + uy * 0.05 + ny * (wb - 1.0)], p3 = [B[0] - ux * 1.2 + nx * (wb - 2.6), B[1] - uy * 1.2 + ny * (wb - 2.6)];
      bl.moveTo(p0[0], p0[1]); bl.quadraticCurveTo(B[0] - ux * 1.6 + nx * (wb + 1.2), B[1] - uy * 1.6 + ny * (wb + 1.2), p1[0], p1[1]);
      bl.quadraticCurveTo(B[0] - ux * 0.1 + nx * (wb + 0.4), B[1] - uy * 0.1 + ny * (wb + 0.4), p2[0], p2[1]); bl.lineTo(p3[0], p3[1]); bl.closePath();
      paintShape(bl, sc, { sd: 0.5, hd: 0.3 });
      line([[p1[0] - nx * 0.4 - ux * 0.2, p1[1] - ny * 0.4 - uy * 0.2], [p2[0] - nx * 0.6 - ux * 0.3, p2[1] - ny * 0.6 - uy * 0.3]], 0.25, pal.G);
    }
    // 襟
    if (o.collar !== false) {
      const w = tri(pal, 'w', null, false);
      paintShape(polyPath([[T0[0] - ux * 1.2 - nx * 2.6, T0[1] - uy * 1.2 - ny * 2.6], [T0[0] - ux * 1.2 + nx * 2.0, T0[1] - uy * 1.2 + ny * 2.0], [T0[0] + ux * 2.6 + nx * 1.4, T0[1] + uy * 2.6 + ny * 1.4]]), w, { sd: 0.3, hd: 0 });
      paintShape(polyPath([[T0[0] - ux * 1.2 - nx * 2.6, T0[1] - uy * 1.2 - ny * 2.6], [T0[0] + ux * 2.4 - nx * 0.6, T0[1] + uy * 2.4 - ny * 0.6], [T0[0] + ux * 1.4 - nx * 2.8, T0[1] + uy * 1.4 - ny * 2.8]]), w, { sd: 0.3, hd: 0 });
    }
    // ネクタイ
    if (o.tie) {
      const tc = tri(pal, 'n', 'N', false);
      const tipL = len * 0.66;
      const P0 = [T0[0] + ux * 1.0, T0[1] + uy * 1.0];
      const tie = polyPath([[P0[0] - nx * 0.9, P0[1] - ny * 0.9], [P0[0] + nx * 0.9, P0[1] + ny * 0.9],
        [P0[0] + ux * 3 + nx * 1.5, P0[1] + uy * 3 + ny * 1.5], [P0[0] + ux * (tipL - 1) + nx * 2.2, P0[1] + uy * (tipL - 1) + ny * 2.2],
        [P0[0] + ux * tipL + nx * 0.1, P0[1] + uy * tipL + ny * 0.1], [P0[0] + ux * (tipL - 1) - nx * 2.2, P0[1] + uy * (tipL - 1) - ny * 2.2],
        [P0[0] + ux * 3 - nx * 1.5, P0[1] + uy * 3 - ny * 1.5]]);
      paintShape(tie, tc, { sd: 0.5, hd: 0.3, inside: function () {
        if (o.tieStripe && o.tieDiag) {                                            // 斜めの細いストライプ
          cx.strokeStyle = pal.N; cx.lineWidth = o.tieStripeW || 0.4;
          for (let i = 0; i < 8; i++) {
            const q = [P0[0] + ux * (3.0 + i * 2.3), P0[1] + uy * (3.0 + i * 2.3)];
            cx.beginPath(); cx.moveTo(q[0] - nx * 3 + ux * 2.2, q[1] - ny * 3 + uy * 2.2); cx.lineTo(q[0] + nx * 3 - ux * 2.2, q[1] + ny * 3 - uy * 2.2); cx.stroke();
          }
        } else if (o.tieStripe) {
          cx.strokeStyle = pal.N; cx.lineWidth = o.tieStripeW || 0.55;
          for (let i = 0; i < 7; i++) {
            const q = [P0[0] + ux * (3.4 + i * 2.1), P0[1] + uy * (3.4 + i * 2.1)];
            cx.beginPath(); cx.moveTo(q[0] - nx * 3 + ux * -0.8, q[1] - ny * 3 - uy * 0.8); cx.lineTo(q[0] + nx * 3 + ux * 0.8, q[1] + ny * 3 + uy * 0.8); cx.stroke();
          }
        }
      } });
      if (pal.p) line([[P0[0] + ux * (tipL - 1.5) - nx * 2.0, P0[1] + uy * (tipL - 1.5) - ny * 2.0], [P0[0] + ux * (tipL - 1.5) + nx * 2.0, P0[1] + uy * (tipL - 1.5) + ny * 2.0]], 0.55, pal.p);   // 剣先の縁取り
      if (o.tieClip) line([[P0[0] + ux * tipL * 0.46 - nx * 1.7, P0[1] + uy * tipL * 0.46 - ny * 1.7], [P0[0] + ux * tipL * 0.46 + nx * 1.7, P0[1] + uy * tipL * 0.46 + ny * 1.7]], 0.5, '#dfe3ec');   // タイピン
      paintShape(ellPath([P0[0] + ux * 0.4, P0[1] + uy * 0.4], 1.5, 1.2, Math.atan2(uy, ux)), tc, { sd: 0.4, hd: 0.3 });   // 結び目
    }
    // ネームストラップと社員証
    if (o.lanyard) {
      const C = [chest[0] + ux * len * 0.6 + nx * rc * 0.66, chest[1] + uy * len * 0.6 + ny * rc * 0.66];
      const lc = pal.a || '#d0302f';
      line([[T0[0] - ux * 0.6 - nx * 2.2, T0[1] - uy * 0.6 - ny * 2.2], [C[0], C[1] - 1]], 0.55, lc);
      line([[T0[0] - ux * 0.4 + nx * 1.5, T0[1] - uy * 0.4 + ny * 1.5], [C[0], C[1] - 1]], 0.55, lc);
      paintShape(polyPath([[C[0] - 1.5, C[1] - 0.5], [C[0] + 1.5, C[1] - 0.5], [C[0] + 1.5, C[1] + 3.6], [C[0] - 1.5, C[1] + 3.6]]), tri(pal, 'w', null, false), { sd: 0.3, hd: 0 });
      cx.fillStyle = pal.q || '#3b5fb0'; cx.fillRect(C[0] - 1.1, C[1] + 0.2, 2.2, 0.9);
    }
    if (o.pocket) {                                                                // 胸ポケットとスマホ
      const Pk = [chest[0] + ux * 4.4 + nx * rc * 0.55, chest[1] + uy * 4.4 + ny * rc * 0.55];
      line([[Pk[0] - 1.6, Pk[1]], [Pk[0] - 1.6, Pk[1] + 4], [Pk[0] + 1.6, Pk[1] + 4], [Pk[0] + 1.6, Pk[1]]], 0.28, pal.G);
      paintShape(polyPath([[Pk[0] - 0.9, Pk[1] - 0.6], [Pk[0] + 0.9, Pk[1] - 0.6], [Pk[0] + 0.9, Pk[1] + 1.5], [Pk[0] - 0.9, Pk[1] + 1.5]]), { c: '#3a3d48', s: '#2a2c35', h: '#555867' }, { sd: 0, hd: 0.3 });
    }
  }

  function paint(p, pal, o) {
    o = o || {};
    SOFT = o.soften || 0;
    if (!cv) { cv = document.createElement('canvas'); cv.width = I.W * SS; cv.height = I.H * SS; cx = cv.getContext('2d', { willReadFrequently: true }); }
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height);
    cx.setTransform(RES * SS, 0, 0, RES * SS, I.OX * SS, I.OY * SS);
    const d = p.d || {};
    const hipF = [p.hip[0] + 1.8, p.hip[1]], hipB = [p.hip[0] - 1.8, p.hip[1]];
    const shF = p.shF || [p.chest[0] + 2.2, p.chest[1] - 3.4], shB = p.shB || [p.chest[0] - 2.2, p.chest[1] - 3.4];
    if (!o.hairOverTorso) headBack(pal, o, p.head);
    leg(pal, o, hipB, p.ankleB, p.bendB, true);
    leg(pal, o, hipF, p.ankleF, p.bendF, false);
    if (o.armBehind) arm(pal, o, shB, p.handB, p.armBendB, true, d.oB);          // 奥の腕を胴の後ろに回す(胴に隠れる。二重に見えない)
    torso(pal, o, p.chest, p.hip, p.head);
    if (o.hairOverTorso) headBack(pal, o, p.head);                                   // 背中側の髪を、胴体の手前(背中側の胴体をおおう)に描く
    if (!o.armBehind) arm(pal, o, shB, p.handB, p.armBendB, true, d.oB);
    head(pal, o, p.head, d.f, p);
    arm(pal, o, shF, p.handF, p.armBendF, false, d.oF);
    hairFront(pal, o, p.head);
    // ドットにする(1ドット = SS×SS の中の過半数が埋まっていれば塗る)
    const R = I.createRaster(pal);
    const data = cx.getImageData(0, 0, cv.width, cv.height).data, Wd = cv.width;
    for (let y = 0; y < I.H; y++) {
      for (let x = 0; x < I.W; x++) {
        let n = 0, cen = -1, any = -1;
        for (let j = 0; j < SS; j++) for (let i = 0; i < SS; i++) {
          const idx = ((y * SS + j) * Wd + x * SS + i) * 4;
          if (data[idx + 3] >= 128) { n++; any = idx; if (i === 1 && j === 1) cen = idx; }
        }
        if (n * 2 > SS * SS) { const q = cen >= 0 ? cen : any; R.rawPut(x, y, [data[q], data[q + 1], data[q + 2]]); }
      }
    }
    I.drawFx(R, p, d.fx);
    return R.toCanvas(o.outline);
  }

  Game.Data.VecPaint = { paint: paint };
})();
