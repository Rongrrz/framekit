import { fk } from 'framekit';

import { contentWidth, designWidth } from './layout';

export { contentWidth } from './layout';

export function scaledSize(
  width: number,
  height: number,
  parentWidth: number,
  parentHeight: number,
): fk.UDim2 {
  return fk.udim2FromScale(width / parentWidth, height / parentHeight);
}

export function scaledPosition(
  x: number,
  y: number,
  parentWidth: number,
  parentHeight: number,
): fk.UDim2 {
  return fk.udim2FromScale(x / parentWidth, y / parentHeight);
}

export function pageSection(
  name: string,
  top: number,
  height: number,
  color: fk.Color3,
): fk.FrameNode {
  return fk.createFrame({
    Name: name,
    Size: fk.udim2(1, 0, 0, height),
    Position: fk.udim2FromOffset(0, top),
    BackgroundColor3: color,
  });
}

export function sectionContent(): fk.FrameNode {
  return fk.createFrame({
    Name: 'Content',
    Size: fk.udim2FromScale(contentWidth / designWidth, 1),
    Position: fk.udim2FromScale(0.5, 0),
    AnchorPoint: fk.vector2(0.5, 0),
    BackgroundTransparency: 1,
  });
}
