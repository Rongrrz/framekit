import {
  color3FromHex,
  createFrame,
  createScrollingFrame,
  createUIScale,
  createUIShadow,
  observeSize,
  setAccessibility,
  udim2,
  udim2FromOffset,
  vector2,
  watchOwnedValue,
  type Frame,
  type ObservableValue,
  type GuiElement,
} from 'framekit';

import { deviceDocument, type CanvasPreferences } from './canvas-preferences';
import { themeChromeNode } from './chrome-theme';
import type { Editor } from './editor';
import { bindSelectionOverlay } from './selection-overlay';
import { colors, label, panel } from './ui';

/** Zero zoom means fit; panel widths remain preferences when the compact layout takes over. */
export type WorkspacePreferences = Readonly<{
  left: number;
  right: number;
  zoom: number;
  pane: 'hierarchy' | 'canvas' | 'properties';
}>;

export const defaultWorkspace: WorkspacePreferences = {
  left: 240,
  right: 320,
  zoom: 0,
  pane: 'canvas',
};

/** Splitters own pointer capture and publish widths through the same path as keyboard resizing. */
const bindSplitter = (
  handle: Frame,
  side: 'left' | 'right',
  preferences: ObservableValue<WorkspacePreferences>,
): void => {
  setAccessibility(handle, {
    role: 'separator',
    label: side === 'left' ? 'Explorer width' : 'Properties width',
    orientation: 'vertical',
    focusable: true,
    valueMin: side === 'left' ? 200 : 260,
    valueMax: side === 'left' ? 360 : 420,
  });
  let drag: Readonly<{ id: number; x: number; width: number }> | undefined;

  const resize = (width: number): void => {
    const min = side === 'left' ? 200 : 260;
    const max = side === 'left' ? 360 : 420;
    preferences.update((current) => ({ ...current, [side]: Math.max(min, Math.min(max, width)) }));
  };

  const finish = (): void => {
    const pointer = drag;
    drag = undefined;

    if (pointer && handle.unsafeElement.hasPointerCapture(pointer.id)) {
      handle.releasePointerCapture(pointer.id);
    }
  };

  handle.on('pointerdown', (event) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    handle.focus();
    drag = { id: event.pointerId, x: event.clientX, width: preferences.get()[side] };
    handle.setPointerCapture(event.pointerId);
  });
  handle.on('pointermove', (event) => {
    if (drag && event.pointerId === drag.id) {
      resize(drag.width + (event.clientX - drag.x) * (side === 'left' ? 1 : -1));
    }
  });
  handle.on('pointerup', finish);
  handle.on('pointercancel', finish);
  handle.on('lostpointercapture', () => {
    drag = undefined;
  });
  handle.onDestroy(finish);
  handle.on('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      resize(
        preferences.get()[side] +
          (event.key === 'ArrowRight' ? 1 : -1) *
            (side === 'left' ? 1 : -1) *
            (event.shiftKey ? 1 : 10),
      );
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      resize(event.key === 'Home' ? 0 : 1000);
    }
  });
  watchOwnedValue(handle, preferences, (value) =>
    setAccessibility(handle, { valueNow: value[side] }),
  );
};

