import { color3FromHex, udim2FromOffset } from 'framekit';

import { parseBindings, validateBindings } from './interactions';
import {
  defaultProperties,
  definitionFor,
  isNodeType,
  validateField,
  type NodeType,
  type PropertyValue,
} from './schema';

/** Device overrides inherit shared properties and can replace layout, visibility, content, or styling. */
export type LayoutBreakpoint = 'phone' | 'tablet' | 'desktop';
export type ResponsiveProperties = Readonly<
  Partial<Record<LayoutBreakpoint, Readonly<Record<string, PropertyValue>>>>
>;

/** Flat storage preserves sibling order while parent IDs describe ownership. */
export type SceneNode = Readonly<{
  id: string;
  type: NodeType;
  prefabId?: string;
  responsive?: ResponsiveProperties;
  parent: string | null;
  properties: Readonly<Record<string, PropertyValue> & { Name: string }>;
}>;

/** Events are explicit, portable behaviors shared by Preview and generated source. */
export type SceneAction = Readonly<
  | { type: 'emit'; event: string }
  | { type: 'set'; target: string; property: string; value: PropertyValue }
  | { type: 'toggle'; target: string; property: 'Visible' | 'Disabled' }
  | { type: 'increment'; target: string; amount: number }
  | { type: 'copyText'; source: string; target: string }
>;

export type Interaction = Readonly<{
  id: string;
  source: string;
  event: string;
  action: SceneAction;
}>;

/** A prefab has one owned root and may reference other prefab definitions by ID. */
export type PrefabDefinition = Readonly<{
  id: string;
  name: string;
  width: number;
  height: number;
  nodes: readonly SceneNode[];
  events?: readonly string[];
  bindings?: readonly Interaction[];
}>;

/** This is an application document, not a serialization of runtime handles or callbacks. */
export type SceneDocument = Readonly<{
  version: 1;
  name: string;
  width: number;
  height: number;
  nodes: readonly SceneNode[];
  prefabs?: readonly PrefabDefinition[];
  events?: readonly string[];
  bindings?: readonly Interaction[];
  networkOrigins?: readonly string[];
}>;

const object = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Expected a document object.');
  }

  return value as Record<string, unknown>;
};

/** Parent choices omit the node itself and its descendants before the editor renders them. */
export const descendantIds = (document: SceneDocument, id: string): ReadonlySet<string> => {
  const ids = new Set([id]);

  for (let previous = 0; previous !== ids.size;) {
    previous = ids.size;

    for (const node of document.nodes) {
      if (node.parent !== null && ids.has(node.parent)) {
        ids.add(node.id);
      }
    }
  }

  return ids;
};

/** Walk ownership rather than assuming that imported parents precede their children. */
export const orderedNodes = (document: SceneDocument): readonly SceneNode[] => {
  const children = new Map<string | null, SceneNode[]>();

  for (const node of document.nodes) {
    const siblings = children.get(node.parent) ?? [];
    siblings.push(node);
    children.set(node.parent, siblings);
  }

  const ordered: SceneNode[] = [];
  const visit = (parent: string | null): void => {
    for (const node of children.get(parent) ?? []) {
      ordered.push(node);
      visit(node.id);
    }
  };

  visit(null);
  return ordered;
};

/** Imports are validated completely before the current document or preview changes. */
export const parseDocument = (input: string): SceneDocument => {
  if (input.length > 5_000_000) {
    throw new TypeError('Documents must be smaller than 5 MB.');
  }

  const value = object(JSON.parse(input));
  const document = parseScope(value, false);
  const prefabs = value.prefabs === undefined ? undefined : parsePrefabDefinitions(value.prefabs);
  const result = {
    ...document,
    ...(prefabs ? { prefabs } : {}),
    ...(value.networkOrigins === undefined
      ? {}
      : { networkOrigins: parseNetworkOrigins(value.networkOrigins) }),
  };
  validateHierarchy(result);
  return result;
};

