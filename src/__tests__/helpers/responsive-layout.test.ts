import { bindResponsiveLayout, createFrame } from 'framekit';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('responsive layouts', () => {
  it('switches responsive layouts only when the breakpoint is crossed', () => {
    const owner = createFrame();
    const mobile = vi.fn();
    const desktop = vi.fn();

    vi.stubGlobal('innerWidth', 640);
    bindResponsiveLayout(owner, {
      breakpoint: 700,
      mobile,
      desktop,
    });

    expect(mobile).toHaveBeenCalledOnce();
    expect(desktop).not.toHaveBeenCalled();

    vi.stubGlobal('innerWidth', 680);
    window.dispatchEvent(new Event('resize'));
    expect(mobile).toHaveBeenCalledOnce();

    vi.stubGlobal('innerWidth', 700);
    window.dispatchEvent(new Event('resize'));
    expect(desktop).toHaveBeenCalledOnce();
    vi.stubGlobal('innerWidth', 900);
    window.dispatchEvent(new Event('resize'));
    expect(desktop).toHaveBeenCalledOnce();
    vi.stubGlobal('innerWidth', 699);
    window.dispatchEvent(new Event('resize'));
    expect(mobile).toHaveBeenCalledTimes(2);

    owner.destroy();
    vi.stubGlobal('innerWidth', 900);
    window.dispatchEvent(new Event('resize'));
    expect(mobile).toHaveBeenCalledTimes(2);
    expect(desktop).toHaveBeenCalledOnce();
  });

  it('uses the owner document viewport rather than the global window', () => {
    const iframe = document.body.appendChild(document.createElement('iframe'));
    const ownerDocument = iframe.contentDocument!;
    const ownerWindow = ownerDocument.defaultView!;
    const owner = createFrame({}, { ownerDocument });
    const mobile = vi.fn();
    const desktop = vi.fn();
    vi.stubGlobal('innerWidth', 1200);
    Object.defineProperty(ownerWindow, 'innerWidth', { configurable: true, value: 400 });
    bindResponsiveLayout(owner, { breakpoint: 700, mobile, desktop });
    expect(mobile).toHaveBeenCalledOnce();
    expect(desktop).not.toHaveBeenCalled();
    Object.defineProperty(ownerWindow, 'innerWidth', { configurable: true, value: 700 });
    ownerWindow.dispatchEvent(new ownerWindow.Event('resize'));
    expect(desktop).toHaveBeenCalledOnce();
    owner.destroy();
    iframe.remove();
  });

  it('rejects destroyed responsive owners before applying a layout', () => {
    const owner = createFrame();
    const mobile = vi.fn();
    const desktop = vi.fn();

    owner.destroy();

    expect(() =>
      bindResponsiveLayout(owner, {
        breakpoint: 700,
        mobile,
        desktop,
      }),
    ).toThrow(/destroyed/);
    expect(mobile).not.toHaveBeenCalled();
    expect(desktop).not.toHaveBeenCalled();
  });

  it('stops responding when explicitly disposed without destroying its owner', () => {
    const owner = createFrame();
    const mobile = vi.fn();
    const desktop = vi.fn();
    vi.stubGlobal('innerWidth', 640);
    const dispose = bindResponsiveLayout(owner, { breakpoint: 700, mobile, desktop });

    dispose();
    dispose();
    vi.stubGlobal('innerWidth', 900);
    window.dispatchEvent(new Event('resize'));

    expect(owner.isDestroyed()).toBe(false);
    expect(mobile).toHaveBeenCalledOnce();
    expect(desktop).not.toHaveBeenCalled();
    owner.destroy();
  });

  it('does not retain a resize listener when the initial layout destroys its owner', () => {
    const owner = createFrame();
    const mobile = vi.fn(() => owner.destroy());
    const desktop = vi.fn();

    vi.stubGlobal('innerWidth', 640);
    bindResponsiveLayout(owner, {
      breakpoint: 700,
      mobile,
      desktop,
    });

    vi.stubGlobal('innerWidth', 900);
    window.dispatchEvent(new Event('resize'));

    expect(mobile).toHaveBeenCalledOnce();
    expect(desktop).not.toHaveBeenCalled();
  });

  it('applies container layouts when their ordered width ranges become active', () => {
    const resizeObserver = installResizeObserver();
    const owner = createFrame();
    const container = createFrame();
    const compact = vi.fn();
    const medium = vi.fn();
    const wide = vi.fn();
    const bounds = stubBounds(container.unsafeElement, 420, 300);
    const breakpoints = [
      { maxWidth: 479, apply: compact },
      { maxWidth: 899, apply: medium },
      { apply: wide },
    ] as const;

    bindResponsiveLayout(owner, { observe: container, breakpoints });

    expect(compact).toHaveBeenCalledWith({
      width: 420,
      height: 300,
      breakpoint: breakpoints[0],
      previousBreakpoint: undefined,
    });
    expect(resizeObserver.observe).toHaveBeenCalledWith(container.unsafeElement);

    bounds.width = 479;
    resizeObserver.trigger();
    expect(compact).toHaveBeenCalledOnce();

    bounds.width = 480;
    resizeObserver.trigger();
    expect(medium).toHaveBeenCalledWith({
      width: 480,
      height: 300,
      breakpoint: breakpoints[1],
      previousBreakpoint: breakpoints[0],
    });

    bounds.width = 900;
    resizeObserver.trigger();
    expect(wide).toHaveBeenCalledWith({
      width: 900,
      height: 300,
      breakpoint: breakpoints[2],
      previousBreakpoint: breakpoints[1],
    });

    owner.destroy();
    container.destroy();
  });

  it('records the active container breakpoint before applying its layout', () => {
    const resizeObserver = installResizeObserver();
    const owner = createFrame();
    const bounds = stubBounds(owner.unsafeElement, 400, 300);
    const compact = vi.fn();
    const wide = vi.fn(() => resizeObserver.trigger());

    bindResponsiveLayout(owner, {
      observe: owner,
      breakpoints: [{ maxWidth: 600, apply: compact }, { apply: wide }],
    });

    bounds.width = 800;
    resizeObserver.trigger();

    expect(compact).toHaveBeenCalledOnce();
    expect(wide).toHaveBeenCalledOnce();
    owner.destroy();
  });

  it('disconnects container observation on disposal or destruction', () => {
    const explicitlyDisposedObserver = installResizeObserver();
    const firstOwner = createFrame();
    stubBounds(firstOwner.unsafeElement, 400, 300);
    const firstApply = vi.fn();
    const dispose = bindResponsiveLayout(firstOwner, {
      observe: firstOwner,
      breakpoints: [{ apply: firstApply }],
    });

    dispose();
    dispose();
    explicitlyDisposedObserver.trigger();
    expect(explicitlyDisposedObserver.disconnect).toHaveBeenCalled();
    expect(firstApply).toHaveBeenCalledOnce();
    firstOwner.destroy();

    const destroyedContainerObserver = installResizeObserver();
    const secondOwner = createFrame();
    const container = createFrame();
    stubBounds(container.unsafeElement, 400, 300);
    bindResponsiveLayout(secondOwner, {
      observe: container,
      breakpoints: [{ apply: vi.fn() }],
    });

    container.destroy();
    expect(destroyedContainerObserver.disconnect).toHaveBeenCalledOnce();
    secondOwner.destroy();
  });

  it('rejects invalid container layout configurations', () => {
    installResizeObserver();
    const owner = createFrame();
    const container = createFrame();
    stubBounds(container.unsafeElement, 400, 300);
    const apply = vi.fn();

    expect(() =>
      bindResponsiveLayout(owner, {
        observe: container,
        breakpoints: [{ maxWidth: 600, apply }],
      }),
    ).toThrow(/final.*omit maxWidth/i);
    expect(() =>
      bindResponsiveLayout(owner, {
        observe: container,
        breakpoints: [{ maxWidth: 600, apply }, { maxWidth: 500, apply }, { apply }],
      }),
    ).toThrow(/strictly increasing/i);

    container.destroy();
    expect(() =>
      bindResponsiveLayout(owner, {
        observe: container,
        breakpoints: [{ apply }],
      }),
    ).toThrow(/container.*destroyed/i);
    owner.destroy();
  });

  it('rejects a container from another document', () => {
    installResizeObserver();
    const owner = createFrame();
    const otherDocument = document.implementation.createHTMLDocument();
    const container = createFrame({}, { ownerDocument: otherDocument });

    expect(() =>
      bindResponsiveLayout(owner, {
        observe: container,
        breakpoints: [{ apply: vi.fn() }],
      }),
    ).toThrow(/same document/i);

    owner.destroy();
    container.destroy();
  });
});

