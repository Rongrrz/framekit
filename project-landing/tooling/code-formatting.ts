import { extname } from 'node:path';

import { format } from 'prettier';
import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import bashGrammar from 'shiki/langs/bash.mjs';
import htmlGrammar from 'shiki/langs/html.mjs';
import typescriptGrammar from 'shiki/langs/typescript.mjs';
import darkPlus from 'shiki/themes/dark-plus.mjs';
import lightPlus from 'shiki/themes/light-plus.mjs';

import { escapeRichText } from '../../src/values/rich-text.ts';
import type { CodeExample } from '../src/code-example.ts';

// Formatting and highlighting run in Node; the browser receives only their prepared output.
const highlighter = createHighlighterCoreSync({
  langs: [typescriptGrammar, htmlGrammar, bashGrammar],
  themes: [lightPlus, darkPlus],
  engine: createJavaScriptRegexEngine(),
});

/** Produces the single source used by both syntax rendering and clipboard writes. */
export const prepareCode = async (source: string, filename: string): Promise<CodeExample> => {
  const normalized = source.replaceAll('\r\n', '\n').trimEnd();
  const language =
    extname(filename) === '.sh' ? 'bash' : extname(filename) === '.html' ? 'html' : 'typescript';

  const formatted =
    language === 'bash'
      ? normalized
      : (
          await format(normalized, {
            parser: language,
            filepath: filename,
            printWidth: 80,
            tabWidth: 2,
            singleQuote: true,
          })
        ).trimEnd();

  return {
    source: formatted,
    light: preparePalette(formatted, language, 'light-plus'),
    dark: preparePalette(formatted, language, 'dark-plus'),
  };
};

const preparePalette = (source: string, lang: string, theme: string): CodeExample['light'] => {
  const { tokens } = highlighter.codeToTokens(source, { lang, theme });
  const { fg, bg } = highlighter.getTheme(theme);

  return {
    foreground: fg,
    background: bg,
    text: tokens
      .map((line) =>
        line
          .map((token) => {
            let text = escapeRichText(token.content);

            // Shiki font-style bits are italic (1), bold (2), and underline (4).
            for (const [tag, bit] of [
              ['i', 1],
              ['b', 2],
              ['u', 4],
            ] as const) {
              if ((token.fontStyle ?? 0) & bit) {
                text = `<${tag}>${text}</${tag}>`;
              }
            }

            return token.color ? `<font color="${token.color}">${text}</font>` : text;
          })
          .join(''),
      )
      .join('\n'),
  };
};
