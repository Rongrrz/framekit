import type { Frame, GuiElement, ObservableValue } from 'framekit';

import type { SitePage } from '../router';
import type { ThemeValue } from '../theme';
import { createCodeBlock } from './code-block';
import {
  appendArticleSection,
  appendArticleTitle,
  appendCallout,
  appendOutline,
  appendPageNavigation,
  createDocsShell,
} from './docs-shell';

export const createGuidePage = (
  theme: ThemeValue,
  route: ObservableValue<SitePage>,
  scrollTo: (target: GuiElement) => void,
): Frame => {
  const shell = createDocsShell('GuidePage', 'guide', theme, route);
  appendArticleTitle(
    shell.article,
    theme,
    'LEARN / 01',
    'Getting started',
    'Build a working counter in a few minutes. You need a TypeScript browser application and a DOM mount point; no component framework is required.',
  );

  const install = appendArticleSection(
    shell.article,
    theme,
    'Install from this checkout',
    'FrameKit is currently a private package. Build and pack it in this repository, then install the generated archive in your application. The archive version follows package.json.',
  );

  createCodeBlock(
    theme,
    'InstallCode',
    [
      '# In the FrameKit repository',
      'npm ci',
      'npm run build',
      'npm pack',
      '',
      '# In your browser application',
      'npm install /absolute/path/to/framekit-0.1.0.tgz',
    ],
    'Terminal',
  ).Parent = shell.article;

  appendCallout(
    shell.article,
    theme,
    'To explore this repository directly, run npm ci and npm run dev, then open the local URL printed by Vite. The Playground uses source aliases; package consumers use framekit and framekit/devtools.',
  );

  const mount = appendArticleSection(
    shell.article,
    theme,
    'Add a mount point',
    'Place this in the body of your HTML and load your application entry through your bundler. ScreenGui fills the viewport, regardless of the mount element’s dimensions. Create and mount it in browser code.',
  );

  createCodeBlock(theme, 'MountPoint', ['<div id="app"></div>'], 'index.html').Parent =
    shell.article;

  const counter = appendArticleSection(
    shell.article,
    theme,
    'Create a working counter',
    'Copy this into your entry module. Creation makes a real element; Parent attaches it to the ownership tree, and mount attaches the root to the document. Clicking updates the same button instance.',
  );

  createCodeBlock(theme, 'FirstInterfaceCode', [
    'import { createScreenGui, createTextButton,',
    "  createObservableValue, watchOwnedValue, udim2FromOffset } from 'framekit';",
    '',
    'const app = createScreenGui();',
    'const count = createObservableValue(0);',
    'const button = createTextButton({',
    "  Name: 'Counter', Text: 'Clicks: 0',",
    '  Size: udim2FromOffset(220, 44),',
    '  Position: udim2FromOffset(24, 24),',
    '});',
    'watchOwnedValue(button, count, (value) => {',
    '  button.Text = `Clicks: ${value}`;',
    '});',
    'button.onClick(() => count.set(count.get() + 1));',
    'button.Parent = app;',
    "app.mount('#app');",
  ]).Parent = shell.article;

  const cleanup = appendArticleSection(
    shell.article,
    theme,
    'Release the feature',
    'Call app.destroy() when the feature is removed, for example in your framework’s unmount callback. The button, its native listener, and its value watcher are released recursively.',
  );

  createCodeBlock(theme, 'CleanupCode', [
    '// Continuing the counter example:',
    'app.destroy();',
    'console.log(app.isDestroyed()); // true',
  ]).Parent = shell.article;

  appendCallout(
    shell.article,
    theme,
    'A blank screen usually means the root is unmounted, a child has no Parent, the mount selector is missing, or geometry is outside the viewport. Use Debug tools in this Playground to inspect the live hierarchy.',
  );

  appendOutline(
    shell.outline,
    theme,
    [
      { label: 'Installation', target: install },
      { label: 'Mount point', target: mount },
      { label: 'Working counter', target: counter },
      { label: 'Cleanup', target: cleanup },
    ],
    scrollTo,
  );
  appendPageNavigation(shell.article, theme, 'guide');

  return shell.page;
};
