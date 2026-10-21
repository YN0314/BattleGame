// 技のデータ。数値を変えてリロードすれば調整できる。
//   startup  : 発生(攻撃判定が出るまでのフレーム数)
//   active   : 持続(攻撃判定が出ているフレーム数)
//   recovery : 硬直(判定が消えたあと動けないフレーム数)。ジャンプ攻撃は着地まで続くため使わない
//   damage   : ダメージ
//   hitstun  : 当たった相手ののけぞりフレーム数
//   knockback: 当たった相手が後ろへ押される初速(px/フレーム)
//   hitstop  : ヒット時に両者が止まるフレーム数
//   hitbox   : 攻撃判定の箱。足元の中央が原点で、右向きの場合の座標(左向きは自動で反転)。yは上が負
//   level    : 'high' | 'mid' | 'low'(ガードを作るステップ3で使用)
Game.Config.moves = {
  standPunch: {
    startup: 4, active: 3, recovery: 8,
    damage: 5, hitstun: 14, knockback: 2.2, hitstop: 5,
    hitbox: { x: 6, y: -40, w: 20, h: 8 }, level: 'mid'
  },
  standKick: {
    startup: 7, active: 4, recovery: 12,
    damage: 8, hitstun: 18, knockback: 3.0, hitstop: 7,
    hitbox: { x: 4, y: -33, w: 24, h: 10 }, level: 'mid'
  },
  crouchPunch: {
    startup: 5, active: 3, recovery: 8, crouch: true,
    damage: 4, hitstun: 13, knockback: 1.8, hitstop: 5,
    hitbox: { x: 6, y: -23, w: 20, h: 8 }, level: 'mid'
  },
  crouchKick: {
    startup: 7, active: 4, recovery: 14, crouch: true,
    damage: 6, hitstun: 18, knockback: 2.6, hitstop: 6,
    hitbox: { x: 2, y: -9, w: 25, h: 8 }, level: 'low'
  },
  jumpPunch: {
    startup: 5, active: 6, recovery: 0, air: true,
    damage: 6, hitstun: 16, knockback: 2.2, hitstop: 5,
    hitbox: { x: 4, y: -37, w: 21, h: 9 }, level: 'high'
  },
  jumpKick: {
    startup: 6, active: 8, recovery: 0, air: true,
    damage: 8, hitstun: 18, knockback: 2.8, hitstop: 6,
    hitbox: { x: 2, y: -27, w: 24, h: 10 }, level: 'high'
  }
};
