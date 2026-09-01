import { fk } from 'framekit';

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
  layout: fk.Value<PlaygroundLayout>,
  theme: ThemeValue,
  route: fk.Value<SitePage>,
  navigate: (page: SitePage) => void,
): fk.Frame => {
  const page = createRoutedPage('HomePage', 'home', layout, route);
  const content = fk.createFrame({
    Name: 'HomeContent',
    AnchorPoint: fk.vector2(0.5, 0),
    BackgroundTransparency: 1,
  });
  bindLayoutProperties(page, layout, content, {
    desktop: {
      Size: fk.udim2FromOffset(contentWidth.desktop, 1),
      Position: fk.udim2FromScale(0.5, 0),
    },
    mobile: {
      Size: fk.udim2FromOffset(contentWidth.mobile, 1),
      Position: fk.udim2FromScale(0.5, 0),
    },
  });

  const product = createText(theme, {
    name: 'HomeProductName',
    text: 'FrameKit',
    size: fk.udim2FromOffset(620, 94),
    textSize: typeScale.product,
    scaled: true,
    weight: 950,
    color: fk.color3FromRGB(255, 255, 255),
  });
  bindLayoutProperties(page, layout, product, {
    desktop: { Size: fk.udim2FromOffset(620, 94), Position: fk.udim2FromOffset(0, 86) },
    mobile: { Size: fk.udim2FromOffset(358, 70), Position: fk.udim2FromOffset(0, 58) },
  });
  product.addChild(
    fk.createUIGradient({
      ApplyTo: 'Text',
      Color: fk.colorSequence(
        { Time: 0, Value: fk.color3FromHex('#76edad') },
        { Time: 0.45, Value: fk.color3FromHex('#70b2ff') },
        { Time: 0.85, Value: fk.color3FromHex('#af8eff') },
        { Time: 1, Value: fk.color3FromHex('#af8eff') },
      ),
      Rotation: 10,
    }),
  );
  const productStroke = fk.createUITextStroke({
    Color: themeColor(theme, 'border'),
    Transparency: 0,
    Thickness: 5,
  });
  bindThemeColors(productStroke, theme, (palette) => ({ Color: palette.border }));
  product.addChild(productStroke);
  const title = createText(theme, {
    text: 'Typed UI objects\nfor the web',
    size: fk.udim2FromOffset(650, 150),
    textSize: typeScale.hero,
    scaled: true,
    wrapped: true,
    weight: 850,
    yAlignment: 'Top',
  });
  bindLayoutProperties(page, layout, title, {
    desktop: { Size: fk.udim2FromOffset(650, 150), Position: fk.udim2FromOffset(0, 170) },
    mobile: { Size: fk.udim2FromOffset(358, 120), Position: fk.udim2FromOffset(0, 136) },
  });
  const body = createText(theme, {
    text: 'Build interfaces as persistent objects with direct properties, explicit ownership, and optional animation.',
    size: fk.udim2FromOffset(610, 80),
    color: 'textMuted',
    textSize: typeScale.lead,
    wrapped: true,
    yAlignment: 'Top',
  });
  bindLayoutProperties(page, layout, body, {
    desktop: { Size: fk.udim2FromOffset(610, 80), Position: fk.udim2FromOffset(0, 338) },
    mobile: { Size: fk.udim2FromOffset(358, 104), Position: fk.udim2FromOffset(0, 278) },
  });
  const start = createButton(theme, {
    label: 'GET STARTED  📚',
    name: 'GetStartedButton',
    size: fk.udim2FromOffset(174, 48),
    position: fk.udim2FromOffset(0, 0),
    background: 'accent',
    foreground: 'onAccent',
  });
  bindLayoutProperties(page, layout, start, {
    desktop: { Position: fk.udim2FromOffset(0, 446) },
    mobile: { Size: fk.udim2FromOffset(358, 48), Position: fk.udim2FromOffset(0, 402) },
  });
  const api = createButton(theme, {
    label: 'API REFERENCE  🔎',
    name: 'ApiReferenceButton',
    size: fk.udim2FromOffset(188, 48),
    position: fk.udim2FromOffset(0, 0),
    background: 'surfaceRaised',
    foreground: 'text',
  });
  bindLayoutProperties(page, layout, api, {
    desktop: { Position: fk.udim2FromOffset(188, 446) },
    mobile: { Size: fk.udim2FromOffset(358, 48), Position: fk.udim2FromOffset(0, 462) },
  });
  const install = createButton(theme, {
    label: 'COPY  npm i framekit',
    name: 'HomeInstallButton',
    size: fk.udim2FromOffset(208, 48),
    position: fk.udim2FromOffset(0, 0),
    background: 'surfaceRaised',
    foreground: 'textMuted',
    font: fonts.mono,
    textSize: typeScale.code,
  });
  bindLayoutProperties(page, layout, install, {
    desktop: { Position: fk.udim2FromOffset(390, 446) },
    mobile: { Size: fk.udim2FromOffset(358, 38), Position: fk.udim2FromOffset(0, 522) },
  });
  start.onClick(() => navigate('guide'));
  api.onClick(() => navigate('api'));
  install.onClick(() => void copyCommand(install, 'npm i framekit', 'COPY  npm i framekit'));
  for (const child of [product, title, body, start, api, install]) content.addChild(child);
  content.addChild(createHomeVisual(layout, theme));

  for (const [index, [icon, title, description, accent]] of features.entries()) {
    const card = createFeatureCard(theme, icon, title, description, accent);
    bindLayoutProperties(page, layout, card, {
      desktop: {
        Size: fk.udim2FromOffset(286, 260),
        Position: fk.udim2FromOffset(index * 310, 690),
      },
      mobile: {
        Size: fk.udim2FromOffset(171, 276),
        Position: fk.udim2FromOffset((index % 2) * 187, 974 + Math.floor(index / 2) * 294),
      },
    });
    content.addChild(card);
  }
  const source = createButton(theme, {
    label: 'SOURCE  🔗',
    name: 'HomeSourceButton',
    size: fk.udim2FromOffset(132, 38),
    position: fk.udim2FromOffset(0, 0),
    background: 'canvas',
    foreground: 'textMuted',
    font: fonts.mono,
    textSize: typeScale.caption,
  });
  source.onClick(() => window.open(repositoryUrl, '_blank', 'noopener,noreferrer'));
  bindLayoutProperties(page, layout, source, {
    desktop: { Position: fk.udim2FromOffset(0, 1040) },
    mobile: { Position: fk.udim2FromOffset(0, 1570) },
  });
  content.addChild(source);
  page.addChild(content);
  return page;
};

