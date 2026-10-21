// CPU。プレイヤーと同じ形の入力({held, pressed})を毎フレーム作る。
// 必殺技は、コマンドを再現せず input.special で技名を直接伝える(Fighter.detectSpecial が受け取る)。
(function () {
  'use strict';

  const KEYS = ['up', 'down', 'left', 'right', 'punch', 'kick', 'start'];
  function blank() { const o = {}; KEYS.forEach(function (k) { o[k] = false; }); return o; }
  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  class Brain {
    constructor(level) {
      this.cfg = Game.Config.ai.levels[level] || Game.Config.ai.levels.normal;
      this.prev = blank();
      this.plan = null;         // {frames, held, tap, special, age}
      this.wait = 0;            // 次に行動を決めるまでの待ち
      this.threatAge = 0;       // 相手の攻撃が見えてからの経過
      this.guarding = 0;        // ガード行動を続ける残りフレーム
      this.guardLow = false;
      this.thrownAge = 0;       // 投げられてからの経過(投げ抜けのタイミング用)
    }

    // 相手の攻撃(飛び道具含む)が危ないか。見つけたら 'low' | 'high' | 'mid' を返す
    threat(me, opp) {
      const R = Game.Config.ai.range;
      const dx = Math.abs(opp.x - me.x);
      if ((opp.state === 'attack' || opp.state === 'jumpattack' || opp.state === 'special') && opp.move && dx < R.threat + 20) {
        const m = opp.char.moves[opp.move];
        if (m && m.hitbox && opp.attackFrame < m.startup + m.active) return m.level || 'mid';
      }
      const shots = Game.Logic.Projectile.list();
      for (let i = 0; i < shots.length; i++) {
        const p = shots[i];
        if (p.dead || p.owner === me) continue;
        const d = (me.x - p.x) * p.dir;
        if (d > 0 && d < 70) return 'mid';
      }
      return null;
    }

    // 使える必殺技から種類で探す(複数あればランダム)。kind: 'shot'(飛び道具) / 'anti'(対空の飛び上がり技)
    special(me, kind) {
      const found = me.char.specials.filter(function (name) {
        const m = me.char.moves[name];
        if (kind === 'super') return !!m.cost && me.meter >= m.cost;
        if (m.cost) return false;                    // 超必殺技は 'super' のときだけ選ぶ
        return kind === 'shot' ? m.projectile : kind === 'grab' ? m.throw : m.launch;
      });
      return found.length ? found[Math.floor(Math.random() * found.length)] : null;
    }

    choose(me, opp) {
      const shot = this.special(me, 'shot'), anti = this.special(me, 'anti'), grab = this.special(me, 'grab'), sup = this.special(me, 'super');
      const c = this.cfg, R = Game.Config.ai.range;
      const dx = Math.abs(opp.x - me.x);
      const toward = opp.x > me.x ? 'right' : 'left';
      const away = toward === 'right' ? 'left' : 'right';
      const hold = function (keys, frames, extra) {
        const held = blank();
        keys.forEach(function (k) { held[k] = true; });
        return Object.assign({ frames: frames, held: held, tap: null, special: null, age: 0 }, extra || {});
      };
      const hit = function (name, extra) {
        const tap = name.indexOf('Punch') >= 0 ? 'punch' : 'kick';
        const keys = name.indexOf('crouch') === 0 ? ['down'] : [];
        return hold(keys, 24, Object.assign({ tap: tap }, extra || {}));
      };
      const r = Math.random();

      // ゲージがあれば、超必殺技を狙う
      if (sup && Math.random() < c.super) return hold([], 4, { tap: me.char.moves[sup].button || 'punch', special: sup });

      if (anti && !opp.onGround && dx < 70 && Math.random() < c.uppercut) {
        return hold([], 4, { tap: me.char.moves[anti].button || 'punch', special: anti });
      }
      if (dx < R.close) {
        if (grab && Math.random() < c.throw) return hold([], 4, { tap: 'punch', special: grab });           // コマンド投げ
        if (me.char.moves.throw && Math.random() < c.throw) return hold([], 4, { tap: 'punch', tap2: 'kick' });
        if (r < c.attackChance) {
          const k = Math.random();
          return hit(k < 0.35 ? 'standPunch' : k < 0.6 ? 'standKick' : k < 0.8 ? 'crouchKick' : 'crouchPunch');
        }
        return Math.random() < 0.5 ? hold([away], rnd(10, 22)) : hold([], rnd(6, 14));
      }
      if (dx < R.mid) {
        if (r < c.aggression * 0.5) return hold([toward], rnd(8, 18));
        if (shot && r < c.aggression * 0.5 + 0.2 && Game.Logic.Projectile.countFor(me) === 0 && Math.random() < c.fireball * 1.5) {
          return hold([], 4, { tap: me.char.moves[shot].button || 'punch', special: shot });
        }
        if (r < c.aggression) return hit('standKick');
        return hold([], rnd(6, 16));
      }
      // 遠い
      if (shot && Game.Logic.Projectile.countFor(me) === 0 && Math.random() < c.fireball) {
        return hold([], 4, { tap: me.char.moves[shot].button || 'punch', special: shot });
      }
      if (Math.random() < c.jump) return hold(['up', toward], 4);
      if (Math.random() < c.aggression + 0.2) return hold([toward], rnd(14, 30));
      return hold([], rnd(6, 18));
    }

    // 1フレーム分の入力を返す
    think(me, opp) {
      const cur = blank();
      let special = null;

      // 投げられたら、確率で投げ抜け(パンチ+キック同時押し)を狙う
      if (me.state === 'thrown') {
        this.thrownAge++;
        if (this.thrownAge === this.cfg.techDelay && Math.random() < this.cfg.tech) { cur.punch = true; cur.kick = true; }
      } else {
        this.thrownAge = 0;
      }

      // 受け身の行動:動けない間は何もしない(考えるのは自由に動けるときだけ)
      const free = me.state === 'idle' || me.state === 'walk' || me.state === 'crouch';

      // ガード
      const th = free || me.state === 'blockstun' ? this.threat(me, opp) : null;
      if (th) {
        this.threatAge++;
        if (this.threatAge === Math.max(1, this.cfg.reaction) && Math.random() < this.cfg.blockChance) {
          this.guarding = 22;
          this.guardLow = th === 'low';
        }
      } else {
        this.threatAge = 0;
      }
      if (this.guarding > 0) {
        this.guarding--;
        cur[me.facing > 0 ? 'left' : 'right'] = true;
        if (this.guardLow) cur.down = true;
        this.plan = null;
      } else if (free) {
        if (!this.plan) {
          if (this.wait > 0) this.wait--;
          else {
            this.plan = this.choose(me, opp);
            this.wait = rnd(this.cfg.idleFrames[0], this.cfg.idleFrames[1]);
          }
        }
        if (this.plan) {
          const p = this.plan;
          KEYS.forEach(function (k) { cur[k] = p.held[k]; });
          if (p.tap && p.age === 0) { cur[p.tap] = true; if (p.tap2) cur[p.tap2] = true; special = p.special; }
          p.age++;
          if (p.age >= p.frames) this.plan = null;
        }
      } else {
        this.plan = null;
      }

      const out = { held: cur, pressed: blank(), special: special };
      KEYS.forEach((k) => { out.pressed[k] = cur[k] && !this.prev[k]; });
      this.prev = cur;
      return out;
    }
  }

  Game.Logic.AI = {
    create: function (level) { return new Brain(level); },
    levels: function () { return Object.keys(Game.Config.ai.levels); }
  };
})();
