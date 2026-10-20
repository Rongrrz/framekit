import type { GuiObject } from '#elements/gui-object.js';
import { preserveAttributes } from '#internal/dom/attributes.js';
import type { GuiElement } from '#internal/runtime/node/gui-node.js';
import { assertNonNegativeFinite } from '#internal/validation.js';
import type { Unsubscribe } from '#state/signal.js';
import { udim2 } from '#values/udim.js';

/** The edge or corner moved by a resize handle. */
export type ResizeEdge =
  | 'Left'
  | 'Right'
  | 'Top'
  | 'Bottom'
  | 'TopLeft'
  | 'TopRight'
  | 'BottomLeft'
  | 'BottomRight';

/** Bounds default to the viewport. Geometry remains expressed through Size and Position. */
export type DragOptions = Readonly<{
  handle?: GuiElement;
  bounds?: GuiElement;
  inset?: number;
}>;

/** Resize limits come from the target's UISizeConstraint, when attached. */
export type ResizeOptions = Readonly<{
  handle: GuiElement;
  edge: ResizeEdge;
  bounds?: GuiElement;
  inset?: number;
}>;

type Rectangle = Readonly<{ left: number; top: number; width: number; height: number }>;

type Geometry = Readonly<{
  rectangle: Rectangle;
  position: GuiObject['Position'];
  size: GuiObject['Size'];
  scaleX: number;
  scaleY: number;
}>;

const resizeCursors: Record<ResizeEdge, string> = {
  Left: 'ew-resize',
  Right: 'ew-resize',
  Top: 'ns-resize',
  Bottom: 'ns-resize',
  TopLeft: 'nwse-resize',
  BottomRight: 'nwse-resize',
  TopRight: 'nesw-resize',
  BottomLeft: 'nesw-resize',
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, Math.max(min, max)));

/**
 * Moves a freely positioned, unrotated GUI with pointer capture or arrow keys (Shift for fine steps).
 * Interactive descendants keep their normal behavior. Disposal releases capture and restores handle styling.
 */
export const bindDraggable = (target: GuiObject, options: DragOptions = {}): Unsubscribe =>
  bindGeometry(target, options.handle ?? target, 'Move', options);

/**
 * Resizes a freely positioned, unrotated GUI using a caller-owned handle. Automatic sizing must be off.
 * Arrow keys resize; Home/End select minimum/maximum size. Anchors and UDim scale components are retained.
 */
export const bindResizable = (target: GuiObject, options: ResizeOptions): Unsubscribe => {
  if (!Object.hasOwn(resizeCursors, options.edge)) {
    throw new TypeError('Unknown resize edge.');
  }

  if (target.AutomaticSize !== 'None') {
    throw new TypeError('Resizable objects must have AutomaticSize set to None.');
  }

  return bindGeometry(target, options.handle, options.edge, options);
};

