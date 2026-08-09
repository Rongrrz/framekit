import type { UDim } from '../primitives/udim';

export function udimToCss(value: UDim): string {
  const percent = value.Scale * 100;
  if (value.Offset === 0) return `${percent}%`;
  if (value.Scale === 0) return `${value.Offset}px`;
  const operator = value.Offset < 0 ? '-' : '+';
  return `calc(${percent}% ${operator} ${Math.abs(value.Offset)}px)`;
}
