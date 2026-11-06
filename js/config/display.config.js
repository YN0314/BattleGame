// 画面・描画に関する設定。
Game.Config.display = {
  width: 384,              // ゲーム内の座標系の幅(判定や物理はこの単位で動く)
  height: 224,             // ゲーム内の座標系の高さ
  floorY: 192,             // 地面の高さ(キャラの足元のY座標)

  pixelScale: 4,           // 描画の細かさ(1=粗い、2=2倍、4=4倍)。キャラ・背景・文字・演出のすべてがこの細かさで描かれる。変更後はリロード
  maxScale: 2,             // 画面への拡大倍率の上限(キャンバスの1ドットを画面で何倍にするか。ウィンドウに合わせて自動で縮小される)

  debug: true,             // 画面下のデバッグ表示(H キーで当たり判定の箱を表示)

  anim: {                  // アニメーション1コマの長さ(フレーム)
    idle: 20,
    walk: 6,
    tweenSteps: 3          // ポーズとポーズの間に作る中間コマの細かさ(3 = 間を3段階に分ける。1で中間なし)
  },

  stage: {                 // 背景
    parallax: 14,          // 戦っている2人の位置に合わせて層がずれる量(ゲーム単位。0でずれなし)
    animate: true,         // false で、星・窓・雲・観客の動きを止める
    id: 'street',       // 使うステージ(下の list のキー。'night' = 夜の街)。対戦中に B キーで切り替えられる
    // ステージ一覧。builder = 自動で描くステージ(render/stageXxx.js)、image = tools/make_stage.py で作った画像、parallax = 2人に合わせてずれる量(0〜1)
    list: {
      street: { builder: 'StageStreet', name: 'STATION FRONT' },                       // 駅前の喫煙所(池袋の写真をもとにデフォルメして自動で描く)
      tokyo: { builder: 'StageTokyo', name: 'BRICK STATION' },                         // 赤レンガの駅舎(東京駅の写真をもとにデフォルメして自動で描く)
      karaoke: { builder: 'StageKaraoke', name: 'DOWNTOWN' },                     // 繁華街の交差点(カラオケ店のある街角の写真をもとにデフォルメして自動で描く)
      scramble: { builder: 'StageScramble', name: 'SCRAMBLE CROSSING' },                   // スクランブル交差点(渋谷の交差点の写真をもとにデフォルメして自動で描く)
      photo: { image: 'assets/stage_ikebukuro.png', parallax: 0.5, name: 'PHOTO' },   // 写真をそのままドット絵にしたもの(参考)
      night: { name: 'NIGHT CITY' }      // 画像なし = 自動生成の夜の街
    }
  },

  effects: {
    sparkFrames: 8,        // ヒット火花の長さ
    shakeHit: 1,           // ヒット時の画面揺れ(px)
    shakeKo: 3,            // KO時の画面揺れ(px)
    shakeFrames: 6,        // 画面揺れの長さ(フレーム)
    shakeKoFrames: 14
  },

  gauge: {                 // 体力ゲージ
    width: 144,
    height: 8,
    margin: 16,            // 画面端からの距離
    top: 12,
    trailSpeed: 0.006      // 減ったぶんの赤い帯が縮む速さ(1フレームあたりの割合)
  }
};
