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
    flash: null,        // 超必殺技の発動演出 { frame, len, title, owner }
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
      this.fighters = [];                       // 前の試合のゲージを引き継がないように空にする
      this.ai = this.params.mode === 'cpu' ? Game.Logic.AI.create(this.params.level) : null;
      this.startRound();
    },

    // 互換用:最初からやり直す
    init: function () { this.enter(this.params); },

    startRound: function () {
      const F = Game.Logic.Fighter;
      const W = Game.Config.display.width;
      const prevMeter = this.fighters.map(function (fi) { return fi.meter; });   // ゲージはラウンドをまたいで持ち越す
      this.fighters = [
        new F({ index: 0, x: W * 0.32, facing: 1, palette: 0, character: (this.params.chars || [])[0] }),
        new F({ index: 1, x: W * 0.68, facing: -1, palette: 1, character: (this.params.chars || [])[1] })
      ];
      this.fighters.forEach(function (fi, i) { fi.meter = prevMeter[i] || 0; });
      this.flash = null;
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
      if (i === 1 && this.ai) return this.ai.think(this.fighters[1], this.fighters[0]);
      return Game.Core.Input.get(i);
    },

    // 世界を1コマ進める。resolve が true のときだけ攻撃の当たり判定を行う
    stepWorld: function (inputs, resolve) {
      const f = this.fighters;
      const E = Game.Render.Effects;

      f[0].update(inputs[0], f[1]);
      f[1].update(inputs[1], f[0]);
      this.attackSounds();
      f.forEach(function (fi) {
        if (fi.techEvent) {                              // 投げ抜け
          E.spawnGuard(fi.techEvent.x - 4, fi.techEvent.y);
          E.spawnGuard(fi.techEvent.x + 4, fi.techEvent.y - 3);
          Game.Core.Sound.play('guard');
          fi.techEvent = null;
        }
        const before = fi.chargeReady.length;             // ため完了の表示と合図
        fi.chargeReady = resolve ? fi.chargeStatus() : [];
        if (fi.chargeReady.length > before) Game.Core.Sound.play('charge');
      });
      f.forEach(function (fi) {
        if (fi.superEvent) { Battle.startFlash(fi.superEvent); fi.superEvent = null; }
      });
      Game.Logic.Physics.separate(f[0], f[1]);

      // のけぞり中のキャラが画面端で動けないとき、攻撃側を押し返す
      // (離れた位置からの飛び道具などで相手を押してしまわないよう、近いときだけ)
      const near = Math.abs(f[0].x - f[1].x) < 50;
      if (near && f[0].wallPush) { f[1].x -= f[0].wallPush; f[1].clampToStage(); }
      if (near && f[1].wallPush) { f[0].x -= f[1].wallPush; f[0].clampToStage(); }

      Game.Logic.Projectile.update();
      const throws = [];
      f.forEach(function (fi) { if (fi.throwEvent) { throws.push(fi.throwEvent); fi.throwEvent = null; } });
      if (!resolve) return;

      // 近接攻撃 → 飛び道具の順に判定する
      const hits = Game.Logic.Combat.resolve(f);
      const shotHits = Game.Logic.Projectile.resolve(f);
      hits.concat(shotHits, throws).forEach(function (h) {
        if (h.clash) {
          E.spawnGuard(h.point.x, h.point.y);       // 飛び道具の相殺
          Game.Core.Sound.play('guard');
          return;
        }
        Battle.gainMeter(h);
        if (h.blocked) {
          // ガード:止まる時間は短め、画面は揺らさない
          Battle.hitstop = Math.max(Battle.hitstop, Math.max(3, h.move.hitstop - 2));
          E.spawnGuard(h.point.x, h.point.y);
          Game.Core.Sound.play('guard');
        } else {
          Battle.hitstop = Math.max(Battle.hitstop, h.move.hitstop);
          E.spawnHit(h.point.x, h.point.y, h.defender.health <= 0);
          if (h.move.damage >= 15) E.shake(h.move.damage >= 25 ? 3 : 2, 10);   // 大技(叩きつけ・超必殺技)は画面を揺らす
          Game.Core.Sound.play(h.defender.health <= 0 ? 'ko' : (h.move.damage >= 8 ? 'hitHeavy' : 'hitLight'));
        }
      });
    },

    // 超必殺技の発動演出:世界を止め、画面を暗くして技名を出す
    startFlash: function (ev) {
      const len = Game.Config.game.superFlashFrames;
      this.flash = { frame: 0, len: len, title: ev.move.title || 'SUPER', owner: ev.owner.index };
      this.hitstop = Math.max(this.hitstop, len);
      Game.Core.Sound.play('super');
    },

    // 技が当たった・ガードされたときのゲージ増加
    gainMeter: function (h) {
      const M = Game.Config.game.meter;
      if (h.move.noMeter || !h.attacker || !h.defender) return;
      const give = function (fi, v) {
        const before = Math.floor(fi.meter / M.segment);
        fi.meter = Math.min(M.max, fi.meter + v);
        if (Math.floor(fi.meter / M.segment) > before) {     // 1本たまった合図
          fi.meterFlash = 36;
          Game.Core.Sound.play('ready');
        }
      };
      give(h.attacker, h.move.damage * (h.blocked ? M.gainBlock : M.gainHit));
      give(h.defender, h.move.damage * M.gainTaken * (h.blocked ? 0.5 : 1));
    },

    // 技の出始めに音を鳴らす(キャラの技が変わった瞬間を見張る)
    attackSounds: function () {
      const S = Game.Core.Sound;
      this.fighters.forEach(function (fi) {
        const key = (fi.state === 'attack' || fi.state === 'jumpattack' || fi.state === 'special' || fi.state === 'throwing') ? fi.move : null;
        if (key && key !== fi.soundMove) {
          const m = fi.char.moves[key];
          S.play(m.special ? (m.projectile ? 'fireball' : 'uppercut') : 'swing');   // 投げも出始めは素振りの音
        }
        fi.soundMove = key;
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

      if (reason === 'time') Game.Core.Sound.play('timeup');
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
        Game.Core.Sound.play('win');
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
      if (this.flash && ++this.flash.frame >= this.flash.len) this.flash = null;
      // ヒットストップ中は入力の読み取りも止める(止まっている間の押下が失われないように)
      if (this.hitstop > 0) {
        this.hitstop--;
        return;
      }

      In.update();
      this.phaseFrame++;
      f.forEach(function (fi) { if (fi.meterFlash > 0) fi.meterFlash--; });

      if (this.phase === 'intro') {
        if (this.phaseFrame === 1) Game.Core.Sound.play('round');
        if (this.phaseFrame === R.roundCallFrames) Game.Core.Sound.play('fight');
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
      if (nav.up) { this.menuIndex = (this.menuIndex + n - 1) % n; Game.Core.Sound.play('move'); }
      if (nav.down) { this.menuIndex = (this.menuIndex + 1) % n; Game.Core.Sound.play('move'); }
      if (nav.confirm) {
        Game.Core.Sound.play('ok');
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
