import { createObservableValue, type ScrollingFrame, type TextButton } from 'framekit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import counterExample from '../examples/guide/first-interface.ts?example';
import { createCodeBlock } from '../src/components/code-block';
import { themes } from '../src/theme';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Playground code blocks', () => {
  it('immediately displays prepared code and copies its exact source, including blank lines', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const block = createCodeBlock(createObservableValue(themes.dark), 'Example', counterExample);
    const code = block.unsafeElement.querySelector('pre')!;
    const copy = block.findFirstChild('ExampleCopy') as TextButton;

    expect(code.textContent).toBe(counterExample.source);
    expect(code.textContent).toContain("from 'framekit';\n\n");
    expect(code.textContent).toContain("\n  Name: 'Counter',\n");

    copy.unsafeElement.click();

    await expect.poll(() => writeText.mock.calls[0]?.[0]).toBe(code.textContent);
    expect(copy.Text).toBe('COPIED  ✅');
    block.destroy();
  });

  it('keeps horizontal keyboard scrolling and starts at the final formatted height', () => {
    const block = createCodeBlock(createObservableValue(themes.light), 'Example', counterExample);
    const scroll = block.findFirstChild('ExampleScroll') as ScrollingFrame;

    expect(scroll.unsafeElement.tabIndex).toBe(0);
    expect(scroll.unsafeElement.style.overscrollBehaviorX).toBe('none');
    expect(scroll.unsafeElement.style.overflowX).toBe('auto');
    expect(scroll.unsafeElement.style.overflowY).toBe('hidden');
    expect(block.Size.Y.Offset).toBe(72 + counterExample.source.split('\n').length * 22);
    block.destroy();
  });
});
