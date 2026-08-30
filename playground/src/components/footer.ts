import { fk } from 'framekit';

import { copyCommand } from '../behaviors/copy-button';
import { bindButtonMotion } from '../behaviors/hover-motion';
import { bindLayoutProperties, type PlaygroundLayout } from '../layout';
import { createSection, createSectionContent } from '../section';
import { colors, fonts } from '../theme';
import { createButton, createText } from '../ui';

export function createFooter(
  layout: fk.Value<PlaygroundLayout>,
  onBackToTop: () => void,
): fk.Frame {
  const section = createSection('footer', layout, colors.ink);
  section.element.classList.add('fk-noise');
  const content = createSectionContent(section, layout);

  const halo = fk.createFrame({
    Size: fk.udim2FromOffset(520, 520),
    AnchorPoint: fk.vector2(0.5, 0.5),
    Position: fk.udim2(1, -180, 0.5, 0),
    BackgroundColor3: colors.violet,
    BackgroundTransparency: 0.5,
  });
  halo.addChild(fk.createUICorner({ CornerRadius: 999 }));
  halo.element.style.filter = 'blur(120px)';
  halo.element.classList.add('fk-breathe');
  section.addChild(halo);

  const eyebrow = createText({
    text: 'FRAMEKIT / READY WHEN YOU ARE',
    size: fk.udim2FromOffset(340, 28),
    position: fk.udim2FromOffset(0, 68),
    color: colors.mint,
    textSize: 9,
    font: fonts.mono,
    weight: 800,
  });
  const title = createText({
    text: 'SHIP SOMETHING\nTHAT MOVES\nPEOPLE.',
    size: fk.udim2FromOffset(790, 330),
    position: fk.udim2FromOffset(0, 120),
    color: colors.text,
    textSize: 72,
    font: fonts.display,
    weight: 950,
    wrapped: true,
    yAlignment: 'Top',
  });
  title.element.classList.add('fk-shimmer');
  const install = createButton(
    'COPY  npm i framekit',
    fk.udim2FromOffset(260, 58),
    fk.udim2FromOffset(0, 500),
    colors.mint,
    colors.ink,
  );
  const source = createButton(
    'VIEW SOURCE  ↗',
    fk.udim2FromOffset(200, 58),
    fk.udim2FromOffset(278, 500),
    colors.text,
    colors.ink,
  );
  const back = createButton(
    'BACK TO TOP  ↑',
    fk.udim2FromOffset(170, 46),
    fk.udim2(1, -170, 0, 506),
    colors.inkRaised,
    colors.text,
  );
  install.setProperties({ TextSize: 10, FontFamily: fonts.mono });
  source.setProperties({ TextSize: 9, FontFamily: fonts.mono });
  back.setProperties({ TextSize: 8, FontFamily: fonts.mono });
  bindButtonMotion(install, colors.mint, colors.cyan);
  bindButtonMotion(source, colors.text, colors.coral);
  bindButtonMotion(back, colors.inkRaised, colors.inkSoft);
  install.onClick(
    () =>
      void copyCommand(install, 'npm i framekit', 'COPY  npm i framekit', colors.mint, colors.ink),
  );
  source.onClick(() => {
    window.open('https://github.com/Rongrrz/framekit', '_blank', 'noopener,noreferrer');
  });
  back.onClick(onBackToTop);

  const signature = createText({
    text: 'BUILT ENTIRELY WITH FRAMEKIT  /  2026',
    size: fk.udim2FromOffset(360, 28),
    position: fk.udim2FromOffset(0, 610),
    color: colors.textMuted,
    textSize: 8,
    font: fonts.mono,
    weight: 700,
  });

  bindLayoutProperties(section, layout, eyebrow, {
    desktop: { Position: fk.udim2FromOffset(0, 68) },
    mobile: { Position: fk.udim2FromOffset(0, 62) },
  });
  bindLayoutProperties(section, layout, title, {
    desktop: {
      Size: fk.udim2FromOffset(790, 330),
      Position: fk.udim2FromOffset(0, 120),
      TextSize: 72,
    },
    mobile: {
      Size: fk.udim2FromOffset(358, 250),
      Position: fk.udim2FromOffset(0, 112),
      TextSize: 45,
    },
  });
  bindLayoutProperties(section, layout, install, {
    desktop: { Size: fk.udim2FromOffset(260, 58), Position: fk.udim2FromOffset(0, 500) },
    mobile: { Size: fk.udim2FromOffset(358, 54), Position: fk.udim2FromOffset(0, 412) },
  });
  bindLayoutProperties(section, layout, source, {
    desktop: { Size: fk.udim2FromOffset(200, 58), Position: fk.udim2FromOffset(278, 500) },
    mobile: { Size: fk.udim2FromOffset(358, 54), Position: fk.udim2FromOffset(0, 482) },
  });
  bindLayoutProperties(section, layout, back, {
    desktop: { Position: fk.udim2(1, -170, 0, 506) },
    mobile: { Position: fk.udim2FromOffset(0, 574) },
  });
  bindLayoutProperties(section, layout, signature, {
    desktop: { Position: fk.udim2FromOffset(0, 610) },
    mobile: { Position: fk.udim2FromOffset(0, 666) },
  });

  for (const child of [eyebrow, title, install, source, back, signature]) content.addChild(child);
  section.addChild(content);
  return section;
}
