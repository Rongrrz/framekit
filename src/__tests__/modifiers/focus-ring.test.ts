import { createFrame, createUIFocusRing } from 'framekit';
import { expect, it } from 'vitest';

it('owns a focus decoration without changing focusability or retaining styles after removal', () => {
  const parent = createFrame();
  const other = createFrame();
  const ring = createUIFocusRing({ Thickness: 3, Offset: 4 });
  ring.Parent = parent;
  expect(parent.unsafeElement.style.getPropertyValue('--framekit-focus-outline')).toContain(
    '3px solid',
  );
  expect(parent.unsafeElement.tabIndex).toBe(-1);
  expect(() => ring.setProperties({ Thickness: -1, Offset: 8 })).toThrow(/Thickness/);
  expect(ring.Offset).toBe(4);

  ring.Enabled = false;
  expect(parent.unsafeElement.style.getPropertyValue('--framekit-focus-outline')).toBe('');
  ring.Enabled = true;
  ring.Parent = other;
  expect(parent.unsafeElement.style.getPropertyValue('--framekit-focus-outline')).toBe('');
  expect(other.unsafeElement.style.getPropertyValue('--framekit-focus-offset')).toBe('4px');
  ring.destroy();
  expect(other.unsafeElement.style.getPropertyValue('--framekit-focus-outline')).toBe('');
  parent.destroy();
  other.destroy();
});
