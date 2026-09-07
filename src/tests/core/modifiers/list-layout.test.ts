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

    frame.addChild(first);
    frame.addChild(second);
    frame.addChild(layout);

    expect(frame.element.style.display).toBe('flex');
    expect(frame.element.style.flexDirection).toBe('column');
    expect(frame.element.style.gap).toBe('8px');
    expect(first.element.style.position).toBe('relative');
    expect(first.element.style.left).toBe('auto');
    expect(first.element.style.order).toBe('1');
    expect(second.element.style.order).toBe('0');

    first.setProperties({ Position: fk.udim2FromOffset(25, 30), LayoutOrder: 0 });

    expect(first.element.style.left).toBe('auto');
    expect(first.element.style.order).toBe('0');
    expect(second.element.style.order).toBe('1');

    layout.removeFromParent();

    expect(frame.element.style.display).toBe('');
    expect(first.element.style.position).toBe('absolute');
    expect(first.element.style.left).toBe('25px');
    expect(first.element.style.top).toBe('30px');
  });

  it('updates direction, alignment, wrapping, and name sorting', () => {
    const frame = fk.createFrame({ Visible: false });
    const zebra = fk.createFrame({ Name: 'Zebra' });
    const alpha = fk.createFrame({ Name: 'Alpha' });
    const layout = fk.createUIListLayout({ SortOrder: 'Name' });

    frame.addChild(zebra);
    frame.addChild(alpha);
    frame.addChild(layout);

    expect(frame.element.style.display).toBe('none');
    expect(zebra.element.style.order).toBe('1');
    expect(alpha.element.style.order).toBe('0');

    frame.setProperties({ Visible: true });
    layout.setProperties({
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
    expect(frame.element.style.alignContent).toBe('flex-end');

    zebra.setProperties({ Name: 'Aardvark' });

    expect(zebra.element.style.order).toBe('0');
    expect(alpha.element.style.order).toBe('1');
  });

  it('preserves layout positioning when a child modifier updates', () => {
    const container = fk.createFrame();
    const child = fk.createFrame({ Position: fk.udim2FromOffset(40, 50) });
    const scale = fk.createUIScale();

    child.addChild(scale);
    container.addChild(child);
    container.addChild(fk.createUIListLayout());

    expect(child.element.style.position).toBe('relative');
    expect(child.element.style.left).toBe('auto');

    scale.setProperties({ Scale: 1.05 });

    expect(child.element.style.position).toBe('relative');
    expect(child.element.style.left).toBe('auto');
    expect(child.element.style.getPropertyValue('scale')).toBe('1.05');
  });

  it('rejects element-less parents', () => {
    const parentModifier = fk.createUICorner();
    const layout = fk.createUIListLayout();

    expect(() => parentModifier.addChild(layout)).toThrow(/cannot contain child nodes/);
    expect(layout.Parent).toBeUndefined();
  });
});
