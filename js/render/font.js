// 3x5ドットの小さな文字。英大文字・数字・一部の記号のみ。
// ブラウザのフォントに頼らず、ドット絵の画面にそのまま描けるようにするため。
(function () {
  'use strict';

  const G = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'],
    C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
    E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
    G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
    I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..#', '..#', '..#', '#.#', '.#.'],
    K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
    M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'],
    O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'],
    Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
    S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
    U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '.#.', '.#.'],
    W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
    Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
    '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'],
    '2': ['##.', '..#', '.#.', '#..', '###'], '3': ['##.', '..#', '.#.', '..#', '##.'],
    '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '##.', '..#', '##.'],
    '6': ['.##', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'],
    '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '##.'],
    '-': ['...', '...', '###', '...', '...'], '!': ['.#.', '.#.', '.#.', '...', '.#.'],
    ':': ['...', '.#.', '...', '.#.', '...'], ' ': ['...', '...', '...', '...', '...']
  };

  // 細かい描画のための処理:3x5の元の形を「Scale2x」(角を丸める拡大)で2回拡大し、斜めの線をなめらかにする。
  // 元の形は上下左右に1マスの余白をつけて拡大する(角が外側へ少しはみ出すため)。
  const FINE = 4;                        // 拡大の倍率(2回のScale2xで4倍)
  const fineCache = {};

  function epx(g) {
    const h = g.length, w = g[0].length;
    const at = function (x, y) { return (x < 0 || y < 0 || x >= w || y >= h) ? 0 : g[y][x]; };
    const out = [];
    for (let y = 0; y < h * 2; y++) out.push(new Array(w * 2).fill(0));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = at(x, y), a = at(x, y - 1), b = at(x + 1, y), c = at(x - 1, y), d = at(x, y + 1);
        let e1 = p, e2 = p, e3 = p, e4 = p;
        if (c === a && c !== d && a !== b) e1 = a;
        if (a === b && a !== c && b !== d) e2 = b;
        if (d === c && d !== b && c !== a) e3 = c;
        if (b === d && b !== a && d !== c) e4 = d;
        out[y * 2][x * 2] = e1; out[y * 2][x * 2 + 1] = e2;
        out[y * 2 + 1][x * 2] = e3; out[y * 2 + 1][x * 2 + 1] = e4;
      }
    }
    return out;
  }

  // 1文字ぶんの細かい形:横に連続するマスをまとめた {y, x, w} の一覧(余白ぶんの座標のずれを含む)
  function fineRuns(ch) {
    if (fineCache[ch]) return fineCache[ch];
    const g = G[ch] || G[' '];
    let grid = [new Array(g[0].length + 2).fill(0)];
    g.forEach(function (row) {
      grid.push([0].concat(row.split('').map(function (c) { return c === '#' ? 1 : 0; })).concat([0]));
    });
    grid.push(new Array(g[0].length + 2).fill(0));
    grid = epx(epx(grid));
    const runs = [];
    grid.forEach(function (row, y) {
      let x = 0;
      while (x < row.length) {
        if (!row[x]) { x++; continue; }
        let x2 = x;
        while (x2 < row.length && row[x2]) x2++;
        runs.push({ y: y - FINE, x: x - FINE, w: x2 - x });     // 余白1マス(=FINE個)ぶん戻す
        x = x2;
      }
    });
    return (fineCache[ch] = runs);
  }

  function measure(text, scale) {
    return text.length * 4 * scale - scale;           // 文字幅3 + 字間1
  }

  function drawPlain(ctx, text, x, y, scale, color) {
    ctx.fillStyle = color;
    const u = scale / FINE;                                   // 細かい1マスの大きさ
    const R = Math.max(1, Math.round(Game.Config.display.pixelScale || 1));
    const snap = function (v) { return Math.round(v * R) / R; };  // 画面のドットの境目にそろえる(すき間・ずれ防止)
    for (let i = 0; i < text.length; i++) {
      const runs = fineRuns(text[i]);
      const ox = x + i * 4 * scale;
      for (let k = 0; k < runs.length; k++) {
        const r = runs[k];
        const x0 = snap(ox + r.x * u), x1 = snap(ox + (r.x + r.w) * u);
        const y0 = snap(y + r.y * u), y1 = snap(y + (r.y + 1) * u);
        if (x1 > x0 && y1 > y0) ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
    }
  }

  // align: 'left' | 'center' | 'right'。outline を渡すと縁取りする
  function draw(ctx, text, x, y, scale, color, align, outline) {
    const w = measure(text, scale);
    const left = align === 'center' ? Math.round((x - w / 2) * 4) / 4 : (align === 'right' ? x - w : x);
    if (outline) {
      const R = Math.max(1, Math.round(Game.Config.display.pixelScale || 1));
      const o = Math.round(Math.max(0.5, scale * 0.4) * R) / R;     // 縁取りの太さ(細かい1マスの単位に丸める)
      [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, -o], [-o, o], [o, o]].forEach(function (d) {
        drawPlain(ctx, text, left + d[0], y + d[1], scale, outline);
      });
    }
    drawPlain(ctx, text, left, y, scale, color);
  }

  Game.Render.Font = { draw: draw, measure: measure };
})();
