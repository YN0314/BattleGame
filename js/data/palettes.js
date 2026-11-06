// キャラの配色。1P・2Pはこの色だけが違う。
// キー: s=肌, S=肌の影, h=髪, g=道着, G=道着の影, b=帯, k=鉢巻, w=手の巻き布, o=輪郭線, e=目
Game.Data.Palettes = [
  // 1P:白い道着、黒帯、赤い鉢巻
  { s: '#f2b88f', S: '#cf8e68', h: '#2b1b16', g: '#f5f5f0', G: '#bcc0cf', b: '#1b1b22',
    k: '#d8443a', w: '#e9e2cf', o: '#16121f', c: '#9a6a36', C: '#6a4522', e: '#16121f' },
  // 2P:赤い道着、黄帯、白い鉢巻
  { s: '#d99a6c', S: '#b0744b', h: '#8c2a18', g: '#d8443a', G: '#9a2b2c', b: '#f2c230',
    k: '#f4f4ee', w: '#f4f4ee', o: '#16121f', c: '#9a6a36', C: '#6a4522', e: '#16121f' }
];

// 見た目の種類(look)。style は体の描き方(sprites.js)、palettes は [1P色, 2P色]。
//   karate : 道着(ヒーロー)
//   sheet  : 画像のスプライトシート(sheet = Game.Data.Sheets のキー、fallback = 読み込めないときの見た目)
//   shirt  : ワイシャツ・ネクタイ・スラックス(写真から作ったキャラ)
// キー(shirt): s/S=肌 h=髪 g/G=シャツ t/T=スラックス n/N=ネクタイ b=ベルト m=バックル x=靴 f=眼鏡 w=未使用 k=未使用 o=輪郭 e=目
// 汎用の人物用:共通の色(輪郭・目・手の巻き布・ケースなど)を補う
function base(o) {
  return Object.assign({ w: '#f4f4ee', o: '#16121f', c: '#9a6a36', C: '#6a4522', e: '#16121f', f: '#26262d', k: '#d8443a', K: '#9a2b2c',
    m: '#b9bdc6', b: '#1b1b22', x: '#17171c', n: '#d8443a', N: '#9a2b2c', t: '#383c4e', T: '#222532' }, o);
}
Game.Data.Looks = {
  hero: { style: 'karate', palettes: Game.Data.Palettes },
  nakagawa: {
    style: 'shirt',
    palettes: [
      // 1P:白シャツ、濃紺のネクタイ、黒いスラックス
      { s: '#efc29c', S: '#c99772', h: '#17171d', g: '#f6f7f9', G: '#b4bfd0', t: '#383c4e', T: '#222532',
        n: '#27305a', N: '#4a5fa0', b: '#101015', m: '#b9bdc6', x: '#17171c', f: '#26262d',
        w: '#f6f7f9', k: '#17171d', o: '#14121c', c: '#9a6a36', C: '#6a4522', e: '#14121c' },
      // 2P:水色のシャツ、えんじのネクタイ、グレーのスラックス
      { s: '#e2b48d', S: '#b98a66', h: '#2a1d18', g: '#a9cdea', G: '#7499bd', t: '#5d6272', T: '#3e4250',
        n: '#8e2c3a', N: '#b94a58', b: '#1a1a20', m: '#d4c27a', x: '#222228', f: '#2b2b33',
        w: '#a9cdea', k: '#2a1d18', o: '#14121c', c: '#9a6a36', C: '#6a4522', e: '#14121c' }
    ]
  }
  ,
  // 画像(スプライトシート)の見た目。assets/ の画像と、その切り出し定義(Game.Data.Sheets の hero_sheet)を使う。
  // 作り方は assets/README.md。画像が読み込めないときは、道着の自動生成の絵に戻る。
  hero_sheet: { style: 'sheet', sheet: 'hero_sheet', fallback: 'hero', palettes: Game.Data.Palettes }
  ,
  // ---- 汎用の人物(style 'casual')のサンプル。髪型・服・体格は opts、色は palettes([1P色, 2P色])で決める ----
  // 色の共通部分(輪郭・目・カバンの色など)は base() が補う。変えたい色だけ書く
  // 中国の女性格闘家:二つのお団子髪、赤いチャイナ服
  mei: { style: 'casual', opts: { hair: 'buns', top: 'dress', bottom: 'skirt', thick: 0.9, lips: true },
    palettes: [
      base({ s: '#f3cfa8', S: '#d1a17c', h: '#191420', g: '#c8262f', G: '#8e1a24', n: '#f0c24a', N: '#c9962a', x: '#17141a', k: '#f0c24a', b: '#f0c24a' }),
      base({ s: '#eec39b', S: '#c99870', h: '#2a1a14', g: '#2f6fb0', G: '#1f4c80', n: '#f4f0e6', N: '#c9c3b4', x: '#17141a', k: '#f4f0e6', b: '#f4f0e6' })
    ] },
  // ロシアの大男:丸刈り、あごひげ、縞のシャツ(袖なし)
  boris: { style: 'casual', opts: { hair: 'buzz', top: 'tank', bottom: 'pants', thick: 1.28, beard: true },
    palettes: [
      base({ s: '#efbf9b', S: '#c8957a', h: '#6a4a2a', g: '#e9eef4', G: '#7f9cc4', t: '#3d5236', T: '#27361f', n: '#3a64a8', N: '#2b4c86', b: '#1a1410', x: '#1c1713', k: '#3a64a8' }),
      base({ s: '#e6b190', S: '#bd8970', h: '#2c2018', g: '#2c3a63', G: '#1c2644', t: '#6c3a30', T: '#4a261f', n: '#e9eef4', N: '#b8c2d6', b: '#1a1410', x: '#1c1713', k: '#e9eef4' })
    ] },
  // ブラジルの女性:ポニーテール、黄色いタンクトップと緑のショートパンツ
  isa: { style: 'casual', opts: { hair: 'pony', top: 'tank', bottom: 'shorts', thick: 0.92, lips: true },
    palettes: [
      base({ s: '#c98a5e', S: '#9c6742', h: '#2a1810', g: '#f2cf34', G: '#c29c1c', t: '#1f8a4c', T: '#14633a', n: '#f2cf34', N: '#c29c1c', b: '#14633a', x: '#f4f4ee', k: '#1f8a4c' }),
      base({ s: '#b97c52', S: '#8f5c3a', h: '#4a2410', g: '#3b8fd6', G: '#27669c', t: '#f4f4ee', T: '#bcc2cc', n: '#f2cf34', N: '#c29c1c', b: '#f4f4ee', x: '#f2cf34', k: '#3b8fd6' })
    ] },
  // アメリカのボクサー:鉢巻、グローブ、上半身裸、ショートパンツ
  jax: { style: 'casual', opts: { hair: 'afro', top: 'bare', bottom: 'shorts', thick: 1.12, gloves: true, band: true },
    palettes: [
      base({ s: '#8a5a3c', S: '#63402a', h: '#14100e', g: '#8a5a3c', G: '#63402a', t: '#2a56b8', T: '#1c3c88', n: '#f4f4ee', N: '#c4c8d0', b: '#f4f4ee', x: '#f4f4ee', k: '#d8352f', K: '#9a2420' }),
      base({ s: '#7a4c32', S: '#573625', h: '#14100e', g: '#7a4c32', G: '#573625', t: '#d8352f', T: '#9a2420', n: '#f4f4ee', N: '#c4c8d0', b: '#f4f4ee', x: '#17141a', k: '#2a56b8', K: '#1c3c88' })
    ] },
  // インドの女性:長い髪、額の印、オレンジの長袖チュニック、白いパンツ
  priya: { style: 'casual', opts: { hair: 'long', top: 'long', bottom: 'pants', thick: 0.95, lips: true, mark: true },
    palettes: [
      base({ s: '#d49a6c', S: '#a87248', h: '#14100e', g: '#ee8a2a', G: '#b8601a', t: '#f4f0e6', T: '#c8c2b2', n: '#c8262f', N: '#8e1a24', b: '#c8262f', x: '#8a5a2c', k: '#c8262f' }),
      base({ s: '#c88c60', S: '#9c6840', h: '#1c1210', g: '#8a3fb0', G: '#612a80', t: '#f4f0e6', T: '#c8c2b2', n: '#f0c24a', N: '#c9962a', b: '#f0c24a', x: '#8a5a2c', k: '#f0c24a' })
    ] }

};