type MutableBounds = { width: number; height: number };

const stubBounds = (element: HTMLElement, width: number, height: number): MutableBounds => {
  const bounds = { width, height };
  vi.spyOn(element, 'getBoundingClientRect').mockImplementation(
    () =>
      ({
        width: bounds.width,
        height: bounds.height,
        top: 0,
        right: bounds.width,
        bottom: bounds.height,
        left: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) satisfies DOMRect,
  );
  return bounds;
};

const installResizeObserver = (): Readonly<{
  trigger: () => void;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}> => {
  let connected = false;
  const observe = vi.fn(() => {
    connected = true;
  });
  const disconnect = vi.fn(() => {
    connected = false;
  });
  const unobserve = vi.fn();
  let callback: ResizeObserverCallback | undefined;

  class TestResizeObserver implements ResizeObserver {
    public constructor(nextCallback: ResizeObserverCallback) {
      callback = nextCallback;
    }

    public readonly observe = observe;
    public readonly disconnect = disconnect;
    public readonly unobserve = unobserve;
  }

  const callbackObserver = { observe, disconnect, unobserve } satisfies ResizeObserver;
  vi.stubGlobal('ResizeObserver', TestResizeObserver);
  return {
    trigger: (): void => {
      if (connected) {
        callback?.([], callbackObserver);
      }
    },
    observe,
    disconnect,
  };
};
