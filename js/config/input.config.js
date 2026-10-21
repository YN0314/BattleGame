// 入力の割り当て。キーは KeyboardEvent.code(物理的なキー位置)で指定する。
Game.Config.input = {
  keyboard: [
    // 1P
    { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
      punch: ['KeyF'], kick: ['KeyG'], start: ['Enter'] },
    // 2P
    { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
      punch: ['KeyK'], kick: ['KeyL'], start: [] }
  ],

  // コントローラー(標準配置の機種を基準にしたボタン番号)
  gamepad: {
    deadzone: 0.5,                              // スティックをデジタル入力とみなすしきい値
    dpad: { up: 12, down: 13, left: 14, right: 15 },
    punch: [2, 3],                              // Xbox: X, Y / PlayStation: □, △
    kick: [0, 1],                               // Xbox: A, B / PlayStation: ×, ○
    start: [9]
  },

  historyFrames: 90,                            // 入力履歴の保持フレーム数(必殺技のコマンド判定用)

  // 必殺技のコマンド。方向は向きに対して相対的なテンキー番号(6=前, 4=後ろ, 2=下, 3=前下)。
  // motions の各項目は「各段階で許される方向番号」の並び。どれか1つに一致すれば成立。
  // 出すにはコマンドのあとパンチを押す。
  // 投げ:パンチとキックを同時に押す(相手が近いとき)。設定は moves.config.js の throw。
  throwWindowFrames: 3,                         // 通常技の出始めから、投げに切り替えられるフレーム数(同時押しのずれ)
  commands: {
    windowFrames: 18,                           // コマンド全体を入力できる時間(フレーム)
    leniencyFrames: 8,                          // コマンドの最後の方向からパンチまでの猶予(フレーム)

    // 波動拳風 ↓↘→ + パンチ(キーボード向けに ↓→ でも出る)
    fireball: { motions: [[[2], [3], [6]], [[2], [6]]] },
    // 昇竜拳風 →↓↘ + パンチ
    uppercut: { motions: [[[6], [2], [3]]] },

    // 超必殺技(スターブラスト) ↓↘→↓↘→ + パンチ(キーボード向けに ↓→↓→ でも可)
    superfireball: { windowFrames: 40, motions: [[[2], [3], [6], [2], [3], [6]], [[2], [6], [2], [6]]] },

    // 叩きつけ(コマンド投げ) ←↙↓↘→ + パンチ(半回転。キーボード向けに ←↓→ などの省略も可)
    //   windowFrames をコマンドごとに指定できる(長いコマンドは長めに)
    slam: { windowFrames: 26, motions: [[[4], [1], [2], [3], [6]], [[4], [2], [3], [6]], [[4], [1], [2], [6]], [[4], [2], [6]]] },

    // ため技:hold の方向を chargeFrames 以上押し続け、release の方向+ボタンで出る。
    //   gap = ためと解放の間に許される「どちらでもない」フレーム数(キーボードでの切り替え用)
    //   ため技の判定猶予は leniencyFrames(解放の方向を入れてからボタンまで)
    // ソニックブーム風 ←ため→ + パンチ
    sonic: { type: 'charge', hold: [4, 1, 7], release: [6, 3, 9], chargeFrames: 36, gap: 4 },
    // サマーソルト風 ↓ため↑ + キック(↑でジャンプする前にキックを待つ猶予あり)
    flashkick: { type: 'charge', hold: [2, 1, 3], release: [8, 7, 9], chargeFrames: 36, gap: 4 }
  }
};
