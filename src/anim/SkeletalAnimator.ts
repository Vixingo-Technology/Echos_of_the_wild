import type { CompiledClip, CompiledRig } from './compile';
import { blendPose, createPoseBuffer, type PoseBuffer } from './pose';
import { samplePose } from './sampler';

export interface AnimEvent {
  name: string;
  clipId: string;
  /** Time within the clip at which the event is authored. */
  time: number;
}

export interface PlayOptions {
  /** Seconds to blend from the outgoing pose. 0 snaps. */
  crossfade?: number;
  loop?: boolean;
  speed?: number;
  /** Restart from t=0 even if this clip is already playing. */
  restart?: boolean;
}

interface Playback {
  clip: CompiledClip;
  time: number;
  speed: number;
  loop: boolean;
  /** Index of the next event to fire; reset on start and on loop wrap. */
  eventCursor: number;
}

/**
 * Plays compiled clips on a rig, blending between them on transitions.
 *
 * Deliberately free of any renderer dependency: it produces a pose buffer and
 * a list of gameplay events, nothing more. That is what lets combat timing be
 * tested headlessly - run the punch clip forward and assert on the hitbox
 * window without ever creating a canvas.
 */
export class SkeletalAnimator {
  readonly rig: CompiledRig;
  /** Local-space pose for the current frame. */
  readonly pose: PoseBuffer;

  private readonly clips = new Map<string, CompiledClip>();
  private readonly bufCurrent: PoseBuffer;
  private readonly bufPrevious: PoseBuffer;

  private current: Playback | null = null;
  private previous: Playback | null = null;
  private fadeElapsed = 0;
  private fadeDuration = 0;

  constructor(rig: CompiledRig, clips: Iterable<CompiledClip> = []) {
    this.rig = rig;
    const n = rig.bones.length;
    this.pose = createPoseBuffer(n);
    this.bufCurrent = createPoseBuffer(n);
    this.bufPrevious = createPoseBuffer(n);
    this.pose.set(rig.restPose);
    for (const c of clips) this.addClip(c);
  }

  addClip(clip: CompiledClip): void {
    if (clip.rig !== this.rig.id) {
      throw new Error(`Clip "${clip.id}" targets rig "${clip.rig}", not "${this.rig.id}"`);
    }
    this.clips.set(clip.id, clip);
  }

  hasClip(id: string): boolean {
    return this.clips.has(id);
  }

  get clipIds(): string[] {
    return [...this.clips.keys()];
  }

  get currentClipId(): string | null {
    return this.current?.clip.id ?? null;
  }

  get time(): number {
    return this.current?.time ?? 0;
  }

  /** 0..1 progress through the current clip. */
  get normalizedTime(): number {
    if (!this.current || this.current.clip.duration <= 0) return 0;
    return this.current.time / this.current.clip.duration;
  }

  /** True when a non-looping clip has reached its end. */
  get isFinished(): boolean {
    if (!this.current) return true;
    return !this.current.loop && this.current.time >= this.current.clip.duration;
  }

  get isBlending(): boolean {
    return this.previous !== null;
  }

  play(clipId: string, opts: PlayOptions = {}): void {
    const clip = this.clips.get(clipId);
    if (!clip) throw new Error(`Rig "${this.rig.id}" has no clip "${clipId}"`);

    if (this.current?.clip.id === clipId && !opts.restart) {
      // Already playing; let speed/loop changes through without a restart.
      if (opts.speed !== undefined) this.current.speed = opts.speed;
      if (opts.loop !== undefined) this.current.loop = opts.loop;
      return;
    }

    const fade = opts.crossfade ?? 0;
    if (fade > 0 && this.current) {
      this.previous = this.current;
      this.fadeDuration = fade;
      this.fadeElapsed = 0;
    } else {
      this.previous = null;
      this.fadeDuration = 0;
      this.fadeElapsed = 0;
    }

    this.current = {
      clip,
      time: 0,
      speed: opts.speed ?? 1,
      loop: opts.loop ?? clip.loop,
      eventCursor: 0,
    };
  }

  /** Jump to an absolute time in the current clip without firing events. */
  seek(time: number): void {
    if (!this.current) return;
    const d = this.current.clip.duration;
    this.current.time = d > 0 ? Math.min(Math.max(time, 0), d) : 0;
    this.current.eventCursor = this.current.clip.events.length;
    this.previous = null;
    this.fadeDuration = 0;
  }

  /**
   * Advance by `dt` seconds and write the resulting pose into `this.pose`.
   * Returns the gameplay events crossed this frame, in clip order.
   */
  update(dt: number, out: AnimEvent[] = []): AnimEvent[] {
    if (!this.current) return out;

    if (this.previous) {
      this.advance(this.previous, dt, null);
      this.fadeElapsed += dt;
    }
    this.advance(this.current, dt, out);

    samplePose(this.current.clip, this.current.time, this.rig, this.bufCurrent);

    if (this.previous) {
      const w = this.fadeDuration > 0 ? Math.min(this.fadeElapsed / this.fadeDuration, 1) : 1;
      samplePose(this.previous.clip, this.previous.time, this.rig, this.bufPrevious);
      blendPose(this.bufPrevious, this.bufCurrent, w, this.pose);
      if (w >= 1) {
        this.previous = null;
        this.fadeDuration = 0;
      }
    } else {
      this.pose.set(this.bufCurrent);
    }

    return out;
  }

  private advance(pb: Playback, dt: number, events: AnimEvent[] | null): void {
    const duration = pb.clip.duration;
    let t = pb.time + dt * pb.speed;

    if (pb.loop && duration > 0) {
      if (t >= duration) {
        if (events) this.drainEvents(pb, duration, events);
        // A dt larger than the whole clip still only fires each event once;
        // replaying a loop's worth of events after an alt-tab helps nobody.
        t %= duration;
        pb.eventCursor = 0;
      }
      if (events) this.drainEvents(pb, t, events);
    } else {
      if (t > duration) t = duration;
      if (events) this.drainEvents(pb, t, events);
    }

    pb.time = t;
  }

  private drainEvents(pb: Playback, upTo: number, out: AnimEvent[]): void {
    const evs = pb.clip.events;
    while (pb.eventCursor < evs.length && evs[pb.eventCursor].t <= upTo) {
      const e = evs[pb.eventCursor];
      out.push({ name: e.name, clipId: pb.clip.id, time: e.t });
      pb.eventCursor++;
    }
  }
}
