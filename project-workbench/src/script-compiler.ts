import type { ProjectFile } from './project-export';

/** Transpilation stays off the editor's main thread; each presentation owns its worker. */
export const compileScripts = (
  files: readonly ProjectFile[],
  signal: AbortSignal,
): Promise<Readonly<Record<string, string>>> =>
  new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./script-worker.ts', import.meta.url), { type: 'module' });
    const dispose = (): void => {
      worker.terminate();
      signal.removeEventListener('abort', abort);
    };
    const abort = (): void => {
      dispose();
      reject(new DOMException('Presentation closed.', 'AbortError'));
    };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    worker.onmessage = (
      event: MessageEvent<{ modules?: Record<string, string>; error?: string }>,
    ) => {
      dispose();
      if (event.data.modules) {
        resolve(event.data.modules);
      } else {
        reject(new Error(event.data.error ?? 'Could not compile scripts.'));
      }
    };
    worker.onerror = (event) => {
      dispose();
      reject(new Error(event.message));
    };
    worker.postMessage(files.filter((file) => file.language === 'typescript'));
  });
