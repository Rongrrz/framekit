import { UDim } from '../primitives/UDim';

export function udimToCss(value: UDim): string {
  const percent = value.Scale * 100;
  if (value.Offset === 0) return `${percent}%`;
  if (value.Scale === 0) return `${value.Offset}px`;
  const operator = value.Offset < 0 ? '-' : '+';
  return `calc(${percent}% ${operator} ${Math.abs(value.Offset)}px)`;
}

export interface DomBacked {
  readonly Element: HTMLElement;
}

export function isDomBacked(instance: unknown): instance is DomBacked {
  return typeof instance === 'object' && instance !== null && 'Element' in instance;
}
