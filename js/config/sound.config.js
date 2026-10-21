// 効果音の設定。音声ファイルは使わず、ブラウザの Web Audio で合成している。
//   enabled : false にすると無音
//   master  : 全体の音量(0〜1)
//   volumes : 音ごとの音量の倍率
// ゲーム中に M キーで消音/解除を切り替えられる。
Game.Config.sound = {
  enabled: true,
  master: 0.5,
  volumes: {
    swing: 0.5, hitLight: 1.0, hitHeavy: 1.0, guard: 0.8, fireball: 0.8, uppercut: 0.8,
    ko: 1.0, charge: 0.6, ready: 0.8, super: 0.9, move: 0.5, ok: 0.7, back: 0.5, round: 0.8, fight: 0.9, timeup: 0.8, win: 0.8
  }
};
