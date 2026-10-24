import {
  bindDialog,
  bindMenu,
  createFrame,
  setAccessibility,
  udim2,
  udim2FromOffset,
  vector2,
  watchOwnedValue,
  type GuiElement,
  type ObservableValue,
  type ScreenGui,
} from 'framekit';

import { devicePresets, type CanvasPreferences } from './canvas-preferences';
import { codeThemes, type CodeTheme } from './code-themes';
import { button, colors, input, label, panel, round, scroll, stack } from './ui';
import { defaultWorkspace, type WorkspacePreferences } from './workspace';

/** Settings operate on the existing workspace and theme owners rather than maintaining copies. */
export const createSettingsDialog = (
  app: ScreenGui,
  preferences: ObservableValue<WorkspacePreferences>,
  canvas: ObservableValue<CanvasPreferences>,
  code: Readonly<{ getTheme(): CodeTheme; setTheme(theme: CodeTheme): void }>,
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
  const title = label(dialog, 'Make yourself at home.', 38, 22);
  title.Position = udim2FromOffset(24, 16);
  title.Size = udim2(1, -80, 0, 38);
  const close = button(dialog, '×', () => modal.close(), 32);
  close.AccessibleLabel = 'Close settings';
  close.Position = udim2(1, -48, 0, 20);
  const viewport = scroll(dialog, 'Settings options');
  viewport.Position = udim2FromOffset(24, 72);
  viewport.Size = udim2(1, -48, 1, -96);
  const content = panel('Settings content', viewport);
  content.Size = udim2(1, -6, 0, 958);
  const toggles = (
    [
      ['grid', 'Canvas grid'],
      ['snapping', 'Canvas snapping'],
      ['guides', 'Alignment guides'],
    ] as const
  ).map(([key, name], index) => {
    const text = label(content, name, 32, 14);
    text.Position = udim2FromOffset(0, index * 48);
    text.Size = udim2(1, -90, 0, 32);
    const control = button(
      content,
      'On',
      () => canvas.update((value) => ({ ...value, [key]: !value[key] })),
      80,
    );
    control.AccessibleLabel = name;
    control.Position = udim2(1, -80, 0, index * 48);
    return { key, control };
  });
  watchOwnedValue(dialog, canvas, (value) => {
    for (const { key, control } of toggles) {
      control.Text = value[key] ? 'On' : 'Off';
      control.unsafeElement.setAttribute('aria-pressed', String(value[key]));
      control.BackgroundColor3 = value[key] ? colors.selected : colors.raised;
    }
  });
  const zoomLabel = label(content, 'Canvas zoom', 30, 14);
  zoomLabel.Position = udim2FromOffset(0, 156);
  const zoomRow = panel('Zoom settings', content);
  zoomRow.Position = udim2FromOffset(0, 192);
  zoomRow.Size = udim2(1, 0, 0, 32);
  stack(zoomRow, 8, true);
  const zoomButtons = [
    { label: 'Fit', value: 0 },
    { label: '100%', value: 1 },
    { label: '50%', value: 0.5 },
  ].map((entry) => ({
    value: entry.value,
    control: button(
      zoomRow,
      entry.label,
      () => preferences.update((value) => ({ ...value, zoom: entry.value })),
      80,
    ),
  }));
  const themeLabel = label(content, 'Code appearance', 30, 14);
  themeLabel.Position = udim2FromOffset(0, 250);
  const themeRow = panel('Theme settings', content);
  themeRow.Position = udim2FromOffset(0, 286);
  themeRow.Size = udim2(1, 0, 0, 108);
  const themeButtons = codeThemes.map((theme, index) => {
    const control = button(themeRow, theme.label, () => {
      code.setTheme(theme.id);
      refreshThemes();
    });
    control.Size = udim2(1, 0, 0, 32);
    control.Position = udim2FromOffset(0, index * 36);
    control.AccessibleLabel = `Code theme ${theme.label}`;
    return { control, id: theme.id };
  });
  const refreshThemes = (): void => {
    for (const { control, id } of themeButtons) {
      const selected = id === code.getTheme();
      control.unsafeElement.setAttribute('aria-pressed', String(selected));
      control.BackgroundColor3 = selected ? colors.selected : colors.raised;
      control.TextColor3 = selected ? colors.accent : colors.text;
    }
  };
  const widthsLabel = label(content, 'Panel widths · pixels', 30, 14);
  widthsLabel.Position = udim2FromOffset(0, 430);
  const left = input(content, 'Explorer panel width');
  left.Position = udim2FromOffset(0, 474);
  left.Size = udim2(0.5, -6, 0, 34);
  const right = input(content, 'Inspector panel width');
  right.Position = udim2(0.5, 6, 0, 474);
  right.Size = udim2(0.5, -6, 0, 34);
  const message = label(
    content,
    'Explorer: 200–360 px. Inspector: 260–420 px. Preferences save in this browser.',
    54,
    11,
    colors.muted,
  );
  message.Position = udim2FromOffset(0, 518);
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
      message.Text =
        'Explorer: 200–360 px. Inspector: 260–420 px. Preferences save in this browser.';
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
  const deviceLabel = label(content, 'Device preview', 30, 14);
  deviceLabel.Position = udim2FromOffset(0, 588);
  const device = button(content, 'Design size', () => {});
  device.AccessibleLabel = 'Device preview preset';
  device.Position = udim2FromOffset(0, 628);
  device.Size = udim2(1, -110, 0, 34);
  const rotate = button(
    content,
    'Rotate',
    () => canvas.update((value) => ({ ...value, landscape: !value.landscape })),
    100,
  );
  rotate.AccessibleLabel = 'Rotate device preview';
  rotate.Position = udim2(1, -100, 0, 628);
  const menu = panel('Device presets', dialog);
  menu.Size = udim2FromOffset(230, devicePresets.length * 38 + 12);
  round(menu, 8, true);
  const options = devicePresets.map((preset, index) => {
    const option = button(
      menu,
      preset.label,
      () => canvas.update((value) => ({ ...value, device: preset.id })),
      214,
    );
    option.Position = udim2FromOffset(8, 6 + index * 38);
    option.BackgroundTransparency = 1;
    return option;
  });
  bindMenu(device, menu, options);
  const deviceWidth = input(content, 'Custom preview width');
  deviceWidth.Position = udim2FromOffset(0, 680);
  deviceWidth.Size = udim2(0.5, -6, 0, 34);
  const deviceHeight = input(content, 'Custom preview height');
  deviceHeight.Position = udim2(0.5, 6, 0, 680);
  deviceHeight.Size = udim2(0.5, -6, 0, 34);
  const deviceHelp = label(
    content,
    'Custom width × height, 240–4096 px. Device preview leaves the saved design size unchanged.',
    64,
    11,
    colors.muted,
  );
  deviceHelp.TextWrapped = true;
  deviceHelp.Position = udim2FromOffset(0, 724);
  for (const [control, key] of [
    [deviceWidth, 'width'],
    [deviceHeight, 'height'],
  ] as const) {
    const apply = (selectCustom = false): void => {
      const value = Number(control.Text);
      if (!control.Text.trim() || !Number.isFinite(value) || value < 240 || value > 4096) {
        control.unsafeElement.setAttribute('aria-invalid', 'true');
        return;
      }
      control.unsafeElement.removeAttribute('aria-invalid');
      if (!selectCustom && value === canvas.get()[key]) {
        return;
      }
      canvas.update((current) => ({ ...current, device: 'custom', [key]: value }));
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
  watchOwnedValue(dialog, canvas, (value) => {
    device.Text = devicePresets.find((preset) => preset.id === value.device)!.label;
    rotate.Disabled = value.device === 'design';
    rotate.unsafeElement.setAttribute('aria-pressed', String(value.landscape));
    if (document.activeElement !== deviceWidth.unsafeElement) {
      deviceWidth.Text = String(value.width);
    }
    if (document.activeElement !== deviceHeight.unsafeElement) {
      deviceHeight.Text = String(value.height);
    }
  });
  const reset = button(content, 'Reset panel layout', () => preferences.set(defaultWorkspace), 180);
  reset.Position = udim2FromOffset(0, 804);
  const precisionLabel = label(content, 'Position precision', 28, 14);
  precisionLabel.Position = udim2FromOffset(0, 852);
  for (const [precision, name] of [
    [0, 'Whole pixels'],
    [1, 'One decimal'],
  ] as const) {
    const control = button(
      content,
      name,
      () => canvas.update((value) => ({ ...value, precision })),
      140,
    );
    control.AccessibleLabel = `Position precision ${name}`;
    control.Position = udim2FromOffset(precision * 148, 892);
    watchOwnedValue(control, canvas, (value) => {
      control.unsafeElement.setAttribute('aria-pressed', String(value.precision === precision));
      control.BackgroundColor3 = value.precision === precision ? colors.selected : colors.raised;
    });
  }
  watchOwnedValue(dialog, preferences, (value) => {
    if (document.activeElement !== left.unsafeElement) {
      left.Text = String(value.left);
    }
    if (document.activeElement !== right.unsafeElement) {
      right.Text = String(value.right);
    }
    for (const { control, value: zoom } of zoomButtons) {
      control.unsafeElement.setAttribute('aria-pressed', String(zoom === value.zoom));
      control.BackgroundColor3 = zoom === value.zoom ? colors.selected : colors.raised;
    }
  });
  const modal = bindDialog(dialog, { initialFocus: toggles[0]!.control });
  return {
    close: (): void => modal.close(),
    open: (opener): void => {
      dialog.Size = udim2FromOffset(
        Math.min(500, window.innerWidth - 24),
        Math.min(700, window.innerHeight - 32),
      );
      viewport.CanvasPosition = vector2(0, 0);
      refreshThemes();
      modal.open(opener);
    },
  };
};
