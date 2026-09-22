import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createFrame,
  createScreenGui,
  createTextButton,
  type Frame,
  type GuiObject,
  type Instance,
  type ScreenGui,
  type TextButton,
  udim2FromOffset,
  vector2,
  withToolTip,
} from '../../index.js';
import { setupAnimationClock } from '../support/animation-clock.js';

const clock = setupAnimationClock();
const owners = new Set<Instance>();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.stubGlobal('innerWidth', 800);
  vi.stubGlobal('innerHeight', 600);
});
afterEach(() => {
  for (const owner of owners) owner.destroy();
  owners.clear();
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const rect = (x: number, y: number, width: number, height: number): DOMRect =>
  new DOMRect(x, y, width, height);

const pointer = (
  element: HTMLElement,
  type: string,
  x = 260,
  y = 230,
  pointerType = 'mouse',
): void => {
  element.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerType }));
};

const fixture = (): Readonly<{
  root: ScreenGui;
  target: TextButton;
  tooltip: Frame;
  moveTarget: (bounds: DOMRect) => void;
}> => {
  const root = createScreenGui();
  const target = createTextButton();
  const tooltip = createFrame({ Size: udim2FromOffset(80, 40) });
  owners.add(root);
  owners.add(tooltip);
  root.mount(document.body);
  target.Parent = root;
  let bounds = rect(200, 200, 100, 40);
  vi.spyOn(target.unsafeElement, 'getBoundingClientRect').mockImplementation(() => bounds);
  vi.spyOn(tooltip.unsafeElement, 'getBoundingClientRect').mockImplementation(() =>
    rect(
      tooltip.Position.X.Offset,
      tooltip.Position.Y.Offset,
      tooltip.Size.X.Offset,
      tooltip.Size.Y.Offset,
    ),
  );
  return {
    root,
    target,
    tooltip,
    moveTarget: (next) => {
      bounds = next;
    },
  };
};

const layerOf = (tooltip: GuiObject): ScreenGui => {
  const layer = tooltip.Parent;
  if (!layer?.isA('ScreenGui')) throw new Error('Missing tooltip layer.');
  return layer;
};

