import {
  createFrame,
  createScreenGui,
  createTextLabel,
  createUICorner,
  createUIListLayout,
  udim2FromOffset,
} from 'framekit';

import { host } from './case-support.js';

/** Owns native instances, per-node subscriptions, and synchronous property commits. */
export const makeFrameKitFixture = (count, kind, targetCount) => {
  const resource = kind === 'resources';
  const observed = resource || kind === 'observed';
  const ids = Array.from({ length: count }, (_, id) => id);
  let nextId = count;
  let notifications = 0;
  let hoverCalls = 0;
  let cleanups = 0;
  const nodes = new Map();
  const corners = new Map();

  const enter = () => {
    hoverCalls += 1;
  };

  const onChange = (value, element) => {
    if (element.style.rotate !== `${value}deg`) {
      throw new Error('Observer saw stale DOM');
    }

    notifications += 1;
  };

  const root = createScreenGui();
  const parent = createFrame({ Size: udim2FromOffset(800, targetCount * 10) });
  parent.Parent = root;
  root.mount(host());

  let layout;

  const newNode = (id, prepend = false) => {
    const node = (kind === 'text' ? createTextLabel : createFrame)({
      Size: udim2FromOffset(800, 10),
      ...(prepend ? { LayoutOrder: -1 } : {}),
      ...(kind === 'text' ? { Text: 'Row' } : {}),
    });

    if (kind === 'corner') {
      const corner = createUICorner();
      corner.Parent = node;
      corners.set(id, corner);
    }

    if (observed) {
      node.onPropertyChanged('Rotation', (value) => onChange(value, node.unsafeElement));
    }

    if (resource) {
      node.onMouseEnter(enter);
      node.onDestroy(() => {
        cleanups += 1;
      });
    }

    node.Parent = parent;
    nodes.set(id, node);
  };

  ids.forEach((id) => newNode(id));

  if (count) {
    layout = createUIListLayout();
    layout.Parent = parent;
  }

  const element = () => parent.unsafeElement;
  const flushLayout = () => element().getBoundingClientRect();
  flushLayout();

  return {
    element,
    flushLayout,
    size: () => ids.length,
    notifications: () => notifications,
    hoverCalls: () => hoverCalls,
    cleanups: () => cleanups,

    add(amount, prepend = false) {
      const added = Array.from({ length: amount }, () => nextId++);

      if (prepend) {
        ids.unshift(...added);
      } else {
        ids.push(...added);
      }

      added.forEach((id) => newNode(id, prepend));

      if (!layout) {
        layout = createUIListLayout();
        layout.Parent = parent;
      }
    },

    remove(amount, fromStart = false) {
      const removed = ids.splice(fromStart ? 0 : -amount, amount);
      removed.forEach((id) => {
        nodes.get(id).destroy();
        nodes.delete(id);
      });
    },

    reverse() {
      ids.reverse();
      parent.reorderChildren([...ids.map((id) => nodes.get(id)), layout]);
    },

    write(amount, value, separate = false) {
      const changed = ids.slice(0, amount);

      if (kind === 'corner') {
        changed.forEach((id) => {
          corners.get(id).CornerRadius = value.radius;
        });

        return;
      }

      const patch =
        typeof value === 'number'
          ? { Rotation: value }
          : kind === 'text'
            ? { Text: value.text }
            : {
                Size: udim2FromOffset(800, value.height),
                Rotation: value.rotation,
                BackgroundTransparency: value.transparency,
              };

      changed.forEach((id) => {
        if (separate || typeof value === 'number') {
          for (const key of Object.keys(patch)) {
            nodes.get(id)[key] = patch[key];
          }
        } else {
          nodes.get(id).setProperties(patch);
        }
      });
    },

    bindHover() {
      nodes.forEach((node) => node.onMouseEnter(enter));
    },

    dispatchHover() {
      for (const child of element().children) {
        child.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      }
    },

    dispose() {
      root.destroy();
    },
  };
};
