// 技ライブラリ。すべての技をここに名前付きで登録する(どのキャラがどの技を使うかは characters.config.js)。
// 数値を変えてリロードすれば調整できる。
//   command        : 必殺技のコマンド名(input.config.js の commands のキー)
//   cost           : 必殺技ゲージの消費量(超必殺技)。足りないと出ない
//   noMeter        : true ならこの技ではゲージがたまらない
//   title          : 超必殺技の発動演出に出す名前(英大文字・数字のみ)
//   chip           : ガードされても、ダメージの何割かを削る(削り)
//   button         : 必殺技を出すボタン('punch'(省略時) / 'kick')
//   pose           : 使うポーズ名(省略すると技の枠の名前)
//   needClose      : コマンド投げが出る最大の距離(これより遠いと出ない。range との間は空振りになる)
//   lift/liftStart : 投げで相手を持ち上げる高さ(px)と、持ち上げ始めるフレーム
//   whiffFrames    : 投げを空振りしたときの動作の長さ(フレーム)
//   poseAt         : 投げのポーズ切り替えフレーム(例 [0,6,18,30])
//   techFrames     : 投げ抜けできるフレーム数(投げられた側が、つかまれてからこの間にパンチ+キック同時押しで抜けられる)。省略すると抜けられない
//   throw          : true なら投げ技(range=届く距離, grabDist=つかんだ位置, hitFrame=投げ飛ばす瞬間, frames=全体の長さ)
//   startup        : 発生(攻撃判定が出るまでのフレーム数)
//   active         : 持続(攻撃判定が出ているフレーム数)
//   recovery       : 硬直(判定が消えたあと動けないフレーム数)。ジャンプ攻撃は着地まで続くため使わない
//   damage         : ダメージ
//   hitstun        : 当たった相手ののけぞりフレーム数
//   knockback      : 当たった相手が後ろへ押される初速(px/フレーム)
//   hitstop        : ヒット時に両者が止まるフレーム数(ガードされたときは少し短くなる)
//   blockstun      : ガードされたときの相手のガード硬直フレーム数
//   blockKnockback : ガードされたときの相手が押される初速(px/フレーム)
//   knockdown      : true なら、当たった相手はダウンする
//   hitbox         : 攻撃判定の箱。足元の中央が原点で、右向きの場合の座標(左向きは自動で反転)。yは上が負
//   level          : ガードのされ方
//                    'high' = 上段(立ちガードのみ可) / 'low' = 下段(しゃがみガードのみ可) / 'mid' = 中段(どちらでも可)
Game.Config.moves = {
  standPunch: {
    startup: 4, active: 3, recovery: 8,
    damage: 5, hitstun: 14, knockback: 2.2, hitstop: 5,
    blockstun: 10, blockKnockback: 1.6,
    hitbox: { x: 6, y: -40, w: 20, h: 8 }, level: 'mid'
  },
  standKick: {
    startup: 7, active: 4, recovery: 12,
    damage: 8, hitstun: 18, knockback: 3.0, hitstop: 7,
    blockstun: 13, blockKnockback: 2.2,
    hitbox: { x: 4, y: -33, w: 24, h: 10 }, level: 'mid'
  },
  crouchPunch: {
    startup: 5, active: 3, recovery: 8, crouch: true,
    damage: 4, hitstun: 13, knockback: 1.8, hitstop: 5,
    blockstun: 9, blockKnockback: 1.4,
    hitbox: { x: 6, y: -23, w: 20, h: 8 }, level: 'mid'
  },
  crouchKick: {
    startup: 7, active: 4, recovery: 14, crouch: true,
    damage: 6, hitstun: 18, knockback: 2.6, hitstop: 6,
    blockstun: 13, blockKnockback: 2.0, knockdown: true,
    hitbox: { x: 2, y: -9, w: 25, h: 8 }, level: 'low'
  },
  jumpPunch: {
    startup: 5, active: 6, recovery: 0, air: true,
    damage: 6, hitstun: 16, knockback: 2.2, hitstop: 5,
    blockstun: 12, blockKnockback: 1.6,
    hitbox: { x: 4, y: -37, w: 21, h: 9 }, level: 'high'
  },
  jumpKick: {
    startup: 6, active: 8, recovery: 0, air: true,
    damage: 8, hitstun: 18, knockback: 2.8, hitstop: 6,
    blockstun: 14, blockKnockback: 2.0,
    hitbox: { x: 2, y: -27, w: 24, h: 10 }, level: 'high'
  },

  // ---- 必殺技(コマンドは input.config.js の commands) ----
  // 波動拳風:startup のフレームで飛び道具を出す。その後 recovery フレーム動けない。
  //   projectile: speed=速さ(px/フレーム) offsetX/offsetY=出る位置 w/h=当たりの大きさ
  //               以降は通常技と同じ(damage, hitstun, knockback, hitstop, blockstun, blockKnockback, level)
  fireball: {
    special: true, command: 'fireball',
    startup: 12, active: 0, recovery: 22,
    projectile: {
      speed: 3.2, offsetX: 20, offsetY: -33, w: 16, h: 12,
      damage: 10, hitstun: 18, knockback: 3.0, hitstop: 6,
      blockstun: 14, blockKnockback: 2.4, level: 'mid'
    }
  },
  // 昇竜拳風:startup のフレームで飛び上がる。
  //   invuln=技の出始めの無敵フレーム数  launch=飛び上がりの速さ(vy:上向きが負, vx:前へ)
  //   active=上昇中に攻撃判定が出ているフレーム数  landRecovery=着地後に動けないフレーム数
  uppercut: {
    special: true, command: 'uppercut',
    startup: 3, active: 10, recovery: 0,
    invuln: 6, launch: { vy: -7.4, vx: 1.6 }, landRecovery: 24,
    damage: 14, hitstun: 20, knockback: 2.6, hitstop: 8,
    blockstun: 18, blockKnockback: 2.4, knockdown: true,
    hitbox: { x: 0, y: -58, w: 22, h: 46 }, level: 'mid'
  },

  // ---- ため技 ----
  // ソニックブーム風:←ため→+パンチ。速くて小さい飛び道具。出したあとの隙は大きめ。
  sonic: {
    special: true, command: 'sonic', pose: 'fireball',
    startup: 10, active: 0, recovery: 26,
    projectile: {
      speed: 5.2, offsetX: 20, offsetY: -33, w: 14, h: 8,
      damage: 7, hitstun: 15, knockback: 2.4, hitstop: 5,
      blockstun: 12, blockKnockback: 2.0, level: 'mid'
    }
  },
  // サマーソルト風:↓ため↑+キック。後ろへ跳びながら蹴り上げる。ダウンを奪う。
  flashkick: {
    special: true, command: 'flashkick', button: 'kick',
    startup: 4, active: 12, recovery: 0,
    launch: { vy: -8, vx: -1.0 }, landRecovery: 18,
    damage: 12, hitstun: 20, knockback: 2.4, hitstop: 7,
    blockstun: 16, blockKnockback: 2.2, knockdown: true,
    hitbox: { x: -2, y: -62, w: 26, h: 48 }, level: 'mid'
  },

  // ---- 投げ技(パンチ+キック同時押し)----
  // ガード中の相手にも成立する。相手が地上にいて、range 以内のときだけ。
  throw: {
    throw: true, pose: 'throw',
    range: 32, grabDist: 26, hitFrame: 12, frames: 36, techFrames: 11,
    damage: 12, hitstun: 20, knockback: 2.6, hitstop: 8, knockdown: true,
    blockstun: 0, blockKnockback: 0, level: 'throw'
  },

  // 叩きつけ(コマンド投げ):←↙↓↘→+パンチ。通常の投げより遠くまで届き、ダメージが大きい。
  // 相手を持ち上げて地面に叩きつける。外すと大きな隙。
  slam: {
    throw: true, command: 'slam', pose: 'slam',
    needClose: 72, range: 52, grabDist: 26,
    liftStart: 6, lift: 26, hitFrame: 18, frames: 52, whiffFrames: 32, poseAt: [0, 6, 18, 30],
    damage: 22, hitstun: 24, knockback: 1.2, hitstop: 12, knockdown: true,
    blockstun: 0, blockKnockback: 0, level: 'throw'
  },

  // ---- 超必殺技(必殺技ゲージを cost だけ消費)----
  // スターブラスト:↓↘→↓↘→+パンチ(キーボード向けに ↓→↓→ でも可)。
  // 出始めに無敵。大きな飛び道具で、普通の飛び道具を打ち消して進む。ガードされても削る。
  superfireball: {
    special: true, command: 'superfireball', pose: 'fireball',
    cost: 100, noMeter: true, title: 'STAR BLAST', chip: 0.2,
    startup: 14, active: 0, recovery: 34, invuln: 14,
    projectile: {
      speed: 4.2, offsetX: 24, offsetY: -34, w: 44, h: 30, big: true,
      damage: 34, hitstun: 30, knockback: 4.0, hitstop: 12, knockdown: true,
      blockstun: 22, blockKnockback: 3.4, level: 'mid', chip: 0.2, noMeter: true
    }
  }
};
