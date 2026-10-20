import { createFrame, createUITextSelection, color3FromRGB } from 'framekit';
import { expect, it } from 'vitest';

it('owns selection colors, validates patches atomically, and restores inherited colors on removal', () => {
  const parent = createFrame();
  const selection = createUITextSelection({ TextColor3: color3FromRGB(255, 255, 255) });
  selection.Parent = parent;
  expect(parent.unsafeElement.style.getPropertyValue('--framekit-selection-text')).toBe(
    'rgb(255 255 255 / 1)',
  );
  expect(() =>
    selection.setProperties({ TextColor3: { R: -1, G: 0, B: 0 }, Enabled: false }),
  ).toThrow(/channels/);
  expect(selection.Enabled).toBe(true);
  selection.Enabled = false;
  expect(parent.unsafeElement.style.getPropertyValue('--framekit-selection-text')).toBe('');
  selection.Enabled = true;
  selection.Parent = undefined;
  expect(parent.unsafeElement.style.getPropertyValue('--framekit-selection-background')).toBe('');
  selection.destroy();
  parent.destroy();
});
