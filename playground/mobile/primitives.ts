import { fk } from 'framekit';

import { createText } from '../shared/ui';
import { colors } from '../theme';
import { contentWidth, designWidth, type SectionMetrics } from './layout';
export { contentWidth } from './layout';

export function createSection(
  name: string,
  metrics: SectionMetrics,
  color: fk.Color3,
): fk.FrameNode {
  return fk.createFrame({
    Name: name,
    Size: fk.udim2FromOffset(designWidth, metrics.height),
    Position: fk.udim2FromOffset(0, metrics.top),
    BackgroundColor3: color,
  });
}

export function createSectionContent(): fk.FrameNode {
  return fk.createFrame({
    Name: 'Content',
    Size: fk.udim2FromOffset(contentWidth, 1),
    Position: fk.udim2FromOffset(16, 0),
    BackgroundTransparency: 1,
  });
}

export function appendSectionHeading(
  parent: fk.GuiNode,
  heading: string,
  body: string,
  usesDarkText: boolean,
): void {
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
