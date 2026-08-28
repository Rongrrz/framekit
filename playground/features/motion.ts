import { fk, fka } from 'framekit';

import { colors } from '../theme';

export const motionModes = [
  { key: 'calm', label: 'CALM', accent: colors.mint, rotation: 0, scale: 1 },
  { key: 'focus', label: 'FOCUS', accent: colors.violet, rotation: -5, scale: 1.08 },
  { key: 'play', label: 'PLAY', accent: colors.coral, rotation: 7, scale: 0.94 },
  { key: 'orbit', label: 'ORBIT', accent: colors.amber, rotation: 11, scale: 0.86 },
] as const;

export type MotionMode = (typeof motionModes)[number]['key'];
export type MotionGoal = (typeof motionModes)[number];
export type MotionPositions = Readonly<Record<MotionMode, fk.UDim2>>;

type MotionDemoOptions = Readonly<{
  card: fk.FrameNode;
  scale: fk.UIScaleNode;
  selectedMode: fk.Value<MotionMode>;
  positions: MotionPositions;
  onMoving?: (goal: MotionGoal) => void;
  onSettled?: () => void;
}>;

/** Connects device-specific motion views to one shared spring demonstration. */
export function bindMotionDemo(options: MotionDemoOptions): void {
  const controller = fka.spring(options.card);
  controller.completed.subscribe(() => options.onSettled?.());

  options.card.watch(options.selectedMode, (mode) => {
    const goal = motionModes.find((candidate) => candidate.key === mode);
    if (!goal) return;

    options.onMoving?.(goal);
    fka.spring(options.card, {
      Position: options.positions[mode],
      Rotation: goal.rotation,
      BackgroundColor3: goal.accent,
    });
    fka.spring(options.scale, { Scale: goal.scale });
  });
}
