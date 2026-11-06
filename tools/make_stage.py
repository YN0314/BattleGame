#!/usr/bin/env python3
"""写真からステージ背景(ドット絵風の画像)を作る。
使い方: python tools/make_stage.py 写真.png assets/stage_ikebukuro.png [--colors 48] [--crop-top 0.157]
  - 写真の下のほうが地面になるように、上から crop-top の割合だけ切り落として 412:224 に合わせる
  - ゲームの1単位 = 絵の2ドット(824x448)に縮小し、色数を減らしてドット絵風にする
"""
import sys
from PIL import Image, ImageEnhance

W, H, M = 384, 224, 14
DOTS = 2
src, dst = sys.argv[1], sys.argv[2]
colors = int(sys.argv[sys.argv.index('--colors') + 1]) if '--colors' in sys.argv else 48
top = float(sys.argv[sys.argv.index('--crop-top') + 1]) if '--crop-top' in sys.argv else 0.157

im = Image.open(src).convert('RGB')
iw, ih = im.size
tw, th = (W + 2 * M) * DOTS, H * DOTS
# 横いっぱい、縦は下端から切り出す(上を crop-top 割合まで落とし、足りなければ左右を切る)
ch = iw * th / tw
y0 = min(ih - ch, ih * top) if ch <= ih else 0
if ch > ih:
    cw = ih * tw / th; x0 = (iw - cw) / 2; box = (int(x0), 0, int(x0 + cw), ih)
else:
    box = (0, int(y0), iw, int(y0 + ch))
im = im.crop(box).resize((tw, th), Image.LANCZOS)
im = ImageEnhance.Color(im).enhance(1.15)
im = ImageEnhance.Contrast(im).enhance(1.08)
im = im.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
im.save(dst, optimize=True)
print('saved', dst, im.size)
