import { color3FromHex } from 'framekit';
import { describe, expect, it } from 'vitest';

import { highlightCode, prepareCode } from '../src/code-format';
import { createSampleDocument } from '../src/document';
import { createEditor } from '../src/editor';
import { exportTypeScript } from '../src/export';

describe('formatted source', () => {
  it('highlights unfinished scripts without changing indentation or trailing whitespace', () => {
    const source =
      "\tconst literal = '</font><img src=x onerror=alert(1)>';\nexport default ( => {\n  \n";
    const result = highlightCode(source);
    expect(result.source).toBe(source);

    for (const theme of Object.values(result.palettes)) {
      const host = document.createElement('div');
      host.innerHTML = theme.text;
      expect(host.textContent).toBe(source);
      expect(host.querySelector('img')).toBeNull();
      expect(host.querySelectorAll('font').length).toBeGreaterThan(5);
    }
  });

  it('produces readable names, compact value constructors, and complete highlighted themes', async () => {
    const result = await prepareCode(exportTypeScript(createSampleDocument()));
    expect(result.source).toContain("const welcomeCard = createFrame({\n  Name: 'Welcome card',");
    expect(result.source).toContain('Position: udim2FromOffset(48, 48),');
    expect(result.source).toContain('const uiCorner = createUICorner({');
    expect(result.source).toContain("BackgroundColor3: color3FromHex('#ffffff'),");
    expect(result.source).not.toContain('"Position":');
    expect(new Set(Object.values(result.palettes).map((theme) => theme.background)).size).toBe(2);

    for (const theme of Object.values(result.palettes)) {
      expect(() => color3FromHex(theme.background)).not.toThrow();
      expect(() => color3FromHex(theme.foreground)).not.toThrow();
      const host = document.createElement('div');
      host.innerHTML = theme.text;
      expect(host.textContent).toBe(result.source.trimEnd());
      expect(host.querySelectorAll('font').length).toBeGreaterThan(20);
    }
  });

  it('escapes source text and generates safe unique identifiers for reserved or repeated names', async () => {
    const editor = createEditor();
    editor.edit('card', 'Name', 'class');
    editor.edit('headline', 'Name', 'class');
    editor.edit('headline', 'Text', '<script>alert("hello")</script>');
    const result = await prepareCode(exportTypeScript(editor.state.get().document));
    expect(result.source).toContain('const nodeClass = createFrame(');
    expect(result.source).toContain('const nodeClass2 = createTextLabel(');

    for (const theme of Object.values(result.palettes)) {
      const host = document.createElement('div');
      host.innerHTML = theme.text;
      expect(host.querySelector('script')).toBeNull();
      expect(host.textContent).toContain('<script>alert("hello")</script>');
    }
  });
});
