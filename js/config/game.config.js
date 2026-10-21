// ゲーム全体のルールに関する設定。
// 時間の単位:ゲーム内部は「フレーム」。人が読む項目だけ「秒」で書く。
Game.Config.game = {
  fps: 60,                 // 1秒あたりの更新回数(固定)
  maxFrameSkipMs: 250,     // 処理落ち時に一度に進める時間の上限(ミリ秒)

  fighter: {
    maxHealth: 100         // 体力の最大値(ステップ2から使用)
  },

  // 必殺技ゲージ(超必殺技用)。攻撃を当てる・ガードされる・受けるとたまる。ラウンドをまたいで持ち越し、試合開始で0に戻る
  //   max      : ゲージの最大値
  //   segment  : 表示上の1本の大きさ(超必殺技の消費量 cost の単位)
  //   gainHit  : 技を当てたとき、攻撃側が「ダメージ × この値」たまる
  //   gainBlock: 技をガードされたとき、攻撃側が「ダメージ × この値」たまる
  //   gainTaken: 攻撃を受けたとき、受けた側が「ダメージ × この値」たまる(ガード時はその半分)
  meter: {
    max: 200,
    segment: 100,
    gainHit: 2.0,
    gainBlock: 1.0,
    gainTaken: 1.0
  },

  superFlashFrames: 40,    // 超必殺技の発動演出の長さ(フレーム。この間は世界が止まる)

  // ラウンド制
  round: {
    winsToTake: 2,         // 先取ラウンド数
    timeLimitSec: 60,      // 制限時間(秒)
    introFrames: 90,       // ラウンド開始演出の長さ(フレーム)
    roundCallFrames: 50,   // 開始演出のうち「ROUND n」を出す長さ(残りは「FIGHT!」)
    koFrames: 120,         // KO演出の長さ(フレーム)
    koSlowFrames: 70,      // KO演出のうちスローモーションにする長さ(フレーム)
    koSlowRate: 2,         // スローの度合い(2 = 半分の速さ)
    resultLockFrames: 45   // 試合終了後、メニュー操作を受け付けるまでの待ち(フレーム)
  }
};
