import {
  orderedNodes,
  type SceneDocument,
  type SceneNode,
  type ResponsiveProperties,
} from './document';

type ExpandedScene = Readonly<{
  document: SceneDocument;
  owners: ReadonlyMap<string, string>;
}>;

/** Stable expansion IDs preserve runtime identity while definitions remain shared application data. */
export const expandScene = (document: SceneDocument): ExpandedScene => {
  const definitions = new Map((document.prefabs ?? []).map((prefab) => [prefab.id, prefab]));
  const nodes: SceneNode[] = [];
  const owners = new Map<string, string>();
  const allocated = new Set(document.nodes.map((node) => node.id));
  const appendScope = (
    scope: readonly SceneNode[],
    id: string,
    rootOverride?: Readonly<{
      id: string;
      parent: string | null;
      properties: SceneNode['properties'];
      owner: string;
      responsive?: ResponsiveProperties;
    }>,
  ): void => {
    const root = scope.find((node) => node.parent === null);
    const ids = new Map(
      scope.map((node) => {
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
    for (const node of orderedNodes({ ...document, nodes: scope })) {
      const globalId = ids.get(node.id)!;
      const owner = rootOverride?.owner ?? node.id;
      const parent = node.parent === null ? (rootOverride?.parent ?? null) : ids.get(node.parent)!;
      const properties =
        rootOverride && node === root
          ? { ...node.properties, ...rootOverride.properties }
          : node.properties;

      const responsive = Object.fromEntries(
        ['phone', 'tablet', 'desktop'].map((breakpoint) => [
          breakpoint,
          {
            ...node.responsive?.[breakpoint as keyof ResponsiveProperties],
            ...(node === root
              ? rootOverride?.responsive?.[breakpoint as keyof ResponsiveProperties]
              : {}),
          },
        ]),
      );

      if (node.prefabId) {
        const prefab = definitions.get(node.prefabId);

        if (!prefab) {
          throw new TypeError('The prefab no longer exists.');
        }

        appendScope(prefab.nodes, globalId, {
          id: globalId,
          parent,
          properties,
          owner,
          responsive,
        });
      } else {
        if (owners.has(globalId)) {
          throw new TypeError('Expanded object IDs must remain unique.');
        }

        nodes.push({ id: globalId, parent, type: node.type, properties, responsive });
        owners.set(globalId, owner);
      }
    }
  };

  appendScope(document.nodes, '');
  return { document: { ...document, nodes }, owners };
};
