import { fk } from 'framekit';

import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { createSection, createSectionContent } from '../section';
import { fonts, type ThemeMode, type ThemeToken } from '../theme';
import { appendCodeLines, createPill, createSurface, createText } from '../ui';

const apiCards = [
  {
    name: 'Create',
    eyebrow: '01 / CREATE',
    title: 'Factories return real objects.',
    body: 'Frames, text, images, inputs, and scrolling containers all share one typed object model.',
    accent: 'accent',
    code: ['const panel = fk.createFrame({', "  Name: 'Inventory',", '});'],
  },
  {
    name: 'Change',
    eyebrow: '02 / CHANGE',
    title: 'Properties are the API.',
    body: 'Assign one property or update several together. Changes validate and render immediately.',
    accent: 'blue',
    code: ['panel.Visible = true;', 'panel.setProperties({ Rotation: 3 });'],
  },
  {
    name: 'Connect',
    eyebrow: '03 / CONNECT',
    title: 'The tree is explicit.',
    body: 'Parent, inspect, detach, and traverse the same retained hierarchy that owns the browser UI.',
    accent: 'purple',
    code: ['button.Parent = panel;', 'panel.getDescendants();'],
  },
  {
    name: 'CleanUp',
    eyebrow: '04 / CLEAN UP',
    title: 'Destroy one owner.',
    body: 'Its descendants, listeners, values, modifiers, and active animations leave with it.',
    accent: 'orange',
    code: ['panel.onDestroy(release);', 'panel.destroy();'],
  },
] as const satisfies readonly Readonly<{
  name: string;
  eyebrow: string;
  title: string;
  body: string;
  accent: ThemeToken;
  code: readonly string[];
}>[];

export const createGuide = (
  layout: fk.Value<PlaygroundLayout>,
  theme: fk.Value<ThemeMode>,
): fk.Frame => {
  const section = createSection('guide', layout);
  const content = createSectionContent(section, layout);
  const eyebrow = createText(theme, {
    text: 'THE WHOLE MENTAL MODEL',
    size: fk.udim2FromOffset(360, 28),
    color: 'accent',
    textSize: 9,
    font: fonts.mono,
    weight: 800,
  });
  const title = createText(theme, {
    name: 'GuideTitle',
    text: 'A SMALL API.\nA CLEAR MODEL.',
    size: fk.udim2FromOffset(700, 130),
    textSize: 48,
    scaled: true,
    wrapped: true,
    weight: 950,
    yAlignment: 'Top',
  });
  const description = createText(theme, {
    text: 'Most of FrameKit is four operations. Learn those first. Reach for values, helpers, or motion only when the interface asks for them.',
    size: fk.udim2FromOffset(680, 72),
    color: 'textMuted',
    textSize: 15,
    wrapped: true,
    yAlignment: 'Top',
  });
  bindGuideHeading(section, layout, { eyebrow, title, description });
  for (const child of [eyebrow, title, description]) content.addChild(child);

  for (const [index, data] of apiCards.entries()) {
    const card = createApiCard(theme, data);
    bindApiCardLayout(section, layout, card, index);
    content.addChild(card);
  }
  content.addChild(createExtrasPanel(layout, theme));
  section.addChild(content);
  return section;
};

