#!/usr/bin/env python3
"""Aseprite が書き出したスプライトシート(JSON)を、このゲームの切り出し定義(assets/<名前>.data.js)に変換する。

Aseprite 側の準備:
  1. ポーズごとに「タグ」を付ける(タグ名 = ポーズ名。idle, walk, standPunch, standKick, jumpKick, hit, down ... 一覧は assets/README.md)。
     タグの中のコマ順がそのまま frame 0, 1, 2 ... になる。
  2. File > Export Sprite Sheet で、Output に「JSON Data」、Meta に「Tags」を入れて書き出す(形式は Array / Hash どちらでもよい)。
  3. 1Pの絵のPNGを assets/<名前>_1p.png、2P色の絵があれば assets/<名前>_2p.png に置く。

使い方:
    python3 tools/aseprite_to_sheet.py 書き出したJSON 名前 [--art-scale 1] [--ox 40] [--oy 78]

  --art-scale : 絵の1ドットが、ゲームの座標の何分の1か(1なら絵のドット1個 = 1単位。384×224の画面に合わせて描いたなら 1)
  --ox, --oy  : 各コマの切り出し範囲の中での「足元の位置」(絵のドット単位、左上が原点)。
                省略すると、横は中央、縦は下端から2ドット上
"""
import argparse, json, os

ap = argparse.ArgumentParser()
ap.add_argument('json'); ap.add_argument('name')
ap.add_argument('--art-scale', type=float, default=1)
ap.add_argument('--ox', type=float); ap.add_argument('--oy', type=float)
a = ap.parse_args()

d = json.load(open(a.json, encoding='utf-8'))
frames = d['frames']
if isinstance(frames, dict):
    frames = list(frames.values())
tags = d.get('meta', {}).get('frameTags', [])
if not tags:
    raise SystemExit('タグが見つかりません。Aseprite の書き出しで Meta の「Tags」にチェックを入れてください')

out = {}
for t in tags:
    lst = []
    for i in range(t['from'], t['to'] + 1):
        r = frames[i]['frame']
        ox = a.ox if a.ox is not None else r['w'] / 2
        oy = a.oy if a.oy is not None else r['h'] - 2
        lst.append({'x': r['x'], 'y': r['y'], 'w': r['w'], 'h': r['h'], 'ox': ox, 'oy': oy})
    out[t['name']] = lst

data = {'image': ['assets/%s_1p.png' % a.name, 'assets/%s_2p.png' % a.name],
        'artScale': a.art_scale, 'frames': out}
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', a.name + '.data.js')
open(path, 'w', encoding='utf-8').write(
    "// Aseprite の書き出しから tools/aseprite_to_sheet.py が作った。形式の説明は assets/README.md\n"
    "Game.Data.Sheets.%s = %s;\n" % (a.name, json.dumps(data, ensure_ascii=False, separators=(',', ':'))))
print('作成:', os.path.normpath(path), '/ ポーズ:', ', '.join(out))
