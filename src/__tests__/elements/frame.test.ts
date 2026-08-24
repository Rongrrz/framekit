import { describe, expect, it } from 'vitest';

import {
  append,
  color3,
  createFrame,
  createScreenGui,
  destroy,
  isDestroyed,
  isMounted,
  mount,
  props,
  udim2,
  udim2FromScale,
  unmount,
  update,
  vector2,
} from '../..';
import { resetDocumentAfterEach } from '../helpers/reset-document';

resetDocumentAfterEach();

describe('screen GUIs and frames', () => {
  it('mounts, reparents, unmounts, and synchronizes the DOM tree', () => {
    const target = document.body.appendChild(document.createElement('main'));
    const gui = createScreenGui();
    const container = createFrame();
    const child = createFrame();
    mount(gui, target);
    append(gui, container);
    append(container, child);
    expect(isMounted(gui)).toBe(true);
    expect(target.querySelector('[data-framekit="ScreenGui"]')).not.toBeNull();
    expect(container.element.firstElementChild).toBe(child.element);
    append(gui, child);
    expect(container.element.childElementCount).toBe(0);
    unmount(gui);
    expect(target.childElementCount).toBe(0);
  });

  it('always covers the viewport regardless of its mount target', () => {
    const gui = createScreenGui();
    expect(gui.element.style.position).toBe('fixed');
    expect(gui.element.style.inset).toBe('0');
    expect(gui.element.style.width).toBe('100%');
    expect(gui.element.style.height).toBe('100%');
    expect(gui.element.style.overscrollBehavior).toBe('none');

    const target = document.body.appendChild(document.createElement('main'));
    mount(gui, target);
    expect(target.firstElementChild).toBe(gui.element);
  });

  it('updates native styles from a property patch', () => {
    const frame = createFrame();
    update(frame, {
      Size: udim2(0.5, -20, 1, -40),
      Position: udim2FromScale(0.5, 0.25),
      AnchorPoint: vector2(0.5, 1),
      BackgroundColor3: color3(25, 50, 75),
      BackgroundTransparency: 0.25,
      Visible: false,
      ZIndex: 8,
    });
    expect(frame.element.style.width).toBe('calc(50% - 20px)');
    expect(frame.element.style.height).toBe('calc(100% - 40px)');
    expect(frame.element.style.transform).toBe('translate(-50%, -100%)');
    expect(frame.element.style.backgroundColor).toContain('25');
    expect(frame.element.style.display).toBe('none');
    expect(frame.element.style.zIndex).toBe('8');
    expect(props(frame).Visible).toBe(false);
  });

  it('renders automatic sizing and descendant clipping', () => {
    const frame = createFrame({ AutomaticSize: 'X', ClipsDescendants: true });
    expect(frame.element.style.width).toBe('auto');
    expect(frame.element.style.height).toBe('100px');
    expect(frame.element.style.overflow).toBe('hidden');

    update(frame, { AutomaticSize: 'XY', ClipsDescendants: false });
    expect(frame.element.style.height).toBe('auto');
    expect(frame.element.style.overflow).toBe('visible');
  });

  it('reports missing mount targets and rejects lifecycle calls after destruction', () => {
    const gui = createScreenGui();
    expect(() => mount(gui, '#missing-target')).toThrow(/not found/);
    expect(() => mount(gui, '[')).toThrow(/not a valid selector/);
    expect(isMounted(gui)).toBe(false);
    destroy(gui);
    expect(() => mount(gui, document.body)).toThrow(/destroyed/);
    expect(() => unmount(gui)).toThrow(/destroyed/);
    expect(() => isMounted(gui)).toThrow(/destroyed/);
  });

  it('rejects unknown properties in constructors and updates', () => {
    expect(() => createFrame({ Typo: true } as never)).toThrow(/Unknown property "Typo"/);
    const frame = createFrame();
    expect(() => update(frame, { Typo: true } as never)).toThrow(/Unknown property "Typo"/);
  });

  it('controls the whole tree and cleans up when destroyed', () => {
    const gui = createScreenGui({ Enabled: false, DisplayOrder: 4 });
    const frame = createFrame();
    mount(gui, document.body);
    append(gui, frame);
    expect(gui.element.style.display).toBe('none');
    destroy(gui);
    expect(document.body.childElementCount).toBe(0);
    expect(isDestroyed(frame)).toBe(true);
  });
});
