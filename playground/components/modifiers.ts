import { fk } from 'framekit';

import type { PlaygroundLayout } from '../layout';
import { appendSectionHeading, createSection, createSectionContent } from '../section';
import { colors } from '../theme';
import { createModifierDemo } from './modifier-demo';

export function createModifiers(layout: fk.Value<PlaygroundLayout>): fk.Frame {
  const section = createSection('modifiers', layout, colors.paper);
  const content = createSectionContent(section, layout);

  appendSectionHeading(
    content,
    layout,
    'STYLE LIVES IN THE TREE.',
    'Toggle real child instances. The preview, hierarchy, and code stay synchronized without a render cycle.',
    'dark',
  );
  content.addChild(createModifierDemo(layout));
  section.addChild(content);
  return section;
}
