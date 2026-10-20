import {
  createFrame,
  createLink,
  createObservableValue,
  bindResponsiveLayout,
  createUIListLayout,
  createUIFlexItem,
  createUIGridLayout,
  createUIPadding,
  udim,
  vector2,
  type Frame,
  type ObservableValue,
  udim2,
  udim2FromOffset,
  watchOwnedValue,
} from 'framekit';

import counterExample from '../../examples/home/counter.ts?example';
import { createRoutedPage, pageHash, type SitePage } from '../router';
import { bindThemeColors, fonts, type ThemeValue } from '../theme';
import {
  addPadding,
  addLinkBorder,
  addRoundedBorder,
  constrainWidth,
  createDivider,
  createButton,
} from '../ui';
import { createCodeBlock } from './code-block';
import { appendFlowText } from './docs-shell';

/** The landing page is a working example and a short path into the documentation. */
export const createHomePage = (
  theme: ThemeValue,
  route: ObservableValue<SitePage>,
  navigate: (page: SitePage) => void,
): Frame => {
  const page = createRoutedPage('HomePage', 'home', route);
  const content = createFrame({
    Name: 'HomeContent',
    Size: udim2(1, 0, 0, 0),
    AutomaticSize: 'Y',
    BackgroundTransparency: 1,
  });
  const contentLimit = constrainWidth(content, 1260);
  const contentSpacing = createUIPadding({
    PaddingTop: udim(0, 72),
    PaddingBottom: udim(0, 64),
    PaddingLeft: udim(0, 40),
    PaddingRight: udim(0, 40),
  });
  contentSpacing.Parent = content;
  const contentLayout = createUIListLayout({ Padding: udim(0, 64) });
  contentLayout.Parent = content;

  const introduction = createFrame({
    Name: 'HomeIntroduction',
    Size: udim2(1, 0, 0, 0),
    AutomaticSize: 'Y',
    BackgroundTransparency: 1,
  });
  const introductionLayout = createUIListLayout({
    FillDirection: 'Horizontal',
    VerticalAlignment: 'Center',
    Padding: udim(0, 72),
  });
  introductionLayout.Parent = introduction;
  introduction.Parent = content;

  const hero = createFrame({
    Name: 'HomeHero',
    Size: udim2(0, 0, 0, 0),
    AutomaticSize: 'Y',
    BackgroundTransparency: 1,
  });
  createUIFlexItem().Parent = hero;
  const heroLayout = createUIListLayout({ Padding: udim(0, 24) });
  heroLayout.Parent = hero;

  appendFlowText(hero, theme, {
    text: 'THE BROWSER. AN OBJECT TREE.',
    size: udim2(1, 0, 0, 0),
    color: 'accent',
    textSize: 12,
    font: fonts.mono,
    weight: 650,
  });
  const heading = appendFlowText(
    hero,
    theme,
    {
      text: 'UI you can hold onto.',
      size: udim2(1, 0, 0, 0),
      textSize: 68,
      weight: 650,
      letterSpacing: -2.6,
    },
    1.06,
  );
  heading.unsafeElement.setAttribute('role', 'heading');
  heading.unsafeElement.setAttribute('aria-level', '1');
  appendFlowText(
    hero,
    theme,
    {
      text: 'Typed objects. Direct properties. One clear owner. Build browser interfaces with the same tree you use to inspect and clean them up.',
      size: udim2(1, 0, 0, 0),
      textSize: 18,
      color: 'textMuted',
    },
    1.7,
  );

  const actions = createFrame({
    Name: 'HomeActions',
    Size: udim2(1, 0, 0, 0),
    AutomaticSize: 'Y',
    BackgroundTransparency: 1,
  });
  createUIListLayout({ FillDirection: 'Horizontal', Wraps: true, Padding: udim(0, 12) }).Parent =
    actions;

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
  hero.Parent = introduction;

  const visual = createFrame({
    Name: 'HomeCodeVisual',
    Size: udim2(0, 0, 0, 0),
    AutomaticSize: 'Y',
    BackgroundTransparency: 1,
    ClipsDescendants: true,
  });
  createUIFlexItem().Parent = visual;
  createUIListLayout().Parent = visual;
  addRoundedBorder(theme, visual, 12);
  const code = createCodeBlock(theme, 'CounterCode', counterExample);

  for (const modifier of code.getChildren()) {
    if (modifier.isA('UICorner')) {
      modifier.CornerRadius = 0;
    }

    if (modifier.isA('UIStroke')) {
      modifier.Thickness = 0;
    }
  }

  code.Parent = visual;
  createDivider(theme).Parent = visual;

  const preview = createFrame({
    Name: 'HomeResult',
    Size: udim2(1, 0, 0, 0),
    AutomaticSize: 'Y',
    BackgroundTransparency: 1,
  });
  addPadding(preview, 20);
  createUIListLayout({ Padding: udim(0, 14) }).Parent = preview;
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
  visual.Parent = introduction;

  const learning = createFrame({
    Name: 'LearningPaths',
    Size: udim2(1, 0, 0, 0),
    AutomaticSize: 'Y',
    BackgroundTransparency: 1,
  });
  createUIListLayout({ Padding: udim(0, 12) }).Parent = learning;
  createDivider(theme).Parent = learning;
  const learningHeading = appendFlowText(learning, theme, {
    text: 'A small runtime. A complete guide.',
    size: udim2(1, 0, 0, 0),
    textSize: 28,
    weight: 700,
  });
  createUIPadding({ PaddingTop: udim(0, 30) }).Parent = learningHeading;

  appendFlowText(learning, theme, {
    text: 'Start with a working interface, then learn the contracts behind it.',
    size: udim2(1, 0, 0, 0),
    textSize: 16,
    color: 'textMuted',
  });

  const cards = createFrame({
    Name: 'LearningCards',
    Size: udim2(1, 0, 0, 0),
    AutomaticSize: 'Y',
    BackgroundTransparency: 1,
  });
  createUIPadding({ PaddingTop: udim(0, 16) }).Parent = cards;
  const cardLayout = createUIGridLayout({
    CellSize: udim2(0.25, -12, 0, 200),
    CellPadding: udim2FromOffset(16, 16),
    FillDirectionMaxCells: 4,
  });
  cardLayout.Parent = cards;

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
      TextUnderline: false,
      FontFamily: fonts.sans,
      TextSize: 15,
      LineHeight: 1.5,
      TextWrapped: true,
      TextXAlignment: 'Left',
      TextYAlignment: 'Top',
      BackgroundTransparency: 1,
    });

    addLinkBorder(theme, link, 10);
    addPadding(link, 20);
    bindThemeColors(link, theme, (palette) => ({
      TextColor3: palette.text,
      BackgroundColor3: palette.surface,
    }));
    link.Parent = cards;
  }

  cards.Parent = learning;
  learning.Parent = content;
  content.Parent = page;

  const arrange = ({
    columns,
    direction,
    maximum,
    inset,
    top,
    gap,
    textSize,
  }: Readonly<{
    columns: number;
    direction: 'Horizontal' | 'Vertical';
    maximum: number;
    inset: number;
    top: number;
    gap: number;
    textSize: number;
  }>): void => {
    const horizontal = direction === 'Horizontal';
    contentLimit.MaxSize = vector2(maximum, Number.MAX_SAFE_INTEGER);
    contentSpacing.setProperties({
      PaddingTop: udim(0, top),
      PaddingLeft: udim(0, inset),
      PaddingRight: udim(0, inset),
    });
    contentLayout.Padding = udim(0, horizontal ? 64 : 40);
    introductionLayout.setProperties({ FillDirection: direction, Padding: udim(0, gap) });
    hero.Size = visual.Size = udim2(horizontal ? 0 : 1, 0, 0, 0);
    heroLayout.Padding = udim(0, horizontal ? 24 : 20);
    heading.TextSize = textSize;
    cardLayout.setProperties({
      FillDirectionMaxCells: columns,
      CellSize: udim2(1 / columns, (-16 * (columns - 1)) / columns, 0, 200),
    });

    for (const child of actions.getChildren()) {
      if (child.isA('TextButton')) {
        child.Size = columns === 1 ? udim2(1, 0, 0, 46) : udim2FromOffset(168, 46);
      }
    }
  };

  bindResponsiveLayout(content, {
    observe: page,
    breakpoints: [
      {
        maxWidth: 480,
        apply: () =>
          arrange({
            columns: 1,
            direction: 'Vertical',
            maximum: 780,
            inset: 20,
            top: 36,
            gap: 40,
            textSize: 44,
          }),
      },
      {
        maxWidth: 959,
        apply: () =>
          arrange({
            columns: 2,
            direction: 'Vertical',
            maximum: 780,
            inset: 24,
            top: 40,
            gap: 40,
            textSize: 52,
          }),
      },
      {
        maxWidth: 1240,
        apply: () =>
          arrange({
            columns: 2,
            direction: 'Horizontal',
            maximum: 1260,
            inset: 40,
            top: 48,
            gap: 40,
            textSize: 52,
          }),
      },
      {
        apply: () =>
          arrange({
            columns: 4,
            direction: 'Horizontal',
            maximum: 1260,
            inset: 40,
            top: 72,
            gap: 72,
            textSize: 68,
          }),
      },
    ],
  });

  return page;
};
