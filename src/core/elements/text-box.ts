import {
  bindTextScaleResize,
  createDefaultTextStyleProperties,
  renderTextSize,
  renderTextStyle,
  type TextStyleProperties,
  validateTextStyleProperties,
} from '../../shared/dom/text-style';
import {
  guiEventKeys,
  textBoxEventMethods,
  type TextBoxEventMethods,
} from '../../shared/runtime/gui-events';
import { addCleanup } from '../../shared/runtime/node-lifecycle';
import {
  applyPropertyPatch,
  getNodeProperties,
  getNodeProperty,
} from '../../shared/runtime/node-properties';
import type { GuiElement } from '../../shared/runtime/render';
import { emitNodeEvent } from '../../shared/runtime/signal';
import { assertBoolean, assertFiniteNumber, assertString } from '../../shared/runtime/validation';
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
export function createTextBox(initial: Partial<TextBoxProperties> = {}): TextBox {
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

  let applyingEditorInput = false;
  const node = createGuiObjectNode(
    'TextBox',
    element,
    {
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
    initial,
    (current, changed) => {
      renderTextStyle(editor, current, changed);
      if (hasTextStyleChange(changed)) {
        renderTextStyle(placeholder, { ...current, Text: current.PlaceholderText }, changed);
      } else if (changed.has('PlaceholderText')) {
        renderTextSize(placeholder, { ...current, Text: current.PlaceholderText });
      }
      if (changed.has('TextYAlignment')) {
        const alignment = textAlignment(current.TextYAlignment);
        editor.style.alignContent = alignment;
        placeholder.style.alignContent = alignment;
      }
      if (changed.has('PlaceholderColor3') || changed.has('PlaceholderTransparency')) {
        placeholder.style.color = color3ToCss(
          current.PlaceholderColor3,
          current.PlaceholderTransparency,
        );
      }
      if (changed.has('Disabled')) {
        editor.contentEditable = String(!current.Disabled);
        editor.tabIndex = current.Disabled ? -1 : 0;
        editor.setAttribute('aria-disabled', String(current.Disabled));
        editor.style.cursor = current.Disabled ? 'not-allowed' : 'text';
      }
      if (changed.has('MultiLine')) {
        editor.setAttribute('aria-multiline', String(current.MultiLine));
      }
      if (changed.has('PlaceholderText')) {
        editor.setAttribute('aria-placeholder', current.PlaceholderText);
        placeholder.textContent = current.PlaceholderText;
      }
      if (changed.has('Text')) {
        placeholder.style.display = current.Text.length === 0 ? '' : 'none';
        if (!applyingEditorInput) editor.textContent = current.Text;
      }
    },
    textBoxEventMethods,
    validateTextBoxProperties,
  ) as TextBox;

  bindTextScaleResize(node, element, () => {
    const current = getNodeProperties(node);
    renderTextSize(editor, current);
    renderTextSize(placeholder, { ...current, Text: current.PlaceholderText });
  });

  const listenerController = new AbortController();
  const listenerOptions = { signal: listenerController.signal };
  editor.addEventListener(
    'input',
    (event) => {
      const current = getNodeProperties(node);
      const editorText = readEditableText(editor);
      const text = current.MultiLine ? editorText : removeLineBreaks(editorText);

      applyingEditorInput = true;
      try {
        applyPropertyPatch(node, { Text: text });
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

  addCleanup(node, () => listenerController.abort());
  return node;
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

function hasTextStyleChange(changed: ReadonlySet<PropertyKey>): boolean {
  return (
    changed.has('Text') ||
    changed.has('TextColor3') ||
    changed.has('TextTransparency') ||
    changed.has('TextSize') ||
    changed.has('TextScaled') ||
    changed.has('TextWrapped') ||
    changed.has('TextXAlignment') ||
    changed.has('TextYAlignment') ||
    changed.has('FontFamily') ||
    changed.has('FontWeight')
  );
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
