import { describe, expect, it, vi } from 'vitest';

import { createDefaultGuiObjectProperties, createGuiObjectNode } from '../../core/gui-object';
import { createLayoutModifier, createStyleModifier } from '../../core/node/modifier';
import { fk } from '../../index';
import { resetDocumentAfterEach } from '../support/reset-document';

resetDocumentAfterEach();

describe('composing base and modifier styles', () => {
  it('recomputes parent layout only when layout inputs change', () => {
    const parent = fk.createFrame();
    const child = fk.createFrame();
    const resolveLayout = vi.fn(() => ({ parent: {}, children: [{}] }));
    const layout = createLayoutModifier(
      'TrackedLayout',
      { Name: 'TrackedLayout', Gap: 0 },
      resolveLayout,
    );

    child.Parent = parent;
    layout.Parent = parent;
    resolveLayout.mockClear();

    child.Rotation = 10;
    child.BackgroundTransparency = 0.5;

    expect(resolveLayout).not.toHaveBeenCalled();

    child.LayoutOrder = 2;

    expect(resolveLayout).toHaveBeenCalledOnce();

    layout.setProperties({ Gap: 4 });

    expect(resolveLayout).toHaveBeenCalledTimes(2);
  });

  it('reconciles modifiers without replaying base property renderers', () => {
    const applyProperties = vi.fn();
    const node = createGuiObjectNode({
      className: 'TrackedNode',
      element: document.createElement('div'),
      defaultProperties: { ...createDefaultGuiObjectProperties(), Value: 1 },
      initialProperties: {},
      renderProperties: applyProperties,
    });
    const corner = fk.createUICorner({ CornerRadius: 8 });

    expect(applyProperties).toHaveBeenCalledOnce();

    corner.Parent = node;
    corner.CornerRadius = 12;
    corner.Parent = undefined;

    expect(applyProperties).toHaveBeenCalledOnce();
  });

  it('applies, updates, and removes corner and stroke styles through the tree', () => {
    const frame = fk.createTextLabel();
    const corner = fk.createUICorner({ CornerRadius: 12 });
    const stroke = fk.createUIStroke({
      Color: fk.color3FromRGB(10, 20, 30),
      Thickness: 2,
      BorderStrokePosition: 'Inner',
    });

    corner.Parent = frame;
    stroke.Parent = frame;

    expect(frame.unsafeElement.style.borderRadius).toBe('12px');
    expect(frame.unsafeElement.style.boxShadow).toContain('inset');
    expect(frame.unsafeElement.style.boxShadow).toContain('2px');

    corner.setProperties({ CornerRadius: 18 });
    stroke.setProperties({ BorderStrokePosition: 'Center', Thickness: 4 });

    expect(frame.unsafeElement.style.borderRadius).toBe('18px');
    expect(frame.unsafeElement.style.boxShadow).toContain('2px');

    corner.setProperties({ Enabled: false });

    expect(frame.unsafeElement.style.borderRadius).toBe('');

    corner.setProperties({ Enabled: true });
    corner.Parent = undefined;

    expect(frame.unsafeElement.style.borderRadius).toBe('');

    corner.Parent = frame;
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

    stroke.Parent = frame;
    shadow.Parent = frame;

    expect(frame.unsafeElement.style.boxShadow).toContain('0px 0px 0px 2px');
    expect(frame.unsafeElement.style.boxShadow).toContain('4px 8px 12px 0px');

    shadow.setProperties({ Offset: fk.vector2(-2, 6), BlurRadius: 18 });

    expect(frame.unsafeElement.style.boxShadow).toContain('-2px 6px 18px 0px');
    expect(frame.unsafeElement.style.boxShadow).toContain('0px 0px 0px 2px');
  });

  it('uses the declared composition policy for filter output', () => {
    const frame = fk.createFrame();
    const blur = createStyleModifier('Blur', { Name: 'Blur' }, () => ({
      filter: 'blur(2px)',
    }));
    const contrast = createStyleModifier('Contrast', { Name: 'Contrast' }, () => ({
      filter: 'contrast(1.2)',
    }));

    blur.Parent = frame;
    contrast.Parent = frame;

    expect(frame.unsafeElement.style.filter).toBe('blur(2px) contrast(1.2)');
  });

  it('restores a base style when a property change removes a derived override', () => {
    const frame = fk.createFrame({
      Name: 'Override',
      BackgroundColor3: fk.color3FromRGB(20, 30, 40),
    });
    const conditional = createStyleModifier('Conditional', { Name: 'Conditional' }, (_, target) =>
      target.properties.Name === 'Override' ? { 'background-color': 'rgb(200 100 50)' } : {},
    );

    conditional.Parent = frame;
    expect(frame.unsafeElement.style.backgroundColor).toContain('200');

    frame.BackgroundColor3 = fk.color3FromRGB(40, 50, 60);

    expect(frame.unsafeElement.style.backgroundColor).toContain('200');

    frame.Name = 'Base';

    expect(frame.unsafeElement.style.backgroundColor).toContain('40');
  });
});