/** The shell owns responsive geometry; the editable artboard keeps its own coordinate system. */
export const createWorkspace = (
  app: GuiElement,
  editor: Editor,
  preferences: ObservableValue<WorkspacePreferences>,
  canvasPreferences: ObservableValue<CanvasPreferences>,
): Readonly<{
  hierarchy: Frame;
  properties: Frame;
  canvas: Frame;
  viewport: ReturnType<typeof createScrollingFrame>;
  zoomLabel: ReturnType<typeof label>;
}> => {
  const body = panel('Workspace', app, colors.canvas);
  body.Position = udim2FromOffset(0, 104);
  body.Size = udim2(1, 0, 1, -132);
  const hierarchy = panel('Explorer panel', body);
  const properties = panel('Properties panel', body);
  const viewport = createScrollingFrame({
    Name: 'Canvas viewport',
    ScrollingDirection: 'XY',
    ScrollBarThickness: 8,
    ScrollBarImageColor3: colors.border,
    BackgroundColor3: colors.canvas,
    CanvasSize: udim2FromOffset(1000, 680),
  });
  viewport.Parent = body;
  themeChromeNode(viewport);
  viewport.unsafeElement.dataset.workbenchGrid = '';
  setAccessibility(viewport, { role: 'region', label: 'Design canvas', focusable: true });
  const caption = label(viewport, 'CANVAS', 20, 10, colors.faint);
  caption.LetterSpacing = 1.2;
  const world = panel('Artboard bounds', viewport);
  world.ClipsDescendants = true;
  createUIShadow({
    Color: color3FromHex('#000000'),
    Transparency: 0.55,
    BlurRadius: 48,
    Offset: vector2(0, 16),
  }).Parent = world;
  const canvas = createFrame({
    Name: 'Scene canvas',
    BackgroundColor3: color3FromHex('#f3f6f3'),
  });
  canvas.Parent = world;
  const scale = createUIScale();
  scale.Parent = canvas;
  bindSelectionOverlay(world, canvas);
  const leftHandle = panel('Explorer splitter', body, colors.border);
  const rightHandle = panel('Properties splitter', body, colors.border);
  leftHandle.unsafeElement.dataset.workbenchSplitter = '';
  rightHandle.unsafeElement.dataset.workbenchSplitter = '';
  bindSplitter(leftHandle, 'left', preferences);
  bindSplitter(rightHandle, 'right', preferences);
  const zoomLabel = label(app, '', 26, 10, colors.muted);
  zoomLabel.Position = udim2(1, -230, 1, -27);
  zoomLabel.Size = udim2FromOffset(214, 26);
  zoomLabel.TextXAlignment = 'Right';

  const layout = (): void => {
    const width = app.AbsoluteSize.X || window.innerWidth;
    const prefs = preferences.get();
    const compact = width < 1060;
    const height = Math.max(0, (app.AbsoluteSize.Y || window.innerHeight) - (compact ? 180 : 132));
    body.Size = udim2(1, 0, 1, compact ? -180 : -132);
    const left = compact ? 0 : prefs.left;
    const right = compact ? 0 : prefs.right;
    const available = Math.max(0, width - left - right - (compact ? 0 : 10));
    hierarchy.setProperties({
      Visible: !compact || prefs.pane === 'hierarchy',
      Position: udim2FromOffset(0, 0),
      Size: udim2(compact ? 1 : 0, compact ? 0 : left, 1, 0),
    });
    properties.setProperties({
      Visible: !compact || prefs.pane === 'properties',
      Position: compact ? udim2FromOffset(0, 0) : udim2(1, -right, 0, 0),
      Size: udim2(compact ? 1 : 0, compact ? 0 : right, 1, 0),
    });
    viewport.setProperties({
      Visible: !compact || prefs.pane === 'canvas',
      Position: udim2FromOffset(compact ? 0 : left + 5, 0),
      Size: udim2FromOffset(available, height),
    });
    leftHandle.setProperties({
      Visible: !compact,
      Position: udim2FromOffset(left, 0),
      Size: udim2(0, 5, 1, 0),
    });
    rightHandle.setProperties({
      Visible: !compact,
      Position: udim2(1, -right - 5, 0, 0),
      Size: udim2(0, 5, 1, 0),
    });
    const snapshot = editor.state.get();
    const document = deviceDocument(snapshot.document, canvasPreferences.get(), snapshot.prefabId);
    const zoom =
      prefs.zoom ||
      Math.max(
        0.1,
        Math.min(1, (available - 64) / document.width, (height - 100) / document.height),
      );
    scale.Scale = zoom;
    // UIScale scales about the center, so offset the unscaled box without an anchor transform.
    canvas.Position = udim2FromOffset(
      (document.width * zoom - document.width) / 2,
      (document.height * zoom - document.height) / 2,
    );
    world.Size = udim2FromOffset(document.width * zoom, document.height * zoom);
    const x = Math.max(24, (available - document.width * zoom) / 2);
    const y = Math.max(54, (height - document.height * zoom) / 2);
    world.Position = udim2FromOffset(x, y);
    caption.Position = udim2FromOffset(x, y - 28);
    caption.Size = udim2FromOffset(document.width * zoom, 20);
    caption.Text = `${document.name.toUpperCase()}  /  ${document.width} × ${document.height}`;
    viewport.CanvasSize = udim2FromOffset(
      Math.max(available, x + document.width * zoom + 24),
      Math.max(height, y + document.height * zoom + 24),
    );
    zoomLabel.Text = `${Math.round(zoom * 100)}%${prefs.zoom ? '' : ' · Fit'}     ${document.width} × ${document.height}`;
  };

  watchOwnedValue(app, preferences, layout);
  watchOwnedValue(app, editor.state, layout);
  watchOwnedValue(app, canvasPreferences, layout);
  const stop = observeSize(app, layout);
  app.onDestroy(stop);
  return { hierarchy, properties, canvas, viewport, zoomLabel };
};
