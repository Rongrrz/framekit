import { assertAllowedValue } from '../../runtime/validation';
import {
  createDefaultTextControlProperties,
  createTextControl,
  type TextControl,
  type TextControlProperties,
} from './text-control';

/** Native input types supported by TextInput. */
export type TextInputType = (typeof textInputTypes)[number];

/** Editable text properties plus a native single-line input type. */
export type TextInputProperties = TextControlProperties & {
  InputType: TextInputType;
};

/** A native single-line input with synchronized FrameKit properties. */
export type TextInput = TextControl<TextInputProperties, HTMLInputElement>;

const textInputTypes = ['Text', 'Email', 'Password', 'Search', 'Telephone', 'URL'] as const;
const nativeInputTypes = {
  Text: 'text',
  Email: 'email',
  Password: 'password',
  Search: 'search',
  Telephone: 'tel',
  URL: 'url',
} as const satisfies Record<TextInputType, string>;

/** Creates a native single-line text input. */
export function createTextInput(initialProperties: Partial<TextInputProperties> = {}): TextInput {
  const element = document.createElement('input');
  return createTextControl({
    className: 'TextInput',
    element,
    defaultProperties: {
      ...createDefaultTextControlProperties('TextInput'),
      InputType: 'Text',
    },
    initialProperties,
    renderProperties: (properties, changedProperties) => {
      if (changedProperties.has('InputType')) element.type = nativeInputTypes[properties.InputType];
      element.style.overflow = 'hidden';
    },
    validateProperties: (properties) => {
      assertAllowedValue(properties.InputType, textInputTypes, 'InputType');
    },
  });
}
