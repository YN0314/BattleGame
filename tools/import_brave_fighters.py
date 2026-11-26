#!/usr/bin/env python3
"""kira さんの brave-fighters のキャラ「タカハシ」「ケンタロウ」の絵を、このゲームのスプライトシート(style 'sheet')に変換する。
使い方(ゲームのフォルダで):
    python tools/import_brave_fighters.py <brave-fighters の assets/characters フォルダ>
  → assets/takahashi_k_sheet.png / .data.js(タカハシ)と、assets/ishii_k_sheet.png / .data.js(ケンタロウ = ISHII K)ができる。
  登録(index.html の script、palettes.js の Looks、characters.config.js)は手で行う(設計書 11b.45)。
  ※ ケンタロウの絵は、既存の作品のキャラクターに似ているので、社内用(対外的に使わない)。外に出すときは別の絵に差し替える。

変換のしかた:
  - kira さんの切り出し定義(js/character-sprites.js の frames)のとおりに、
    原本のシート(2172x724 など)から1ポーズずつ切り出し、立ち姿を高さ 96 に合わせて縮める。ここでは 2 倍の細かさ(立ち姿が高さ 192)で作る。
  - 1コマは 416x256、足元は (208,224)。ゲーム側の artScale は 4(絵の4ドット = 1 単位。立ち姿 192 ドット = 48 単位)。
  - 原本の薄いにじみ(半透明の靄)は、alpha 128 を境に消す。
  - kira さんの絵は1ポーズ1枚(歩きは2枚)。こちらのポーズ名との対応は POSES にまとめた。足りないポーズは近いポーズで代用する。
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageOps

R = 2                                 # 細かさ(kira さんのゲームの描画の2倍 = 常時2倍画質)
CW, CH = 208 * R, 128 * R             # 1コマの大きさ
OX, OY = 104 * R, 112 * R             # 足元の位置
COLS = 6

# タカハシ(js/character-sprites.js の frames をそのまま写した。sheet, cell, crop[left,top,right,bottom], origin, targetHeight(None=立ち姿の倍率), flip, horizontalScale)
OFFICE = {
    'idle': ['base', 0, [141, 15, 408, 353], 280, 96, True],
    'walk0': ['base', 1, [157, 16, 388, 353], 270, 96],
    'walk1': ['base', 2, [178, 16, 363, 355], 270, 96],
    'guard': ['base', 3, [138, 29, 390, 354], 270, 96],
    'hit': ['base', 4, [132, 24, 378, 345], 270, 96],
    'ko': ['base', 5, [65, 251, 484, 346], 275, 22],
    'crouch': ['base', 6, [152, 74, 382, 345], 270, None, True],
    'crouchGuard': ['base', 7, [136, 97, 349, 345], 250, None],
    'crouchHit': ['low', 4, [139, 103, 376, 342], 270, None],
    'jump': ['low', 5, [163, 9, 350, 301], 265, 84],
    'relax': ['ending', 1, [179, 27, 424, 613], 302, 96, True],
    'victoryTie': ['ending', 0, [203, 17, 449, 613], 326, 96, True],
    'victoryNod': ['ending', 1, [179, 27, 424, 613], 302, 96, True],
    'defeat': ['ending', 2, [203, 31, 430, 602], 317, 96, True],
    'fall': ['ending', 3, [85, 219, 475, 601], 280, 62, True],
    'stand-weakP': ['attacks', 0, [161, 19, 414, 352], 247, 96, False, 0.36],
    'stand-strongP': ['attacks', 1, [126, 43, 469, 352], 280, 96, False, 0.36],
    'stand-weakK': ['attacks', 2, [144, 17, 410, 352], 204, 96, False, 0.36],
    'stand-strongK': ['attacks', 3, [128, 17, 434, 352], 190, 96, False, 0.36],
    'air-weakP': ['attacks', 4, [179, 10, 414, 324], 247, 90, False, 0.36],
    'air-strongP': ['attacks', 5, [136, 28, 461, 310], 272, 84, False, 0.36],
    'air-weakK': ['attacks', 6, [128, 13, 407, 313], 201, 88, False, 0.36],
    'air-strongK': ['attacks', 7, [100, 17, 444, 303], 200, 84, False, 0.36],
    'crouch-weakP': ['low', 0, [141, 93, 410, 341], 200, None],
    'crouch-strongP': ['low', 1, [141, 93, 460, 341], 222, None],
    'crouch-weakK': ['low', 2, [143, 96, 415, 345], 156, None],
    'crouch-strongK': ['low', 3, [100, 100, 481, 341], 172, None],
}
HERO_FILES = {'base': 'hero-fighter/base-proportions-v2.png', 'attacks': 'hero-fighter/attacks-proportions-v2.png',
              'low': 'hero-fighter/low-proportions-v2.png', 'ending': 'hero-fighter/ending-proportions-v2.png'}
OFFICE_FILES = {'base': 'office-fighter/base.png', 'attacks': 'office-fighter/attacks.png', 'low': 'office-fighter/low.png',
                'ending': 'office-fighter/ending-2026-11-08.png'}

# このゲームのポーズ名 → kira さんのポーズ名の並び(技のポーズは 発生前 / 攻撃中 / 硬直 の3コマ)
def attack(base, hit):
    return [base, hit, hit]

POSES = {
    'idle': ['idle'], 'walk': ['walk0', 'walk1'], 'jump': ['jump'], 'crouch': ['crouch'],
    'guard': ['guard'], 'crouchGuard': ['crouchGuard'], 'hit': ['hit'], 'dizzy': ['hit'], 'down': ['ko'],
    'standPunch': attack('idle', 'stand-weakP'), 'standHPunch': attack('idle', 'stand-strongP'),
    'standKick': attack('idle', 'stand-weakK'), 'standHKick': attack('idle', 'stand-strongK'),
    'crouchPunch': attack('crouch', 'crouch-weakP'), 'crouchHPunch': attack('crouch', 'crouch-strongP'),
    'crouchKick': attack('crouch', 'crouch-weakK'), 'crouchHKick': attack('crouch', 'crouch-strongK'),
    'jumpPunch': ['air-weakP'] * 3, 'jumpHPunch': ['air-strongP'] * 3,
    'jumpKick': ['air-weakK'] * 3, 'jumpHKick': ['air-strongK'] * 3,
    # 必殺技・投げ(kira さんの絵に専用ポーズはないので、近いポーズで代用する)
    'fireball': attack('idle', 'stand-weakP'), 'palmStrike': attack('idle', 'stand-weakP'), 'paperToss': attack('idle', 'stand-weakP'),
    'straight': attack('idle', 'stand-strongP'), 'briefcase': attack('idle', 'stand-strongP'), 'overtime': attack('idle', 'stand-strongP'),
    'uppercut': attack('crouch', 'stand-strongP'), 'uppercutLand': ['crouch'],
    'flashkick': attack('crouch', 'stand-strongK'), 'spinKick': ['stand-weakK', 'stand-strongK', 'stand-strongK'],
    'flyKick': ['air-strongK'] * 3,
    'throw': ['stand-weakP', 'stand-strongP', 'stand-strongP'], 'slam': ['stand-weakP', 'stand-strongP', 'stand-strongP', 'stand-strongP'],
}
# キャラごとの代用の違い: タカハシの「定時スライド」(下段の滑り込み)の代用(tackle)は、しゃがみ強キックの姿。
# ケンタロウの「ブレイブキック」(立ち強キックの中段蹴り)の代用(flyKick)は、立ちのキックの姿
EXTRA = {
    'takahashi_k': {'tackle': ['crouch', 'crouch-strongK', 'crouch-strongK']},
    'ishii_k': {'flyKick': ['stand-weakK', 'stand-strongK', 'stand-strongK']},
}


def load_sheets(root, files):
    out = {}
    for k, rel in files.items():
        im = Image.open(os.path.join(root, rel)).convert('RGBA')
        r, g, b, a = im.split()
        a = a.point(lambda v: 255 if v >= 128 else 0)          # 薄いにじみを消す
        im.putalpha(a)
        out[k] = im
    return out


def render(spec, sheets, standing):
    sheet, cell, (l, t, r, b), origin, th = spec[:5]
    flip = spec[5] if len(spec) > 5 else False
    hs = spec[6] if len(spec) > 6 else None
    img = sheets[sheet]
    cols = 2 if sheet == 'ending' else 4
    cw, chh = img.width / cols, img.height / 2
    sw, sh = r - l + 1, b - t + 1
    sy_ = th / sh if th is not None else standing
    sx_ = hs or sy_
    height = round(sh * sy_ * R)
    width = round(sw * sx_ * R)
    sx0, sy0 = int(cell % cols * cw + l), int(cell // cols * chh + t)
    crop = img.crop((sx0, sy0, sx0 + sw, sy0 + sh)).resize((width, height), Image.LANCZOS)
    crop.putalpha(crop.getchannel('A').point(lambda v: 255 if v >= 128 else 0))   # 縁は硬く
    dx = round((l - origin) * sx_ * R)
    if flip:
        crop = ImageOps.mirror(crop)
        dx = -(dx + width)
    canvas = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    canvas.paste(crop, (OX + dx, OY - height), crop)
    return canvas


def build(root, files, specs, name, key, out_dir):
    sheets = load_sheets(root, files)
    idle = specs['idle']
    standing = idle[4] / (idle[2][3] - idle[2][1] + 1)
    names = list(specs.keys())
    sheet = Image.new('RGBA', (COLS * CW, ((len(names) + COLS - 1) // COLS) * CH), (0, 0, 0, 0))
    cell_of = {}
    for i, n in enumerate(names):
        sheet.paste(render(specs[n], sheets, standing), (i % COLS * CW, i // COLS * CH))
        cell_of[n] = {'x': i % COLS * CW, 'y': i // COLS * CH, 'w': CW, 'h': CH, 'ox': OX, 'oy': OY}
    sheet.save(os.path.join(out_dir, name + '.png'), optimize=True)
    poses = dict(POSES)
    poses.update(EXTRA.get(key, {}))
    frames = {p: [dict(cell_of[k]) for k in seq] for p, seq in poses.items()}
    # 顔の位置(選択画面・VS画面の顔アイコン用)= [足元から右へ, 足元から上へ, 切り出す大きさ](絵のドット)。待機ポーズの頭の幅から決める
    a = np.array(sheet.crop((cell_of['idle']['x'], cell_of['idle']['y'], cell_of['idle']['x'] + CW, cell_of['idle']['y'] + CH)).getchannel('A')) > 0
    ys = np.where(a.any(axis=1))[0]
    y0 = int(ys.min()); band = a[y0 + 12 * R // 2: y0 + 26 * R // 2 + 4]
    cols = np.where(band.any(axis=0))[0]
    face = [int(round((cols.min() + cols.max()) / 2 - OX)), int(OY - (y0 + 10 * R)), int(round(1.5 * (cols.max() - cols.min())))]
    data = {'image': 'assets/%s.png' % name, 'artScale': 2 * R, 'loop': ['idle', 'walk', 'dizzy'], 'face': face, 'frames': frames}
    js = ('// %s のスプライトシート(kira さんの brave-fighters の絵を tools/import_brave_fighters.py で変換。artScale %d、1コマ %dx%d、足元 (%d,%d))。形式の説明は assets/README.md\n'
          'Game.Data.Sheets.%s = %s;\n') % (key.upper(), 2 * R, CW, CH, OX, OY, name, json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    open(os.path.join(out_dir, name + '.data.js'), 'w', encoding='utf-8').write(js)
    print('saved', name, sheet.size, len(names), 'poses')


if __name__ == '__main__':
    root = sys.argv[1]
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')
    build(root, OFFICE_FILES, OFFICE, 'takahashi_k_sheet', 'takahashi_k', out)
    hero = json.load(open(os.path.join(root, 'hero-fighter', 'frames.json'), encoding='utf-8'))
    build(root, HERO_FILES, hero, 'ishii_k_sheet', 'ishii_k', out)
