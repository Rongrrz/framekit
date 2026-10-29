import { createScreenGui } from 'framekit';
import { expect, it } from 'vitest';

import {
  createCanvasPreferences,
  previewResolution,
  resolutionLabel,
} from '../src/canvas-preferences';

it('names exact resolutions and applies portrait or landscape consistently to every native orientation', () => {
  const app = createScreenGui();
  const initial = createCanvasPreferences(app).get();
  const document = { width: 960, height: 640 };
  const phone = { ...initial, device: 'phone' as const, landscape: false };
  expect(resolutionLabel(previewResolution(document, phone))).toBe('390 × 844 px · Portrait');
  expect(previewResolution(document, { ...phone, landscape: true })).toEqual({
    width: 844,
    height: 390,
  });
  const desktop = { ...initial, device: 'desktop' as const, landscape: false };
  expect(previewResolution(document, desktop)).toEqual({
    width: 1440,
    height: 900,
  });
  expect(previewResolution(document, { ...desktop, landscape: true })).toEqual({
    width: 900,
    height: 1440,
  });
  expect(
    previewResolution(document, { ...phone, device: 'custom', width: 900, height: 900 }),
  ).toEqual({ width: 900, height: 900 });
  expect(previewResolution(document, { ...phone, device: 'design', landscape: true })).toEqual({
    width: 640,
    height: 960,
  });
  app.destroy();
});
