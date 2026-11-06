# 絵(スプライトシート)の差し替え方

ゲームの絵は、2通りの方法で用意できます。

| 方法 | 内容 |
| --- | --- |
| 自動生成(`style: 'karate'` / `'shirt'`) | 関節の位置から計算して描く。いまの HERO・NAKAGAWA |
| 画像(`style: 'sheet'`) | PNGのスプライトシートを切り出して使う。手描きの絵はこちら |

画像の見た目で、足りないポーズや読み込めない画像は、自動生成の絵(`fallback`)で補われます。少しずつ差し替えられます。

## 手順

1. **絵を描く。** Aseprite などで、ポーズごとにタグを付けて描く(下の「ポーズ名」)。足元の位置がコマごとにそろうようにする。
2. **書き出す。** Aseprite の File > Export Sprite Sheet で、JSON Data と Tags を有効にして書き出す。
3. **変換する。** `python3 tools/aseprite_to_sheet.py 書き出したJSON 名前 --art-scale 1`
   → `assets/名前.data.js` ができる。PNG は `assets/名前_1p.png`(2P色があれば `名前_2p.png`)に置く。
4. **登録する。**
   - `index.html` の `<script src="assets/名前.data.js">` を、`assets/hero_sheet.data.js` の行の下に足す。
   - `js/data/palettes.js` の `Game.Data.Looks` に `{ style: 'sheet', sheet: '名前', fallback: 'hero', palettes: Game.Data.Palettes }` を足す。
   - `js/config/characters.config.js` のキャラの `sprite` にその名前を書く(`order` にも並べる)。

見本は `hero_sheet`(ヒーローの絵を `tools/export_sheet.py` で画像に書き出したもの)です。構成はこれと同じです。

## 切り出し定義の形式(`assets/名前.data.js`)

```js
Game.Data.Sheets.名前 = {
  image: ['assets/名前_1p.png', 'assets/名前_2p.png'],   // 1P用・2P用(1枚だけでも可)
  artScale: 1,           // 絵の1ドットが、ゲームの座標の何分の1か。2なら絵のドット2個 = 1単位
  loop: ['idle', 'walk'],// 繰り返すポーズ(省略時は idle / walk / dizzy)。ほかは最後のコマで止まる
  frames: {
    idle: [ { x: 0, y: 0, w: 64, h: 80, ox: 32, oy: 78 }, ... ],
    standPunch: [ ... ]
  }
};
```

- `x, y, w, h` : 画像内の切り出し範囲(絵のドット)
- `ox, oy` : その範囲の中での足元の位置(絵のドット。ここがキャラの座標になる)
- `hurt`(省略可) : コマごとの喰らい判定 `[[x0,y0,x1,y1], ...]`。ゲームの座標で、足元が原点、右向き。省略すると、同じ名前のポーズの関節から自動で作る

## ポーズ名

コマ数は目安です(多くても少なくても動きます)。技のポーズは、攻撃の段階(発生前 / 攻撃中 / 硬直)で frame が 0 → 1 → 2 と進みます。

| ポーズ | コマ数の目安 | 使われる場面 |
| --- | --- | --- |
| idle / walk | 4 / 6(繰り返し) | 立ち / 歩き |
| jump / crouch / crouchGuard / guard | 1 | ジャンプ / しゃがみ / ガード |
| standPunch / standKick / crouchPunch / crouchKick / jumpPunch / jumpKick | 3 | 通常技(発生前 / 攻撃中 / 硬直) |
| fireball / uppercut / uppercutLand / flashkick | 3 / 3 / 1 / 3 | 必殺技 |
| throw / slam | 3 / 4 | 投げ・叩きつけ |
| hit / down / dizzy | 1 / 1 / 4 | やられ / ダウン / 気絶 |

`Game.Data.Sprites.list()` をブラウザのコンソールで実行すると、現在のポーズ名とコマ数が確認できます。
