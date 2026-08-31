import { fk } from 'framekit';

import { copyCommand } from '../behaviors/copy-button';
import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { guideUrl } from '../links';
import { createSection, createSectionContent } from '../section';
import { fonts, type ThemeMode } from '../theme';
import { appendCodeLines, createButton, createPill, createSurface, createText } from '../ui';

export const createHero = (
  layout: fk.Value<PlaygroundLayout>,
  theme: fk.Value<ThemeMode>,
  onExplore: () => void,
): fk.Frame => {
  const section = createSection('hero', layout);
  const content = createSectionContent(section, layout);
  const eyebrow = createText(theme, {
    text: 'FRAMEKIT / TYPED UI OBJECTS',
    size: fk.udim2FromOffset(360, 28),
    color: 'accent',
    textSize: 9,
    font: fonts.mono,
    weight: 800,
  });
  const title = createText(theme, {
    name: 'HeroTitle',
    text: 'UI AS\nOBJECTS.',
    size: fk.udim2FromOffset(520, 180),
    textSize: 62,
    scaled: true,
    wrapped: true,
    weight: 950,
    yAlignment: 'Top',
  });
  const description = createText(theme, {
    text: 'Create typed instances. Set properties directly. Own everything in one inspectable tree.',
    size: fk.udim2FromOffset(500, 82),
    color: 'textMuted',
    textSize: 16,
    wrapped: true,
    yAlignment: 'Top',
  });
  const explore = createButton(theme, {
    label: 'SEE THE API  👇',
    name: 'ExploreApiButton',
    size: fk.udim2FromOffset(214, 52),
    position: fk.udim2FromOffset(0, 0),
    background: 'accent',
    foreground: 'onAccent',
  });
  const install = createButton(theme, {
    label: 'COPY  npm i framekit',
    name: 'InstallButton',
    size: fk.udim2FromOffset(226, 52),
    position: fk.udim2FromOffset(0, 0),
    background: 'surfaceRaised',
    foreground: 'text',
    font: fonts.mono,
    textSize: 10,
  });
  const guide = createButton(theme, {
    label: 'READ THE GUIDE  📚',
    name: 'HeroGuideButton',
    size: fk.udim2FromOffset(226, 44),
    position: fk.udim2FromOffset(0, 0),
    background: 'canvas',
    foreground: 'textMuted',
    font: fonts.mono,
    textSize: 9,
  });

  explore.onClick(onExplore);
  install.onClick(() => void copyCommand(install, 'npm i framekit', 'COPY  npm i framekit'));
  guide.onClick(() => window.open(guideUrl, '_blank', 'noopener,noreferrer'));

  bindHeroLayout(section, layout, { eyebrow, title, description, explore, install, guide });
  for (const child of [eyebrow, title, description, explore, install, guide]) {
    content.addChild(child);
  }
  content.addChild(createApiPreview(layout, theme));
  section.addChild(content);
  return section;
};

const createApiPreview = (
  layout: fk.Value<PlaygroundLayout>,
  theme: fk.Value<ThemeMode>,
): fk.Frame => {
  const preview = createSurface(theme, {
    name: 'HeroApiPreview',
    background: 'surface',
    radius: 24,
    clipsDescendants: true,
  });
  preview.element.classList.add('pg-grid');
  bindLayoutProperties(preview, layout, preview, {
    desktop: { Size: fk.udim2FromOffset(540, 580), Position: fk.udim2FromOffset(580, 92) },
    mobile: { Size: fk.udim2FromOffset(358, 318), Position: fk.udim2FromOffset(0, 596) },
  });
  preview.addChild(
    createText(theme, {
      text: 'EXAMPLE.TS',
      size: fk.udim2FromOffset(150, 28),
      position: fk.udim2FromOffset(22, 18),
      color: 'textFaint',
      textSize: 9,
      font: fonts.mono,
      weight: 800,
    }),
  );
  preview.addChild(
    createPill(theme, '🟢 LIVE', fk.udim2FromOffset(86, 28), fk.udim2(1, -108, 0, 18)),
  );
  const lines = appendCodeLines(
    preview,
    theme,
    [
      { text: 'const title = fk.createTextLabel({', color: 'blue' },
      { text: "  Text: 'Inventory'," },
      { text: '  TextScaled: true,', color: 'accent' },
      { text: '});' },
      { text: '' },
      { text: 'title.Parent = panel;', color: 'purple' },
      { text: 'panel.destroy();' },
    ],
    68,
    31,
  );
  for (const line of lines) {
    bindLayoutProperties(preview, layout, line, {
      desktop: { TextSize: 11 },
      mobile: { TextSize: 9 },
    });
  }

  const summary = createText(theme, {
    text: 'ONE OBJECT  /  ONE TREE  /  ONE CLEANUP',
    size: fk.udim2(1, -44, 0, 70),
    position: fk.udim2FromOffset(22, 468),
    color: 'accent',
    textSize: 12,
    scaled: true,
    wrapped: true,
    font: fonts.mono,
    weight: 800,
    xAlignment: 'Center',
  });
  bindLayoutProperties(preview, layout, summary, {
    desktop: { Position: fk.udim2FromOffset(22, 468), Size: fk.udim2(1, -44, 0, 70) },
    mobile: { Position: fk.udim2FromOffset(16, 248), Size: fk.udim2(1, -32, 0, 48) },
  });
  preview.addChild(summary);
  return preview;
};

const bindHeroLayout = (
  owner: fk.Instance,
  layout: fk.Value<PlaygroundLayout>,
  elements: Readonly<{
    eyebrow: fk.TextLabel;
    title: fk.TextLabel;
    description: fk.TextLabel;
    explore: fk.TextButton;
    install: fk.TextButton;
    guide: fk.TextButton;
  }>,
): void => {
  bindLayoutProperties(owner, layout, elements.eyebrow, {
    desktop: { Position: fk.udim2FromOffset(0, 104) },
    mobile: { Position: fk.udim2FromOffset(0, 54) },
  });
  bindLayoutProperties(owner, layout, elements.title, {
    desktop: { Size: fk.udim2FromOffset(520, 180), Position: fk.udim2FromOffset(0, 142) },
    mobile: { Size: fk.udim2FromOffset(358, 150), Position: fk.udim2FromOffset(0, 96) },
  });
  bindLayoutProperties(owner, layout, elements.description, {
    desktop: { Size: fk.udim2FromOffset(500, 82), Position: fk.udim2FromOffset(0, 352) },
    mobile: { Size: fk.udim2FromOffset(358, 96), Position: fk.udim2FromOffset(0, 272) },
  });
  bindLayoutProperties(owner, layout, elements.explore, {
    desktop: { Size: fk.udim2FromOffset(214, 52), Position: fk.udim2FromOffset(0, 464) },
    mobile: { Size: fk.udim2FromOffset(358, 50), Position: fk.udim2FromOffset(0, 388) },
  });
  bindLayoutProperties(owner, layout, elements.install, {
    desktop: { Size: fk.udim2FromOffset(226, 52), Position: fk.udim2FromOffset(230, 464) },
    mobile: { Size: fk.udim2FromOffset(358, 50), Position: fk.udim2FromOffset(0, 450) },
  });
  bindLayoutProperties(owner, layout, elements.guide, {
    desktop: { Position: fk.udim2FromOffset(0, 536) },
    mobile: { Size: fk.udim2FromOffset(358, 44), Position: fk.udim2FromOffset(0, 518) },
  });
};
