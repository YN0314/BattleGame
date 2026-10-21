// 対戦画面。ラウンド制(先取り)・制限時間・導入/KO演出・試合終了メニューを持つ。
//
// 進行(phase):
//   intro  : 「ROUND n」→「FIGHT!」。キャラは動けない
//   fight  : 操作できる。体力0か時間切れでラウンド終了
//   ko     : KO/TIME UP の演出(前半はスローモーション)。終わると次のラウンド or 試合終了
//   result : 試合終了。メニュー(もう一度 / タイトルへ)
(function () {
  'use strict';

  function blank() {
    return { up: false, down: false, left: false, right: false, punch: false, kick: false, start: false };
  }
  const NEUTRAL = { held: blank(), pressed: blank() };      // 何も押していない入力

  const Battle = {
    view: 'battle',
    params: { mode: '2p' },
    fighters: [],
    hitstop: 0,         // ヒットストップの残りフレーム
    phase: 'intro',
    phaseFrame: 0,      // 現在のphaseに入ってからの経過フレーム
    roundNo: 1,
    wins: [0, 0],       // 各プレイヤーの取得ラウンド数
    timer: 0,           // 残り時間(フレーム)
    winner: -1,         // そのラウンドの勝者(0:1P / 1:2P / -1:引き分け)
    reason: 'ko',       // ラウンドの終わり方('ko' | 'time')
    matchWinner: -1,    // 試合の勝者(result中のみ有効)
    menuItems: ['REMATCH', 'TITLE'],
    menuIndex: 0,

    // 試合の開始(タイトルなどから呼ばれる)
    enter: function (params) {
      this.params = params || { mode: '2p' };
      this.wins = [0, 0];
      this.roundNo = 1;
      this.matchWinner = -1;
      this.startRound();
    },

    // 互換用:最初からやり直す
    init: function () { this.enter(this.params); },

    startRound: function () {
      const F = Game.Logic.Fighter;
      const W = Game.Config.display.width;
      this.fighters = [
        new F({ index: 0, x: W * 0.32, facing: 1, palette: 0 }),
        new F({ index: 1, x: W * 0.68, facing: -1, palette: 1 })
      ];
      Game.Logic.Projectile.reset();
      Game.Core.InputHistory.reset();
      Game.Render.Effects.reset();
      Game.Render.UI.reset();
      this.hitstop = 0;
      this.winner = -1;
      this.reason = 'ko';
      this.timer = Game.Config.game.round.timeLimitSec * Game.Config.game.fps;
      this.setPhase('intro');
    },

    setPhase: function (name) {
      this.phase = name;
      this.phaseFrame = 0;
    },

    // 残り時間(秒・切り上げ)。表示用
    seconds: function () {
      return Math.max(0, Math.ceil(this.timer / Game.Config.game.fps));
    },

    // プレイヤーごとの入力。CPU対戦では2Pの入力をCPUが作る
    inputFor: function (i) {
      return Game.Core.Input.get(i);
    },

    // 世界を1コマ進める。resolve が true のときだけ攻撃の当たり判定を行う
    stepWorld: function (inputs, resolve) {
      const f = this.fighters;
      const E = Game.Render.Effects;

      f[0].update(inputs[0], f[1]);
      f[1].update(inputs[1], f[0]);
      Game.Logic.Physics.separate(f[0], f[1]);

      // のけぞり中のキャラが画面端で動けないとき、攻撃側を押し返す
      // (離れた位置からの飛び道具などで相手を押してしまわないよう、近いときだけ)
      const near = Math.abs(f[0].x - f[1].x) < 50;
      if (near && f[0].wallPush) { f[1].x -= f[0].wallPush; f[1].clampToStage(); }
      if (near && f[1].wallPush) { f[0].x -= f[1].wallPush; f[0].clampToStage(); }

      Game.Logic.Projectile.update();
      if (!resolve) return;

      // 近接攻撃 → 飛び道具の順に判定する
      const hits = Game.Logic.Combat.resolve(f);
      const shotHits = Game.Logic.Projectile.resolve(f);
      hits.concat(shotHits).forEach(function (h) {
        if (h.clash) {
          E.spawnGuard(h.point.x, h.point.y);       // 飛び道具の相殺
          return;
        }
        if (h.blocked) {
          // ガード:止まる時間は短め、画面は揺らさない
          Battle.hitstop = Math.max(Battle.hitstop, Math.max(3, h.move.hitstop - 2));
          E.spawnGuard(h.point.x, h.point.y);
        } else {
          Battle.hitstop = Math.max(Battle.hitstop, h.move.hitstop);
          E.spawnHit(h.point.x, h.point.y, h.defender.health <= 0);
        }
      });
    },

    // ラウンドの決着。勝ち数を加えて KO 演出へ
    endRound: function (reason) {
      const f = this.fighters;
      const fx = Game.Config.display.effects;
      this.reason = reason;
      if (f[0].health === f[1].health) this.winner = -1;
      else this.winner = f[0].health > f[1].health ? 0 : 1;

      if (this.winner < 0) { this.wins[0]++; this.wins[1]++; }   // 引き分けは両者に1勝
      else this.wins[this.winner]++;

      if (reason === 'ko') {
        Game.Render.Effects.shake(fx.shakeKo, fx.shakeKoFrames);
        this.hitstop = Math.max(this.hitstop, 12);
      }
      this.setPhase('ko');
    },

    // KO演出が終わったあと:試合が決まっていれば結果へ、そうでなければ次のラウンドへ
    afterRound: function () {
      const need = Game.Config.game.round.winsToTake;
      const a = this.wins[0] >= need, b = this.wins[1] >= need;
      if (a || b) {
        this.matchWinner = (a && b) ? -1 : (a ? 0 : 1);
        this.menuIndex = 0;
        this.setPhase('result');
      } else {
        this.roundNo++;
        this.startRound();
      }
    },

    update: function () {
      const In = Game.Core.Input;
      const R = Game.Config.game.round;
      const f = this.fighters;

      Game.Render.Effects.update();
      // ヒットストップ中は入力の読み取りも止める(止まっている間の押下が失われないように)
      if (this.hitstop > 0) {
        this.hitstop--;
        return;
      }

      In.update();
      this.phaseFrame++;

      if (this.phase === 'intro') {
        this.stepWorld([NEUTRAL, NEUTRAL], false);
        if (this.phaseFrame >= R.introFrames) {
          Game.Core.InputHistory.reset();
          this.setPhase('fight');
        }
      } else if (this.phase === 'fight') {
        this.stepWorld([this.inputFor(0), this.inputFor(1)], true);
        if (f[0].health <= 0 || f[1].health <= 0) {
          this.endRound('ko');
        } else if (--this.timer <= 0) {
          this.timer = 0;
          this.endRound('time');
        }
      } else if (this.phase === 'ko') {
        // 前半はスローモーション(世界を数コマに1回だけ進める)
        const slow = this.phaseFrame < R.koSlowFrames && this.phaseFrame % R.koSlowRate !== 0;
        if (!slow) this.stepWorld([NEUTRAL, NEUTRAL], false);
        if (this.phaseFrame >= R.koFrames) this.afterRound();
      } else if (this.phase === 'result') {
        this.stepWorld([NEUTRAL, NEUTRAL], false);
        if (this.phaseFrame > R.resultLockFrames) this.updateMenu();
      }

      Game.Render.UI.update(f);
    },

    updateMenu: function () {
      const nav = Game.Core.SceneManager.nav();
      const n = this.menuItems.length;
      if (nav.up) this.menuIndex = (this.menuIndex + n - 1) % n;
      if (nav.down) this.menuIndex = (this.menuIndex + 1) % n;
      if (nav.confirm) {
        if (this.menuIndex === 0) this.enter(this.params);
        else Game.Core.SceneManager.go('title');
      }
    },

    render: function () {
      Game.Render.Renderer.draw(this);
      Game.Core.Debug.show(this);
    }
  };

  Game.Scenes.Battle = Battle;
  Game.Core.SceneManager.register('battle', Battle);
})();
