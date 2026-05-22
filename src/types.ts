import type { Enum } from './enums';

type ValueOf<T> = T[keyof T];

export type LineJoinMode = ValueOf<typeof Enum.LineJoinMode>;
export type BorderStrokePosition = ValueOf<typeof Enum.BorderStrokePosition>;
