import { describe, expect, it, vi } from 'vitest';

import { fk } from '../../../index';
import { resetDocumentAfterEach } from '../../support/reset-document';

resetDocumentAfterEach();

describe('screen GUIs', () => {
  it('preserves its previous mount when new DOM placement fails', () => {
    const previous = document.body.appendChild(document.createElement('main'));
    const rejected = document.body.appendChild(document.createElement('aside'));
    const gui = fk.createScreenGui();
    gui.mount(previous);
    vi.spyOn(rejected, 'append').mockImplementation(() => {
      throw new Error('mount rejected');
    });

    expect(() => gui.mount(rejected)).toThrow(/mount rejected/);
    expect(gui.isMounted()).toBe(true);
    expect(gui.unsafeElement.parentElement).toBe(previous);
    gui.destroy();
  });

  it('mounts, reparents, unmounts, and synchronizes the DOM tree', () => {
    const target = document.body.appendChild(document.createElement('main'));
    const gui = fk.createScreenGui();
    const container = fk.createFrame();
    const child = fk.createFrame();

    gui.mount(target);
    container.Parent = gui;
    child.Parent = container;

    expect(gui.isMounted()).toBe(true);
    expect(target.querySelector('[data-framekit="ScreenGui"]')).not.toBeNull();
    expect(container.unsafeElement.firstElementChild).toBe(child.unsafeElement);

    child.Parent = gui;

    expect(container.unsafeElement.childElementCount).toBe(0);

    child.unsafeElement.remove();
    child.Parent = gui;

    expect(child.unsafeElement.parentElement).toBe(gui.unsafeElement);

    gui.unmount();

    expect(target.childElementCount).toBe(0);
  });

  it('repairs stale mount bookkeeping after low-level DOM changes', () => {
    const target = document.body.appendChild(document.createElement('main'));
    const gui = fk.createScreenGui();

    gui.mount(target);
    gui.unsafeElement.remove();

    expect(gui.isMounted()).toBe(false);

    gui.mount(target);

    expect(gui.isMounted()).toBe(true);
    expect(gui.unsafeElement.parentElement).toBe(target);
  });

  it('keeps ScreenGui instances at the hierarchy root', () => {
    const target = document.body.appendChild(document.createElement('main'));
    const gui = fk.createScreenGui();
    const frame = fk.createFrame();

    gui.mount(target);

    expect(() => (gui.Parent = frame)).toThrow(/hierarchy root/);
    expect(gui.Parent).toBeUndefined();
    expect(gui.unsafeElement.parentElement).toBe(target);
    expect(gui.isMounted()).toBe(true);

    gui.Parent = undefined;
    gui.Parent = undefined;

    expect(gui.unsafeElement.parentElement).toBe(target);
    expect(gui.isMounted()).toBe(true);
  });

  it('always covers the viewport regardless of its mount target', () => {
    const gui = fk.createScreenGui();

    expect(gui.unsafeElement.style.position).toBe('fixed');
    expect(gui.unsafeElement.style.inset).toBe('0');
    expect(gui.unsafeElement.style.width).toBe('100%');
    expect(gui.unsafeElement.style.height).toBe('100%');
    expect(gui.unsafeElement.style.overscrollBehavior).toBe('none');

    const target = document.body.appendChild(document.createElement('main'));

    gui.mount(target);

    expect(target.firstElementChild).toBe(gui.unsafeElement);
  });

  it('reports missing mount targets and rejects lifecycle calls after destruction', () => {
    const gui = fk.createScreenGui();

    expect(() => gui.mount('#missing-target')).toThrow(/not found/);
    expect(() => gui.mount('[')).toThrow(/not a valid selector/);
    expect(gui.isMounted()).toBe(false);

    gui.destroy();

    expect(() => gui.mount(document.body)).toThrow(/destroyed/);
    expect(() => gui.unmount()).toThrow(/destroyed/);
    expect(() => gui.isMounted()).toThrow(/destroyed/);
  });

  it('controls the whole tree and cleans up when destroyed', () => {
    const gui = fk.createScreenGui({ Enabled: false, DisplayOrder: 4 });
    const frame = fk.createFrame();

    gui.mount(document.body);
    frame.Parent = gui;

    expect(gui.unsafeElement.style.display).toBe('none');

    gui.destroy();

    expect(document.body.childElementCount).toBe(0);
    expect(frame.isDestroyed()).toBe(true);
  });
});
