import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  append,
  children,
  Color3,
  createFrame,
  createNode,
  createScreenGui,
  createSignal,
  destroy,
  find,
  isDestroyed,
  isMounted,
  mount,
  parent,
  props,
  UDim2,
  unmount,
  update,
  Vector2,
} from '..';

afterEach(() => document.body.replaceChildren());

describe('nodes', () => {
  it('tracks, reparents, finds, and destroys children', () => {
    const first = createNode({ Name: 'First' });
    const second = createNode({ Name: 'Second' });
    const child = createNode({ Name: 'Child' });
    const grandchild = createNode({ Name: 'Grandchild' });
    append(first, child);
    append(child, grandchild);
    expect(children(first)).toEqual([child]);
    expect(find(first, 'Grandchild', true)).toBe(grandchild);
    append(second, child);
    expect(children(first)).toEqual([]);
    expect(children(second)).toEqual([child]);
    expect(parent(child)).toBe(second);
    destroy(second);
    expect(isDestroyed(child)).toBe(true);
    expect(isDestroyed(grandchild)).toBe(true);
  });

  it('rejects cycles and mutations after destruction', () => {
    const root = createNode();
    const child = createNode();
    append(root, child);
    expect(() => append(child, root)).toThrow(/descendants/);
    destroy(child);
    expect(() => update(child, { Name: 'Too late' })).toThrow(/destroyed/);
  });
});

describe('signals', () => {
  it('subscribes with an idempotent unsubscribe function', () => {
    const signal = createSignal<[number]>();
    const listener = vi.fn();
    const unsubscribe = signal.subscribe(listener);
    signal.emit(1);
    unsubscribe();
    unsubscribe();
    signal.emit(2);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(1);
  });
});

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

  it('updates native styles from a property patch', () => {
    const frame = createFrame();
    update(frame, {
      Size: new UDim2(0.5, -20, 1, -40),
      Position: UDim2.fromScale(0.5, 0.25),
      AnchorPoint: new Vector2(0.5, 1),
      BackgroundColor3: Color3.fromRGB(25, 50, 75),
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
