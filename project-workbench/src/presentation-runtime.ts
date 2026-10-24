import * as framekit from 'framekit';

import * as scriptContext from './script-context';

// This entry is bundled into a trusted, self-contained script, never executed in the editor.
const receive = (event: MessageEvent): void => {
  if (event.source !== window.parent || !event.ports[0]) {
    return;
  }

  window.removeEventListener('message', receive);
  const port = event.ports[0];
  const modules = event.data.modules as Record<string, string>;
  const cache = new Map<string, { exports: Record<string, unknown> }>();
  const report = (error: unknown): void =>
    port.postMessage({ error: String(error).slice(0, 2000) });

  let work = 0;
  window.setInterval(() => {
    work = 0;
  }, 16);
  const check = (): void => {
    if (++work > 100_000) {
      throw new Error('Script exceeded the preview work budget. Check for an infinite loop.');
    }
  };

  const load = (path: string): Record<string, unknown> => {
    if (path === '@framekit/budget') {
      return { check };
    }

    if (path === 'framekit') {
      return framekit;
    }
    if (path === '@framekit/script' || path === 'src/script-context.ts') {
      return {
        ...scriptContext,
        mountScript: (...args: Parameters<typeof scriptContext.mountScript>) => {
          args[5] = report;
          return scriptContext.mountScript(...args);
        },
      };
    }

    const known = cache.get(path);

    if (known) {
      return known.exports;
    }
    if (!Object.hasOwn(modules, path)) {
      throw new Error(
        `Unsupported import: ${path}. Preview supports framekit and project modules.`,
      );
    }

    const module = { exports: {} };
    cache.set(path, module);
    const require = (specifier: string): Record<string, unknown> => {
      if (!specifier.startsWith('.')) {
        return load(specifier);
      }

      const parts = path.split('/').slice(0, -1);

      for (const part of specifier.split('/')) {
        if (part === '..') {
          parts.pop();
        } else if (part !== '.') {
          parts.push(part);
        }
      }

      return load(`${parts.join('/').replace(/\.js$/, '')}.ts`);
    };

    new Function('require', 'module', 'exports', modules[path]!)(require, module, module.exports);
    return module.exports;
  };

  window.addEventListener('error', (event) => report(event.message));
  window.addEventListener('unhandledrejection', (event) => report(event.reason));
  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        port.postMessage({ exit: true });
      }
    },
    { capture: true },
  );

  try {
    const app = framekit.createScreenGui({ Name: 'Presented project' });
    const scene = load('src/scene.ts') as {
      createScene(parent: framekit.Instance, properties: Partial<framekit.FrameProperties>): void;
    };
    scene.createScene(app, { Size: framekit.udim2FromScale(1, 1) });
    app.mount('#project');
    port.postMessage({ ready: true });
  } catch (error) {
    report(error);
  }
};

window.addEventListener('message', receive);
window.parent.postMessage('framekit-presentation-ready', '*');
