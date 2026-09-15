import { DestroyService } from '../destroy-service';
import { bindTextScaleResize, renderTextSize } from '../dom/text-size';
import {
  createDefaultTextStyleProperties,
  renderTextStyle,
  type TextStyleProperties,
  validateTextStyleProperties,
} from '../dom/text-style';
import {
  createDefaultGuiObjectProperties,
  createGuiObjectNode,
  type GuiObjectProperties,
} from '../gui-object';
import { assertBoolean, assertString, assertUnitInterval } from '../internal/validation';
import { emitNodeEvent } from '../node/events';
import {
  guiEventKeys,
  textChangedEventMethods,
  type TextChangedEventMethods,
} from '../node/gui-events';
import type { GuiElement, PropertyRenderer } from '../node/gui-node';
import { getNodeProperties, getNodeProperty, setNodeProperties } from '../node/properties';
import type { PropertyValidator } from '../node/state';
import { assertColor3, color3FromRGB, color3ToCss, type Color3 } from '../values/color3';

/** Properties shared by native single-line and multiline text controls. */
export type TextControlProperties = GuiObjectProperties &
  TextStyleProperties & {
    /** Prevents editing and keyboard focus when true. */
    Disabled: boolean;
    /** Prevents editing while keeping the control focusable. */
    ReadOnly: boolean;
    /** Text shown while Text is empty. */
    PlaceholderText: string;
    /** Placeholder color before transparency is applied. */
    PlaceholderColor3: Color3;
    /** Placeholder transparency from 0 (opaque) to 1 (invisible). */
    PlaceholderTransparency: number;
    /** Optional accessible name when the visible context is insufficient. */
    AccessibleLabel: string;
    /** Native form field name, independent from the FrameKit instance Name. */
    FieldName: string;
    /** Native autocomplete token or token sequence. */
    AutoComplete: string;
  };

export type NativeTextControl = HTMLInputElement | HTMLTextAreaElement;

export type TextControl<
  Properties extends TextControlProperties,
  Element extends NativeTextControl,
> = GuiElement<Properties> &
  TextChangedEventMethods & {
    readonly unsafeElement: Element;
  };

type TextControlOptions<
  Properties extends TextControlProperties,
  Element extends NativeTextControl,
> = {
  className: string;
  element: Element;
  defaultProperties: Properties;
  initialProperties: Partial<Properties>;
  renderProperties?: PropertyRenderer<Properties>;
  validateProperties?: PropertyValidator<Properties>;
};

const documentsWithTextControlStyles = new WeakSet<Document>();

/** Creates a native text control with shared property synchronization and lifecycle. */
export function createTextControl<
  Properties extends TextControlProperties,
  Element extends NativeTextControl,
>({
  className,
  element,
  defaultProperties,
  initialProperties,
  renderProperties,
  validateProperties,
}: TextControlOptions<Properties, Element>): TextControl<Properties, Element> {
  ensureTextControlStyles(element.ownerDocument);
  element.dataset.framekitTextControl = className;
  Object.assign(element.style, {
    appearance: 'none',
    border: '0',
    padding: '0',
    lineHeight: '1.2',
  });

  let applyingNativeInput = false;
  const node = createGuiObjectNode({
    className,
    element,
    defaultProperties,
    initialProperties,
    renderProperties: (properties, changedProperties) => {
      renderTextControlProperties(element, properties, changedProperties, applyingNativeInput);
      renderProperties?.(properties, changedProperties);
    },
    methods: textChangedEventMethods,
    validateProperties: (properties) => {
      validateTextControlProperties(properties);
      validateProperties?.(properties);
    },
    canContainGuiChildren: false,
  }) as TextControl<Properties, Element>;

  bindTextScaleResize(node, element, () => {
    renderTextSize(element, getNodeProperties(node));
  });

  const listenerController = new AbortController();
  element.addEventListener(
    'input',
    (event) => {
      applyingNativeInput = true;
      try {
        setNodeProperties(node, { Text: element.value } as Partial<Properties>);
      } finally {
        applyingNativeInput = false;
      }
      emitNodeEvent(
        node,
        guiEventKeys.textChanged,
        getNodeProperty(node, 'Text'),
        event as InputEvent,
      );
    },
    { signal: listenerController.signal },
  );
  DestroyService.onDestroy(node, () => listenerController.abort());
  return node;
}

