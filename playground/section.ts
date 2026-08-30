import { fk } from 'framekit';

import {
  bindLayoutProperties,
  contentInset,
  contentWidth,
  pageWidth,
  sectionLayout,
  type PlaygroundLayout,
  type SectionName,
} from './layout';
import { colors } from './theme';
import { createText } from './ui';

export function createSection(
  name: SectionName,
  layout: fk.Value<PlaygroundLayout>,
  backgroundColor: fk.Color3,
): fk.Frame {
  const section = fk.createFrame({
    Name: `${name[0]!.toUpperCase()}${name.slice(1)}`,
    BackgroundColor3: backgroundColor,
  });

  bindLayoutProperties(section, layout, section, {
    desktop: {
      Size: fk.udim2FromOffset(pageWidth.desktop, sectionLayout.desktop[name].height),
      Position: fk.udim2FromOffset(0, sectionLayout.desktop[name].top),
    },
    mobile: {
      Size: fk.udim2FromOffset(pageWidth.mobile, sectionLayout.mobile[name].height),
      Position: fk.udim2FromOffset(0, sectionLayout.mobile[name].top),
    },
  });

  return section;
}

export function createSectionContent(
  owner: fk.Instance,
  layout: fk.Value<PlaygroundLayout>,
): fk.Frame {
  const content = fk.createFrame({ Name: 'Content', BackgroundTransparency: 1 });

  bindLayoutProperties(owner, layout, content, {
    desktop: {
      Size: fk.udim2FromOffset(contentWidth.desktop, 1),
      Position: fk.udim2FromOffset(contentInset.desktop, 0),
    },
    mobile: {
      Size: fk.udim2FromOffset(contentWidth.mobile, 1),
      Position: fk.udim2FromOffset(contentInset.mobile, 0),
    },
  });

  return content;
}

export function appendSectionHeading(
  parent: fk.GuiElement,
  layout: fk.Value<PlaygroundLayout>,
  heading: string,
  body: string,
  tone: 'dark' | 'light',
): void {
  const usesDarkText = tone === 'dark';
  const title = createText({
    text: heading,
    size: fk.udim2FromOffset(contentWidth.mobile, 126),
    position: fk.udim2FromOffset(0, 52),
    color: usesDarkText ? colors.darkText : colors.text,
    textSize: 32,
    weight: 900,
    wrapped: true,
    yAlignment: 'Top',
  });
  const description = createText({
    text: body,
    size: fk.udim2FromOffset(contentWidth.mobile, 70),
    position: fk.udim2FromOffset(0, 184),
    color: usesDarkText ? colors.darkMuted : colors.textMuted,
    textSize: 13,
    wrapped: true,
    yAlignment: 'Top',
  });

  bindLayoutProperties(parent, layout, title, {
    desktop: {
      Size: fk.udim2FromOffset(contentWidth.desktop, 80),
      Position: fk.udim2FromOffset(0, 58),
      TextSize: 42,
    },
    mobile: {
      Size: fk.udim2FromOffset(contentWidth.mobile, 126),
      Position: fk.udim2FromOffset(0, 52),
      TextSize: 32,
    },
  });
  bindLayoutProperties(parent, layout, description, {
    desktop: {
      Size: fk.udim2FromOffset(680, 54),
      Position: fk.udim2FromOffset(0, 150),
      TextSize: 15,
    },
    mobile: {
      Size: fk.udim2FromOffset(contentWidth.mobile, 70),
      Position: fk.udim2FromOffset(0, 184),
      TextSize: 13,
    },
  });

  parent.addChild(title);
  parent.addChild(description);
}
