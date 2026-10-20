import { execFileSync, spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const repository = fileURLToPath(new URL('../', import.meta.url));

const consumer = mkdtempSync(join(tmpdir(), 'framekit-consumer-'));

const fixture = readFileSync(join(repository, 'src/__tests__/public-api.typecheck.ts'), 'utf8');

beforeAll(() => {
  execFileSync(
    'npm',
    [
      'pack',
      '--ignore-scripts',
      '--pack-destination',
      consumer,
      '--cache',
      join(consumer, 'npm-cache'),
    ],
    {
      cwd: repository,
      stdio: 'pipe',
    },
  );

  const packageDirectory = join(consumer, 'node_modules/framekit');
  mkdirSync(packageDirectory, { recursive: true });

  const archive = readdirSync(consumer).find((file) => file.endsWith('.tgz'));

  if (!archive) {
    throw new Error('npm pack did not produce an archive.');
  }

  execFileSync('tar', [
    '-xzf',
    join(consumer, archive),
    '--strip-components',
    '1',
    '-C',
    packageDirectory,
  ]);
  writeFileSync(join(consumer, 'contracts.mts'), fixture);
  writeFileSync(join(consumer, 'contracts.cts'), fixture);
  writeFileSync(
    join(consumer, 'invalid.mts'),
    fixture.replace(/^\s*\/\/ @ts-expect-error.*$/gm, ''),
  );
});

afterAll(() => rmSync(consumer, { recursive: true, force: true }));

describe('packed package consumers', () => {
  it.each(['module', 'commonjs'] as const)('loads named exports through %s', (format) => {
    const load =
      format === 'module'
        ? "const api = await import('framekit');"
        : "const api = require('framekit');";

    const output = execFileSync(
      process.execPath,
      [
        '--input-type',
        format,
        '-e',
        `${load}
      const value = api.createObservableValue(1);
      const doubled = api.createComputedValue([value], () => value.get() * 2);
      value.set(2);
      console.log(JSON.stringify({
        observeSize: typeof api.observeSize,
        setAccessibility: typeof api.setAccessibility,
        bindDraggable: typeof api.bindDraggable,
        bindResizable: typeof api.bindResizable,
        bindPopover: typeof api.bindPopover,
        bindTooltip: typeof api.bindTooltip,
        createSignalEmitter: typeof api.createSignalEmitter,
        createUserInputService: typeof api.createUserInputService,
        createComputedValue: typeof api.createComputedValue,
        installFrameKitStyles: typeof api.installFrameKitStyles,
        frame: typeof api.createFrame,
        flexItem: typeof api.createUIFlexItem,
        sizeConstraint: typeof api.createUISizeConstraint,
        sticky: typeof api.bindSticky,
        focusRing: typeof api.createUIFocusRing,
        canvasGroup: typeof api.createCanvasGroup,
        visibility: typeof api.bindVisibility,
        textSelection: typeof api.createUITextSelection,
        escapedText: api.escapeRichText('<b>&</b>'),
        spring: typeof api.spring,
        hover: typeof api.bindHoverScale,
        value: value.get(),
        doubled: doubled.get(),
      }));`,
      ],
      { cwd: consumer, encoding: 'utf8' },
    );

    expect(JSON.parse(output)).toEqual({
      observeSize: 'function',
      setAccessibility: 'function',
      bindDraggable: 'function',
      bindResizable: 'function',
      bindPopover: 'function',
      bindTooltip: 'function',
      createSignalEmitter: 'function',
      createUserInputService: 'function',
      createComputedValue: 'function',
      installFrameKitStyles: 'function',
      frame: 'function',
      flexItem: 'function',
      sizeConstraint: 'function',
      sticky: 'function',
      focusRing: 'function',
      canvasGroup: 'function',
      visibility: 'function',
      textSelection: 'function',
      escapedText: '&lt;b&gt;&amp;&lt;/b&gt;',
      spring: 'function',
      hover: 'function',
      value: 2,
      doubled: 4,
    });
  });

  it.each(['module', 'commonjs'] as const)(
    'shares the runtime with optional devtools through %s',
    (format) => {
      const load =
        format === 'module'
          ? "const api = await import('framekit'); const devtools = await import('framekit/devtools');"
          : "const api = require('framekit'); const devtools = require('framekit/devtools');";

      const environment = new URL('../node_modules/happy-dom/lib/index.js', import.meta.url).href;

      const output = execFileSync(
        process.execPath,
        [
          '--input-type',
          format,
          '-e',
          `
      (async () => {
        const { Window } = await import(${JSON.stringify(environment)});
        ${load}
        const frame = api.createFrame({ Name: 'Packaged instance', TagName: 'article' }, { ownerDocument: new Window().document });
        const snapshot = devtools.inspectInstance(frame);
        const inspector = devtools.createRuntimeInspector(frame);
        const isolatedDocument = inspector.gui.unsafeElement.ownerDocument === frame.unsafeElement.ownerDocument;
        inspector.gui.destroy();
        const document = frame.unsafeElement.ownerDocument;
        const input = api.createUserInputService(frame);
        let keyCount = 0;
        input.inputBegan.subscribe(() => { keyCount += 1; });
        document.dispatchEvent(new document.defaultView.KeyboardEvent('keydown', { key: 'u', code: 'KeyU' }));
        const packagedInput = keyCount === 1 && input.isKeyDown('KeyU') && frame.unsafeElement.tagName === 'ARTICLE';
        input.dispose();
        document.dispatchEvent(new document.defaultView.KeyboardEvent('keydown', { key: 'u', code: 'KeyU' }));
        const inputDisposed = keyCount === 1 && !input.isKeyDown('KeyU');
        const binding = devtools.bindRuntimeInspector(frame, { button: false, shortcut: { key: 'F8' } });
        const noLauncher = !document.querySelector('[aria-label="Debug"]');
        document.dispatchEvent(new document.defaultView.KeyboardEvent('keydown', { key: 'F8' }));
        const openedByShortcut = Boolean(document.querySelector('[data-fk-debug-panel]'));
        binding.dispose();
        const packagedShortcut = noLauncher && openedByShortcut && !document.querySelector('[data-fk-debug-panel]');
        console.log(JSON.stringify({ name: snapshot.properties.Name, className: snapshot.className, exportedByMain: ['inspectInstance', 'createRuntimeInspector', 'bindRuntimeInspector', 'toTreeString'].some((name) => name in api), isolatedDocument, packagedShortcut, packagedInput, inputDisposed, inspectorBinding: typeof devtools.bindRuntimeInspector, tree: devtools.toTreeString(frame), coreTreeMethod: 'toTreeString' in frame }));
        frame.destroy();
      })().catch((error) => { console.error(error); process.exitCode = 1; });
    `,
        ],
        { cwd: consumer, encoding: 'utf8' },
      );

      expect(JSON.parse(output)).toEqual({
        name: 'Packaged instance',
        className: 'Frame',
        exportedByMain: false,
        isolatedDocument: true,
        packagedShortcut: true,
        packagedInput: true,
        inputDisposed: true,
        inspectorBinding: 'function',
        tree: 'Packaged instance [Frame]',
        coreTreeMethod: false,
      });
    },
  );

  it.each([
    ['Bundler', 'ESNext', 'contracts.mts'],
    ['NodeNext', 'NodeNext', 'contracts.mts'],
    ['NodeNext', 'NodeNext', 'contracts.cts'],
  ])(
    'preserves positive and negative type contracts with %s (%s, %s)',
    (resolution, module, file) => {
      const compilation = compile(resolution, module, file);
      expect(compilation.stdout + compilation.stderr).toBe('');
      expect(compilation.status).toBe(0);
    },
  );

  it('rejects each invalid API call without expected-error directives', () => {
    const compilation = compile('NodeNext', 'NodeNext', 'invalid.mts');
    expect(compilation.status).toBe(2);
    expect(compilation.stdout.match(/error TS/g)).toHaveLength(
      fixture.match(/@ts-expect-error/g)?.length ?? 0,
    );
    expect(compilation.stdout).not.toMatch(/^node_modules\/framekit\/.*error TS/m);
  });
});

const compile = (resolution: string, module: string, file: string): SpawnSyncReturns<string> =>
  spawnSync(
    process.execPath,
    [
      join(repository, 'node_modules/typescript/bin/tsc'),
      '--ignoreConfig',
      '--noEmit',
      '--strict',
      '--skipLibCheck',
      'false',
      '--lib',
      'ES2022,DOM',
      '--moduleResolution',
      resolution,
      '--module',
      module,
      file,
    ],
    { cwd: consumer, encoding: 'utf8' },
  );
