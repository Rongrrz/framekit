import {
  createFrame,
  createTextButton,
  createUIListLayout,
  createUIScale,
  udim,
  udim2FromOffset,
} from 'framekit';
import { describe, expect, it } from 'vitest';

import { resetDocumentAfterEach } from '../support/reset-document.js';

resetDocumentAfterEach();

describe('UI list layouts', () => {
  it('preserves independent parent and child layouts through updates and detachment', () => {
    const article = createFrame();
    const row = createFrame({ Position: udim2FromOffset(20, 30) });
    const outer = createUIListLayout({ Padding: udim(0, 12) });
    const inner = createUIListLayout({ FillDirection: 'Horizontal', Padding: udim(0, 16) });
    outer.Parent = article;
    inner.Parent = row;
    row.Parent = article;
    const button = createTextButton();
    button.Parent = row;

    expect(row.unsafeElement.style.position).toBe('relative');
    expect(row.unsafeElement.style.display).toBe('flex');
    expect(row.unsafeElement.style.flexDirection).toBe('row');
    expect(row.unsafeElement.style.gap).toBe('16px');
    inner.FillDirection = 'Vertical';
    expect(row.unsafeElement.style.position).toBe('relative');
    expect(row.unsafeElement.style.flexDirection).toBe('column');
    outer.Padding = udim(0, 24);
    expect(row.unsafeElement.style.display).toBe('flex');
    expect(row.unsafeElement.style.gap).toBe('16px');

    row.Parent = undefined;
    expect(row.unsafeElement.style.position).toBe('absolute');
    expect(row.unsafeElement.style.left).toBe('20px');
    expect(row.unsafeElement.style.display).toBe('flex');
    expect(button.unsafeElement.style.position).toBe('relative');
    row.Parent = article;
    inner.destroy();
    expect(row.unsafeElement.style.position).toBe('relative');
    expect(row.unsafeElement.style.display).toBe('');
    expect(button.unsafeElement.style.position).toBe('absolute');
    article.destroy();
  });

  it('lays out direct GUI children and restores their positioning when detached', () => {
    const frame = createFrame();
    const first = createFrame({
      Name: 'First',
      Position: udim2FromOffset(10, 20),
      LayoutOrder: 2,
    });
    const second = createFrame({ Name: 'Second', LayoutOrder: 1 });
    const layout = createUIListLayout({ Padding: udim(0, 8) });

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

    first.setProperties({ Position: udim2FromOffset(25, 30), LayoutOrder: 0 });

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
    const frame = createFrame({ Visible: false });
    const zebra = createFrame({ Name: 'Zebra' });
    const alpha = createFrame({ Name: 'Alpha' });
    const layout = createUIListLayout({ SortOrder: 'Name' });

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
    const container = createFrame();
    const child = createFrame({ Position: udim2FromOffset(40, 50) });
    const scale = createUIScale();

    scale.Parent = child;
    child.Parent = container;
    createUIListLayout().Parent = container;

    expect(child.unsafeElement.style.position).toBe('relative');
    expect(child.unsafeElement.style.left).toBe('auto');

    scale.setProperties({ Scale: 1.05 });

    expect(child.unsafeElement.style.position).toBe('relative');
    expect(child.unsafeElement.style.left).toBe('auto');
    expect(child.unsafeElement.style.getPropertyValue('scale')).toBe('1.05');
  });
});
