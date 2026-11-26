// キャラクターの定義。技そのものは moves.config.js(技ライブラリ)にあり、ここでは「どの技を使うか」を決める。
//   name       : 表示名
//   stage      : このキャラが戦うステージ(display.config.js の stage.list のキー。対戦の舞台は1Pのキャラで決まる)
//   tag        : 選択画面とVS画面に出す短い肩書き(英大文字・数字のみ)
//   sprite     : 見た目の種類(palettes.js の Game.Data.Looks のキー。'hero' = 道着、'nakagawa' = ワイシャツ姿)
//   body       : 体の数値の上書き(physics.config.js の項目名。書かなければ共通の値)
//   scale      : キャラの大きさの倍率(書かなければ 1。0.9 なら1割小さく)。足元を中心に、絵も当たり判定(体の寸法・喰らい判定・技の判定・投げの距離・飛び道具の出る位置)も同じ倍率で拡大・縮小する。歩く速さ・ジャンプ・技の発生や硬直のフレーム、飛び道具の大きさと速さは変わらない
//   normals    : 通常技の割り当て。左=技の枠(ポーズ名と同じ)、右=技ライブラリの技名
//   normals の throw: 投げ技(書かなければそのキャラは投げられない)
//   specials   : 使える必殺技(技ライブラリの技名)。コマンドが重なる場合は先に書いたものを優先
//   overrides  : 技の数値の上書き。{ 技名: { 項目: 値 } }(同じ技でもこのキャラだけ威力を変える、など)
//                projectile の中の項目は { projectile: { damage: 12 } } のように書く
Game.Config.characters = {
  order: ['hero', 'nakagawa', 'imai', 'ishii', 'kira', 'koshika', 'matsuzaki', 'nakano', 'sasaki', 'takahashi', 'takahashi_k', 'ishii_k'],     // 選択画面に並べる順

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
    sprite: 'nakagawa_v',
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

  // 写真から:今井。バランス型(技は仮)
  imai: {
    name: 'IMAI',
    stage: 'street', tag: 'PHOTO',
    sprite: 'imai_v',
    body: { walkSpeed: 1.5, jumpVelocity: -7.0 },
    normals: {
      standPunch: 'standPunch', standKick: 'standKick',
      crouchPunch: 'crouchPunch', crouchKick: 'crouchKick',
      jumpPunch: 'jumpPunch', jumpKick: 'jumpKick',
      throw: 'throw'
    },
    specials: ['superfireball', 'flashkick', 'uppercut', 'fireball'],
    overrides: { flashkick: { damage: 14 } }
  },

  // 写真から:kira。蹴りの得意な技巧派(技は仮)
  kira: {
    name: 'KIRA',
    stage: 'street', tag: 'PHOTO',
    sprite: 'kira_v',
    body: { walkSpeed: 1.55, jumpVelocity: -7.1 },
    normals: {
      standPunch: 'standPunch', standKick: 'standKick',
      crouchPunch: 'crouchPunch', crouchKick: 'crouchKick',
      jumpPunch: 'jumpPunch', jumpKick: 'jumpKick',
      throw: 'throw'
    },
    specials: ['superfireball', 'flyKick', 'uppercut', 'fireball'],
    overrides: { crouchKick: { damage: 7 }, flyKick: { damage: 13 } }
  },

  // 写真から:koshika。軽やかで素早い(技は仮)
  koshika: {
    name: 'KOSHIKA',
    stage: 'street', tag: 'PHOTO',
    sprite: 'koshika_v',
    body: { walkSpeed: 1.75, jumpVelocity: -7.4 },
    normals: {
      standPunch: 'standPunch', standKick: 'standKick',
      crouchPunch: 'crouchPunch', crouchKick: 'crouchKick',
      jumpPunch: 'jumpPunch', jumpKick: 'jumpKick',
      throw: 'throw'
    },
    specials: ['superfireball', 'spinKick', 'chakram', 'flashkick'],
    overrides: { standKick: { damage: 9 }, spinKick: { damage: 14 } }
  },

  // 写真から:nakano。パンチ中心(技は仮)
  nakano: {
    name: 'NAKANO',
    stage: 'street', tag: 'PHOTO',
    sprite: 'nakano_v',
    body: { walkSpeed: 1.4, jumpVelocity: -6.9 },
    normals: {
      standPunch: 'standPunch', standKick: 'standKick',
      crouchPunch: 'crouchPunch', crouchKick: 'crouchKick',
      jumpPunch: 'jumpPunch', jumpKick: 'jumpKick',
      throw: 'throw'
    },
    specials: ['superfireball', 'straight', 'uppercut', 'fireball'],
    overrides: { standPunch: { damage: 6 }, straight: { damage: 16 } }
  },

  // 写真から:takahashi。掌底と蹴りの手数型(技は仮)
  takahashi: {
    name: 'TAKAHASHI',
    stage: 'street', tag: 'PHOTO',
    sprite: 'takahashi_v',
    body: { walkSpeed: 1.6, jumpVelocity: -7.2 },
    normals: {
      standPunch: 'standPunch', standKick: 'standKick',
      crouchPunch: 'crouchPunch', crouchKick: 'crouchKick',
      jumpPunch: 'jumpPunch', jumpKick: 'jumpKick',
      throw: 'throw'
    },
    specials: ['superfireball', 'chakram', 'flashkick', 'fireball'],
    overrides: { chakram: { projectile: { damage: 11 } } }
  },

  // 写真から:ishii。落ち着いた守りの型。遠くから強いストレートで刺す(技は仮)
  ishii: {
    name: 'ISHII',
    stage: 'street', tag: 'PHOTO',
    sprite: 'ishii_v',
    body: { walkSpeed: 1.5, jumpVelocity: -7.0 },
    normals: {
      standPunch: 'standPunch', standKick: 'standKick',
      crouchPunch: 'crouchPunch', crouchKick: 'crouchKick',
      jumpPunch: 'jumpPunch', jumpKick: 'jumpKick',
      throw: 'throw'
    },
    specials: ['superfireball', 'straight', 'flyKick', 'fireball'],
    overrides: { straight: { damage: 15 } }
  },

  // 写真から:matsuzaki。足さばきの軽い蹴り主体(技は仮)
  matsuzaki: {
    name: 'MATSUZAKI',
    stage: 'street', tag: 'PHOTO',
    sprite: 'matsuzaki_v',
    scale: 0.9,
    body: { walkSpeed: 1.7, jumpVelocity: -7.3 },
    normals: {
      standPunch: 'standPunch', standKick: 'standKick',
      crouchPunch: 'crouchPunch', crouchKick: 'crouchKick',
      jumpPunch: 'jumpPunch', jumpKick: 'jumpKick',
      throw: 'throw'
    },
    specials: ['superfireball', 'spinKick', 'chakram', 'uppercut'],
    overrides: { spinKick: { damage: 13 }, standKick: { damage: 8 } }
  },

  // 写真から:sasaki。勢いで押す突進型(技は仮)
  sasaki: {
    name: 'SASAKI',
    stage: 'street', tag: 'PHOTO',
    sprite: 'sasaki_v',
    body: { walkSpeed: 1.65, jumpVelocity: -7.2 },
    normals: {
      standPunch: 'standPunch', standKick: 'standKick',
      crouchPunch: 'crouchPunch', crouchKick: 'crouchKick',
      jumpPunch: 'jumpPunch', jumpKick: 'jumpKick',
      throw: 'throw'
    },
    specials: ['superfireball', 'flyKick', 'uppercut', 'fireball'],
    overrides: { flyKick: { damage: 12 }, uppercut: { damage: 13 } }
  },
  // kira さんの brave-fighters から:タカハシ(ID は takahashi_k)。技巧・バランス型。絵は kira さんの画像(takahashi_k_sheet)
  //   固有技は、kira さんの技に近いこちらの技で代用している
  //     名刺ショット(↓↘→+P)= fireball / 出世アッパー(→↓↘+P)= uppercut / 定時スライド(下段の滑り込み)= tackle(←ため→+P) / 最終決裁(超必殺)= superfireball
  takahashi_k: {
    name: 'TAKAHASHI K',
    stage: 'tokyo', tag: 'BRAVE',
    sprite: 'takahashi_k',
    body: {},
    normals: {
      standPunch: 'standPunch', standKick: 'standKick',
      crouchPunch: 'crouchPunch', crouchKick: 'crouchKick',
      jumpPunch: 'jumpPunch', jumpKick: 'jumpKick',
      throw: 'throw'
    },
    specials: ['superfireball', 'uppercut', 'tackle', 'fireball'],
    overrides: { superfireball: { title: 'FINAL APPROVAL' } }
  },
  // kira さんの brave-fighters から:ケンタロウ = ISHII(ID は ishii_k)。ヒーロー・バランス型。絵は kira さんの画像(ishii_k_sheet。社内用)
  //   固有技は、kira さんの技に近いこちらの技で代用している
  //     ヒーローショット(↓↘→+P)= fireball / ライジングフィスト(→↓↘+P)= uppercut / ブレイブキック(中段の蹴り)= flyKick(→↓↘+K) / ブレイブインパクト(超必殺)= superfireball
  ishii_k: {
    name: 'ISHII K',
    stage: 'scramble', tag: 'BRAVE',
    sprite: 'ishii_k',
    body: {},
    normals: {
      standPunch: 'standPunch', standKick: 'standKick',
      crouchPunch: 'crouchPunch', crouchKick: 'crouchKick',
      jumpPunch: 'jumpPunch', jumpKick: 'jumpKick',
      throw: 'throw'
    },
    specials: ['superfireball', 'uppercut', 'flyKick', 'fireball'],
    overrides: { superfireball: { title: 'BRAVE IMPACT' } }
  },
};
