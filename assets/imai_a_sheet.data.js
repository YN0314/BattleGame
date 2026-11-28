// IMAIのスーツ姿。左上を1として、各行を左から右へ数える。
(function () {
  'use strict';

  const columns = 6;
  const width = 416;
  const height = 256;

  function frames(...cells) {
    return cells.map(function (cell) {
      const index = cell - 1;
      return {
        x: (index % columns) * width,
        y: Math.floor(index / columns) * height,
        w: width, h: height, ox: 208, oy: 224
      };
    });
  }

  Game.Data.Sheets.imai_a_sheet = {
    image: 'assets/imai_a_sheet.png',
    artScale: 4,
    face: [2, 165, 68],
    frames: {
      idle: frames(1),
      walk: frames(2, 3),
      guard: frames(4),
      hit: frames(5),
      down: frames(6),
      crouch: frames(7),
      crouchGuard: frames(8),
      jump: frames(10),

      standPunch: frames(1, 16, 1),
      standHPunch: frames(1, 17, 1),
      standKick: frames(1, 18, 1),
      standHKick: frames(1, 19, 1),
      jumpPunch: frames(10, 20, 10),
      jumpHPunch: frames(10, 21, 10),
      jumpKick: frames(10, 22, 10),
      jumpHKick: frames(10, 23, 10),
      crouchPunch: frames(7, 24, 7),
      crouchHPunch: frames(7, 25, 7),
      crouchKick: frames(7, 26, 7),
      crouchHKick: frames(7, 27, 7),

      // 28は手を開いた姿勢。飛び道具と投げのつかみで使う。
      fireball: frames(4, 28, 28),
      uppercut: frames(8, 20, 10),
      flashkick: frames(8, 23, 10),
      uppercutLand: frames(8),
      throw: frames(28, 17, 4),
      dizzy: frames(5)
    }
  };
})();
