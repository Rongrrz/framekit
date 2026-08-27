import { describe, expect, it, vi } from 'vitest';

import { fk } from '../..';
import { resetDocumentAfterEach } from '../helpers/reset-document';

resetDocumentAfterEach();

describe('text boxes', () => {
  it('keeps typed text synchronized and emits its string value', () => {
    const box = fk.createTextBox({ PlaceholderText: 'Type here' });
    const changed = vi.fn();
    fk.on(box, 'TextChanged', changed);

    const editor = box.element.querySelector<HTMLElement>('[data-framekit-text-box]')!;
    const placeholder = box.element.querySelector<HTMLElement>(
      '[data-framekit-text-box-placeholder]',
    )!;
    expect(placeholder.textContent).toBe('Type here');
    expect(placeholder.style.display).toBe('');

    editor.textContent = 'Hello FrameKit';
    editor.dispatchEvent(new InputEvent('input', { bubbles: true }));

    expect(fk.textBoxText(box)).toBe('Hello FrameKit');
    expect(fk.props(box).Text).toBe('Hello FrameKit');
    expect(placeholder.style.display).toBe('none');
    expect(changed).toHaveBeenCalledWith('Hello FrameKit', expect.any(InputEvent));
  });

  it('renders safe rich text and returns its source string', () => {
    const source =
      '<b>Bold</b> <i>italic</i> <font color="#ff6f5f" size="18">coral</font><script>bad()</script>';
    const box = fk.createTextBox({ Text: source, RichText: true, MultiLine: true });
    const editor = box.element.querySelector<HTMLElement>('[data-framekit-text-box]')!;

    expect(editor.querySelector('b')?.textContent).toBe('Bold');
    expect(editor.querySelector('i')?.textContent).toBe('italic');
    expect(editor.querySelector('[data-framekit-rich-font]')?.textContent).toBe('coral');
    expect(editor.querySelector('script')).toBeNull();
    expect(editor.textContent).not.toContain('bad()');
    expect(fk.textBoxText(box)).toBe(source);

    editor.append(document.createTextNode(' updated'));
    editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
    expect(fk.textBoxText(box)).toContain('<b>Bold</b>');
    expect(fk.textBoxText(box)).toContain(' updated');
  });

  it('can switch between rich and ordinary text without interpreting markup', () => {
    const box = fk.createTextBox({ Text: '<b>Hello</b>', RichText: true });
    const editor = box.element.querySelector<HTMLElement>('[data-framekit-text-box]')!;
    expect(editor.querySelector('b')).not.toBeNull();

    fk.update(box, { RichText: false });
    expect(editor.querySelector('b')).toBeNull();
    expect(editor.textContent).toBe('<b>Hello</b>');
  });
});
