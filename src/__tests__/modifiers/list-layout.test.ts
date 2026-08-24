import { describe, expect, it } from 'vitest';

import {
  append,
  createFrame,
  createUIListLayout,
  detach,
  parent,
  udim,
  udim2FromOffset,
  update,
} from '../..';
import { groupNode } from '../helpers/group-node';
import { resetDocumentAfterEach } from '../helpers/reset-document';

resetDocumentAfterEach();

describe('UI list layouts', () => {
  it('lays out direct GUI children and restores their positioning when detached', () => {
    const frame = createFrame();
    const first = createFrame({
      Name: 'First',
      Position: udim2FromOffset(10, 20),
      LayoutOrder: 2,
    });
    const second = createFrame({ Name: 'Second', LayoutOrder: 1 });
    const layout = createUIListLayout({ Padding: udim(0, 8) });
    append(frame, first);
    append(frame, second);
    append(frame, layout);

    expect(frame.element.style.display).toBe('flex');
    expect(frame.element.style.flexDirection).toBe('column');
    expect(frame.element.style.gap).toBe('8px');
    expect(first.element.style.position).toBe('relative');
    expect(first.element.style.left).toBe('auto');
    expect(first.element.style.order).toBe('1');
    expect(second.element.style.order).toBe('0');

    update(first, { Position: udim2FromOffset(25, 30), LayoutOrder: 0 });
    expect(first.element.style.left).toBe('auto');
    expect(first.element.style.order).toBe('0');
    expect(second.element.style.order).toBe('1');

    detach(layout);
    expect(frame.element.style.display).toBe('');
    expect(first.element.style.position).toBe('absolute');
    expect(first.element.style.left).toBe('25px');
    expect(first.element.style.top).toBe('30px');
  });

  it('updates direction, alignment, wrapping, and name sorting', () => {
    const frame = createFrame({ Visible: false });
    const zebra = createFrame({ Name: 'Zebra' });
    const alpha = createFrame({ Name: 'Alpha' });
    const layout = createUIListLayout({ SortOrder: 'Name' });
    append(frame, zebra);
    append(frame, alpha);
    append(frame, layout);
    expect(frame.element.style.display).toBe('none');
    expect(zebra.element.style.order).toBe('1');
    expect(alpha.element.style.order).toBe('0');

    update(frame, { Visible: true });
    update(layout, {
      FillDirection: 'Horizontal',
      HorizontalAlignment: 'Center',
      VerticalAlignment: 'Bottom',
      Wraps: true,
    });
    expect(frame.element.style.display).toBe('flex');
    expect(frame.element.style.flexDirection).toBe('row');
    expect(frame.element.style.flexWrap).toBe('wrap');
    expect(frame.element.style.justifyContent).toBe('center');
    expect(frame.element.style.alignItems).toBe('flex-end');

    update(zebra, { Name: 'Aardvark' });
    expect(zebra.element.style.order).toBe('0');
    expect(alpha.element.style.order).toBe('1');
  });

  it('rejects element-less parents', () => {
    const group = groupNode({ Name: 'Group' });
    const layout = createUIListLayout();
    expect(() => append(group, layout)).toThrow(/DOM-backed/);
    expect(parent(layout)).toBeUndefined();
  });
});
