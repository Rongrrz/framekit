import {
  bindSlider,
  createFrame,
  createObservableValue,
  createTextButton,
  udim2,
  vector2,
} from 'framekit';
import { expect, it, vi } from 'vitest';

import { destroyNodesAfterEach } from '../support/node-cleanup.js';

const own = destroyNodesAfterEach();

const createSlider = (initial = 0) => {
  const track = own(createFrame());
  const thumb = own(createTextButton());
  thumb.Parent = track;
  const value = createObservableValue(initial);

  return { track, thumb, value };
};

it('positions ordinary button thumbs from state and restores caller geometry and attributes', () => {
  const { track, thumb, value } = createSlider(25);
  const position = thumb.Position;
  const anchor = thumb.AnchorPoint;
  track.unsafeElement.style.setProperty('touch-action', 'manipulation', 'important');
  thumb.unsafeElement.tabIndex = 3;
  const dispose = bindSlider(track, thumb, { value });
  expect(thumb.ClassName).toBe('TextButton');
  expect(thumb.Position).toEqual(udim2(0.25, 0, 0.5, 0));
  expect(thumb.AnchorPoint).toEqual(vector2(0.5, 0.5));
  value.set(75);
  expect(thumb.Position).toEqual(udim2(0.75, 0, 0.5, 0));
  dispose();
  dispose();
  value.set(100);
  expect(thumb.Position).toEqual(position);
  expect(thumb.AnchorPoint).toEqual(anchor);
  expect(thumb.unsafeElement.tabIndex).toBe(3);
  expect(thumb.unsafeElement.hasAttribute('role')).toBe(false);
  expect(track.unsafeElement.style.touchAction).toBe('manipulation');
  expect(track.unsafeElement.style.getPropertyPriority('touch-action')).toBe('important');
});

it('snaps fractional keyboard steps and reaches endpoints outside the step grid', () => {
  const { track, thumb, value } = createSlider(0.2);
  bindSlider(track, thumb, { value, min: 0.1, max: 0.45, step: 0.1, orientation: 'Vertical' });
  const key = (key: string): void => {
    thumb.unsafeElement.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
  };

  key('ArrowUp');
  expect(value.get()).toBe(0.3);
  key('End');
  expect(value.get()).toBe(0.45);
  expect(thumb.Position).toEqual(udim2(0.5, 0, 0, 0));
  key('ArrowDown');
  expect(value.get()).toBe(0.4);
  key('PageDown');
  expect(value.get()).toBe(0.1);
  thumb.Disabled = true;
  key('ArrowUp');
  expect(value.get()).toBe(0.1);
  expect(thumb.unsafeElement.tabIndex).toBe(-1);
});

it('releases pointer capture on disable and destruction and ignores later pointer movement', () => {
  const { track, thumb, value } = createSlider();
  vi.spyOn(track.unsafeElement, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(0, 0, 200, 20),
  );
  let captured: number | undefined;
  Object.assign(thumb.unsafeElement, {
    setPointerCapture: (id: number) => {
      captured = id;
    },
    hasPointerCapture: (id: number) => captured === id,
    releasePointerCapture: () => {
      captured = undefined;
    },
  });
  bindSlider(track, thumb, { value });
  const down = (): void => {
    track.unsafeElement.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 7,
        button: 0,
        clientX: 100,
        cancelable: true,
      }),
    );
  };

  down();
  expect(value.get()).toBe(50);
  expect(captured).toBe(7);
  thumb.Disabled = true;
  expect(captured).toBeUndefined();
  thumb.Disabled = false;
  down();
  thumb.destroy();
  expect(captured).toBeUndefined();
  thumb.unsafeElement.dispatchEvent(
    new PointerEvent('pointermove', { pointerId: 7, clientX: 200 }),
  );
  expect(value.get()).toBe(50);
  expect(track.unsafeElement.style.touchAction).toBe('');
});

it('rejects invalid range, value, or hierarchy before changing the thumb', () => {
  const { track, thumb, value } = createSlider();

  for (const options of [
    { value, min: 10, max: 0 },
    { value, step: 0 },
    { value: createObservableValue(NaN) },
    { value: createObservableValue(101) },
  ]) {
    expect(() => bindSlider(track, thumb, options)).toThrow();
    expect(thumb.unsafeElement.hasAttribute('role')).toBe(false);
  }

  thumb.Parent = undefined;
  expect(() => bindSlider(track, thumb, { value })).toThrow(/parented/);
});

it('keeps geometry and semantics current when a property observer changes the value again', () => {
  const { track, thumb, value } = createSlider();
  bindSlider(track, thumb, { value });
  thumb.onPropertyChanged('Position', () => {
    if (value.get() === 50) {
      value.set(75);
    }
  });
  value.set(50);
  expect(thumb.Position).toEqual(udim2(0.75, 0, 0.5, 0));
  expect(thumb.unsafeElement.getAttribute('aria-valuenow')).toBe('75');
});
