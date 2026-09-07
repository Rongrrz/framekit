import { bindTextScaleResize, renderTextSize } from '../../dom/text-size';
import {
  createDefaultTextStyleProperties,
  hasTextStyleChange,
  renderTextStyle,
  type TextStyleProperties,
  validateTextStyleProperties,
} from '../../dom/text-style';
import {
  guiEventKeys,
  textBoxEventMethods,
  type TextBoxEventMethods,
} from '../../runtime/gui-events';
import type { GuiElement } from '../../runtime/gui-node';
import { emitNodeEvent } from '../../runtime/node-events';
import { onDestroy } from '../../runtime/node-lifecycle';
import {
  setNodeProperties,
  getNodeProperties,
  getNodeProperty,
} from '../../runtime/node-properties';
import { assertBoolean, assertFiniteNumber, assertString } from '../../runtime/validation';
import {
  createDefaultGuiObjectProperties,
  createGuiObjectNode,
  type GuiObjectProperties,
} from '../gui-object';
import { assertColor3, color3FromRGB, color3ToCss, type Color3 } from '../values/color3';

/** Properties for editable text. */
export type TextBoxProperties = GuiObjectProperties &
  TextStyleProperties & {
    /** Allows line breaks when true. */
    MultiLine: boolean;
    /** Prevents editing and keyboard focus when true. */
    Disabled: boolean;
    /** Text shown while Text is empty. */
    PlaceholderText: string;
    /** Placeholder color before transparency is applied. */
    PlaceholderColor3: Color3;
    /** Placeholder transparency from 0 (opaque) to 1 (invisible). */
    PlaceholderTransparency: number;
  };

/** An editable text node with typed change events. */
export type TextBox = GuiElement<TextBoxProperties> &
  TextBoxEventMethods & {
    /** The outer browser element containing the editable surface. */
    readonly element: HTMLDivElement;
  };

/** Creates an editable text node whose Text property stays synchronized with the DOM. */
export function createTextBox(initialProperties: Partial<TextBoxProperties> = {}): TextBox {
  const { element, editor, placeholder } = createTextBoxElements();

  let applyingEditorInput = false;
  const node = createGuiObjectNode({
    className: 'TextBox',
    element,
    defaultProperties: {
      ...createDefaultGuiObjectProperties(),
      ...createDefaultTextStyleProperties(),
      Name: 'TextBox',
      BackgroundColor3: color3FromRGB(255, 255, 255),
      MultiLine: false,
      Disabled: false,
      PlaceholderText: '',
      PlaceholderColor3: color3FromRGB(120, 120, 120),
      PlaceholderTransparency: 0,
    },
    initialProperties,
    renderProperties: (properties, changedProperties) => {
      renderTextBoxProperties(editor, placeholder, properties, changedProperties);
      if (changedProperties.has('Text')) {
        placeholder.style.display = properties.Text.length === 0 ? '' : 'none';
        if (!applyingEditorInput) editor.textContent = properties.Text;
      }
    },
    methods: textBoxEventMethods,
    validateProperties: validateTextBoxProperties,
  }) as TextBox;

  bindTextScaleResize(node, element, () => {
    const properties = getNodeProperties(node);
    renderTextSize(editor, properties);
    renderTextSize(placeholder, { ...properties, Text: properties.PlaceholderText });
  });

  const listenerController = new AbortController();
  const listenerOptions = { signal: listenerController.signal };
  editor.addEventListener(
    'input',
    (event) => {
      const properties = getNodeProperties(node);
      const editorText = readEditableText(editor);
      const text = properties.MultiLine ? editorText : removeLineBreaks(editorText);

      applyingEditorInput = true;
      try {
        setNodeProperties(node, { Text: text });
      } finally {
        applyingEditorInput = false;
      }
      if (text !== editorText) editor.textContent = text;

      emitNodeEvent(node, guiEventKeys.textChanged, getNodeProperty(node, 'Text'), event);
    },
    listenerOptions,
  );

  editor.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Enter' && !getNodeProperty(node, 'MultiLine')) event.preventDefault();
    },
    listenerOptions,
  );

  editor.addEventListener(
    'paste',
    (event) => {
      event.preventDefault();
      insertPlainText(editor, event.clipboardData?.getData('text/plain') ?? '');
    },
    listenerOptions,
  );

  onDestroy(node, () => listenerController.abort());
  return node;
}

