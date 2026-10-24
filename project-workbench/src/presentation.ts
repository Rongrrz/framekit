import {
  bindDialog,
  createFrame,
  setAccessibility,
  udim2,
  udim2FromOffset,
  type GuiElement,
  type ScreenGui,
} from 'framekit';

import type { SceneDocument } from './document';
import { exportSceneModules } from './project-export';
import { compileScripts } from './script-compiler';
import { button, colors, label, panel } from './ui';

/** Owns the complete presentation realm. User modules never run in the editor document. */
export const createPresentation = (
  app: ScreenGui,
  report: (message: string) => void,
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
  exit.Position = udim2(1, -126, 0, 6);
  const host = panel('Isolated project', dialog);
  host.Position = udim2FromOffset(0, 44);
  host.Size = udim2(1, 0, 1, -44);
  host.unsafeElement.dataset.presentationHost = '';
  let session: AbortController | undefined;
  let frame: HTMLIFrameElement | undefined;
  let port: MessagePort | undefined;
  const stop = (): void => {
    session?.abort();
    session = undefined;
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
      title.Text = 'Preparing presentation…';
      modal.open(opener);
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
                } else if ('ready' in message.data) {
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
