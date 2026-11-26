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
      // 1P(写真をもとに補正):薄い水色のシャツ、濃紺に赤の縞のネクタイ、黒いスラックスと黒い革靴
      { s: '#e8bd98', S: '#c09270', h: '#17171d', g: '#d3dcef', G: '#a1b0d0', t: '#2e2f38', T: '#1c1d25',
        n: '#27305a', N: '#4a5fa0', b: '#101015', m: '#b9bdc6', x: '#14141a', f: '#26262d',
        w: '#d3dcef', k: '#17171d', o: '#14121c', c: '#9a6a36', C: '#6a4522', e: '#14121c' },
      // 2P:水色のシャツ、えんじのネクタイ、グレーのスラックス
      { s: '#e2b48d', S: '#b98a66', h: '#2a1d18', g: '#a9cdea', G: '#7499bd', t: '#5d6272', T: '#3e4250',
        n: '#8e2c3a', N: '#b94a58', b: '#1a1a20', m: '#d4c27a', x: '#222228', f: '#2b2b33',
        w: '#a9cdea', k: '#2a1d18', o: '#14121c', c: '#9a6a36', C: '#6a4522', e: '#14121c' }
    ]
  }
  ,
  // ---- 汎用の人物(style 'casual')のサンプル。髪型・服・体格は opts、色は palettes([1P色, 2P色])で決める ----
  // 色の共通部分(輪郭・目・カバンの色など)は base() が補う。変えたい色だけ書く
  // ---- 写真をもとにした人物(photo フォルダの個別フォルダ名 = キャラ名)。服・髪・小物の色は写真から取った ----
  // imai(今井):くせのある黒髪、白いワイシャツ、黒いスラックス、黒い革靴(後ろ姿の写真から)
  imai: { style: 'casual', opts: { hair: 'curly', top: 'long', bottom: 'pants', thick: 0.98, tie: false },
    palettes: [
      base({ s: '#e2b58f', S: '#b98c68', h: '#1d1a1a', g: '#f1f2f4', G: '#b9c0cc', t: '#25262d', T: '#15161b', n: '#e2e5ea', N: '#b9c0cc', b: '#101015', x: '#121216', k: '#1d1a1a' }),
      base({ s: '#d9a982', S: '#b08460', h: '#3a2a20', g: '#9db6d6', G: '#6f8cb3', t: '#383c4e', T: '#222532', n: '#c8d6ea', N: '#6f8cb3', b: '#101015', x: '#121216', k: '#3a2a20' })
    ] },
  // kira:眼鏡、黒髪の分け目、濃紺のジャケットに黒いニット、濃紺のパンツ、茶色の革靴
  kira: { style: 'casual', opts: { hair: 'side', top: 'long', bottom: 'pants', thick: 0.97, glasses: true, jacket: true },
    palettes: [
      base({ s: '#efc7a2', S: '#c99f7c', h: '#18151a', g: '#26335a', G: '#171f3c', t: '#2a3558', T: '#1a2240', n: '#17171d', N: '#101015', b: '#7a4a2a', x: '#8a4e2c', f: '#2a2a31', k: '#18151a' }),
      base({ s: '#e8bc96', S: '#bf9570', h: '#2a1c14', g: '#6a4a38', G: '#47301f', t: '#d8d0c0', T: '#a8a090', n: '#2a2a31', N: '#17171d', b: '#3a2a20', x: '#3a2a20', f: '#2a2a31', k: '#2a1c14' })
    ] },
  // koshika:長い髪(根元は濃く毛先は明るい茶色)、ベージュの大きめニット、黒いフレアパンツ、黒いフラットシューズ
  koshika: { style: 'casual', opts: { hair: 'long', top: 'long', bottom: 'pants', thick: 0.92, lips: true },
    palettes: [
      base({ s: '#f1cfae', S: '#cfa584', h: '#3a2418', H: '#c8a064', g: '#cdbfae', G: '#9c8e7c', t: '#1b1c22', T: '#101116', n: '#e0d6c8', N: '#9c8e7c', b: '#101015', x: '#14141a', k: '#c8a064' }),
      base({ s: '#eec7a4', S: '#c79c7a', h: '#2a1a14', H: '#9c6a3a', g: '#27375e', G: '#182444', t: '#1b1c22', T: '#101116', n: '#a9c4e6', N: '#7a98c4', b: '#101015', x: '#14141a', k: '#9c6a3a' })
    ] },
  // nakano:短いくせ毛、眼鏡、薄いグレーの縞シャツ(袖まくり)、紺のパンツ、白いスニーカー
  nakano: { style: 'casual', opts: { hair: 'wavy', top: 'rolled', bottom: 'pants', thick: 1.02, glasses: true },
    palettes: [
      base({ s: '#e8bd98', S: '#bf9570', h: '#34281f', g: '#e4e6ea', G: '#b3b9c4', t: '#27325a', T: '#18203c', n: '#c9ced8', N: '#9aa2b2', b: '#1a1a20', x: '#e9e4d8', f: '#2a2a31', k: '#34281f' }),
      base({ s: '#e0b48e', S: '#b88c68', h: '#1e1812', g: '#c9d8e6', G: '#98adc2', t: '#3a3c44', T: '#25262c', n: '#aebfd2', N: '#7f94ab', b: '#1a1a20', x: '#d9d4c8', f: '#2a2a31', k: '#1e1812' })
    ] },
  // takahashi:短い黒髪(前髪を上げる)、白いシャツ(袖まくり)に濃紺の縞のネクタイ、赤いネームストラップ、グレーのスラックス、縞の靴下
  takahashi: { style: 'casual', opts: { hair: 'slick', top: 'rolled', bottom: 'pants', thick: 0.94, tie: true, tieStripe: true, lanyard: true },
    palettes: [
      base({ s: '#e8bf9a', S: '#bf9570', h: '#1c1816', g: '#f4f5f7', G: '#bcc3d0', t: '#6c6f78', T: '#494b54', n: '#242c52', N: '#c8363a', b: '#17171c', x: '#ecebe6', k: '#d0302f', w: '#f4f5f7' }),
      base({ s: '#e0b690', S: '#b88c68', h: '#1c1816', g: '#a8c8ec', G: '#7a9cc8', t: '#1f2028', T: '#121318', n: '#242c52', N: '#c8363a', b: '#2a1c14', x: '#ecebe6', k: '#d0302f', w: '#e8eef8' })
    ] }

};

