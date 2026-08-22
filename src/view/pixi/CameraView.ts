import { CAMERA } from '@/model/tuning';

/**
 * Follows Taro with a deadzone and a facing-based lookahead, so small hops do
 * not swing the whole screen and running reveals what is ahead of him.
 */
export class CameraView {
  x = 0;
  y = 0;

  private lookahead = 0;
  private shake = 0;
  private shakeX = 0;
  private shakeY = 0;

  /** Level bounds, so the camera never shows the void past the edge. */
  bounds = { width: 0, height: 0 };
  shakeEnabled = true;

  snapTo(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.lookahead = 0;
    this.shake = 0;
  }

  addShake(strength: number): void {
    if (!this.shakeEnabled) return;
    this.shake = Math.min(24, this.shake + strength);
  }

  follow(
    targetX: number,
    targetY: number,
    facing: number,
    viewWidth: number,
    viewHeight: number,
    dt: number,
  ): void {
    const desiredLookahead = facing * CAMERA.lookahead;
    this.lookahead += (desiredLookahead - this.lookahead) * Math.min(1, dt * CAMERA.lookaheadSmoothing);

    const goalX = targetX + this.lookahead;
    const goalY = targetY;

    const deadX = viewWidth * CAMERA.deadzoneX;
    const deadY = viewHeight * CAMERA.deadzoneY;

    // Only chase once the target leaves the deadzone rectangle.
    if (Math.abs(goalX - this.x) > deadX) {
      const edge = this.x + Math.sign(goalX - this.x) * deadX;
      this.x += (goalX - edge) * Math.min(1, dt * CAMERA.followSmoothing);
    }
    if (Math.abs(goalY - this.y) > deadY) {
      const edge = this.y + Math.sign(goalY - this.y) * deadY;
      this.y += (goalY - edge) * Math.min(1, dt * CAMERA.followSmoothing);
    }

    this.clamp(viewWidth, viewHeight);

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 42);
      this.shakeX = (Math.random() - 0.5) * this.shake;
      this.shakeY = (Math.random() - 0.5) * this.shake;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  private clamp(viewWidth: number, viewHeight: number): void {
    const { width, height } = this.bounds;
    if (width > viewWidth) {
      this.x = Math.min(Math.max(this.x, viewWidth / 2), width - viewWidth / 2);
    } else if (width > 0) {
      this.x = width / 2;
    }
    if (height > viewHeight) {
      this.y = Math.min(Math.max(this.y, viewHeight / 2), height - viewHeight / 2);
    } else if (height > 0) {
      this.y = height / 2;
    }
  }

  /** Offset to apply to the world container. */
  get offsetX(): number {
    return this.x + this.shakeX;
  }

  get offsetY(): number {
    return this.y + this.shakeY;
  }
}
