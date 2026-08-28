import { createFrame, createFrameWithFields, type FrameNode } from '../elements/frame';
import { createTextLabel, type TextLabelNode } from '../elements/text';
import { createUICorner } from '../modifiers/corner';
import { assertBoolean, assertFiniteNumber } from '../runtime/validation';
import { udim2FromOffset, udim2FromScale } from '../values/udim';
import { prefabColors } from './palette';

/** Initial label and normalized value for a progress-bar prefab. */
export type ProgressBarOptions = Readonly<{
  /** Hierarchy name for the progress-bar root. */
  Name?: string;
  /** Optional text shown before the percentage. */
  Label?: string;
  /** Initial normalized progress from zero to one. */
  Value?: number;
  /** Whether the value label includes a percentage. */
  ShowPercentage?: boolean;
}>;

/** A progress hierarchy whose root remains an ordinary FrameKit Frame. */
export type ProgressBarNode = FrameNode &
  Readonly<{
    /** Colored region sized to the current value. */
    fill: FrameNode;
    /** Text rendered over the progress bar. */
    valueLabel: TextLabelNode;
    /** Sets normalized progress from zero to one. */
    setValue(value: number): void;
    /** Returns the current normalized progress. */
    getValue(): number;
  }>;

/** Creates a progress bar controlled by a normalized value from zero to one. */
export function createProgressBar(options: ProgressBarOptions = {}): ProgressBarNode {
  const labelText = options.Label ?? '';
  const showPercentage = options.ShowPercentage ?? true;
  assertBoolean(showPercentage, 'ShowPercentage');
  let value = validateValue(options.Value ?? 0);

  const fill = createFrame({
    Name: 'Fill',
    Size: udim2FromScale(value, 1),
    BackgroundColor3: prefabColors.accent,
  });
  fill.addChild(createUICorner({ CornerRadius: 7 }));

  const valueLabel = createTextLabel({
    Name: 'ValueLabel',
    Size: udim2FromScale(1, 1),
    BackgroundTransparency: 1,
    TextColor3: prefabColors.text,
    TextSize: 12,
    FontWeight: 700,
    ZIndex: 2,
  });

  const renderValue = (): void => {
    fill.Size = udim2FromScale(value, 1);
    valueLabel.Text = formatLabel(labelText, value, showPercentage);
    progressBar.element.setAttribute('aria-valuenow', String(value));
  };
  const setValue = (nextValue: number): void => {
    value = validateValue(nextValue);
    renderValue();
  };

  const progressBar: ProgressBarNode = createFrameWithFields(
    {
      Name: options.Name ?? 'ProgressBar',
      Size: udim2FromOffset(240, 28),
      BackgroundColor3: prefabColors.surface,
      ClipsDescendants: true,
    },
    {
      fill,
      valueLabel,
      setValue,
      getValue: () => {
        void progressBar.Name;
        return value;
      },
    },
  );
  progressBar.addChild(createUICorner({ CornerRadius: 7 }));
  progressBar.addChild(fill);
  progressBar.addChild(valueLabel);
  progressBar.element.setAttribute('role', 'progressbar');
  progressBar.element.setAttribute('aria-valuemin', '0');
  progressBar.element.setAttribute('aria-valuemax', '1');
  renderValue();
  return progressBar;
}

function validateValue(value: number): number {
  assertFiniteNumber(value, 'Progress value');
  if (value < 0 || value > 1) throw new RangeError('Progress value must be between 0 and 1.');
  return value;
}

function formatLabel(label: string, value: number, showPercentage: boolean): string {
  if (!showPercentage) return label;
  const percentage = `${Math.round(value * 100)}%`;
  return label ? `${label} ${percentage}` : percentage;
}