// ---- vec(ベクター描き → ドット絵)の見た目。写真の人物に寄せて作る ----
// キー: s/S/sh=肌(ふつう/影/ハイライト) h/hs/hh=髪 g/G/gh=シャツ t/T/th=スラックス n/N=ネクタイ(地/縞) b=ベルト m=金具 x/X/xh=靴
//       f=メガネ w=襟・社員証 a=ネームストラップ c=社員証の帯 e=目 o=輪郭線
function vecBase(o) {
  return Object.assign({ c: '#9a6a36', C: '#6a4522', k: '#d8443a', K: '#9a2b2c', w: '#f4f5f8', o: '#15121c', e: '#15151c', f: '#25262e', m: '#c4c9d2', b: '#16161b' }, o);
}
Game.Data.Looks.nakagawa_v = {
  style: 'vec',
  // 体型は「スマート」(2026-11-19)。おなかなし・腰を絞った胴・細い腕脚・小さめの頭と靴。奥の腕は胴の後ろに回す(armBehind)
  // 顔・服は写真に寄せた版(2026-11-19):角ばった広い顔と高いおでこ、後ろに残る短髪、細い茶色の四角いメガネ、細い目、丸い鼻、閉じた微笑み、
  //   無地の薄いラベンダーのシャツ、紺に白の斜め縞のネクタイ(ピンの縁取り・タイピン)、前タックの黒いスラックス、紐つきの黒い革靴
  opts: { hair: 'nak', glasses: 'rect', glassW: 25, glassH: 14, glassLine: 1.5, faceN: 2.7, faceRx: 32, faceRy: 35, headScale: 0.95, shine: true,
    eyeK: 0.6, calm: true, nose: 'round', mouthClosed: true, browW: 1.9, mouthFit: true, smile: true,
    stripe: false, tie: true, tieStripe: true, tieDiag: true, tieStripeW: 0.32, tieClip: true,
    belly: 0, thick: 0.9, armK: 0.9, legThick: 0.95, taper: 0.35, shoeK: 0.84, waist: 0.86, chestK: 1.08, armBehind: true,
    pleat: true, watch: true, shoe: 'derby',
    // 人形っぽさを減らす(2026-11-19):手足をつなぎ目なしの1本の形で塗る(limb)/影とハイライトを弱める(soften)/輪郭を体の色になじませる(outline)/シャツをズボンに入れた腰(tuck)
    limb: 0.5, soften: 0.6, outline: { dark: 0.55, fade: 0.5 }, tuck: true, wrinkles: true, shoulderSoft: 1 },
  palettes: [
    // 1P:薄いラベンダーのシャツ(襟も同色)、紺に白縞のネクタイ(剣先はピンク)、黒いスラックス、黒い革靴、茶色のメガネ
    vecBase({ s: '#e6b48e', S: '#bd8963', sh: '#f2cfae', h: '#2a2220', hs: '#181210', hh: '#4c4038',
      g: '#d3d6ee', G: '#a3a8cc', gh: '#e8eaf7', w: '#dfe1f2', t: '#1e1e24', T: '#101014', th: '#34343c',
      n: '#1c2250', N: '#e8ecf6', p: '#e08a96', x: '#0f0f14', X: '#07070a', xh: '#6a6c78', f: '#7a5a48' }),
    // 2P:白いシャツ、えんじのネクタイ、グレーのスラックス
    vecBase({ s: '#e1ad88', S: '#b98462', sh: '#efc8a6', h: '#2f221c', hs: '#1a110d', hh: '#5a463a',
      g: '#f2f4f8', G: '#b9c0d2', gh: '#ffffff', w: '#f6f7fb', t: '#5a5d68', T: '#3a3c46', th: '#7c7f8c',
      n: '#7a2430', N: '#ecd2d4', x: '#2a2018', X: '#140e0a', xh: '#6a5444', f: '#6a4a3a' })
  ]
};
// ---- 写真に寄せた手描き調(2026-11-20):nakagawa_v と同じ作り方で、残りの8人 ----
// 共通:手足をひとつながりに(limb)・陰影をやわらげる(soften)・輪郭を体の色になじませる(outline)・肩のぼかし(shoulderSoft)・奥の腕を後ろへ(armBehind)
const VEC_SOFT = { limb: 0.5, soften: 0.6, outline: { dark: 0.55, fade: 0.5 }, shoulderSoft: 1, armBehind: true, mouthFit: true };
function vecLook(opts, palettes) { return { style: 'vec', opts: Object.assign({}, VEC_SOFT, opts), palettes: palettes }; }

