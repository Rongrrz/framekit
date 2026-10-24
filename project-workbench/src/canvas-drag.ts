import {
  udim2,
  udim2FromOffset,
  type Frame,
  type ObservableValue,
  type ScrollingFrame,
  type UDim2,
} from 'framekit';

import type { CanvasPreferences } from './canvas-preferences';
import type { SceneDocument } from './document';
import type { Editor } from './editor';
import { resolvedProperties } from './prefabs';
import { roundCanvasOffset, snapTranslation, type CanvasRect } from './snapping';
import { colors, panel } from './ui';

type Drag = Readonly<{
  pointer: number;
  id: string;
  x: number;
  y: number;
  zoom: number;
  angle: number;
  position: UDim2;
  project: SceneDocument;
  rect: CanvasRect;
  targets: readonly CanvasRect[];
}>;

/** Direct manipulation paints transient positions and commits only one history revision on drop. */
export const bindCanvasDrag = (
  viewport: ScrollingFrame,
  canvas: Frame,
  editor: Editor,
  preferences: ObservableValue<CanvasPreferences>,
  preview: Readonly<{
    idFromTarget(target: EventTarget | null): string | null;
    setPosition(id: string, position: UDim2): void;
  }>,
  report: (message: string) => void,
): (() => void) => {
  const vertical = panel('Vertical alignment guide', canvas, colors.accent);
  const horizontal = panel('Horizontal alignment guide', canvas, colors.accent);
  for (const guide of [vertical, horizontal]) {
    guide.Visible = false;
    guide.ZIndex = 100000;
    guide.unsafeElement.dataset.canvasGuide = '';
  }
  let drag: Drag | undefined;
  let moved = false;
  let position: UDim2 | undefined;
  let suppressClick = false;
  let clickSelection: string | null | undefined;

  const hideGuides = (): void => {
    if (!vertical.isDestroyed()) {
      vertical.Visible = false;
    }
    if (!horizontal.isDestroyed()) {
      horizontal.Visible = false;
    }
  };
  const finish = (commit: boolean): void => {
    const current = drag;
    const value = position;
    const changed = moved;
    drag = undefined;
    position = undefined;
    moved = false;
    hideGuides();

    if (!current || viewport.isDestroyed()) {
      return;
    }

    if (viewport.unsafeElement.hasPointerCapture(current.pointer)) {
      viewport.releasePointerCapture(current.pointer);
    }

    if (changed && value && commit) {
      suppressClick = true;
      try {
        editor.edit(current.id, 'Position', value);
        report('Moved object. Ctrl/Cmd Z to undo.');
      } catch (error) {
        preview.setPosition(current.id, current.position);
        report(error instanceof Error ? error.message : String(error));
      }
    } else if (changed) {
      preview.setPosition(current.id, current.position);
    }
  };
  viewport.on(
    'pointerdown',
    (event) => {
      if (event.button !== 0) {
        return;
      }

      const id = preview.idFromTarget(event.target);
      clickSelection = id;
      const snapshot = editor.state.get();
      const node = snapshot.document.nodes.find((node) => node.id === id);
      if (!id || !node) {
        return;
      }

      if (
        snapshot.document.nodes.some(
          (entry) => entry.type === 'UIListLayout' && entry.parent === node.parent,
        )
      ) {
        editor.select(id);
        report('This parent uses UIListLayout. Reorder its children in Hierarchy.');
        return;
      }

      const properties = resolvedProperties(snapshot.document, node);
      const value = properties.Position;
      if (
        typeof value !== 'object' ||
        !('X' in value) ||
        typeof value.X !== 'object' ||
        !('Scale' in value.X)
      ) {
        return;
      }

      event.preventDefault();
      editor.select(id);
      viewport.focus();
      const artboard = canvas.unsafeElement.getBoundingClientRect();
      const zoom = artboard.width / (canvas.Size.X.Offset || snapshot.document.width);
      const rectangle = (element: Element): CanvasRect => {
        const bounds = element.getBoundingClientRect();
        return {
          x: (bounds.left - artboard.left) / zoom,
          y: (bounds.top - artboard.top) / zoom,
          width: bounds.width / zoom,
          height: bounds.height / zoom,
        };
      };
      const element = canvas.unsafeElement.querySelector(`[data-scene-id="${CSS.escape(id)}"]`);
      if (!element) {
        return;
      }

      const targets: CanvasRect[] = [
        { x: 0, y: 0, width: artboard.width / zoom, height: artboard.height / zoom },
      ];
      for (const sibling of snapshot.document.nodes.filter(
        (entry) => entry.parent === node.parent && entry.id !== id,
      )) {
        const element = canvas.unsafeElement.querySelector(
          `[data-scene-id="${CSS.escape(sibling.id)}"]`,
        );
        if (element && element.getBoundingClientRect().width) {
          targets.push(rectangle(element));
        }
      }
      let angle = 0;
      let parent = snapshot.document.nodes.find((entry) => entry.id === node.parent);
      while (parent) {
        const rotation = resolvedProperties(snapshot.document, parent).Rotation;
        if (typeof rotation === 'number') {
          angle += rotation;
        }
        parent = snapshot.document.nodes.find((entry) => entry.id === parent!.parent);
      }
      drag = {
        pointer: event.pointerId,
        id,
        x: event.clientX,
        y: event.clientY,
        zoom,
        angle: (angle * Math.PI) / 180,
        position: value as UDim2,
        project: snapshot.project,
        rect: rectangle(element),
        targets,
      };
      position = drag.position;
      viewport.setPointerCapture(event.pointerId);
    },
    { capture: true },
  );
  viewport.on('pointermove', (event) => {
    const current = drag;
    if (!current || event.pointerId !== current.pointer) {
      return;
    }

    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!moved && Math.hypot(dx, dy) < 4) {
      return;
    }

    moved = true;
    event.preventDefault();
    const settings = preferences.get();
    const delta = snapTranslation(
      current.rect,
      { x: dx / current.zoom, y: dy / current.zoom },
      current.targets,
      settings.snapping && !event.altKey,
      settings.guides,
      6 / current.zoom,
    );
    const cos = Math.cos(current.angle);
    const sin = Math.sin(current.angle);
    position = udim2(
      current.position.X.Scale,
      roundCanvasOffset(
        current.position.X.Offset + delta.x * cos + delta.y * sin,
        settings.precision,
      ),
      current.position.Y.Scale,
      roundCanvasOffset(
        current.position.Y.Offset - delta.x * sin + delta.y * cos,
        settings.precision,
      ),
    );
    preview.setPosition(current.id, position);
    vertical.Visible = delta.vertical !== undefined;
    horizontal.Visible = delta.horizontal !== undefined;
    if (delta.vertical !== undefined) {
      vertical.Position = udim2FromOffset(delta.vertical, 0);
      vertical.Size = udim2(0, 1 / current.zoom, 1, 0);
    }
    if (delta.horizontal !== undefined) {
      horizontal.Position = udim2FromOffset(0, delta.horizontal);
      horizontal.Size = udim2(1, 0, 0, 1 / current.zoom);
    }
  });
  viewport.on('pointerup', () => finish(true));
  viewport.on('pointercancel', () => finish(false));
  viewport.on('lostpointercapture', () => finish(false));
  viewport.on(
    'keydown',
    (event) => {
      if (event.key === 'Escape' && drag) {
        event.preventDefault();
        event.stopPropagation();
        finish(false);
      }
    },
    { capture: true },
  );
  viewport.on(
    'click',
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      const id = clickSelection === undefined ? preview.idFromTarget(event.target) : clickSelection;
      clickSelection = undefined;
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      editor.select(id);
    },
    { capture: true },
  );
  const stop = editor.state.onChange((snapshot) => {
    if (drag && snapshot.project !== drag.project) {
      finish(false);
    }
  });
  const stopPreferences = preferences.onChange(() => finish(false));
  viewport.onDestroy(() => {
    stop();
    stopPreferences();
    drag = undefined;
    hideGuides();
  });
  return () => finish(false);
};
