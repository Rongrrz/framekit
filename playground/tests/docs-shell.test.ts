import {
  createFrame,
  createTextButton,
  createUIListLayout,
  createObservableValue,
  type Frame,
  type ScrollingFrame,
  type TextLabel,
} from 'framekit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  appendArticleSection,
  appendCodeBlock,
  createDocsShell,
  createExampleRow,
} from '../src/components/docs-shell';
import type { PlaygroundLayout } from '../src/layout';
import { themes } from '../src/theme';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('documentation spacing', () => {
  it('uses the shared axis-aware scrolling behavior for code examples', () => {
    const parent = createFrame();
    appendCodeBlock(parent, createObservableValue(themes.dark), 'Example', [
      { text: 'message.Text = "Ready";' },
    ]);
    const scroll = parent.findFirstChild('ExampleScroll', true) as ScrollingFrame;

    expect(scroll.unsafeElement.style.overscrollBehaviorX).toBe('none');
    expect(scroll.unsafeElement.style.overscrollBehaviorY).toBe('auto');
    expect(scroll.unsafeElement.style.overflowX).toBe('auto');
    expect(scroll.unsafeElement.style.overflowY).toBe('hidden');
    expect(scroll.unsafeElement.tabIndex).toBe(0);
    parent.destroy();
  });

  it.each([1, 8])('sizes a %s-line code example with balanced vertical padding', (lineCount) => {
    const parent = createFrame();
    appendCodeBlock(
      parent,
      createObservableValue(themes.dark),
      'Example',
      Array.from({ length: lineCount }, () => ({ text: 'const example = true;' })),
    );
    const block = parent.findFirstChild('Example') as Frame;
    const first = block.findFirstChild('CodeLine1', true) as TextLabel;
    const last = block.findFirstChild(`CodeLine${lineCount}`, true) as TextLabel;
    const bottomPadding = block.Size.Y.Offset - last.Position.Y.Offset - last.Size.Y.Offset;
    expect(bottomPadding).toBe(first.Position.Y.Offset);
    expect(block.Size.Y.Offset).toBe(32 + lineCount * 22);
    parent.destroy();
  });

  it('uses natural paragraph height and fixed heading typography', () => {
    const parent = createFrame();
    const heading = appendArticleSection(
      parent,
      createObservableValue(themes.dark),
      'Heading',
      'Body',
    );
    const labels = parent.getChildren().filter((child) => child.isA('TextLabel'));
    expect(heading.TextScaled).toBe(false);
    expect(heading.TextSize).toBe(28);
    for (const label of labels) {
      expect(label.AutomaticSize).toBe('Y');
      expect(label.TextWrapped).toBe(true);
      expect(
        label.unsafeElement.querySelector<HTMLElement>('[data-framekit-text]')?.style.position,
      ).toBe('static');
    }
    parent.destroy();
  });

  it('keeps example rows in the article flow when the responsive direction changes', () => {
    const parent = createFrame();
    createUIListLayout().Parent = parent;
    const layout = createObservableValue<PlaygroundLayout>('desktop');
    const row = createExampleRow(parent, layout);
    createTextButton().Parent = row;
    expect(row.unsafeElement.style.position).toBe('relative');
    expect(row.unsafeElement.style.flexDirection).toBe('row');
    layout.set('mobile');
    expect(row.unsafeElement.style.position).toBe('relative');
    expect(row.unsafeElement.style.flexDirection).toBe('column');
    parent.destroy();
  });

  it('tracks wrapped article height and releases its observer with the page', () => {
    const resize = { notify: () => undefined as void };
    const disconnect = vi.fn();
    const observe = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resize.notify = callback;
        }
        observe = observe;
        disconnect = disconnect;
      },
    );
    const layout = createObservableValue<PlaygroundLayout>('desktop');
    const shell = createDocsShell(
      'GuidePage',
      'guide',
      layout,
      createObservableValue(themes.dark),
      createObservableValue('guide'),
    );
    const height = vi
      .spyOn(shell.article.unsafeElement, 'offsetHeight', 'get')
      .mockReturnValue(1200);
    resize.notify();
    expect(shell.page.Size.Y.Offset).toBe(44 + 1200 + 64);
    layout.set('mobile');
    height.mockReturnValue(1800);
    resize.notify();
    expect(shell.page.Size.Y.Offset).toBe(42 + 1800 + 64);
    height.mockReturnValue(0);
    resize.notify();
    expect(shell.page.Size.Y.Offset).toBe(42 + 1800 + 64);
    expect(observe).toHaveBeenCalledWith(shell.article.unsafeElement);
    shell.page.destroy();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
