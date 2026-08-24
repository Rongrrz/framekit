import { fk } from 'framekit';

export function scaleSize(
  width: number,
  height: number,
  parentWidth: number,
  parentHeight: number,
): fk.UDim2 {
  return fk.udim2FromScale(width / parentWidth, height / parentHeight);
}

export function scalePosition(
  x: number,
  y: number,
  parentWidth: number,
  parentHeight: number,
): fk.UDim2 {
  return fk.udim2FromScale(x / parentWidth, y / parentHeight);
}
