import {
  bindDialog,
  bindTabs,
  createFrame,
  createObservableValue,
  observeSize,
  setAccessibility,
  udim2,
  udim2FromOffset,
  vector2,
  watchOwnedValue,
  type GuiElement,
  type ObservableValue,
  type ScreenGui,
} from 'framekit';

import type { CanvasPreferences } from './canvas-preferences';
import { codeThemes, type CodeTheme } from './code-themes';
import type { SceneDocument } from './document';
import { createDropdown } from './dropdown';
import { createResolutionControls } from './resolution-controls';
import { button, colors, input, label, panel, round, scroll } from './ui';
import { defaultWorkspace, type WorkspacePreferences } from './workspace';

/** Settings group related choices into small panels, while each preference keeps its existing owner. */
export const createSettingsDialog = (
  app: ScreenGui,
  preferences: ObservableValue<WorkspacePreferences>,
  canvas: ObservableValue<CanvasPreferences>,
  code: Readonly<{ getTheme(): CodeTheme; setTheme(theme: CodeTheme): void }>,
  getDocument: () => SceneDocument,
): Readonly<{ open(opener?: GuiElement): void; close(): void }> => {
  const dialog = createFrame({
    TagName: 'dialog',
    Name: 'Workbench settings',
    Position: udim2(0.5, 0, 0.5, 0),
    AnchorPoint: vector2(0.5, 0.5),
    BackgroundColor3: colors.panel,
    ClipsDescendants: true,
  });
  dialog.Parent = app;
  round(dialog, 12, true);
  setAccessibility(dialog, { label: 'Settings' });
  const title = label(dialog, 'Workbench settings', 36, 22);
  title.Position = udim2FromOffset(20, 14);
  title.Size = udim2(1, -80, 0, 36);
  const close = button(dialog, '×', () => modal.close(), 32);
  close.AccessibleLabel = 'Close settings';
  close.Position = udim2(1, -48, 0, 16);
  const tabs = panel('Settings categories', dialog);
  tabs.Position = udim2FromOffset(16, 64);
  tabs.Size = udim2(1, -32, 0, 34);
  const selection = createObservableValue<'canvas' | 'appearance' | 'layout'>('canvas');
  const resize = (): void => {
    const height =
      selection.get() === 'canvas' ? 700 : selection.get() === 'appearance' ? 360 : 420;
    dialog.Size = udim2FromOffset(
      Math.min(560, window.innerWidth - 24),
      Math.min(height, window.innerHeight - 32),
    );
  };
  dialog.onDestroy(observeSize(dialog, resize, app));
  const sections = (
    [
      ['canvas', 'Canvas'],
      ['appearance', 'Appearance'],
      ['layout', 'Workspace'],
    ] as const
  ).map(([key, name], index) => {
    const tab = button(tabs, name, () => {}, 100);
    tab.Position = udim2(index / 3, 4, 0, 0);
    tab.Size = udim2(1 / 3, -8, 0, 34);
    const viewport = scroll(dialog, `${name} settings`);
    viewport.Position = udim2FromOffset(20, 116);
    viewport.Size = udim2(1, -40, 1, -154);
    const content = panel(`${name} options`, viewport);
    content.Size = udim2(1, -6, 0, key === 'canvas' ? 496 : key === 'appearance' ? 190 : 250);
    return { key, tab, panel: viewport, content };
  });
  bindTabs(tabs, sections, { selection });
  watchOwnedValue(dialog, selection, (key) => {
    resize();
    sections.forEach((section) => {
      section.tab.BackgroundColor3 = section.key === key ? colors.selected : colors.raised;
      section.tab.TextColor3 = section.key === key ? colors.accent : colors.muted;
    });
  });
  const canvasSection = sections[0]!.content;
  const appearance = sections[1]!.content;
  const layout = sections[2]!.content;
  const row = (
    parent: GuiElement,
    text: string,
    y: number,
    control: GuiElement & { Position: ReturnType<typeof udim2>; Size: ReturnType<typeof udim2> },
  ): void => {
    const caption = label(parent, text, 32, 12, colors.muted);
    caption.Position = udim2FromOffset(0, y);
    caption.Size = udim2(0.43, -8, 0, 32);
    control.Position = udim2(0.43, 0, 0, y);
    control.Size = udim2(0.57, 0, 0, 32);
  };
  const uiTheme = createDropdown(appearance, {
    label: 'Workbench theme',
    choices: [
      { value: 'dark', label: 'Dark' },
      { value: 'light', label: 'Light' },
    ] as const,
    value: () => canvas.get().uiTheme,
    change: (uiTheme) => canvas.update((value) => ({ ...value, uiTheme })),
  });
  row(appearance, 'Interface theme', 8, uiTheme.control);
  const codeTheme = createDropdown(appearance, {
    label: 'Code theme',
    choices: codeThemes.map((theme) => ({ value: theme.id, label: theme.label })),
    value: code.getTheme,
    change: code.setTheme,
  });
  row(appearance, 'Code theme', 56, codeTheme.control);
  const appearanceNote = label(
    appearance,
    'Interface and code themes are independent. Both preferences save automatically.',
    64,
    11,
    colors.muted,
  );
  appearanceNote.Position = udim2FromOffset(0, 112);
  appearanceNote.TextWrapped = true;
  watchOwnedValue(dialog, canvas, uiTheme.refresh);

  const toggles = (
    [
      ['grid', 'Canvas grid'],
      ['snapping', 'Canvas snapping'],
      ['guides', 'Alignment guides'],
    ] as const
  ).map(([key, name], index) => {
    const control = button(
      canvasSection,
      'On',
      () => canvas.update((value) => ({ ...value, [key]: !value[key] })),
      80,
    );
    control.AccessibleLabel = name;
    row(canvasSection, name, index * 40, control);
    return { key, control };
  });
  const precision = createDropdown(canvasSection, {
    label: 'Position precision',
    choices: [
      { value: 0, label: 'Whole pixels' },
      { value: 1, label: 'One decimal' },
    ] as const,
    value: () => canvas.get().precision,
    change: (precision) => canvas.update((value) => ({ ...value, precision })),
  });
  row(canvasSection, 'Position precision', 128, precision.control);
  const devices = createResolutionControls(canvasSection, {
    preferences: canvas,
    document: getDocument,
    label: 'Device preview preset',
    orientationLabel: 'Device preview orientation',
  });
  const deviceTitle = label(canvasSection, 'VIEWPORT', 28, 10, colors.muted);
  deviceTitle.Position = udim2FromOffset(0, 180);
  devices.resolution.Position = udim2FromOffset(0, 216);
  devices.resolution.Size = udim2(1, 0, 0, 34);
  row(canvasSection, 'Orientation', 260, devices.orientation);
  const customTitle = label(
    canvasSection,
    'Custom size · width × height in pixels',
    28,
    12,
    colors.muted,
  );
  customTitle.Position = udim2FromOffset(0, 304);
  const deviceWidth = input(canvasSection, 'Custom preview width');
  deviceWidth.Position = udim2FromOffset(0, 338);
  deviceWidth.Size = udim2(0.5, -14, 0, 34);
  const times = label(canvasSection, '×', 34, 14, colors.muted);
  times.Position = udim2(0.5, -7, 0, 338);
  times.Size = udim2FromOffset(14, 34);
  const deviceHeight = input(canvasSection, 'Custom preview height');
  deviceHeight.Position = udim2(0.5, 14, 0, 338);
  deviceHeight.Size = udim2(0.5, -14, 0, 34);
  const deviceHelp = label(
    canvasSection,
    '240–4096 px per side. The saved project size stays unchanged. Present uses this viewport too.',
    52,
    11,
    colors.muted,
  );
  deviceHelp.Position = udim2FromOffset(0, 382);
  deviceHelp.TextWrapped = true;
  for (const [control, key] of [
    [deviceWidth, 'width'],
    [deviceHeight, 'height'],
  ] as const) {
    control.unsafeElement.inputMode = 'numeric';
    const apply = (selectCustom = false): void => {
      const value = Number(control.Text);
      if (!control.Text.trim() || !Number.isInteger(value) || value < 240 || value > 4096) {
        control.unsafeElement.setAttribute('aria-invalid', 'true');
        return;
      }

      control.unsafeElement.removeAttribute('aria-invalid');
      if (!selectCustom && value === canvas.get()[key]) {
        return;
      }
      canvas.update((current) => ({
        ...current,
        device: 'custom',
        landscape: false,
        [key]: value,
      }));
    };
    control.on('blur', () => apply());
    control.on('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        apply(true);
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        control.Text = String(canvas.get()[key]);
        control.unsafeElement.removeAttribute('aria-invalid');
      }
    });
  }
  const zoom = createDropdown(canvasSection, {
    label: 'Canvas zoom',
    choices: [
      { value: 0, label: 'Fit canvas' },
      ...[0.25, 0.5, 0.75, 1, 1.5, 2].map((value) => ({ value, label: `${value * 100}%` })),
    ],
    value: () => preferences.get().zoom,
    change: (zoom) => preferences.update((value) => ({ ...value, zoom })),
  });
  row(canvasSection, 'Canvas zoom', 448, zoom.control);
  watchOwnedValue(dialog, preferences, zoom.refresh);
  watchOwnedValue(dialog, canvas, (value) => {
    precision.refresh();
    toggles.forEach(({ key, control }) => {
      control.Text = value[key] ? 'On' : 'Off';
      control.BackgroundColor3 = value[key] ? colors.selected : colors.raised;
      control.unsafeElement.setAttribute('aria-pressed', String(value[key]));
    });
    if (document.activeElement !== deviceWidth.unsafeElement) {
      deviceWidth.Text = String(value.width);
    }
    if (document.activeElement !== deviceHeight.unsafeElement) {
      deviceHeight.Text = String(value.height);
    }
  });

  const widthTitle = label(layout, 'Panel widths · pixels', 32, 14);
  const left = input(layout, 'Explorer panel width');
  left.Position = udim2FromOffset(0, 44);
  left.Size = udim2(0.5, -6, 0, 34);
  const right = input(layout, 'Inspector panel width');
  right.Position = udim2(0.5, 6, 0, 44);
  right.Size = udim2(0.5, -6, 0, 34);
  widthTitle.Size = udim2(1, 0, 0, 32);
  const message = label(
    layout,
    'Explorer: 200–360 px. Inspector: 260–420 px.',
    54,
    11,
    colors.muted,
  );
  message.Position = udim2FromOffset(0, 88);
  message.TextWrapped = true;
  for (const [control, key, min, max] of [
    [left, 'left', 200, 360],
    [right, 'right', 260, 420],
  ] as const) {
    const apply = (): void => {
      const value = Number(control.Text);
      if (!control.Text.trim() || !Number.isFinite(value) || value < min || value > max) {
        control.unsafeElement.setAttribute('aria-invalid', 'true');
        message.Text = `Enter a width between ${min} and ${max} pixels.`;
        return;
      }
      control.unsafeElement.removeAttribute('aria-invalid');
      preferences.update((current) => ({ ...current, [key]: value }));
      message.Text = 'Explorer: 200–360 px. Inspector: 260–420 px.';
    };
    control.on('blur', apply);
    control.on('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        apply();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        control.Text = String(preferences.get()[key]);
        control.unsafeElement.removeAttribute('aria-invalid');
      }
    });
  }
  watchOwnedValue(dialog, preferences, (value) => {
    if (document.activeElement !== left.unsafeElement) {
      left.Text = String(value.left);
    }
    if (document.activeElement !== right.unsafeElement) {
      right.Text = String(value.right);
    }
  });
  const reset = button(layout, 'Reset panel layout', () => preferences.set(defaultWorkspace), 180);
  reset.Position = udim2FromOffset(0, 156);
  const saved = label(
    dialog,
    'Preferences save automatically in this browser.',
    24,
    10,
    colors.faint,
  );
  saved.Position = udim2(0, 20, 1, -30);
  const modal = bindDialog(dialog, { initialFocus: sections[0]!.tab });
  return {
    close: () => modal.close(),
    open: (opener): void => {
      selection.set('canvas');
      resize();
      sections.forEach((section) => {
        section.panel.CanvasPosition = vector2(0, 0);
      });
      devices.refresh();
      codeTheme.refresh();
      modal.open(opener);
    },
  };
};
