// タイトル画面。最初に「ボタンを押してください」→ モード選択。
//   stage 'press' : ボタン待ち(ここで押されたキー操作が、のちに音を鳴らす許可にもなる)
//   stage 'menu'  : 「VS 2P」「VS CPU」を選ぶ
//   stage 'level' : CPUの強さ(EASY / NORMAL)を選ぶ
(function () {
  'use strict';

  function blank() {
    return { up: false, down: false, left: false, right: false, punch: false, kick: false, start: false };
  }
  const NEUTRAL = { held: blank(), pressed: blank() };

  const Title = {
    view: 'title',
    fighters: [],
    stage: 'press',
    index: 0,
    frame: 0,

    // メニュー項目。enabled が false の項目は選べない(CPUは実装されるまで)
    items: function () {
      return [
        { label: 'VS 2P', enabled: true, mode: '2p' },
        { label: 'VS CPU', enabled: !!Game.Logic.AI, mode: 'cpu' }
      ];
    },

    levelItems: function () {
      return Game.Logic.AI.levels().map(function (k) {
        return { label: Game.Config.ai.levels[k].label, level: k };
      });
    },

    enter: function () {
      const F = Game.Logic.Fighter;
      const W = Game.Config.display.width;
      this.fighters = [
        new F({ index: 0, x: W * 0.22, facing: 1, palette: 0 }),
        new F({ index: 1, x: W * 0.78, facing: -1, palette: 1 })
      ];
      Game.Logic.Projectile.reset();
      Game.Render.Effects.reset();
      Game.Render.UI.reset();
      this.stage = 'press';
      this.index = 0;
      this.levelIndex = 1;
      this.frame = 0;
    },

    update: function () {
      const SM = Game.Core.SceneManager;
      Game.Core.Input.update();
      Game.Render.Effects.update();
      this.frame++;
      this.fighters[0].update(NEUTRAL, this.fighters[1]);
      this.fighters[1].update(NEUTRAL, this.fighters[0]);

      const nav = SM.nav();
      if (this.stage === 'press') {
        if (nav.confirm || nav.back) { this.stage = 'menu'; this.frame = 0; Game.Core.Sound.play('ok'); }
        return;
      }

      if (this.stage === 'level') {
        const lv = this.levelItems();
        const m = lv.length;
        if (nav.up) { this.levelIndex = (this.levelIndex + m - 1) % m; Game.Core.Sound.play('move'); }
        if (nav.down) { this.levelIndex = (this.levelIndex + 1) % m; Game.Core.Sound.play('move'); }
        if (nav.back) { this.stage = 'menu'; Game.Core.Sound.play('back'); }
        else if (nav.confirm) { Game.Core.Sound.play('ok'); SM.go('battle', { mode: 'cpu', level: lv[this.levelIndex].level }); }
        return;
      }

      const items = this.items();
      const n = items.length;
      const move = function (dir) {
        for (let k = 1; k <= n; k++) {
          const j = (Title.index + dir * k + n * 2) % n;
          if (items[j].enabled) { Title.index = j; return; }
        }
      };
      if (nav.up) { move(-1); Game.Core.Sound.play('move'); }
      if (nav.down) { move(1); Game.Core.Sound.play('move'); }
      if (nav.back) { this.stage = 'press'; Game.Core.Sound.play('back'); return; }
      if (nav.confirm && items[this.index].enabled) {
        Game.Core.Sound.play('ok');
        if (items[this.index].mode === 'cpu') { this.stage = 'level'; return; }
        SM.go('battle', { mode: items[this.index].mode });
      }
    },

    render: function () {
      Game.Render.Renderer.draw(this);
    }
  };

  Game.Scenes.Title = Title;
  Game.Core.SceneManager.register('title', Title);
})();
