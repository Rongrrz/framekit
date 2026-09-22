import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fk, fkh } from '../../index.js';
import { setupAnimationClock } from '../support/animation-clock.js';

const clock = setupAnimationClock();
const owners = new Set<fk.Instance>();
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.stubGlobal('innerWidth', 800);
  vi.stubGlobal('innerHeight', 600);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
});
afterEach(() => {
  for (const owner of owners) owner.destroy();
  owners.clear();
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
const pointer = (element: HTMLElement, type: string, pointerType = 'mouse'): void => {
  element.dispatchEvent(
    new PointerEvent(type, { pointerType, clientX: 240, clientY: 220, bubbles: true }),
  );
};
const key = (element: HTMLElement, value: string, shiftKey = false): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    key: value,
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(event);
  return event;
};
const deferred = (): Readonly<{
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
}> => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};
const fixture = () => {
  const root = fk.createScreenGui();
  root.mount(document.body);
  owners.add(root);
  const target = fk.createTextButton({ Text: 'Actions' });
  target.Parent = root;
  vi.spyOn(target.unsafeElement, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(200, 200, 100, 40),
  );
  const panel = fk.createFrame({ Size: fk.udim2FromOffset(160, 100), Visible: false });
  owners.add(panel);
  vi.spyOn(panel.unsafeElement, 'getBoundingClientRect').mockImplementation(
    () => new DOMRect(panel.Position.X.Offset, panel.Position.Y.Offset, 160, 100),
  );
  const first = fk.createTextButton({ Text: 'Copy' });
  first.Parent = panel;
  const last = fk.createTextButton({ Text: 'Export' });
  last.Parent = panel;
  const outside = fk.createTextButton({ Text: 'Outside' });
  outside.Parent = root;
  const bind = (options: fkh.PopoverOptions = {}) => {
    const dispose = fkh.withPopover(target, panel, options);
    const layer = panel.Parent as fk.ScreenGui;
    return { dispose, layer };
  };
  return { root, target, panel, first, last, outside, bind };
};

