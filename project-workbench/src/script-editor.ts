import {
  color3FromHex,
  createFrame,
  createTextArea,
  createTextLabel,
  createUICorner,
  createUIPadding,
  createUIStroke,
  observeSize,
  udim,
  udim2,
  udim2FromOffset,
  type Frame,
  type GuiElement,
  type TextArea,
} from 'framekit';

import type { CodeRequest, CodeResponse, CodeTheme } from './code-themes';
import { mono } from './ui';

/** Native editing owns selection, composition, and undo; the worker only decorates its buffer. */
export const createScriptEditor = (
  parent: GuiElement,
  report: (message: string) => void,
  onFormatting: (busy: boolean) => void,
): Readonly<{
  root: Frame;
  source: TextArea;
  open(text: string, theme: CodeTheme): void;
  close(): void;
  format(): void;
}> => {
  const root = createFrame({ Name: 'Script code editor', ClipsDescendants: true });
  root.Parent = parent;
  root.unsafeElement.dataset.scriptEditor = '';
  // Code colors follow the selected GitHub theme independently of the surrounding chrome.
  createUICorner({ CornerRadius: 8 }).Parent = root;
  createUIStroke({
    Color: color3FromHex('#8c959f'),
    Transparency: 0.7,
    Thickness: 1,
    BorderStrokePosition: 'Inner',
  }).Parent = root;

  const gutterClip = createFrame({
    Name: 'Script gutter',
    Size: udim2(0, 56, 1, -26),
    ClipsDescendants: true,
    BackgroundTransparency: 1,
  });
  gutterClip.Parent = root;
  gutterClip.unsafeElement.dataset.scriptGutter = '';
  gutterClip.unsafeElement.setAttribute('aria-hidden', 'true');
  const gutter = createTextLabel({
    Name: 'Script line numbers',
    TextTagName: 'pre',
    Position: udim2FromOffset(8, 12),
    Size: udim2FromOffset(36, 0),
    AutomaticSize: 'Y',
    FontFamily: mono,
    TextSize: 13,
    LineHeight: 22 / 13,
    TextXAlignment: 'Right',
    TextYAlignment: 'Top',
    BackgroundTransparency: 1,
  });
  gutter.Parent = gutterClip;

  const body = createFrame({
    Position: udim2FromOffset(56, 0),
    Size: udim2(1, -56, 1, -26),
    BackgroundTransparency: 1,
    ClipsDescendants: true,
  });
  body.Parent = root;
  const mirrorClip = createFrame({ BackgroundTransparency: 1, ClipsDescendants: true });
  mirrorClip.Parent = body;
  mirrorClip.unsafeElement.dataset.scriptMirror = '';
  mirrorClip.unsafeElement.setAttribute('aria-hidden', 'true');
  const mirror = createTextLabel({
    Name: 'Highlighted script',
    TextTagName: 'pre',
    Position: udim2FromOffset(12, 12),
    AutomaticSize: 'XY',
    FontFamily: mono,
    TextSize: 13,
    LineHeight: 22 / 13,
    TextXAlignment: 'Left',
    TextYAlignment: 'Top',
    BackgroundTransparency: 1,
  });
  mirror.Parent = mirrorClip;
  const source = createTextArea({
    Name: 'TypeScript source',
    AccessibleLabel: 'TypeScript source',
    FontFamily: mono,
    TextSize: 13,
    LineHeight: 22 / 13,
    TextWrapped: false,
    TextXAlignment: 'Left',
    TextYAlignment: 'Top',
    BackgroundTransparency: 1,
    Size: udim2(1, 0, 1, 0),
    ZIndex: 2,
  });
  createUIPadding({
    PaddingLeft: udim(0, 12),
    PaddingRight: udim(0, 12),
    PaddingTop: udim(0, 12),
    PaddingBottom: udim(0, 12),
  }).Parent = source;
  source.Parent = body;
  const element = source.unsafeElement;
  element.spellcheck = false;
  element.setAttribute('autocapitalize', 'off');
  element.setAttribute('autocomplete', 'off');
  element.setAttribute('autocorrect', 'off');
  element.setAttribute('aria-description', 'TypeScript editor. Format with Shift+Alt+F.');

  const cursor = createTextLabel({
    Position: udim2(0, 12, 1, -26),
    Size: udim2(1, -24, 0, 26),
    FontFamily: mono,
    TextSize: 11,
    TextXAlignment: 'Left',
    BackgroundTransparency: 1,
  });
  cursor.Parent = root;

  let worker: Worker | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let requestId = 0;
  let formatting: Readonly<{ id: number; before: string }> | undefined;

  const updateCursor = (): void => {
    const prefix = source.Text.slice(0, element.selectionStart);
    const line = prefix.split('\n').length;
    const column = prefix.length - prefix.lastIndexOf('\n');
    cursor.Text = `Ln ${line}, Col ${column}   ·   TypeScript   ·   2 spaces`;
  };
  const syncScroll = (): void => {
    mirrorClip.Size = udim2FromOffset(element.clientWidth, element.clientHeight);
    gutterClip.Size = udim2FromOffset(56, element.clientHeight);
    mirror.Position = udim2FromOffset(12 - element.scrollLeft, 12 - element.scrollTop);
    gutter.Position = udim2FromOffset(8, 12 - element.scrollTop);
  };
  const paintBuffer = (): void => {
    // Show new input immediately; stale highlighting must never cover characters being typed.
    mirror.RichText = false;
    mirror.Text = source.Text;
    gutter.Text = source.Text.split('\n')
      .map((_, index) => String(index + 1))
      .join('\n');
    updateCursor();
    syncScroll();
  };
  const close = (): void => {
    clearTimeout(timer);
    worker?.terminate();
    worker = undefined;
    formatting = undefined;

    if (!root.isDestroyed()) {
      delete root.unsafeElement.dataset.composing;
      onFormatting(false);
    }
  };
  const highlight = (): void => {
    worker?.postMessage({
      id: ++requestId,
      source: source.Text,
      operation: 'highlight',
    } satisfies CodeRequest);
  };
  const format = (): void => {
    if (!worker || formatting || root.unsafeElement.hasAttribute('data-composing')) {
      return;
    }

    clearTimeout(timer);
    formatting = { id: ++requestId, before: source.Text };
    onFormatting(true);
    worker.postMessage({ id: formatting.id, source: formatting.before } satisfies CodeRequest);
  };

  source.onTextChanged(() => {
    paintBuffer();
    clearTimeout(timer);
    timer = setTimeout(highlight, 120);
  });
  source.on('scroll', syncScroll);
  source.on('select', updateCursor);
  source.on('keyup', updateCursor);
  source.on('pointerup', updateCursor);
  source.on('compositionstart', () => {
    root.unsafeElement.dataset.composing = '';
  });
  source.on('compositionend', () => {
    delete root.unsafeElement.dataset.composing;
  });
  source.on('keydown', (event) => {
    if (event.shiftKey && event.altKey && event.code === 'KeyF' && !event.isComposing) {
      event.preventDefault();
      format();
    }
  });
  observeSize(root, syncScroll, source);
  root.onDestroy(close);

  return {
    root,
    source,
    close,
    format,
    open: (text, theme): void => {
      close();
      const light = theme === 'github-light';
      const foreground = light ? '#24292e' : '#e1e4e8';
      const muted = light ? '#8c959f' : '#6e7681';
      root.BackgroundColor3 = color3FromHex(light ? '#ffffff' : '#24292e');
      source.TextColor3 = color3FromHex(foreground);
      mirror.TextColor3 = source.TextColor3;
      gutter.TextColor3 = color3FromHex(muted);
      cursor.TextColor3 = gutter.TextColor3;
      root.unsafeElement.style.setProperty('--script-foreground', foreground);
      root.unsafeElement.style.setProperty('color-scheme', light ? 'light' : 'dark');
      source.Text = text;
      element.setSelectionRange(0, 0);
      element.scrollLeft = 0;
      element.scrollTop = 0;
      paintBuffer();

      try {
        const currentWorker = new Worker(new URL('./code-worker.ts', import.meta.url), {
          type: 'module',
        });
        worker = currentWorker;
        currentWorker.onmessage = (event: MessageEvent<CodeResponse>): void => {
          if (worker !== currentWorker) {
            return;
          }

          const response = event.data;

          if (response.id === formatting?.id) {
            const { before } = formatting;
            formatting = undefined;
            onFormatting(false);

            if ('error' in response) {
              report(`Could not format this TypeScript. ${response.error}`);
              return;
            }

            if (source.Text !== before) {
              report('Source changed while formatting. Format again to use the latest edits.');
              return;
            }

            const start = element.selectionStart;
            const end = element.selectionEnd;
            const top = element.scrollTop;
            const left = element.scrollLeft;
            source.Text = response.result.source;
            element.setSelectionRange(start, end);
            element.scrollTop = top;
            element.scrollLeft = left;
            paintBuffer();
            highlight();
            report('Formatted with 2-space indentation. Apply script to save.');
            return;
          }

          if ('result' in response && response.result.source === source.Text) {
            mirror.RichText = true;
            mirror.Text = response.result.palettes[theme].text;
            syncScroll();
          }
        };
        currentWorker.onerror = (): void => {
          if (worker === currentWorker) {
            close();
            report(
              'Code highlighting and formatting are unavailable. You can still edit and apply.',
            );
          }
        };
        highlight();
      } catch {
        close();
        report('Code highlighting and formatting are unavailable. You can still edit and apply.');
      }
    },
  };
};