const parseScope = (value: Record<string, unknown>, prefab: boolean): SceneDocument => {
  if (
    (!prefab && value.version !== 1) ||
    typeof value.name !== 'string' ||
    value.name.length > 200 ||
    !Array.isArray(value.nodes) ||
    value.nodes.length > 500
  ) {
    throw new TypeError('Expected a version 1 Workbench document with at most 500 nodes.');
  }

  for (const dimension of [value.width, value.height]) {
    if (
      typeof dimension !== 'number' ||
      !Number.isFinite(dimension) ||
      dimension < (prefab ? 4 : 240) ||
      dimension > 4096
    ) {
      throw new TypeError(
        `Artboard dimensions must be between ${prefab ? 4 : 240} and 4096 pixels.`,
      );
    }
  }

  const nodes = value.nodes.map((entry): SceneNode => {
    const node = object(entry);

    if (
      typeof node.id !== 'string' ||
      !node.id ||
      node.id.length > 100 ||
      !isNodeType(node.type) ||
      (node.prefabId !== undefined && (typeof node.prefabId !== 'string' || !node.prefabId)) ||
      (node.parent !== null && typeof node.parent !== 'string')
    ) {
      throw new TypeError('Each node needs an ID, supported type, and parent ID or null.');
    }

    const fields = definitionFor(node.type).fields;
    const properties: Record<string, PropertyValue> & { Name: string } = node.prefabId
      ? { Name: node.type }
      : defaultProperties(node.type);

    for (const [key, property] of Object.entries(object(node.properties))) {
      if (!Object.hasOwn(fields, key)) {
        throw new TypeError(`Unsupported ${node.type} property: ${key}.`);
      }

      properties[key] = validateField(fields[key]!, property, key);
    }

    const responsive: Partial<Record<LayoutBreakpoint, Record<string, PropertyValue>>> = {};

    if (node.responsive !== undefined) {
      for (const [breakpoint, overrides] of Object.entries(object(node.responsive))) {
        if (!['phone', 'tablet', 'desktop'].includes(breakpoint)) {
          throw new TypeError(`Unsupported layout breakpoint: ${breakpoint}.`);
        }

        const values: Record<string, PropertyValue> = {};

        for (const [key, property] of Object.entries(object(overrides))) {
          if (!Object.hasOwn(fields, key) || key === 'Name' || node.type === 'Script') {
            throw new TypeError(`Unsupported responsive property: ${key}.`);
          }

          values[key] = validateField(fields[key]!, property, key);
        }

        responsive[breakpoint as LayoutBreakpoint] = values;
      }
    }

    return {
      ...(node.responsive === undefined ? {} : { responsive }),
      id: node.id,
      type: node.type,
      parent: node.parent,
      properties,
      ...(typeof node.prefabId === 'string' ? { prefabId: node.prefabId } : {}),
    };
  });

  const document: SceneDocument = {
    version: 1,
    name: value.name,
    width: value.width as number,
    height: value.height as number,
    nodes,
    ...(value.events === undefined ? {} : { events: parseEventNames(value.events) }),
    ...(value.bindings === undefined ? {} : { bindings: parseBindings(value.bindings) }),
  };
  return document;
};

const parseEventNames = (value: unknown): readonly string[] => {
  if (
    !Array.isArray(value) ||
    value.length > 50 ||
    value.some(
      (name) =>
        typeof name !== 'string' ||
        ['Activated', 'TextChanged', 'Submitted'].includes(name) ||
        !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name),
    ) ||
    new Set(value).size !== value.length
  ) {
    throw new TypeError(
      'Use unique custom event names starting with a letter; Activated, TextChanged, and Submitted are built-in triggers.',
    );
  }

  return value as string[];
};

const parsePrefabDefinitions = (value: unknown): readonly PrefabDefinition[] => {
  if (!Array.isArray(value) || value.length > 100) {
    throw new TypeError('A project supports up to 100 prefab definitions.');
  }

  return value.map((entry: unknown) => {
    const item = object(entry);

    if (typeof item.id !== 'string' || !item.id || item.id.length > 100) {
      throw new TypeError('Every prefab needs a unique ID.');
    }

    const scope = parseScope(item, true);
    return {
      id: item.id,
      name: scope.name,
      width: scope.width,
      height: scope.height,
      nodes: scope.nodes,
      ...(scope.events ? { events: scope.events } : {}),
      ...(scope.bindings ? { bindings: scope.bindings } : {}),
    };
  });
};

