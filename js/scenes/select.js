// キャラクター選択画面(ストリートファイター2風)。
//   中央に顔のアイコンが並び、1Pは赤、2Pは青のカーソルで選ぶ。左右に選んでいるキャラの上半身と名前、上にステージの予告。
//   2P対戦:1Pと2Pが同時に選ぶ。1人用:1Pが選ぶと、CPUのキャラがルーレットのように切り替わって決まる。
//   決まったら VS 画面へ(キャラのステージで戦う。ステージは1Pのキャラで決まる)。
//   操作:十字 = カーソル、パンチ/スタート = 決定、キック = 取り消し(誰も決めていなければタイトルへ)
(function () {
  'use strict';

  const COLS = 4;
  const CELL = { w: 30, h: 36, gx: 32, gy: 38, x0: 128, y0: 102 };
  const COLORS = ['#ff4a3a', '#4a8aff'];

  const Select = {
    view: 'select',
    params: { mode: 'cpu' },
    cursor: [0, 0],
    locked: [false, false],
    frame: 0,
    roll: 0,                 // 1人用:CPUのキャラを決めるルーレットの残りコマ数
    done: 0,                 // 全員が決まってからの経過コマ数(0 = まだ)
    fighters: [],

    enter: function (params) {
      this.params = params || { mode: 'cpu' };
      this.cursor = [0, 0];
      this.locked = [false, false];
      this.frame = 0; this.roll = 0; this.done = 0;
      { const ks = Object.keys(Game.Config.display.stage.list || {}); this.stageId = ks[Math.floor(Math.random() * ks.length)] || 'street'; }   // ステージはランダム
      this.focus = 0;                                   // ステージ予告を出すカーソル
      Game.Logic.Projectile.reset();
      Game.Render.Effects.reset();
    },

    ids: function () { return Game.Logic.Character.ids(); },
    twoPlayers: function () { return this.params.mode !== 'cpu'; },

    // プレイヤー i の「押した瞬間」の入力(1人用はどちらの入力でも1Pとして受け付ける)
    pressedOf: function (i) {
      const In = Game.Core.Input;
      if (this.twoPlayers()) return In.get(i).pressed;
      const a = In.get(0).pressed, b = In.get(1).pressed, o = {};
      Object.keys(a).forEach(function (k) { o[k] = a[k] || b[k]; });
      return o;
    },

    update: function () {
      const Snd = Game.Core.Sound, SM = Game.Core.SceneManager;
      Game.Core.Input.update();
      this.frame++;
      const ids = this.ids(), n = ids.length;
      const self = this;

      // 全員が決まったあと:少し待って VS 画面へ
      if (this.done) {
        this.done++;
        if (this.done > 50) this.start();
        return;
      }
      // 1人用:CPUのキャラのルーレット
      if (this.roll > 0) {
        this.roll--;
        if (this.roll % 4 === 0) { this.cursor[1] = (this.cursor[1] + 1) % n; Snd.play('move'); }
        if (this.roll === 0) {
          const others = ids.map(function (id, k) { return k; }).filter(function (k) { return k !== self.cursor[0]; });
          const pool = others.length ? others : [0];
          this.cursor[1] = pool[Math.floor(Math.random() * pool.length)];
          this.locked[1] = true; this.done = 1; this.focus = 0; Snd.play('ok');
        }
        return;
      }

      const players = this.twoPlayers() ? [0, 1] : [0];
      players.forEach(function (p) {
        const pr = self.pressedOf(p);
        if (!self.locked[p]) {
          let moved = false;
          if (pr.left) { self.cursor[p] = (self.cursor[p] + n - 1) % n; moved = true; }
          if (pr.right) { self.cursor[p] = (self.cursor[p] + 1) % n; moved = true; }
          if (pr.up && self.cursor[p] - COLS >= 0) { self.cursor[p] -= COLS; moved = true; }
          if (pr.down && self.cursor[p] + COLS < n) { self.cursor[p] += COLS; moved = true; }
          if (moved) { Snd.play('move'); self.focus = p; }
          if (pr.punch || pr.start) {
            self.locked[p] = true; self.focus = p; Snd.play('ok'); Game.Core.Sound.unlock();
            if (!self.twoPlayers()) self.roll = 36;                 // 1人用:CPUのキャラを決めにいく
          } else if (pr.kick) {
            const anyLocked = self.locked[0] || self.locked[1];
            if (p === 0 && !anyLocked) { Snd.play('back'); SM.go('title'); }
          }
        } else if (pr.kick) {                                    // 決定の取り消し
          self.locked[p] = false; Snd.play('back');
        }
      });
      if (this.twoPlayers() && this.locked[0] && this.locked[1]) { this.done = 1; Snd.play('ok'); }
    },

    start: function () {
      const ids = this.ids();
      const chars = [ids[this.cursor[0]], ids[this.cursor[1]]];
      const stage = this.stageId;
      Game.Core.SceneManager.go('versus', { mode: this.params.mode, level: this.params.level, chars: chars, stage: stage });
    },

    // ---- 描画 ----
    drawScreen: function (ctx) {
      const D = Game.Config.display, Font = Game.Render.Font, P = Game.Render.Portrait;
      const W = D.width, H = D.height, cx = W / 2;
      const ids = this.ids(), t = this.frame;

      // 背景:暗い青に、ゆっくり流れる斜めの帯
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#10183e'); g.addColorStop(1, '#05060f');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(80,110,220,0.10)';
      for (let k = -2; k < 14; k++) {
        const x = ((k * 44 + t * 0.4) % (W + 90)) - 45;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 18, 0); ctx.lineTo(x - 40, H); ctx.lineTo(x - 58, H); ctx.fill();
      }

      // 見出し
      Font.draw(ctx, 'PLAYER SELECT', cx, 7, 2, '#ffe56a', 'center', '#7a1c10');
      Font.draw(ctx, this.twoPlayers() ? 'VS BATTLE' : '1 PLAYER', cx, 22, 1, '#9fb0e8', 'center', '#05050a');

      // ステージの予告(いま見ているキャラのステージ)
      const sid = this.stageId;
      const sdef = (D.stage.list || {})[sid] || {};
      const bx = cx - 42, by = 32, bw = 84, bh = Math.round(84 * D.height / D.width);
      ctx.fillStyle = '#05050a'; ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
      ctx.save();
      ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
      ctx.translate(bx, by); ctx.scale(bw / D.width, bw / D.width);
      Game.Render.Renderer.backgroundOf(sid).draw(ctx, D.width / 2, performance.now());
      ctx.restore();
      ctx.strokeStyle = '#d8d8e6'; ctx.lineWidth = 0.8; ctx.strokeRect(bx - 1.5, by - 1.5, bw + 3, bh + 3);
      Font.draw(ctx, sdef.name || '', cx, by + bh + 5, 1, '#e6e6f2', 'center', '#05050a');

      // 左右の立ち絵と名前
      const self = this;
      [0, 1].forEach(function (p) {
        const x = p === 0 ? 6 : W - 6 - 112, y = 36, w = 112, h = 144;
        const col = COLORS[p];
        const hidden = !self.twoPlayers() && p === 1 && self.roll === 0 && !self.locked[1];       // CPUは未決定
        ctx.fillStyle = 'rgba(5,6,15,0.78)'; ctx.fillRect(x, y, w, h + 28);
        ctx.fillStyle = col; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h + 26, w, 2);
        if (!hidden) {
          const id = ids[self.cursor[p]];
          P.bust(ctx, id, p, x + 4, y + 8, w - 8, h - 8, p === 1);
          const ch = Game.Config.characters[id];
          Font.draw(ctx, ch.name, x + w / 2, y + h + 4, 2, '#ffffff', 'center', '#05050a');
          Font.draw(ctx, ch.tag || '', x + w / 2, y + h + 18, 1, '#9fb0e8', 'center', '#05050a');
        } else {
          Font.draw(ctx, '?', x + w / 2, y + 60, 8, '#3a4270', 'center', '#05050a');
        }
        const tag = self.twoPlayers() ? 'P' + (p + 1) : (p === 0 ? 'P1' : 'CPU');
        Font.draw(ctx, tag, x + 4, y + 5, 1, col, 'left', '#05050a');
        if (self.locked[p] && Math.floor(t / 8) % 2 === 0) Font.draw(ctx, 'OK', x + w - 4 - 8, y + 5, 1, '#ffe56a', 'right', '#05050a');
      });

      // 顔のアイコンのグリッド
      for (let k = 0; k < 8; k++) {
        const col = k % COLS, row = Math.floor(k / COLS);
        const x = CELL.x0 + col * CELL.gx, y = CELL.y0 + row * CELL.gy;
        ctx.fillStyle = '#05060f'; ctx.fillRect(x - 1, y - 1, CELL.w + 2, CELL.h + 2);
        ctx.fillStyle = '#1a2150'; ctx.fillRect(x, y, CELL.w, CELL.h);
        if (k < ids.length) {
          P.face(ctx, ids[k], 0, x + 2, y + 2, CELL.w - 4, CELL.h - 4);
        } else {
          Font.draw(ctx, '?', x + CELL.w / 2, y + 12, 2, '#3a4270', 'center');
        }
      }
      // カーソル(1Pは赤、2Pは青。点滅。決定すると白く光る)
      [0, 1].forEach(function (p) {
        if (!self.twoPlayers() && p === 1 && !self.locked[1] && self.roll === 0) return;
        const k = self.cursor[p];
        const x = CELL.x0 + (k % COLS) * CELL.gx - 2 + (p ? 1 : 0), y = CELL.y0 + Math.floor(k / COLS) * CELL.gy - 2 + (p ? 1 : 0);
        const on = self.locked[p] || Math.floor(t / 6) % 2 === 0;
        ctx.strokeStyle = self.locked[p] ? '#ffffff' : COLORS[p];
        ctx.globalAlpha = on ? 1 : 0.45;
        ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, CELL.w + 2 - 2, CELL.h + 2 - 2);
        ctx.globalAlpha = 1;
      });

      Font.draw(ctx, 'MOVE   PUNCH:OK   KICK:BACK', cx, H - 9, 1, '#7a84b8', 'center', '#05050a');
    },

    render: function () { Game.Render.Renderer.draw(this); }
  };

  Game.Scenes.Select = Select;
  Game.Core.SceneManager.register('select', Select);
})();