// takahashi:額が広く生え際がM字に後退、細長い輪郭、細い目。白シャツ(袖まくり)に紺と白の縞のネクタイ、赤いネームストラップ、グレーのスラックス、ゼブラ柄のソックス
Game.Data.Looks.takahashi_v = vecLook(
  { hair: 'tk', faceN: 2.5, faceRx: 27, faceRy: 38, headScale: 1.0, shine: true, eyeK: 0.56, calm: true, smile: true, mouthClosed: true, browW: 2.2,
    tie: true, tieStripe: true, tieDiag: true, tieStripeW: 0.34, lanyard: true, sleeve: 1.3, rolled: true, tuck: true, wrinkles: true, pleat: true,
    thick: 0.9, armK: 0.9, legThick: 0.93, taper: 0.25, shoeK: 0.9, waist: 0.84, chestK: 1.05, shoe: 'zebra' },
  [
    // 1P:白シャツ+グレーのスラックス
    vecBase({ s: '#e6bc99', S: '#bd8d6a', sh: '#f3d4b8', h: '#2b2220', hs: '#181210', hh: '#4a3e36',
      g: '#f4f6fa', G: '#bcc4d6', gh: '#ffffff', w: '#f4f6fa', t: '#5d606a', T: '#3b3d47', th: '#797d89', b: '#1b1b20',
      n: '#1f2a52', N: '#eef0f8', a: '#d0302f', q: '#3b5fb0', x: '#f0f0f0', X: '#bcbcc2', xh: '#ffffff' }),
    // 2P:水色のシャツ+黒いスラックス
    vecBase({ s: '#e2b894', S: '#b98a68', sh: '#f0d0b2', h: '#2b2220', hs: '#181210', hh: '#4a3e36',
      g: '#aec0e6', G: '#8296c4', gh: '#cad7f3', w: '#b9c9ec', t: '#25262c', T: '#15161a', th: '#3d3e47', b: '#101014',
      n: '#1f2a52', N: '#eef0f8', a: '#d0302f', q: '#3b5fb0', x: '#f0f0f0', X: '#bcbcc2', xh: '#ffffff' })
  ]);

