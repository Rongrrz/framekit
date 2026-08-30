import { describe, expect, it, vi } from 'vitest';

import { fk } from '../../..';
import { resetDocumentAfterEach } from '../../support/reset-document';

resetDocumentAfterEach();

describe('text boxes', () => {
  it('keeps typed text synchronized and emits its string value', () => {
    const box = fk.createTextBox({ PlaceholderText: 'Type here' });
    const changed = vi.fn();

    box.onTextChanged(changed);

    expect('onClick' in box).toBe(false);

    const editor = box.element.querySelector<HTMLElement>('[data-framekit-text-box]')!;
    const placeholder = box.element.querySelector<HTMLElement>(
      '[data-framekit-text-box-placeholder]',
    )!;

    expect(placeholder.textContent).toBe('Type here');
    expect(placeholder.style.display).toBe('');
    expect(editor.getAttribute('aria-placeholder')).toBe('Type here');

    editor.textContent = 'Hello FrameKit';
    editor.dispatchEvent(new InputEvent('input', { bubbles: true }));

    expect(box.Text).toBe('Hello FrameKit');
    expect(placeholder.style.display).toBe('none');
    expect(changed).toHaveBeenCalledWith('Hello FrameKit', expect.any(InputEvent));
  });

  it('always treats markup as ordinary text', () => {
    const source = '<b>Hello</b><script>bad()</script>';
    const box = fk.createTextBox({ Text: source });
    const editor = box.element.querySelector<HTMLElement>('[data-framekit-text-box]')!;

    expect(editor.querySelector('b')).toBeNull();
    expect(editor.querySelector('script')).toBeNull();
    expect(editor.textContent).toBe(source);
    expect(box.Text).toBe(source);
  });

  it('removes disallowed line breaks from both state and the single-line editor', () => {
    const box = fk.createTextBox();
    const editor = box.element.querySelector<HTMLElement>('[data-framekit-text-box]')!;

    editor.innerHTML = '<div>First</div><div>Second</div>';
    editor.dispatchEvent(new InputEvent('input', { bubbles: true }));

    expect(box.Text).toBe('FirstSecond');
    expect(editor.textContent).toBe('FirstSecond');
    expect(editor.querySelector('div')).toBeNull();
  });
});
