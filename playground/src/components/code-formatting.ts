import * as estree from 'prettier/plugins/estree';
import * as html from 'prettier/plugins/html';
import * as typescript from 'prettier/plugins/typescript';
import { format } from 'prettier/standalone';
import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import bashGrammar from 'shiki/langs/bash.mjs';
import htmlGrammar from 'shiki/langs/html.mjs';
import typescriptGrammar from 'shiki/langs/typescript.mjs';
import darkPlus from 'shiki/themes/dark-plus.mjs';
import lightPlus from 'shiki/themes/light-plus.mjs';

// One highlighter serves the site; only the grammars used by our examples are bundled.
const highlighter = createHighlighterCoreSync({
  langs: [typescriptGrammar, htmlGrammar, bashGrammar],
  themes: [lightPlus, darkPlus],
  engine: createJavaScriptRegexEngine(),
});

/** Produces the single source used by both syntax rendering and clipboard writes. */
export const prepareCode = async (
  source: string,
  filename: string,
): Promise<Readonly<{ source: string; html: string }>> => {
  const language =
    filename === 'Terminal' ? 'bash' : filename.endsWith('.html') ? 'html' : 'typescript';
  const formatted =
    language === 'bash'
      ? source.trimEnd()
      : (
          await format(source, {
            parser: language,
            plugins: [typescript, estree, html],
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
