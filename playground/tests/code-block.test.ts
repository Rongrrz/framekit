import { createObservableValue, type ScrollingFrame, type TextButton } from 'framekit';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCodeBlock } from '../src/components/code-block';
import * as formatting from '../src/components/code-formatting';
import { themes } from '../src/theme';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Playground code blocks', () => {
  it('copies the formatted source with indentation and blank lines, exactly as displayed', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const block = createCodeBlock(createObservableValue(themes.dark), 'Example', [
      "import { createFrame } from 'framekit';",
      '',
      "const card=createFrame({Name:'Profile',Visible:true});",
      'card.Parent = app;',
    ]);

    const copy = block.findFirstChild('ExampleCopy') as TextButton;
    // Copy also works before the asynchronous formatting enhancement has finished.
    copy.unsafeElement.click();

    const expected =
      "import { createFrame } from 'framekit';\n\nconst card = createFrame({ Name: 'Profile', Visible: true });\ncard.Parent = app;";

    await expect.poll(() => writeText.mock.calls[0]?.[0]).toBe(expected);
    expect(block.unsafeElement.querySelector('pre code')?.textContent).toBe(expected);
    expect(block.unsafeElement.querySelector('.shiki')).not.toBeNull();
    expect(copy.Text).toBe('COPIED  ✅');
    block.destroy();
  });

  it('keeps a focusable horizontal scroll region and sizes itself to the formatted lines', async () => {
    const block = createCodeBlock(createObservableValue(themes.light), 'Example', [
      "const card = createFrame({ Name: 'Profile', Visible: true, BackgroundTransparency: 1, Rotation: 24 });",
    ]);

    const scroll = block.findFirstChild('ExampleScroll') as ScrollingFrame;
    expect(scroll.unsafeElement.tabIndex).toBe(0);
    expect(scroll.unsafeElement.style.overscrollBehaviorX).toBe('none');
    expect(scroll.unsafeElement.style.overflowX).toBe('auto');
    expect(scroll.unsafeElement.style.overflowY).toBe('hidden');
    await expect.poll(() => block.unsafeElement.querySelector('.shiki')).not.toBeNull();

    const source = block.unsafeElement.querySelector('code')!.textContent!;
    expect(source).toContain("\n  Name: 'Profile',\n");
    expect(block.Size.Y.Offset).toBe(72 + source.split('\n').length * 22);
    block.destroy();
  });

  it.each([
    ['index.html', '<div id="app"></div>\n<script>const count = 1;</script>'],
    ['Terminal', '# In your application\n\nnpm install framekit'],
    ['example.ts', '// A comment\nconst title = `Count: ${count + 1}`;'],
  ])('highlights %s safely with both VS Code palettes', async (filename, source) => {
    const example = await formatting.prepareCode(source, filename);
    const container = document.createElement('div');
    container.innerHTML = example.html;
    expect(container.querySelector('code')!.textContent).toBe(example.source);
    expect(container.querySelector('script')).toBeNull();
    expect(example.html).toContain('--shiki-dark:');
    expect(container.querySelectorAll('code span[style]').length).toBeGreaterThan(1);
  });

  it('does not copy or update an example destroyed while formatting loads', async () => {
    const writeText = vi.fn();
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    let finish!: (example: Readonly<{ source: string; html: string }>) => void;

    const pending = new Promise<Readonly<{ source: string; html: string }>>((resolve) => {
      finish = resolve;
    });

    const prepare = vi.spyOn(formatting, 'prepareCode').mockReturnValueOnce(pending);

    const block = createCodeBlock(createObservableValue(themes.dark), 'Example', [
      'const count=1;',
    ]);

    (block.findFirstChild('ExampleCopy') as TextButton).unsafeElement.click();
    await expect.poll(() => prepare.mock.calls.length).toBe(1);
    block.destroy();
    finish({
      source: 'const count = 1;',
      html: '<pre class="shiki"><code>const count = 1;</code></pre>',
    });
    await pending;
    await Promise.resolve();
    expect(block.unsafeElement.querySelector('.shiki')).toBeNull();
    expect(writeText).not.toHaveBeenCalled();
  });
});
