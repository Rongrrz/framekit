import { describe, expect, it } from 'vitest';

import { fk } from '../../../index';
import { resetDocumentAfterEach } from '../../support/reset-document';

resetDocumentAfterEach();

describe('screen GUIs', () => {
  it('mounts, reparents, unmounts, and synchronizes the DOM tree', () => {
    const target = document.body.appendChild(document.createElement('main'));
    const gui = fk.createScreenGui();
    const container = fk.createFrame();
    const child = fk.createFrame();

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
    const gui = fk.createScreenGui();

    gui.mount(target);
    gui.element.remove();

    expect(gui.isMounted()).toBe(false);

    gui.mount(target);

    expect(gui.isMounted()).toBe(true);
    expect(gui.element.parentElement).toBe(target);
  });

  it('keeps ScreenGui instances at the hierarchy root', () => {
    const target = document.body.appendChild(document.createElement('main'));
    const gui = fk.createScreenGui();
    const frame = fk.createFrame();

    gui.mount(target);

    expect(() => frame.addChild(gui)).toThrow(/hierarchy root/);
    expect(gui.Parent).toBeUndefined();
    expect(gui.element.parentElement).toBe(target);
    expect(gui.isMounted()).toBe(true);

    gui.Parent = undefined;
    gui.removeFromParent();

    expect(gui.element.parentElement).toBe(target);
    expect(gui.isMounted()).toBe(true);
  });

  it('always covers the viewport regardless of its mount target', () => {
    const gui = fk.createScreenGui();

    expect(gui.element.style.position).toBe('fixed');
    expect(gui.element.style.inset).toBe('0');
    expect(gui.element.style.width).toBe('100%');
    expect(gui.element.style.height).toBe('100%');
    expect(gui.element.style.overscrollBehavior).toBe('none');

    const target = document.body.appendChild(document.createElement('main'));

    gui.mount(target);

    expect(target.firstElementChild).toBe(gui.element);
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
    gui.addChild(frame);

    expect(gui.element.style.display).toBe('none');

    gui.destroy();

    expect(document.body.childElementCount).toBe(0);
    expect(frame.isDestroyed()).toBe(true);
  });
});
