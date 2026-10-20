import { resolveOwnerDocument, type DomOptions } from '#internal/dom/environment.js';
import { setStyle } from '#internal/dom/styles.js';
import { assertUnitInterval } from '#internal/validation.js';

import {
  createDefaultGuiObjectProperties,
  createGuiObjectNode,
  type GuiObject,
  type GuiObjectProperties,
} from './gui-object.js';

/** A frame whose complete rendered subtree can fade as one surface. */
export type CanvasGroupProperties = GuiObjectProperties & {
  /** Transparency of the group, including backgrounds, text, images, and descendants. */
  GroupTransparency: number;
};

/** A persistent container with independently animatable group transparency. */
export type CanvasGroup = GuiObject<CanvasGroupProperties>;

/** Creates a container that fades its complete subtree without changing descendant properties. */
export function createCanvasGroup(
  initialProperties: Partial<CanvasGroupProperties> = {},
  options: DomOptions = {},
): CanvasGroup {
  const element = resolveOwnerDocument(options).createElement('div');

  return createGuiObjectNode({
    className: 'CanvasGroup',
    element,
    defaultProperties: {
      ...createDefaultGuiObjectProperties(),
      Name: 'CanvasGroup',
      GroupTransparency: 0,
    },
    initialProperties,
    validateProperties: (properties) =>
      assertUnitInterval(properties.GroupTransparency, 'GroupTransparency'),
    renderProperties: (properties, changed) => {
      if (changed.has('GroupTransparency')) {
        setStyle(element, 'opacity', String(1 - properties.GroupTransparency));
      }
    },
  });
}
