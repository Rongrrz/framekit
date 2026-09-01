import {
  initializeButtonElement,
  renderButtonProperties,
  type ButtonElement,
  type ButtonProperties,
  validateButtonProperties,
} from '../../shared/dom/button';
import { initializeTextGradient, resetTextGradientHost } from '../../shared/dom/text-gradient';
import {
  initializeTextStrokeHost,
  resetTextStrokeHost,
  syncTextStrokeHost,
} from '../../shared/dom/text-stroke';
import {
  bindTextScaleResize,
  createDefaultTextStyleProperties,
  horizontalFlexAlignment,
  renderTextStyle,
  validateTextStyleProperties,
  verticalFlexAlignment,
  type TextStyleProperties,
} from '../../shared/dom/text-style';
import { buttonEventMethods, type GuiEventMethodTable } from '../../shared/runtime/gui-events';
import { getPropertiesSnapshot } from '../../shared/runtime/node-properties';
import { type GuiElement, type PropertyRenderer } from '../../shared/runtime/render';
import {
  createDefaultGuiObjectProperties,
  createGuiObjectNode,
  type GuiObjectProperties,
} from '../gui-object';

export type { TextXAlignment, TextYAlignment } from '../../shared/dom/text-style';

/** Properties shared by text labels and text buttons. */
export type TextLabelProperties = GuiObjectProperties & TextStyleProperties;

/** A non-interactive text node. */
export type TextLabel = GuiElement<TextLabelProperties>;

/** Properties for an interactive text button. */
export type TextButtonProperties = TextLabelProperties & ButtonProperties;

/** A text node with typed button events. */
export type TextButton = ButtonElement<TextButtonProperties>;

/** Creates a non-interactive text node. */
export function createTextLabel(initial: Partial<TextLabelProperties> = {}): TextLabel {
  return createTextNode(
    'TextLabel',
    document.createElement('div'),
    createDefaultTextProps(),
    initial,
  );
}

/** Creates a text node with button events. */
export function createTextButton(initial: Partial<TextButtonProperties> = {}): TextButton {
  const element = document.createElement('button');
  const node = createTextNode(
    'TextButton',
    element,
    {
      ...createDefaultTextProps(),
      Name: 'TextButton',
      Disabled: false,
      AccessibleLabel: '',
    },
    initial,
    (properties) => renderButtonProperties(element, properties),
    buttonEventMethods,
  ) as TextButton;

  initializeButtonElement(node, element);
  return node;
}

function createDefaultTextProps(): TextLabelProperties {
  return {
    ...createDefaultGuiObjectProperties(),
    Name: 'TextLabel',
    ...createDefaultTextStyleProperties(),
  };
}

function createTextNode<Properties extends TextLabelProperties>(
  nodeType: string,
  element: HTMLElement,
  defaultProperties: Properties,
  initial: Partial<Properties>,
  renderAdditionalProperties?: PropertyRenderer<Properties>,
  eventMethods?: GuiEventMethodTable,
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

  const node = createGuiObjectNode(
    nodeType,
    element,
    defaultProperties,
    initial,
    (properties, changed) => {
      resetTextGradientHost(element);
      resetTextStrokeHost(element);
      text.textContent = properties.Text;
      renderTextStyle(text, properties);
      syncTextStrokeHost(element, properties, text.style.fontSize);
      text.style.justifyContent = horizontalFlexAlignment[properties.TextXAlignment];
      text.style.alignItems = verticalFlexAlignment[properties.TextYAlignment];
      renderAdditionalProperties?.(properties, changed);
    },
    eventMethods,
    validateTextProperties,
  );
  bindTextScaleResize(node, element, () => {
    const properties = getPropertiesSnapshot(node);
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
