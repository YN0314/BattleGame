// 当たり判定とダメージの適用。
// 攻撃判定(攻撃側の箱)と喰らい判定(体の箱)が重なったらヒット。
(function () {
  'use strict';

  // 攻撃判定の箱(ワールド座標)。向きに応じて左右反転する
  // hitbox は1つの箱、または時間で切り替わる箱の配列 [{ t, x, y, w, h }, ...]
  // (t = 判定が出てからのフレーム。その時点で t が最大のものを使う。技の途中で腕や脚が伸びる表現に使う)
  function currentBox(f) {
    const hb = f.moveData.hitbox;
    if (!Array.isArray(hb)) return hb;
    const t = f.attackFrame - f.moveData.startup;
    let cur = hb[0];
    hb.forEach(function (b) { if (t >= (b.t || 0)) cur = b; });
    return cur;
  }

  function attackRect(f) {
    const hb = currentBox(f);
    const x = f.facing > 0 ? f.x + hb.x : f.x - hb.x - hb.w;
    return { x: x, y: f.y + hb.y, w: hb.w, h: hb.h };
  }

  // 喰らい判定の箱
  function hurtRect(f) {
    const w = f.P.bodyWidth;
    return { x: f.x - w / 2, y: f.y - f.height, w: w, h: f.height };
  }

  // 喰らい判定の箱の一覧。ポーズの関節位置から、頭・胴・脚・腕を別々の箱にする
  function hurtRects(f) {
    const cfg = Game.Config.combat;
    if (!cfg || !cfg.frameHurtboxes) return [hurtRect(f)];
    const ps = f.pose();
    const ov = Game.Data.Sprites.hurtBoxes(f.char.sprite, ps.name, ps.frame);
    if (ov) {                                  // 画像の見た目でコマごとの箱が定義されていれば、それを使う
      return ov.map(function (b) {
        return { x: f.facing > 0 ? f.x + b[0] : f.x - b[2], y: f.y + b[1], w: b[2] - b[0], h: b[3] - b[1] };
      });
    }
    const j = Game.Data.Sprites.joints(ps.name, ps.frame);
    if (!j) return [hurtRect(f)];
    const H = cfg.hurt;
    const out = [];
    // 関節空間(右向き)の箱を、向きに合わせてワールド座標へ
    const box = function (x0, y0, x1, y1) {
      out.push({ x: f.facing > 0 ? f.x + x0 : f.x - x1, y: f.y + y0, w: x1 - x0, h: y1 - y0 });
    };
    const span = function (a, b, pad) {
      box(Math.min(a[0], b[0]) - pad, Math.min(a[1], b[1]) - pad, Math.max(a[0], b[0]) + pad, Math.max(a[1], b[1]) + pad);
    };
    const hd = j.head, ch = j.chest, hp = j.hip;
    box(hd[0] - H.headR, hd[1] - H.headR, hd[0] + H.headR, hd[1] + H.headR);                       // 頭
    box(Math.min(ch[0], hp[0]) - H.torsoHalf, ch[1] - 6, Math.max(ch[0], hp[0]) + H.torsoHalf, hp[1] + 4);   // 胴
    span([hp[0] - 1.8, hp[1]], j.ankleB, H.limbPad + 0.6);                                          // 脚(奥)
    span([hp[0] + 1.8, hp[1]], j.ankleF, H.limbPad + 0.6);                                          // 脚(手前)
    span(j.shB || [ch[0] - 2.2, ch[1] - 3.4], j.handB, H.limbPad - 0.4);                            // 腕(奥)
    span(j.shF || [ch[0] + 2.2, ch[1] - 3.4], j.handF, H.limbPad - 0.4);                            // 腕(手前)
    return out;
  }

  // 攻撃の箱と、相手の喰らい判定のどれかが重なる点(なければ null)
  function hitPoint(rect, defender) {
    const rs = hurtRects(defender);
    for (let i = 0; i < rs.length; i++) {
      const p = intersect(rect, rs[i]);
      if (p) return p;
    }
    return null;
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
      const p = hitPoint(attackRect(a), d);
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
    hurtRects: hurtRects,
    hitPoint: hitPoint,
    intersect: intersect
  };
})();
