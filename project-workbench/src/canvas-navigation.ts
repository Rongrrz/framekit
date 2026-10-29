import {
  vector2,
  watchOwnedValue,
  type Frame,
  type ObservableValue,
  type ScrollingFrame,
  type UserInputService,
  type Vector2,
} from 'framekit';

import { canvasZoomLimits, type WorkspacePreferences } from './workspace';

type Pan = Readonly<{ pointer: number; x: number; y: number; origin: Vector2 }>;

/** Navigation changes the viewport, while authored positions and undo history stay with the editor. */
export const bindCanvasNavigation = (
  viewport: ScrollingFrame,
  canvas: Frame,
  preferences: ObservableValue<WorkspacePreferences>,
  handTool: ObservableValue<boolean>,
  keyboard: UserInputService,
  cancelObjectDrag: () => void,
): (() => void) => {
  const element = viewport.unsafeElement;
  const document = element.ownerDocument;
  const window = document.defaultView!;
  let pan: Pan | undefined;
  let space = false;
  let pointer: Vector2 | undefined;

  const paintCursor = (): void => {
    element.toggleAttribute('data-workbench-pan-ready', space || handTool.get());
    element.toggleAttribute('data-workbench-panning', Boolean(pan));
  };

  const available = (): boolean =>
    element.getClientRects().length > 0 &&
    !document.querySelector('dialog[open], [popover]:popover-open');

  const isTextEntry = (target: EventTarget | null): boolean =>
    target instanceof window.HTMLElement &&
    Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));

  const actualZoom = (): number =>
    canvas.unsafeElement.getBoundingClientRect().width / canvas.Size.X.Offset;

  const freezeFit = (): void => {
    if (preferences.get().zoom === 0) {
      preferences.update((value) => ({ ...value, zoom: actualZoom() }));
    }
  };

  const finish = (restore = false): void => {
    const current = pan;
    pan = undefined;

    if (current) {
      if (restore) {
        viewport.CanvasPosition = current.origin;
      }

      if (element.hasPointerCapture(current.pointer)) {
        viewport.releasePointerCapture(current.pointer);
      }
    }

    paintCursor();
  };

  const cancel = (): void => {
    space = false;
    finish();
  };

  const zoomBy = (factor: number, anchor?: Vector2): void => {
    cancelObjectDrag();
    finish();
    const before = canvas.unsafeElement.getBoundingClientRect();
    const bounds = element.getBoundingClientRect();
    const point =
      anchor ??
      vector2(bounds.left + element.clientWidth / 2, bounds.top + element.clientHeight / 2);
    const x = (point.X - before.left) / before.width;
    const y = (point.Y - before.top) / before.height;
    const zoom = Math.max(
      canvasZoomLimits.min,
      Math.min(canvasZoomLimits.max, Math.round(actualZoom() * factor * 100) / 100),
    );
    preferences.update((value) => ({ ...value, zoom }));
    const after = canvas.unsafeElement.getBoundingClientRect();
    viewport.scrollBy(
      vector2(after.left + x * after.width - point.X, after.top + y * after.height - point.Y),
    );
  };

  watchOwnedValue(viewport, handTool, paintCursor);
  viewport.on(
    'pointerdown',
    (event) => {
      if (!available()) {
        return;
      }

      if (event.button !== 1 && !(event.button === 0 && (space || handTool.get()))) {
        element.removeAttribute('data-workbench-pan-click');
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      cancelObjectDrag();
      freezeFit();
      viewport.focus({ preventScroll: true });
      pan = {
        pointer: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        origin: viewport.CanvasPosition,
      };
      element.setAttribute('data-workbench-pan-click', '');
      viewport.setPointerCapture(event.pointerId);
      paintCursor();
    },
    { capture: true },
  );

  viewport.on(
    'pointermove',
    (event) => {
      pointer = vector2(event.clientX, event.clientY);

      if (pan?.pointer === event.pointerId) {
        event.preventDefault();
        event.stopImmediatePropagation();
        viewport.CanvasPosition = vector2(
          pan.origin.X + pan.x - event.clientX,
          pan.origin.Y + pan.y - event.clientY,
        );
      }
    },
    { capture: true },
  );

  viewport.on(
    'pointerup',
    (event) => {
      if (pan?.pointer === event.pointerId) {
        event.preventDefault();
        event.stopImmediatePropagation();
        finish();
      }
    },
    { capture: true },
  );
  viewport.on('pointerleave', () => {
    pointer = undefined;
  });
  viewport.on('pointercancel', () => finish());
  viewport.on('lostpointercapture', () => finish());
  viewport.on(
    'click',
    (event) => {
      if (element.hasAttribute('data-workbench-pan-click')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        element.removeAttribute('data-workbench-pan-click');
      }
    },
    { capture: true },
  );
  viewport.on('auxclick', (event) => {
    if (event.button === 1) {
      event.preventDefault();
      event.stopPropagation();
      element.removeAttribute('data-workbench-pan-click');
    }
  });

  viewport.on(
    'wheel',
    (event) => {
      if (!available()) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;

      if (event.ctrlKey || event.metaKey) {
        zoomBy(Math.exp(-event.deltaY * unit * 0.002), vector2(event.clientX, event.clientY));
      } else {
        cancelObjectDrag();
        finish();
        freezeFit();
        viewport.scrollBy(
          vector2(
            (event.deltaX + (event.shiftKey ? event.deltaY : 0)) * unit,
            event.shiftKey ? 0 : event.deltaY * unit,
          ),
        );
      }
    },
    { passive: false, capture: true },
  );

  // Suppress the scrolling frame's native Space paging before its keyboard handler runs.
  viewport.on(
    'keydown',
    (event) => {
      if (
        event.code === 'Space' &&
        !event.isComposing &&
        !isTextEntry(event.target) &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        available()
      ) {
        event.preventDefault();
        space = true;
        paintCursor();
      }
    },
    { capture: true },
  );

  const stopKeys = keyboard.inputBegan.subscribe((event, processed) => {
    if (processed || !available()) {
      return;
    }

    const modified = event.ctrlKey || event.metaKey;

    if (modified && ['+', '=', '-', '0'].includes(event.key)) {
      event.preventDefault();

      if (event.key === '0') {
        cancelObjectDrag();
        cancel();
        preferences.update((value) => ({ ...value, zoom: 0 }));
      } else {
        zoomBy(event.key === '-' ? 1 / 1.2 : 1.2, pointer);
      }
    } else if (!modified && !event.altKey) {
      if (
        event.code === 'Space' &&
        !(
          event.target instanceof window.Element &&
          event.target.closest('button, a, [role="tab"], [role="treeitem"]')
        )
      ) {
        event.preventDefault();
        space = true;
        paintCursor();
      } else if (event.key.toLowerCase() === 'e' && element.contains(document.activeElement)) {
        event.preventDefault();
        cancelObjectDrag();
        finish();
        handTool.update((value) => !value);
      } else if (event.key.toLowerCase() === 'h' || event.key.toLowerCase() === 'v') {
        event.preventDefault();
        handTool.set(event.key.toLowerCase() === 'h');
      } else if (event.key === 'Escape' && (pan || handTool.get())) {
        event.preventDefault();
        finish(true);
        space = false;
        handTool.set(false);
        paintCursor();
      }
    }
  });
  const stopRelease = keyboard.inputEnded.subscribe((event) => {
    if (event.code === 'Space') {
      space = false;
      paintCursor();
    }
  });
  const visibility = (): void => {
    if (document.visibilityState === 'hidden') {
      cancel();
    }
  };
  const controller = new AbortController();
  window.addEventListener('blur', cancel, { signal: controller.signal });
  document.addEventListener('visibilitychange', visibility, { signal: controller.signal });
  viewport.onDestroy(() => {
    // Removing the viewport releases native capture; FrameKit properties are closed during teardown.
    pan = undefined;
    space = false;
    controller.abort();
    stopKeys();
    stopRelease();
  });
  return cancel;
};
