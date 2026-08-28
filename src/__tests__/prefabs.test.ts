import { describe, expect, it } from 'vitest';

import { fk, fkp } from '..';

describe('prefabs', () => {
  it('creates a modal that is also a regular hierarchy node', () => {
    const gui = fk.createScreenGui();
    const modal = fkp.createModal({ Title: 'Inventory', DismissOnBackdrop: true });

    modal.Parent = gui;
    expect(modal.ClassName).toBe('Frame');
    expect(modal.isOpen()).toBe(false);
    expect(modal.panel.Parent).toBe(modal);
    expect(modal.content.Parent).toBe(modal.panel);
    expect(modal.titleLabel.Text).toBe('Inventory');

    modal.open();
    expect(modal.Visible).toBe(true);
    modal.closeButton.element.click();
    expect(modal.isOpen()).toBe(false);

    modal.open();
    modal.backdrop.element.click();
    expect(modal.isOpen()).toBe(false);

    modal.open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(modal.isOpen()).toBe(false);

    modal.destroy();
    expect(modal.panel.isDestroyed()).toBe(true);
    expect(() => modal.open()).toThrow(/destroyed/);

    const persistent = fkp.createModal({ InitiallyOpen: true, DismissOnBackdrop: false });
    persistent.backdrop.element.click();
    expect(persistent.isOpen()).toBe(true);
    persistent.destroy();
  });

  it('keeps toggle state explicit and accessible', () => {
    const toggle = fkp.createToggle({ Label: 'Music', Checked: true });

    expect(toggle.ClassName).toBe('TextButton');
    expect(toggle.isChecked()).toBe(true);
    expect(toggle.label.Text).toBe('Music');
    expect(toggle.thumb.Position).toEqual(fk.udim2FromOffset(22, 2));
    expect(toggle.element.getAttribute('aria-checked')).toBe('true');

    toggle.element.click();
    expect(toggle.isChecked()).toBe(false);
    expect(toggle.thumb.Position).toEqual(fk.udim2FromOffset(2, 2));
    expect(toggle.element.getAttribute('aria-checked')).toBe('false');

    expect(() => toggle.setChecked('yes' as never)).toThrow(/Checked/);
    expect(toggle.isChecked()).toBe(false);

    const disabled = fkp.createToggle({ Disabled: true });
    disabled.element.click();
    expect(disabled.isChecked()).toBe(false);
  });

  it('updates and validates progress values', () => {
    const progress = fkp.createProgressBar({ Label: 'Loading', Value: 0.25 });

    expect(progress.ClassName).toBe('Frame');
    expect(progress.getValue()).toBe(0.25);
    expect(progress.fill.Size).toEqual(fk.udim2FromScale(0.25, 1));
    expect(progress.valueLabel.Text).toBe('Loading 25%');
    expect(progress.element.getAttribute('aria-valuenow')).toBe('0.25');

    progress.setValue(0.6);
    expect(progress.getValue()).toBe(0.6);
    expect(progress.fill.Size).toEqual(fk.udim2FromScale(0.6, 1));
    expect(progress.valueLabel.Text).toBe('Loading 60%');
    expect(progress.element.getAttribute('aria-valuenow')).toBe('0.6');

    expect(() => progress.setValue(1.1)).toThrow(/between 0 and 1/);
    expect(progress.getValue()).toBe(0.6);

    const unlabeled = fkp.createProgressBar({ Value: 0.5, ShowPercentage: false });
    expect(unlabeled.valueLabel.Text).toBe('');
  });
});