// takahashi_k:kira さんの brave-fighters の「タカハシ」(水色のシャツ、斜め縞のネクタイ、黒いスラックス)。画像のスプライトシート(assets/takahashi_k_sheet.*、tools/import_brave_fighters.py で変換)
// 絵が読み込めないときは、写真から作ったタカハシの絵で補う。1P・2Pで同じ絵を使う
Game.Data.Looks.takahashi_k = { style: 'sheet', sheet: 'takahashi_k_sheet', fallback: 'takahashi_v', palettes: Game.Data.Looks.takahashi_v.palettes };

// imai:ボリュームのあるくせ毛、あごひげ、細めの目と目の下のくま。水色のシャツに黄色いネームストラップ、黒いスラックス
Game.Data.Looks.imai_v = vecLook(
  { hair: 'curlyBig', beard: 'stubble', bags: true, faceN: 2.4, faceRx: 29, faceRy: 36, headScale: 1.0, eyeK: 0.66, calm: true, smile: true, nose: 'round', browW: 2.6,
    lanyard: true, tuck: true, wrinkles: true, pleat: true, thick: 0.92, armK: 0.92, legThick: 0.94, taper: 0.35, shoeK: 0.9, waist: 0.86, chestK: 1.06, shoe: 'derby' },
  [
    // 1P:ペリウィンクルの水色シャツ
    vecBase({ s: '#dfb08a', S: '#b78760', sh: '#edcaa6', h: '#2c211c', hs: '#18100c', hh: '#4d3d33',
      g: '#8aa0d8', G: '#6a80bc', gh: '#a8bbea', w: '#8aa0d8', t: '#202228', T: '#101216', th: '#383a44', b: '#17171b',
      a: '#e2c04a', q: '#f4f4f6', x: '#17171d', X: '#0a0a0e', xh: '#4a4b58' }),
    // 2P:白いワイシャツ
    vecBase({ s: '#dcad88', S: '#b48560', sh: '#ebc6a2', h: '#2c211c', hs: '#18100c', hh: '#4d3d33',
      g: '#f2f3f7', G: '#bcc2d2', gh: '#ffffff', w: '#f2f3f7', t: '#202228', T: '#101216', th: '#383a44', b: '#17171b',
      a: '#e2c04a', q: '#f4f4f6', x: '#17171d', X: '#0a0a0e', xh: '#4a4b58' })
  ]);

