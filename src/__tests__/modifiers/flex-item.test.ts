import { createFrame, createUIFlexItem, createUIListLayout, udim2FromOffset } from 'framekit';
import { describe, expect, it } from 'vitest';

describe('UI flex items', () => {
  it('retains preferred geometry and restores fixed sizing when detached or destroyed', () => {
    const row = createFrame();
    const child = createFrame({ Size: udim2FromOffset(80, 40), Position: udim2FromOffset(20, 30) });
    const layout = createUIListLayout({ FillDirection: 'Horizontal' });
    const flexible = createUIFlexItem({ Weight: 2 });
    layout.Parent = row;
    child.Parent = row;
    flexible.Parent = child;

    expect(flexible.isA('UIFlexItem')).toBe(true);
    expect(child.Size).toEqual(udim2FromOffset(80, 40));
    expect(child.unsafeElement.style.flexGrow).toBe('2');
    expect(child.unsafeElement.style.flexShrink).toBe('1');

    child.Size = udim2FromOffset(120, 40);
    flexible.Weight = 3;
    expect(child.unsafeElement.style.width).toBe('120px');
    expect(child.unsafeElement.style.flexGrow).toBe('3');
    expect(child.unsafeElement.style.position).toBe('relative');

    flexible.Parent = undefined;
    expect(child.unsafeElement.style.flexGrow).toBe('');
    expect(child.unsafeElement.style.flexShrink).toBe('0');

    flexible.Parent = child;
    flexible.destroy();
    layout.destroy();
    expect(child.unsafeElement.style.flexGrow).toBe('');
    expect(child.unsafeElement.style.flexShrink).toBe('0');
    expect(child.unsafeElement.style.position).toBe('absolute');
    expect(child.unsafeElement.style.left).toBe('20px');
    row.destroy();
  });

  it.each([0, -1, NaN, Infinity, '1'])('rejects invalid weights atomically: %s', (Weight) => {
    expect(() => createUIFlexItem({ Weight } as never)).toThrow(/Weight/);

    const item = createUIFlexItem();
    expect(() => item.setProperties({ Weight, Name: 'Changed' } as never)).toThrow(/Weight/);
    expect(item.Weight).toBe(1);
    expect(item.Name).toBe('UIFlexItem');
    item.destroy();
  });
});
