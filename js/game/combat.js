// 当たり判定とダメージの適用。
// 攻撃判定(攻撃側の箱)と喰らい判定(体の箱)が重なったらヒット。
(function () {
  'use strict';

  // 攻撃判定の箱(ワールド座標)。向きに応じて左右反転する
  function attackRect(f) {
    const hb = f.moveData.hitbox;
    const x = f.facing > 0 ? f.x + hb.x : f.x - hb.x - hb.w;
    return { x: x, y: f.y + hb.y, w: hb.w, h: hb.h };
  }

  // 喰らい判定の箱
  function hurtRect(f) {
    const w = f.P.bodyWidth;
    return { x: f.x - w / 2, y: f.y - f.height, w: w, h: f.height };
  }

  function intersect(a, b) {
    const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
    if (x2 <= x1 || y2 <= y1) return null;
    return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  }

  // 両者の判定をまとめて調べてから適用する(相打ちを成立させるため)
  // 戻り値:ヒットの一覧 [{ attacker, defender, move, point, blocked }]
  function resolve(fighters) {
    const events = [];
    fighters.forEach(function (a, i) {
      const d = fighters[1 - i];
      if (!a.attackActive || !d.vulnerable) return;
      const p = intersect(attackRect(a), hurtRect(d));
      if (p) events.push({ attacker: a, defender: d, move: a.moveData, point: p });
    });
    events.forEach(function (e) {
      e.attacker.hitDone = true;
      e.blocked = e.defender.takeHit(e.move, e.attacker.facing) === 'block';
    });
    return events;
  }

  Game.Logic.Combat = {
    resolve: resolve,
    attackRect: attackRect,
    hurtRect: hurtRect,
    intersect: intersect
  };
})();
