import { createFrame, createTextButton, setAccessibility } from 'framekit';
import { expect, it } from 'vitest';

it('patches semantics, preserves omitted fields, and explicitly removes optional fields', () => {
  const frame = createFrame();
  setAccessibility(frame, { role: 'heading', level: 2, label: 'Inventory', focusable: false });
  setAccessibility(frame, { level: 3 });
  expect(frame.unsafeElement.outerHTML).toContain('role="heading"');
  expect(frame.unsafeElement.getAttribute('aria-level')).toBe('3');
  expect(frame.unsafeElement.getAttribute('aria-label')).toBe('Inventory');
  expect(frame.unsafeElement.tabIndex).toBe(-1);
  setAccessibility(frame, { label: null, focusable: null });
  expect(frame.unsafeElement.hasAttribute('aria-label')).toBe(false);
  expect(frame.unsafeElement.hasAttribute('tabindex')).toBe(false);
  frame.destroy();
});

it('owns stable relationships and uses the existing AccessibleLabel property for controls', () => {
  const button = createTextButton();
  const panel = createFrame();
  setAccessibility(button, { label: 'Open inventory', controls: panel, expanded: false });
  const id = panel.unsafeElement.id;
  expect(id).not.toBe('');
  expect(button.AccessibleLabel).toBe('Open inventory');
  setAccessibility(button, { expanded: true, describedBy: panel });
  expect(button.unsafeElement.getAttribute('aria-controls')).toBe(id);
  expect(button.unsafeElement.getAttribute('aria-describedby')).toBe(id);
  expect(button.unsafeElement.getAttribute('aria-expanded')).toBe('true');
  button.AccessibleLabel = 'Close inventory';
  expect(button.unsafeElement.getAttribute('aria-label')).toBe('Close inventory');
  setAccessibility(button, { label: null, controls: null });
  expect(button.AccessibleLabel).toBe('');
  expect(button.unsafeElement.hasAttribute('aria-controls')).toBe(false);
  button.destroy();
  panel.destroy();
});

it('rejects invalid patches and destroyed relationship targets before changing semantics', () => {
  const frame = createFrame();
  const related = createFrame();
  related.destroy();
  expect(() => setAccessibility(frame, { role: 'heading', level: 0 })).toThrow();
  expect(frame.unsafeElement.hasAttribute('role')).toBe(false);
  expect(() => setAccessibility(frame, { label: 'Invalid', controls: related })).toThrow(/live/);
  expect(frame.unsafeElement.hasAttribute('aria-label')).toBe(false);
  frame.destroy();
});
