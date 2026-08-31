import { fk } from 'framekit';

import { copyCommand } from '../behaviors/copy-button';
import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { guideUrl } from '../links';
import { createSection, createSectionContent } from '../section';
import { fonts, type ThemeMode } from '../theme';
import { createButton, createPill, createSurface, createText } from '../ui';

export const createFooter = (
  layout: fk.Value<PlaygroundLayout>,
  theme: fk.Value<ThemeMode>,
  onBackToTop: () => void,
): fk.Frame => {
  const section = createSection('footer', layout);
  const content = createSectionContent(section, layout);
  const card = createSurface(theme, {
    name: 'FooterCard',
    background: 'surface',
    radius: 24,
  });
  bindLayoutProperties(card, layout, card, {
    desktop: { Size: fk.udim2FromOffset(1120, 400), Position: fk.udim2FromOffset(0, 40) },
    mobile: { Size: fk.udim2FromOffset(358, 600), Position: fk.udim2FromOffset(0, 40) },
  });
  card.addChild(
    createPill(theme, 'THE NEXT STEP', fk.udim2FromOffset(132, 30), fk.udim2FromOffset(30, 28)),
  );
  const title = createText(theme, {
    name: 'FooterTitle',
    text: 'BUILD SOMETHING\nYOU CAN EXPLAIN.',
    size: fk.udim2FromOffset(540, 160),
    position: fk.udim2FromOffset(30, 76),
    textSize: 52,
    scaled: true,
    wrapped: true,
    weight: 950,
    yAlignment: 'Top',
  });
  const body = createText(theme, {
    text: 'The README is the guide today. This page has one clear place to point when full docs arrive.',
    size: fk.udim2FromOffset(440, 82),
    position: fk.udim2FromOffset(630, 86),
    color: 'textMuted',
    textSize: 15,
    wrapped: true,
    yAlignment: 'Top',
  });
  const guide = createButton(theme, {
    label: 'READ THE GUIDE  📚',
    name: 'FooterGuideButton',
    size: fk.udim2FromOffset(238, 54),
    position: fk.udim2FromOffset(630, 206),
    background: 'accent',
    foreground: 'onAccent',
  });
  const install = createButton(theme, {
    label: 'COPY  npm i framekit',
    name: 'FooterInstallButton',
    size: fk.udim2FromOffset(220, 54),
    position: fk.udim2FromOffset(884, 206),
    background: 'surfaceRaised',
    foreground: 'text',
    font: fonts.mono,
    textSize: 10,
  });
  const back = createButton(theme, {
    label: 'BACK TO TOP  👆',
    name: 'BackToTopButton',
    size: fk.udim2FromOffset(166, 42),
    position: fk.udim2FromOffset(30, 326),
    background: 'surfaceRaised',
    foreground: 'textMuted',
    font: fonts.mono,
    textSize: 8,
  });
  const signature = createText(theme, {
    text: 'CORE FIRST  /  EXTRAS WHEN NEEDED',
    size: fk.udim2FromOffset(340, 24),
    position: fk.udim2(1, -370, 0, 334),
    color: 'textFaint',
    textSize: 8,
    font: fonts.mono,
    weight: 700,
    xAlignment: 'Right',
  });

  guide.onClick(() => window.open(guideUrl, '_blank', 'noopener,noreferrer'));
  install.onClick(() => void copyCommand(install, 'npm i framekit', 'COPY  npm i framekit'));
  back.onClick(onBackToTop);
  bindFooterLayout(card, layout, { title, body, guide, install, back, signature });
  for (const child of [title, body, guide, install, back, signature]) card.addChild(child);
  content.addChild(card);
  section.addChild(content);
  return section;
};

const bindFooterLayout = (
  owner: fk.Instance,
  layout: fk.Value<PlaygroundLayout>,
  elements: Readonly<{
    title: fk.TextLabel;
    body: fk.TextLabel;
    guide: fk.TextButton;
    install: fk.TextButton;
    back: fk.TextButton;
    signature: fk.TextLabel;
  }>,
): void => {
  bindLayoutProperties(owner, layout, elements.title, {
    desktop: { Size: fk.udim2FromOffset(540, 160), Position: fk.udim2FromOffset(30, 76) },
    mobile: { Size: fk.udim2FromOffset(298, 146), Position: fk.udim2FromOffset(30, 78) },
  });
  bindLayoutProperties(owner, layout, elements.body, {
    desktop: { Size: fk.udim2FromOffset(440, 82), Position: fk.udim2FromOffset(630, 86) },
    mobile: { Size: fk.udim2FromOffset(298, 104), Position: fk.udim2FromOffset(30, 246) },
  });
  bindLayoutProperties(owner, layout, elements.guide, {
    desktop: { Size: fk.udim2FromOffset(238, 54), Position: fk.udim2FromOffset(630, 206) },
    mobile: { Size: fk.udim2FromOffset(298, 52), Position: fk.udim2FromOffset(30, 376) },
  });
  bindLayoutProperties(owner, layout, elements.install, {
    desktop: { Size: fk.udim2FromOffset(220, 54), Position: fk.udim2FromOffset(884, 206) },
    mobile: { Size: fk.udim2FromOffset(298, 52), Position: fk.udim2FromOffset(30, 442) },
  });
  bindLayoutProperties(owner, layout, elements.back, {
    desktop: { Position: fk.udim2FromOffset(30, 326) },
    mobile: { Position: fk.udim2FromOffset(30, 522) },
  });
  bindLayoutProperties(owner, layout, elements.signature, {
    desktop: { Visible: true },
    mobile: { Visible: false },
  });
};
