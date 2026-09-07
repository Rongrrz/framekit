import { describe, expect, it } from 'vitest';

import { fk } from '../../index';
import { createStyleModifier } from '../../runtime/modifier';
import { resetDocumentAfterEach } from '../support/reset-document';

resetDocumentAfterEach();

describe('composing base and modifier styles', () => {
  it('applies, updates, and removes corner and stroke styles through the tree', () => {
    const frame = fk.createTextLabel();
    const corner = fk.createUICorner({ CornerRadius: 12 });
    const stroke = fk.createUIStroke({
      Color: fk.color3FromRGB(10, 20, 30),
      Thickness: 2,
      BorderStrokePosition: 'Inner',
    });

    frame.addChild(corner);
    frame.addChild(stroke);

    expect(frame.element.style.borderRadius).toBe('12px');
    expect(frame.element.style.boxShadow).toContain('inset');
    expect(frame.element.style.boxShadow).toContain('2px');

    corner.setProperties({ CornerRadius: 18 });
    stroke.setProperties({ BorderStrokePosition: 'Center', Thickness: 4 });

    expect(frame.element.style.borderRadius).toBe('18px');
    expect(frame.element.style.boxShadow).toContain('2px');

    corner.setProperties({ Enabled: false });

    expect(frame.element.style.borderRadius).toBe('');

    corner.setProperties({ Enabled: true });
    corner.removeFromParent();

    expect(frame.element.style.borderRadius).toBe('');

    frame.addChild(corner);
    frame.destroy();

    expect(corner.isDestroyed()).toBe(true);
    expect(stroke.isDestroyed()).toBe(true);
  });

  it('composes shadows and strokes without overwriting siblings', () => {
    const frame = fk.createFrame();
    const stroke = fk.createUIStroke({ Color: fk.color3FromRGB(255, 255, 255), Thickness: 2 });
    const shadow = fk.createUIShadow({
      Color: fk.color3FromRGB(10, 20, 30),
      Offset: fk.vector2(4, 8),
      BlurRadius: 12,
    });

    frame.addChild(stroke);
    frame.addChild(shadow);

    expect(frame.element.style.boxShadow).toContain('0px 0px 0px 2px');
    expect(frame.element.style.boxShadow).toContain('4px 8px 12px 0px');

    shadow.setProperties({ Offset: fk.vector2(-2, 6), BlurRadius: 18 });

    expect(frame.element.style.boxShadow).toContain('-2px 6px 18px 0px');
    expect(frame.element.style.boxShadow).toContain('0px 0px 0px 2px');
  });

  it('restores a base style when a property change removes a derived override', () => {
    const frame = fk.createFrame({
      Name: 'Override',
      BackgroundColor3: fk.color3FromRGB(20, 30, 40),
    });
    const conditional = createStyleModifier('Conditional', { Name: 'Conditional' }, (_, target) =>
      target.Name === 'Override' ? { 'background-color': 'rgb(200 100 50)' } : {},
    );

    frame.addChild(conditional);
    expect(frame.element.style.backgroundColor).toContain('200');

    frame.Name = 'Base';

    expect(frame.element.style.backgroundColor).toContain('20');
  });
});
