import { fk } from 'framekit';

import {
  bindLayoutProperties,
  contentWidth,
  sectionLayout,
  type PlaygroundLayout,
  type SectionName,
} from './layout';

export const createSection = (name: SectionName, layout: fk.Value<PlaygroundLayout>): fk.Frame => {
  const section = fk.createFrame({
    Name: `${name[0]!.toUpperCase()}${name.slice(1)}`,
    BackgroundTransparency: 1,
  });
  bindLayoutProperties(section, layout, section, {
    desktop: {
      Size: fk.udim2(1, 0, 0, sectionLayout.desktop[name].height),
      Position: fk.udim2FromOffset(0, sectionLayout.desktop[name].top),
    },
    mobile: {
      Size: fk.udim2(1, 0, 0, sectionLayout.mobile[name].height),
      Position: fk.udim2FromOffset(0, sectionLayout.mobile[name].top),
    },
  });
  return section;
};

export const createSectionContent = (
  owner: fk.Instance,
  layout: fk.Value<PlaygroundLayout>,
): fk.Frame => {
  const content = fk.createFrame({
    Name: 'Content',
    AnchorPoint: fk.vector2(0.5, 0),
    BackgroundTransparency: 1,
  });
  bindLayoutProperties(owner, layout, content, {
    desktop: {
      Size: fk.udim2FromOffset(contentWidth.desktop, 1),
      Position: fk.udim2FromScale(0.5, 0),
    },
    mobile: {
      Size: fk.udim2FromOffset(contentWidth.mobile, 1),
      Position: fk.udim2FromScale(0.5, 0),
    },
  });
  return content;
};
