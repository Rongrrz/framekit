import { escapeRichText } from 'framekit';
import estree from 'prettier/plugins/estree';
import typescript from 'prettier/plugins/typescript';
import { format } from 'prettier/standalone';
import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import grammar from 'shiki/langs/typescript.mjs';
import mocha from 'shiki/themes/catppuccin-mocha.mjs';
import githubDark from 'shiki/themes/github-dark.mjs';
import githubLight from 'shiki/themes/github-light.mjs';

import type { PreparedCode } from './code-themes';

// The worker loads only TypeScript and these themes when the code dialog is first opened.
const highlighter = createHighlighterCoreSync({
  langs: [grammar],
  themes: [githubDark, githubLight, mocha],
  engine: createJavaScriptRegexEngine(),
});

const fullHex = (color: string): string =>
  color.replace(/^#([\da-f])([\da-f])([\da-f])$/i, '#$1$1$2$2$3$3');

/** Tokens become escaped FrameKit rich text; no caller text is interpreted as HTML. */
export const prepareCode = async (source: string): Promise<PreparedCode> => {
  const formatted = await format(source, {
    parser: 'typescript',
    plugins: [typescript, estree],
    printWidth: 88,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'all',
  });
  const palette = (theme: string): PreparedCode['palettes']['github-dark'] => {
    const { fg, bg } = highlighter.getTheme(theme);
    const { tokens } = highlighter.codeToTokens(formatted.trimEnd(), { lang: 'typescript', theme });

    return {
      foreground: fullHex(fg),
      background: fullHex(bg),
      muted: theme === 'github-light' ? '#8c959f' : '#6e7681',
      text: tokens
        .map((line) =>
          line
            .map(
              (token) =>
                `<font color="${fullHex(token.color ?? fg)}">${escapeRichText(token.content)}</font>`,
            )
            .join(''),
        )
        .join('\n'),
    };
  };

  return {
    source: formatted,
    palettes: {
      'github-dark': palette('github-dark'),
      'github-light': palette('github-light'),
      'catppuccin-mocha': palette('catppuccin-mocha'),
    },
  };
};
