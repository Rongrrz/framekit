import type { ButtonElement } from '#elements/button-events.js';
import type { GuiObject } from '#elements/gui-object.js';
import { preserveAttributes } from '#internal/dom/attributes.js';
import { createRealmAbortController } from '#internal/dom/environment.js';
import {
  assertAllowedValue,
  assertFiniteNumber,
  assertPositiveFinite,
} from '#internal/validation.js';
import type { Unsubscribe } from '#state/signal.js';
import type { ObservableValue } from '#state/value.js';
import { udim2 } from '#values/udim.js';
import { vector2 } from '#values/vector2.js';

import { watchOwnedValue } from './owned-value.js';

/** Range and state for a single-thumb slider composed from existing GUI objects. */
export type SliderOptions = Readonly<{
  /** Programmatic values must be finite and within the range; user input snaps to step. */
  value: ObservableValue<number>;
  min?: number;
  max?: number;
  step?: number;
  orientation?: 'Horizontal' | 'Vertical';
}>;

/**
 * Binds an unrotated track and its directly parented button thumb. Owns thumb Position and
 * AnchorPoint, centers its endpoints on the track edges, and uses thumb.Disabled for interaction.
 * Arrows move one step, Page Up/Down ten steps, and Home/End select the endpoints.
 * Disposal releases capture and restores geometry, semantics, and track touch behavior.
 */
