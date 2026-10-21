// キャラクター定義と技ライブラリを組み合わせて、キャラごとの「実際の技データ」を作る。
//   Character.get(id) → { id, name, sprite, body, moves, specials }
//     body    : 体の数値(共通設定+キャラの上書き)
//     moves   : 技の枠(standPunch など・必殺技名)→ 技データ(ライブラリ+上書きを合成したもの)
//     specials: 使える必殺技の技名(優先順)
(function () {
  'use strict';

  const cache = {};

  function merge(base, over) {
    const out = Object.assign({}, base);
    Object.keys(over || {}).forEach(function (k) {
      const v = over[k];
      out[k] = (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object')
        ? merge(base[k], v) : v;
    });
    return out;
  }

  function build(id) {
    const def = Game.Config.characters[id];
    if (!def) throw new Error('キャラクター定義がありません: ' + id);
    const lib = Game.Config.moves;
    const moves = {};
    const put = function (slot, name) {
      if (!lib[name]) throw new Error('技ライブラリに技がありません: ' + name + '(キャラ ' + id + ')');
      moves[slot] = merge(lib[name], (def.overrides || {})[name]);
    };
    Object.keys(def.normals).forEach(function (slot) { put(slot, def.normals[slot]); });
    def.specials.forEach(function (name) { put(name, name); });
    return {
      id: id,
      name: def.name,
      sprite: def.sprite,
      body: merge(Game.Config.physics, def.body),
      moves: moves,
      specials: def.specials.slice()
    };
  }

  function get(id) {
    const key = id || Game.Config.characters.order[0];
    return cache[key] || (cache[key] = build(key));
  }

  Game.Logic.Character = { get: get, ids: function () { return Game.Config.characters.order.slice(); } };
})();
