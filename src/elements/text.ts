import { resolveOwnerDocument, type DomOptions } from '#internal/dom/environment.js';
import { setStyle } from '#internal/dom/styles.js';
import { buttonEventMethods, type GuiMethodTable } from '#internal/runtime/node/gui-events.js';
import type { GuiElement, PropertyRenderer } from '#internal/runtime/node/gui-node.js';
import type { PropertyValidator } from '#internal/runtime/node/registry.js';
import { getNodeProperties } from '#internal/runtime/systems/properties.js';
import { assertAllowedValue, assertBoolean } from '#internal/validation.js';

import {
  initializeButtonElement,
  renderButtonProperties,
  type ButtonElement,
  type ButtonProperties,
  validateButtonProperties,
} from './button-events.js';
import {
  createDefaultGuiObjectProperties,
  createGuiObjectNode,
  type GuiObjectProperties,
} from './gui-object.js';
import { initializeTextGradient } from './text/gradient.js';
import {
  createRichTextContent,
  updateRichTextColors,
  type RichTextContent,
} from './text/rich-text.js';
import { bindTextScaleResize } from './text/sizing.js';
import { initializeTextStrokeHost, syncTextStrokeHost } from './text/stroke.js';
import {
  createDefaultTextStyleProperties,
  hasTextStyleChange,
  horizontalFlexAlignment,
  renderTextStyle,
  validateTextStyleProperties,
  verticalFlexAlignment,
  type TextStyleProperties,
} from './text/style.js';

export type { TextXAlignment, TextYAlignment } from './text/style.js';

/** Properties shared by text labels and text buttons. */
export type TextLabelProperties = GuiObjectProperties &
  TextStyleProperties & {
    /** Whether users can select and copy the displayed text. */
    TextSelectable: boolean;
    /** Whether the text is underlined. Links enable this by default. */
    TextUnderline: boolean;
    /** Enables b, i, u, s, br, and font colors (#RRGGBB or #RRGGBBAA) in Text. Other tags stay literal. */
    RichText: boolean;
  };

/** Semantic HTML elements that can carry a text label's content. */
export type TextTagName = (typeof textTagNames)[number];

/** Initial label properties, including its creation-only semantic text tag. */
export type TextLabelOptions = Readonly<
  Partial<TextLabelProperties> & {
    /** Tag of the inner text element. Defaults to span; fixed after creation. */
    TextTagName?: TextTagName;
  }
>;

/** A non-interactive text node. */
export type TextLabel = GuiElement<TextLabelProperties>;

/** Properties for an interactive text button. */
export type TextButtonProperties = TextLabelProperties & ButtonProperties;

/** A text node with typed button events. */
export type TextButton = ButtonElement<TextButtonProperties>;

const textTagNames = [
  'span',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'em',
  'small',
  'code',
  'pre',
  'blockquote',
] as const;

/** Creates a non-interactive text node. */
export function createTextLabel(
  initialProperties: TextLabelOptions = {},
  options: DomOptions = {},
): TextLabel {
  const { TextTagName = 'span', ...properties } = initialProperties;
  assertAllowedValue(TextTagName, textTagNames, 'TextLabel TextTagName');

  return createTextNode(
    'TextLabel',
    resolveOwnerDocument(options).createElement('div'),
    createDefaultTextProperties(),
    properties,
    TextTagName,
  );
}

/** Creates a text node with button events. */
export function createTextButton(
  initialProperties: Partial<TextButtonProperties> = {},
  options: DomOptions = {},
): TextButton {
  const element = resolveOwnerDocument(options).createElement('button');

  const node = createTextNode(
    'TextButton',
    element,
    {
      ...createDefaultTextProperties(),
      Name: 'TextButton',
      Disabled: false,
      AutoButtonColor: true,
      AccessibleLabel: '',
    },
    initialProperties,
    'span',
    (properties, changedProperties) => {
      if (
        changedProperties.has('Disabled') ||
        changedProperties.has('AutoButtonColor') ||
        changedProperties.has('AccessibleLabel')
      ) {
        renderButtonProperties(element, properties);
      }
    },
    buttonEventMethods,
    undefined,
    false,
  ) as TextButton;

  initializeButtonElement(node, element);

  return node;
}

