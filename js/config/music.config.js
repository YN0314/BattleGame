// BGM の設定。楽譜をデータで持ち、js/core/music.js が Web Audio で演奏する(音声ファイルは使わない)。
//   enabled : false にすると BGM なし
//   volume  : BGM 全体の音量(0〜1)。効果音の master(sound.config.js)とは別に持つ。M キーで効果音といっしょに消音できる
//   mix     : パートごとの音量
//   songs   : 曲。sections を順に演奏し、loop: true の区間から最後まで繰り返す
//
// 楽譜の書き方(1小節 = 16ステップ = 16分音符16個。4/4拍子):
//   メロディ(melody) … 小節ごとの文字列。'A4:2 C5:2 E5:4 r:8' のように「音名:長さ(ステップ数)」を空白で区切る。
//                       r は休符。長さを省くと1。音名は C4 / F#5 / Bb3 など(C4 = 真ん中のド)。長さの合計が16になること。
//                       声部は複数重ねられる。inst は音色(instruments)、transpose は上げ下げする半音の数、vol は音量の倍率。
//   chords            … 小節ごとのコード('Am' 'F' 'G7' 'E' など)。ベース・刻み・アルペジオは、このコードから音を決める。
//   bass / stab / arp / drums … patterns の名前。1つ書けば全小節、配列なら小節ごと(足りなければ繰り返す)。
//   patterns.bass     … 16文字。1=根音 3=3度 5=5度 8=1オクターブ上 -=のばす .=休み
//   patterns.stab     … 16文字。x=その小節のコードを鳴らす -=のばす .=休み(inst: stab=刻み / pad=のばす音)
//   patterns.arp      … 16文字。1 3 5=コードの音 7=7度 8 9 0=根音・3度・5度の1オクターブ上 .=休み
//   patterns.drums    … 行ごとに16文字。k=バスドラ s=スネア h=ハイハット o=オープンハイハット c=クラッシュ t1 t2 t3=タム(高・中・低)
//                       x=普通 X=強い g=弱い .=なし
(function () {
  'use strict';

  // ---- バトル曲 1「STREET FIGHT」(イ短調 BPM156)の旋律 ----------------
  const INTRO = [
    'r:8 E5:2 E5:2 E5:2 E5:2',
    'A5:4 r:4 E5:2 r:2 C5:4',
    'F5:4 r:4 A5:4 r:4',
    'E5:2 G#5:2 B5:2 E6:2 r:2 B5:2 G#5:2 E5:2'
  ];
  const HOOK = 'A4:1 r:1 A4:1 C5:1 E5:2 r:2 E5:1 D5:1 C5:1 D5:1 E5:4';
  const A = [
    HOOK,
    'A5:2 G5:2 E5:2 G5:2 A5:8',
    'F5:2 E5:2 C5:2 E5:2 F5:4 E5:2 C5:2',
    'D5:2 G5:2 G5:2 F5:2 D5:4 r:4',
    HOOK,
    'A5:2 G5:2 E5:2 G5:2 A5:4 C6:4',
    'F5:2 A5:2 C6:2 A5:2 F5:4 E5:2 D5:2',
    'E5:2 G#5:2 B5:2 G#5:2 E5:8'
  ];
  const B = [
    'C6:4 A5:2 C6:2 A5:4 F5:4',
    'B5:4 G5:2 B5:2 G5:4 D5:4',
    'C6:4 E6:4 D6:2 C6:2 B5:2 A5:2',
    'A5:8 r:2 E5:2 A5:2 C6:2',
    'C6:4 A5:2 C6:2 F6:4 E6:4',
    'D6:4 B5:2 D6:2 G6:4 F6:4',
    'E6:2 D6:2 B5:2 G#5:2 B5:2 D6:2 E6:4',
    'E6:6 r:2 E5:2 G#5:2 B5:2 D6:2'
  ];
  const C = [
    'E5:2 r:2 E5:2 r:2 A5:4 r:4',
    'G5:2 r:2 E5:2 r:2 C5:4 r:4',
    'D5:2 r:2 D5:2 r:2 G5:4 r:4',
    'F5:2 r:2 D5:2 r:2 B4:4 r:4',
    'C5:2 r:2 C5:2 r:2 F5:4 r:4',
    'E5:2 r:2 C5:2 r:2 A4:4 r:4',
    'B4:2 B4:2 E5:2 E5:2 G#5:2 G#5:2 B5:2 B5:2',
    'E6:2 D6:2 B5:2 G#5:2 E5:2 D5:2 B4:2 G#4:2'
  ];
  const FILL = 'fill', ROCK = 'rock';

  Game.Config.music = {
    enabled: true,
    volume: 0.9,
    level: 0.60,                 // 曲全体の大きさ(コンプレッサーのあと。書き出して測った値から決めた)
    echoSteps: 3,                // エコーの間隔(16分音符いくつぶんか。3 = 付点8分)
    echoFeedback: 0.3,
    echoLevel: 0.5,

    mix: {
      lead: 0.30, bright: 0.26, harm: 0.16, soft: 0.30,
      stab: 0.24, pad: 0.14, bass: 0.17, arp: 0.14,
      kick: 0.55, snare: 0.60, hat: 0.20, tom: 0.45, crash: 0.24
    },

    // 音色。duty = 矩形波の細さ(小さいほど細い音)、cut = ローパスの周波数、vib = ビブラートの深さ(セント)、send = エコーに送る量
    instruments: {
      lead:   { duty: 0.25, cut: 5200, vib: 14, dec: 0.08, sus: 0.80, rel: 0.04, send: 0.22 },
      bright: { duty: 0.125, cut: 6500, vib: 12, dec: 0.06, sus: 0.85, rel: 0.04, send: 0.25 },
      harm:   { duty: 0.5, cut: 3000, vib: 10, dec: 0.08, sus: 0.80, rel: 0.04, send: 0.10 },
      soft:   { type: 'triangle', cut: 4200, vib: 18, dec: 0.2, sus: 0.90, rel: 0.06, send: 0.30 },
      stab:   { cut0: 3800, cut1: 1000, tau: 0.07, q: 1.2, a: 0.004, dec: 0.06, sus: 0.55, rel: 0.05, send: 0.12 },
      pad:    { cut0: 1500, cut1: 1500, tau: 0.1, q: 0.8, a: 0.12, dec: 0.5, sus: 0.80, rel: 0.20, send: 0.20 }
    },

    patterns: {
      bass: {
        drive:  '1-1-1-1-1-1-1-1-',
        syncop: '1--1--1-1--1--8-',
        octave: '1-8-1-8-1-8-1-8-',
        half:   '1-------1-------'
      },
      stab: {
        off:     { inst: 'stab', p: '................' },
        offbeat: { inst: 'stab', p: '..x-..x-..x-..x-' },
        push:    { inst: 'stab', p: 'x--x--x---x-x---' },
        pad:     { inst: 'pad',  p: 'x---------------' }
      },
      arp: {
        up: '1358531358531358'
      },
      drums: {
        hats:   { k: 'x...............', h: 'x.x.x.x.x.x.x.x.' },
        rock:   { k: 'x.....x.x.x.....', s: '....x.......x...', h: 'X.x.x.x.X.x.x.x.', o: '..............x.' },
        rockC:  { k: 'x.....x.x.x.....', s: '....x.......x...', h: 'X.x.x.x.X.x.x.x.', c: 'x...............' },
        fill:   { k: 'x.....x.x.......', s: '....x.......xxxx', h: 'X.x.x.x.........', t1: '..........x.....', t2: '........x.......' },
        half:   { k: 'x.....x.........', s: '........x.......', h: 'x.x.x.x.x.x.x.x.' },
        buildA: { k: 'x...x...x...x...', s: 'g.g.g.g.x.x.X.X.', h: 'x.x.x.x.x.x.x.x.' },
        buildB: { k: 'x...x...x...x...', s: 'ggggxxxxxxxxXXXX', h: 'x.x.x.x.x.x.x.x.' }
      }
    },

    songs: {
      battle1: {
        name: 'STREET FIGHT',
        bpm: 156,
        sections: [
          { name: 'intro', chords: ['Am', 'Am', 'F', 'E'],
            melody: [{ inst: 'lead', bars: INTRO }],
            bass: ['drive', 'drive', 'drive', 'syncop'], stab: ['off', 'off', 'push', 'push'],
            drums: ['hats', ROCK, ROCK, FILL] },
          { name: 'A', loop: true, chords: ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'F', 'E'],
            melody: [{ inst: 'lead', bars: A }],
            bass: ['syncop', 'syncop', 'syncop', 'syncop', 'syncop', 'syncop', 'syncop', 'drive'], stab: 'offbeat',
            drums: ['rockC', ROCK, ROCK, ROCK, ROCK, ROCK, ROCK, FILL] },
          { name: 'B', chords: ['F', 'G', 'Am', 'Am', 'F', 'G', 'E', 'E'],
            melody: [{ inst: 'bright', bars: B }],
            bass: 'octave', stab: 'pad', arp: 'up',
            drums: ['rockC', ROCK, ROCK, ROCK, ROCK, ROCK, ROCK, FILL] },
          { name: 'A2', chords: ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'F', 'E'],
            melody: [{ inst: 'lead', bars: A }, { inst: 'harm', bars: A, transpose: -12, vol: 0.8 }],
            bass: ['syncop', 'syncop', 'syncop', 'syncop', 'syncop', 'syncop', 'syncop', 'drive'], stab: 'offbeat', arp: 'up',
            drums: ['rockC', ROCK, ROCK, ROCK, ROCK, ROCK, ROCK, FILL] },
          { name: 'C', chords: ['Am', 'Am', 'G', 'G', 'F', 'F', 'E', 'E'],
            melody: [{ inst: 'soft', bars: C }],
            bass: 'half', stab: 'pad', arp: 'up',
            drums: ['half', 'half', 'half', 'half', 'half', 'half', 'buildA', 'buildB'] }
        ]
      }
    }
  };
})();
