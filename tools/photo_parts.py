#!/usr/bin/env python3
"""写真から、体のパーツのドット絵(assets/parts_<名前>.data.js)を作る。
使い方: python3 tools/photo_parts.py 設定.json
設定の例は tools/parts_takahashi.json。
  sources : 名前 → 切り抜きPNG(rembg の出力。背景が透明)
  parts   : 各パーツ { src, bbox:[x0,y0,x1,y1], size:[幅,高さ](ドット), flip, rot, flip2, fix:[[x0,y0,x1,y1],...], ellipse }
            flip = 左右反転(写真の人物が左向きのとき)  rot = 反時計回りに90度回す回数(骨の向きを下向きにそろえる)
            flip2 = 回したあとの左右反転  fix = 写真の中の邪魔な部分(手など)を周りの色で埋める範囲  ellipse = 四隅を丸く落とす(頭)
  骨の向き: パーツは「上 = 付け根、下 = 先」にそろえて保存する(胴は上=襟、下=ベルト。靴は上=かかと、下=つま先)
  colors  : 全パーツで共通の色数
"""
import sys, json, os
import numpy as np
from PIL import Image, ImageDraw, ImageChops, ImageEnhance
import cv2

spec = json.load(open(sys.argv[1], encoding='utf-8'))
base = os.path.dirname(os.path.abspath(sys.argv[1]))
srcs = {k: Image.open(os.path.join(base, v) if not os.path.isabs(v) else v).convert('RGBA') for k, v in spec['sources'].items()}
NC = spec.get('colors', 32)

# 邪魔な部分を埋める
for k in list(srcs):
    fixes = [f for p in spec['parts'].values() if p['src'] == k for f in p.get('fix', [])]
    if fixes:
        arr = np.array(srcs[k]); rgb = np.ascontiguousarray(arr[:, :, :3]); m = np.zeros(arr.shape[:2], np.uint8)
        for (x0, y0, x1, y1) in fixes: m[y0:y1, x0:x1] = 255
        rgb = cv2.inpaint(rgb, m, 9, cv2.INPAINT_TELEA)
        arr[:, :, :3] = rgb; arr[:, :, 3] = np.where(m > 0, 255, arr[:, :, 3]).astype(np.uint8)
        srcs[k] = Image.fromarray(arr)

tiles = {}
for name, p in spec['parts'].items():
    im = srcs[p['src']].crop(tuple(p['bbox']))
    if p.get('ellipse'):
        m = Image.new('L', im.size, 0)
        ImageDraw.Draw(m).ellipse((0, 0, im.size[0] - 1, im.size[1] * 0.98), fill=255)
        im.putalpha(ImageChops.multiply(im.split()[3], m))
    if p.get('flip'): im = im.transpose(Image.FLIP_LEFT_RIGHT)
    for _ in range(p.get('rot', 0)): im = im.transpose(Image.ROTATE_90)
    if p.get('flip2'): im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im = im.resize(tuple(p['size']), Image.BOX)
    tiles[name] = im

# 共通の色(全パーツをまとめて減色)
rgbs = [ImageEnhance.Contrast(ImageEnhance.Color(t.convert('RGB')).enhance(1.12)).enhance(1.1) for t in tiles.values()]
W = sum(t.size[0] for t in rgbs); H = max(t.size[1] for t in rgbs)
sheet = Image.new('RGB', (W, H)); x = 0
for t in rgbs: sheet.paste(t, (x, 0)); x += t.size[0]
q = sheet.quantize(colors=NC, method=Image.MEDIANCUT, dither=Image.NONE)
pal = q.getpalette()[:NC * 3]
cols = ['#%02x%02x%02x' % tuple(pal[i * 3:i * 3 + 3]) for i in range(NC)]
ids = '0123456789abcdefghijklmnopqrstuv'
out = {'pal': cols, 'parts': {}}
x = 0
for name, t in tiles.items():
    w, h = t.size
    qp = q.crop((x, 0, x + w, h)).load(); ap = t.split()[3].point(lambda v: 255 if v >= 140 else 0).load(); x += w
    out['parts'][name] = {'w': w, 'h': h, 'rows': [''.join(ids[qp[xx, yy]] if ap[xx, yy] else '.' for xx in range(w)) for yy in range(h)]}
dst = os.path.join(base, '..', 'assets', 'parts_%s.data.js' % spec['name'])
open(dst, 'w', encoding='utf-8').write('// 写真から作った体のパーツ(tools/photo_parts.py)\nGame.Data.PartTex = Game.Data.PartTex || {};\nGame.Data.PartTex.%s = %s;\n' % (spec['name'], json.dumps(out, ensure_ascii=False)))
print(os.path.normpath(dst), {k: v.size for k, v in tiles.items()})