// ishii:短く刈った髪(グレーがかった黒、側頭部は刈り上げ)、細い目、落ち着いた表情、あごにうっすら無精ひげ。青と白の細かいプリントの半袖シャツ(襟元を開ける)、カーキの九分丈パンツと濃い色のソックス
Game.Data.Looks.ishii_v = vecLook(
  { hair: 'shave', blush: 0.25, beard: 'stubble', stubble: 0.3, stubbleMix: 0.5, chinK: 0.35,
    faceN: 2.4, faceRx: 28, faceRy: 36, headScale: 0.98, eyeK: 0.5, calm: true, smile: false, browW: 2.1, nose: 'round',
    sleeve: 0.52, texture: 'print', printCell: 1.0, printDensity: 0.62, printAlt: 0.38, hem: 'flat', hemAt: 0.95, waist: 0.9, chestK: 1.06, belt: false,
    thick: 0.9, armK: 0.9, legThick: 0.92, taper: 0.3, shoeK: 0.88, crop: 0.55, shoe: 'sneaker' },
  [
    // 1P:青と白のプリントのシャツ+カーキのパンツ
    vecBase({ s: '#e9c3a3', S: '#c09878', sh: '#f4dcc2', h: '#5a5a54', hs: '#2b2b27', hh: '#7e7e76',
      g: '#6890d0', G: '#4a70b0', gh: '#86aae0', w: '#6890d0', pr: '#eef3fa', pr2: '#33569c', t: '#a3a483', T: '#7c7d60', th: '#bcbd9e', sk: '#3c3d43',
      x: '#3a3b42', X: '#222329', xh: '#6a6c78' }),
    // 2P:紺のプリントのシャツ+ベージュのパンツ
    vecBase({ s: '#e5bf9f', S: '#bc9474', sh: '#f1d8be', h: '#5a5a54', hs: '#2b2b27', hh: '#7e7e76',
      g: '#34497a', G: '#243660', gh: '#4e66a0', w: '#34497a', pr: '#d6dff0', pr2: '#8aa0d0', t: '#c8b890', T: '#a09068', th: '#dccfae', sk: '#2a2b32',
      x: '#e8e4da', X: '#b8b4a8', xh: '#ffffff' })
  ]);

// ishii_k:kira さんの brave-fighters の「ケンタロウ」(ヒーロー衣装)。ISHII のこと。画像のスプライトシート(assets/ishii_k_sheet.*、tools/import_brave_fighters.py で変換)
// 絵が読み込めないときは、写真から作ったISHIIの絵で補う。1P・2Pで同じ絵を使う。社内用(対外的に使うときは差し替える)
Game.Data.Looks.ishii_k = { style: 'sheet', sheet: 'ishii_k_sheet', fallback: 'ishii_v', palettes: Game.Data.Looks.ishii_v.palettes };

// kira:きれいにまとまったマッシュ、細い黒フレームのメガネ、大きな笑顔。紺のジャケットに黒いニット、紺のスラックス、茶色の革靴
Game.Data.Looks.kira_v = vecLook(
  { hair: 'kira', glasses: 'rect', glassW: 25, glassH: 13, glassLine: 1.3, faceN: 2.5, faceRx: 29, faceRy: 36, headScale: 0.97, eyeK: 0.66, calm: true, smile: true, browW: 2.3, blush: 0.6, noseK: 1.6,
    jacket: true, jacketV: 0.5, texture: 'print', printCell: 0.7, printDensity: 0.2, printAlt: 0.4, hem: 'flat', hemAt: 1.12, hemK: 1.04, waist: 0.92, chestK: 1.1, belt: false, thick: 0.92, armK: 0.94, legThick: 0.94, taper: 0.35, shoeK: 0.88, shoe: 'derby', pleat: true },
  [
    // 1P:紺のジャケット+黒いニット+紺のスラックス+茶色の革靴
    vecBase({ s: '#e8bd9a', S: '#bf8f6c', sh: '#f4d6b8', h: '#1c1719', hs: '#0e0a0c', hh: '#4c4244', f: '#2c2c34',
      g: '#303b60', G: '#1f2848', gh: '#4a5b88', pr: '#3b4872', pr2: '#242d52', i: '#1b1b21', w: '#f2f2f6', t: '#272f4c', T: '#171c32', th: '#3c4a72',
      x: '#7b4a2a', X: '#4a2a16', xh: '#aa723e' }),
    // 2P:グレーのジャケット+黒いニット+チャコールのスラックス
    vecBase({ s: '#e4b996', S: '#bb8b68', sh: '#f0d2b4', h: '#1c1719', hs: '#0e0a0c', hh: '#4c4244', f: '#2c2c34',
      g: '#6c717e', G: '#4c515e', gh: '#8d93a2', pr: '#757a88', pr2: '#5f6471', i: '#1b1b21', w: '#f2f2f6', t: '#3a3c46', T: '#25262e', th: '#555866',
      x: '#2a2018', X: '#140e0a', xh: '#6a5444' })
  ]);

