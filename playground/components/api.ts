import { fk } from 'framekit';

import { sectionLayout } from '../layout';
import { createSection, createSectionContent, appendSectionHeading } from '../section';
import { colors } from '../theme';
import { createApiExplorer } from './api-explorer';

/** Creates the public-API tour section. */
export function createApi(): fk.FrameNode {
  const section = createSection('Api', sectionLayout.api, colors.ink);
  const content = createSectionContent();

  appendSectionHeading(
    content,
    'THE PUBLIC API,\nWITHOUT THE DUMP.',
    'Pick an area. Each panel explains what it owns and shows a complete, formatted usage pattern.',
    'light',
  );
  content.addChild(createApiExplorer());
  section.addChild(content);
  return section;
}