export const bindSlider = (
  track: GuiObject,
  thumb: ButtonElement,
  options: SliderOptions,
): Unsubscribe => {
  const min = options.min ?? 0;
  const max = options.max ?? 100;
  const step = options.step ?? 1;
  const orientation = options.orientation ?? 'Horizontal';
  assertFiniteNumber(min, 'Slider minimum');
  assertFiniteNumber(max, 'Slider maximum');
  assertPositiveFinite(max - min, 'Slider range');
  assertPositiveFinite(step, 'Slider step');
  assertAllowedValue(orientation, ['Horizontal', 'Vertical'], 'slider orientation');

  const validateValue = (value: number): void => {
    assertFiniteNumber(value, 'Slider value');

    if (value < min || value > max) {
      throw new RangeError('Slider value must be within its range.');
    }
  };

  validateValue(options.value.get());

  const element = thumb.unsafeElement;
  const trackElement = track.unsafeElement;
  const window = element.ownerDocument.defaultView;

  if (
    track.isDestroyed() ||
    thumb.isDestroyed() ||
    thumb.Parent !== track ||
    trackElement.ownerDocument !== element.ownerDocument ||
    !window
  ) {
    throw new TypeError('Slider requires a live track and its directly parented button thumb.');
  }

  const restore = preserveAttributes(element, [
    'role',
    'tabindex',
    'aria-valuemin',
    'aria-valuemax',
    'aria-valuenow',
    'aria-orientation',
    'aria-disabled',
  ]);
  const originalPosition = thumb.Position;
  const originalAnchor = thumb.AnchorPoint;
  const touchAction = trackElement.style.getPropertyValue('touch-action');
  const touchPriority = trackElement.style.getPropertyPriority('touch-action');
  const horizontal = orientation === 'Horizontal';
  let drag: { id: number; offset: number } | undefined;
  let disposed = false;
  const stops: Unsubscribe[] = [];

  const cancel = (): void => {
    const pointer = drag;
    drag = undefined;

    if (pointer && element.hasPointerCapture(pointer.id)) {
      // Destruction marks the instance dead before invoking owned cleanup.
      element.releasePointerCapture(pointer.id);
    }
  };

  const dispose = (): void => {
    if (disposed) {
      return;
    }

    disposed = true;
    cancel();
    stops.forEach((stop) => stop());
    restore();

    if (touchAction) {
      trackElement.style.setProperty('touch-action', touchAction, touchPriority);
    } else {
      trackElement.style.removeProperty('touch-action');
    }

    if (!thumb.isDestroyed()) {
      thumb.setProperties({ Position: originalPosition, AnchorPoint: originalAnchor });
    }
  };

  const setValue = (value: number): void => {
    const snapped =
      value <= min
        ? min
        : value >= max
          ? max
          : Number((min + Math.round((value - min) / step) * step).toPrecision(15));
    options.value.set(Math.max(min, Math.min(max, snapped)));
  };

  const movePointer = (event: PointerEvent): void => {
    const bounds = trackElement.getBoundingClientRect();
    const length = horizontal ? bounds.width : bounds.height;

    if (length <= 0) {
      return;
    }

    const offset =
      (horizontal ? event.clientX - bounds.left : event.clientY - bounds.top) - (drag?.offset ?? 0);
    const ratio = offset / length;
    setValue(min + (horizontal ? ratio : 1 - ratio) * (max - min));
  };

  const updateDisabled = (): void => {
    element.setAttribute('aria-disabled', String(thumb.Disabled));
    element.tabIndex = thumb.Disabled ? -1 : 0;

    if (thumb.Disabled) {
      cancel();
    }
  };

  element.setAttribute('role', 'slider');
  element.setAttribute('aria-valuemin', String(min));
  element.setAttribute('aria-valuemax', String(max));
  element.setAttribute('aria-orientation', horizontal ? 'horizontal' : 'vertical');
  trackElement.style.setProperty('touch-action', horizontal ? 'pan-y' : 'pan-x');
  thumb.AnchorPoint = vector2(0.5, 0.5);
  updateDisabled();

  stops.push(
    track.onDestroy(dispose),
    thumb.onDestroy(dispose),
    thumb.onPropertyChanged('Disabled', updateDisabled),
    track.on('pointerdown', (event) => {
      const target = event.target as Element;
      const interactive = target.closest('button, a, input, textarea, select, [contenteditable]');

      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        thumb.Disabled ||
        drag ||
        (interactive && interactive !== element)
      ) {
        return;
      }

      event.preventDefault();
      thumb.focus({ preventScroll: true });
      thumb.setPointerCapture(event.pointerId);
      const bounds = element.getBoundingClientRect();
      const offset = !element.contains(target)
        ? 0
        : horizontal
          ? event.clientX - (bounds.left + bounds.width / 2)
          : event.clientY - (bounds.top + bounds.height / 2);
      drag = { id: event.pointerId, offset };

      if (!element.contains(target)) {
        movePointer(event);
      }
    }),
    thumb.on('pointermove', (event) => {
      if (drag?.id === event.pointerId) {
        movePointer(event);
      }
    }),
    thumb.on('pointerup', (event) => {
      if (drag?.id === event.pointerId) {
        movePointer(event);
        cancel();
      }
    }),
    thumb.on('pointercancel', cancel),
    thumb.on('lostpointercapture', cancel),
    thumb.on('keydown', (event) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        thumb.Disabled ||
        event.target !== element
      ) {
        return;
      }

      const value = options.value.get();
      let next: number;

      if (event.key === 'Home') {
        next = min;
      } else if (event.key === 'End') {
        next = max;
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        next = min + (Math.floor((value - min) / step + 1e-10) + 1) * step;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        next = min + (Math.ceil((value - min) / step - 1e-10) - 1) * step;
      } else if (event.key === 'PageUp' || event.key === 'PageDown') {
        next = value + (event.key === 'PageUp' ? 10 : -10) * step;
      } else {
        return;
      }

      event.preventDefault();
      cancel();
      setValue(next);
    }),
  );

  const controller = createRealmAbortController(element);
  window.addEventListener('blur', cancel, { signal: controller.signal });
  stops.push(() => controller.abort());
  stops.push(
    watchOwnedValue(thumb, options.value, (value) => {
      validateValue(value);
      const ratio = (value - min) / (max - min);
      element.setAttribute('aria-valuenow', String(value));
      thumb.Position = horizontal ? udim2(ratio, 0, 0.5, 0) : udim2(0.5, 0, 1 - ratio, 0);
    }),
  );

  return dispose;
};
