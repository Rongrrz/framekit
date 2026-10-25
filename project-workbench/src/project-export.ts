import {
  orderedNodes,
  validateHierarchy,
  type Interaction,
  type PrefabDefinition,
  type SceneDocument,
} from './document';
import { definitionFor } from './schema';
import scriptContextSource from './script-context.ts?raw';
import { identifierFrom, sourceValue } from './typescript-source';

/** Every entry is a real project file; project documents themselves are not exported. */
export type ProjectFile = Readonly<{
  path: string;
  source: string;
  language: 'typescript' | 'html' | 'json' | 'css' | 'text';
}>;

type PrefabModule = Readonly<{ path: string; factory: string; definition: PrefabDefinition }>;

const serializeScope = (
  document: SceneDocument,
  scope: Pick<SceneDocument, 'name' | 'width' | 'height' | 'nodes' | 'events' | 'bindings'>,
  modules: ReadonlyMap<string, PrefabModule>,
  module?: PrefabModule,
): string => {
  const imports = new Set<string>(['type Instance']);
  const used = new Set([
    'parent',
    'properties',
    'canvas',
    'root',
    'nodes',
    'events',
    'mountScript',
    ...[...modules.values()].map((entry) => entry.factory),
  ]);
  const names = new Map(
    scope.nodes.map((node) => [node.id, identifierFrom(node.properties.Name, used)]),
  );
  const prefabImports = new Map<string, string>();
  const root = scope.nodes.find((node) => node.parent === null)!;
  const rootName = module ? names.get(root.id)! : 'canvas';
  const outputNames = new Map(
    (scope.events ?? []).map((event) => [event, identifierFrom(`output ${event}`, used)]),
  );
  const lines: string[] = [];
  const scripts = scope.nodes.filter(
    (node) => node.type === 'Script' && node.properties.Enabled !== false,
  );
  const scriptImports = scripts.map((node, index) => {
    const name = identifierFrom(`attached script ${index}`, used);
    return {
      node,
      name,
      path: `${module ? '../' : './'}scripts/${(module ? module.path + '-' : 'scene-') + scriptFile(scope, node.id)}`,
    };
  });
  const rootType = module ? root.type : 'Frame';
  imports.add(`type ${rootType}Properties`);
  const factory = module?.factory ?? 'createScene';
  lines.push(
    `export const ${factory} = (parent: Instance, properties: Partial<${rootType}Properties> = {}) => {`,
  );

  for (const output of outputNames.values()) {
    imports.add('createSignalEmitter');
    lines.push(`  const ${output} = createSignalEmitter();`);
  }

  if (!module) {
    imports.add('createFrame');
    imports.add('udim2FromOffset');
    imports.add('color3FromHex');
    lines.push(
      '  const canvas = createFrame({',
      `    Name: ${JSON.stringify(document.name)},`,
      `    Size: udim2FromOffset(${document.width}, ${document.height}),`,
      "    BackgroundColor3: color3FromHex('#f3f6f3'),",
      '    ...properties,',
      '  });',
      '  canvas.Parent = parent;',
      '',
    );
  }

  for (const node of orderedNodes({ ...document, nodes: scope.nodes })) {
    if (node.type === 'Script') {
      continue;
    }
    const name = names.get(node.id)!;
    const owner =
      node.parent === null
        ? module
          ? 'parent'
          : 'canvas'
        : names.get(node.parent)! +
          (scope.nodes.find((entry) => entry.id === node.parent)?.prefabId ? '.root' : '');
    const properties = Object.entries(node.properties).map(
      ([key, value]) =>
        `    ${key}: ${sourceValue(definitionFor(node.type).fields[key]!, value, imports)},`,
    );

    if (node.prefabId) {
      const imported = modules.get(node.prefabId)!;
      prefabImports.set(imported.factory, `${module ? './' : './prefabs/'}${imported.path}`);
      lines.push(`  const ${name} = ${imported.factory}(${owner}, {`, ...properties, '  });', '');
    } else {
      imports.add(`create${node.type}`);
      lines.push(
        `  const ${name} = create${node.type}({`,
        ...properties,
        ...(module && node.id === root.id ? ['    ...properties,'] : []),
        '  });',
        `  ${name}.Parent = ${owner};`,
        '',
      );
    }
  }

  for (const output of outputNames.values()) {
    lines.push(`  ${rootName}.onDestroy(() => ${output}.clear());`);
  }

  const reference = (id: string): string =>
    names.get(id)! + (scope.nodes.find((node) => node.id === id)?.prefabId ? '.root' : '');
  const actionSource = (binding: Interaction): string => {
    const action = binding.action;

    if (action.type === 'emit') {
      return `${outputNames.get(action.event)}.emit();`;
    }

    const target = reference(action.target);

    if (action.type === 'set') {
      const node = scope.nodes.find((node) => node.id === action.target)!;
      return `${target}[${JSON.stringify(action.property)}] = ${sourceValue(definitionFor(node.type).fields[action.property]!, action.value, imports)};`;
    }

    if (action.type === 'toggle') {
      return `${target}.${action.property} = !${target}.${action.property};`;
    }

    if (action.type === 'increment') {
      return `${target}.Text = String((Number(${target}.Text) || 0) + ${action.amount});`;
    }

    return `${target}.Text = ${reference(action.source)}.Text;`;
  };

  for (const binding of scope.bindings ?? []) {
    const node = scope.nodes.find((node) => node.id === binding.source)!;
    const name = reference(node.id);
    const body = actionSource(binding);
    const custom =
      node.prefabId && modules.get(node.prefabId)?.definition.events?.includes(binding.event);

    if (custom) {
      lines.push(
        `  ${rootName}.onDestroy(${names.get(node.id)}.events[${JSON.stringify(binding.event)}].subscribe(() => {`,
        `    ${body}`,
        '  }));',
        '',
      );
    } else if (binding.event === 'Activated') {
      lines.push(`  ${name}.onClick(() => {`, `    ${body}`, '  });', '');
    } else if (binding.event === 'TextChanged') {
      lines.push(`  ${name}.on('input', () => {`, `    ${body}`, '  });', '');
    } else {
      lines.push(
        `  ${name}.on('keydown', (event) => {`,
        "    if (event.key === 'Enter' && !event.isComposing) {",
        `      ${body}`,
        '    }',
        '  });',
        '',
      );
    }
  }

  if (scripts.length) {
    lines.push(
      '  const scriptNodes = new Map<string, Instance>([',
      ...scope.nodes
        .filter((node) => node.type !== 'Script')
        .map((node) => `    [${JSON.stringify(node.id)}, ${reference(node.id)}],`),
      '  ]);',
      '',
    );
    for (const script of scriptImports) {
      lines.push(
        `  mountScript(${script.name}, ${script.node.parent ? reference(script.node.parent) : rootName}, ${rootName}, scriptNodes, ${JSON.stringify(document.networkOrigins ?? [])});`,
        '',
      );
    }
  }

  lines.push(
    '  return {',
    `    root: ${rootName},`,
    '    events: {',
    ...[...outputNames].map(
      ([event, name]) => `      ${JSON.stringify(event)}: { subscribe: ${name}.subscribe },`,
    ),
    '    },',
    '    nodes: {',
    ...scope.nodes
      .filter((node) => node.type !== 'Script')
      .map((node) => `      [${JSON.stringify(node.id)}]: ${reference(node.id)},`),
    '    },',
    `    destroy: () => ${rootName}.destroy(),`,
    '  };',
    '};',
    '',
  );
  return [
    `import { ${[...imports].sort().join(', ')} } from 'framekit';`,
    ...(scripts.length
      ? [`import { mountScript } from '${module ? '../' : './'}script-context';`]
      : []),
    ...scriptImports.map((script) => `import ${script.name} from ${JSON.stringify(script.path)};`),
    ...[...prefabImports].map(
      ([factory, path]) => `import { ${factory} } from ${JSON.stringify(path)};`,
    ),
    '',
    ...lines,
  ].join('\n');
};

