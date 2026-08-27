import { addCleanup, props, update } from '../runtime/node';
import type { GuiNode } from '../runtime/render';
import { emitNodeEvent } from '../runtime/signal';
import { color3, color3ToCss, type Color3 } from '../values/color3';
import { createFrameNode, defaultFrameProps, type FrameProps } from './frame';
import { plainTextString, renderRichText, richTextString } from './rich-text';
import { defaultTextStyleProps, renderTextStyle, type TextStyleProps } from './text-style';

export type TextBoxEvent = 'TextChanged';

export type TextBoxProps = FrameProps &
  TextStyleProps & {
    RichText: boolean;
    MultiLine: boolean;
    Disabled: boolean;
    PlaceholderText: string;
    PlaceholderColor3: Color3;
    PlaceholderTransparency: number;
  };

export type TextBoxNode = GuiNode<TextBoxProps> & {
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

  let updatingFromEditor = false;
  const node = createFrameNode(
    'TextBox',
    element,
    {
      ...defaultFrameProps(),
      ...defaultTextStyleProps(),
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
      editor.style.cursor = current.Disabled ? 'not-allowed' : 'text';
      placeholder.textContent = current.PlaceholderText;
      placeholder.style.display = current.Text.length === 0 ? '' : 'none';
      if (!updatingFromEditor) {
        if (current.RichText) renderRichText(editor, current.Text);
        else editor.textContent = current.Text;
      }
    },
  ) as TextBoxNode;

  const controller = new AbortController();
  const options = { signal: controller.signal };
  editor.addEventListener(
    'input',
    (event) => {
      const current = props(node);
      const text = current.RichText ? richTextString(editor) : plainTextString(editor);
      updatingFromEditor = true;
      try {
        update(node, { Text: current.MultiLine ? text : text.replaceAll('\n', '') });
      } finally {
        updatingFromEditor = false;
      }
      emitNodeEvent(node, 'TextChanged', props(node).Text, event);
    },
    options,
  );
  editor.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Enter' && !props(node).MultiLine) event.preventDefault();
    },
    options,
  );
  editor.addEventListener(
    'paste',
    (event) => {
      event.preventDefault();
      insertPlainText(editor, event.clipboardData?.getData('text/plain') ?? '');
    },
    options,
  );
  addCleanup(node, () => controller.abort());
  return node;
}

/** Returns the current Text value, including supported rich-text markup when enabled. */
export function textBoxText(node: TextBoxNode): string {
  return props(node).Text;
}

function textAlignment(alignment: TextBoxProps['TextYAlignment']): string {
  if (alignment === 'Center') return 'center';
  if (alignment === 'Bottom') return 'end';
  return 'start';
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
