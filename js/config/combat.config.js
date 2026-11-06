// 判定の精度に関する設定。数値を変えてリロードすれば調整できる。
//   frameHurtboxes : true なら、喰らい判定をポーズ(関節の位置)から毎フレーム作る。
//                    頭・胴・脚・腕が別々の箱になり、しゃがみで上段をかわす、技を出した腕や脚が伸びて食らう、が自然に起きる。
//                    false なら、従来の「体全体で1つの箱」に戻る
//   hurt           : 箱の大きさ(headR=頭の半径 torsoHalf=胴の半幅 limbPad=手足の太さ)
//   comboScale     : コンボの補正。左から「そのコンボで何発目か」のダメージ倍率(最後の値が以降も続く)
//   comboShowFrames: コンボ表示を出しておくフレーム数
//   stun           : 気絶(目を回す)の設定
//     threshold   : たまると気絶する量   perDamage: 受けたダメージ1あたりにたまる量(ガード時はたまらない)
//     decayDelay  : 攻撃を受けなくなってから、減り始めるまでのフレーム数   decayRate: 1フレームあたりの減り方
//     dizzyFrames : 気絶の長さ(フレーム)  mashReduce: パンチ・キックを1回押すごとに短くなる量  minFrames: 連打しても最低この長さは続く
Game.Config.combat = {
  frameHurtboxes: true,
  hurt: { headR: 5.2, torsoHalf: 8, limbPad: 3.4 },
  comboScale: [1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4],
  comboShowFrames: 60,
  stun: {
    threshold: 80, perDamage: 1.5,
    decayDelay: 90, decayRate: 0.2,
    dizzyFrames: 150, mashReduce: 8, minFrames: 50
  }
};
