import type { GuiElement } from '../../runtime/gui-node';
import {
  createDefaultGuiObjectProperties,
  createGuiObjectNode,
  type GuiObjectProperties,
} from '../gui-object';

/** Properties for a rectangular GUI container. */
export type FrameProperties = GuiObjectProperties;

/** A rectangular DOM-backed GUI container. */
export type Frame = GuiElement<FrameProperties>;

/** Creates a rectangular GUI container. */
export function createFrame(initialProperties: Partial<FrameProperties> = {}): Frame {
  return createGuiObjectNode({
    className: 'Frame',
    element: document.createElement('div'),
    defaultProperties: { ...createDefaultGuiObjectProperties(), Name: 'Frame' },
    initialProperties,
  });
}
