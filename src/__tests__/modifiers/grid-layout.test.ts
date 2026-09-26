import { createFrame, createUIGridLayout, udim2FromOffset } from 'framekit';
import { describe, expect, it } from 'vitest';

import { resetDocumentAfterEach } from '../support/reset-document.js';

resetDocumentAfterEach();

describe('UI grid layouts', () => {
  it('lays out and sorts direct GUI children in equal-sized cells', () => {
    const frame = createFrame();
    const later = createFrame({ LayoutOrder: 2, Position: udim2FromOffset(10, 20) });
    const earlier = createFrame({ LayoutOrder: 1 });
    const layout = createUIGridLayout({
      CellSize: udim2FromOffset(120, 80),
      CellPadding: udim2FromOffset(12, 8),
      FillDirectionMaxCells: 3,
    });

    later.Parent = frame;
    earlier.Parent = frame;
    layout.Parent = frame;

    expect(layout).toMatchObject({
      FillDirection: 'Horizontal',
      HorizontalAlignment: 'Left',
      VerticalAlignment: 'Top',
      SortOrder: 'LayoutOrder',
    });
    expect(frame.unsafeElement.style.display).toBe('grid');
    expect(frame.unsafeElement.style.gridAutoFlow).toBe('row');
    expect(frame.unsafeElement.style.gridTemplateColumns).toBe('repeat(3, 120px)');
    expect(frame.unsafeElement.style.gridAutoRows).toBe('80px');
    expect(frame.unsafeElement.style.gap).toBe('8px 12px');
    expect(later.unsafeElement.style.position).toBe('relative');
    expect(later.unsafeElement.style.width).toBe('100%');
    expect(later.unsafeElement.style.height).toBe('100%');
    expect(later.unsafeElement.style.order).toBe('1');
    expect(earlier.unsafeElement.style.order).toBe('0');

    later.LayoutOrder = 0;

    expect(later.unsafeElement.style.order).toBe('0');
    expect(earlier.unsafeElement.style.order).toBe('1');

    layout.Parent = undefined;

    expect(frame.unsafeElement.style.display).toBe('');
    expect(later.unsafeElement.style.position).toBe('absolute');
    expect(later.unsafeElement.style.left).toBe('10px');
    expect(later.unsafeElement.style.top).toBe('20px');
    expect(later.unsafeElement.style.width).toBe('100px');
    expect(later.unsafeElement.style.height).toBe('100px');
  });

  it('fills vertical tracks and derives the track count from available space', () => {
    const frame = createFrame();
    const layout = createUIGridLayout({
      CellSize: udim2FromOffset(90, 60),
      FillDirection: 'Vertical',
      HorizontalAlignment: 'Center',
      VerticalAlignment: 'Bottom',
    });

    layout.Parent = frame;

    expect(frame.unsafeElement.style.gridAutoFlow).toBe('column');
    expect(frame.unsafeElement.style.gridTemplateRows).toBe('repeat(auto-fill, 60px)');
    expect(frame.unsafeElement.style.gridAutoColumns).toBe('90px');
    expect(frame.unsafeElement.style.justifyContent).toBe('center');
    expect(frame.unsafeElement.style.alignContent).toBe('flex-end');

    layout.FillDirection = 'Horizontal';

    expect(frame.unsafeElement.style.gridTemplateRows).toBe('');
    expect(frame.unsafeElement.style.gridAutoColumns).toBe('');
    expect(frame.unsafeElement.style.gridTemplateColumns).toBe('repeat(auto-fill, 90px)');
    expect(frame.unsafeElement.style.gridAutoRows).toBe('60px');
  });

  it('rejects invalid grid options without changing current properties', () => {
    expect(() => createUIGridLayout({ FillDirectionMaxCells: -1 })).toThrow(/non-negative finite/);
    expect(() => createUIGridLayout({ FillDirectionMaxCells: 1.5 })).toThrow(/integer/);

    const layout = createUIGridLayout({ FillDirectionMaxCells: 2 });

    expect(() => layout.setProperties({ FillDirectionMaxCells: 2.5 })).toThrow(/integer/);
    expect(layout.FillDirectionMaxCells).toBe(2);
  });
});