/** Structural edits and imports use the same ownership rules as the preview. */
const validateNodes = (nodes: readonly SceneNode[]): void => {
  const byId = new Map(nodes.map((node) => [node.id, node]));

  if (byId.size !== nodes.length || nodes.length > 500) {
    throw new TypeError('Use unique node IDs and at most 500 nodes.');
  }

  const modifiers = new Set<string>();

  for (const node of nodes) {
    const parent = node.parent === null ? undefined : byId.get(node.parent);
    const category = definitionFor(node.type).category;

    if (node.parent !== null && !parent) {
      throw new TypeError('The parent no longer exists.');
    }

    if (parent) {
      const parentCategory = definitionFor(parent.type).category;

      if (
        parentCategory === 'modifier' ||
        parentCategory === 'script' ||
        (parentCategory === 'element' && category !== 'modifier' && category !== 'script')
      ) {
        throw new TypeError('This node cannot contain that child.');
      }
    }

    if (category === 'modifier') {
      const key = `${node.parent}:${node.type}`;

      if (!parent || modifiers.has(key)) {
        throw new TypeError('Modifiers need a scene parent with no modifier of the same type.');
      }

      modifiers.add(key);
    }

    const ancestors = new Set([node.id]);
    let ancestor = parent;

    while (ancestor) {
      if (ancestors.has(ancestor.id) || ancestors.size >= 50) {
        throw new TypeError('A scene cannot contain ownership cycles or exceed 50 levels.');
      }

      ancestors.add(ancestor.id);
      ancestor = ancestor.parent === null ? undefined : byId.get(ancestor.parent);
    }
  }
};

/** Ownership, prefab dependencies, and event references are validated as one transaction. */
export const validateHierarchy = (document: SceneDocument): void => {
  const definitions = new Map((document.prefabs ?? []).map((prefab) => [prefab.id, prefab]));

  if (definitions.size !== (document.prefabs?.length ?? 0) || definitions.size > 100) {
    throw new TypeError('Use unique prefab IDs and at most 100 prefabs.');
  }

  parseNetworkOrigins(document.networkOrigins ?? []);
  const scopes = [document, ...definitions.values()];

  for (const scope of scopes) {
    validateNodes(scope.nodes);
    parseEventNames(scope.events ?? []);
    validateBindings(scope, definitions);

    for (const node of scope.nodes) {
      if (definitionFor(node.type).category === 'modifier') {
        const parent = scope.nodes.find((entry) => entry.id === node.parent);
        const prefab = parent?.prefabId ? definitions.get(parent.prefabId) : undefined;
        const root = prefab?.nodes.find((entry) => entry.parent === null);

        if (
          root &&
          prefab?.nodes.some((entry) => entry.parent === root.id && entry.type === node.type)
        ) {
          throw new TypeError('This prefab already supplies a modifier of the same type.');
        }
      }

      if (node.prefabId) {
        const prefab = definitions.get(node.prefabId);
        const root = prefab?.nodes.find((entry) => entry.parent === null);

        if (!root || root.type !== node.type) {
          throw new TypeError(
            'Prefab instances need an existing definition with a matching root type.',
          );
        }
      }
    }
  }

  for (const prefab of definitions.values()) {
    const roots = prefab.nodes.filter((node) => node.parent === null);

    if (
      roots.length !== 1 ||
      roots[0]!.prefabId ||
      ['modifier', 'script'].includes(definitionFor(roots[0]!.type).category)
    ) {
      throw new TypeError('A prefab needs exactly one standard GUI root.');
    }
  }

  const sizes = new Map<string, Readonly<{ count: number; depth: number }>>();
  const visiting = new Set<string>();
  const size = (id: string): Readonly<{ count: number; depth: number }> => {
    if (visiting.has(id)) {
      throw new TypeError('Prefabs cannot contain dependency cycles or nest more than 20 levels.');
    }

    const known = sizes.get(id);

    if (known !== undefined) {
      return known;
    }

    visiting.add(id);
    let count = 0;
    let depth = 1;

    for (const node of definitions.get(id)!.nodes) {
      const nested = node.prefabId ? size(node.prefabId) : undefined;
      count += nested?.count ?? 1;
      depth = Math.max(depth, 1 + (nested?.depth ?? 0));
    }

    visiting.delete(id);

    if (depth > 20) {
      throw new TypeError('Prefabs cannot contain dependency cycles or nest more than 20 levels.');
    }

    if (count > 2000) {
      throw new TypeError('A prefab may expand to at most 2000 objects.');
    }

    const result = { count, depth };
    sizes.set(id, result);
    return result;
  };

  definitions.forEach((_, id) => size(id));

  if (
    document.nodes.reduce(
      (total, node) => total + (node.prefabId ? size(node.prefabId).count : 1),
      0,
    ) > 5000
  ) {
    throw new TypeError('A scene may expand to at most 5000 objects.');
  }
};

