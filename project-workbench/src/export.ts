import { orderedNodes, type SceneDocument } from './document';
import {
  definitionFor,
  formatField,
  nodeDefinitions,
  type Field,
  type PropertyValue,
} from './schema';

const reservedNames = new Set([
  'app',
  'canvas',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
  'eval',
  'arguments',
  'createScreenGui',
  'createSignalEmitter',
  'color3FromHex',
  'udim',
  'udim2',
  'udim2FromOffset',
  'udim2FromScale',
  'vector2',
  ...Object.keys(nodeDefinitions).map((type) => `create${type}`),
]);

// These values match the runtime factories. Workbench-specific defaults still export explicitly.
const runtimeDefaults: Readonly<Record<string, PropertyValue>> = {
  Rotation: 0,
  Visible: true,
  ZIndex: 1,
  LayoutOrder: 0,
  AutomaticSize: 'None',
  ClipsDescendants: false,
  AnchorPoint: { X: 0, Y: 0 },
  Enabled: true,
};

export const identifierFrom = (name: string, used: Set<string>): string => {
  const words = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  const candidate = words
    .map((word, index) => {
      const normalized = word.replace(/^[A-Z]+(?=[A-Z][a-z]|$)/, (prefix) => prefix.toLowerCase());
      return index
        ? normalized[0]!.toUpperCase() + normalized.slice(1)
        : normalized[0]!.toLowerCase() + normalized.slice(1);
    })
    .join('');
  const base =
    !candidate || /^\d/.test(candidate) || reservedNames.has(candidate)
      ? `node${candidate ? candidate[0]!.toUpperCase() + candidate.slice(1) : ''}`
      : candidate;
  let identifier = base;
  let suffix = 2;

  while (used.has(identifier)) {
    identifier = `${base}${suffix++}`;
  }

  used.add(identifier);
  return identifier;
};

/** Property constructors keep source short while retaining exact scale, offset, and color values. */
export const sourceValue = (field: Field, value: PropertyValue, imports: Set<string>): string => {
  const helper = (name: string, arguments_: string): string => {
    imports.add(name);
    return `${name}(${arguments_})`;
  };

  switch (field.kind) {
    case 'color':
      return helper('color3FromHex', JSON.stringify(formatField(field, value)));
    case 'udim2': {
      const dimensions = value as {
        X: { Scale: number; Offset: number };
        Y: { Scale: number; Offset: number };
      };

      if (dimensions.X.Scale === 0 && dimensions.Y.Scale === 0) {
        return helper('udim2FromOffset', `${dimensions.X.Offset}, ${dimensions.Y.Offset}`);
      }

      if (dimensions.X.Offset === 0 && dimensions.Y.Offset === 0) {
        return helper('udim2FromScale', `${dimensions.X.Scale}, ${dimensions.Y.Scale}`);
      }

      return helper('udim2', formatField(field, value));
    }
    case 'udim':
      return helper('udim', formatField(field, value));
    case 'vector2':
      return helper('vector2', formatField(field, value));
    default:
      return JSON.stringify(value);
  }
};

/** Names become safe, unique identifiers; caller text is always emitted as a quoted literal. */
export const exportTypeScript = (document: SceneDocument): string => {
  const nodes = orderedNodes(document).filter((node) => node.type !== 'Script');
  const imports = new Set(['createScreenGui', 'createFrame', 'udim2FromOffset', 'color3FromHex']);
  const used = new Set(reservedNames);
  const identifiers = new Map(
    nodes.map((node) => [node.id, identifierFrom(node.properties.Name, used)]),
  );
  const lines = [
    'const app = createScreenGui();',
    '',
    'const canvas = createFrame({',
    `  Name: ${JSON.stringify(document.name)},`,
    `  Size: udim2FromOffset(${document.width}, ${document.height}),`,
    `  BackgroundColor3: color3FromHex('#f3f6f3'),`,
    '});',
    'canvas.Parent = app;',
    '',
  ];

  for (const node of nodes) {
    const identifier = identifiers.get(node.id)!;
    const factory = `create${node.type}`;
    imports.add(factory);
    lines.push(`const ${identifier} = ${factory}({`);

    for (const [name, value] of Object.entries(node.properties)) {
      if (
        Object.hasOwn(runtimeDefaults, name) &&
        JSON.stringify(value) === JSON.stringify(runtimeDefaults[name])
      ) {
        continue;
      }

      lines.push(
        `  ${name}: ${sourceValue(definitionFor(node.type).fields[name]!, value, imports)},`,
      );
    }

    lines.push(
      '});',
      `${identifier}.Parent = ${node.parent === null ? 'canvas' : identifiers.get(node.parent)};`,
      '',
    );
  }

  lines.push(
    "app.mount('#app');",
    '',
    '// Call app.destroy() when the surrounding application is disposed.',
    '',
  );
  return [
    `import {\n${[...imports]
      .sort()
      .map((name) => `  ${name},`)
      .join('\n')}\n} from 'framekit';`,
    '',
    ...lines,
  ].join('\n');
};
