import {
  solveSpring,
  type ResolvedSpringOptions,
  type SpringSolution,
} from '../../animation/spring/physics.js';
import { setStyle } from '../../dom/styles.js';

// Critical damping makes opacity settle quickly without bouncing beyond its visible range.
const panelSpringOptions = {
  tension: 900,
  friction: 60,
  mass: 1,
  precision: 0.005,
  restVelocity: 0.08,
} satisfies ResolvedSpringOptions;

/** Springs the owned layer's opacity, retaining velocity when an in-flight transition reverses. */
export const springPanel = (
  element: HTMLElement,
  showing: boolean,
  signal: AbortSignal,
  window: Window,
  motion: SpringSolution,
): void | Promise<void> => {
  const destination = showing ? 1 : 0;
  motion.value = Number(element.style.opacity || '1');
  if (
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
    (motion.value === destination && Math.abs(motion.velocity) <= panelSpringOptions.restVelocity)
  ) {
    motion.value = destination;
    motion.velocity = 0;
    setStyle(element, 'opacity', String(destination));
    return;
  }
  let previousTimestamp = window.performance.now();
  return new Promise<void>((resolve) => {
    let frame: number;
    const complete = (): void => {
      window.cancelAnimationFrame(frame);
      signal.removeEventListener('abort', complete);
      resolve();
    };
    const tick = (): void => {
      if (signal.aborted) {
        return;
      }
      const now = window.performance.now();
      solveSpring(
        motion.value,
        motion.velocity,
        destination,
        Math.max(0, (now - previousTimestamp) / 1000),
        panelSpringOptions,
        motion,
      );
      previousTimestamp = now;
      const settled =
        Math.abs(motion.value - destination) <= panelSpringOptions.precision &&
        Math.abs(motion.velocity) <= panelSpringOptions.restVelocity;
      if (settled) {
        motion.value = destination;
        motion.velocity = 0;
      }
      setStyle(element, 'opacity', String(Math.max(0, Math.min(1, motion.value))));
      if (settled) {
        complete();
      } else {
        frame = window.requestAnimationFrame(tick);
      }
    };
    signal.addEventListener('abort', complete, { once: true });
    frame = window.requestAnimationFrame(tick);
  });
};
