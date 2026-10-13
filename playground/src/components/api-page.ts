import { createLink, type Frame, type ObservableValue, udim2 } from 'framekit';

import { documentationPages, pageHash, type SitePage } from '../router';
import { bindThemeColors, fonts, type ThemeValue } from '../theme';
import { createCodeBlock } from './code-block';
import {
  appendArticleTitle,
  appendArticleSection,
  appendCallout,
  createDocsShell,
  appendPageNavigation,
} from './docs-shell';

/** An API map points readers to contracts instead of repeating a full reference in one page. */
export const createApiPage = (theme: ThemeValue, route: ObservableValue<SitePage>): Frame => {
  const shell = createDocsShell('ApiPage', 'api', theme, route);
  appendArticleTitle(
    shell.article,
    theme,
    'REFERENCE',
    'API overview',
    'Find the primitive or behavior you need. Each chapter pairs the public API with examples, ownership rules, and the details that affect real applications.',
  );
  appendArticleSection(
    shell.article,
    theme,
    'Two entry points',
    'Import runtime elements, values, modifiers, and helpers from framekit. Import inspection tools from framekit/devtools. Internal source modules are implementation details.',
  );
  createCodeBlock(theme, 'ImportsCode', [
    "import { createFrame, spring, watchOwnedValue } from 'framekit';",
    "import { bindRuntimeInspector } from 'framekit/devtools';",
  ]).Parent = shell.article;
  const descriptions = {
    guide: 'Installation, mounting, and a complete counter.',
    elements: 'Factories, native inputs, typed events, links, and focus.',
    layout: 'UDim2, automatic sizing, modifiers, breakpoints, and scrolling.',
    state: 'Observable and computed values, signals, keyed and virtual lists.',
    lifecycle: 'Tree traversal, transactions, detach, unmount, and destroy.',
    animation: 'Springs, tweens, playback, and property ownership.',
    overlays: 'Tooltip and popover contracts with live examples.',
    devtools: 'Launch controls, shortcuts, picking, and snapshots.',
    api: '',
  };
  for (const entry of documentationPages.filter(({ page }) => page !== 'api')) {
    const link = createLink({
      Text: `${entry.label}  →\n${descriptions[entry.page]}`,
      Href: pageHash(entry.page),
      FontFamily: fonts.sans,
      TextSize: 15,
      TextWrapped: true,
      TextXAlignment: 'Left',
      BackgroundTransparency: 1,
      Size: udim2(1, 0, 0, 74),
    });
    link.unsafeElement.classList.add('pg-reference-link');
    bindThemeColors(link, theme, (palette) => ({ TextColor3: palette.text }));
    link.Parent = shell.article;
  }
  appendCallout(
    shell.article,
    theme,
    'Public factory options, property types, and JSDoc are available in your editor. This guide explains behavior and ownership; editor completion supplies the exact type for your instance.',
  );
  appendPageNavigation(shell.article, theme, 'api');
  return shell.page;
};
