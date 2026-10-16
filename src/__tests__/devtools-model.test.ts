import { createFrame, createTextButton, color3FromRGB, udim2, vector2 } from 'framekit';
import { expect, it } from 'vitest';

import { formatValue, projectHierarchy, propertyGroup } from '../devtools/model.js';

it('reveals matching descendants with their ancestor paths without changing collapse state', () => {
  const root = createFrame({ Name: 'Project' });
  const panel = createFrame({ Name: 'Checkout' });
  panel.Parent = root;

  const button = createTextButton({ Name: 'Submit' });
  button.Parent = panel;

  const unrelated = createFrame({ Name: 'Other' });
  unrelated.Parent = root;

  const collapsed = new Set([root, panel]);
  expect(projectHierarchy(root, collapsed, '').map((row) => row.node)).toEqual([root]);

  const search = projectHierarchy(root, collapsed, 'textbutton');
  expect(search.map((row) => [row.node, row.level])).toEqual([
    [root, 1],
    [panel, 2],
    [button, 3],
  ]);
  expect(projectHierarchy(root, collapsed, 'missing')).toEqual([]);
  expect(collapsed).toEqual(new Set([root, panel]));
  root.destroy();
});

it('formats FrameKit colors and geometry without raw object notation', () => {
  expect(formatValue(color3FromRGB(118, 237, 173))).toEqual({ text: '#76EDAD', swatch: '#76edad' });
  expect(formatValue(udim2(0.5, -12, 0, 32)).text).toBe('50% − 12px  /  32px');
  expect(formatValue(vector2(1, 2)).text).toBe('1  /  2');
  expect(formatValue(udim2(0, 89.60000000000001, 0, 10.620000000000001)).text).toBe(
    '89.6px  /  10.62px',
  );
  expect(formatValue(false).text).toBe('False');
  expect(propertyGroup('CanvasSize')).toBe('Scrolling');
});
