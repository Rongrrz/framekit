import {
  bindDialog,
  createFrame,
  createScrollingFrame,
  createUIScale,
  observeSize,
  watchOwnedValue,
  setAccessibility,
  udim2,
  udim2FromOffset,
  vector2,
  type ObservableValue,
  type GuiElement,
  type ScreenGui,
} from 'framekit';

import { previewResolution, resolutionLabel, type CanvasPreferences } from './canvas-preferences';
import { themeChromeNode } from './chrome-theme';
import type { SceneDocument } from './document';
import { createDropdown } from './dropdown';
import { setIcon } from './icons/ai-decorations';
import { exportSceneModules } from './project-export';
import { createResolutionControls } from './resolution-controls';
import { compileScripts } from './script-compiler';
import { button, colors, label, panel } from './ui';

/** Owns the complete presentation realm. User modules never run in the editor document. */
export const createPresentation = (
  app: ScreenGui,
  preferences: ObservableValue<CanvasPreferences>,
  report: (message: string) => void,
  custom: () => void,
): Readonly<{
  open(document: SceneDocument, opener?: GuiElement): void;
  close(): void;
}> => {
  const dialog = createFrame({
    TagName: 'dialog',
    Name: 'Presentation',
    Size: udim2(1, 0, 1, 0),
    BackgroundColor3: colors.canvas,
  });
  dialog.Parent = app;
  dialog.unsafeElement.dataset.presentation = '';
  setAccessibility(dialog, { label: 'Presentation' });
  const bar = panel('Presentation controls', dialog);
  bar.Size = udim2(1, 0, 0, 44);
  const title = label(bar, 'Preparing presentation…', 30, 12, colors.muted);
  title.Position = udim2FromOffset(16, 7);
  title.Size = udim2(1, -160, 0, 30);
  const exit = button(bar, 'Exit · Esc', () => modal.close(), 110);
  exit.AccessibleLabel = 'Exit presentation';
  setIcon(exit, 'close');
  exit.Position = udim2(1, -126, 0, 6);
  title.TextSize = 13;
  const dimensions = label(bar, '', 20, 11, colors.muted);
  dimensions.Position = udim2FromOffset(16, 32);
  dimensions.Size = udim2(1, -32, 0, 20);
  dimensions.unsafeElement.dataset.presentationResolution = '';
  const viewport = createScrollingFrame({
    Name: 'Presentation stage',
    ScrollingDirection: 'XY',
    ScrollBarThickness: 8,
    ScrollBarImageColor3: colors.faint,
    BackgroundTransparency: 1,
  });
  viewport.Parent = dialog;
  themeChromeNode(viewport);
  setAccessibility(viewport, { role: 'region', label: 'Presentation viewport', focusable: true });
  const world = panel('Presentation bounds', viewport, colors.canvas);
  const host = panel('Isolated project', world);
  const scale = createUIScale();
  scale.Parent = host;
  host.unsafeElement.dataset.presentationHost = '';
  let activeDocument: SceneDocument | undefined;
  let sizing: 'fit' | 'actual' = 'fit';
  const devices = createResolutionControls(bar, {
    preferences,
    document: () => activeDocument ?? { width: 960, height: 640 },
    label: 'Presentation resolution',
    orientationLabel: 'Presentation orientation',
    menuParent: dialog,
    custom,
  });
  const zoom = createDropdown(bar, {
    label: 'Presentation scale',
    width: 152,
    menuParent: dialog,
    choices: [
      { value: 'fit', label: 'Fit to window' },
      { value: 'actual', label: 'Actual size · 100%' },
    ] as const,
    value: () => sizing,
    change: (value) => {
      sizing = value;
      layout();
    },
  });
  const layout = (): void => {
    if (!activeDocument) {
      return;
    }

    const compact = app.AbsoluteSize.X < 700;
    const height = compact ? 144 : 102;
    bar.Size = udim2(1, 0, 0, height);
    viewport.Position = udim2FromOffset(0, height);
    viewport.Size = udim2(1, 0, 1, -height);
    devices.resolution.Position = udim2FromOffset(16, 58);
    devices.resolution.Size = compact ? udim2(1, -32, 0, 32) : udim2FromOffset(330, 32);
    devices.orientation.Position = compact ? udim2FromOffset(16, 100) : udim2FromOffset(354, 58);
    devices.orientation.Size = compact ? udim2(0.5, -20, 0, 32) : udim2FromOffset(130, 32);
    zoom.control.Position = compact ? udim2(0.5, 4, 0, 100) : udim2FromOffset(492, 58);
    zoom.control.Size = compact ? udim2(0.5, -20, 0, 32) : udim2FromOffset(152, 32);

    const resolution = previewResolution(activeDocument, preferences.get());
    const width = viewport.unsafeElement.clientWidth;
    const availableHeight = viewport.unsafeElement.clientHeight;
    const factor =
      sizing === 'actual'
        ? 1
        : Math.max(
            0.01,
            Math.min(
              1,
              (width - 32) / resolution.width,
              (availableHeight - 32) / resolution.height,
            ),
          );

    const renderedWidth = resolution.width * factor;
    const renderedHeight = resolution.height * factor;
    const resetView =
      scale.Scale !== factor ||
      host.Size.X.Offset !== resolution.width ||
      host.Size.Y.Offset !== resolution.height;
    world.Position = udim2FromOffset(
      Math.max(16, (width - renderedWidth) / 2),
      Math.max(16, (availableHeight - renderedHeight) / 2),
    );
    world.Size = udim2FromOffset(renderedWidth, renderedHeight);
    host.Size = udim2FromOffset(resolution.width, resolution.height);
    host.Position = udim2FromOffset(
      (renderedWidth - resolution.width) / 2,
      (renderedHeight - resolution.height) / 2,
    );
    scale.Scale = factor;
    viewport.CanvasSize = udim2FromOffset(
      Math.max(width, renderedWidth + 32),
      Math.max(availableHeight, renderedHeight + 32),
    );

    // A new resolution or zoom starts at the project origin, rather than an old cropped view.
    if (resetView) {
      viewport.CanvasPosition = vector2(0, 0);
    }

    dimensions.Text = `${resolutionLabel(resolution)} · ${Math.round(factor * 100)}% view`;
    devices.refresh();
  };
  watchOwnedValue(dialog, preferences, layout);
  dialog.onDestroy(observeSize(dialog, layout, app));

  let session: AbortController | undefined;
  let frame: HTMLIFrameElement | undefined;
  let port: MessagePort | undefined;
  const stop = (): void => {
    session?.abort();
    session = undefined;
    activeDocument = undefined;
    port?.close();
    port = undefined;
    frame?.remove();
    frame = undefined;
  };
  const modal = bindDialog(dialog, { initialFocus: exit });
  dialog.on('close', stop);
  dialog.onDestroy(stop);

  return {
    close: () => {
      stop();
      modal.close();
    },
    open: (document, opener): void => {
      stop();
      const current = new AbortController();
      session = current;
      activeDocument = document;
      sizing = 'fit';
      zoom.refresh();
      title.Text = 'Preparing presentation…';
      modal.open(opener);
      layout();
      viewport.CanvasPosition = vector2(0, 0);
      void Promise.all([
        compileScripts(exportSceneModules(document), current.signal),
        import('virtual:presentation-runtime'),
      ])
        .then(([modules, runtime]) => {
          if (current.signal.aborted) {
            return;
          }

          const iframe = window.document.createElement('iframe');
          iframe.title = 'Presented project';
          iframe.setAttribute('sandbox', 'allow-scripts');
          iframe.setAttribute('referrerpolicy', 'no-referrer');
          iframe.setAttribute(
            'allow',
            "camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'",
          );

          const nonce = crypto.randomUUID().replaceAll('-', '');
          const origins = document.networkOrigins?.join(' ') || "'none'";
          const policy = `default-src 'none'; script-src 'nonce-${nonce}' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: blob: ${origins}; connect-src ${origins}; font-src data:; worker-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`;

          // Only the trusted bootstrap enters HTML. Authored code travels as structured message data.
          iframe.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><style>html,body,#project{width:100%;height:100%;margin:0;overflow:hidden}</style></head><body><div id="project"></div><script nonce="${nonce}">${runtime.default.replaceAll('</script', '<\\/script')}</script></body></html>`;
          frame = iframe;
          let connected = false;
          window.addEventListener(
            'message',
            (event) => {
              if (
                connected ||
                event.source !== iframe.contentWindow ||
                event.data !== 'framekit-presentation-ready'
              ) {
                return;
              }

              connected = true;
              const channel = new MessageChannel();
              port = channel.port1;
              let errors = 0;
              port.onmessage = (message: MessageEvent<unknown>) => {
                if (current.signal.aborted || typeof message.data !== 'object' || !message.data) {
                  return;
                }
                if ('exit' in message.data && message.data.exit === true) {
                  modal.close();
                } else if (
                  'error' in message.data &&
                  typeof message.data.error === 'string' &&
                  errors++ < 20
                ) {
                  title.Text = message.data.error.slice(0, 180);
                  report(message.data.error.slice(0, 2000));
                } else if ('ready' in message.data && errors === 0) {
                  title.Text = `${document.name} · Presentation`;
                }
              };

              iframe.contentWindow?.postMessage({ modules }, '*', [channel.port2]);
            },
            { signal: current.signal },
          );

          // The dedicated host has one native integration child, owned by this session.
          host.unsafeElement.append(iframe);
        })
        .catch((error: unknown) => {
          if (!current.signal.aborted) {
            title.Text = error instanceof Error ? error.message : String(error);
            report(title.Text);
          }
        });
    },
  };
};
