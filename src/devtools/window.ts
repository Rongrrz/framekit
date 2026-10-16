import { createFrame, type Frame } from '#elements/frame.js';
import { udim2, udim2FromOffset } from '#values/udim.js';

type Bounds = Readonly<{ x: number; y: number; width: number; height: number }>;

const edges = ['w', 'e', 'n', 's', 'nw', 'ne', 'sw', 'se'] as const;

type Edge = (typeof edges)[number];

const edgeNames: Record<Edge, string> = {
  w: 'Resize runtime inspector',
  e: 'Resize inspector right edge',
  n: 'Resize inspector top edge',
  s: 'Resize inspector bottom edge',
  nw: 'Resize inspector top left corner',
  ne: 'Resize inspector top right corner',
  sw: 'Resize inspector bottom left corner',
  se: 'Resize inspector bottom right corner',
};

/** Owns window geometry, pointer capture, and keyboard equivalents independently of inspection. */
export const bindInspectorWindow = (
  panel: Frame,
  header: Frame,
  onResize: () => void,
): (() => void) => {
  const window = panel.unsafeElement.ownerDocument.defaultView!;

  const initial = (): Bounds => ({
    x: Math.max(8, window.innerWidth - 696),
    y: 16,
    width: 680,
    height: Math.min(780, window.innerHeight - 32),
  });

  let bounds = initial();

  const limits = (): Readonly<{ margin: number; width: number; height: number }> => {
    const margin = window.innerWidth < 640 ? 8 : 16;

    return {
      margin,
      width: Math.max(1, window.innerWidth - margin * 2),
      height: Math.max(1, window.innerHeight - margin * 2),
    };
  };

  const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(value, max));

  const handles: Frame[] = [];

  const apply = (): void => {
    const { margin, width, height } = limits();
    const panelWidth = clamp(bounds.width, Math.min(320, width), width);
    const panelHeight = clamp(bounds.height, Math.min(360, height), height);
    bounds = {
      width: panelWidth,
      height: panelHeight,
      x: clamp(bounds.x, margin, window.innerWidth - margin - panelWidth),
      y: clamp(bounds.y, margin, window.innerHeight - margin - panelHeight),
    };

    panel.setProperties({
      Position: udim2FromOffset(bounds.x, bounds.y),
      Size: udim2FromOffset(bounds.width, bounds.height),
    });

    for (const [index, handle] of handles.entries()) {
      const vertical = edges[index] === 'n' || edges[index] === 's';
      handle.unsafeElement.setAttribute(
        'aria-valuemin',
        String(Math.min(vertical ? 360 : 320, vertical ? height : width)),
      );
      handle.unsafeElement.setAttribute('aria-valuemax', String(vertical ? height : width));
      handle.unsafeElement.setAttribute(
        'aria-valuenow',
        String(vertical ? bounds.height : bounds.width),
      );

      handle.unsafeElement.setAttribute(
        'aria-valuetext',
        `${bounds.width} pixels wide, ${bounds.height} pixels tall`,
      );
    }

    onResize();
  };

  const change = (start: Bounds, edge: Edge | 'move', dx: number, dy: number): void => {
    const { margin, width, height } = limits();

    if (edge === 'move') {
      bounds = { ...start, x: start.x + dx, y: start.y + dy };
    } else {
      const right = start.x + start.width;
      const bottom = start.y + start.height;

      const x = edge.includes('w')
        ? clamp(start.x + dx, margin, right - Math.min(320, width))
        : start.x;

      const y = edge.includes('n')
        ? clamp(start.y + dy, margin, bottom - Math.min(360, height))
        : start.y;

      bounds = {
        x,
        y,
        width: edge.includes('w')
          ? right - x
          : edge.includes('e')
            ? clamp(start.width + dx, Math.min(320, width), window.innerWidth - margin - x)
            : start.width,
        height: edge.includes('n')
          ? bottom - y
          : edge.includes('s')
            ? clamp(start.height + dy, Math.min(360, height), window.innerHeight - margin - y)
            : start.height,
      };
    }

    apply();
  };

  const bind = (target: Frame, edge: Edge | 'move'): void => {
    let drag: Readonly<{ id: number; x: number; y: number; bounds: Bounds }> | undefined;
    const element = target.unsafeElement;
    element.style.touchAction = 'none';
    element.style.userSelect = 'none';
    element.tabIndex = 0;
    target.on('pointerdown', (event) => {
      if (
        event.button !== 0 ||
        (edge === 'move' && (event.target as Element).closest('button, input'))
      ) {
        return;
      }

      event.preventDefault();
      target.focus();
      target.setPointerCapture(event.pointerId);
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, bounds };
    });

    target.on('pointermove', (event) => {
      if (drag?.id === event.pointerId) {
        change(drag.bounds, edge, event.clientX - drag.x, event.clientY - drag.y);
      }
    });

    target.on('pointerup', (event) => {
      if (drag?.id !== event.pointerId) {
        return;
      }

      drag = undefined;
      target.releasePointerCapture(event.pointerId);
    });

    target.on('pointercancel', () => {
      drag = undefined;
    });

    target.on('lostpointercapture', () => {
      drag = undefined;
    });

    target.on('keydown', (event) => {
      if (event.target !== element) {
        return;
      }

      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();

        if (edge === 'move') {
          bounds = initial();
          apply();
        } else {
          const maximum = limits();
          const width = event.key === 'Home' ? 320 : maximum.width;
          const height = event.key === 'Home' ? 360 : maximum.height;
          change(
            bounds,
            edge,
            (edge.includes('w') ? -1 : 1) * (width - bounds.width),
            (edge.includes('n') ? -1 : 1) * (height - bounds.height),
          );
        }

        return;
      }

      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        return;
      }

      event.preventDefault();

      const step = event.shiftKey ? 8 : 24;
      change(
        bounds,
        edge,
        event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0,
        event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0,
      );
    });
  };

  header.unsafeElement.setAttribute('role', 'group');
  header.unsafeElement.setAttribute('aria-label', 'Move runtime inspector');
  header.unsafeElement.title = 'Drag to move · Arrow keys to move · Home to reset';
  header.unsafeElement.setAttribute('aria-description', header.unsafeElement.title);
  header.unsafeElement.style.cursor = 'move';
  bind(header, 'move');
  header.on('dblclick', (event) => {
    if ((event.target as Element).closest('button')) {
      return;
    }

    bounds = initial();
    apply();
  });

  for (const edge of edges) {
    const horizontal = edge === 'w' || edge === 'e';
    const vertical = edge === 'n' || edge === 's';

    const handle = createFrame(
      { Name: `ResizeInspector:${edge}`, BackgroundTransparency: 1, ZIndex: 10 },
      { ownerDocument: panel.unsafeElement.ownerDocument },
    );

    handle.Parent = panel;
    handle.setProperties({
      Position: udim2(edge.includes('e') ? 1 : 0, -5, edge.includes('s') ? 1 : 0, -5),
      Size: horizontal
        ? udim2(0, 10, 1, 0)
        : vertical
          ? udim2(1, 0, 0, 10)
          : udim2FromOffset(16, 16),
    });

    // Corners have their own larger hit targets; edge strips leave them clear.
    if (horizontal) {
      handle.setProperties({
        Position: udim2(edge === 'e' ? 1 : 0, -5, 0, 12),
        Size: udim2(0, 10, 1, -24),
      });
    }

    if (vertical) {
      handle.setProperties({
        Position: udim2(0, 12, edge === 's' ? 1 : 0, -5),
        Size: udim2(1, -24, 0, 10),
      });
    }

    handle.unsafeElement.dataset.fkResize = edge;
    handle.unsafeElement.setAttribute('role', 'separator');
    handle.unsafeElement.setAttribute('aria-label', edgeNames[edge]);
    handle.unsafeElement.setAttribute('aria-orientation', vertical ? 'horizontal' : 'vertical');
    handle.unsafeElement.title = `${edgeNames[edge]} · Arrow keys to resize`;
    handle.unsafeElement.style.cursor = horizontal
      ? 'ew-resize'
      : vertical
        ? 'ns-resize'
        : edge === 'nw' || edge === 'se'
          ? 'nwse-resize'
          : 'nesw-resize';
    handles.push(handle);
    bind(handle, edge);
  }

  window.addEventListener('resize', apply);
  panel.onDestroy(() => window.removeEventListener('resize', apply));

  return apply;
};