const createApiCard = (theme: fk.Value<ThemeMode>, data: (typeof apiCards)[number]): fk.Frame => {
  const card = createSurface(theme, {
    name: `${data.name}Card`,
    background: 'surface',
    radius: 20,
  });
  card.addChild(
    createText(theme, {
      text: data.eyebrow,
      size: fk.udim2(1, -40, 0, 26),
      position: fk.udim2FromOffset(20, 20),
      color: data.accent,
      textSize: 9,
      font: fonts.mono,
      weight: 850,
    }),
  );
  card.addChild(
    createText(theme, {
      text: data.title,
      size: fk.udim2(1, -40, 0, 64),
      position: fk.udim2FromOffset(20, 54),
      textSize: 26,
      scaled: true,
      wrapped: true,
      weight: 850,
      yAlignment: 'Top',
    }),
  );
  card.addChild(
    createText(theme, {
      text: data.body,
      size: fk.udim2(1, -40, 0, 64),
      position: fk.udim2FromOffset(20, 126),
      color: 'textMuted',
      textSize: 13,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
  appendCodeLines(
    card,
    theme,
    data.code.map((text, index) => ({ text, color: index === 0 ? data.accent : 'textMuted' })),
    216,
    27,
  );
  return card;
};

const bindApiCardLayout = (
  owner: fk.Instance,
  layout: fk.Value<PlaygroundLayout>,
  card: fk.Frame,
  index: number,
): void => {
  bindLayoutProperties(owner, layout, card, {
    desktop: {
      Size: fk.udim2FromOffset(550, 300),
      Position: fk.udim2FromOffset((index % 2) * 570, 300 + Math.floor(index / 2) * 320),
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 350),
      Position: fk.udim2FromOffset(0, 300 + index * 370),
    },
  });
};

const createExtrasPanel = (
  layout: fk.Value<PlaygroundLayout>,
  theme: fk.Value<ThemeMode>,
): fk.Frame => {
  const panel = createSurface(theme, {
    name: 'ExtrasPanel',
    background: 'surfaceRaised',
    radius: 22,
  });
  bindLayoutProperties(panel, layout, panel, {
    desktop: { Size: fk.udim2FromOffset(1120, 280), Position: fk.udim2FromOffset(0, 970) },
    mobile: { Size: fk.udim2FromOffset(358, 500), Position: fk.udim2FromOffset(0, 1800) },
  });
  const label = createPill(
    theme,
    'OPTIONAL BY DESIGN',
    fk.udim2FromOffset(154, 30),
    fk.udim2FromOffset(24, 22),
  );
  const title = createText(theme, {
    text: 'ADD ONLY WHAT THE UI NEEDS.',
    size: fk.udim2FromOffset(520, 68),
    position: fk.udim2FromOffset(24, 66),
    textSize: 30,
    scaled: true,
    wrapped: true,
    weight: 900,
  });
  bindLayoutProperties(panel, layout, title, {
    desktop: { Size: fk.udim2FromOffset(520, 68), Position: fk.udim2FromOffset(24, 66) },
    mobile: { Size: fk.udim2FromOffset(310, 84), Position: fk.udim2FromOffset(24, 66) },
  });
  panel.addChild(label);
  panel.addChild(title);

  const extras = [
    ['VALUES', 'Share state explicitly', 'fk.createValue()'],
    ['HELPERS', 'Compose common behavior', 'fkh.bindResponsiveLayout()'],
    ['MOTION', 'Animate the same objects', 'fka.spring()'],
  ] as const;
  for (const [index, [name, body, api]] of extras.entries()) {
    const item = createExtraItem(theme, name, body, api);
    bindLayoutProperties(panel, layout, item, {
      desktop: {
        Size: fk.udim2FromOffset(328, 100),
        Position: fk.udim2FromOffset(24 + index * 352, 158),
      },
      mobile: {
        Size: fk.udim2FromOffset(310, 92),
        Position: fk.udim2FromOffset(24, 174 + index * 102),
      },
    });
    panel.addChild(item);
  }
  return panel;
};

const createExtraItem = (
  theme: fk.Value<ThemeMode>,
  name: string,
  body: string,
  api: string,
): fk.Frame => {
  const item = createSurface(theme, { name: `${name}Extra`, background: 'surface', radius: 14 });
  item.addChild(
    createText(theme, {
      text: name,
      size: fk.udim2FromOffset(90, 24),
      position: fk.udim2FromOffset(16, 12),
      color: 'accent',
      textSize: 8,
      font: fonts.mono,
      weight: 850,
    }),
  );
  item.addChild(
    createText(theme, {
      text: body,
      size: fk.udim2(1, -32, 0, 26),
      position: fk.udim2FromOffset(16, 36),
      textSize: 12,
      weight: 700,
    }),
  );
  item.addChild(
    createText(theme, {
      text: api,
      size: fk.udim2(1, -32, 0, 22),
      position: fk.udim2FromOffset(16, 64),
      color: 'textFaint',
      textSize: 9,
      font: fonts.mono,
    }),
  );
  return item;
};

const bindGuideHeading = (
  owner: fk.Instance,
  layout: fk.Value<PlaygroundLayout>,
  elements: Readonly<{
    eyebrow: fk.TextLabel;
    title: fk.TextLabel;
    description: fk.TextLabel;
  }>,
): void => {
  bindLayoutProperties(owner, layout, elements.eyebrow, {
    desktop: { Position: fk.udim2FromOffset(0, 58) },
    mobile: { Position: fk.udim2FromOffset(0, 48) },
  });
  bindLayoutProperties(owner, layout, elements.title, {
    desktop: { Size: fk.udim2FromOffset(700, 130), Position: fk.udim2FromOffset(0, 94) },
    mobile: { Size: fk.udim2FromOffset(358, 118), Position: fk.udim2FromOffset(0, 88) },
  });
  bindLayoutProperties(owner, layout, elements.description, {
    desktop: { Size: fk.udim2FromOffset(680, 72), Position: fk.udim2FromOffset(0, 220) },
    mobile: { Size: fk.udim2FromOffset(358, 82), Position: fk.udim2FromOffset(0, 206) },
  });
};
