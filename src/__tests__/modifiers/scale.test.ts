import { createFrame, createUIScale, udim2FromOffset } from 'framekit';
import { describe, expect, it } from 'vitest';

import { resetDocumentAfterEach } from '../support/reset-document.js';

resetDocumentAfterEach();

describe('visual scaling', () => {
  it('scales visually without changing requested size', () => {
    const frame = createFrame();
    const scale = createUIScale({ Scale: 1.1 });

    scale.Parent = frame;

    expect(frame.unsafeElement.style.getPropertyValue('scale')).toBe('1.1');
    expect(frame.Size).toEqual(udim2FromOffset(100, 100));

    scale.setProperties({ Scale: 0.8 });

    expect(frame.unsafeElement.style.getPropertyValue('scale')).toBe('0.8');
    expect(() => scale.setProperties({ Scale: Number.NaN })).toThrow(/finite/);

    scale.Parent = undefined;

    expect(frame.unsafeElement.style.getPropertyValue('scale')).toBe('');
  });
});