const bindGeometry = (
  target: GuiObject,
  handle: GuiElement,
  edge: ResizeEdge | 'Move',
  options: Pick<DragOptions, 'bounds' | 'inset'>,
): Unsubscribe => {
  const document = target.unsafeElement.ownerDocument;
  const window = document.defaultView;
  const inset = options.inset ?? 0;
  assertNonNegativeFinite(inset, 'Inset');

  for (const node of [target, handle, options.bounds]) {
    if (node && (node.isDestroyed() || node.unsafeElement.ownerDocument !== document)) {
      throw new TypeError('Dragging and resizing require live GUI objects in the same document.');
    }
  }

  if (!window) {
    throw new Error('Dragging and resizing require a document with a window.');
  }

  const element = handle.unsafeElement;
  const restoreAttributes = preserveAttributes(element, ['tabindex']);
  const savedStyles = ['touch-action', 'user-select', 'cursor'].map((property) => ({
    property,
    value: element.style.getPropertyValue(property),
    priority: element.style.getPropertyPriority(property),
  }));
  const cursor = edge === 'Move' ? 'move' : resizeCursors[edge];
  element.style.touchAction = 'none';
  element.style.userSelect = 'none';
  element.style.cursor = cursor;
  element.tabIndex = 0;

  let drag: Readonly<{ id: number; x: number; y: number; geometry: Geometry }> | undefined;
  let disposed = false;
  const stops: Unsubscribe[] = [];

  const read = (): Geometry | undefined => {
    // Layout and rotation own placement differently; never silently fight those owners.
    if (
      target.Rotation !== 0 ||
      target.Parent?.getChildren().some(
        (node) => node.isA('UIListLayout') || node.isA('UIGridLayout'),
      )
    ) {
      return undefined;
    }

    const rectangle = target.unsafeElement.getBoundingClientRect();

    if (!rectangle.width || !rectangle.height) {
      return undefined;
    }

    const style = window.getComputedStyle(target.unsafeElement);

    return {
      rectangle,
      position: target.Position,
      size: target.Size,
      scaleX: rectangle.width / (parseFloat(style.width) || rectangle.width),
      scaleY: rectangle.height / (parseFloat(style.height) || rectangle.height),
    };
  };

  const change = (start: Geometry, dx: number, dy: number, extreme?: 'Home' | 'End'): void => {
    const bounds = options.bounds?.unsafeElement.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
    const left = bounds.left + inset;
    const top = bounds.top + inset;
    const right = bounds.left + bounds.width - inset;
    const bottom = bounds.top + bounds.height - inset;
    const original = start.rectangle;
    let rectangle: Rectangle;

    if (edge === 'Move') {
      rectangle = {
        width: original.width,
        height: original.height,
        left: clamp(original.left + dx, left, right - original.width),
        top: clamp(original.top + dy, top, bottom - original.height),
      };
    } else {
      if (target.AutomaticSize !== 'None') {
        return;
      }

      const constraint = target.getChildren().find((node) => node.isA('UISizeConstraint'));
      const west = edge.includes('Left');
      const north = edge.includes('Top');
      const x = west || edge.includes('Right');
      const y = north || edge.includes('Bottom');
      const maximumWidth = Math.max(
        0,
        west ? original.left + original.width - left : right - original.left,
      );
      const maximumHeight = Math.max(
        0,
        north ? original.top + original.height - top : bottom - original.top,
      );
      const maxWidth = Math.min(
        maximumWidth,
        (constraint?.MaxSize.X ?? Number.MAX_SAFE_INTEGER) * start.scaleX,
      );
      const maxHeight = Math.min(
        maximumHeight,
        (constraint?.MaxSize.Y ?? Number.MAX_SAFE_INTEGER) * start.scaleY,
      );
      const minWidth = Math.min(maxWidth, (constraint?.MinSize.X ?? 0) * start.scaleX);
      const minHeight = Math.min(maxHeight, (constraint?.MinSize.Y ?? 0) * start.scaleY);
      const preferredWidth =
        extreme === 'Home'
          ? minWidth
          : extreme === 'End'
            ? maxWidth
            : original.width + (west ? -dx : dx);
      const preferredHeight =
        extreme === 'Home'
          ? minHeight
          : extreme === 'End'
            ? maxHeight
            : original.height + (north ? -dy : dy);
      const width = x ? clamp(preferredWidth, minWidth, maxWidth) : original.width;
      const height = y ? clamp(preferredHeight, minHeight, maxHeight) : original.height;

      rectangle = {
        left: west ? original.left + original.width - width : original.left,
        top: north ? original.top + original.height - height : original.top,
        width,
        height,
      };
    }

    const dw = (rectangle.width - original.width) / start.scaleX;
    const dh = (rectangle.height - original.height) / start.scaleY;
    target.setProperties({
      Position: udim2(
        start.position.X.Scale,
        start.position.X.Offset +
          (rectangle.left - original.left) / start.scaleX +
          target.AnchorPoint.X * dw,
        start.position.Y.Scale,
        start.position.Y.Offset +
          (rectangle.top - original.top) / start.scaleY +
          target.AnchorPoint.Y * dh,
      ),
      ...(edge === 'Move'
        ? {}
        : {
            Size: udim2(
              start.size.X.Scale,
              start.size.X.Offset + dw,
              start.size.Y.Scale,
              start.size.Y.Offset + dh,
            ),
          }),
    });
  };

  const cancel = (): void => {
    const current = drag;
    drag = undefined;

    if (current && element.hasPointerCapture(current.id)) {
      element.releasePointerCapture(current.id);
    }
  };

  const dispose = (): void => {
    if (disposed) {
      return;
    }

    disposed = true;
    cancel();

    for (const stop of stops) {
      stop();
    }

    restoreAttributes();

    for (const { property, value, priority } of savedStyles) {
      if (value) {
        element.style.setProperty(property, value, priority);
      } else {
        element.style.removeProperty(property);
      }
    }
  };

  stops.push(
    target.onDestroy(dispose),
    handle === target ? () => {} : handle.onDestroy(dispose),
    handle.on('pointerdown', (event) => {
      const child = (event.target as Element).closest(
        'button, input, textarea, select, a[href], [contenteditable]:not([contenteditable="false"])',
      );

      if (event.defaultPrevented || event.button !== 0 || drag || (child && child !== element)) {
        return;
      }

      const geometry = read();

      if (!geometry) {
        return;
      }

      event.preventDefault();
      handle.focus({ preventScroll: true });
      handle.setPointerCapture(event.pointerId);
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, geometry };
    }),

    handle.on('pointermove', (event) => {
      if (drag?.id === event.pointerId) {
        change(drag.geometry, event.clientX - drag.x, event.clientY - drag.y);
      }
    }),

    handle.on('pointerup', (event) => {
      if (drag?.id === event.pointerId) {
        cancel();
      }
    }),

    handle.on('pointercancel', (event) => {
      if (drag?.id === event.pointerId) {
        cancel();
      }
    }),

    handle.on('lostpointercapture', (event) => {
      if (drag?.id === event.pointerId) {
        cancel();
      }
    }),

    handle.on('keydown', (event) => {
      if (
        event.defaultPrevented ||
        event.target !== element ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.isComposing
      ) {
        return;
      }

      if (event.key === 'Escape' && drag) {
        event.preventDefault();
        cancel();

        return;
      }

      const extreme =
        edge !== 'Move' && (event.key === 'Home' || event.key === 'End') ? event.key : undefined;

      if (!extreme && !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        return;
      }

      const geometry = read();

      if (!geometry) {
        return;
      }

      event.preventDefault();
      cancel();
      const step = event.shiftKey ? 8 : 24;
      change(
        geometry,
        event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0,
        event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0,
        extreme,
      );
    }),
  );

  if (options.bounds && options.bounds !== target && options.bounds !== handle) {
    stops.push(options.bounds.onDestroy(dispose));
  }

  const controller = new window.AbortController();
  window.addEventListener('blur', cancel, { signal: controller.signal });
  stops.push(() => controller.abort());

  return dispose;
};
