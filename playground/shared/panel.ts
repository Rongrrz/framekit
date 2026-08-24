import { fk } from 'framekit';

import { decorate } from './decorate';
import { palette } from './theme';

/** Creates the shared card surface used by the primary playground panels. */
export function createPanel(name: string, size: fk.UDim2, position: fk.UDim2): fk.FrameNode {
  const panel = fk.createFrame({
    Name: name,
    Size: size,
    Position: position,
    BackgroundColor3: palette.panel,
    BackgroundTransparency: 0.08,
  });
  decorate(panel, 20);
  return panel;
}