const scriptFile = (scope: Pick<SceneDocument, 'nodes'>, id: string): string =>
  `script-${scope.nodes.findIndex((node) => node.id === id)}-${identifierFrom(id, new Set())}`;

/** Scene modules are also the executable input for the isolated presentation. */
export const exportSceneModules = (document: SceneDocument): readonly ProjectFile[] => {
  validateHierarchy(document);
  const used = new Set<string>(['createScene']);
  const modules = new Map(
    (document.prefabs ?? []).map((definition) => {
      const factory = identifierFrom(`create ${definition.name} prefab`, used);
      const path = factory.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      return [definition.id, { definition, factory, path }] as const;
    }),
  );
  const scopes = [document, ...(document.prefabs ?? [])];
  return [
    {
      path: 'src/scene.ts',
      language: 'typescript',
      source: serializeScope(document, document, modules),
    },
    ...[...modules.values()].map((module): ProjectFile => ({
      path: `src/prefabs/${module.path}.ts`,
      language: 'typescript',
      source: serializeScope(document, module.definition, modules, module),
    })),
    { path: 'src/script-context.ts', language: 'typescript', source: scriptContextSource },
    ...scopes.flatMap((scope, scopeIndex) =>
      scope.nodes
        .filter((node) => node.type === 'Script')
        .map((node): ProjectFile => ({
          path: `src/scripts/${scopeIndex === 0 ? 'scene-' : `${modules.get((scope as PrefabDefinition).id)!.path}-`}${scriptFile(scope, node.id)}.ts`,
          language: 'typescript',
          source: String(node.properties.Source),
        })),
    ),
  ];
};

