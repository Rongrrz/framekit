import { fk } from 'framekit';

import type { PlaygroundLayout } from '../layout';
import type { SitePage } from '../router';
import type { ThemeValue } from '../theme';
import { createButton } from '../ui';
import {
  appendArticleSection,
  appendArticleTitle,
  appendCallout,
  appendCodeBlock,
  appendOutline,
  appendSidebarGroup,
  createDocsShell,
} from './docs-shell';

export const createGuidePage = (
  layout: fk.Value<PlaygroundLayout>,
  theme: ThemeValue,
  route: fk.Value<SitePage>,
  scrollTo: (target: fk.GuiElement) => void,
  navigate: (page: SitePage) => void,
): fk.Frame => {
  const shell = createDocsShell('GuidePage', 'guide', layout, theme, route);
  const introduction = appendArticleTitle(
    shell.article,
    theme,
    'GUIDE',
    'Getting started',
    'FrameKit gives browser interfaces an object model: create instances, assign properties, build a tree, and destroy owners when their work is done.',
  );
  appendCallout(
    shell.article,
    theme,
    '💡 FrameKit is a TypeScript library. It does not require a component framework.',
  );
  appendArticleSection(
    shell.article,
    theme,
    'Install FrameKit',
    'Add the package to an existing web project. Vite is convenient, but FrameKit works with any modern bundler.',
  );
  appendCodeBlock(shell.article, theme, 'InstallCode', [
    { text: 'npm install framekit', color: 'accent' },
  ]);

  const firstInterface = appendArticleSection(
    shell.article,
    theme,
    'Create your first interface',
    'Create the root, make a child, and connect them. Parent is the only step that attaches the child to the rendered hierarchy.',
  );
  appendCodeBlock(shell.article, theme, 'FirstInterfaceCode', [
    { text: "import { fk } from 'framekit';", color: 'purple' },
    { text: '' },
    { text: 'const app = fk.createScreenGui();', color: 'blue' },
    { text: 'const message = fk.createTextLabel({' },
    { text: "  Text: 'Hello, FrameKit!'," },
    { text: '  TextScaled: true,' },
    { text: '});' },
    { text: 'message.Parent = app;', color: 'accent' },
  ]);

  const properties = appendArticleSection(
    shell.article,
    theme,
    'Change direct properties',
    'Instances stay alive after creation. Read a property normally, assign it normally, or validate several changes together with setProperties.',
  );
  appendCodeBlock(shell.article, theme, 'PropertyGuideCode', [
    { text: "message.Text = 'Ready';", color: 'accent' },
    { text: 'message.setProperties({' },
    { text: '  Position: fk.udim2FromOffset(24, 32),' },
    { text: "  TextColor3: fk.color3FromHex('#76edad')," },
    { text: '});' },
  ]);

  const events = appendArticleSection(
    shell.article,
    theme,
    'Listen to events',
    'Buttons expose typed browser interactions. Every subscription returns an unsubscribe function, and owned listeners are removed when their instance is destroyed.',
  );
  appendCodeBlock(shell.article, theme, 'EventsGuideCode', [
    { text: 'const button = fk.createTextButton({' },
    { text: "  Text: 'Save'," },
    { text: '});' },
    { text: '' },
    { text: 'button.onClick(() => save());', color: 'blue' },
    { text: "button.onMouseEnter(() => (button.Text = 'Save now'));" },
  ]);

  const values = appendArticleSection(
    shell.article,
    theme,
    'Bind reactive values',
    'A Value stores small pieces of state. Subscribe with onChange and register its unsubscribe with the node that owns the binding.',
  );
  appendCodeBlock(shell.article, theme, 'ValueGuideCode', [
    { text: 'const count = fk.createValue(0);', color: 'purple' },
    { text: '' },
    { text: 'message.onDestroy(count.onChange((value) => {' },
    { text: '  message.Text = `Count: ${value}`;', color: 'accent' },
    { text: '}));' },
    { text: '' },
    { text: 'count.set(count.get() + 1);' },
  ]);

  const responsive = appendArticleSection(
    shell.article,
    theme,
    'Respond to the viewport',
    'Use the optional helper namespace when geometry needs a breakpoint. The owner controls the resize listener lifetime.',
  );
  appendCodeBlock(shell.article, theme, 'ResponsiveGuideCode', [
    { text: 'fkh.bindResponsiveLayout(app, {' },
    { text: '  breakpoint: 720,' },
    { text: '  mobile: () => {' },
    { text: '    card.Size = fk.udim2(1, -32, 0, 240);' },
    { text: '  },' },
    { text: '  desktop: () => {' },
    { text: '    card.Size = fk.udim2FromOffset(520, 280);' },
    { text: '  },' },
    { text: '});' },
  ]);

  const cleanup = appendArticleSection(
    shell.article,
    theme,
    'Clean up one owner',
    'Destroy is recursive. Descendants, watchers, event listeners, modifiers, and active animations are all released with the owner.',
  );
  appendCodeBlock(shell.article, theme, 'CleanupGuideCode', [
    { text: 'card.onDestroy(() => closeSocket());' },
    { text: 'card.destroy();', color: 'orange' },
    { text: 'card.isDestroyed(); // true', color: 'textFaint' },
  ]);
  appendCallout(
    shell.article,
    theme,
    '🧹 Prefer one clear owner for each feature. Cleanup then becomes one operation.',
  );

  const next = createButton(theme, {
    label: 'Explore the full API  🔎',
    name: 'GuideNextButton',
    position: fk.udim2FromOffset(0, 0),
    size: fk.udim2(1, 0, 0, 54),
    background: 'surface',
    foreground: 'accent',
  });
  next.onClick(() => navigate('api'));
  next.unsafeElement.style.marginTop = '12px';
  next.Parent = shell.article;
  const introductionItems = [
    { label: 'Getting started', target: introduction, active: true },
    { label: 'First interface', target: firstInterface },
  ];
  const essentialItems = [
    { label: 'Direct properties', target: properties },
    { label: 'Events', target: events },
    { label: 'Reactive values', target: values },
    { label: 'Responsive layout', target: responsive },
    { label: 'Cleanup', target: cleanup },
  ];
  appendSidebarGroup(shell.sidebar, theme, 'INTRODUCTION', introductionItems, 0, scrollTo);
  appendSidebarGroup(shell.sidebar, theme, 'ESSENTIALS', essentialItems, 150, scrollTo);
  appendOutline(shell.outline, theme, [...introductionItems, ...essentialItems], scrollTo);
  return shell.page;
};
