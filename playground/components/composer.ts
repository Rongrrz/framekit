import { fk } from 'framekit';

import { sectionLayout } from '../layout';
import { createSection, createSectionContent, appendSectionHeading } from '../section';
import { colors } from '../theme';
import { createModifierDemo } from './modifier-demo';

/** Creates the modifier-composition section. */
export function createComposer(): fk.Frame {
  const section = createSection('Composer', sectionLayout.composer, colors.paper);
  const content = createSectionContent();

  appendSectionHeading(
    content,
    'ADD IT.\nSEE THE DIFFERENCE.',
    'These controls change real modifier nodes on the preview below.',
    'dark',
  );
  content.addChild(createModifierDemo());
  section.addChild(content);
  return section;
}
