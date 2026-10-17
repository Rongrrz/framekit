import { extname } from 'node:path';

import { format } from 'prettier';
import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import bashGrammar from 'shiki/langs/bash.mjs';
import htmlGrammar from 'shiki/langs/html.mjs';
import typescriptGrammar from 'shiki/langs/typescript.mjs';
import darkPlus from 'shiki/themes/dark-plus.mjs';
import lightPlus from 'shiki/themes/light-plus.mjs';

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
    html: highlighter.codeToHtml(formatted, {
      lang: language,
      themes: { light: 'light-plus', dark: 'dark-plus' },
    }),
  };
};
