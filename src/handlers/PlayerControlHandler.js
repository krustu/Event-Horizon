/** EVENT HANDLER: moves the player ship. Owns player position and movement intent. */
(function (root) {
  'use strict';
  const EDP = (root.EDP = root.EDP || {});
  const E = EDP.EventTypes;
  const C = EDP.Config;
  const clamp = EDP.Util.clamp;

  class PlayerControlHandler extends EDP.EventHandler {
    constructor(bus, world) {
      super('PlayerControlHandler', bus, world);
      this.on(E.INPUT_MOVE_CHANGED, this.onMove);
      this.on(E.FRAME_TICK, this.onTick);
      this.on(E.GAME_STARTED, this.resetPosition);
      this.on(E.PLAYER_RESPAWNED, this.onRespawn);
    }

    onMove(p) {
      this.world.player.moveX = p.dx;
      this.world.player.moveY = p.dy;
    }

    onTick(p) {
      if (p.state !== 'playing') return;
      const pl = this.world.player;
      let dx = pl.moveX;
      let dy = pl.moveY;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        dx /= len;
        dy /= len;
      }
      pl.x = clamp(pl.x + dx * C.PLAYER.speed * p.dt, pl.w / 2, C.W - pl.w / 2);
      pl.y = clamp(pl.y + dy * C.PLAYER.speed * p.dt, 150, C.H - pl.h / 2 - 6);
    }

    resetPosition() {
      this.world.player.x = C.PLAYER.startX;
      this.world.player.y = C.PLAYER.startY;
    }

    onRespawn(p) {
      this.world.player.x = p.x;
      this.world.player.y = p.y;
    }
  }

  EDP.PlayerControlHandler = PlayerControlHandler;
})(globalThis);
