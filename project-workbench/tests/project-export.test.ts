import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { build } from 'vite';
import { expect, it } from 'vitest';

import { prepareCode } from '../src/code-format';
import { createEditor } from '../src/editor';
import { exportProject, exportSceneModules } from '../src/project-export';
import { defaultProperties, nodeDefinitions } from '../src/schema';
import { projectTemplates } from '../src/templates';
import { zipProject } from '../src/zip';

it('exports parents before children and treats authored names and text as literals', () => {
  const editor = createEditor();
  editor.edit('headline', 'Text', '"; alert("no"); //');
  const document = editor.state.get().document;
  const source = exportSceneModules({ ...document, nodes: [...document.nodes].reverse() })[0]!
    .source;
  expect(source).toContain('createUICorner');
  expect(source).toContain('welcomeCard.Parent = canvas;');
  expect(source).toContain(JSON.stringify('"; alert("no"); //'));
  expect(source.indexOf('const welcomeCard =')).toBeLessThan(source.indexOf('const headline ='));
});

it('exports a self-contained project whose ZIP extracts and whose code type-checks, builds, and runs nested prefab events', async () => {
  const document = projectTemplates.find((template) => template.id === 'counter')!.create();
  const files = await exportProject({
    ...document,
    prefabs: document.prefabs!.map((prefab) => ({
      ...prefab,
      nodes: prefab.nodes.map((node) =>
        node.id === 'count'
          ? { ...node, properties: { ...node.properties, Name: 'createSignalEmitter' } }
          : node,
      ),
    })),
    nodes: [
      ...document.nodes,
      {
        id: 'script',
        type: 'Script',
        parent: null,
        properties: {
          ...defaultProperties('Script'),
          Source: `import type { ScriptContext } from '@framekit/script';
export default (ctx: ScriptContext): void => {
  const input = ctx.node('input');
  const status = ctx.node('counter-status');
  if (input?.isA('TextInput') && status?.isA('TextLabel')) {
    ctx.listen(input.unsafeElement, 'script-ping', () => { status.Text = 'TypeScript script ran'; });
  }
};`,
        },
      },
      { id: 'input', type: 'TextInput', parent: null, properties: defaultProperties('TextInput') },
    ],
    bindings: [
      ...(document.bindings ?? []),
      {
        id: 'copy-input',
        source: 'input',
        event: 'TextChanged',
        action: { type: 'copyText', source: 'input', target: 'counter-status' },
      },
      {
        id: 'toggle-status',
        source: 'input',
        event: 'Submitted',
        action: { type: 'toggle', target: 'counter-status', property: 'Visible' },
      },
    ],
  });
  expect(files.map((file) => file.path)).toEqual(
    expect.arrayContaining([
      'index.html',
      'package.json',
      'src/main.ts',
      'src/scene.ts',
      'framekit/src/index.ts',
      'framekit/package.json',
    ]),
  );
  expect(files.filter((file) => file.path.startsWith('src/prefabs/'))).toHaveLength(2);
  const directory = await mkdtemp(join(tmpdir(), 'framekit-export-'));
  const root = resolve(process.cwd());

  try {
    const zip = join(directory, 'project.zip');
    await writeFile(zip, zipProject(files));
    execFileSync('unzip', ['-q', zip, '-d', directory]);
    expect(await readFile(join(directory, 'src/scene.ts'), 'utf8')).toContain(
      'createCounterPanelPrefab',
    );
    await mkdir(join(directory, 'node_modules'));
    await symlink(join(directory, 'framekit'), join(directory, 'node_modules/framekit'));
    await symlink(join(root, 'node_modules/vite'), join(directory, 'node_modules/vite'));
    const checked = spawnSync(
      process.execPath,
      [join(root, 'node_modules/typescript/bin/tsc'), '--noEmit', '-p', directory],
      { cwd: directory, encoding: 'utf8' },
    );
    expect(checked.status, checked.stdout + checked.stderr).toBe(0);
    execFileSync(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'build'], {
      cwd: directory,
      encoding: 'utf8',
    });
    expect(await readFile(join(directory, 'dist/index.html'), 'utf8')).toContain('assets/');

    const entry = join(directory, 'src/smoke.ts');
    await writeFile(
      entry,
      `import { createScreenGui } from 'framekit';
import { createScene } from './scene';
export const mount = () => { const app = createScreenGui(); createScene(app); app.mount('#export-root'); return app; };
`,
    );
    const built = await build({
      configFile: false,
      root: directory,
      logLevel: 'silent',
      build: {
        write: false,
        lib: { entry, name: 'ExportSmoke', formats: ['iife'] },
        minify: false,
      },
    });
    const output = Array.isArray(built) ? built[0]!.output : 'output' in built ? built.output : [];
    const chunk = output.find((entry) => entry.type === 'chunk');
    expect(chunk?.type).toBe('chunk');

    if (chunk?.type === 'chunk') {
      const host = window.document.createElement('div');
      host.id = 'export-root';
      window.document.body.append(host);
      const runtime = new Function(`${chunk.code}\nreturn ExportSmoke;`)() as {
        mount(): { destroy(): void };
      };
      const app = runtime.mount();
      const buttons = [...host.querySelectorAll('button')].filter((node) =>
        node.textContent?.includes('Add one'),
      );
      expect(buttons).toHaveLength(2);
      buttons[0]!.click();
      expect(host.textContent).toContain('The left prefab emitted CountChanged.');
      expect(host.textContent).toContain('1');
      buttons[1]!.click();
      expect(host.textContent).toContain('The right prefab emitted CountChanged.');
      const input = host.querySelector('input')!;
      input.value = 'Copied from the exported input.';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const status = [...host.querySelectorAll('div')].find(
        (element) => element.textContent === input.value,
      )!;
      expect(status).toBeDefined();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(status.style.display).toBe('none');
      input.dispatchEvent(new Event('script-ping'));
      expect(host.textContent).toContain('TypeScript script ran');
      app.destroy();
      expect(host.childElementCount).toBe(0);
      host.remove();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);

it('formats and highlights administrative files without changing their meaning', async () => {
  for (const [language, source] of [
    ['html', '<!doctype html><html><body><div id="app"></div></body></html>'],
    ['json', '{"private":true,"scripts":{"dev":"vite"}}'],
    ['css', 'body{margin:0;color:#123456}'],
  ] as const) {
    const prepared = await prepareCode(source, language);
    expect(prepared.source).toContain('\n');
    expect(prepared.palettes['github-dark'].text).toContain('<font');
  }
});

it('type-checks every template and supported node as exported TypeScript, including attached behavior modules', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'framekit-templates-'));
  const root = resolve(process.cwd());

  try {
    const baseline = await exportProject(projectTemplates[0].create());
    for (const file of baseline.filter((file) => file.path.startsWith('framekit/'))) {
      const target = join(directory, file.path);
      await mkdir(join(target, '..'), { recursive: true });
      await writeFile(target, file.source);
    }
    const editor = createEditor();

    for (const type of Object.keys(nodeDefinitions) as (keyof typeof nodeDefinitions)[]) {
      editor.select(null);
      editor.add('Frame');
      editor.add(type);
    }

    const documents = [
      ...projectTemplates.map((template) => template.create()),
      editor.state.get().project,
    ];

    for (const [index, document] of documents.entries()) {
      const files = await exportProject(document);
      for (const file of files.filter((file) => file.path.startsWith('src/'))) {
        const target = join(directory, `template-${index}`, file.path);
        await mkdir(join(target, '..'), { recursive: true });
        await writeFile(target, file.source);
      }
    }
    await mkdir(join(directory, 'node_modules'));
    await symlink(join(directory, 'framekit'), join(directory, 'node_modules/framekit'));
    await symlink(join(root, 'node_modules/vite'), join(directory, 'node_modules/vite'));
    await writeFile(
      join(directory, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2023',
          lib: ['ES2023', 'DOM'],
          module: 'ESNext',
          moduleResolution: 'Bundler',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          types: ['vite/client'],
          paths: { '@framekit/script': ['./template-0/src/script-context.ts'] },
        },
        include: ['template-*/src'],
      }),
    );
    const checked = spawnSync(
      process.execPath,
      [join(root, 'node_modules/typescript/bin/tsc'), '-p', directory],
      { cwd: directory, encoding: 'utf8' },
    );
    expect(checked.status, checked.stdout + checked.stderr).toBe(0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);
