#!/usr/bin/env python3
"""自動生成の絵(look)を、スプライトシート(PNG + 切り出し定義)に書き出す。
画像の見た目を作るときの「見本」と、手描きの絵に差し替える前の下書きに使う。

使い方(ゲームのフォルダで):
    pip install playwright && playwright install chromium
    python3 tools/export_sheet.py hero hero_sheet

  1つ目の引数 = 書き出す元の見た目(js/data/palettes.js の Game.Data.Looks のキー)
  2つ目の引数 = 書き出す名前(assets/<名前>_1p.png / _2p.png / <名前>.data.js ができる)
"""
import base64, os, re, shutil, sys, tempfile, json
from playwright.sync_api import sync_playwright

look = sys.argv[1] if len(sys.argv) > 1 else 'hero'
name = sys.argv[2] if len(sys.argv) > 2 else 'hero_sheet'
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SCALE = 2        # 絵の細かさ(pixelScale)。1単位あたり絵のドット何個か = artScale

tmp = tempfile.mkdtemp()
dst = os.path.join(tmp, 'g')
shutil.copytree(root, dst)
cfg = os.path.join(dst, 'js/config/display.config.js')
s = open(cfg, encoding='utf-8').read()
open(cfg, 'w', encoding='utf-8').write(re.sub(r'pixelScale:\s*\d+', 'pixelScale: %d' % SCALE, s))

JS = """([look]) => {
  const S = Game.Data.Sprites, L = S.list(), names = Object.keys(L);
  const cell = 64 * S.scale, cols = 12;
  const total = names.reduce((n, k) => n + L[k], 0);
  const rows = Math.ceil(total / cols);
  const res = { frames: {}, images: [], cell: cell, ox: S.originX, oy: S.originY };
  const nPal = Game.Data.Looks[look].palettes.length;
  for (let p = 0; p < nPal; p++) {
    const cv = document.createElement('canvas'); cv.width = cell * cols; cv.height = cell * rows;
    const cx = cv.getContext('2d'); let i = 0;
    names.forEach(n => { for (let f = 0; f < L[n]; f++, i++) {
      const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
      const im = S.get(n, f, p, look); cx.drawImage(im, x + S.originX - im.originX, y + S.originY - im.originY);
      if (p === 0) (res.frames[n] = res.frames[n] || []).push({ x: x, y: y, w: cell, h: cell, ox: S.originX, oy: S.originY });
    } });
    res.images.push(cv.toDataURL('image/png'));
  }
  return res;
}"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.goto('file://' + dst + '/index.html'); pg.wait_for_timeout(1500)
    r = pg.evaluate(JS, [look])
    b.close()

os.makedirs(os.path.join(root, 'assets'), exist_ok=True)
files = []
for i, d in enumerate(r['images']):
    fn = '%s_%dp.png' % (name, i + 1)
    open(os.path.join(root, 'assets', fn), 'wb').write(base64.b64decode(d.split(',')[1]))
    files.append('assets/' + fn)
data = {'image': files, 'artScale': SCALE, 'frames': r['frames']}
js = "// スプライトシートの定義(tools/export_sheet.py が書き出した)。形式の説明は assets/README.md\nGame.Data.Sheets.%s = %s;\n" % (name, json.dumps(data, ensure_ascii=False, separators=(',', ':')))
open(os.path.join(root, 'assets', name + '.data.js'), 'w', encoding='utf-8').write(js)
shutil.rmtree(tmp)
print('書き出し:', files, '→ assets/%s.data.js' % name, '(%d ポーズ)' % len(r['frames']))