// koshika:胸まである長い髪(根もとは暗い茶色、毛先は明るいブロンド)、小さな顔、笑顔。ゆったりしたグレーのVネックニット、黒いフレアパンツ、黒いフラットシューズ
Game.Data.Looks.koshika_v = vecLook(
  { hair: 'long', hairOverTorso: true, hairFront: false, lash: true, faceN: 2.2, faceRx: 27, faceRy: 34, headScale: 0.97, eyeK: 1, calm: true, smile: true, browW: 2.0, blush: 0.6,
    texture: 'print', printCell: 0.55, printDensity: 0.22, printAlt: 0.4,
    vneck: true, collar: false, hem: 'flat', hemAt: 0.95, hemRib: true, belt: false, waist: 1.02, chestK: 1.1, thick: 0.86, armK: 1.06, legThick: 0.88, taper: -1.2, shoeK: 0.8 },
  [
    // 1P:オートミール色のグレーのニット
    vecBase({ s: '#f1d1b6', S: '#cba286', sh: '#fae6d2', h: '#4a3628', hs: '#2a1c14', hh: '#7d6048', H: '#e0c48a',
      g: '#b9aea2', G: '#8f857a', gh: '#d4cbbf', pr: '#c4baae', pr2: '#aea397', t: '#1c1c21', T: '#0e0e12', th: '#363640', x: '#16161b', X: '#08080b', xh: '#44444f' }),
    // 2P:紺のニット
    vecBase({ s: '#efcfb4', S: '#c9a084', sh: '#f8e4d0', h: '#4a3628', hs: '#2a1c14', hh: '#7d6048', H: '#dcc084',
      g: '#303b60', G: '#1f2848', gh: '#4a5b88', pr: '#37436a', pr2: '#27315a', t: '#1c1c21', T: '#0e0e12', th: '#363640', x: '#16161b', X: '#08080b', xh: '#44444f' })
  ]);

// matsuzaki:肩までのダークブラウンのボブ、丸みのある顔、控えめな笑顔。ゆったりしたグレーのニット、黒いパンツ
Game.Data.Looks.matsuzaki_v = vecLook(
  { hair: 'bob', hairOverTorso: true, lash: true, faceN: 2.3, faceRx: 28.5, faceRy: 34, faceLow: 1.16, mouthDy: 2.2, headDy: -0.75, headScale: 0.97, eyeK: 0.85, calm: true, smile: true, mouthClosed: true, browW: 2.0, blush: 0.55,
    collar: false, hem: 'flat', hemAt: 0.95, hemRib: true, belt: false, texture: 'print', printCell: 1.5, printDensity: 0.4, waist: 1.02, chestK: 1.1, thick: 0.88, armK: 1.05, legThick: 0.92, taper: 0.2, shoeK: 0.82 },
  [
    // 1P:グレーのニット
    vecBase({ s: '#f0d0b6', S: '#c9a187', sh: '#f9e5d2', h: '#44332a', hs: '#261a12', hh: '#6e5646',
      g: '#8f9196', G: '#6c6e74', gh: '#aaacb2', pr: '#a2a4a9', pr2: '#76787e', t: '#1b1b20', T: '#0d0d11', th: '#34343c', x: '#17171c', X: '#09090c', xh: '#46464f' }),
    // 2P:クリーム色の花柄のブラウス
    vecBase({ s: '#eecdb2', S: '#c69d84', sh: '#f7e2cf', h: '#44332a', hs: '#261a12', hh: '#6e5646',
      g: '#efe9de', G: '#c9bfaf', gh: '#fbf6ec', pr: '#d9ae6a', pr2: '#5d6f60', t: '#1b1b20', T: '#0d0d11', th: '#34343c', x: '#17171c', X: '#09090c', xh: '#46464f' })
  ]);

