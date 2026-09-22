import {
  color3FromHex,
  color3FromRGB,
  colorSequence,
  createFrame,
  createUIGradient,
  createUIShadow,
  createUITextStroke,
  type Frame,
  udim2,
  udim2FromOffset,
  udim2FromScale,
  type Value,
  vector2,
} from 'framekit';

import { copyCommand } from '../behaviors/copy-button';
import { bindLayoutProperties, contentWidth, type PlaygroundLayout } from '../layout';
import { repositoryUrl } from '../links';
import { createRoutedPage, type SitePage } from '../router';
import {
  bindThemeColors,
  fonts,
  themeColor,
  typeScale,
  type ThemeToken,
  type ThemeValue,
} from '../theme';
import { appendCodeLines, createButton, createSurface, createText } from '../ui';

const features = [
  [
    '🌳',
    'Explicit tree',
    'The UI you inspect is the same tree that owns rendering and cleanup.',
    'accent',
  ],
  ['🎛️', 'Direct properties', 'Assignments validate and reach the browser immediately.', 'blue'],
  ['🧹', 'Owned cleanup', 'Destroy one owner to release its descendants and behavior.', 'purple'],
  ['🧩', 'Optional extras', 'Values, helpers, and motion stay separate from the core.', 'orange'],
] as const satisfies readonly (readonly [string, string, string, ThemeToken])[];