const createHomeVisual = (layout: fk.Value<PlaygroundLayout>, theme: ThemeValue): fk.Frame => {
  const visual = createSurface(theme, {
    name: 'HomeCodeVisual',
    background: 'surface',
    radius: 28,
    clipsDescendants: true,
  });
  const glow = fk.createUIShadow({
    Color: themeColor(theme, 'blue'),
    Transparency: 0.86,
    Offset: fk.vector2(0, 24),
    BlurRadius: 90,
  });
  bindThemeColors(glow, theme, (palette) => ({ Color: palette.blue }));
  visual.addChild(glow);
  bindLayoutProperties(visual, layout, visual, {
    desktop: { Size: fk.udim2FromOffset(440, 430), Position: fk.udim2FromOffset(776, 88) },
    mobile: { Size: fk.udim2FromOffset(358, 370), Position: fk.udim2FromOffset(0, 568) },
  });
  visual.addChild(
    createText(theme, {
      text: 'APP.TS',
      size: fk.udim2FromOffset(120, 26),
      position: fk.udim2FromOffset(22, 18),
      color: 'textFaint',
      textSize: typeScale.caption,
      font: fonts.mono,
      weight: 800,
    }),
  );
  appendCodeLines(
    visual,
    theme,
    [
      { text: "import { fk } from 'framekit';", color: 'purple' },
      { text: '' },
      { text: 'const app = fk.createScreenGui();', color: 'blue' },
      { text: 'const card = fk.createFrame({' },
      { text: '  Size: fk.udim2FromOffset(320, 180),' },
      { text: '});' },
      { text: '' },
      { text: 'card.Parent = app;', color: 'accent' },
    ],
    64,
    30,
  );
  const result = createSurface(theme, {
    name: 'HomeResult',
    size: fk.udim2(1, -44, 0, 90),
    position: fk.udim2FromOffset(22, 318),
    background: 'surfaceRaised',
    radius: 16,
  });
  bindLayoutProperties(visual, layout, result, {
    desktop: { Size: fk.udim2(1, -44, 0, 90), Position: fk.udim2FromOffset(22, 318) },
    mobile: { Size: fk.udim2(1, -44, 0, 68), Position: fk.udim2FromOffset(22, 284) },
  });
  result.addChild(
    createText(theme, {
      text: '🌳  ScreenGui  /  Card',
      size: fk.udim2(1, -28, 1, -20),
      position: fk.udim2FromOffset(14, 10),
      color: 'accent',
      textSize: typeScale.code,
      scaled: true,
      font: fonts.mono,
      weight: 800,
      xAlignment: 'Center',
    }),
  );
  visual.addChild(result);
  return visual;
};

const createFeatureCard = (
  theme: ThemeValue,
  icon: string,
  title: string,
  body: string,
  accent: ThemeToken,
): fk.Frame => {
  const card = createSurface(theme, {
    name: `${title.replaceAll(/\s+/g, '')}Feature`,
    background: 'surface',
    radius: 16,
  });
  card.addChild(
    createText(theme, {
      text: icon,
      size: fk.udim2FromOffset(44, 44),
      position: fk.udim2FromOffset(20, 18),
      textSize: 24,
      xAlignment: 'Center',
    }),
  );
  card.addChild(
    createText(theme, {
      text: title,
      size: fk.udim2(1, -40, 0, 38),
      position: fk.udim2FromOffset(20, 78),
      color: accent,
      textSize: typeScale.subsection,
      weight: 800,
    }),
  );
  card.addChild(
    createText(theme, {
      text: body,
      size: fk.udim2(1, -40, 0, 92),
      position: fk.udim2FromOffset(20, 120),
      color: 'textMuted',
      textSize: typeScale.small,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  return card;
};
