import { resolveOwnerDocument, type DomOptions } from '../dom/environment.js';
import { assertAllowedValue } from '../internal/validation.js';
import { buttonEventMethods, type GuiMethodTable } from '../runtime/node/gui-events.js';
import type { GuiElement, PropertyRenderer } from '../runtime/node/gui-node.js';
import type { PropertyValidator } from '../runtime/node/registry.js';
import { getNodeProperties } from '../runtime/services/properties.js';
import {
  createDefaultGuiObjectProperties,
  createGuiObjectNode,
  type GuiObjectProperties,
} from './gui-object.js';
import {
  initializeButtonElement,
  renderButtonProperties,
  type ButtonElement,
  type ButtonProperties,
  validateButtonProperties,
} from './services/button-events.js';
import { initializeTextGradient, resetTextGradientHost } from './services/text-gradient.js';
import { bindTextScaleResize } from './services/text-size.js';
import {
  initializeTextStrokeHost,
  resetTextStrokeHost,
  syncTextStrokeHost,
} from './services/text-stroke.js';
import {
  createDefaultTextStyleProperties,
  hasTextStyleChange,
  horizontalFlexAlignment,
  renderTextStyle,
  validateTextStyleProperties,
  verticalFlexAlignment,
  type TextStyleProperties,
} from './services/text-style.js';

export type { TextXAlignment, TextYAlignment } from './services/text-style.js';

/** Properties shared by text labels and text buttons. */
export type TextLabelProperties = GuiObjectProperties & TextStyleProperties;

/** Semantic HTML elements that can carry a text label's content. */
export type TextTagName = (typeof textTagNames)[number];

/** Creation-only options for a text label's native text element. */
export type TextLabelOptions = Readonly<DomOptions & { textTagName?: TextTagName }>;

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
  initialProperties: Partial<TextLabelProperties> = {},
  options: TextLabelOptions = {},
): TextLabel {
  const textTagName = options.textTagName ?? 'span';
  assertAllowedValue(textTagName, textTagNames, 'TextLabel textTagName');
  return createTextNode(
    'TextLabel',
    resolveOwnerDocument(options).createElement('div'),
    createDefaultTextProperties(),
    initialProperties,
    textTagName,
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
    lineHeight: '1.2',
    margin: '0',
  });
  element.prepend(text);
  initializeTextGradient(text);
  initializeTextStrokeHost(element);

  const node = createGuiObjectNode({
    className,
    element,
    defaultProperties,
    initialProperties,
    renderProperties: (properties, changedProperties) => {
      const textChanged = hasTextStyleChange(changedProperties);
      if (textChanged) {
        resetTextGradientHost(element);
        resetTextStrokeHost(element);
      }
      if (changedProperties.has('Text')) {
        text.textContent = properties.Text;
      }
      renderTextStyle(text, properties, changedProperties);
      if (textChanged) {
        syncTextStrokeHost(element, properties, text.style.fontSize);
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
    syncTextStrokeHost(element, properties, text.style.fontSize);
  });
  return node;
}

function validateTextProperties(
  properties: Readonly<TextLabelProperties | TextButtonProperties>,
): void {
  validateTextStyleProperties(properties);
  if ('Disabled' in properties) {
    validateButtonProperties(properties);
  }
}
