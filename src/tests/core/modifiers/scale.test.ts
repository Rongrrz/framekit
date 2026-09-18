import { describe, expect, it } from 'vitest';

import { fk } from '../../../index';
import { resetDocumentAfterEach } from '../../support/reset-document';

resetDocumentAfterEach();

describe('visual scaling', () => {
  it('scales visually without changing requested size', () => {
    const frame = fk.createFrame();
    const scale = fk.createUIScale({ Scale: 1.1 });

    scale.Parent = frame;

    expect(frame.unsafeElement.style.getPropertyValue('scale')).toBe('1.1');
    expect(frame.Size).toEqual(fk.udim2FromOffset(100, 100));

    scale.setProperties({ Scale: 0.8 });

    expect(frame.unsafeElement.style.getPropertyValue('scale')).toBe('0.8');
    expect(() => scale.setProperties({ Scale: Number.NaN })).toThrow(/finite/);

    scale.Parent = undefined;

    expect(frame.unsafeElement.style.getPropertyValue('scale')).toBe('');
  });
});
