import { watchOwnedValue, type GuiElement, type ObservableValue, type TextButton } from 'framekit';

import {
  devicePresets,
  previewResolution,
  resolutionLabel,
  resolutionOrientation,
  withOrientation,
  type CanvasPreferences,
  type Resolution,
} from './canvas-preferences';
import { createDropdown } from './dropdown';

/** Resolution and orientation share one preference owner in the editor, Settings and Present. */
export const createResolutionControls = (
  parent: GuiElement,
  options: Readonly<{
    preferences: ObservableValue<CanvasPreferences>;
    document(): Resolution;
    label: string;
    orientationLabel: string;
    menuParent?: GuiElement;
    custom?: () => void;
  }>,
): Readonly<{ resolution: TextButton; orientation: TextButton; refresh(): void }> => {
  const resolution = createDropdown(parent, {
    label: options.label,
    width: 330,
    menuParent: options.menuParent ?? parent,
    value: () => options.preferences.get().device,
    choices: devicePresets.map((preset) => ({
      value: preset.id,
      label: () => {
        const preferences = options.preferences.get();
        const size = previewResolution(options.document(), {
          ...preferences,
          device: preset.id,
          landscape: preferences.device === preset.id && preferences.landscape,
        });
        return `${preset.label} · ${resolutionLabel(size)}`;
      },
    })),
    change: (device) => {
      options.preferences.update((value) => ({ ...value, device, landscape: false }));

      if (device === 'custom') {
        options.custom?.();
      }
    },
  });
  resolution.control.TextSize = 12;
  const orientation = createDropdown(parent, {
    label: options.orientationLabel,
    width: 130,
    menuParent: options.menuParent ?? parent,
    choices: [
      { value: 'Portrait', label: 'Portrait' },
      { value: 'Landscape', label: 'Landscape' },
    ] as const,
    value: () =>
      resolutionOrientation(previewResolution(options.document(), options.preferences.get())) ===
      'Portrait'
        ? 'Portrait'
        : 'Landscape',
    change: (value) =>
      options.preferences.update((current) => withOrientation(options.document(), current, value)),
  });
  const refresh = (): void => {
    resolution.refresh();
    orientation.refresh();
    const square =
      resolutionOrientation(previewResolution(options.document(), options.preferences.get())) ===
      'Square';
    orientation.control.Disabled = square;

    if (square) {
      orientation.control.Text = 'Square';
      orientation.control.unsafeElement.title = `${options.orientationLabel}: Square`;
      orientation.control.unsafeElement.setAttribute('aria-description', 'Square');
    }
  };
  watchOwnedValue(parent, options.preferences, refresh);
  return { resolution: resolution.control, orientation: orientation.control, refresh };
};
