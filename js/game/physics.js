// キャラ同士の押し合い。体が重なったら左右に押し離す。
(function () {
  'use strict';

  function overlapsVertically(a, b) {
    // y は足元。頭の位置は y - height。片方がもう片方の頭上を越えているときは重ならない
    return a.y > b.y - b.height && b.y > a.y - a.height;
  }

  function separate(a, b) {
    const minDist = (a.P.bodyWidth + b.P.bodyWidth) / 2;
    if (!overlapsVertically(a, b)) return;

    const dx = b.x - a.x;
    if (Math.abs(dx) >= minDist) return;

    const dir = dx !== 0 ? (dx > 0 ? 1 : -1) : (a.facing || 1);
    const push = (minDist - Math.abs(dx)) / 2;

    a.x -= dir * push;
    b.x += dir * push;
    a.clampToStage();
    b.clampToStage();

    // 画面端で押し切れなかった分は、もう片方を動かして解消する
    if (Math.abs(b.x - a.x) < minDist) {
      b.x = a.x + dir * minDist;
      b.clampToStage();
      if (Math.abs(b.x - a.x) < minDist) {
        a.x = b.x - dir * minDist;
        a.clampToStage();
      }
    }
  }

  Game.Logic.Physics = { separate: separate };
})();
