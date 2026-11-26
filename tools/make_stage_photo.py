#!/usr/bin/env python3
"""写真をそのまま使うステージ背景(JPEG)を作る。make_stage.py(ドット絵風に減色する)と違って、写真の細かさを残す。
使い方: python tools/make_stage_photo.py 写真.png assets/stage_xxx.jpg [--sat 2.0] [--gamma 0.86] [--contrast 0.95] [--sharp 0.5] [--crop-top 0] [--quality 92]
  - 画面(412:224 = 幅384 + 左右の余白14×2)の縦横比に合わせて切り出し、ゲームの描画サイズ 1648x896 に拡大縮小する(1ドット=画面の1ドットで描かれる)
  - 色味: 既定の値は、sasaki さんの背景(docs/ほかのメンバーの成果物管理/fighting-game_sasaki_)の彩度・明るさ・コントラストに合わせたもの
      --sat      彩度の倍率(明るくすると彩度が下がるので、大きめにする)
      --gamma    1 より小さいと明るくなる(影を持ち上げる)
      --contrast コントラストの倍率
      --sharp    輪郭をくっきりさせる強さ(0 でなし)
  - 縦横比が合っていれば切り出さない。縦が長いときは、上から crop-top の割合だけ切り落とす
"""
import sys
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

TW, TH = 1648, 896          # (384 + 2*14) * 4 と 224 * 4(pixelScale 4 のときの描画サイズ)


def opt(name, default):
    return float(sys.argv[sys.argv.index(name) + 1]) if name in sys.argv else default


src, dst = sys.argv[1], sys.argv[2]
sat, gamma, contrast, sharp = opt('--sat', 2.0), opt('--gamma', 0.86), opt('--contrast', 0.95), opt('--sharp', 0.5)
top, quality = opt('--crop-top', 0.0), int(opt('--quality', 92))

im = Image.open(src).convert('RGB')
iw, ih = im.size
ch = iw * TH / TW                                   # 幅いっぱいで切り出したときの高さ
if ch <= ih:                                        # 縦が余る → 上から top の割合だけ落とし、下を残す
    y0 = int(min(ih - ch, ih * top)); box = (0, y0, iw, y0 + int(round(ch)))
else:                                               # 縦が足りない → 左右を切る
    cw = ih * TW / TH; x0 = (iw - cw) / 2; box = (int(x0), 0, int(x0 + cw), ih)
im = im.crop(box).resize((TW, TH), Image.LANCZOS)

a = np.clip(np.asarray(im, dtype=np.float32) / 255, 0, 1) ** gamma
im = Image.fromarray((a * 255).astype(np.uint8))
im = ImageEnhance.Contrast(im).enhance(contrast)
im = ImageEnhance.Color(im).enhance(sat)
if sharp > 0:
    im = im.filter(ImageFilter.UnsharpMask(radius=2.2, percent=int(sharp * 100), threshold=2))
im.save(dst, quality=quality, optimize=True)
print('saved', dst, im.size)