export const createHomePage = (
  layout: Value<PlaygroundLayout>,
  theme: ThemeValue,
  route: Value<SitePage>,
  navigate: (page: SitePage) => void,
): Frame => {
  const page = createRoutedPage('HomePage', 'home', layout, route);
  const content = createFrame({
    Name: 'HomeContent',
    AnchorPoint: vector2(0.5, 0),
    BackgroundTransparency: 1,
  });
  bindLayoutProperties(page, layout, content, {
    desktop: {
      Size: udim2FromOffset(contentWidth.desktop, 1),
      Position: udim2FromScale(0.5, 0),
    },
    mobile: {
      Size: udim2FromOffset(contentWidth.mobile, 1),
      Position: udim2FromScale(0.5, 0),
    },
  });

  const product = createText(theme, {
    name: 'HomeProductName',
    text: 'FrameKit',
    size: udim2FromOffset(620, 94),
    textSize: typeScale.product,
    scaled: true,
    weight: 950,
    color: color3FromRGB(255, 255, 255),
  });
  bindLayoutProperties(page, layout, product, {
    desktop: { Size: udim2FromOffset(620, 94), Position: udim2FromOffset(0, 86) },
    mobile: { Size: udim2FromOffset(358, 70), Position: udim2FromOffset(0, 58) },
  });
  createUIGradient({
    ApplyTo: 'Text',
    Color: colorSequence(
      { Time: 0, Value: color3FromHex('#76edad') },
      { Time: 0.45, Value: color3FromHex('#70b2ff') },
      { Time: 0.85, Value: color3FromHex('#af8eff') },
      { Time: 1, Value: color3FromHex('#af8eff') },
    ),
    Rotation: 10,
  }).Parent = product;
  const productStroke = createUITextStroke({
    Color: themeColor(theme, 'border'),
    Transparency: 0,
    Thickness: 5,
  });
  bindThemeColors(productStroke, theme, (palette) => ({ Color: palette.border }));
  productStroke.Parent = product;
  const title = createText(theme, {
    text: 'Typed UI objects\nfor the web',
    size: udim2FromOffset(650, 150),
    textSize: typeScale.hero,
    scaled: true,
    wrapped: true,
    weight: 850,
    yAlignment: 'Top',
  });
  bindLayoutProperties(page, layout, title, {
    desktop: { Size: udim2FromOffset(650, 150), Position: udim2FromOffset(0, 170) },
    mobile: { Size: udim2FromOffset(358, 120), Position: udim2FromOffset(0, 136) },
  });
  const body = createText(theme, {
    text: 'Build interfaces as persistent objects with direct properties, explicit ownership, and optional animation.',
    size: udim2FromOffset(610, 80),
    color: 'textMuted',
    textSize: typeScale.lead,
    wrapped: true,
    yAlignment: 'Top',
  });
  bindLayoutProperties(page, layout, body, {
    desktop: { Size: udim2FromOffset(610, 80), Position: udim2FromOffset(0, 338) },
    mobile: { Size: udim2FromOffset(358, 104), Position: udim2FromOffset(0, 278) },
  });
  const start = createButton(theme, {
    label: 'GET STARTED  📚',
    name: 'GetStartedButton',
    size: udim2FromOffset(174, 48),
    position: udim2FromOffset(0, 0),
    background: 'accent',
    foreground: 'onAccent',
  });
  bindLayoutProperties(page, layout, start, {
    desktop: { Size: udim2FromOffset(174, 48), Position: udim2FromOffset(0, 446) },
    mobile: { Size: udim2FromOffset(358, 48), Position: udim2FromOffset(0, 402) },
  });
  const api = createButton(theme, {
    label: 'API REFERENCE  🔎',
    name: 'ApiReferenceButton',
    size: udim2FromOffset(188, 48),
    position: udim2FromOffset(0, 0),
    background: 'surfaceRaised',
    foreground: 'text',
  });
  bindLayoutProperties(page, layout, api, {
    desktop: { Size: udim2FromOffset(188, 48), Position: udim2FromOffset(188, 446) },
    mobile: { Size: udim2FromOffset(358, 48), Position: udim2FromOffset(0, 462) },
  });
  const install = createButton(theme, {
    label: 'COPY  npm i framekit',
    name: 'HomeInstallButton',
    size: udim2FromOffset(208, 48),
    position: udim2FromOffset(0, 0),
    background: 'surfaceRaised',
    foreground: 'textMuted',
    font: fonts.mono,
    textSize: typeScale.code,
  });
  bindLayoutProperties(page, layout, install, {
    desktop: { Size: udim2FromOffset(208, 48), Position: udim2FromOffset(390, 446) },
    mobile: { Size: udim2FromOffset(358, 38), Position: udim2FromOffset(0, 522) },
  });
  start.onClick(() => navigate('guide'));
  api.onClick(() => navigate('api'));
  install.onClick(() => void copyCommand(install, 'npm i framekit', 'COPY  npm i framekit'));
  for (const child of [product, title, body, start, api, install]) child.Parent = content;
  createHomeVisual(layout, theme).Parent = content;

  for (const [index, [icon, title, description, accent]] of features.entries()) {
    const card = createFeatureCard(theme, icon, title, description, accent);
    bindLayoutProperties(page, layout, card, {
      desktop: {
        Size: udim2FromOffset(286, 260),
        Position: udim2FromOffset(index * 310, 690),
      },
      mobile: {
        Size: udim2FromOffset(171, 276),
        Position: udim2FromOffset((index % 2) * 187, 974 + Math.floor(index / 2) * 294),
      },
    });
    card.Parent = content;
  }
  const source = createButton(theme, {
    label: 'SOURCE  🔗',
    name: 'HomeSourceButton',
    size: udim2FromOffset(132, 38),
    position: udim2FromOffset(0, 0),
    background: 'canvas',
    foreground: 'textMuted',
    font: fonts.mono,
    textSize: typeScale.caption,
  });
  source.onClick(() => window.open(repositoryUrl, '_blank', 'noopener,noreferrer'));
  bindLayoutProperties(page, layout, source, {
    desktop: { Position: udim2FromOffset(0, 1040) },
    mobile: { Position: udim2FromOffset(0, 1570) },
  });
  source.Parent = content;
  content.Parent = page;
  return page;
};

