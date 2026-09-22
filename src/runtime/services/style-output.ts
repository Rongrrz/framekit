/** CSS declarations currently supported by FrameKit modifiers and layouts. */
export type StyleProperty =
  | `--${string}`
  | 'align-content'
  | 'align-items'
  | 'aspect-ratio'
  | 'background-color'
  | 'background-image'
  | 'border-radius'
  | 'box-shadow'
  | 'display'
  | 'filter'
  | 'flex-direction'
  | 'flex-shrink'
  | 'flex-wrap'
  | 'gap'
  | 'height'
  | 'justify-content'
  | 'left'
  | 'max-height'
  | 'max-width'
  | 'order'
  | 'padding-bottom'
  | 'padding-left'
  | 'padding-right'
  | 'padding-top'
  | 'position'
  | 'scale'
  | 'top'
  | 'transform'
  | 'transform-origin'
  | 'width';

/** Typed CSS output returned by style and layout resolvers. */
export type Styles = Readonly<Partial<Record<StyleProperty, string>>>;

type Composition = 'comma-separated' | 'space-separated';

const compositionByProperty = new Map<StyleProperty, Composition>([
  ['background-image', 'comma-separated'],
  ['box-shadow', 'comma-separated'],
  ['filter', 'space-separated'],
  ['transform', 'space-separated'],
]);

/** Combines modifier output according to the CSS grammar of each composable property. */
export function composeStyles(...sources: readonly Styles[]): Styles {
  const composed: Partial<Record<StyleProperty, string>> = {};

  for (const source of sources) {
    for (const property of Object.keys(source) as StyleProperty[]) {
      const value = source[property];
      if (value === undefined) {
        continue;
      }
      const previousValue = composed[property];
      const separator = resolveSeparator(property);
      composed[property] =
        previousValue && value && separator ? `${previousValue}${separator}${value}` : value;
    }
  }

  return composed;
}

function resolveSeparator(property: StyleProperty): string | undefined {
  const composition = compositionByProperty.get(property);
  if (composition === 'comma-separated') {
    return ', ';
  }
  if (composition === 'space-separated') {
    return ' ';
  }
  return undefined;
}