/** The opening composition is also a useful sample document for import and export. */
export const createSampleDocument = (): SceneDocument => {
  const node = (
    id: string,
    type: NodeType,
    parent: string | null,
    properties: Record<string, PropertyValue>,
  ): SceneNode => ({
    id,
    type,
    parent,
    properties: { ...defaultProperties(type), ...properties },
  });
  const position = udim2FromOffset;
  const color = color3FromHex;

  return {
    version: 1,
    name: 'First canvas',
    width: 960,
    height: 640,
    nodes: [
      node('card', 'Frame', null, {
        Name: 'Welcome card',
        Position: position(48, 48),
        Size: position(864, 544),
        BackgroundColor3: color('#ffffff'),
      }),
      node('card-corner', 'UICorner', 'card', { CornerRadius: 24 }),
      node('card-stroke', 'UIStroke', 'card', { Color: color('#dce3e2') }),
      node('eyebrow', 'TextLabel', 'card', {
        Name: 'Eyebrow',
        Text: 'YOUR NEXT GREAT INTERFACE',
        Position: position(40, 32),
        Size: position(720, 24),
        TextSize: 12,
        FontWeight: '600',
        TextColor3: color('#678077'),
      }),
      node('headline', 'TextLabel', 'card', {
        Name: 'Headline',
        Text: 'Make something persistent.',
        Position: position(40, 72),
        Size: position(780, 60),
        TextSize: 38,
        FontWeight: '600',
        TextColor3: color('#172e28'),
      }),
      node('description', 'TextLabel', 'card', {
        Name: 'Description',
        Text: 'Real objects. An explicit tree. A little room to experiment.',
        Position: position(40, 146),
        Size: position(780, 32),
        TextSize: 18,
        TextColor3: color('#6b7974'),
      }),
      node('feature', 'Frame', 'card', {
        Name: 'Feature panel',
        Position: position(40, 216),
        Size: position(784, 164),
        BackgroundColor3: color('#e4f4ec'),
      }),
      node('feature-corner', 'UICorner', 'feature', { CornerRadius: 16 }),
      node('feature-title', 'TextLabel', 'feature', {
        Name: 'Feature title',
        Text: 'A canvas with a memory.',
        Position: position(28, 24),
        Size: position(700, 36),
        TextSize: 24,
        FontWeight: '600',
        TextColor3: color('#205b43'),
      }),
      node('feature-copy', 'TextLabel', 'feature', {
        Name: 'Feature copy',
        Text: 'Change a property. Move a node. Your instances stay alive.\nStart by selecting anything on this canvas.',
        Position: position(28, 76),
        Size: position(700, 60),
        TextSize: 17,
        TextColor3: color('#4d7664'),
      }),
      node('button', 'TextButton', 'card', {
        Name: 'Get started',
        Text: 'Build something →',
        Position: position(40, 424),
        Size: position(218, 52),
        TextSize: 16,
        FontWeight: '600',
        TextXAlignment: 'Center',
        BackgroundColor3: color('#244f3c'),
        TextColor3: color('#ffffff'),
      }),
      node('button-corner', 'UICorner', 'button', { CornerRadius: 12 }),
      node('footnote', 'TextLabel', 'card', {
        Name: 'Footnote',
        Text: 'Built with FrameKit · Yours to change',
        Position: position(288, 434),
        Size: position(480, 32),
        TextSize: 14,
        TextColor3: color('#819089'),
      }),
    ],
  };
};

/** Network permissions are exact origins, never CSP fragments, paths, wildcards, or credentials. */
export const parseNetworkOrigins = (value: unknown): readonly string[] => {
  if (!Array.isArray(value) || value.length > 16) {
    throw new TypeError('Allow at most 16 HTTP(S) backend origins.');
  }

  return [
    ...new Set(
      value.map((entry: unknown) => {
        if (typeof entry !== 'string') {
          throw new TypeError('Enter an HTTP(S) origin.');
        }
        const url = new URL(entry);
        if (
          !['http:', 'https:'].includes(url.protocol) ||
          url.username ||
          url.password ||
          url.origin !== entry
        ) {
          throw new TypeError(
            'Use exact origins such as https://api.example.com, without paths or a trailing slash.',
          );
        }
        return url.origin;
      }),
    ),
  ];
};
