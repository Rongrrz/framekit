import type { GuiElement } from '../../shared/runtime/render';
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
export function createFrame(initial: Partial<FrameProperties> = {}): Frame {
  return createGuiObjectNode(
    'Frame',
    document.createElement('div'),
    { ...createDefaultGuiObjectProperties(), Name: 'Frame' },
    initial,
  );
}
