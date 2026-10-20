import {
  createTextLabel,
  createTextButton,
  createLink,
  createFrame,
  escapeRichText,
} from 'framekit';
import { describe, expect, it } from 'vitest';

describe('rich text', () => {
  it.each([createTextLabel, createTextButton, createLink])(
    'keeps literal Text by default and formats only when enabled',
    (create) => {
      const label = create({ Text: '<b>Ready</b> &amp; waiting' });
      const child = createFrame();
      if (label.isA('TextLabel')) {
        child.Parent = label;
      }

      expect(label.unsafeElement.textContent).toBe('<b>Ready</b> &amp; waiting');
      expect(label.unsafeElement.querySelector('b')).toBeNull();
      label.RichText = true;
      expect(label.unsafeElement.textContent).toBe('Ready & waiting');
      expect(label.unsafeElement.querySelector('b')?.textContent).toBe('Ready');
      label.RichText = false;
      expect(label.unsafeElement.textContent).toBe('<b>Ready</b> &amp; waiting');
      if (label.isA('TextLabel')) {
        expect(child.Parent).toBe(label);
      }
      label.destroy();
      child.destroy();
    },
  );

  it('nests inline formatting, preserves line breaks, and applies transparency to explicit colors', () => {
    const label = createTextLabel({
      RichText: true,
      Text: '<b>Bold <i>italic</i></b><br/><font color="#ff0000"><u>Red</u></font>',
      TextTransparency: 0.25,
    });
    expect(label.unsafeElement.textContent).toBe('Bold italic\nRed');
    expect(label.unsafeElement.querySelector('b i')?.textContent).toBe('italic');
    const red = label.unsafeElement.querySelector('u')!.parentElement!;
    expect(red.style.color).toBe('rgb(255 0 0 / 0.75)');
    label.TextTransparency = 0.5;
    expect(red.style.color).toBe('rgb(255 0 0 / 0.5)');
    expect(label.unsafeElement.dataset.framekitTextContent).toBe('Bold italic\nRed');
    expect(() => label.setProperties({ RichText: 'yes', Text: 'lost' } as never)).toThrow(
      /RichText/,
    );
    expect(label.unsafeElement.textContent).toBe('Bold italic\nRed');
    label.destroy();
  });

  it('treats unsupported markup and attributes as literal text and decodes escaped content once', () => {
    const source =
      '<script>alert(1)</script><img src=x onerror=alert(1)><b onclick="alert(1)">Hi</b><font color="red">red</font>';
    const label = createTextLabel({ RichText: true, Text: source });
    expect(label.unsafeElement.textContent).toBe(source);
    expect(label.unsafeElement.querySelector('script, img, b, font')).toBeNull();
    label.Text = `<i>${escapeRichText('<b>literal &amp;</b>')}</i> &#x1F600; &#65; &unknown;`;
    expect(label.unsafeElement.textContent).toBe('<b>literal &amp;</b> 😀 A &unknown;');
    expect(label.unsafeElement.querySelector('b')).toBeNull();
    label.Text = '<amp>&constructor; &toString;</amp>';
    expect(label.unsafeElement.textContent).toBe('<amp>&constructor; &toString;</amp>');
    label.destroy();
  });
});
