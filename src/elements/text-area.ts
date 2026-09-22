import { resolveOwnerDocument, type DomOptions } from '../dom/environment.js';
import { assertAllowedValue } from '../internal/validation.js';
import {
  createDefaultTextControlProperties,
  createTextControl,
  type TextControl,
  type TextControlProperties,
} from './text-control.js';

/** Native resize directions supported by TextArea. */
export type TextAreaResizeDirection = (typeof resizeDirections)[number];

/** Editable multiline text properties. */
export type TextAreaProperties = TextControlProperties & {
  ResizeDirection: TextAreaResizeDirection;
};

/** A native multiline textarea with synchronized FrameKit properties. */
export type TextArea = TextControl<TextAreaProperties, HTMLTextAreaElement>;

const resizeDirections = ['None', 'Horizontal', 'Vertical', 'Both'] as const;
const nativeResizeDirections = {
  None: 'none',
  Horizontal: 'horizontal',
  Vertical: 'vertical',
  Both: 'both',
} as const satisfies Record<TextAreaResizeDirection, string>;

/** Creates a native multiline text area. */
export function createTextArea(
  initialProperties: Partial<TextAreaProperties> = {},
  options: DomOptions = {},
): TextArea {
  const element = resolveOwnerDocument(options).createElement('textarea');
  return createTextControl({
    className: 'TextArea',
    element,
    defaultProperties: {
      ...createDefaultTextControlProperties('TextArea'),
      TextWrapped: true,
      TextYAlignment: 'Top',
      ResizeDirection: 'None',
    },
    initialProperties,
    renderProperties: (properties, changedProperties) => {
      if (changedProperties.has('ResizeDirection')) {
        element.style.resize = nativeResizeDirections[properties.ResizeDirection];
      }
      if (changedProperties.has('TextWrapped')) {
        element.wrap = properties.TextWrapped ? 'soft' : 'off';
      }
      element.style.overflow = 'auto';
    },
    validateProperties: (properties) => {
      assertAllowedValue(properties.ResizeDirection, resizeDirections, 'ResizeDirection');
    },
  });
}