// nakano:短く整えた髪(横に流す)、細いハーフリムのメガネ、控えめな笑顔。白と灰の縞のシャツ(袖まくり・胸ポケット)、紺のパンツ、クリーム色のスニーカー
Game.Data.Looks.nakano_v = vecLook(
  { hair: 'swept', glasses: 'half', glassW: 24, glassH: 12, glassLine: 1.2, faceN: 2.5, faceRx: 30, faceRy: 34, headScale: 0.97, eyeK: 0.62, calm: true, smile: true, mouthClosed: true, browW: 2.1,
    stripe: true, pocket: true, sleeve: 1.3, rolled: true, hem: 'flat', hemAt: 0.95, belt: false, waist: 0.94, chestK: 1.08, thick: 0.9, armK: 0.92, legThick: 0.94, taper: 0.4, shoeK: 0.95, shoe: 'sneaker' },
  [
    // 1P:白と灰の縞のシャツ+紺のパンツ
    vecBase({ s: '#e8bf9b', S: '#be9170', sh: '#f4d6ba', h: '#3b2c24', hs: '#221812', hh: '#5c483c', f: '#b0b6c2',
      g: '#eceef2', G: '#a9afbc', gh: '#fafbfd', w: '#eceef2', t: '#27345c', T: '#171f3e', th: '#3c4c80',
      x: '#dccfb8', X: '#aca290', xh: '#f2ebdc' }),
    // 2P:水色のシャツ+チャコールのパンツ
    vecBase({ s: '#e4bb98', S: '#ba8d6c', sh: '#f1d2b6', h: '#3b2c24', hs: '#221812', hh: '#5c483c', f: '#b0b6c2',
      g: '#b8cce8', G: '#7f97c0', gh: '#d6e2f6', w: '#b8cce8', t: '#3c3e48', T: '#262830', th: '#565968',
      x: '#e8e8ea', X: '#b4b4ba', xh: '#ffffff' })
  ]);

// sasaki:ふわっとしたくせ毛、太い眉、満面の笑み。クリーム色のボアのフリース(襟はベージュ)、黒いジョガーパンツ、はだし
Game.Data.Looks.sasaki_v = vecLook(
  { hair: 'mop', faceN: 2.4, faceRx: 31, faceRy: 34, headScale: 0.98, smile: true, browW: 3.6, nose: 'round',
    texture: 'fluff', hem: 'flat', hemAt: 0.95, hemRib: true, belt: false, waist: 1.04, chestK: 1.1, thick: 0.9, armK: 1.02, legThick: 0.9, taper: 0.8, shoeK: 0.82 },
  [
    // 1P:クリーム色のフリース+黒いジョガーパンツ
    vecBase({ s: '#e8bd98', S: '#bd8d68', sh: '#f4d5b8', h: '#1b1618', hs: '#0e0b0c', hh: '#3a3236',
      g: '#eee8da', G: '#c8bfac', gh: '#fbf7ef', w: '#c8ac84', t: '#1c1c22', T: '#0e0e12', th: '#34343c',
      x: '#e3b792', X: '#bd8c68', xh: '#f2cfb0' }),
    // 2P:紺のフリース
    vecBase({ s: '#e4b995', S: '#b98965', sh: '#f1d1b4', h: '#1b1618', hs: '#0e0b0c', hh: '#3a3236',
      g: '#41507a', G: '#2c3858', gh: '#6376a6', w: '#cfd3de', t: '#1c1c22', T: '#0e0e12', th: '#34343c',
      x: '#e0b490', X: '#ba8966', xh: '#efccae' })
  ]);
