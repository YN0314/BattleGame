// 入力履歴とコマンド判定(必殺技用)。
// 毎フレームの方向入力を記録し、「↓↘→」のような動きが直近に入力されたかを調べる。
// 方向は、テンキー配置の数字(789/456/123)で、向きに対して相対的に扱う。
//   6=相手の方向(前) 4=後ろ 8=上 2=下 3=前下 1=後ろ下 …
(function () {
  'use strict';

  const hist = [[], []];                    // プレイヤーごとの履歴(新しいものが後ろ)

  function reset() {
    hist[0].length = 0;
    hist[1].length = 0;
  }

  // ゲームの更新1回ごとに呼ぶ。held は論理入力(上下左右)
  function push(i, held) {
    const x = (held.right ? 1 : 0) - (held.left ? 1 : 0);      // 画面の右が+
    const y = (held.down ? 1 : 0) - (held.up ? 1 : 0);         // 下が+
    const a = hist[i];
    a.push({ x: x, y: y });
    if (a.length > Game.Config.input.historyFrames) a.shift();
  }

  // 向き(facing:1=右向き)に対する相対的なテンキー番号
  function dirOf(e, facing) {
    const fx = e.x * facing;               // 前が+
    if (e.y > 0) return fx < 0 ? 1 : (fx > 0 ? 3 : 2);
    if (e.y < 0) return fx < 0 ? 7 : (fx > 0 ? 9 : 8);
    return fx < 0 ? 4 : (fx > 0 ? 6 : 5);
  }

  // motion は「各段階で許される方向番号の配列」の並び。例: [[2],[3],[6]]
  // 新しい入力から古い方へたどり、最後の方向が leniency フレーム以内、全体が window フレーム以内なら成立
  function matchMotion(a, facing, motion, windowFrames, leniency) {
    const n = a.length;
    let idx = motion.length - 1;
    let lastFrame = -1;
    const start = Math.max(0, n - windowFrames);
    for (let f = n - 1; f >= start && idx >= 0; f--) {
      if (motion[idx].indexOf(dirOf(a[f], facing)) >= 0) {
        if (idx === motion.length - 1) lastFrame = f;
        idx--;
      }
    }
    return idx < 0 && (n - 1 - lastFrame) <= leniency;
  }

  // ため技:直近 leniency フレーム以内に release の方向があり、その直前に hold の方向が
  // chargeFrames 以上続いていれば成立(間の gap フレームまでの途切れは許す)
  function matchCharge(a, facing, cmd, leniency) {
    const n = a.length;
    let rel = -1;
    for (let f = n - 1; f >= Math.max(0, n - 1 - leniency); f--) {
      if (cmd.release.indexOf(dirOf(a[f], facing)) >= 0) { rel = f; break; }
    }
    if (rel < 0) return false;
    let count = 0, miss = 0;
    for (let f = rel - 1; f >= 0; f--) {
      if (cmd.hold.indexOf(dirOf(a[f], facing)) >= 0) { count++; miss = 0; if (count >= cmd.chargeFrames) return true; }
      else if (++miss > cmd.gap) break;
    }
    return false;
  }

  // ため技の「ため」が完了しているか(現在ためている最中か)。表示用
  function charged(i, facing, cmd) {
    const a = hist[i];
    let count = 0, miss = 0;
    for (let f = a.length - 1; f >= 0; f--) {
      if (cmd.hold.indexOf(dirOf(a[f], facing)) >= 0) { count++; miss = 0; if (count >= cmd.chargeFrames) return true; }
      else if (++miss > cmd.gap) break;
    }
    return false;
  }

  // cmd: input.config.js の commands の1項目({ motions: [...] } または ため技の設定)
  function match(i, facing, cmd) {
    const C = Game.Config.input.commands;
    if (cmd.type === 'charge') return matchCharge(hist[i], facing, cmd, C.leniencyFrames);
    return cmd.motions.some(function (m) {
      return matchMotion(hist[i], facing, m, cmd.windowFrames || C.windowFrames, C.leniencyFrames);
    });
  }

  // デバッグ表示用:直近の入力を相対テンキーで(連続は1つにまとめる)
  function recent(i, facing, count) {
    const out = [];
    hist[i].forEach(function (e) {
      const d = dirOf(e, facing);
      if (out.length === 0 || out[out.length - 1] !== d) out.push(d);
    });
    return out.slice(-count).join(' ');
  }

  Game.Core.InputHistory = { reset: reset, push: push, match: match, charged: charged, recent: recent };
})();
