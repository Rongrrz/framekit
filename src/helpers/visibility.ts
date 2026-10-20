import { createTween, type Tween } from '#animation/tween/tween.js';
import type { CanvasGroup } from '#elements/canvas-group.js';
import { assertBoolean, assertNonNegativeFinite } from '#internal/validation.js';
import type { Unsubscribe } from '#state/signal.js';
import type { ReadonlyObservableValue } from '#state/value.js';

/** Timing for a visibility fade. Reduced motion preferences make changes immediate. */
export type VisibilityOptions = Readonly<{
  /** Fade duration in seconds. Defaults to 0.18; zero changes visibility immediately. */
  duration?: number;
}>;

const bindings = new WeakMap<CanvasGroup, Unsubscribe>();

/**
 * Fades a group with an observable boolean. Hiding disables interaction immediately and
 * releases its layout slot after the fade. Initial visibility is applied without animation.
 * Disposing restores the previous visibility, transparency, and accessibility attributes.
 */
export function bindVisibility(
  group: CanvasGroup,
  visible: ReadonlyObservableValue<boolean>,
  options: VisibilityOptions = {},
): Unsubscribe {
  const duration = options.duration ?? 0.18;
  assertNonNegativeFinite(duration, 'Visibility duration');
  const initial = visible.get();
  assertBoolean(initial, 'Visibility');

  if (group.isDestroyed()) {
    throw new Error('Visibility target has been destroyed.');
  }

  bindings.get(group)?.();
  const element = group.unsafeElement;
  const reducedMotion = element.ownerDocument.defaultView?.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  );
  const original = {
    visible: group.Visible,
    transparency: group.GroupTransparency,
    hidden: element.getAttribute('aria-hidden'),
    inert: element.inert,
  };
  let tween: Tween | undefined;
  let stopCompleted: Unsubscribe | undefined;
  let showing = initial;

  const cancel = (): void => {
    stopCompleted?.();
    stopCompleted = undefined;

    tween?.dispose();
    tween = undefined;
  };

  const update = (next: boolean, animate: boolean): void => {
    assertBoolean(next, 'Visibility');
    cancel();
    showing = next;
    element.inert = !next || original.inert;
    element.setAttribute('aria-hidden', String(!next));

    if (!animate || duration === 0 || reducedMotion?.matches) {
      group.setProperties({ Visible: next, GroupTransparency: next ? 0 : 1 });

      return;
    }

    group.Visible = true;
    tween = createTween(group, { Duration: duration }, { GroupTransparency: next ? 0 : 1 });
    stopCompleted = tween.completed.subscribe((state) => {
      if (state === 'Completed' && !next) {
        group.Visible = false;
      }
    });
    tween.play();
  };

  const stopValue = visible.onChange((next) => {
    if (showing !== next) {
      update(next, true);
    }
  });

  const updateMotion = (): void => {
    if (reducedMotion?.matches) {
      update(showing, false);
    }
  };

  reducedMotion?.addEventListener('change', updateMotion);

  const dispose = (): void => {
    if (bindings.get(group) !== dispose) {
      return;
    }

    bindings.delete(group);
    stopValue();
    reducedMotion?.removeEventListener('change', updateMotion);
    unregisterDestroy();
    cancel();

    if (!group.isDestroyed()) {
      group.setProperties({ Visible: original.visible, GroupTransparency: original.transparency });
      element.inert = original.inert;

      if (original.hidden === null) {
        element.removeAttribute('aria-hidden');
      } else {
        element.setAttribute('aria-hidden', original.hidden);
      }
    }
  };

  const unregisterDestroy = group.onDestroy(dispose);
  bindings.set(group, dispose);
  update(initial, false);

  return dispose;
}