function createTextBoxElements(): {
  element: HTMLDivElement;
  editor: HTMLDivElement;
  placeholder: HTMLSpanElement;
} {
  const element = document.createElement('div');
  const editor = document.createElement('div');
  const placeholder = document.createElement('span');

  editor.dataset.framekitTextBox = '';
  placeholder.dataset.framekitTextBoxPlaceholder = '';
  editor.setAttribute('role', 'textbox');
  Object.assign(editor.style, {
    position: 'absolute',
    inset: '0',
    boxSizing: 'border-box',
    overflow: 'auto',
    outline: 'none',
    background: 'transparent',
    lineHeight: '1.2',
  });

  Object.assign(placeholder.style, {
    position: 'absolute',
    inset: '0',
    pointerEvents: 'none',
    lineHeight: '1.2',
  });
  element.append(editor, placeholder);

  return { element, editor, placeholder };
}

function renderTextBoxProperties(
  editor: HTMLElement,
  placeholder: HTMLElement,
  properties: Readonly<TextBoxProperties>,
  changedProperties: ReadonlySet<keyof TextBoxProperties>,
): void {
  renderTextStyle(editor, properties, changedProperties);
  if (hasTextStyleChange(changedProperties)) {
    renderTextStyle(
      placeholder,
      { ...properties, Text: properties.PlaceholderText },
      changedProperties,
    );
  } else if (changedProperties.has('PlaceholderText')) {
    renderTextSize(placeholder, { ...properties, Text: properties.PlaceholderText });
  }
  if (changedProperties.has('TextYAlignment')) {
    const alignment = textAlignment(properties.TextYAlignment);
    editor.style.alignContent = alignment;
    placeholder.style.alignContent = alignment;
  }
  if (
    changedProperties.has('PlaceholderColor3') ||
    changedProperties.has('PlaceholderTransparency')
  ) {
    placeholder.style.color = color3ToCss(
      properties.PlaceholderColor3,
      properties.PlaceholderTransparency,
    );
  }
  if (changedProperties.has('Disabled')) {
    editor.contentEditable = String(!properties.Disabled);
    editor.tabIndex = properties.Disabled ? -1 : 0;
    editor.setAttribute('aria-disabled', String(properties.Disabled));
    editor.style.cursor = properties.Disabled ? 'not-allowed' : 'text';
  }
  if (changedProperties.has('MultiLine')) {
    editor.setAttribute('aria-multiline', String(properties.MultiLine));
  }
  if (changedProperties.has('PlaceholderText')) {
    editor.setAttribute('aria-placeholder', properties.PlaceholderText);
    placeholder.textContent = properties.PlaceholderText;
  }
}

function validateTextBoxProperties(properties: Readonly<TextBoxProperties>): void {
  validateTextStyleProperties(properties);
  assertBoolean(properties.MultiLine, 'MultiLine');
  assertBoolean(properties.Disabled, 'Disabled');
  assertString(properties.PlaceholderText, 'PlaceholderText');
  assertColor3(properties.PlaceholderColor3, 'PlaceholderColor3');
  assertFiniteNumber(properties.PlaceholderTransparency, 'PlaceholderTransparency');
}

function textAlignment(alignment: TextBoxProperties['TextYAlignment']): string {
  if (alignment === 'Center') return 'center';
  if (alignment === 'Bottom') return 'end';
  return 'start';
}

function removeLineBreaks(value: string): string {
  return value.replaceAll(/\r\n?|\n/g, '');
}

function readEditableText(container: HTMLElement): string {
  return Array.from(container.childNodes, readEditableNode).join('');
}

function readEditableNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const element = node as HTMLElement;
  if (element.tagName === 'BR') return '\n';
  const contents = Array.from(element.childNodes, readEditableNode).join('');
  return element.tagName === 'DIV' || element.tagName === 'P' ? `${contents}\n` : contents;
}

function insertPlainText(editor: HTMLElement, value: string): void {
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : undefined;
  if (!range || !editor.contains(range.commonAncestorContainer)) {
    editor.append(document.createTextNode(value));
  } else {
    range.deleteContents();
    const text = document.createTextNode(value);
    range.insertNode(text);
    range.setStartAfter(text);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  editor.dispatchEvent(new InputEvent('input', { bubbles: true, data: value }));
}
