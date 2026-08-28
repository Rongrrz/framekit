import type { GuiNode } from '../../shared/runtime/render';
import {
  createDefaultGuiObjectProperties,
  createGuiObjectNode,
  type GuiObjectProperties,
} from '../gui-object';

/** Properties for a rectangular GUI container. */
export type FrameProperties = GuiObjectProperties;

/** A rectangular DOM-backed GUI container. */
export type FrameNode = GuiNode<FrameProperties>;

/** Creates a rectangular GUI container. */
export function createFrame(initial: Partial<FrameProperties> = {}): FrameNode {
  return createGuiObjectNode(
    'Frame',
    document.createElement('div'),
    { ...createDefaultGuiObjectProperties(), Name: 'Frame' },
    initial,
  );
}
