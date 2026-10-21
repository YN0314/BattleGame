// キャラクター。状態機械と移動、攻撃、必殺技を持つ。描画には一切触れない。
// 状態:idle(待機) walk(歩く) jump(ジャンプ) crouch(しゃがみ)
//       attack(地上攻撃) jumpattack(空中攻撃) special(必殺技) landing(必殺技後の着地硬直)
//       throwing(投げ中) thrown(投げられ中)
//       throwing(投げ中) thrown(投げられ中)
//       hitstun(のけぞり) blockstun(ガード硬直) down(ダウン) getup(起き上がり) ko(敗北)
(function () {
  'use strict';

  class Fighter {
    constructor(opts) {
      this.index = opts.index || 0;           // 1P=0 / 2P=1(入力履歴の参照に使う)
      this.x = opts.x;                        // 体の中心X
      this.y = Game.Config.display.floorY;    // 足元のY(大きいほど下)
      this.vx = 0;
      this.vy = 0;
      this.facing = opts.facing;              // 1:右向き / -1:左向き
      this.char = Game.Logic.Character.get(opts.character);   // キャラクター定義(技・体の数値)
      this.P = this.char.body;                // このキャラの体の数値
      this.palette = opts.palette;            // 0:1P色 / 1:2P色
      this.state = 'idle';
      this.stateFrame = 0;                    // 現在の状態になってからのフレーム数
      this.onGround = true;

      this.health = Game.Config.game.fighter.maxHealth;
      this.move = null;                       // 出している技の枠(キャラの moves のキー)
      this.attackFrame = 0;                   // 技を出してからのフレーム数
      this.hitDone = false;                   // この技がすでに当たったか(多段ヒット防止)
      this.airAttackUsed = false;             // このジャンプで空中攻撃を出したか
      this.stunFrames = 0;                    // のけぞり・ガード硬直・着地硬直の長さ
      this.wallPush = 0;                      // 画面端で動けなかった分(相手を押し返すのに使う)
      this.backHeld = false;                  // 相手と反対方向を押しているか(ガードの条件)
      this.downHeld = false;                  // 下を押しているか(しゃがみガードの条件)
      this.upWait = 0;                        // ため技の「↑+ボタン」を待っているフレーム数(ジャンプを少し遅らせる)
      this.throwEvent = null;
      this.chargeReady = [];                  // ため完了している技の名前(表示用)
      this.meterFlash = 0;                    // ゲージが1本たまった合図の残りフレーム
      this.techEvent = null;                  // 投げ抜けが起きた瞬間のイベント
      this.meter = 0;                         // 必殺技ゲージ
      this.superEvent = null;                 // 超必殺技を出した瞬間のイベント(対戦画面が読み取って演出する)
      this.grabbed = false;                   // 投げでつかめたか
      this.grabber = null;                    // 自分をつかんでいる相手(投げられ中)                 // 投げが決まった瞬間のイベント(対戦画面が読み取って演出する)
      this.upWait = 0;                        // ため技の「↑+ボタン」を待っているフレーム数(ジャンプを少し遅らせる)
      this.throwEvent = null;                 // 投げが決まった瞬間のイベント(対戦画面が読み取って演出する)
      this.guardCrouch = false;               // しゃがみガードで受けたか(ポーズと高さに使う)
    }

    get moveData() {
      return this.move ? this.char.moves[this.move] : null;
    }

    // 当たり判定に使う高さ
    get height() {
      const P = this.P;
      const m = this.moveData;
      const crouching = this.state === 'crouch' || this.state === 'landing' ||
        (this.state === 'attack' && m && m.crouch) ||
        (this.state === 'blockstun' && this.guardCrouch);
      return crouching ? P.crouchHeight : P.standHeight;
    }

    // 攻撃を受けられる状態か(ダウン中や、必殺技の出始めの無敵中は受けない)
    get vulnerable() {
      if (this.state === 'down' || this.state === 'getup' || this.state === 'ko' || this.state === 'thrown') return false;
      if (this.state === 'special') {
        const m = this.moveData;
        if (m && m.invuln && this.attackFrame < m.invuln) return false;
      }
      return true;
    }

    // 攻撃判定が出ているか
    get attackActive() {
      const m = this.moveData;
      if (!m || this.hitDone || !m.hitbox) return false;
      if (this.state !== 'attack' && this.state !== 'jumpattack' && this.state !== 'special') return false;
      return this.attackFrame >= m.startup && this.attackFrame < m.startup + m.active;
    }

    setState(s) {
      if (this.state !== s) {
        this.state = s;
        this.stateFrame = 0;
      }
    }

    // input: Game.Core.Input.get(i) の戻り値 / opponent: 相手の Fighter
    update(input, opponent) {
      const P = this.P;
      const h = input.held;
      this.stateFrame++;
      this.wallPush = 0;
      // ガードの条件は毎フレームの入力で決まる(攻撃を受けた瞬間に後ろを押していればガード)
      this.backHeld = this.facing > 0 ? h.left : h.right;
      this.downHeld = h.down;

      switch (this.state) {
        case 'hitstun': case 'blockstun': case 'down': case 'getup': case 'ko':
          this.updateDamaged();
          return;
        case 'attack':
          // 出始めに同時押しがあれば、通常技を投げに切り替える
          if (this.attackFrame <= Game.Config.input.throwWindowFrames && this.tryThrow(input, opponent)) return;
          this.updateGroundAttack();
          return;
        case 'throwing':
          this.updateThrow(opponent);
          return;
        case 'thrown': {
          // 投げ抜け:つかまれた直後に、パンチ+キックの同時押し
          const gm = this.grabber && this.grabber.moveData;
          const ip = input.pressed, ih = input.held;
          if (gm && gm.techFrames && this.stateFrame <= gm.techFrames && ((ip.punch && ih.kick) || (ip.kick && ih.punch))) {
            this.techThrow(this.grabber);
            return;
          }
          this.vx = 0;
          // 投げた側がやられるなどで投げが中断されたら解放される(念のため時間でも解放)
          if (!this.grabber || this.grabber.state !== 'throwing' || this.stateFrame > 70) {
            this.y = Game.Config.display.floorY;
            this.grabber = null;
            this.setState('idle');
          }
          return;
        }
        case 'jumpattack':
          this.attackFrame++;
          this.stepAir();
          return;
        case 'special':
          this.updateSpecial();
          return;
        case 'landing':
          this.vx = 0;
          if (this.stateFrame >= this.stunFrames) this.setState('idle');
          return;
      }

      if (this.onGround) {
        // 地上では常に相手の方を向く
        if (opponent.x > this.x) this.facing = 1;
        else if (opponent.x < this.x) this.facing = -1;

        if (!h.up) this.upWait = 0;
        const special = this.detectSpecial(input, opponent);
        const atk = this.pressedAttack(input);
        if (special) {
          if (this.char.moves[special].throw) this.beginThrow(special, opponent);   // コマンド投げ
          else this.startSpecial(special);
        } else if (this.tryThrow(input, opponent)) {
          // 投げが始まった(状態は tryThrow が切り替える)
        } else if (h.up) {
          if (this.upWait < 6 && this.chargeReadyUp()) {
            // ↑+ボタンのため技が出せる状態なら、ボタンを待つため、ジャンプを少しだけ遅らせる
            this.upWait++;
            this.vx = 0;
            this.setState('crouch');
          } else {
            // ジャンプ:離陸の瞬間に横方向の速度が決まる
            this.vy = P.jumpVelocity;
            this.vx = ((h.right ? 1 : 0) - (h.left ? 1 : 0)) * P.jumpSpeed;
            this.onGround = false;
            this.airAttackUsed = false;
            this.setState('jump');
          }
        } else if (atk) {
          this.startAttack((h.down ? 'crouch' : 'stand') + atk, 'attack');
        } else if (h.down) {
          this.vx = 0;
          this.setState('crouch');
        } else if (h.left !== h.right) {
          const dir = h.right ? 1 : -1;
          const forward = dir === this.facing;
          this.vx = dir * P.walkSpeed * (forward ? 1 : P.backwalkRatio);
          this.setState('walk');
        } else {
          this.vx = 0;
          this.setState('idle');
        }
      } else if (this.state === 'jump' && !this.airAttackUsed && this.stateFrame >= 1) {
        const atk = this.pressedAttack(input);
        if (atk) {
          this.airAttackUsed = true;
          this.startAttack('jump' + atk, 'jumpattack');
        }
      }

      if (!this.onGround) this.stepAir();
      else this.moveX(this.vx);
    }

    // 押した瞬間のボタン。'Punch' / 'Kick' / null
    pressedAttack(input) {
      if (input.pressed.punch) return 'Punch';
      if (input.pressed.kick) return 'Kick';
      return null;
    }

    // ボタンを押した瞬間に、直近の入力が必殺技のコマンドになっていれば技名を返す
    detectSpecial(input, opp) {
      if (!input.pressed.punch && !input.pressed.kick) return null;
      const H = Game.Core.InputHistory;
      const C = Game.Config.input.commands;
      const shotOut = Game.Logic.Projectile.countFor(this) > 0;   // 飛び道具は同時に1発まで
      // CPUは技名を直接伝える
      if (input.special) {
        const sm = this.char.moves[input.special];
        if (!sm || (sm.projectile && shotOut && !sm.cost)) return null;
        if (sm.cost && this.meter < sm.cost) return null;
        if (sm.throw && !opp.onGround) return null;
        return input.special;
      }
      for (let i = 0; i < this.char.specials.length; i++) {
        const name = this.char.specials[i];
        const sm = this.char.moves[name];
        const cmd = C[sm.command];
        if (!input.pressed[sm.button || 'punch']) continue;
        if (sm.cost && this.meter < sm.cost) continue;             // 超必殺技はゲージが足りないと出ない
        if (sm.projectile && shotOut && !sm.cost) continue;
        // コマンド投げは、相手が近く、地上にいるときだけ(遠いときは他の技に譲る)
        if (sm.throw && (!opp.onGround || Math.abs(opp.x - this.x) > sm.needClose)) continue;
        if (input.held.up && cmd.type !== 'charge') continue;      // ↑を押している間は、ため技以外は出ない(ジャンプ優先)
        if (H.match(this.index, this.facing, cmd)) return name;
      }
      return null;
    }

    // 「↑」で解放するため技が、いま出せる状態か(ジャンプを少し待つかどうかの判断)
    chargeReadyUp() {
      const H = Game.Core.InputHistory;
      const C = Game.Config.input.commands;
      return this.char.specials.some((name) => {
        const cmd = C[this.char.moves[name].command];
        return cmd.type === 'charge' && cmd.release.indexOf(8) >= 0 && H.match(this.index, this.facing, cmd);
      });
    }

    // ---- 投げ ----
    // この技(投げ)で、相手をつかめるか
    canGrab(t, opp) {
      const ok = { idle: 1, walk: 1, crouch: 1, blockstun: 1, landing: 1 };
      return this.onGround && opp.onGround && !!ok[opp.state] && Math.abs(opp.x - this.x) <= t.range;
    }

    // 通常の投げ:パンチとキックの同時押しで、近くにいる地上の相手を投げる。成立したら true
    tryThrow(input, opp) {
      const t = this.char.moves.throw;
      const p = input.pressed, h = input.held;
      if (!t || !((p.punch && h.kick) || (p.kick && h.punch))) return false;
      if (this.state !== 'idle' && this.state !== 'walk' && this.state !== 'crouch' && this.state !== 'attack') return false;
      if (!this.canGrab(t, opp)) return false;
      this.beginThrow('throw', opp);
      return true;
    }

    // 投げ動作の開始。相手をつかめれば相手は動けなくなり、つかめなければ空振りになる
    beginThrow(name, opp) {
      const t = this.char.moves[name];
      this.move = name;
      this.attackFrame = 0;
      this.hitDone = false;
      this.vx = 0;
      this.setState('throwing');
      this.grabbed = this.canGrab(t, opp);
      if (this.grabbed) {
        opp.move = null;
        opp.vx = 0;
        opp.grabber = this;
        opp.setState('thrown');
      }
    }

    // 投げ抜け:お互いにダメージなしで弾かれる
    techThrow(g) {
      const dir = g.x <= this.x ? 1 : -1;
      const floorY = Game.Config.display.floorY;
      this.techEvent = { x: (g.x + this.x) / 2, y: floorY - 28 };
      g.move = null;
      g.grabbed = false;
      this.grabber = null;
      this.y = floorY;
      [[this, dir], [g, -dir]].forEach(function (pair) {
        const fi = pair[0];
        fi.stunFrames = 14;
        fi.vx = pair[1] * 2.2;
        fi.setState('hitstun');
      });
    }

    // ため技のため完了状態(表示用)
    chargeStatus() {
      const H = Game.Core.InputHistory;
      const C = Game.Config.input.commands;
      return this.char.specials.filter((name) => {
        const cmd = C[this.char.moves[name].command];
        return cmd.type === 'charge' && H.charged(this.index, this.facing, cmd);
      });
    }

    updateThrow(opp) {
      const t = this.moveData;
      const floorY = Game.Config.display.floorY;
      const af = ++this.attackFrame;
      this.vx = 0;
      const victim = this.grabbed && opp.state === 'thrown';
      if (victim && af < t.hitFrame) {
        opp.x = this.x + this.facing * t.grabDist;     // つかんだ位置に保つ
        opp.clampToStage();
        if (t.lift && af >= t.liftStart) {              // 持ち上げる
          opp.y = floorY - t.lift * Math.min(1, (af - t.liftStart) / Math.max(1, t.hitFrame - 1 - t.liftStart));
        }
      }
      if (victim && af === t.hitFrame) {
        opp.y = floorY;
        opp.applyHit(t, this.facing);
        this.throwEvent = { attacker: this, defender: opp, move: t, blocked: false,
          point: { x: (this.x + opp.x) / 2, y: this.y - 14 } };
      }
      if (af >= (this.grabbed ? t.frames : (t.whiffFrames || t.frames))) {
        this.move = null;
        this.setState('idle');
      }
    }

    startAttack(name, state) {
      this.move = name;
      this.attackFrame = 0;
      this.hitDone = false;
      if (state === 'attack') this.vx = 0;
      this.setState(state);
    }

    startSpecial(name) {
      const sm = this.char.moves[name];
      if (sm.cost) {                          // 超必殺技:ゲージを消費して、演出を依頼する
        this.meter -= sm.cost;
        this.superEvent = { owner: this, move: sm };
      }
      this.move = name;
      this.attackFrame = 0;
      this.hitDone = false;
      this.vx = 0;
      this.setState('special');
    }

    updateGroundAttack() {
      const m = this.moveData;
      this.attackFrame++;
      this.vx = 0;
      if (this.attackFrame >= m.startup + m.active + m.recovery) {
        this.move = null;
        this.setState('idle');
      }
    }

    // 必殺技:startup のフレームで飛び道具を出す/飛び上がる
    updateSpecial() {
      const m = this.moveData;
      this.attackFrame++;
      if (this.attackFrame === m.startup) {
        if (m.projectile) Game.Logic.Projectile.spawn(this, m.projectile);
        if (m.launch) {
          this.onGround = false;
          this.vy = m.launch.vy;
          this.vx = this.facing * m.launch.vx;
        }
      }
      if (!this.onGround) {
        this.stepAir();
        return;
      }
      this.vx = 0;
      if (this.attackFrame >= m.startup + m.active + m.recovery) {
        this.move = null;
        this.setState('idle');
      }
    }

    // 空中の物理(ジャンプ中・空中攻撃中・昇竜の上昇中)
    stepAir() {
      const P = this.P;
      const floorY = Game.Config.display.floorY;
      this.vy += P.gravity;
      this.y += this.vy;
      this.moveX(this.vx);
      if (this.y >= floorY) {                 // 着地
        const m = this.moveData;
        this.y = floorY;
        this.vy = 0;
        this.vx = 0;
        this.onGround = true;
        if (this.state === 'special' && m && m.landRecovery) {
          this.stunFrames = m.landRecovery;   // 昇竜を外すと大きな着地硬直
          this.move = null;
          this.setState('landing');
        } else {
          this.move = null;
          this.setState('idle');
        }
      }
    }

    // のけぞり・ガード硬直・ダウン・起き上がり・KO
    updateDamaged() {
      const P = this.P;
      const floorY = Game.Config.display.floorY;

      if (!this.onGround) {
        this.vy += P.gravity;
        this.y += this.vy;
        this.wallPush = this.moveX(this.vx);
        if (this.y >= floorY) {
          this.y = floorY;
          this.vy = 0;
          this.vx *= 0.5;
          this.onGround = true;
          this.setState(this.health <= 0 ? 'ko' : 'down');
        }
        return;
      }

      this.vx *= P.hitFriction;
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
      this.wallPush = this.moveX(this.vx);

      if ((this.state === 'hitstun' || this.state === 'blockstun') && this.stateFrame >= this.stunFrames) {
        this.setState('idle');
      } else if (this.state === 'down' && this.stateFrame >= P.downFrames) {
        this.setState('getup');
      } else if (this.state === 'getup' && this.stateFrame >= P.getupFrames) {
        this.setState('idle');
      }
    }

    // この技をガードできるか。地上で後ろを押していて、技の高さに合った構えのときだけ可能
    canBlock(move) {
      if (!this.onGround || !this.backHeld) return false;
      const s = this.state;
      if (s !== 'idle' && s !== 'walk' && s !== 'crouch' && s !== 'blockstun') return false;
      if (move.level === 'low' && !this.downHeld) return false;     // 下段は立ちガード不可
      if (move.level === 'high' && this.downHeld) return false;     // 上段はしゃがみガード不可
      return true;
    }

    // 攻撃を受ける。move は技(または飛び道具)のデータ、dir は攻撃側の向き(1 or -1)
    // 戻り値:'block'(ガードした) / 'hit'(受けた)
    takeHit(move, dir) {
      const P = this.P;

      if (this.canBlock(move)) {
        this.move = null;
        this.state = 'blockstun';
        this.stateFrame = 0;
        this.guardCrouch = this.downHeld;
        this.stunFrames = move.blockstun;
        this.vx = dir * move.blockKnockback;
        if (move.chip) this.health = Math.max(1, this.health - Math.floor(move.damage * move.chip));   // 削りダメージ(倒しはしない)
        return 'block';
      }

      return this.applyHit(move, dir);
    }

    // ダメージとのけぞり(ガードできない攻撃・投げもここを通る)
    applyHit(move, dir) {
      const P = this.P;
      this.health = Math.max(0, this.health - move.damage);
      this.move = null;
      this.hitDone = false;
      this.state = 'hitstun';
      this.stateFrame = 0;

      const dead = this.health <= 0;
      if (dead || !this.onGround || move.knockdown) {
        // 空中で受けた・倒された・ダウンを奪う技を受けた場合は、吹き飛んで倒れる
        this.onGround = false;
        this.vy = dead ? P.koPop : P.airHitPop;
        this.vx = dir * move.knockback * (dead ? 1.6 : 1.2);
      } else {
        this.stunFrames = move.hitstun;
        this.vx = dir * move.knockback;
      }
      return 'hit';
    }

    // 横に動く。画面端で動けなかった分を返す
    moveX(dx) {
      const P = this.P;
      const half = P.bodyWidth / 2;
      const before = this.x;
      this.x = Math.max(P.stageLeft + half, Math.min(P.stageRight - half, before + dx));
      return dx - (this.x - before);
    }

    clampToStage() {
      this.moveX(0);
    }

    // 描画側が使う「どのポーズの何コマ目か」
    pose() {
      const A = Game.Config.display.anim;
      switch (this.state) {
        case 'walk': return { name: 'walk', frame: Math.floor(this.stateFrame / A.walk) };
        case 'jump': return { name: 'jump', frame: 0 };
        case 'crouch': return { name: 'crouch', frame: 0 };
        case 'attack':
        case 'jumpattack':
        case 'special': {
          const m = this.moveData;
          const t = this.attackFrame;
          const phase = t < m.startup ? 0 : (t < m.startup + m.active ? 1 : 2);
          return { name: m.pose || this.move, frame: phase };
        }
        case 'throwing': {
          const m = this.moveData;
          const t = this.attackFrame;
          const at = m.poseAt || [0, m.hitFrame, m.hitFrame + 10];
          let fr = 0;
          if (this.grabbed) at.forEach(function (start, i) { if (t >= start) fr = i; });
          return { name: m.pose, frame: fr };
        }
        case 'thrown': return { name: 'hit', frame: 0 };
        case 'landing': return { name: 'uppercutLand', frame: 0 };
        case 'hitstun': return { name: 'hit', frame: 0 };
        case 'blockstun': return { name: this.guardCrouch ? 'crouchGuard' : 'guard', frame: 0 };
        case 'down': case 'ko': return { name: 'down', frame: 0 };
        case 'getup': return { name: 'crouch', frame: 0 };
        default: return { name: 'idle', frame: Math.floor(this.stateFrame / A.idle) };
      }
    }
  }

  Game.Logic.Fighter = Fighter;
})();
