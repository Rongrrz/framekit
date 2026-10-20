import {
  createLink,
  createUISizeConstraint,
  type Frame,
  type ObservableValue,
  udim2,
  vector2,
} from 'framekit';

import importsExample from '../../examples/api/imports.ts?example';
import { documentationPages, pageHash, type SitePage } from '../router';
import { bindThemeColors, fonts, type ThemeValue } from '../theme';
import { addPadding, addLinkBorder } from '../ui';
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

  createCodeBlock(theme, 'ImportsCode', importsExample).Parent = shell.article;

  const descriptions = {
    guide: 'Installation, mounting, and a complete counter.',
    elements: 'Factories, native inputs, typed events, links, and focus.',
    layout: 'UDim2, automatic sizing, modifiers, breakpoints, and scrolling.',
    state: 'Observable and computed values, signals, keyed and virtual lists.',
    lifecycle: 'Tree traversal, transactions, detach, unmount, and destroy.',
    animation: 'Springs, tweens, playback, and property ownership.',
    overlays: 'Tooltip and popover contracts with live examples.',
    controls: 'Command menus, native modal dialogs, and caller-owned tree state.',
    devtools: 'Launch controls, shortcuts, picking, and snapshots.',
    api: '',
  };

  for (const entry of documentationPages.filter(({ page }) => page !== 'api')) {
    const link = createLink({
      Text: `${entry.label}  →\n${descriptions[entry.page]}`,
      Href: pageHash(entry.page),
      TextUnderline: false,
      FontFamily: fonts.sans,
      TextSize: 15,
      LineHeight: 1.7,
      TextWrapped: true,
      TextXAlignment: 'Left',
      BackgroundTransparency: 1,
      Size: udim2(1, 0, 0, 0),
      AutomaticSize: 'Y',
    });

    addLinkBorder(theme, link, 8);
    createUISizeConstraint({ MinSize: vector2(0, 84) }).Parent = link;
    addPadding(link, 12, 20);
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
