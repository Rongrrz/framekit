import { describe, expect, it, vi } from 'vitest';

import { fk } from '../../..';
import { resetDocumentAfterEach } from '../../shared/reset-document';

const { color3FromRGB, createFrame, createScreenGui, udim2, udim2FromScale, vector2 } = fk;
resetDocumentAfterEach();

describe('screen GUIs and frames', () => {
  it('exposes hover events on non-button GUI nodes', () => {
    const frame = createFrame();
    const gui = createScreenGui();
    const entered = vi.fn();
    const left = vi.fn();

    frame.onMouseEnter(entered);
    frame.onMouseLeave(left);
    gui.onMouseEnter(entered);
    frame.element.dispatchEvent(new MouseEvent('mouseenter'));
    frame.element.dispatchEvent(new MouseEvent('mouseleave'));
    gui.element.dispatchEvent(new MouseEvent('mouseenter'));

    expect(entered).toHaveBeenCalledTimes(2);
    expect(left).toHaveBeenCalledOnce();
    expect('onClick' in frame).toBe(false);
    expect('onTextChanged' in frame).toBe(false);
  });

  it('mounts, reparents, unmounts, and synchronizes the DOM tree', () => {
    const target = document.body.appendChild(document.createElement('main'));
    const gui = createScreenGui();
    const container = createFrame();
    const child = createFrame();

    gui.mount(target);
    gui.addChild(container);
    container.addChild(child);

    expect(gui.isMounted()).toBe(true);
    expect(target.querySelector('[data-framekit="ScreenGui"]')).not.toBeNull();
    expect(container.element.firstElementChild).toBe(child.element);

    gui.addChild(child);

    expect(container.element.childElementCount).toBe(0);

    child.element.remove();
    gui.addChild(child);

    expect(child.element.parentElement).toBe(gui.element);

    gui.unmount();

    expect(target.childElementCount).toBe(0);
  });

  it('repairs stale mount bookkeeping after low-level DOM changes', () => {
    const target = document.body.appendChild(document.createElement('main'));
    const gui = createScreenGui();

    gui.mount(target);
    gui.element.remove();

    expect(gui.isMounted()).toBe(false);

    gui.mount(target);

    expect(gui.isMounted()).toBe(true);
    expect(gui.element.parentElement).toBe(target);
  });

  it('always covers the viewport regardless of its mount target', () => {
    const gui = createScreenGui();

    expect(gui.element.style.position).toBe('fixed');
    expect(gui.element.style.inset).toBe('0');
    expect(gui.element.style.width).toBe('100%');
    expect(gui.element.style.height).toBe('100%');
    expect(gui.element.style.overscrollBehavior).toBe('none');

    const target = document.body.appendChild(document.createElement('main'));

    gui.mount(target);

    expect(target.firstElementChild).toBe(gui.element);
  });

  it('updates native styles from a property patch', () => {
    const frame = createFrame();

    frame.setProperties({
      Size: udim2(0.5, -20, 1, -40),
      Position: udim2FromScale(0.5, 0.25),
      AnchorPoint: vector2(0.5, 1),
      Rotation: 30,
      BackgroundColor3: color3FromRGB(25, 50, 75),
      BackgroundTransparency: 0.25,
      Visible: false,
      ZIndex: 8,
    });

    expect(frame.element.style.width).toBe('calc(50% - 20px)');
    expect(frame.element.style.height).toBe('calc(100% - 40px)');
    expect(frame.element.style.transform).toBe('translate(-50%, -100%)');
    expect(frame.element.style.getPropertyValue('rotate')).toBe('30deg');
    expect(frame.element.style.backgroundColor).toContain('25');
    expect(frame.element.style.display).toBe('none');
    expect(frame.element.style.zIndex).toBe('8');
    expect(frame.Visible).toBe(false);
    expect(frame.Rotation).toBe(30);
  });

  it('reports typed property changes after successful updates', () => {
    const frame = createFrame();
    const listener = vi.fn();
    const unsubscribe = frame.onPropertyChanged('Position', listener);
    const firstPosition = fk.udim2FromOffset(20, 30);
    const secondPosition = fk.udim2FromOffset(40, 50);

    frame.Position = firstPosition;
    frame.setProperties({ Position: secondPosition });
    frame.Position = secondPosition;

    expect(listener).toHaveBeenNthCalledWith(1, firstPosition, fk.udim2FromOffset(0, 0));
    expect(listener).toHaveBeenNthCalledWith(2, secondPosition, firstPosition);

    unsubscribe();
    frame.Position = fk.udim2FromOffset(60, 70);

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('rejects non-finite rotations without disturbing the rendered angle', () => {
    const frame = createFrame({ Rotation: -15 });

    expect(frame.element.style.getPropertyValue('rotate')).toBe('-15deg');
    expect(() => frame.setProperties({ Rotation: Number.NaN })).toThrow(/finite/);
    expect(frame.Rotation).toBe(-15);
    expect(frame.element.style.getPropertyValue('rotate')).toBe('-15deg');
  });

  it('renders automatic sizing and descendant clipping', () => {
    const frame = createFrame({ AutomaticSize: 'X', ClipsDescendants: true });

    expect(frame.element.style.width).toBe('auto');
    expect(frame.element.style.height).toBe('100px');
    expect(frame.element.style.overflow).toBe('hidden');

    frame.setProperties({ AutomaticSize: 'XY', ClipsDescendants: false });

    expect(frame.element.style.height).toBe('auto');
    expect(frame.element.style.overflow).toBe('visible');
  });

  it('reports missing mount targets and rejects lifecycle calls after destruction', () => {
    const gui = createScreenGui();

    expect(() => gui.mount('#missing-target')).toThrow(/not found/);
    expect(() => gui.mount('[')).toThrow(/not a valid selector/);
    expect(gui.isMounted()).toBe(false);

    gui.destroy();

    expect(() => gui.mount(document.body)).toThrow(/destroyed/);
    expect(() => gui.unmount()).toThrow(/destroyed/);
    expect(() => gui.isMounted()).toThrow(/destroyed/);
  });

  it('rejects unknown properties in constructors and updates', () => {
    expect(() => createFrame({ Typo: true } as never)).toThrow(/Unknown property "Typo"/);

    const frame = createFrame();

    expect(() => frame.setProperties({ Typo: true } as never)).toThrow(/Unknown property "Typo"/);
  });

  it('rejects invalid primitive values and enum members without changing state', () => {
    expect(() => createFrame({ Rotation: Number.NaN })).toThrow(/Rotation.*finite/);

    const frame = createFrame();

    expect(() => frame.setProperties({ ZIndex: 1.5 })).toThrow(/ZIndex.*integer/);
    expect(() => frame.setProperties({ AutomaticSize: 'Invalid' } as never)).toThrow(
      /AutomaticSize/,
    );
    expect(frame).toMatchObject({ ZIndex: 1, AutomaticSize: 'None', Visible: true });
  });

  it('rejects malformed JavaScript values at the rendering boundary', () => {
    const frame = createFrame();

    expect(() => frame.setProperties({ Visible: 'yes' } as never)).toThrow(
      /Visible must be a boolean/,
    );
    expect(() => frame.setProperties({ Name: 42 } as never)).toThrow(/Name must be a string/);
    expect(() => frame.setProperties({ AnchorPoint: { X: 0, Y: 'center' } } as never)).toThrow(
      /AnchorPoint\.Y must be a finite number/,
    );
    expect(() =>
      frame.setProperties({ BackgroundColor3: { R: 999, G: 0, B: 0 } } as never),
    ).toThrow(/Color3 channels/);
    expect(frame).toMatchObject({
      Name: 'Frame',
      Visible: true,
      AnchorPoint: vector2(0, 0),
    });
  });

  it('controls the whole tree and cleans up when destroyed', () => {
    const gui = createScreenGui({ Enabled: false, DisplayOrder: 4 });
    const frame = createFrame();

    gui.mount(document.body);
    gui.addChild(frame);

    expect(gui.element.style.display).toBe('none');

    gui.destroy();

    expect(document.body.childElementCount).toBe(0);
    expect(frame.isDestroyed()).toBe(true);
  });
});
