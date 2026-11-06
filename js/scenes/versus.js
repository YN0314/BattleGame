// VS 画面(ストリートファイター2風)。選んだ2人の上半身が左右から入ってきて、中央に VS、下にステージ名。
// しばらくすると対戦へ。パンチ/スタートで飛ばせる。
(function () {
  'use strict';

  const TOTAL = 150;          // この画面を出すコマ数(2.5秒)

  function ease(t) { t = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - t, 3); }

  const Versus = {
    view: 'versus',
    params: {},
    frame: 0,
    fighters: [],

    enter: function (params) {
      this.params = params || {};
      this.frame = 0;
      Game.Core.Sound.play('ok');
    },

    update: function () {
      Game.Core.Input.update();
      this.frame++;
      const nav = Game.Core.SceneManager.nav();
      if ((nav.confirm && this.frame > 20) || this.frame >= TOTAL) {
        const p = this.params;
        Game.Core.SceneManager.go('battle', { mode: p.mode, level: p.level, chars: p.chars, stage: p.stage });
      }
    },

    drawScreen: function (ctx) {
      const D = Game.Config.display, Font = Game.Render.Font, P = Game.Render.Portrait;
      const W = D.width, H = D.height, cx = W / 2, t = this.frame;
      const chars = this.params.chars || [];

      // 背景:戦うステージを暗くして敷く
      Game.Render.Renderer.backgroundOf(this.params.stage).draw(ctx, W / 2, performance.now());
      ctx.fillStyle = 'rgba(5,6,20,0.72)'; ctx.fillRect(0, 0, W, H);
      // 左右の色の斜め面(1P 赤 / 2P 青)
      const slide = ease(t / 24);
      ctx.fillStyle = 'rgba(210,50,40,0.55)';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(cx + 26, 0); ctx.lineTo(cx - 26, H); ctx.lineTo(0, H); ctx.fill();
      ctx.fillStyle = 'rgba(40,90,220,0.55)';
      ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(cx + 26, 0); ctx.lineTo(cx - 26, H); ctx.lineTo(W, H); ctx.fill();

      // 上半身が左右から滑り込む
      const bw = 168, bh = 200;
      const ox = (1 - slide) * 200;
      if (chars[0]) P.bust(ctx, chars[0], 0, 6 - ox, 20, bw, bh, false);
      if (chars[1]) P.bust(ctx, chars[1], 1, W - 6 - bw + ox, 20, bw, bh, true);

      // 名前
      const names = chars.map(function (id) { return (Game.Config.characters[id] || {}).name || ''; });
      const nx = (1 - ease((t - 10) / 20)) * 120;
      Font.draw(ctx, names[0], 10 - nx, 196, 3, '#ffffff', 'left', '#7a1c10');
      Font.draw(ctx, names[1], W - 10 + nx, 196, 3, '#ffffff', 'right', '#1c2a6a');

      // 中央の VS:大きく入って、ゆっくり脈打つ
      const vt = ease((t - 16) / 14);
      if (vt > 0) {
        const pulse = 1 + 0.06 * Math.sin(t * 0.25);
        const sc = Math.max(1, Math.round(14 * vt * pulse));
        Font.draw(ctx, 'VS', cx, 78 - Math.round(sc * 2.5) + 20, sc, '#ffe56a', 'center', '#7a1c10');
      }

      // ステージ名
      const sdef = (D.stage.list || {})[this.params.stage] || {};
      if (t > 30) Font.draw(ctx, sdef.name || '', cx, 18, 1, '#e6e6f2', 'center', '#05050a');
      if (t > 30 && Math.floor(t / 20) % 2 === 0) Font.draw(ctx, 'READY', cx, 150, 2, '#ffffff', 'center', '#05050a');
    },

    render: function () { Game.Render.Renderer.draw(this); }
  };

  Game.Scenes.Versus = Versus;
  Game.Core.SceneManager.register('versus', Versus);
})();
