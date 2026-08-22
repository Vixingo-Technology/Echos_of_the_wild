import { Application, Container, Graphics } from 'pixi.js';
import {
  ProceduralMotion,
  SkeletalAnimator,
  createPoseBuffer,
  samplePose,
  solveWorld,
  type AnimEvent,
  type ChainParams,
  type CompiledClip,
  type CompiledRig,
  type PoseBuffer,
} from '@/anim';
import { RigView } from './RigView';

export interface RigPreviewOptions {
  rig: CompiledRig;
  clips: CompiledClip[];
  chains?: ChainParams[];
  background?: number;
}

/**
 * A self-contained Pixi stage that plays one rig. The rig editor drives it now;
 * the same pieces (RigView + SkeletalAnimator + ProceduralMotion) get reused by
 * the entity renderer once there is a world to put Taro in.
 */
export class RigPreview {
  readonly animator: SkeletalAnimator;

  private readonly app = new Application();
  private readonly rig: CompiledRig;
  private readonly motion: ProceduralMotion;
  private readonly world: PoseBuffer;
  private readonly scrubPose: PoseBuffer;
  private rigView!: RigView;
  private stage!: Container;
  private ground!: Graphics;

  private paused = false;
  private speed = 1;
  private carryX = 0;
  private zoom = 1;
  private destroyed = false;

  /** Fires for every animation event crossed, so the editor can show them. */
  onEvent: ((event: AnimEvent) => void) | null = null;

  constructor(private readonly options: RigPreviewOptions) {
    this.rig = options.rig;
    this.animator = new SkeletalAnimator(options.rig, options.clips);
    this.motion = new ProceduralMotion(options.rig, options.chains ?? []);
    this.world = createPoseBuffer(options.rig.bones.length);
    this.scrubPose = createPoseBuffer(options.rig.bones.length);
  }

  async init(parent: HTMLElement): Promise<void> {
    await this.app.init({
      resizeTo: parent,
      background: this.options.background ?? 0x11131a,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }

    parent.appendChild(this.app.canvas);

    this.stage = new Container();
    this.app.stage.addChild(this.stage);

    this.ground = new Graphics();
    this.stage.addChild(this.ground);

    this.rigView = new RigView(this.rig);
    this.stage.addChild(this.rigView.container);

    this.layout();
    this.app.renderer.on('resize', this.layout);
    this.app.ticker.add((ticker) => this.tick(ticker.deltaMS / 1000));
  }

  private layout = (): void => {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    // Fit the rig to roughly 62% of the viewport height, then place the ground
    // line so the head stays on screen even when zoomed right in.
    const scale = ((h * 0.6) / this.rig.height) * this.zoom;
    const rigPx = this.rig.height * scale;
    const feetY = Math.min(h - 16, Math.max(h * 0.82, rigPx + 24));

    this.stage.scale.set(scale);
    this.stage.position.set(w / 2, feetY);

    this.ground.clear();
    const half = w / scale / 2;
    this.ground
      .moveTo(-half, 0)
      .lineTo(half, 0)
      .stroke({ color: 0x2f3646, width: 2 / scale });
  };

  private tick(dtSeconds: number): void {
    // Clamp so a background tab does not fire a burst of animation events.
    const dt = Math.min(dtSeconds, 0.1);

    if (this.paused) {
      // Keep simulating cloth while scrubbing so the coat settles into the pose.
      this.motion.apply(1 / 60, this.animator.pose, this.world, this.carryX, 0);
    } else {
      const events = this.animator.update(dt * this.speed);
      if (this.onEvent) for (const e of events) this.onEvent(e);
      this.motion.apply(dt, this.animator.pose, this.world, this.carryX, 0);
    }

    this.rigView.update(this.world);
  }

  play(clipId: string, crossfade = 0.12): void {
    this.animator.play(clipId, { crossfade, restart: true });
  }

  /** Pose the rig at an absolute time without firing events. */
  scrubTo(clip: CompiledClip, time: number): void {
    samplePose(clip, time, this.rig, this.scrubPose);
    this.animator.pose.set(this.scrubPose);
    this.animator.seek(time);
    solveWorld(this.rig, this.animator.pose, this.world);
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  setCarryX(carryX: number): void {
    this.carryX = carryX;
  }

  setDebugBones(visible: boolean): void {
    this.rigView?.setDebugBones(visible);
  }

  setZoom(zoom: number): void {
    this.zoom = zoom;
    if (this.stage) this.layout();
  }

  destroy(): void {
    this.destroyed = true;
    if (this.app.renderer) {
      this.app.renderer.off('resize', this.layout);
      this.app.destroy(true, { children: true });
    }
  }
}
