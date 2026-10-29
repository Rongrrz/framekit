import { udim2FromOffset } from 'framekit';

import {
  descendantIds,
  type PrefabDefinition,
  type SceneDocument,
  type SceneNode,
  type LayoutBreakpoint,
} from './document';
import { defaultProperties, definitionFor } from './schema';

/** Editor scope is derived from the project; a definition is never saved as the whole project. */
export const editableDocument = (
  project: SceneDocument,
  prefabId: string | null,
): SceneDocument => {
  if (!prefabId) {
    return project;
  }

  const prefab = project.prefabs?.find((entry) => entry.id === prefabId);

  if (!prefab) {
    throw new TypeError('The prefab no longer exists.');
  }

  return {
    ...project,
    name: prefab.name,
    width: prefab.width,
    height: prefab.height,
    nodes: prefab.nodes,
    events: prefab.events ?? [],
    bindings: prefab.bindings ?? [],
  };
};

/** A root override belongs to the instance; untouched properties continue to inherit. */
export const resolvedProperties = (
  document: SceneDocument,
  node: SceneNode,
  layout: LayoutBreakpoint | null = null,
): SceneNode['properties'] => {
  const root = node.prefabId
    ? document.prefabs
        ?.find((prefab) => prefab.id === node.prefabId)
        ?.nodes.find((entry) => entry.parent === null)
    : undefined;
  return {
    ...root?.properties,
    ...node.properties,
    ...(layout ? root?.responsive?.[layout] : {}),
    ...(layout ? node.responsive?.[layout] : {}),
  };
};

export const replaceScope = (
  project: SceneDocument,
  prefabId: string | null,
  document: SceneDocument,
): SceneDocument => {
  if (!prefabId) {
    return document;
  }

  return {
    ...project,
    prefabs: (document.prefabs ?? []).map((prefab) =>
      prefab.id === prefabId
        ? {
            id: prefab.id,
            name: document.name,
            width: document.width,
            height: document.height,
            nodes: document.nodes,
            events: document.events ?? [],
            bindings: document.bindings ?? [],
          }
        : prefab,
    ),
  };
};

/** Conversion moves a whole owned branch and its internal connections into a shared definition. */
export const makePrefab = (
  document: SceneDocument,
  selectedId: string | null,
  name: string,
): Readonly<{ document: SceneDocument; prefab: PrefabDefinition }> => {
  const selected = document.nodes.find((node) => node.id === selectedId);

  if (
    selected &&
    (selected.prefabId || ['modifier', 'script'].includes(definitionFor(selected.type).category))
  ) {
    throw new TypeError(
      'Choose a standard GUI root, or clear selection to create an empty prefab.',
    );
  }

  const id = crypto.randomUUID();
  const rootId = selected?.id ?? crypto.randomUUID();
  const branch = selected ? descendantIds(document, selected.id) : new Set<string>();
  const inside = (node: string): boolean => branch.has(node);
  const internal = (document.bindings ?? []).filter((binding) => {
    const action = binding.action;
    const targets =
      action.type === 'emit'
        ? []
        : [action.target, ...(action.type === 'copyText' ? [action.source] : [])];
    const whollyInside = inside(binding.source) && targets.every(inside) && action.type !== 'emit';
    const touchesChildren = [binding.source, ...targets].some(
      (node) => node !== rootId && inside(node),
    );

    if (touchesChildren && !whollyInside) {
      throw new TypeError(
        'Reconnect events crossing this branch through custom prefab events before converting it.',
      );
    }

    return whollyInside;
  });
  const authoredSize = (
    node: SceneNode | undefined,
  ): Readonly<{ width: number; height: number }> => {
    if (!node) {
      return document;
    }

    const parent = authoredSize(document.nodes.find((entry) => entry.id === node.parent));
    const size = resolvedProperties(document, node).Size;

    if (
      typeof size !== 'object' ||
      !('X' in size) ||
      typeof size.X !== 'object' ||
      !('Scale' in size.X) ||
      typeof size.Y !== 'object' ||
      !('Scale' in size.Y)
    ) {
      return parent;
    }

    return {
      width: parent.width * size.X.Scale + size.X.Offset,
      height: parent.height * size.Y.Scale + size.Y.Offset,
    };
  };
  const dimensions = selected ? authoredSize(selected) : { width: 320, height: 180 };
  const width = Math.max(4, Math.min(4096, dimensions.width));
  const height = Math.max(4, Math.min(4096, dimensions.height));
  const prefab: PrefabDefinition = {
    id,
    name: name.trim().slice(0, 200) || 'New prefab',
    width,
    height,
    nodes: selected
      ? document.nodes
          .filter((node) => branch.has(node.id))
          .map((node) =>
            node.id === rootId
              ? {
                  ...node,
                  parent: null,
                  properties: {
                    ...node.properties,
                    Position: udim2FromOffset(0, 0),
                    Size: udim2FromOffset(width, height),
                  },
                }
              : node,
          )
      : [
          {
            id: rootId,
            type: 'Frame',
            parent: null,
            properties: {
              ...defaultProperties('Frame'),
              Name: 'Root',
              Position: udim2FromOffset(0, 0),
              Size: udim2FromOffset(width, height),
            },
          },
        ],
    events: [],
    bindings: internal,
  };
  const nodes = selected
    ? document.nodes
        .filter((node) => !branch.has(node.id) || node.id === rootId)
        .map((node) =>
          node.id === rootId
            ? {
                ...node,
                prefabId: id,
                properties: Object.fromEntries(
                  Object.entries(node.properties).filter(([key]) =>
                    [
                      'Name',
                      'Position',
                      'Size',
                      'AnchorPoint',
                      'Rotation',
                      'LayoutOrder',
                      'ZIndex',
                      'Visible',
                    ].includes(key),
                  ),
                ) as SceneNode['properties'],
              }
            : node,
        )
    : document.nodes;
  return {
    prefab,
    document: {
      ...document,
      nodes,
      prefabs: [...(document.prefabs ?? []), prefab],
      ...(document.bindings
        ? { bindings: document.bindings.filter((binding) => !internal.includes(binding)) }
        : {}),
    },
  };
};
