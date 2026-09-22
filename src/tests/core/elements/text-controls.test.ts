import { describe, expect, it, vi } from 'vitest';

import {
  color3FromRGB,
  createFrame,
  createTextArea,
  createTextInput,
  createUICorner,
} from '../../../index.js';
import { resetDocumentAfterEach } from '../../support/reset-document.js';

resetDocumentAfterEach();

describe('native text controls', () => {
  it('synchronizes a native input with Text and typed change events', () => {
    const input = createTextInput({
      PlaceholderText: 'Email address',
      InputType: 'Email',
      FieldName: 'email',
      AutoComplete: 'email',
      AccessibleLabel: 'Account email',
    });
    const changed = vi.fn();

    input.onTextChanged(changed);
    input.unsafeElement.value = 'hello@example.com';
    input.unsafeElement.dispatchEvent(new InputEvent('input', { bubbles: true }));

    expect(input.unsafeElement.tagName).toBe('INPUT');
    expect(input.unsafeElement.type).toBe('email');
    expect(input.unsafeElement.placeholder).toBe('Email address');
    expect(input.unsafeElement.name).toBe('email');
    expect(input.unsafeElement.autocomplete).toBe('email');
    expect(input.unsafeElement.getAttribute('aria-label')).toBe('Account email');
    expect(input.Text).toBe('hello@example.com');
    expect(changed).toHaveBeenCalledWith('hello@example.com', expect.any(InputEvent));
    expect('onClick' in input).toBe(false);

    input.Text = 'next@example.com';

    expect(input.unsafeElement.value).toBe('next@example.com');
    expect(changed).toHaveBeenCalledOnce();
  });

  it('uses a native textarea for multiline text', () => {
    const area = createTextArea({
      Text: 'First\nSecond',
      PlaceholderText: 'Write something…',
      ResizeDirection: 'Vertical',
    });

    expect(area.unsafeElement.tagName).toBe('TEXTAREA');
    expect(area.unsafeElement.value).toBe('First\nSecond');
    expect(area.unsafeElement.wrap).toBe('soft');
    expect(area.unsafeElement.style.resize).toBe('vertical');
    expect(area.TextWrapped).toBe(true);
    expect(area.TextYAlignment).toBe('Top');

    area.unsafeElement.value = '<b>Plain text</b>\nThird';
    area.unsafeElement.dispatchEvent(new InputEvent('input', { bubbles: true }));

    expect(area.Text).toBe('<b>Plain text</b>\nThird');
    expect(area.unsafeElement.querySelector('b')).toBeNull();
  });

  it('maps disabled, readonly, and placeholder presentation to native state', () => {
    const input = createTextInput({
      Disabled: true,
      ReadOnly: true,
      PlaceholderColor3: color3FromRGB(10, 20, 30),
      PlaceholderTransparency: 0.25,
    });

    expect(input.unsafeElement.disabled).toBe(true);
    expect(input.unsafeElement.readOnly).toBe(true);
    expect(input.unsafeElement.style.cursor).toBe('not-allowed');
    expect(input.unsafeElement.style.getPropertyValue('--framekit-placeholder-color')).toContain(
      '10',
    );

    input.setProperties({ Disabled: false, ReadOnly: false });

    expect(input.unsafeElement.disabled).toBe(false);
    expect(input.unsafeElement.readOnly).toBe(false);
    expect(input.unsafeElement.style.cursor).toBe('text');
  });

  it('rejects unsupported native modes without corrupting current state', () => {
    const input = createTextInput({ InputType: 'Search' });
    const area = createTextArea({ ResizeDirection: 'Both' });

    expect(() => input.setProperties({ InputType: 'Date' } as never)).toThrow(/InputType/);
    expect(() => area.setProperties({ ResizeDirection: 'Diagonal' } as never)).toThrow(
      /ResizeDirection/,
    );
    expect(input.InputType).toBe('Search');
    expect(input.unsafeElement.type).toBe('search');
    expect(area.ResizeDirection).toBe('Both');
    expect(area.unsafeElement.style.resize).toBe('both');
  });

  it('accepts modifiers but rejects GUI children that native controls cannot contain', () => {
    const input = createTextInput();
    const corner = createUICorner();
    const child = createFrame();

    corner.Parent = input;

    expect(input.getChildren()).toEqual([corner]);
    expect(() => (child.Parent = input)).toThrow(/cannot contain GUI children/);
    expect(input.getChildren()).toEqual([corner]);
    expect(child.Parent).toBeUndefined();
  });

  it.each([
    ['input', createTextInput],
    ['textarea', createTextArea],
  ] as const)(
    'synchronizes %s before notifying edit observers and releases them on destruction',
    (_, createControl) => {
      const control = createControl();
      const observed: string[] = [];
      control.onTextChanged(() => observed.push(control.Text));
      control.unsafeElement.value = 'edited';
      control.unsafeElement.dispatchEvent(new InputEvent('input'));
      expect(observed).toEqual(['edited']);
      control.destroy();
      control.unsafeElement.value = 'too late';
      expect(() => control.unsafeElement.dispatchEvent(new InputEvent('input'))).not.toThrow();
      expect(observed).toEqual(['edited']);
    },
  );
});
