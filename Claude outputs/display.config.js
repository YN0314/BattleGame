// 画面・描画に関する設定。
Game.Config.display = {
  width: 384,              // ゲーム内の座標系の幅(判定や物理はこの単位で動く)
  height: 224,             // ゲーム内の座標系の高さ
  floorY: 192,             // 地面の高さ(キャラの足元のY座標)

  pixelScale: 2,           // 描画の細かさ(1=従来、2=縦横2倍の細かさ、3=3倍)。変更後はリロード
  maxScale: 6,             // 画面への拡大倍率の上限(整数倍のみ使う)

  debug: true,             // 画面下のデバッグ表示(H キーで当たり判定の箱を表示)

  anim: {                  // アニメーション1コマの長さ(フレーム)
    idle: 20,
    walk: 6
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
