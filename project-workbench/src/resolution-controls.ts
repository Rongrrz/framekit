import { watchOwnedValue, type GuiElement, type ObservableValue, type TextButton } from 'framekit';

import {
  devicePresets,
  previewResolution,
  resolutionLabel,
  type CanvasPreferences,
  type Resolution,
} from './canvas-preferences';
import { createDropdown } from './dropdown';

/** Each viewport choice includes its orientation so device selection stays in one menu. */
export const createResolutionControls = (
  parent: GuiElement,
  options: Readonly<{
    preferences: ObservableValue<CanvasPreferences>;
    document(): Resolution;
    label: string;
    menuParent?: GuiElement;
    custom?: () => void;
  }>,
): Readonly<{ resolution: TextButton; refresh(): void }> => {
  const choices = devicePresets.flatMap((preset) =>
    (preset.id === 'custom' ? [false] : [false, true]).map((rotated) => ({
      value: `${preset.id}:${rotated}`,
      label: () =>
        `${preset.label} · ${resolutionLabel(
          previewResolution(options.document(), {
            ...options.preferences.get(),
            device: preset.id,
            landscape: rotated,
          }),
        )}`,
    })),
  );
  const resolution = createDropdown(parent, {
    label: options.label,
    width: 300,
    menuParent: options.menuParent ?? parent,
    value: () => `${options.preferences.get().device}:${options.preferences.get().landscape}`,
    choices,
    change: (choice) => {
      const [id, rotated] = choice.split(':');
      const device = devicePresets.find((preset) => preset.id === id)!.id;
      options.preferences.update((value) => ({ ...value, device, landscape: rotated === 'true' }));

      if (device === 'custom') {
        options.custom?.();
      }
    },
  });
  resolution.control.TextSize = 12;
  watchOwnedValue(parent, options.preferences, resolution.refresh);
  return { resolution: resolution.control, refresh: resolution.refresh };
};