export function createDefaultTextProperties(): TextLabelProperties {
  return {
    ...createDefaultGuiObjectProperties(),
    Name: 'TextLabel',
    ...createDefaultTextStyleProperties(),
    TextSelectable: false,
    TextUnderline: false,
    RichText: false,
  };
}

export function createTextNode<Properties extends TextLabelProperties>(
  className: string,
  element: HTMLElement,
  defaultProperties: Properties,
  initialProperties: Partial<Properties>,
  textTagName: TextTagName,
  renderAdditionalProperties?: PropertyRenderer<Properties>,
  methods?: GuiMethodTable,
  validateAdditionalProperties?: PropertyValidator<Properties>,
  canContainGuiChildren = true,
): GuiElement<Properties> {
  const text = element.ownerDocument.createElement(textTagName);
  text.dataset.framekitText = '';
  Object.assign(text.style, {
    position: 'absolute',
    inset: '0',
    display: 'flex',
    pointerEvents: 'none',
    margin: '0',
    boxSizing: 'border-box',
    padding: 'inherit',
    minWidth: '0',
  });
  element.prepend(text);
  initializeTextGradient(element, text);
  initializeTextStrokeHost(element);
  let richContent: RichTextContent | undefined;

  const node = createGuiObjectNode({
    className,
    element,
    defaultProperties,
    initialProperties,

    renderProperties: (properties, changedProperties) => {
      if (changedProperties.has('AutomaticSize')) {
        // Intrinsic text must participate in layout for the host to follow wrapped content.
        text.style.position = properties.AutomaticSize === 'None' ? 'absolute' : 'relative';
        text.style.padding = properties.AutomaticSize === 'None' ? 'inherit' : '0';
      }

      if (changedProperties.has('TextSelectable')) {
        text.style.userSelect = properties.TextSelectable ? 'text' : 'none';
        text.style.pointerEvents = properties.TextSelectable ? 'auto' : 'none';
      }

      if (changedProperties.has('TextUnderline')) {
        setStyle(element, 'text-decoration-line', properties.TextUnderline ? 'underline' : 'none');
      }

      const contentChanged = changedProperties.has('Text') || changedProperties.has('RichText');

      if (contentChanged) {
        element.toggleAttribute('data-framekit-rich-text', properties.RichText);
        richContent = properties.RichText
          ? createRichTextContent(element.ownerDocument, properties.Text)
          : undefined;

        if (richContent) {
          text.replaceChildren(richContent.element);
        } else {
          text.textContent = properties.Text;
        }
      }

      if (richContent && (contentChanged || changedProperties.has('TextTransparency'))) {
        updateRichTextColors(richContent, properties.TextTransparency);
      }

      renderTextStyle(
        text,
        properties,
        changedProperties.has('RichText') ? undefined : changedProperties,
      );

      if (contentChanged || hasTextStyleChange(changedProperties)) {
        syncTextStrokeHost(element, properties, text.style.fontSize, text.textContent ?? '');
      }

      if (changedProperties.has('TextXAlignment')) {
        text.style.justifyContent = horizontalFlexAlignment[properties.TextXAlignment];
      }

      if (changedProperties.has('TextYAlignment')) {
        text.style.alignItems = verticalFlexAlignment[properties.TextYAlignment];
      }

      renderAdditionalProperties?.(properties, changedProperties);
    },

    methods,
    canContainGuiChildren,
    capabilities: { displayText: true },

    validateProperties: (properties) => {
      validateTextProperties(properties);
      validateAdditionalProperties?.(properties);
    },
  });

  bindTextScaleResize(node, element, () => {
    const properties = getNodeProperties(node);
    renderTextStyle(text, properties);
    syncTextStrokeHost(element, properties, text.style.fontSize, text.textContent ?? '');
  });

  return node;
}

function validateTextProperties(
  properties: Readonly<TextLabelProperties | TextButtonProperties>,
): void {
  validateTextStyleProperties(properties);
  assertBoolean(properties.TextSelectable, 'TextSelectable');
  assertBoolean(properties.TextUnderline, 'TextUnderline');
  assertBoolean(properties.RichText, 'RichText');

  if ('Disabled' in properties) {
    validateButtonProperties(properties);
  }
}
