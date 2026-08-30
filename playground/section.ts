import { fk } from 'framekit';

import { contentWidth, designWidth } from './layout';
import type { SectionMetrics } from './section-layout';
import { colors } from './theme';
import { createText } from './ui';

export function createSection(
  name: string,
  metrics: SectionMetrics,
  backgroundColor: fk.Color3,
): fk.Frame {
  return fk.createFrame({
    Name: name,
    Size: fk.udim2FromOffset(designWidth, metrics.height),
    Position: fk.udim2FromOffset(0, metrics.top),
    BackgroundColor3: backgroundColor,
  });
}

export function createSectionContent(): fk.Frame {
  return fk.createFrame({
    Name: 'Content',
    Size: fk.udim2FromOffset(contentWidth, 1),
    Position: fk.udim2FromOffset(16, 0),
    BackgroundTransparency: 1,
  });
}

export function appendSectionHeading(
  parent: fk.GuiElement,
  heading: string,
  body: string,
  tone: 'dark' | 'light',
): void {
  const usesDarkText = tone === 'dark';
  parent.addChild(
    createText({
      text: heading,
      size: fk.udim2FromOffset(contentWidth, 126),
      position: fk.udim2FromOffset(0, 58),
      color: usesDarkText ? colors.darkText : colors.text,
      textSize: 32,
      weight: 900,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );

  parent.addChild(
    createText({
      text: body,
      size: fk.udim2FromOffset(contentWidth, 84),
      position: fk.udim2FromOffset(0, 166),
      color: usesDarkText ? colors.darkMuted : colors.textMuted,
      textSize: 13,
      wrapped: true,
      yAlignment: 'Top',
    }),
  );
}
