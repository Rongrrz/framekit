import { fk } from 'framekit';

import { sectionLayout } from '../layout';
import { createSection, createSectionContent, appendSectionHeading } from '../section';
import { colors } from '../theme';
import { createGuideDemo } from './guide-demo';

/** Creates the guided first-component section. */
export function createGuide(): fk.FrameNode {
  const section = createSection('Guide', sectionLayout.guide, colors.paper);
  const content = createSectionContent();

  appendSectionHeading(
    content,
    'ONE WORKING CARD.\nFOUR REAL STEPS.',
    'The preview and code change together so every step has a visible purpose.',
    'dark',
  );
  content.addChild(createGuideDemo());
  section.addChild(content);
  return section;
}
