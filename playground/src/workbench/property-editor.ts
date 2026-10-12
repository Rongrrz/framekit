import {
  createTextInput,
  createUICorner,
  udim2,
  udim2FromOffset,
  watchOwnedValue,
  type Frame,
  type TextInput,
} from 'framekit';

import { bindThemeColors, fonts, type ThemeValue } from '../theme';
import { createText } from '../ui';
import type { DesignObject, ObjectPatch, WorkbenchModel } from './model';

/** Edits the selected data object without replacing focused text controls. */
export const createPropertyEditor = (
  parent: Frame,
  model: WorkbenchModel,
  theme: ThemeValue,
): void => {
  const title = createText(theme, {
    text: 'Properties',
    size: udim2(1, -32, 0, 32),
    position: udim2FromOffset(16, 16),
    textSize: 18,
    weight: 800,
  });
  title.Parent = parent;
  const identity = createText(theme, {
    text: '',
    size: udim2(1, -32, 0, 26),
    position: udim2FromOffset(16, 48),
    color: 'textMuted',
    textSize: 12,
    font: fonts.mono,
  });
  identity.Parent = parent;
  const fields = [
    ['name', 'Name'],
    ['x', 'X'],
    ['y', 'Y'],
    ['width', 'Width'],
    ['height', 'Height'],
    ['color', 'Color'],
  ] as const;
  const inputs = new Map<keyof ObjectPatch, TextInput>();
  for (const [index, [property, label]] of fields.entries()) {
    createText(theme, {
      text: label,
      size: udim2FromOffset(180, 20),
      position: udim2FromOffset(16, 92 + index * 72),
      color: 'textMuted',
      textSize: 12,
    }).Parent = parent;
    const input = createTextInput({
      Name: `Property:${property}`,
      AccessibleLabel: label,
      Size: udim2(1, -32, 0, 38),
      Position: udim2FromOffset(16, 116 + index * 72),
      TextSize: 14,
      FontFamily: fonts.mono,
    });
    createUICorner({ CornerRadius: 8 }).Parent = input;
    bindThemeColors(input, theme, (palette) => ({
      BackgroundColor3: palette.surfaceRaised,
      TextColor3: palette.text,
    }));
    if (property !== 'name' && property !== 'color') {
      input.unsafeElement.inputMode = 'decimal';
    }
    input.on('focusin', () => model.beginEdit());
    input.on('focusout', () => {
      model.endEdit();
      const selected = model.state
        .get()
        .objects.find((object) => object.id === model.state.get().selectedId)!;
      input.Text = String(selected[property]);
      input.unsafeElement.removeAttribute('aria-invalid');
    });
    input.on('keydown', (event) => {
      if (event.key === 'Enter') {
        input.blur();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        model.cancelEdit();
        input.blur();
      }
    });
    input.onTextChanged((text) => {
      const selectedId = model.state.get().selectedId;
      const value =
        property === 'name' || property === 'color' ? text : text.trim() ? Number(text) : NaN;
      model.patch(selectedId, { [property]: value });
      const actual = model.state.get().objects.find((object) => object.id === selectedId)!;
      input.unsafeElement.setAttribute(
        'aria-invalid',
        String(String(actual[property]) !== String(value)),
      );
    });
    input.Parent = parent;
    inputs.set(property, input);
  }
  watchOwnedValue(parent, model.state, (state) => {
    const selected: DesignObject = state.objects.find((object) => object.id === state.selectedId)!;
    identity.Text = `${selected.kind.toUpperCase()} / ${selected.id}`;
    for (const [property, input] of inputs) {
      if (input.unsafeElement !== input.unsafeElement.ownerDocument.activeElement) {
        input.Text = String(selected[property]);
      }
    }
  });
};
