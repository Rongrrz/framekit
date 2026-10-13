import {
  createFrame,
  createScreenGui,
  createTextLabel,
  createUICorner,
  createUIListLayout,
  udim2FromOffset,
} from 'framekit';
import { createElement as h, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

const host = () => document.querySelector('#root');
const styleOf = (element) =>
  Object.fromEntries(
    Array.from(element.style, (key) => [
      key.startsWith('--') ? key : key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),
      element.style.getPropertyValue(key),
    ]),
  );
const templates = new Map();

function getTemplate(count, text) {
  const key = `${count}:${text}`;
  if (templates.has(key)) {
    return templates.get(key);
  }
  const root = createScreenGui();
  const parent = createFrame({ Size: udim2FromOffset(800, count * 10) });
  const row = (text ? createTextLabel : createFrame)({ Size: udim2FromOffset(800, 10) });
  parent.Parent = root;
  row.Parent = parent;
  const plainParent = styleOf(parent.unsafeElement);
  createUIListLayout().Parent = parent;
  const result = {
    root: styleOf(root.unsafeElement),
    plainParent,
    parent: styleOf(parent.unsafeElement),
    row: styleOf(row.unsafeElement),
    text: text ? styleOf(row.unsafeElement.firstElementChild) : null,
  };
  root.destroy();
  templates.set(key, result);
  return result;
}

/** Matches the final FrameKit geometry; React gets one flushSync per complete operation. */
export function makeFixture(runtime, count, kind = 'rotation', targetCount = count) {
  const styles = getTemplate(targetCount, kind === 'text');
  const local = runtime === 'react-local';
  const resource = kind === 'resources';
  const observed = resource || kind === 'observed';
  const ids = Array.from({ length: count }, (_, id) => id);
  let nextId = count;
  let notifications = 0;
  let hoverCalls = 0;
  let cleanups = 0;
  let hovering = resource;
  const nodes = new Map();
  const corners = new Map();
  const values = new Map(ids.map((id) => [id, 0]));
  const setters = new Map();
  const enter = () => {
    hoverCalls += 1;
  };
  const onChange = (value, element) => {
    if (element.style.rotate !== `${value}deg`) {
      throw new Error('Observer saw stale DOM');
    }
    notifications += 1;
  };

  const rowStyle = (value) => {
    const style = { ...styles.row };
    if (typeof value === 'number') {
      style.rotate = `${value}deg`;
    } else {
      if (value.rotation !== undefined) {
        style.rotate = `${value.rotation}deg`;
      }
      if (value.height !== undefined) {
        style.height = `${value.height}px`;
      }
      if (value.transparency !== undefined) {
        style.backgroundColor = `rgb(200 200 200 / ${1 - value.transparency})`;
      }
      if (value.radius !== undefined) {
        style.borderRadius = `${value.radius}px`;
      }
    }
    return style;
  };
  const renderRow = (id, value, ref) =>
    h(
      'div',
      {
        key: id,
        style: rowStyle(value),
        ref,
        onMouseEnter: hovering ? enter : undefined,
      },
      kind === 'text'
        ? h('span', { style: styles.text }, typeof value === 'number' ? 'Row' : value.text)
        : undefined,
    );
  function StatefulRow({ id, initialValue }) {
    const [value, setValue] = useState(initialValue);
    const element = useRef(null);
    const previous = useRef(value);
    useLayoutEffect(() => {
      setters.set(id, setValue);
      return () => {
        setters.delete(id);
        if (resource) {
          cleanups += 1;
        }
      };
    }, [id]);
    useLayoutEffect(() => {
      if (observed && !Object.is(previous.current, value)) {
        onChange(value, element.current);
      }
      previous.current = value;
    }, [value]);
    return renderRow(id, value, element);
  }
  function Rows() {
    return h(
      'div',
      { style: styles.root },
      h(
        'div',
        {
          style: ids.length ? styles.parent : styles.plainParent,
        },
        ids.map((id) =>
          local || observed
            ? h(StatefulRow, { key: id, id, initialValue: values.get(id) })
            : renderRow(id, values.get(id)),
        ),
      ),
    );
  }

  let root;
  let parent;
  let layout;
  const newNode = (id) => {
    const node = (kind === 'text' ? createTextLabel : createFrame)({
      Size: udim2FromOffset(800, 10),
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
  const render = () => flushSync(() => root.render(h(Rows)));
  if (runtime === 'framekit') {
    root = createScreenGui();
    parent = createFrame({ Size: udim2FromOffset(800, targetCount * 10) });
    parent.Parent = root;
    root.mount(host());
    ids.forEach(newNode);
    if (count) {
      layout = createUIListLayout();
      layout.Parent = parent;
    }
  } else {
    root = createRoot(host());
    render();
    parent = host().firstElementChild.firstElementChild;
  }
  const element = () => (runtime === 'framekit' ? parent.unsafeElement : parent);
  const flushLayout = () => element().getBoundingClientRect();
  flushLayout();
  return {
    element,
    flushLayout,
    size: () => ids.length,
    notifications: () => notifications,
    hoverCalls: () => hoverCalls,
    cleanups: () => cleanups,
    add(amount) {
      const added = Array.from({ length: amount }, () => nextId++);
      ids.push(...added);
      if (runtime === 'framekit') {
        added.forEach(newNode);
        if (!layout) {
          layout = createUIListLayout();
          layout.Parent = parent;
        }
      } else {
        added.forEach((id) => values.set(id, 0));
        render();
      }
    },
    remove(amount) {
      const removed = ids.splice(-amount);
      if (runtime === 'framekit') {
        removed.forEach((id) => {
          nodes.get(id).destroy();
          nodes.delete(id);
        });
      } else {
        removed.forEach((id) => values.delete(id));
        render();
      }
    },
    reverse() {
      ids.reverse();
      if (runtime === 'framekit') {
        parent.reorderChildren([...ids.map((id) => nodes.get(id)), layout]);
      } else {
        render();
      }
    },
    write(amount, value, separate = false) {
      const changed = ids.slice(0, amount);
      if (runtime === 'framekit') {
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
      } else {
        flushSync(() => {
          changed.forEach((id) => {
            values.set(id, value);
            if (local || observed) {
              setters.get(id)(value);
            }
          });
          if (!local && !observed) {
            root.render(h(Rows));
          }
        });
      }
    },
    bindHover() {
      if (runtime === 'framekit') {
        nodes.forEach((node) => node.onMouseEnter(enter));
      } else {
        hovering = true;
        render();
      }
    },
    dispatchHover() {
      const type = runtime === 'framekit' ? 'mouseenter' : 'mouseover';
      for (const child of element().children) {
        child.dispatchEvent(new MouseEvent(type, { bubbles: true }));
      }
    },
    dispose() {
      if (runtime === 'framekit') {
        root.destroy();
      } else {
        root.unmount();
      }
    },
  };
}

export function compatibilityAudit() {
  const first = createFrame();
  const second = createFrame();
  const order = [];
  first.on('mouseenter', () => order.push('raw'));
  first.onMouseEnter(() => order.push('typed'));
  first.unsafeElement.dispatchEvent(new MouseEvent('mouseenter'));
  const result = {
    sharedDefaultSize: first.Size === second.Size,
    sharedDefaultPosition: first.Position === second.Position,
    frozenSize: Object.isFrozen(first.Size) && Object.isFrozen(first.Size.X),
    hoverOrderWhenRawSubscribedFirst: order,
  };
  first.Size = udim2FromOffset(200, 100);
  result.independentSizeAfterAssignment = second.Size.X.Offset === 100;
  first.destroy();
  second.destroy();
  return result;
}
