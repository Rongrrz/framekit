import { describe, expect, it } from 'vitest';

import { append, color3, createTextLabel, update } from '../..';
import { resetDocumentAfterEach } from '../helpers/reset-document';

resetDocumentAfterEach();

describe('text labels', () => {
  it('synchronizes text properties without replacing node children', () => {
    const label = createTextLabel();
    const child = createTextLabel();
    append(label, child);
    update(label, {
      Text: 'Inventory',
      TextColor3: color3(10, 20, 30),
      TextSize: 24,
      TextWrapped: true,
      TextXAlignment: 'Left',
    });
    expect(label.element.querySelector('[data-framekit-text]')?.textContent).toBe('Inventory');
    expect(label.element.querySelector<HTMLElement>('[data-framekit-text]')?.style.fontSize).toBe(
      '24px',
    );
    expect(label.element.contains(child.element)).toBe(true);
  });
});
