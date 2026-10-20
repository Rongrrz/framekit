import { bindDraggable, bindResizable, createFrame, udim2FromOffset } from 'framekit';
import { expect, it, vi } from 'vitest';

it('releases an active capture and restores caller handle state when its target is destroyed', () => {
  const target = createFrame({ Position: udim2FromOffset(10, 10) });
  const handle = createFrame();
  const element = handle.unsafeElement;
  element.tabIndex = -1;
  element.style.setProperty('cursor', 'crosshair', 'important');
  vi.spyOn(target.unsafeElement, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(10, 10, 100, 100),
  );
  let captured: number | undefined;
  Object.assign(element, {
    setPointerCapture: (id: number) => {
      captured = id;
    },
    hasPointerCapture: (id: number) => captured === id,
    releasePointerCapture: () => {
      captured = undefined;
    },
  });
  const dispose = bindDraggable(target, { handle });
  element.dispatchEvent(
    new PointerEvent('pointerdown', {
      pointerId: 7,
      button: 0,
      clientX: 20,
      clientY: 20,
      cancelable: true,
    }),
  );
  expect(captured).toBe(7);
  element.dispatchEvent(
    new PointerEvent('pointermove', { pointerId: 7, clientX: 40, clientY: 30 }),
  );
  expect(target.Position).toEqual(udim2FromOffset(30, 20));
  target.destroy();
  expect(captured).toBeUndefined();
  expect(element.tabIndex).toBe(-1);
  expect(element.style.cursor).toBe('crosshair');
  expect(element.style.getPropertyPriority('cursor')).toBe('important');
  expect(() =>
    element.dispatchEvent(
      new PointerEvent('pointermove', { pointerId: 7, clientX: 100, clientY: 100 }),
    ),
  ).not.toThrow();
  dispose();
  handle.destroy();
});

it('rejects automatic resize targets before modifying their handles', () => {
  const target = createFrame({ AutomaticSize: 'XY' });
  const handle = createFrame();
  expect(() => bindResizable(target, { handle, edge: 'Right' })).toThrow(/AutomaticSize/);
  expect(handle.unsafeElement.hasAttribute('tabindex')).toBe(false);
  expect(handle.unsafeElement.style.touchAction).not.toBe('none');
  target.destroy();
  handle.destroy();
});
