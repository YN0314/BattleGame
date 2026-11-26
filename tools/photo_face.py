#!/usr/bin/env python3
"""写真(人物を切り抜いたPNG)の頭の部分を、ドット絵の顔(assets/face_<名前>.data.js)にする。
使い方: python3 tools/photo_face.py 切り抜き.png 名前 x0 y0 x1 y1 [--w 44] [--colors 16] [--flip]
  x0 y0 x1 y1 = 頭(髪の上端〜あご)を囲む長方形(切り抜き画像の座標)。楕円で四隅を落とす。
  --flip = 左右反転(写真の人物が左向きのとき。ゲームは右向きの絵を使う)
切り抜きは rembg で作れる:  rembg i 元.jpg 切り抜き.png -m u2net_human_seg
"""
import sys, json, os
from PIL import Image, ImageDraw, ImageEnhance
a = sys.argv[1:]
src, name = a[0], a[1]
x0, y0, x1, y1 = map(int, a[2:6])
W = int(a[a.index('--w') + 1]) if '--w' in a else 44
NC = int(a[a.index('--colors') + 1]) if '--colors' in a else 16
flip = '--flip' in a
im = Image.open(src).convert('RGBA').crop((x0, y0, x1, y1))
# 四隅(首・手・服)を落とす楕円マスク
m = Image.new('L', im.size, 0)
ImageDraw.Draw(m).ellipse((0, 0, im.size[0] - 1, im.size[1] * 0.98), fill=255)
al = im.split()[3]
from PIL import ImageChops
im.putalpha(ImageChops.multiply(al, m))
if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
h = round(W * im.size[1] / im.size[0])
im = im.resize((W, h), Image.BOX)
rgb = ImageEnhance.Contrast(ImageEnhance.Color(im.convert('RGB')).enhance(1.15)).enhance(1.12)
alpha = im.split()[3].point(lambda v: 255 if v >= 140 else 0)
q = rgb.quantize(colors=NC, method=Image.MEDIANCUT, dither=Image.NONE)
pal = q.getpalette()[:NC * 3]
cols = ['#%02x%02x%02x' % tuple(pal[i * 3:i * 3 + 3]) for i in range(NC)]
px, ap = q.load(), alpha.load()
chars = '0123456789abcdefghij'
rows = [''.join(chars[px[x, y]] if ap[x, y] else '.' for x in range(W)) for y in range(h)]
out = {'w': W, 'h': h, 'pal': cols, 'rows': rows}
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'face_%s.data.js' % name)
open(dst, 'w', encoding='utf-8').write('// 写真から作った顔(tools/photo_face.py)\nGame.Data.Faces = Game.Data.Faces || {};\nGame.Data.Faces.%s = %s;\n' % (name, json.dumps(out, ensure_ascii=False)))
print(dst, W, h)
