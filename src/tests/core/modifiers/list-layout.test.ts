import { describe, expect, it } from 'vitest';

import { fk } from '../../../index';
import { resetDocumentAfterEach } from '../../support/reset-document';

resetDocumentAfterEach();

describe('UI list layouts', () => {
  it('lays out direct GUI children and restores their positioning when detached', () => {
    const frame = fk.createFrame();
    const first = fk.createFrame({
      Name: 'First',
      Position: fk.udim2FromOffset(10, 20),
      LayoutOrder: 2,
    });
    const second = fk.createFrame({ Name: 'Second', LayoutOrder: 1 });
    const layout = fk.createUIListLayout({ Padding: fk.udim(0, 8) });

    first.Parent = frame;
    second.Parent = frame;
    layout.Parent = frame;

    expect(frame.unsafeElement.style.display).toBe('flex');
    expect(frame.unsafeElement.style.flexDirection).toBe('column');
    expect(frame.unsafeElement.style.gap).toBe('8px');
    expect(first.unsafeElement.style.position).toBe('relative');
    expect(first.unsafeElement.style.left).toBe('auto');
    expect(first.unsafeElement.style.order).toBe('1');
    expect(second.unsafeElement.style.order).toBe('0');

    first.setProperties({ Position: fk.udim2FromOffset(25, 30), LayoutOrder: 0 });

    expect(first.unsafeElement.style.left).toBe('auto');
    expect(first.unsafeElement.style.order).toBe('0');
    expect(second.unsafeElement.style.order).toBe('1');

    layout.Parent = undefined;

    expect(frame.unsafeElement.style.display).toBe('');
    expect(first.unsafeElement.style.position).toBe('absolute');
    expect(first.unsafeElement.style.left).toBe('25px');
    expect(first.unsafeElement.style.top).toBe('30px');
  });

  it('updates direction, alignment, wrapping, and name sorting', () => {
    const frame = fk.createFrame({ Visible: false });
    const zebra = fk.createFrame({ Name: 'Zebra' });
    const alpha = fk.createFrame({ Name: 'Alpha' });
    const layout = fk.createUIListLayout({ SortOrder: 'Name' });

    zebra.Parent = frame;
    alpha.Parent = frame;
    layout.Parent = frame;

    expect(frame.unsafeElement.style.display).toBe('none');
    expect(zebra.unsafeElement.style.order).toBe('1');
    expect(alpha.unsafeElement.style.order).toBe('0');

    frame.setProperties({ Visible: true });
    layout.setProperties({
      FillDirection: 'Horizontal',
      HorizontalAlignment: 'Center',
      VerticalAlignment: 'Bottom',
      Wraps: true,
    });

    expect(frame.unsafeElement.style.display).toBe('flex');
    expect(frame.unsafeElement.style.flexDirection).toBe('row');
    expect(frame.unsafeElement.style.flexWrap).toBe('wrap');
    expect(frame.unsafeElement.style.justifyContent).toBe('center');
    expect(frame.unsafeElement.style.alignItems).toBe('flex-end');
    expect(frame.unsafeElement.style.alignContent).toBe('flex-end');

    zebra.setProperties({ Name: 'Aardvark' });

    expect(zebra.unsafeElement.style.order).toBe('0');
    expect(alpha.unsafeElement.style.order).toBe('1');
  });

  it('preserves layout positioning when a child modifier updates', () => {
    const container = fk.createFrame();
    const child = fk.createFrame({ Position: fk.udim2FromOffset(40, 50) });
    const scale = fk.createUIScale();

    scale.Parent = child;
    child.Parent = container;
    fk.createUIListLayout().Parent = container;

    expect(child.unsafeElement.style.position).toBe('relative');
    expect(child.unsafeElement.style.left).toBe('auto');

    scale.setProperties({ Scale: 1.05 });

    expect(child.unsafeElement.style.position).toBe('relative');
    expect(child.unsafeElement.style.left).toBe('auto');
    expect(child.unsafeElement.style.getPropertyValue('scale')).toBe('1.05');
  });

  it('rejects element-less parents', () => {
    const parentModifier = fk.createUICorner();
    const layout = fk.createUIListLayout();

    expect(() => (layout.Parent = parentModifier)).toThrow(/cannot contain child nodes/);
    expect(layout.Parent).toBeUndefined();
  });
});
