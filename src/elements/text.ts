import { buttonEventMethods, type GuiEventMethodTable } from '../runtime/gui-events';
import { type GuiNode, type PropertyRenderer } from '../runtime/render';
import { assertBoolean } from '../runtime/validation';
import { initializeButtonElement, type ButtonNode, type ButtonProperties } from './button';
import { createDefaultFrameProperties, createFrameBasedNode, type FrameProperties } from './frame';
import {
  createDefaultTextStyleProperties,
  horizontalFlexAlignment,
  renderTextStyle,
  verticalFlexAlignment,
  type TextStyleProperties,
} from './text-style';

export type { TextXAlignment, TextYAlignment } from './text-style';

export type TextLabelProperties = FrameProperties & TextStyleProperties;

export type TextLabelNode = GuiNode<TextLabelProperties>;
export type TextButtonProperties = TextLabelProperties & ButtonProperties;
export type TextButtonNode = ButtonNode<TextButtonProperties>;

export function createTextLabel(initial: Partial<TextLabelProperties> = {}): TextLabelNode {
  return createTextNode(
    'TextLabel',
    document.createElement('div'),
    createDefaultTextProps(),
    initial,
  );
}

export function createTextButton(initial: Partial<TextButtonProperties> = {}): TextButtonNode {
  const element = document.createElement('button');
  const node = createTextNode(
    'TextButton',
    element,
    { ...createDefaultTextProps(), Name: 'TextButton', Disabled: false },
    initial,
    (properties) => {
      assertBoolean(properties.Disabled, 'Disabled');
      element.disabled = properties.Disabled;
      element.style.cursor = properties.Disabled ? 'not-allowed' : 'pointer';
    },
    buttonEventMethods,
  ) as TextButtonNode;
  initializeButtonElement(node, element);
  return node;
}

function createDefaultTextProps(): TextLabelProperties {
  return {
    ...createDefaultFrameProperties(),
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
): GuiNode<Properties> {
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

  return createFrameBasedNode(
    nodeType,
    element,
    defaultProperties,
    initial,
    (properties, changed) => {
      text.textContent = properties.Text;
      renderTextStyle(text, properties);
      text.style.justifyContent = horizontalFlexAlignment[properties.TextXAlignment];
      text.style.alignItems = verticalFlexAlignment[properties.TextYAlignment];
      renderAdditionalProperties?.(properties, changed);
    },
    eventMethods,
  );
}
