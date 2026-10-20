import { createFrame, type Frame } from '#elements/frame.js';
import { setAccessibility } from '#helpers/accessibility.js';
import { bindDraggable, bindResizable, type ResizeEdge } from '#helpers/drag-resize.js';
import { observeSize } from '#helpers/observe-size.js';
import { createUISizeConstraint } from '#modifiers/size-constraint.js';
import { udim2, udim2FromOffset } from '#values/udim.js';
import { vector2 } from '#values/vector2.js';

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

const resizeEdges: Record<Edge, ResizeEdge> = {
  w: 'Left',
  e: 'Right',
  n: 'Top',
  s: 'Bottom',
  nw: 'TopLeft',
  ne: 'TopRight',
  sw: 'BottomLeft',
  se: 'BottomRight',
};

/** Inspector policy lives here; shared helpers own pointer capture and geometry interaction. */
export const bindInspectorWindow = (
  panel: Frame,
  header: Frame,
  onResize: () => void,
): (() => void) => {
  const window = panel.unsafeElement.ownerDocument.defaultView!;
  const margin = (): number => (window.innerWidth < 640 ? 8 : 16);
  const handles: Frame[] = [];
  const constraint = createUISizeConstraint();
  constraint.Parent = panel;

  const reset = (): void => {
    panel.setProperties({
      Position: udim2FromOffset(Math.max(8, window.innerWidth - 696), 16),
      Size: udim2FromOffset(680, Math.min(780, window.innerHeight - 32)),
    });
  };

  const updateHandles = (): void => {
    const size = panel.AbsoluteSize;

    for (const [index, handle] of handles.entries()) {
      const vertical = edges[index] === 'n' || edges[index] === 's';
      setAccessibility(handle, {
        valueMin: vertical ? constraint.MinSize.Y : constraint.MinSize.X,
        valueMax: vertical ? constraint.MaxSize.Y : constraint.MaxSize.X,
        valueNow: vertical ? size.Y : size.X,
        valueText: `${size.X} pixels wide, ${size.Y} pixels tall`,
      });
    }

    onResize();
  };

  const apply = (): void => {
    const inset = margin();
    const maxWidth = Math.max(1, window.innerWidth - inset * 2);
    const maxHeight = Math.max(1, window.innerHeight - inset * 2);
    const width = Math.max(Math.min(320, maxWidth), Math.min(panel.Size.X.Offset, maxWidth));
    const height = Math.max(Math.min(360, maxHeight), Math.min(panel.Size.Y.Offset, maxHeight));
    constraint.setProperties({
      MinSize: vector2(Math.min(320, maxWidth), Math.min(360, maxHeight)),
      MaxSize: vector2(maxWidth, maxHeight),
    });
    panel.setProperties({
      Size: udim2FromOffset(width, height),
      Position: udim2FromOffset(
        Math.max(inset, Math.min(panel.Position.X.Offset, window.innerWidth - inset - width)),
        Math.max(inset, Math.min(panel.Position.Y.Offset, window.innerHeight - inset - height)),
      ),
    });
    updateHandles();
  };

  setAccessibility(header, {
    role: 'group',
    label: 'Move runtime inspector',
    description: 'Drag to move · Arrow keys to move · Home to reset',
  });
  header.unsafeElement.title = 'Drag to move · Arrow keys to move · Home to reset';
  bindDraggable(panel, { handle: header, inset: 8 });
  header.on('keydown', (event) => {
    if (event.target === header.unsafeElement && event.key === 'Home') {
      event.preventDefault();
      reset();
      apply();
    }
  });
  header.on('dblclick', (event) => {
    if (!(event.target as Element).closest('button')) {
      reset();
      apply();
    }
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
    setAccessibility(handle, {
      role: 'separator',
      label: edgeNames[edge],
      orientation: vertical ? 'horizontal' : 'vertical',
    });
    handle.unsafeElement.title = `${edgeNames[edge]} · Arrow keys to resize`;
    handles.push(handle);
    bindResizable(panel, { handle, edge: resizeEdges[edge], inset: 8 });
  }

  reset();
  observeSize(panel, apply, 'Viewport');
  observeSize(panel, updateHandles);

  return apply;
};
