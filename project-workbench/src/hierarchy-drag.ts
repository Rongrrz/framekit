import {
  udim2FromOffset,
  vector2,
  type Frame,
  type ScrollingFrame,
  type TextButton,
} from 'framekit';

import type { Editor } from './editor';
import { moveBranch, type MoveDestination } from './move';
import { colors, label, panel, round } from './ui';

/** A captured pointer belongs to the tree, so collapsing a row cannot interrupt its drag. */
export const bindHierarchyDrag = (
  parent: Frame,
  tree: ScrollingFrame,
  root: TextButton,
  editor: Editor,
  expand: (id: string) => void,
  report: (message: string) => void,
): void => {
  const indicator = panel('Drop indicator', parent, colors.accent);
  indicator.Size = udim2FromOffset(100, 2);
  indicator.Visible = false;
  indicator.ZIndex = 10;
  indicator.unsafeElement.dataset.explorerOverlay = '';
  const ghost = label(parent, '', 28, 11, colors.accent);
  ghost.BackgroundTransparency = 0;
  ghost.BackgroundColor3 = colors.selected;
  ghost.Size = udim2FromOffset(190, 28);
  ghost.ZIndex = 11;
  ghost.Visible = false;
  ghost.unsafeElement.dataset.explorerOverlay = '';
  ghost.ClipsDescendants = true;
  round(ghost, 6);
  let pointer: Readonly<{ id: number; node: string; x: number; y: number }> | undefined;
  let dragging = false;
  let destination: MoveDestination | undefined;
  let target: HTMLElement | undefined;
  let hover: string | undefined;
  let hoverAt = 0;
  let frame = 0;
  let x = 0;
  let y = 0;
  let suppressClick = false;

  const clearTarget = (): void => {
    target?.removeAttribute('data-drop-inside');
    target = undefined;
    destination = undefined;

    if (!indicator.isDestroyed()) {
      indicator.Visible = false;
    }
  };

  const finish = (): void => {
    const previous = pointer;
    pointer = undefined;
    dragging = false;
    hover = undefined;
    cancelAnimationFrame(frame);
    clearTarget();

    if (!ghost.isDestroyed()) {
      ghost.Visible = false;
    }

    if (tree.isDestroyed()) {
      return;
    }

    tree.unsafeElement.removeAttribute('data-dragging');

    if (previous && tree.unsafeElement.hasPointerCapture(previous.id)) {
      tree.releasePointerCapture(previous.id);
    }
  };

  const locate = (): void => {
    clearTarget();

    if (!pointer) {
      return;
    }

    const hit = document.elementFromPoint(x, y);
    const row = hit?.closest<HTMLElement>('[data-explorer-id]');
    const rootHit = root.unsafeElement.contains(hit);
    const treeHit = tree.unsafeElement.contains(hit);

    if (!rootHit && !treeHit) {
      ghost.Text = '  Move outside Explorer to cancel';
      return;
    }

    let placement = 'inside';
    let next: MoveDestination = { parent: null };
    let rect = root.unsafeElement.getBoundingClientRect();
    let name = 'Canvas';
    let hovered: string | undefined;

    if (row && tree.unsafeElement.contains(row)) {
      const id = row.dataset.explorerId!;
      const { document } = editor.state.get();
      const node = document.nodes.find((entry) => entry.id === id);

      if (!node || id === pointer.node) {
        return;
      }

      rect = row.getBoundingClientRect();
      const ratio = (y - rect.top) / rect.height;
      placement = ratio < 0.25 ? 'before' : ratio > 0.75 ? 'after' : 'inside';
      name = node.properties.Name;

      if (placement === 'inside') {
        next = { parent: id };
        hovered = id;
      } else {
        const siblings = document.nodes.filter((entry) => entry.parent === node.parent);
        const before = placement === 'before' ? id : siblings[siblings.indexOf(node) + 1]?.id;
        next = { parent: node.parent, ...(before ? { before } : {}) };
      }
    }

    if (hover !== hovered) {
      hover = hovered;
      hoverAt = performance.now();
    }

    try {
      moveBranch(editor.state.get().document, pointer.node, next);
      destination = next;
      ghost.Text = `  ${placement === 'inside' ? 'Into' : placement === 'before' ? 'Before' : 'After'} ${name}`;
      ghost.TextColor3 = colors.accent;
      const bounds = parent.unsafeElement.getBoundingClientRect();

      if (placement === 'inside') {
        target = row ?? root.unsafeElement;
        target.setAttribute('data-drop-inside', '');
      } else {
        indicator.Position = udim2FromOffset(
          rect.left - bounds.left + 8,
          (placement === 'before' ? rect.top : rect.bottom) - bounds.top,
        );
        indicator.Size = udim2FromOffset(rect.width - 16, 2);
        indicator.Visible = true;
      }
    } catch (error) {
      ghost.Text = `  ${error instanceof Error ? error.message : 'Cannot move here'}`;
      ghost.TextColor3 = colors.danger;
    }
  };

  const tick = (): void => {
    if (!dragging) {
      return;
    }

    const bounds = tree.unsafeElement.getBoundingClientRect();

    if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom) {
      const speed = y < bounds.top + 34 ? -8 : y > bounds.bottom - 34 ? 8 : 0;

      if (speed) {
        tree.CanvasPosition = vector2(0, tree.CanvasPosition.Y + speed);
      }
    }

    if (hover && destination && performance.now() - hoverAt > 650) {
      expand(hover);
      hoverAt = performance.now();
    }

    locate();
    frame = requestAnimationFrame(tick);
  };

  tree.on('pointerdown', (event) => {
    if (event.button !== 0 || event.pointerType === 'touch') {
      return;
    }

    const row = (event.target as Element).closest<HTMLElement>('[data-explorer-id]');

    if (!row) {
      return;
    }

    pointer = {
      id: event.pointerId,
      node: row.dataset.explorerId!,
      x: event.clientX,
      y: event.clientY,
    };
    x = event.clientX;
    y = event.clientY;
  });
  tree.on('pointermove', (event) => {
    if (!pointer || pointer.id !== event.pointerId) {
      return;
    }

    x = event.clientX;
    y = event.clientY;

    if (!dragging && Math.hypot(x - pointer.x, y - pointer.y) >= 6) {
      dragging = true;
      editor.select(pointer.node);
      tree.focus();
      tree.setPointerCapture(pointer.id);
      tree.unsafeElement.setAttribute('data-dragging', '');
      ghost.Visible = true;
      frame = requestAnimationFrame(tick);
    }

    if (dragging) {
      event.preventDefault();
      const bounds = parent.unsafeElement.getBoundingClientRect();
      ghost.Position = udim2FromOffset(
        Math.max(4, Math.min(parent.AbsoluteSize.X - 194, x - bounds.left + 12)),
        y - bounds.top + 20,
      );
      locate();
    }
  });
  tree.on('pointerup', () => {
    if (dragging && pointer) {
      suppressClick = true;
      const move = destination;
      const id = pointer.node;
      finish();

      if (move) {
        try {
          editor.move(id, move);
          report('Moved object. Ctrl/Cmd Z to undo.');
        } catch (error) {
          report(error instanceof Error ? error.message : String(error));
        }
      }
    } else {
      finish();
    }
  });
  tree.on(
    'click',
    (event) => {
      if (suppressClick) {
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressClick = false;
      }
    },
    { capture: true },
  );
  tree.on('pointerleave', () => {
    if (!dragging) {
      finish();
    }
  });
  tree.on('pointercancel', finish);
  tree.on('lostpointercapture', finish);
  tree.on(
    'keydown',
    (event) => {
      if (event.key === 'Escape' && dragging) {
        event.preventDefault();
        event.stopPropagation();
        finish();
      }
    },
    { capture: true },
  );
  parent.onDestroy(finish);
};
