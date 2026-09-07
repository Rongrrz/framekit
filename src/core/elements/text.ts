import {
  initializeButtonElement,
  renderButtonProperties,
  type ButtonElement,
  type ButtonProperties,
  validateButtonProperties,
} from '../../dom/button';
import { initializeTextGradient, resetTextGradientHost } from '../../dom/text-gradient';
import { bindTextScaleResize } from '../../dom/text-size';
import {
  initializeTextStrokeHost,
  resetTextStrokeHost,
  syncTextStrokeHost,
} from '../../dom/text-stroke';
import {
  createDefaultTextStyleProperties,
  hasTextStyleChange,
  horizontalFlexAlignment,
  renderTextStyle,
  validateTextStyleProperties,
  verticalFlexAlignment,
  type TextStyleProperties,
} from '../../dom/text-style';
import { buttonEventMethods, type GuiMethodTable } from '../../runtime/gui-events';
import type { GuiElement, PropertyRenderer } from '../../runtime/gui-node';
import { getNodeProperties } from '../../runtime/node-properties';
import {
  createDefaultGuiObjectProperties,
  createGuiObjectNode,
  type GuiObjectProperties,
} from '../gui-object';

export type { TextXAlignment, TextYAlignment } from '../../dom/text-style';

/** Properties shared by text labels and text buttons. */
export type TextLabelProperties = GuiObjectProperties & TextStyleProperties;

/** A non-interactive text node. */
export type TextLabel = GuiElement<TextLabelProperties>;

/** Properties for an interactive text button. */
export type TextButtonProperties = TextLabelProperties & ButtonProperties;

/** A text node with typed button events. */
export type TextButton = ButtonElement<TextButtonProperties>;

/** Creates a non-interactive text node. */
export function createTextLabel(initialProperties: Partial<TextLabelProperties> = {}): TextLabel {
  return createTextNode(
    'TextLabel',
    document.createElement('div'),
    createDefaultTextProperties(),
    initialProperties,
  );
}

/** Creates a text node with button events. */
export function createTextButton(
  initialProperties: Partial<TextButtonProperties> = {},
): TextButton {
  const element = document.createElement('button');
  const node = createTextNode(
    'TextButton',
    element,
    {
      ...createDefaultTextProperties(),
      Name: 'TextButton',
      Disabled: false,
      AccessibleLabel: '',
    },
    initialProperties,
    (properties, changedProperties) => {
      if (changedProperties.has('Disabled') || changedProperties.has('AccessibleLabel')) {
        renderButtonProperties(element, properties);
      }
    },
    buttonEventMethods,
  ) as TextButton;

  initializeButtonElement(node, element);
  return node;
}

function createDefaultTextProperties(): TextLabelProperties {
  return {
    ...createDefaultGuiObjectProperties(),
    Name: 'TextLabel',
    ...createDefaultTextStyleProperties(),
  };
}

function createTextNode<Properties extends TextLabelProperties>(
  className: string,
  element: HTMLElement,
  defaultProperties: Properties,
  initialProperties: Partial<Properties>,
  renderAdditionalProperties?: PropertyRenderer<Properties>,
  methods?: GuiMethodTable,
): GuiElement<Properties> {
  const text = document.createElement('span');
  text.dataset.framekitText = '';
  Object.assign(text.style, {
    position: 'absolute',
    inset: '0',
    display: 'flex',
    pointerEvents: 'none',
    lineHeight: '1.2',
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
      if (changedProperties.has('Text')) text.textContent = properties.Text;
      renderTextStyle(text, properties, changedProperties);
      if (textChanged) syncTextStrokeHost(element, properties, text.style.fontSize);
      if (changedProperties.has('TextXAlignment')) {
        text.style.justifyContent = horizontalFlexAlignment[properties.TextXAlignment];
      }
      if (changedProperties.has('TextYAlignment')) {
        text.style.alignItems = verticalFlexAlignment[properties.TextYAlignment];
      }
      renderAdditionalProperties?.(properties, changedProperties);
    },
    methods,
    validateProperties: validateTextProperties,
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
  if ('Disabled' in properties) validateButtonProperties(properties);
}
