import type { ReactElement } from 'react';

import type { Enum } from './enums';

type ValueOf<T> = T[keyof T];

export type LineJoinMode = ValueOf<typeof Enum.LineJoinMode>;
export type BorderStrokePosition = ValueOf<typeof Enum.BorderStrokePosition>;

export type NonTextChild = ReactElement | false | null | undefined;
export type NonTextChildren = NonTextChild | NonTextChild[];

export type Callable = (...args: any[]) => unknown;

export interface GuiButtonProps {
  MouseButton1Click?: Callable;
  MouseButton1Down?: Callable;
  MouseButton1Up?: Callable;
  MouseButton2Click?: Callable;
  MouseButton2Down?: Callable;
  MouseButton2Up?: Callable;
}
