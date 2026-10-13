import {
  createFrame,
  createLink,
  createObservableValue,
  type Frame,
  type ObservableValue,
  udim2,
  udim2FromOffset,
  watchOwnedValue,
} from 'framekit';

import { createRoutedPage, pageHash, type SitePage } from '../router';
import { bindThemeColors, fonts, type ThemeValue } from '../theme';
import { createButton } from '../ui';
import { createCodeBlock } from './code-block';
import { appendArticleTitle, appendFlowText } from './docs-shell';

/** The landing page is a working example and a short path into the documentation. */
export const createHomePage = (
  theme: ThemeValue,
  route: ObservableValue<SitePage>,
  navigate: (page: SitePage) => void,
): Frame => {
  const page = createRoutedPage('HomePage', 'home', route);
  const content = createFrame({ Name: 'HomeContent', BackgroundTransparency: 1 });
  content.unsafeElement.classList.add('pg-home');
  const hero = createFrame({ Name: 'HomeHero', BackgroundTransparency: 1 });
  hero.unsafeElement.classList.add('pg-home-hero');
  const heading = appendArticleTitle(
    hero,
    theme,
    'THE BROWSER. AN OBJECT TREE.',
    'UI you can hold onto.',
    'Typed objects. Direct properties. One clear owner. Build browser interfaces with the same tree you use to inspect and clean them up.',
  );
  heading.unsafeElement.classList.add('pg-hero-title');
  const actions = createFrame({ Name: 'HomeActions', BackgroundTransparency: 1 });
  actions.unsafeElement.classList.add('pg-home-actions');
  for (const [label, name, destination, primary] of [
    ['Get started  →', 'GetStartedButton', 'guide', true],
    ['Explore the API', 'ApiReferenceButton', 'api', false],
  ] as const) {
    const button = createButton(theme, {
      label,
      name,
      size: udim2FromOffset(168, 46),
      position: udim2FromOffset(0, 0),
      background: primary ? 'accent' : 'surfaceRaised',
      foreground: primary ? 'onAccent' : 'text',
    });
    button.onClick(() => navigate(destination));
    button.Parent = actions;
  }
  actions.Parent = hero;
  appendFlowText(hero, theme, {
    text: 'TypeScript · Native DOM · No component framework required',
    size: udim2(1, 0, 0, 0),
    textSize: 12,
    color: 'textFaint',
  });
  hero.Parent = content;

  const visual = createFrame({ Name: 'HomeCodeVisual', BackgroundTransparency: 1 });
  visual.unsafeElement.classList.add('pg-home-code');
  createCodeBlock(theme, 'CounterCode', [
    'import { createScreenGui, createTextButton,',
    "  udim2FromOffset } from 'framekit';",
    '',
    'const app = createScreenGui();',
    'const button = createTextButton({',
    "  Text: 'Clicks: 0',",
    '  Size: udim2FromOffset(220, 44),',
    '});',
    'let count = 0;',
    'button.onClick(() => {',
    '  button.Text = `Clicks: ${++count}`;',
    '});',
    'button.Parent = app;',
    "app.mount('#app');",
  ]).Parent = visual;
  const preview = createFrame({ Name: 'HomeResult', BackgroundTransparency: 1 });
  preview.unsafeElement.classList.add('pg-home-preview');
  appendFlowText(preview, theme, {
    text: 'LIVE RESULT',
    size: udim2(1, 0, 0, 0),
    font: fonts.mono,
    textSize: 10,
    color: 'textFaint',
  });
  const count = createObservableValue(0);
  const counter = createButton(theme, {
    label: 'Clicks: 0',
    name: 'LiveCounter',
    size: udim2FromOffset(220, 44),
    position: udim2FromOffset(0, 0),
    background: 'accent',
    foreground: 'onAccent',
  });
  counter.onClick(() => count.set(count.get() + 1));
  watchOwnedValue(counter, count, (value) => {
    counter.Text = `Clicks: ${value}`;
  });
  counter.Parent = preview;
  preview.Parent = visual;
  visual.Parent = content;

  const learning = createFrame({ Name: 'LearningPaths', BackgroundTransparency: 1 });
  learning.unsafeElement.classList.add('pg-learning');
  appendFlowText(learning, theme, {
    text: 'A small runtime. A complete guide.',
    size: udim2(1, 0, 0, 0),
    textSize: 28,
    weight: 700,
  });
  appendFlowText(learning, theme, {
    text: 'Start with a working interface, then learn the contracts behind it.',
    size: udim2(1, 0, 0, 0),
    textSize: 16,
    color: 'textMuted',
  });
  const cards = createFrame({ Name: 'LearningCards', BackgroundTransparency: 1 });
  cards.unsafeElement.classList.add('pg-learning-cards');
  for (const [number, title, description, destination] of [
    [
      '01',
      'Create & compose',
      'Choose native controls, set geometry, and arrange children.',
      'elements',
    ],
    ['02', 'Connect your state', 'Own subscriptions and keep keyed collections stable.', 'state'],
    [
      '03',
      'Understand ownership',
      'Reparent, detach, unmount, and destroy with confidence.',
      'lifecycle',
    ],
    [
      '04',
      'Inspect the real thing',
      'Find instances, follow properties, and inspect live motion.',
      'devtools',
    ],
  ] as const) {
    const link = createLink({
      Name: `Learn${destination}`,
      Text: `${number}  /  ${title}\n\n${description}\n\nRead the guide →`,
      Href: pageHash(destination),
      FontFamily: fonts.sans,
      TextSize: 15,
      TextWrapped: true,
      TextXAlignment: 'Left',
      TextYAlignment: 'Top',
      BackgroundTransparency: 1,
    });
    link.unsafeElement.classList.add('pg-learning-card');
    bindThemeColors(link, theme, (palette) => ({
      TextColor3: palette.text,
      BackgroundColor3: palette.surface,
    }));
    link.Parent = cards;
  }
  cards.Parent = learning;
  learning.Parent = content;
  content.Parent = page;
  return page;
};