describe('popovers', () => {
  it('opens hover content after delay and keeps buttons usable across the gap', () => {
    const { target, panel, first, bind } = fixture();
    const clicked = vi.fn();
    first.onClick(clicked);
    const { layer } = bind({ openOn: 'hover' });
    pointer(target.unsafeElement, 'pointerenter');
    vi.advanceTimersByTime(149);
    expect(layer.Enabled).toBe(false);
    vi.advanceTimersByTime(1);
    expect(layer.Enabled).toBe(true);
    expect(panel.Position).toEqual(fk.udim2FromOffset(170, 252));
    expect(target.unsafeElement.getAttribute('aria-expanded')).toBe('true');
    expect(target.unsafeElement.getAttribute('aria-controls')).toBe(panel.unsafeElement.id);
    expect(panel.unsafeElement.getAttribute('role')).toBe('group');
    expect(target.unsafeElement.hasAttribute('aria-describedby')).toBe(false);
    pointer(target.unsafeElement, 'pointerleave');
    vi.advanceTimersByTime(40);
    pointer(panel.unsafeElement, 'pointerenter');
    vi.advanceTimersByTime(1000);
    expect(layer.Enabled).toBe(true);
    first.unsafeElement.click();
    expect(clicked).toHaveBeenCalledOnce();
    pointer(panel.unsafeElement, 'pointerleave');
    vi.advanceTimersByTime(80);
    expect(layer.Enabled).toBe(false);
  });

  it('cancels early hover exits and ignores touch hover while allowing touch clicks', () => {
    const { target, bind } = fixture();
    const { layer } = bind({ openOn: 'hover' });
    pointer(target.unsafeElement, 'pointerenter');
    pointer(target.unsafeElement, 'pointerleave');
    vi.advanceTimersByTime(1000);
    expect(layer.Enabled).toBe(false);
    pointer(target.unsafeElement, 'pointerenter', 'touch');
    vi.advanceTimersByTime(1000);
    expect(layer.Enabled).toBe(false);
    target.unsafeElement.click();
    expect(layer.Enabled).toBe(true);
  });

  it('defaults to click and toggles independently of hover or focus', () => {
    const { target, bind } = fixture();
    const { layer } = bind();
    pointer(target.unsafeElement, 'pointerenter');
    target.unsafeElement.focus();
    vi.advanceTimersByTime(1000);
    expect(layer.Enabled).toBe(false);
    target.unsafeElement.click();
    expect(layer.Enabled).toBe(true);
    target.unsafeElement.click();
    expect(layer.Enabled).toBe(false);
    target.unsafeElement.click();
    expect(layer.Enabled).toBe(true);
  });

  it('opens on focus in hover mode and preserves focus moving into the panel', () => {
    const { target, first, outside, bind } = fixture();
    const { layer } = bind({ openOn: 'hover' });
    target.unsafeElement.focus();
    expect(layer.Enabled).toBe(true);
    first.unsafeElement.focus();
    vi.advanceTimersByTime(1000);
    expect(layer.Enabled).toBe(true);
    outside.unsafeElement.focus();
    vi.advanceTimersByTime(80);
    expect(layer.Enabled).toBe(false);
  });

  it('enters controls with ArrowDown or Tab and restores trigger focus on Escape', () => {
    const { target, first, bind } = fixture();
    const { layer } = bind();
    target.unsafeElement.focus();
    expect(key(target.unsafeElement, 'ArrowDown').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first.unsafeElement);
    expect(layer.Enabled).toBe(true);
    key(first.unsafeElement, 'Tab', true);
    expect(document.activeElement).toBe(target.unsafeElement);
    key(target.unsafeElement, 'Tab');
    expect(document.activeElement).toBe(first.unsafeElement);
    expect(key(first.unsafeElement, 'Escape').defaultPrevented).toBe(true);
    expect(layer.Enabled).toBe(false);
    expect(document.activeElement).toBe(target.unsafeElement);
    expect(target.unsafeElement.getAttribute('aria-expanded')).toBe('false');
  });

  it('dismisses outside pointer presses and pending hover with Escape', () => {
    const { target, first, outside, bind } = fixture();
    const { layer } = bind({ openOn: 'hover' });
    target.unsafeElement.click();
    pointer(first.unsafeElement, 'pointerdown');
    expect(layer.Enabled).toBe(true);
    pointer(outside.unsafeElement, 'pointerdown');
    expect(layer.Enabled).toBe(false);
    pointer(target.unsafeElement, 'pointerenter');
    key(target.unsafeElement, 'Escape');
    vi.advanceTimersByTime(1000);
    expect(layer.Enabled).toBe(false);
    pointer(target.unsafeElement, 'pointerleave');
    pointer(target.unsafeElement, 'pointerenter');
    vi.advanceTimersByTime(150);
    expect(layer.Enabled).toBe(true);
  });

  it('continues Tab after the trigger when leaving the last portalled control', () => {
    const { target, last, outside, bind } = fixture();
    const rectangle = new DOMRect(0, 0, 100, 40);
    const rectangles = {
      0: rectangle,
      length: 1,
      item: () => rectangle,
      [Symbol.iterator]: () => [rectangle][Symbol.iterator](),
    };
    for (const control of [target, outside])
      vi.spyOn(control.unsafeElement, 'getClientRects').mockReturnValue(rectangles);
    bind();
    target.unsafeElement.click();
    last.unsafeElement.focus();
    expect(key(last.unsafeElement, 'Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(outside.unsafeElement);
  });

  it('restores caller-owned content and accessibility attributes on disposal', () => {
    const { target, panel, bind } = fixture();
    const position = panel.Position,
      anchor = fk.vector2(0.5, 0.5);
    panel.AnchorPoint = anchor;
    panel.unsafeElement.id = 'actions-panel';
    panel.unsafeElement.setAttribute('role', 'region');
    target.unsafeElement.setAttribute('aria-controls', 'other');
    target.unsafeElement.setAttribute('aria-expanded', 'mixed');
    const { layer, dispose } = bind();
    target.unsafeElement.click();
    dispose();
    dispose();
    expect(layer.isDestroyed()).toBe(true);
    expect(panel.isDestroyed()).toBe(false);
    expect(panel.Parent).toBeUndefined();
    expect(panel.Visible).toBe(false);
    expect(panel.Position).toEqual(position);
    expect(panel.AnchorPoint).toEqual(anchor);
    expect(panel.unsafeElement.id).toBe('actions-panel');
    expect(panel.unsafeElement.getAttribute('role')).toBe('region');
    expect(target.unsafeElement.getAttribute('aria-controls')).toBe('other');
    expect(target.unsafeElement.getAttribute('aria-expanded')).toBe('mixed');
  });

  it.each(['target', 'content'])('releases the binding when %s is destroyed', (owner) => {
    const { target, panel, bind } = fixture();
    const { layer } = bind();
    target.unsafeElement.click();
    (owner === 'target' ? target : panel).destroy();
    expect(layer.isDestroyed()).toBe(true);
    expect(target.unsafeElement.hasAttribute('aria-controls')).toBe(false);
    if (owner === 'target') expect(panel.isDestroyed()).toBe(false);
  });

  it('validates interactive content and options before changing caller-owned state', () => {
    const { target, panel } = fixture();
    expect(() => fkh.withToolTip(target, panel)).toThrow(/non-interactive/);
    expect(() => fkh.withPopover(target, panel, { delay: -1 })).toThrow(/delay/);
    const other = document.implementation.createHTMLDocument();
    const foreign = fk.createFrame({}, { ownerDocument: other });
    owners.add(foreign);
    expect(() => fkh.withPopover(target, foreign)).toThrow(/target document/);
    expect(panel.Parent).toBeUndefined();
    expect(panel.Visible).toBe(false);
  });
});

describe('floating panel transitions', () => {
  it('springs opacity and retains momentum when its goal reverses', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const { target, bind } = fixture();
    const { layer } = bind();
    target.unsafeElement.click();
    expect(layer.unsafeElement.style.opacity).toBe('0');
    clock.advance(75);
    const openingOpacity = layer.unsafeElement.style.opacity;
    expect(Number(openingOpacity)).toBeGreaterThan(0);
    expect(Number(openingOpacity)).toBeLessThan(1);
    target.unsafeElement.click();
    expect(layer.unsafeElement.style.opacity).toBe(openingOpacity);
    clock.advance(1);
    expect(Number(layer.unsafeElement.style.opacity)).toBeGreaterThan(Number(openingOpacity));
    clock.advance(60);
    const closingOpacity = layer.unsafeElement.style.opacity;
    expect(Number(closingOpacity)).toBeLessThan(Number(openingOpacity));
    target.unsafeElement.click();
    expect(layer.unsafeElement.style.opacity).toBe(closingOpacity);
    clock.advance(1);
    expect(Number(layer.unsafeElement.style.opacity)).toBeLessThan(Number(closingOpacity));
    clock.advance(400);
    await Promise.resolve();
    expect(layer.unsafeElement.style.opacity).toBe('1');
    target.unsafeElement.click();
    clock.advance(400);
    await Promise.resolve();
    expect(layer.Enabled).toBe(false);
  });

  it('skips default fades under reduced motion', () => {
    const { target, bind } = fixture();
    const { layer } = bind();
    target.unsafeElement.click();
    expect(layer.unsafeElement.style.opacity).toBe('1');
    target.unsafeElement.click();
    expect(layer.Enabled).toBe(false);
  });

  it.each(['tooltip', 'popover'])(
    'runs custom hooks with visible %s content and waits for hide completion',
    async (kind) => {
      const { target, panel } = fixture();
      const hide = deferred();
      let showSignal!: AbortSignal;
      let hideSignal!: AbortSignal;
      const onShow = vi.fn(({ content, signal }: fkh.FloatingPanelContext) => {
        expect(content).toBe(panel);
        expect((panel.Parent as fk.ScreenGui).Enabled).toBe(true);
        showSignal = signal;
      });
      const onHide = vi.fn(({ signal }: fkh.FloatingPanelContext) => {
        hideSignal = signal;
        return hide.promise;
      });
      if (kind === 'tooltip') {
        panel.getChildren().forEach((child) => child.destroy());
        fkh.withToolTip(target, panel, { followCursor: true, delay: 0, onShow, onHide });
        pointer(target.unsafeElement, 'pointerenter');
      } else {
        fkh.withPopover(target, panel, { onShow, onHide });
        target.unsafeElement.click();
      }
      const layer = panel.Parent as fk.ScreenGui;
      expect(onShow).toHaveBeenCalledOnce();
      if (kind === 'tooltip') pointer(target.unsafeElement, 'pointerleave');
      else target.unsafeElement.click();
      expect(onHide).toHaveBeenCalledOnce();
      expect(showSignal.aborted).toBe(true);
      expect(layer.Enabled).toBe(true);
      expect(hideSignal.aborted).toBe(false);
      hide.resolve();
      await Promise.resolve();
      expect(layer.Enabled).toBe(false);
      expect(hideSignal.aborted).toBe(true);
    },
  );

  it('aborts superseded promises and ignores stale hide completion after reopening', async () => {
    const { target, bind } = fixture();
    const hidden = deferred();
    let signal!: AbortSignal;
    const onShow = vi.fn();
    const onHide = vi.fn((context: fkh.FloatingPanelContext) => {
      signal = context.signal;
      return hidden.promise;
    });
    const { layer } = bind({ onShow, onHide });
    target.unsafeElement.click();
    target.unsafeElement.click();
    expect(layer.Enabled).toBe(true);
    target.unsafeElement.click();
    expect(signal.aborted).toBe(true);
    expect(onShow).toHaveBeenCalledTimes(2);
    hidden.resolve();
    await Promise.resolve();
    expect(layer.Enabled).toBe(true);
  });

  it('aborts an unresolved show hook on hide and an unresolved hide hook on disposal', async () => {
    const { target, bind } = fixture();
    const showing = deferred(),
      hiding = deferred();
    let showSignal!: AbortSignal, hideSignal!: AbortSignal;
    const { layer, dispose } = bind({
      onShow: ({ signal }) => {
        showSignal = signal;
        return showing.promise;
      },
      onHide: ({ signal }) => {
        hideSignal = signal;
        return hiding.promise;
      },
    });
    target.unsafeElement.click();
    target.unsafeElement.click();
    expect(showSignal.aborted).toBe(true);
    dispose();
    expect(hideSignal.aborted).toBe(true);
    expect(layer.isDestroyed()).toBe(true);
    showing.resolve();
    hiding.resolve();
    await Promise.resolve();
  });

  it('restores visibility before reopening when a hide hook changed it', () => {
    const { target, panel, bind } = fixture();
    const onShow = vi.fn(({ content }: fkh.FloatingPanelContext) => {
      expect(content.Visible).toBe(true);
    });
    bind({
      onShow,
      onHide: ({ content }) => {
        content.Visible = false;
      },
    });
    target.unsafeElement.click();
    target.unsafeElement.click();
    target.unsafeElement.click();
    expect(panel.Visible).toBe(true);
    expect(onShow).toHaveBeenCalledTimes(2);
  });

  it('ignores rejection from an aborted hook after disposal', async () => {
    const logger = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { target, bind } = fixture();
    const pending = deferred();
    const { dispose } = bind({ onShow: () => pending.promise });
    target.unsafeElement.click();
    dispose();
    pending.reject(new Error('Animation aborted'));
    await Promise.resolve();
    expect(logger).not.toHaveBeenCalled();
  });

  it('aborts a pending hide and removes its overlay when the trigger is unmounted', () => {
    const { root, target, panel, bind } = fixture();
    const pending = deferred();
    let signal!: AbortSignal;
    const { layer } = bind({
      onHide: (context) => {
        signal = context.signal;
        return pending.promise;
      },
    });
    target.unsafeElement.click();
    target.unsafeElement.click();
    root.unmount();
    clock.advance();
    expect(layer.Enabled).toBe(false);
    expect(signal.aborted).toBe(true);
    expect(panel.isDestroyed()).toBe(false);
  });

  it.each(['throw', 'reject'])(
    'reports a failed hide hook (%s) and closes without leaving a stuck panel',
    async (failure) => {
      const logger = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { target, bind } = fixture();
      const error = new Error('Animation failed');
      const { layer } = bind({
        onHide: () => {
          if (failure === 'throw') throw error;
          return Promise.reject(error);
        },
      });
      target.unsafeElement.click();
      target.unsafeElement.click();
      await Promise.resolve();
      expect(layer.Enabled).toBe(false);
      expect(logger).toHaveBeenCalledWith('Floating panel animation hook failed.', error);
      target.unsafeElement.click();
      expect(layer.Enabled).toBe(true);
    },
  );
});