/** Returns common native text-control defaults with a concrete instance name. */
export function createDefaultTextControlProperties(name: string): TextControlProperties {
  return {
    ...createDefaultGuiObjectProperties(),
    ...createDefaultTextStyleProperties(),
    Name: name,
    BackgroundColor3: color3FromRGB(255, 255, 255),
    Disabled: false,
    ReadOnly: false,
    PlaceholderText: '',
    PlaceholderColor3: color3FromRGB(120, 120, 120),
    PlaceholderTransparency: 0,
    AccessibleLabel: '',
    FieldName: '',
    AutoComplete: '',
  };
}

function renderTextControlProperties<Properties extends TextControlProperties>(
  element: NativeTextControl,
  properties: Readonly<Properties>,
  changedProperties: ReadonlySet<keyof Properties>,
  applyingNativeInput: boolean,
): void {
  renderTextStyle(element, properties, changedProperties);
  if (changedProperties.has('Text') && !applyingNativeInput) element.value = properties.Text;
  if (changedProperties.has('PlaceholderText')) element.placeholder = properties.PlaceholderText;
  if (
    changedProperties.has('PlaceholderColor3') ||
    changedProperties.has('PlaceholderTransparency')
  ) {
    element.style.setProperty(
      '--framekit-placeholder-color',
      color3ToCss(properties.PlaceholderColor3, properties.PlaceholderTransparency),
    );
  }
  if (changedProperties.has('Disabled')) element.disabled = properties.Disabled;
  if (changedProperties.has('ReadOnly')) element.readOnly = properties.ReadOnly;
  if (changedProperties.has('AccessibleLabel')) {
    setOptionalAttribute(element, 'aria-label', properties.AccessibleLabel);
  }
  if (changedProperties.has('FieldName'))
    setOptionalAttribute(element, 'name', properties.FieldName);
  if (changedProperties.has('AutoComplete')) {
    setOptionalAttribute(element, 'autocomplete', properties.AutoComplete);
  }
  if (changedProperties.has('Disabled')) {
    element.style.cursor = properties.Disabled ? 'not-allowed' : 'text';
  }
  if (changedProperties.has('TextYAlignment')) {
    element.style.alignContent = textAlignment(properties.TextYAlignment);
  }
}

function validateTextControlProperties(properties: Readonly<TextControlProperties>): void {
  validateTextStyleProperties(properties);
  assertBoolean(properties.Disabled, 'Disabled');
  assertBoolean(properties.ReadOnly, 'ReadOnly');
  assertString(properties.PlaceholderText, 'PlaceholderText');
  assertColor3(properties.PlaceholderColor3, 'PlaceholderColor3');
  assertUnitInterval(properties.PlaceholderTransparency, 'PlaceholderTransparency');
  assertString(properties.AccessibleLabel, 'AccessibleLabel');
  assertString(properties.FieldName, 'FieldName');
  assertString(properties.AutoComplete, 'AutoComplete');
}

function textAlignment(alignment: TextStyleProperties['TextYAlignment']): string {
  if (alignment === 'Center') return 'center';
  if (alignment === 'Bottom') return 'end';
  return 'start';
}

function setOptionalAttribute(element: HTMLElement, name: string, value: string): void {
  if (value) element.setAttribute(name, value);
  else element.removeAttribute(name);
}

function ensureTextControlStyles(ownerDocument: Document): void {
  if (documentsWithTextControlStyles.has(ownerDocument)) return;
  const style = ownerDocument.createElement('style');
  style.dataset.framekitTextControlStyles = '';
  style.textContent = `
    [data-framekit-text-control]::placeholder {
      color: var(--framekit-placeholder-color);
      opacity: 1;
    }
  `;
  ownerDocument.head.append(style);
  documentsWithTextControlStyles.add(ownerDocument);
}