const createHomeVisual = (layout: Value<PlaygroundLayout>, theme: ThemeValue): Frame => {
  const visual = createSurface(theme, {
    name: 'HomeCodeVisual',
    background: 'surface',
    radius: 28,
    clipsDescendants: true,
  });
  const glow = createUIShadow({
    Color: themeColor(theme, 'blue'),
    Transparency: 0.86,
    Offset: vector2(0, 24),
    BlurRadius: 90,
  });
  bindThemeColors(glow, theme, (palette) => ({ Color: palette.blue }));
  glow.Parent = visual;
  bindLayoutProperties(visual, layout, visual, {
    desktop: { Size: udim2FromOffset(440, 430), Position: udim2FromOffset(776, 88) },
    mobile: { Size: udim2FromOffset(358, 370), Position: udim2FromOffset(0, 568) },
  });
  createText(theme, {
    text: 'APP.TS',
    size: udim2FromOffset(120, 26),
    position: udim2FromOffset(22, 18),
    color: 'textFaint',
    textSize: typeScale.caption,
    font: fonts.mono,
    weight: 800,
  }).Parent = visual;
  const codeLines = appendCodeLines(
    visual,
    theme,
    [
      {
        text: "import { createFrame, createScreenGui, udim2FromOffset } from 'framekit';",
        color: 'purple',
      },
      { text: '' },
      { text: 'const app = createScreenGui();', color: 'blue' },
      { text: 'const card = createFrame({' },
      { text: '  Size: udim2FromOffset(320, 180),' },
      { text: '});' },
      { text: '' },
      { text: 'card.Parent = app;', color: 'accent' },
    ],
    64,
    30,
  );
  for (const [index, line] of codeLines.entries()) {
    bindLayoutProperties(visual, layout, line, {
      desktop: {
        Size: udim2FromOffset(line.Size.X.Offset, 30),
        Position: udim2FromOffset(20, 64 + index * 30),
      },
      mobile: {
        Size: udim2FromOffset(line.Size.X.Offset, 26),
        Position: udim2FromOffset(20, 64 + index * 26),
      },
    });
  }
  const result = createSurface(theme, {
    name: 'HomeResult',
    size: udim2(1, -44, 0, 90),
    position: udim2FromOffset(22, 318),
    background: 'surfaceRaised',
    radius: 16,
  });
  bindLayoutProperties(visual, layout, result, {
    desktop: { Size: udim2(1, -44, 0, 90), Position: udim2FromOffset(22, 318) },
    mobile: { Size: udim2(1, -44, 0, 68), Position: udim2FromOffset(22, 284) },
  });
  createText(theme, {
    text: '🌳  ScreenGui  /  Card',
    size: udim2(1, -28, 1, -20),
    position: udim2FromOffset(14, 10),
    color: 'accent',
    textSize: typeScale.code,
    scaled: true,
    font: fonts.mono,
    weight: 800,
    xAlignment: 'Center',
  }).Parent = result;
  result.Parent = visual;
  return visual;
};

const createFeatureCard = (
  theme: ThemeValue,
  icon: string,
  title: string,
  body: string,
  accent: ThemeToken,
): Frame => {
  const card = createSurface(theme, {
    name: `${title.replaceAll(/\s+/g, '')}Feature`,
    background: 'surface',
    radius: 16,
  });
  createText(theme, {
    text: icon,
    size: udim2FromOffset(44, 44),
    position: udim2FromOffset(20, 18),
    textSize: 24,
    xAlignment: 'Center',
  }).Parent = card;
  createText(theme, {
    text: title,
    size: udim2(1, -40, 0, 60),
    position: udim2FromOffset(20, 78),
    color: accent,
    textSize: typeScale.subsection,
    wrapped: true,
    yAlignment: 'Top',
    weight: 800,
  }).Parent = card;
  createText(theme, {
    text: body,
    size: udim2(1, -40, 0, 92),
    position: udim2FromOffset(20, 148),
    color: 'textMuted',
    textSize: typeScale.small,
    wrapped: true,
    yAlignment: 'Top',
  }).Parent = card;
  return card;
};