describe('tooltips', () => {
  it('delays hover, cancels early exits, and lets the pointer move into the tooltip', () => {
    const { target, tooltip } = fixture();
    withToolTip(target, tooltip);
    const layer = layerOf(tooltip);
    pointer(target.unsafeElement, 'pointerenter');
    vi.advanceTimersByTime(299);
    expect(layer.Enabled).toBe(false);
    pointer(target.unsafeElement, 'pointerleave');
    vi.advanceTimersByTime(1000);
    expect(layer.Enabled).toBe(false);

    pointer(target.unsafeElement, 'pointerenter');
    vi.advanceTimersByTime(300);
    expect(layer.Enabled).toBe(true);
    pointer(target.unsafeElement, 'pointerleave');
    vi.advanceTimersByTime(40);
    pointer(tooltip.unsafeElement, 'pointerenter');
    vi.advanceTimersByTime(1000);
    expect(layer.Enabled).toBe(true);
    pointer(tooltip.unsafeElement, 'pointerleave');
    vi.advanceTimersByTime(80);
    expect(layer.Enabled).toBe(false);
  });

  it('opens immediately on focus, stays while focused, and respects Escape until focus ends', () => {
    const { target, tooltip } = fixture();
    withToolTip(target, tooltip, { followCursor: true });
    const layer = layerOf(tooltip);
    target.unsafeElement.focus();
    expect(layer.Enabled).toBe(true);
    expect(tooltip.Position).toEqual(udim2FromOffset(210, 252));
    pointer(target.unsafeElement, 'pointerenter', 290, 210);
    expect(tooltip.Position).toEqual(udim2FromOffset(210, 252));
    pointer(target.unsafeElement, 'pointerleave');
    vi.advanceTimersByTime(1000);
    expect(layer.Enabled).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(layer.Enabled).toBe(false);
    pointer(target.unsafeElement, 'pointerenter');
    pointer(target.unsafeElement, 'pointermove');
    vi.advanceTimersByTime(1000);
    expect(layer.Enabled).toBe(false);
    pointer(target.unsafeElement, 'pointerleave');
    target.unsafeElement.blur();
    target.unsafeElement.focus();
    expect(layer.Enabled).toBe(true);
  });

  it('cancels a pending tooltip with Escape and reopens after a new hover', () => {
    const { target, tooltip } = fixture();
    withToolTip(target, tooltip);
    const layer = layerOf(tooltip);
    pointer(target.unsafeElement, 'pointerenter');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    vi.advanceTimersByTime(1000);
    expect(layer.Enabled).toBe(false);
    pointer(target.unsafeElement, 'pointerleave');
    pointer(target.unsafeElement, 'pointerenter');
    vi.advanceTimersByTime(300);
    expect(layer.Enabled).toBe(true);
  });

  it.each([
    ['top', 210, 148],
    ['bottom', 210, 252],
    ['left', 108, 200],
    ['right', 312, 200],
  ] as const)('anchors on the %s side', (placement, x, y) => {
    const { target, tooltip } = fixture();
    withToolTip(target, tooltip, { placement, delay: 0 });
    pointer(target.unsafeElement, 'pointerenter');
    expect(tooltip.Position).toEqual(udim2FromOffset(x, y));
    pointer(target.unsafeElement, 'pointermove', 270, 230);
    expect(tooltip.Position).toEqual(udim2FromOffset(x, y));
  });

  it('follows the cursor and flips/clamps near viewport edges', () => {
    const { target, tooltip } = fixture();
    withToolTip(target, tooltip, { followCursor: true, delay: 0 });
    pointer(target.unsafeElement, 'pointerenter');
    expect(tooltip.Position).toEqual(udim2FromOffset(220, 242));
    pointer(target.unsafeElement, 'pointermove', 310, 260);
    expect(tooltip.Position).toEqual(udim2FromOffset(270, 272));
    pointer(target.unsafeElement, 'pointermove', 790, 590);
    expect(tooltip.Position).toEqual(udim2FromOffset(712, 538));
  });

  it.each([
    ['top', 200, 0, 210, 52],
    ['bottom', 200, 560, 210, 508],
    ['left', 0, 200, 112, 200],
    ['right', 700, 200, 608, 200],
  ] as const)(
    'flips anchored %s placement when that side does not fit',
    (placement, left, top, x, y) => {
      const { target, tooltip, moveTarget } = fixture();
      moveTarget(rect(left, top, 100, 40));
      withToolTip(target, tooltip, { placement, delay: 0 });
      pointer(target.unsafeElement, 'pointerenter');
      expect(tooltip.Position).toEqual(udim2FromOffset(x, y));
    },
  );

  it.each(['frame', 'text'])(
    'fades cursor-following %s content on exit without moving or accepting tooltip hover',
    async (content) => {
      const { target, tooltip, moveTarget } = fixture();
      withToolTip(target, content === 'frame' ? tooltip : 'Pointer help', {
        followCursor: true,
        delay: 0,
      });
      pointer(target.unsafeElement, 'pointerenter');
      clock.advance(400);
      await Promise.resolve();
      const bubble = document.getElementById(
        target.unsafeElement.getAttribute('aria-describedby')!,
      )!;
      const layer = bubble.parentElement!;
      const position = [bubble.style.left, bubble.style.top];
      expect(bubble.style.pointerEvents).toBe('none');
      pointer(target.unsafeElement, 'pointerleave');
      pointer(bubble, 'pointerenter');
      moveTarget(rect(400, 400, 100, 40));
      pointer(target.unsafeElement, 'pointermove', 450, 450);
      clock.advance(60);
      expect(Number(layer.style.opacity)).toBeGreaterThan(0);
      expect(Number(layer.style.opacity)).toBeLessThan(1);
      expect([bubble.style.left, bubble.style.top]).toEqual(position);
      expect(layer.style.display).not.toBe('none');
      clock.advance(400);
      await Promise.resolve();
      expect(layer.style.display).toBe('none');
      expect(tooltip.isDestroyed()).toBe(false);
    },
  );

  it('cancels a cursor fade on re-entry and preserves focus until blur or Escape', async () => {
    const { target, tooltip } = fixture();
    withToolTip(target, tooltip, { followCursor: true, delay: 300 });
    const layer = layerOf(tooltip);
    pointer(target.unsafeElement, 'pointerenter');
    vi.advanceTimersByTime(300);
    clock.advance(400);
    await Promise.resolve();
    pointer(target.unsafeElement, 'pointerleave');
    clock.advance(60);
    const fadingOpacity = layer.unsafeElement.style.opacity;
    expect(Number(fadingOpacity)).toBeGreaterThan(0);
    expect(Number(fadingOpacity)).toBeLessThan(1);
    pointer(target.unsafeElement, 'pointerenter', 310, 260);
    expect(layer.unsafeElement.style.opacity).toBe(fadingOpacity);
    clock.advance(400);
    await Promise.resolve();
    expect(layer.unsafeElement.style.opacity).toBe('1');
    expect(layer.Enabled).toBe(true);
    target.unsafeElement.focus();
    pointer(target.unsafeElement, 'pointerleave');
    clock.advance(120);
    expect(layer.Enabled).toBe(true);
    expect(tooltip.Position).toEqual(udim2FromOffset(210, 252));
    target.unsafeElement.blur();
    clock.advance(60);
    const blurredOpacity = layer.unsafeElement.style.opacity;
    expect(Number(blurredOpacity)).toBeGreaterThan(0);
    expect(Number(blurredOpacity)).toBeLessThan(1);
    target.unsafeElement.focus();
    expect(layer.unsafeElement.style.opacity).toBe(blurredOpacity);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    clock.advance(400);
    await Promise.resolve();
    expect(layer.Enabled).toBe(false);
  });

  it('cancels cursor fade work and restores supplied content when disposed', () => {
    const { target, tooltip } = fixture();
    const originalPosition = tooltip.Position;
    tooltip.unsafeElement.style.pointerEvents = 'auto';
    const dispose = withToolTip(target, tooltip, { followCursor: true, delay: 0 });
    const layer = layerOf(tooltip);
    pointer(target.unsafeElement, 'pointerenter');
    pointer(target.unsafeElement, 'pointerleave');
    clock.advance(60);
    dispose();
    clock.settle();
    expect(layer.isDestroyed()).toBe(true);
    expect(tooltip.isDestroyed()).toBe(false);
    expect(tooltip.Position).toEqual(originalPosition);
    expect(tooltip.unsafeElement.style.pointerEvents).toBe('auto');
  });

  it('tracks changing bounds, content size, and viewport size; unmounting hides it', () => {
    const { root, target, tooltip, moveTarget } = fixture();
    withToolTip(target, tooltip, { delay: 0 });
    const layer = layerOf(tooltip);
    pointer(target.unsafeElement, 'pointerenter');
    moveTarget(rect(20, 10, 100, 40));
    tooltip.Size = udim2FromOffset(120, 50);
    clock.advance();
    expect(tooltip.Position).toEqual(udim2FromOffset(10, 62));
    vi.stubGlobal('innerWidth', 120);
    clock.advance();
    expect(tooltip.Position.X.Offset).toBe(8);
    root.unmount();
    clock.advance();
    expect(layer.Enabled).toBe(false);
  });

  it('positions transformed custom content using its rendered bounds', () => {
    const { target, tooltip } = fixture();
    vi.mocked(tooltip.unsafeElement.getBoundingClientRect).mockImplementation(() =>
      rect(tooltip.Position.X.Offset - 10, tooltip.Position.Y.Offset - 20, 100, 80),
    );
    withToolTip(target, tooltip, { delay: 0 });
    pointer(target.unsafeElement, 'pointerenter');
    expect(tooltip.AbsolutePosition).toEqual(vector2(200, 108));
    clock.advance();
    expect(tooltip.AbsolutePosition).toEqual(vector2(200, 108));
  });

  it('restores custom content and preserves unrelated ARIA descriptions on disposal', () => {
    const { target, tooltip } = fixture();
    const position = udim2FromOffset(30, 40);
    const anchor = vector2(0.5, 0.5);
    tooltip.setProperties({ Position: position, AnchorPoint: anchor, Visible: false });
    tooltip.unsafeElement.id = 'custom-tip';
    tooltip.unsafeElement.setAttribute('role', 'note');
    tooltip.unsafeElement.style.pointerEvents = 'none';
    target.unsafeElement.setAttribute('aria-describedby', 'help');
    const dispose = withToolTip(target, tooltip, { delay: 0 });
    const layer = layerOf(tooltip);
    expect(target.unsafeElement.getAttribute('aria-describedby')).toBe('help custom-tip');
    expect(tooltip.unsafeElement.getAttribute('role')).toBe('tooltip');
    pointer(target.unsafeElement, 'pointerenter');
    target.unsafeElement.setAttribute('aria-describedby', 'help custom-tip extra');
    dispose();
    dispose();
    expect(layer.isDestroyed()).toBe(true);
    expect(tooltip.isDestroyed()).toBe(false);
    expect(tooltip.Parent).toBeUndefined();
    expect(tooltip.Position).toEqual(position);
    expect(tooltip.AnchorPoint).toEqual(anchor);
    expect(tooltip.Visible).toBe(false);
    expect(tooltip.unsafeElement.id).toBe('custom-tip');
    expect(tooltip.unsafeElement.getAttribute('role')).toBe('note');
    expect(tooltip.unsafeElement.style.pointerEvents).toBe('none');
    expect(target.unsafeElement.getAttribute('aria-describedby')).toBe('help extra');
    pointer(target.unsafeElement, 'pointerenter');
    vi.advanceTimersByTime(1000);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('preserves a pre-existing description token and removes generated attributes from custom content', () => {
    const { target, tooltip } = fixture();
    tooltip.unsafeElement.id = 'existing-tip';
    target.unsafeElement.setAttribute('aria-describedby', 'existing-tip');
    withToolTip(target, tooltip)();
    expect(target.unsafeElement.getAttribute('aria-describedby')).toBe('existing-tip');
    expect(tooltip.unsafeElement.hasAttribute('role')).toBe(false);
    tooltip.unsafeElement.removeAttribute('id');
    withToolTip(target, tooltip)();
    expect(tooltip.unsafeElement.hasAttribute('id')).toBe(false);
  });

  it.each([false, true])('cleans up when the target is destroyed (already open: %s)', (open) => {
    const { target, tooltip } = fixture();
    const dispose = withToolTip(target, tooltip);
    const layer = layerOf(tooltip);
    pointer(target.unsafeElement, 'pointerenter');
    if (open) vi.advanceTimersByTime(300);
    target.destroy();
    vi.advanceTimersByTime(1000);
    clock.advance();
    dispose();
    expect(layer.isDestroyed()).toBe(true);
    expect(tooltip.isDestroyed()).toBe(false);
    expect(tooltip.Parent).toBeUndefined();
    expect(target.unsafeElement.hasAttribute('aria-describedby')).toBe(false);
  });

  it('releases the binding when custom content is destroyed', () => {
    const { target, tooltip } = fixture();
    const dispose = withToolTip(target, tooltip, { delay: 0 });
    const layer = layerOf(tooltip);
    pointer(target.unsafeElement, 'pointerenter');
    tooltip.destroy();
    pointer(target.unsafeElement, 'pointerenter');
    clock.advance();
    dispose();
    expect(layer.isDestroyed()).toBe(true);
    expect(target.unsafeElement.hasAttribute('aria-describedby')).toBe(false);
  });

  it('creates styled, literal text in the target document and destroys generated content', () => {
    const { target } = fixture();
    const dispose = withToolTip(target, '<img src=x> Help', { style: { TextSize: 17 } });
    const id = target.unsafeElement.getAttribute('aria-describedby')!;
    const bubble = document.getElementById(id)!;
    expect(bubble.ownerDocument).toBe(target.unsafeElement.ownerDocument);
    expect(bubble.textContent).toBe('<img src=x> Help');
    expect(bubble.querySelector('img')).toBeNull();
    expect(bubble.querySelector<HTMLElement>('[data-framekit-text]')?.style.fontSize).toBe('17px');
    expect(bubble.style.maxWidth).toBe('min(320px, calc(100vw - 16px))');
    dispose();
    expect(document.getElementById(id)).toBeNull();
    expect(target.unsafeElement.hasAttribute('aria-describedby')).toBe(false);
  });

  it('opens for an already-focused trigger and ignores touch hover', () => {
    const { target, tooltip } = fixture();
    target.unsafeElement.focus();
    const dispose = withToolTip(target, tooltip);
    expect(layerOf(tooltip).Enabled).toBe(true);
    dispose();
    target.unsafeElement.blur();
    withToolTip(target, tooltip, { delay: 0 });
    pointer(target.unsafeElement, 'pointerenter', 260, 230, 'touch');
    expect(layerOf(tooltip).Enabled).toBe(false);
  });

  it('keeps the tooltip layer inside a dialog rather than its inert outside document', () => {
    const { root, target, tooltip } = fixture();
    const dialog = document.body.appendChild(document.createElement('dialog'));
    root.mount(dialog);
    withToolTip(target, tooltip, { delay: 0 });
    const layer = layerOf(tooltip);
    expect(layer.unsafeElement.parentElement).toBe(dialog);
    target.unsafeElement.focus();
    expect(layer.Enabled).toBe(true);
  });

  it('creates generated content and its overlay in the trigger iframe document', () => {
    const iframe = document.body.appendChild(document.createElement('iframe'));
    const ownerDocument = iframe.contentDocument!;
    const root = createScreenGui({}, { ownerDocument });
    const target = createTextButton({}, { ownerDocument });
    owners.add(root);
    root.mount(ownerDocument.body);
    target.Parent = root;
    const dispose = withToolTip(target, 'Iframe help');
    const id = target.unsafeElement.getAttribute('aria-describedby')!;
    const bubble = ownerDocument.getElementById(id)!;
    expect(bubble.ownerDocument).toBe(ownerDocument);
    expect(bubble.parentElement?.parentElement).toBe(ownerDocument.body);
    expect(document.getElementById(id)).toBeNull();
    root.destroy();
    dispose();
    expect(ownerDocument.getElementById(id)).toBeNull();
  });

  it('rejects invalid bindings before changing content or mounting a layer', () => {
    const { root, target, tooltip } = fixture();
    expect(() => withToolTip(target, tooltip, { delay: -1 })).toThrow(/delay/);
    expect(() => withToolTip(target, tooltip, { gap: Infinity })).toThrow(/gap/);
    tooltip.Parent = root;
    expect(() => withToolTip(target, tooltip)).toThrow(/detached/);
    expect(tooltip.Parent).toBe(root);
    tooltip.Parent = undefined;
    const button = createTextButton();
    owners.add(button);
    expect(() => withToolTip(target, button)).toThrow(/non-interactive/);
    const foreign = createFrame(
      {},
      { ownerDocument: document.implementation.createHTMLDocument() },
    );
    owners.add(foreign);
    expect(() => withToolTip(target, foreign)).toThrow(/target document/);
    tooltip.destroy();
    expect(() => withToolTip(target, tooltip)).toThrow(/destroyed/);
    target.destroy();
    expect(() => withToolTip(target, 'Help')).toThrow(/destroyed/);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });
});
