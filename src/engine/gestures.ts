export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export type GestureEvent = 'swipe-left' | 'swipe-right' | 'pinch';

export type GesturePhase = 'idle' | 'tracking' | 'ready' | 'pinching';

export interface GestureResult {
  event: GestureEvent | null;
  phase: GesturePhase;
  handPresent: boolean;
  pinchActive: boolean;
  palm: { x: number; y: number } | null;
}

export interface GestureEngineOptions {
  swipeDistanceThreshold?: number;
  swipeDurationMinMs?: number;
  swipeCooldownMs?: number;
  openThreshold?: number;
  pinchThreshold?: number;
  pinchHoldFrames?: number;
  pinchCooldownMs?: number;
  minOpenFrames?: number;
  windowMs?: number;
}

interface PalmFrame {
  time: number;
  palm: { x: number; y: number };
  pinchRatio: number;
}

const DEFAULT_OPTIONS: Required<GestureEngineOptions> = {
  swipeDistanceThreshold: 0.075,
  swipeDurationMinMs: 90,
  swipeCooldownMs: 720,
  openThreshold: 1.05,
  pinchThreshold: 0.42,
  pinchHoldFrames: 6,
  pinchCooldownMs: 1400,
  minOpenFrames: 8,
  windowMs: 320,
};

function distance(a: LandmarkPoint, b: LandmarkPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class GestureEngine {
  private readonly options: Required<GestureEngineOptions>;
  private frames: PalmFrame[] = [];
  private lastSwipeAt = Number.NEGATIVE_INFINITY;
  private lastPinchAt = Number.NEGATIVE_INFINITY;
  private pinchHold = 0;
  private wasPinching = false;
  private openHold = 0;
  private pinchArmed = false;

  constructor(options: GestureEngineOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  push(landmarks: LandmarkPoint[] | null, now = performance.now()): GestureResult {
    if (!landmarks || landmarks.length < 21) {
      this.frames = [];
      this.pinchHold = 0;
      this.openHold = 0;
      this.pinchArmed = false;
      return { event: null, phase: 'idle', handPresent: false, pinchActive: false, palm: null };
    }

    const palm = {
      x: (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5,
      y: (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5,
    };
    const handScale = Math.max(0.04, distance(landmarks[0], landmarks[9]));
    const pinchRatio = distance(landmarks[4], landmarks[8]) / handScale;

    this.frames.push({ time: now, palm, pinchRatio });
    const cutoff = now - this.options.windowMs;
    while (this.frames.length > 0 && this.frames[0].time < cutoff) {
      this.frames.shift();
    }

    const isPinching = pinchRatio < this.options.pinchThreshold;
    const isOpen = pinchRatio > this.options.openThreshold;
    this.openHold = isOpen ? this.openHold + 1 : 0;
    if (this.openHold >= this.options.minOpenFrames) {
      this.pinchArmed = true;
    }

    const event = this.detectSwipe(now) ?? this.detectPinch(isPinching);
    const phase: GesturePhase = isPinching ? 'pinching' : this.openHold >= this.options.minOpenFrames ? 'ready' : 'tracking';
    return {
      event,
      phase,
      handPresent: true,
      pinchActive: isPinching,
      palm,
    };
  }

  reset(): void {
    this.frames = [];
    this.pinchHold = 0;
    this.wasPinching = false;
    this.openHold = 0;
    this.pinchArmed = false;
    this.lastSwipeAt = Number.NEGATIVE_INFINITY;
    this.lastPinchAt = Number.NEGATIVE_INFINITY;
  }

  private detectSwipe(now: number): GestureEvent | null {
    if (this.frames.length < 4 || now - this.lastSwipeAt < this.options.swipeCooldownMs) {
      return null;
    }
    const first = this.frames[0];
    const last = this.frames[this.frames.length - 1];
    const duration = last.time - first.time;
    if (duration < this.options.swipeDurationMinMs) {
      return null;
    }

    const dx = last.palm.x - first.palm.x;
    const dy = last.palm.y - first.palm.y;
    if (last.pinchRatio < this.options.pinchThreshold) {
      return null;
    }
    if (Math.abs(dx) < this.options.swipeDistanceThreshold || Math.abs(dx) < Math.abs(dy) * 1.2) {
      return null;
    }

    this.lastSwipeAt = now;
    return dx < 0 ? 'swipe-left' : 'swipe-right';
  }

  private detectPinch(isPinching: boolean): GestureEvent | null {
    const frame = this.frames[this.frames.length - 1];
    if (isPinching) {
      this.pinchHold += 1;
      this.wasPinching = true;
    } else {
      this.pinchHold = 0;
    }

    if (!isPinching && this.wasPinching) {
      this.wasPinching = false;
    }

    const now = frame.time;
    if (
      isPinching &&
      this.pinchArmed &&
      this.pinchHold >= this.options.pinchHoldFrames &&
      now - this.lastPinchAt >= this.options.pinchCooldownMs
    ) {
      this.lastPinchAt = now;
      this.pinchHold = 0;
      this.pinchArmed = false;
      return 'pinch';
    }
    return null;
  }
}

export function makeOpenPalmLandmarks(palm: { x: number; y: number }): LandmarkPoint[] {
  const landmarks: LandmarkPoint[] = Array.from({ length: 21 }, () => ({ x: palm.x, y: palm.y }));
  landmarks[0] = { x: palm.x, y: palm.y + 0.12 };
  landmarks[4] = { x: palm.x - 0.09, y: palm.y - 0.08 };
  landmarks[8] = { x: palm.x + 0.08, y: palm.y - 0.1 };
  landmarks[5] = { x: palm.x + 0.04, y: palm.y - 0.03 };
  landmarks[9] = { x: palm.x, y: palm.y };
  landmarks[13] = { x: palm.x - 0.03, y: palm.y };
  landmarks[17] = { x: palm.x - 0.06, y: palm.y + 0.02 };
  return landmarks;
}

export function makePinchLandmarks(palm: { x: number; y: number }): LandmarkPoint[] {
  const landmarks = makeOpenPalmLandmarks(palm);
  landmarks[4] = { x: palm.x - 0.01, y: palm.y - 0.1 };
  landmarks[8] = { x: palm.x + 0.01, y: palm.y - 0.1 };
  return landmarks;
}
