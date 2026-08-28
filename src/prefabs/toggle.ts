import { createFrame, type FrameNode } from '../elements/frame';
import {
  createTextButtonWithFields,
  createTextLabel,
  type TextButtonNode,
  type TextLabelNode,
} from '../elements/text';
import { createUICorner } from '../modifiers/corner';
import { assertBoolean } from '../runtime/validation';
import { udim2, udim2FromOffset } from '../values/udim';
import { prefabColors } from './palette';

/** Initial label and state for a toggle prefab. */
export type ToggleOptions = Readonly<{
  /** Hierarchy name for the toggle root. */
  Name?: string;
  /** Text displayed beside the switch. */
  Label?: string;
  /** Initial on/off state. */
  Checked?: boolean;
  /** Whether user interaction starts disabled. */
  Disabled?: boolean;
}>;

/** A labeled switch whose root remains an ordinary TextButton. */
export type ToggleNode = TextButtonNode &
  Readonly<{
    /** Editable text label beside the switch. */
    label: TextLabelNode;
    /** Background track whose color reflects the current state. */
    track: FrameNode;
    /** Sliding indicator within the track. */
    thumb: FrameNode;
    /** Sets the on/off state. */
    setChecked(checked: boolean): void;
    /** Reverses the current on/off state. */
    toggle(): void;
    /** Returns the current on/off state. */
    isChecked(): boolean;
  }>;

/** Creates an accessible labeled on/off switch. */
export function createToggle(options: ToggleOptions = {}): ToggleNode {
  let checked = options.Checked ?? false;
  assertBoolean(checked, 'Checked');
  const labelText = options.Label ?? 'Toggle';

  const label = createTextLabel({
    Name: 'Label',
    Text: labelText,
    Size: udim2(1, -56, 1, 0),
    BackgroundTransparency: 1,
    TextColor3: prefabColors.text,
    TextSize: 14,
    TextXAlignment: 'Left',
  });
  const track = createFrame({
    Name: 'Track',
    Size: udim2FromOffset(44, 24),
    Position: udim2(1, -44, 0.5, -12),
    BackgroundColor3: prefabColors.surface,
  });
  track.addChild(createUICorner({ CornerRadius: 12 }));

  const thumb = createFrame({
    Name: 'Thumb',
    Size: udim2FromOffset(20, 20),
    BackgroundColor3: prefabColors.text,
  });
  thumb.addChild(createUICorner({ CornerRadius: 10 }));
  track.addChild(thumb);

  const renderCheckedState = (): void => {
    track.BackgroundColor3 = checked ? prefabColors.accent : prefabColors.surface;
    thumb.Position = udim2FromOffset(checked ? 22 : 2, 2);
    toggleNode.element.setAttribute('aria-checked', String(checked));
  };
  const setChecked = (nextChecked: boolean): void => {
    assertBoolean(nextChecked, 'Checked');
    checked = nextChecked;
    renderCheckedState();
  };

  const toggleNode: ToggleNode = createTextButtonWithFields(
    {
      Name: options.Name ?? 'Toggle',
      Text: '',
      Size: udim2FromOffset(200, 32),
      BackgroundTransparency: 1,
      Disabled: options.Disabled ?? false,
    },
    {
      label,
      track,
      thumb,
      setChecked,
      toggle: () => setChecked(!checked),
      isChecked: () => {
        void toggleNode.Name;
        return checked;
      },
    },
  );
  toggleNode.element.setAttribute('role', 'switch');
  toggleNode.element.setAttribute('aria-label', labelText);
  toggleNode.addChild(label);
  toggleNode.addChild(track);
  renderCheckedState();
  toggleNode.onClick(() => toggleNode.toggle());
  return toggleNode;
}
