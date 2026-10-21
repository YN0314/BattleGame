// CPUの強さ。数値を変えてリロードすれば調整できる。
//   reaction     : 相手の攻撃を見てから反応するまでの遅れ(フレーム)。大きいほど弱い
//   blockChance  : 見えた攻撃をガードしようとする確率(0〜1)
//   aggression   : 距離を詰めて攻める積極さ(0〜1)
//   attackChance : 攻撃できる距離で実際に攻撃する確率(0〜1)
//   fireball     : 遠い間合いで波動拳を撃つ確率(0〜1)
//   tech         : 投げられたとき投げ抜けを狙う確率(0〜1) / techDelay: 気づくまでの遅れ(フレーム。投げ抜けの受付は技の techFrames まで)
//   super        : 必殺技ゲージがあるとき、超必殺技を狙う確率(0〜1。行動を決めるたびに判定)
//   throw        : 近い間合いで投げを狙う確率(0〜1)
//   uppercut     : ジャンプで近づく相手に昇竜拳を出す確率(0〜1)
//   jump         : 遠い間合いでジャンプして近づく確率(0〜1)
//   idleFrames   : 次の行動を決めるまでの間隔 [最小, 最大](フレーム)
Game.Config.ai = {
  levels: {
    easy: {
      label: 'EASY',
      reaction: 24, blockChance: 0.25, aggression: 0.45, attackChance: 0.45,
      fireball: 0.15, uppercut: 0.2, throw: 0.1, super: 0.1, tech: 0.2, techDelay: 8, jump: 0.1, idleFrames: [18, 40]
    },
    normal: {
      label: 'NORMAL',
      reaction: 10, blockChance: 0.6, aggression: 0.7, attackChance: 0.75,
      fireball: 0.3, uppercut: 0.55, throw: 0.18, super: 0.3, tech: 0.5, techDelay: 4, jump: 0.2, idleFrames: [8, 22]
    }
  },
  // 間合い(px)
  range: { close: 44, mid: 100, threat: 58 }
};
