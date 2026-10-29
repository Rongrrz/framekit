import {
  createFrame,
  createImageLabel,
  createScrollingFrame,
  createTextButton,
  createTextInput,
  createTextLabel,
  createUICorner,
  createUIListLayout,
  createUIPadding,
  createUIShadow,
  createUIStroke,
  udim2FromOffset,
  type Frame,
  type Instance,
  type UDim2,
} from 'framekit';

import {
  orderedNodes,
  type SceneDocument,
  type SceneNode,
  type LayoutBreakpoint,
} from './document';
import { expandScene } from './expand-scene';
import { breakpointForWidth, responsiveProperties } from './responsive';
import { definitionFor, type NodeType } from './schema';

const factories = {
  Frame: createFrame,
  ImageLabel: createImageLabel,
  ScrollingFrame: createScrollingFrame,
  TextLabel: createTextLabel,
  TextButton: createTextButton,
  TextInput: createTextInput,
  UICorner: createUICorner,
  UIListLayout: createUIListLayout,
  UIPadding: createUIPadding,
  UIShadow: createUIShadow,
  UIStroke: createUIStroke,
} satisfies Record<Exclude<NodeType, 'Script'>, () => Instance>;

/** Preview reconciliation owns handles; stable document IDs keep their runtime identity. */
export const createScenePreview = (
  canvas: Frame,
): Readonly<{
  setPosition(id: string, position: UDim2): void;
  update(document: SceneDocument, selectedId: string | null, layout?: LayoutBreakpoint): void;
  idFromTarget(target: EventTarget | null): string | null;
}> => {
  const handles = new Map<string, Instance>();
  let previous = new Map<string, SceneNode>();
  let highlighted: HTMLElement | undefined;

  canvas.onDestroy(() => {
    handles.clear();
    previous.clear();
    highlighted = undefined;
  });

  return {
    setPosition: (id, position): void => {
      const node = handles.get(id);
      if (node && !node.isDestroyed() && 'Position' in node) {
        node.Position = position;
      }
    },
    idFromTarget: (target): string | null => {
      const element =
        target instanceof Element ? target.closest<HTMLElement>('[data-scene-id]') : null;
      return element && canvas.unsafeElement.contains(element)
        ? (element.dataset.sceneOwner ?? element.dataset.sceneId ?? null)
        : null;
    },
    update: (authored, selectedId, layout = breakpointForWidth(authored.width)): void => {
      const scene = expandScene(authored);
      const document = {
        ...scene.document,
        nodes: scene.document.nodes
          .filter((node) => node.type !== 'Script')
          .map((node) => ({
            ...node,
            properties: responsiveProperties(node, layout),
          })),
      };
      const next = new Map(document.nodes.map((node) => [node.id, node]));
      const removed = new Set(
        [...previous].filter(([id, node]) => next.get(id)?.type !== node.type).map(([id]) => id),
      );

      // Detach surviving moves before removing parents or applying a reversed ownership relation.
      for (const [id, handle] of handles) {
        const old = previous.get(id)!;
        const node = next.get(id);

        if (
          node &&
          !removed.has(id) &&
          (node.parent !== old.parent || (old.parent !== null && removed.has(old.parent)))
        ) {
          handle.Parent = undefined;
        }
      }

      for (const id of removed) {
        handles.get(id)?.destroy();
        handles.delete(id);
      }

      for (const node of orderedNodes(document)) {
        let handle = handles.get(node.id);

        if (!handle) {
          handle = factories[node.type as Exclude<NodeType, 'Script'>]();
          handles.set(node.id, handle);

          if (definitionFor(node.type).category !== 'modifier') {
            const element = (handle as Frame).unsafeElement;
            element.dataset.sceneId = node.id;
            element.dataset.sceneOwner = scene.owners.get(node.id)!;
          }
        }

        if (definitionFor(node.type).category !== 'modifier') {
          (handle as Frame).unsafeElement.dataset.sceneOwner = scene.owners.get(node.id)!;
        }

        const old = previous.get(node.id);
        const patch = Object.fromEntries(
          Object.entries(node.properties).filter(
            ([key, value]) => !old || JSON.stringify(old.properties[key]) !== JSON.stringify(value),
          ),
        );

        if (Object.keys(patch).length > 0 || removed.has(node.id)) {
          handle.setProperties(removed.has(node.id) ? node.properties : patch);
        }

        const parent = node.parent === null ? canvas : handles.get(node.parent)!;

        if (handle.Parent !== parent) {
          handle.Parent = parent;
        }
      }

      const owned = new Set(handles.values());

      for (const parent of [canvas, ...handles.values()]) {
        const parentId =
          parent === canvas ? null : [...handles].find(([, handle]) => handle === parent)?.[0];
        const children = document.nodes
          .filter((node) => node.parent === parentId)
          .map((node) => handles.get(node.id)!);

        const current = parent.getChildren().filter((child) => owned.has(child));

        if (children.some((child, index) => current[index] !== child)) {
          const unmanaged = parent.getChildren().filter((child) => !owned.has(child));
          parent.reorderChildren([...unmanaged, ...children]);
        }
      }

      previous = next;
      canvas.Size = udim2FromOffset(document.width, document.height);
      highlighted?.removeAttribute('data-workbench-selected');
      const selected = selectedId ? next.get(selectedId) : undefined;
      const targetId =
        selected && definitionFor(selected.type).category === 'modifier'
          ? selected.parent
          : selectedId;
      const target = targetId ? handles.get(targetId) : undefined;
      highlighted =
        target && 'unsafeElement' in target ? (target as Frame).unsafeElement : undefined;
      highlighted?.setAttribute('data-workbench-selected', '');
    },
  };
};
