import { createElement as h, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import { host } from './case-support.js';

/** Owns React root/local state and commits one flushSync for each fixture operation. */
export const makeReactFixture = (runtime, count, kind, styles) => {
  const local = runtime === 'react-local';
  const resource = kind === 'resources';
  const observed = resource || kind === 'observed';
  const ids = Array.from({ length: count }, (_, id) => id);
  let nextId = count;
  let notifications = 0;
  let hoverCalls = 0;
  let cleanups = 0;
  let hovering = resource;
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

  const root = createRoot(host());
  const render = () => flushSync(() => root.render(h(Rows)));
  render();
  const parent = host().firstElementChild.firstElementChild;
  const element = () => parent;
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
      added.forEach((id) => values.set(id, 0));
      render();
    },
    remove(amount, fromStart = false) {
      ids.splice(fromStart ? 0 : -amount, amount).forEach((id) => values.delete(id));
      render();
    },
    reverse() {
      ids.reverse();
      render();
    },
    write(amount, value) {
      const changed = ids.slice(0, amount);
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
    },
    bindHover() {
      hovering = true;
      render();
    },
    dispatchHover() {
      for (const child of element().children) {
        child.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      }
    },
    dispose() {
      root.unmount();
    },
  };
};
