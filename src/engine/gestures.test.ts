import { describe, expect, it } from 'vitest';
import {
  GestureEngine,
  makeOpenPalmLandmarks,
  makePinchLandmarks,
} from './gestures';

function runFrames(
  engine: GestureEngine,
  landmarksForFrame: (index: number) => ReturnType<typeof makeOpenPalmLandmarks> | null,
  frameCount: number,
  intervalMs = 33,
  startTime = 1000,
) {
  const events: string[] = [];
  for (let i = 0; i < frameCount; i += 1) {
    const result = engine.push(landmarksForFrame(i), startTime + i * intervalMs);
    if (result.event) events.push(result.event);
  }
  return events;
}

describe('GestureEngine', () => {
  it('detects a left swipe from horizontal palm movement', () => {
    const engine = new GestureEngine({ swipeDistanceThreshold: 0.06 });
    const events = runFrames(
      engine,
      (index) => makeOpenPalmLandmarks({ x: 0.7 - index * 0.05, y: 0.5 }),
      9,
    );
    expect(events).toContain('swipe-left');
  });

  it('detects a right swipe from horizontal palm movement', () => {
    const engine = new GestureEngine({ swipeDistanceThreshold: 0.06 });
    const events = runFrames(
      engine,
      (index) => makeOpenPalmLandmarks({ x: 0.3 + index * 0.05, y: 0.5 }),
      9,
    );
    expect(events).toContain('swipe-right');
  });

  it('ignores mostly vertical movement', () => {
    const engine = new GestureEngine({ swipeDistanceThreshold: 0.05 });
    const events = runFrames(
      engine,
      (index) => makeOpenPalmLandmarks({ x: 0.5, y: 0.2 + index * 0.05 }),
      9,
    );
    expect(events).toEqual([]);
  });

  it('triggers pinch after the hand is held closed', () => {
    const engine = new GestureEngine({ pinchHoldFrames: 4 });
    runFrames(engine, () => makeOpenPalmLandmarks({ x: 0.5, y: 0.5 }), 8);
    const events = runFrames(engine, () => makePinchLandmarks({ x: 0.5, y: 0.5 }), 6);
    expect(events).toContain('pinch');
  });

  it('requires several closed frames before triggering pinch', () => {
    const engine = new GestureEngine({ pinchHoldFrames: 8 });
    runFrames(engine, () => makeOpenPalmLandmarks({ x: 0.5, y: 0.5 }), 8);
    const events = runFrames(engine, () => makePinchLandmarks({ x: 0.5, y: 0.5 }), 6);
    expect(events).toEqual([]);
  });

  it('does not trigger pinch until the hand has been open first', () => {
    const engine = new GestureEngine({ pinchHoldFrames: 1 });
    const events = runFrames(engine, () => makePinchLandmarks({ x: 0.5, y: 0.5 }), 6);
    expect(events).toEqual([]);
  });

  it('reports hand presence and pinch state', () => {
    const engine = new GestureEngine();
    const result = engine.push(makeOpenPalmLandmarks({ x: 0.5, y: 0.5 }), 1000);
    expect(result.handPresent).toBe(true);
    expect(result.pinchActive).toBe(false);
    expect(result.phase).toBe('tracking');
    expect(result.palm?.x).toBeCloseTo(0.49, 1);
    expect(result.palm?.y).toBeCloseTo(0.522, 1);
  });
});