/** The generated app includes the local FrameKit source package, so it does not depend on publication. */
export const exportProject = async (document: SceneDocument): Promise<readonly ProjectFile[]> => {
  const files: ProjectFile[] = [
    ...exportSceneModules(document),
    {
      path: 'src/main.ts',
      language: 'typescript',
      source: `import { createScreenGui, udim2FromScale } from 'framekit';
import { createScene } from './scene';
import './style.css';

const app = createScreenGui();
createScene(app, { Size: udim2FromScale(1, 1) });
app.mount('#app');

if (import.meta.hot) {
  import.meta.hot.dispose(() => app.destroy());
}
`,
    },
    {
      path: 'src/style.css',
      language: 'css',
      source:
        'html, body, #app { width: 100%; height: 100%; margin: 0; }\nbody { background: #111216; font-family: system-ui, sans-serif; }\n',
    },
    {
      path: 'index.html',
      language: 'html',
      source: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${document.name.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
    },
    {
      path: 'package.json',
      language: 'json',
      source: `${JSON.stringify(
        {
          name: 'framekit-project',
          version: '1.0.0',
          private: true,
          type: 'module',
          scripts: {
            dev: 'vite --host 127.0.0.1',
            build: 'tsc --noEmit && vite build',
            preview: 'vite preview --host 127.0.0.1',
          },
          dependencies: { framekit: 'file:./framekit' },
          devDependencies: { vite: '^8.3.4', typescript: '~6.0.3' },
        },
        null,
        2,
      )}\n`,
    },
    {
      path: 'tsconfig.json',
      language: 'json',
      source: `${JSON.stringify(
        {
          compilerOptions: {
            target: 'ES2023',
            lib: ['ES2023', 'DOM', 'DOM.Iterable'],
            module: 'ESNext',
            moduleResolution: 'Bundler',
            strict: true,
            skipLibCheck: true,
            noEmit: true,
            types: ['vite/client'],
            paths: { '@framekit/script': ['./src/script-context.ts'] },
          },
          include: ['src'],
        },
        null,
        2,
      )}\n`,
    },
    { path: '.gitignore', language: 'text', source: 'node_modules/\ndist/\n' },
    {
      path: 'README.md',
      language: 'text',
      source: `# ${document.name.replaceAll('\n', ' ')}

A FrameKit interface with reusable prefabs and event connections.

## Run

\`\`\`sh
npm install
npm run dev
\`\`\`

Build with \`npm run build\`. The included \`framekit/\` directory is a local source dependency.
Keep it next to package.json; no published FrameKit package is required.

The app canvas fills the browser viewport. Scale-based properties respond to its dimensions,
just as they do in Workbench device previews. Edit the scene in src/scene.ts. Prefabs live in src/prefabs and expose a root, named nodes,
and typed custom events. Each placed prefab has independent objects and event subscriptions.
Custom output signals expose subscribe(); call the component's destroy() to release its resources.
`,
    },
  ];
  const { runtimeFiles } = await import('./runtime-files');
  return [...files, ...runtimeFiles];
};
