import { guiEventKeys, textBoxEventMethods, type TextBoxEventMethods } from '../runtime/gui-events';
import { addCleanup, props, update } from '../runtime/node';
import type { GuiNode } from '../runtime/render';
import { emitNodeEvent } from '../runtime/signal';
import { assertBoolean, assertString } from '../runtime/validation';
import { color3, color3ToCss, type Color3 } from '../values/color3';
import { createDefaultFrameProps, createFrameBasedNode, type FrameProps } from './frame';
import { readPlainText, renderRichText, serializeRichText } from './rich-text';
import { createDefaultTextStyleProps, renderTextStyle, type TextStyleProps } from './text-style';

export type TextBoxProps = FrameProps &
  TextStyleProps & {
    RichText: boolean;
    MultiLine: boolean;
    Disabled: boolean;
    PlaceholderText: string;
    PlaceholderColor3: Color3;
    PlaceholderTransparency: number;
  };

export type TextBoxNode = GuiNode<TextBoxProps> &
  TextBoxEventMethods & {
    readonly element: HTMLDivElement;
  };

/** Creates an editable text node whose Text property stays synchronized with the DOM. */
export function createTextBox(initial: Partial<TextBoxProps> = {}): TextBoxNode {
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
  const node = createFrameBasedNode(
    'TextBox',
    element,
    {
      ...createDefaultFrameProps(),
      ...createDefaultTextStyleProps(),
      Name: 'TextBox',
      BackgroundColor3: color3(255, 255, 255),
      RichText: false,
      MultiLine: false,
      Disabled: false,
      PlaceholderText: '',
      PlaceholderColor3: color3(120, 120, 120),
      PlaceholderTransparency: 0,
    },
    initial,
    (current) => {
      assertBoolean(current.RichText, 'RichText');
      assertBoolean(current.MultiLine, 'MultiLine');
      assertBoolean(current.Disabled, 'Disabled');
      assertString(current.PlaceholderText, 'PlaceholderText');
      renderTextStyle(editor, current);
      renderTextStyle(placeholder, { ...current, Text: current.PlaceholderText });
      editor.style.alignContent = textAlignment(current.TextYAlignment);
      placeholder.style.alignContent = textAlignment(current.TextYAlignment);
      placeholder.style.color = color3ToCss(
        current.PlaceholderColor3,
        current.PlaceholderTransparency,
      );
      editor.contentEditable = String(!current.Disabled);
      editor.tabIndex = current.Disabled ? -1 : 0;
      editor.setAttribute('aria-disabled', String(current.Disabled));
      editor.setAttribute('aria-multiline', String(current.MultiLine));
      editor.setAttribute('aria-placeholder', current.PlaceholderText);
      editor.style.cursor = current.Disabled ? 'not-allowed' : 'text';
      placeholder.textContent = current.PlaceholderText;
      placeholder.style.display = current.Text.length === 0 ? '' : 'none';
      if (!applyingEditorInput) {
        if (current.RichText) renderRichText(editor, current.Text);
        else editor.textContent = current.Text;
      }
    },
    textBoxEventMethods,
  ) as TextBoxNode;

  const listenerController = new AbortController();
  const listenerOptions = { signal: listenerController.signal };
  editor.addEventListener(
    'input',
    (event) => {
      const current = props(node);
      const editorText = current.RichText ? serializeRichText(editor) : readPlainText(editor);
      const text = current.MultiLine ? editorText : removeLineBreaks(editorText, current.RichText);
      applyingEditorInput = true;
      try {
        update(node, { Text: text });
      } finally {
        applyingEditorInput = false;
      }
      if (text !== editorText) {
        if (current.RichText) renderRichText(editor, text);
        else editor.textContent = text;
      }
      emitNodeEvent(node, guiEventKeys.textChanged, props(node).Text, event);
    },
    listenerOptions,
  );
  editor.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Enter' && !props(node).MultiLine) event.preventDefault();
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

function textAlignment(alignment: TextBoxProps['TextYAlignment']): string {
  if (alignment === 'Center') return 'center';
  if (alignment === 'Bottom') return 'end';
  return 'start';
}

function removeLineBreaks(value: string, richText: boolean): string {
  const withoutTextBreaks = value.replaceAll(/\r\n?|\n/g, '');
  return richText ? withoutTextBreaks.replaceAll(/<br>/gi, '') : withoutTextBreaks;
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
