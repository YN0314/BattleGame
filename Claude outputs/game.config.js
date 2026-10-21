// ゲーム全体のルールに関する設定。
// 時間の単位:ゲーム内部は「フレーム」。人が読む項目だけ「秒」で書く。
Game.Config.game = {
  fps: 60,                 // 1秒あたりの更新回数(固定)
  maxFrameSkipMs: 250,     // 処理落ち時に一度に進める時間の上限(ミリ秒)

  fighter: {
    maxHealth: 100         // 体力の最大値(ステップ2から使用)
  },

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
