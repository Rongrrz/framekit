import { afterEach, describe, expect, it } from 'vitest';

import { Color3, Frame, Instance, ScreenGui, UDim2, Vector2 } from '..';

afterEach(() => document.body.replaceChildren());

describe('Instance', () => {
  it('tracks, reparents, finds, and destroys children', () => {
    const first = new Instance('First');
    const second = new Instance('Second');
    const child = new Instance('Child');
    const grandchild = new Instance('Grandchild');
    child.Parent = first;
    grandchild.Parent = child;
    expect(first.GetChildren()).toEqual([child]);
    expect(first.FindFirstChild('Grandchild', true)).toBe(grandchild);
    child.Parent = second;
    expect(first.GetChildren()).toEqual([]);
    expect(second.GetChildren()).toEqual([child]);
    second.Destroy();
    expect(child.IsDestroyed).toBe(true);
    expect(grandchild.IsDestroyed).toBe(true);
  });

  it('rejects cycles', () => {
    const parent = new Instance();
    const child = new Instance();
    child.Parent = parent;
    expect(() => {
      parent.Parent = child;
    }).toThrow(/descendants/);
  });
});

describe('ScreenGui and Frame', () => {
  it('mounts, reparents, unmounts, and synchronizes the DOM tree', () => {
    const target = document.body.appendChild(document.createElement('main'));
    const gui = new ScreenGui();
    const parent = new Frame();
    const child = new Frame();
    gui.Mount(target);
    parent.Parent = gui;
    child.Parent = parent;
    expect(target.querySelector('[data-framekit="ScreenGui"]')).not.toBeNull();
    expect(parent.Element.firstElementChild).toBe(child.Element);
    child.Parent = gui;
    expect(parent.Element.childElementCount).toBe(0);
    gui.Unmount();
    expect(target.childElementCount).toBe(0);
  });

  it('updates native styles from properties', () => {
    const frame = new Frame();
    frame.Size = new UDim2(0.5, -20, 1, -40);
    frame.Position = UDim2.fromScale(0.5, 0.25);
    frame.AnchorPoint = new Vector2(0.5, 1);
    frame.BackgroundColor3 = Color3.fromRGB(25, 50, 75);
    frame.BackgroundTransparency = 0.25;
    frame.Visible = false;
    frame.ZIndex = 8;
    expect(frame.Element.style.width).toBe('calc(50% - 20px)');
    expect(frame.Element.style.height).toBe('calc(100% - 40px)');
    expect(frame.Element.style.transform).toBe('translate(-50%, -100%)');
    expect(frame.Element.style.backgroundColor).toContain('25');
    expect(frame.Element.style.display).toBe('none');
    expect(frame.Element.style.zIndex).toBe('8');
  });

  it('controls the whole tree and cleans up when destroyed', () => {
    const gui = new ScreenGui();
    const frame = new Frame();
    gui.Mount(document.body);
    frame.Parent = gui;
    gui.Enabled = false;
    gui.DisplayOrder = 4;
    expect(
      document.querySelector<HTMLDivElement>('[data-framekit="ScreenGui"]')?.style.display,
    ).toBe('none');
    gui.Destroy();
    expect(document.body.childElementCount).toBe(0);
    expect(frame.IsDestroyed).toBe(true);
  });
});
