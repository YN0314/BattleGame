// キャラの動きに関する設定。単位:座標は内部解像度のピクセル、時間はフレーム。
Game.Config.physics = {
  walkSpeed: 1.5,          // 前進の速さ(px/フレーム)
  backwalkRatio: 0.8,      // 後退の速さ(前進に対する割合)

  jumpVelocity: -7,        // ジャンプの初速(上向きが負)
  gravity: 0.35,           // 重力(px/フレーム²)
  jumpSpeed: 1.8,          // ジャンプ中の横移動の速さ(離陸時に決まる)

  bodyWidth: 24,           // 体の幅(押し合い・喰らい判定に使う)
  standHeight: 48,         // 立ちの高さ
  crouchHeight: 32,        // しゃがみの高さ

  hitFriction: 0.85,       // 地上でのけぞっているときの減速(1フレームごとに速度へ掛ける)
  airHitPop: -3,           // 空中で攻撃を受けたときの浮き上がり(上向きが負)
  koPop: -4,               // KOされたときの浮き上がり
  downFrames: 40,          // ダウンしている長さ
  getupFrames: 16,         // 起き上がりの長さ

  stageLeft: 0,            // ステージの左端
  stageRight: 384          // ステージの右端
};
