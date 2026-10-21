// キャラクターの定義。技そのものは moves.config.js(技ライブラリ)にあり、ここでは「どの技を使うか」を決める。
//   name       : 表示名
//   sprite     : 使うスプライトの種類(現在は 'hero' のみ。キャラを増やすときに追加)
//   body       : 体の数値の上書き(physics.config.js の項目名。書かなければ共通の値)
//   normals    : 通常技の割り当て。左=技の枠(ポーズ名と同じ)、右=技ライブラリの技名
//   normals の throw: 投げ技(書かなければそのキャラは投げられない)
//   specials   : 使える必殺技(技ライブラリの技名)。コマンドが重なる場合は先に書いたものを優先
//   overrides  : 技の数値の上書き。{ 技名: { 項目: 値 } }(同じ技でもこのキャラだけ威力を変える、など)
//                projectile の中の項目は { projectile: { damage: 12 } } のように書く
Game.Config.characters = {
  order: ['hero'],     // 選択画面に並べる順

  hero: {
    name: 'HERO',
    sprite: 'hero',
    body: {},
    normals: {
      standPunch: 'standPunch', standKick: 'standKick',
      crouchPunch: 'crouchPunch', crouchKick: 'crouchKick',
      jumpPunch: 'jumpPunch', jumpKick: 'jumpKick',
      throw: 'throw'
    },
    specials: ['superfireball', 'flashkick', 'uppercut', 'slam', 'fireball', 'sonic'],   // slam は ←↓→ を含むため fireball より先
    overrides: {}
  }
};
