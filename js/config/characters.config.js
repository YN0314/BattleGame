// キャラクターの定義。技そのものは moves.config.js(技ライブラリ)にあり、ここでは「どの技を使うか」を決める。
//   name       : 表示名
//   stage      : このキャラが戦うステージ(display.config.js の stage.list のキー。対戦の舞台は1Pのキャラで決まる)
//   tag        : 選択画面とVS画面に出す短い肩書き(英大文字・数字のみ)
//   sprite     : 見た目の種類(palettes.js の Game.Data.Looks のキー。'hero' = 道着、'nakagawa' = ワイシャツ姿)
//   body       : 体の数値の上書き(physics.config.js の項目名。書かなければ共通の値)
//   normals    : 通常技の割り当て。左=技の枠(ポーズ名と同じ)、右=技ライブラリの技名
//   normals の throw: 投げ技(書かなければそのキャラは投げられない)
//   specials   : 使える必殺技(技ライブラリの技名)。コマンドが重なる場合は先に書いたものを優先
//   overrides  : 技の数値の上書き。{ 技名: { 項目: 値 } }(同じ技でもこのキャラだけ威力を変える、など)
//                projectile の中の項目は { projectile: { damage: 12 } } のように書く
Game.Config.characters = {
  order: ['hero', 'nakagawa', 'mei', 'boris', 'isa', 'jax', 'priya', 'hero_sheet'],     // 選択画面に並べる順

  hero: {
    name: 'HERO',
    stage: 'street', tag: 'KARATE',
    sprite: 'hero',
    body: {},
    normals: {
      standPunch: 'standPunch', standKick: 'standKick',
      crouchPunch: 'crouchPunch', crouchKick: 'crouchKick',
      jumpPunch: 'jumpPunch', jumpKick: 'jumpKick',
      throw: 'throw'
    },
    // 飛び道具・昇竜・超必殺技の「基本の型」
    specials: ['superfireball', 'uppercut', 'fireball'],
    overrides: {}
  },

  // 写真(ワイシャツ・ネクタイ・スラックス・眼鏡)をもとにしたキャラ。ため技と投げ中心の「事務職」スタイル
  //   書類ばらまき(←ため→+P)・カバン投げ(↓↘→+P)・ヒールキック(↓ため↑+K)・叩きつけ(半回転+P)・超必殺 OVERTIME
  //   足は遅め・ジャンプは低めだが、通常技のリーチは長い
  nakagawa: {
    name: 'NAKAGAWA',
    stage: 'karaoke', tag: 'OFFICE',
    sprite: 'nakagawa',
    body: { walkSpeed: 1.35, jumpVelocity: -6.6 },
    normals: {
      standPunch: 'standPunch', standKick: 'standKick',
      crouchPunch: 'crouchPunch', crouchKick: 'crouchKick',
      jumpPunch: 'jumpPunch', jumpKick: 'jumpKick',
      throw: 'throw'
    },
    specials: ['overtime', 'flashkick', 'slam', 'briefcase', 'paperToss'],   // slam は ←↓→ を含むため briefcase より先
    overrides: {
      standPunch: { hitbox: { x: 6, y: -40, w: 24, h: 8 } },               // リーチが長い
      standKick: { damage: 9 },
      flashkick: { damage: 13 }
    }
  },

  // 仮キャラ:中国の女性。小柄で素早く、蹴り技が得意(足は速いが威力は軽め)
  mei: {
    name: 'MEI',
    stage: 'street', tag: 'CHINA',
    sprite: 'mei',
    body: { walkSpeed: 1.8, jumpVelocity: -7.5 },
    normals: {
      standPunch: 'standPunch', standKick: 'standKick',
      crouchPunch: 'crouchPunch', crouchKick: 'crouchKick',
      jumpPunch: 'jumpPunch', jumpKick: 'jumpKick',
      throw: 'throw'
    },
    specials: ['superfireball', 'flyKick', 'flashkick', 'fireball'],
    overrides: { standKick: { damage: 9 }, flashkick: { damage: 13 }, standPunch: { damage: 6 } }
  },

  // 仮キャラ:ロシアの大男。動きは遅いが威力が大きく、投げ(叩きつけ)が強い
  boris: {
    name: 'BORIS',
    stage: 'street', tag: 'RUSSIA',
    sprite: 'boris',
    body: { walkSpeed: 1.15, jumpVelocity: -6.4 },
    normals: {
      standPunch: 'standPunch', standKick: 'standKick',
      crouchPunch: 'crouchPunch', crouchKick: 'crouchKick',
      jumpPunch: 'jumpPunch', jumpKick: 'jumpKick',
      throw: 'throw'
    },
    specials: ['superfireball', 'slam', 'uppercut', 'tackle'],
    overrides: { standPunch: { damage: 10 }, standKick: { damage: 11 }, uppercut: { damage: 20 }, slam: { damage: 26 } }
  },

  // 仮キャラ:ブラジルの女性。蹴り中心(カポエイラ風)で足が速い
  isa: {
    name: 'ISA',
    stage: 'street', tag: 'BRAZIL',
    sprite: 'isa',
    body: { walkSpeed: 1.7, jumpVelocity: -7.2 },
    normals: {
      standPunch: 'standPunch', standKick: 'standKick',
      crouchPunch: 'crouchPunch', crouchKick: 'crouchKick',
      jumpPunch: 'jumpPunch', jumpKick: 'jumpKick',
      throw: 'throw'
    },
    specials: ['superfireball', 'spinKick', 'flashkick', 'fireball'],
    overrides: { standKick: { damage: 10 }, crouchKick: { damage: 8 }, flashkick: { damage: 14 } }
  },

  // 仮キャラ:アメリカのボクサー。パンチ中心でバランス型
  jax: {
    name: 'JAX',
    stage: 'street', tag: 'USA',
    sprite: 'jax',
    body: { walkSpeed: 1.45, jumpVelocity: -6.8 },
    normals: {
      standPunch: 'standPunch', standKick: 'standKick',
      crouchPunch: 'crouchPunch', crouchKick: 'crouchKick',
      jumpPunch: 'jumpPunch', jumpKick: 'jumpKick',
      throw: 'throw'
    },
    specials: ['superfireball', 'straight', 'uppercut', 'fireball'],
    overrides: { standPunch: { damage: 9 }, crouchPunch: { damage: 8 }, uppercut: { damage: 18 } }
  },

  // 仮キャラ:インドの女性。投げと飛び道具をあわせ持つ技巧派
  priya: {
    name: 'PRIYA',
    stage: 'street', tag: 'INDIA',
    sprite: 'priya',
    body: { walkSpeed: 1.5, jumpVelocity: -7.0 },
    normals: {
      standPunch: 'standPunch', standKick: 'standKick',
      crouchPunch: 'crouchPunch', crouchKick: 'crouchKick',
      jumpPunch: 'jumpPunch', jumpKick: 'jumpKick',
      throw: 'throw'
    },
    specials: ['superfireball', 'chakram', 'flashkick', 'slam', 'fireball'],
    overrides: { slam: { damage: 18 }, flashkick: { damage: 12 } }
  },

  // 画像(スプライトシート)で動くことの確認用サンプル。ヒーローの絵を画像に書き出したもので、技はヒーローと同じ。
  // 不要なら、この定義と order の 'hero_sheet'、palettes.js の hero_sheet を消してよい
  hero_sheet: {
    name: 'HERO SHEET',
    stage: 'scramble', tag: 'SAMPLE',
    sprite: 'hero_sheet',
    body: {},
    normals: {
      standPunch: 'standPunch', standKick: 'standKick',
      crouchPunch: 'crouchPunch', crouchKick: 'crouchKick',
      jumpPunch: 'jumpPunch', jumpKick: 'jumpKick',
      throw: 'throw'
    },
    specials: ['superfireball', 'uppercut', 'fireball'],
    overrides: {}
  }
};
