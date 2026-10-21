// 飛び道具(波動拳風)。まっすぐ飛び、相手に当たるか画面外に出ると消える。
// 同じ持ち主の飛び道具は同時に1発まで。違う持ち主の飛び道具同士は相殺する。
(function () {
  'use strict';

  const list = [];

  function reset() {
    list.length = 0;
  }

  class Projectile {
    constructor(owner, def) {
      this.owner = owner;
      this.def = def;                        // moves.config の projectile 項目
      this.dir = owner.facing;
      this.x = owner.x + this.dir * def.offsetX;
      this.y = owner.y + def.offsetY;
      this.vx = this.dir * def.speed;
      this.age = 0;
      this.dead = false;
    }
    rect() {
      return { x: this.x - this.def.w / 2, y: this.y - this.def.h / 2, w: this.def.w, h: this.def.h };
    }
  }

  function spawn(owner, def) {
    list.push(new Projectile(owner, def));
  }

  function countFor(owner) {
    return list.filter(function (p) { return p.owner === owner && !p.dead; }).length;
  }

  function update() {
    const W = Game.Config.display.width;
    list.forEach(function (p) {
      p.x += p.vx;
      p.age++;
      if (p.x < -24 || p.x > W + 24) p.dead = true;
    });
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].dead) list.splice(i, 1);
    }
  }

  // 戻り値:Combat.resolve と同じ形のイベントの一覧。相殺は { clash: true, point } で返す
  function resolve(fighters) {
    const C = Game.Logic.Combat;
    const events = [];

    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.dead || b.dead || a.owner === b.owner) continue;
        if (C.intersect(a.rect(), b.rect())) {
          // 大きな飛び道具(超必殺技)は、普通の飛び道具だけを消して進む
          const bigA = !!a.def.big, bigB = !!b.def.big;
          if (bigA && !bigB) b.dead = true;
          else if (bigB && !bigA) a.dead = true;
          else a.dead = b.dead = true;
          events.push({ clash: true, point: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } });
        }
      }
    }

    list.forEach(function (p) {
      fighters.forEach(function (f) {
        if (p.dead || f === p.owner || !f.vulnerable) return;
        const pt = C.intersect(p.rect(), C.hurtRect(f));
        if (!pt) return;
        p.dead = true;
        const blocked = f.takeHit(p.def, p.dir) === 'block';
        events.push({ attacker: p.owner, defender: f, move: p.def, point: pt, blocked: blocked });
      });
    });

    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].dead) list.splice(i, 1);
    }
    return events;
  }

  Game.Logic.Projectile = {
    reset: reset, spawn: spawn, update: update, resolve: resolve,
    countFor: countFor,
    list: function () { return list; }
  };
})();
