import { describe, expect, it } from 'vitest';

import { fk } from '../..';
import { resetDocumentAfterEach } from '../helpers/reset-document';

const { append, color3, createTextLabel, update } = fk;

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
    const text = label.element.querySelector<HTMLElement>('[data-framekit-text]');
    expect(text?.textContent).toBe('Inventory');
    expect(text?.style.fontSize).toBe('24px');
    expect(text?.style.whiteSpace).toBe('pre-wrap');
    expect(label.element.contains(child.element)).toBe(true);
  });
});
