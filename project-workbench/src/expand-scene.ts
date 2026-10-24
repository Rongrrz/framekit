import { orderedNodes, type Interaction, type SceneDocument, type SceneNode } from './document';

/** Each prefab instance owns its own local event references and public output boundary. */
export type RuntimeScope = Readonly<{
  id: string;
  instance: string | null;
  parent: string | null;
  nodes: ReadonlyMap<string, string>;
  bindings: readonly Interaction[];
}>;

export type ExpandedScene = Readonly<{
  document: SceneDocument;
  owners: ReadonlyMap<string, string>;
  scopes: readonly RuntimeScope[];
}>;

/** Stable expansion IDs preserve runtime identity while definitions remain shared application data. */
export const expandScene = (document: SceneDocument): ExpandedScene => {
  const definitions = new Map((document.prefabs ?? []).map((prefab) => [prefab.id, prefab]));
  const nodes: SceneNode[] = [];
  const owners = new Map<string, string>();
  const scopes: RuntimeScope[] = [];
  const allocated = new Set(document.nodes.map((node) => node.id));
  const appendScope = (
    scope: Pick<SceneDocument, 'nodes' | 'bindings'>,
    id: string,
    parentScope: string | null,
    rootOverride?: Readonly<{
      id: string;
      parent: string | null;
      properties: SceneNode['properties'];
      owner: string;
    }>,
  ): void => {
    const root = scope.nodes.find((node) => node.parent === null);
    const ids = new Map(
      scope.nodes.map((node) => {
        if (!id) {
          return [node.id, node.id] as const;
        }
        if (rootOverride && node === root) {
          return [node.id, rootOverride.id] as const;
        }

        let global = `${id}/@/${encodeURIComponent(node.id)}`;
        while (allocated.has(global)) {
          global += '!';
        }
        allocated.add(global);
        return [node.id, global] as const;
      }),
    );
    scopes.push({
      id,
      parent: parentScope,
      instance: rootOverride?.id ?? null,
      nodes: ids,
      bindings: scope.bindings ?? [],
    });

    for (const node of orderedNodes({ ...document, nodes: scope.nodes })) {
      const globalId = ids.get(node.id)!;
      const owner = rootOverride?.owner ?? node.id;
      const parent = node.parent === null ? (rootOverride?.parent ?? null) : ids.get(node.parent)!;
      const properties =
        rootOverride && node === root
          ? { ...node.properties, ...rootOverride.properties }
          : node.properties;

      if (node.prefabId) {
        const prefab = definitions.get(node.prefabId);

        if (!prefab) {
          throw new TypeError('The prefab no longer exists.');
        }

        appendScope(prefab, globalId, id, { id: globalId, parent, properties, owner });
      } else {
        if (owners.has(globalId)) {
          throw new TypeError('Expanded object IDs must remain unique.');
        }

        nodes.push({ id: globalId, parent, type: node.type, properties });
        owners.set(globalId, owner);
      }
    }
  };

  appendScope(document, '', null);
  return { document: { ...document, nodes }, owners, scopes };
};
