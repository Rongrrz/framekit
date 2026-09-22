export type StyleLayer = 'modifier' | 'layout' | 'parent-layout';
export type StyleValues = Readonly<{ [property: string]: string | undefined }>;

type ElementStyleState = {
  base: Record<string, string>;
  modifier: Record<string, string>;
  layout: Record<string, string>;
  'parent-layout': Record<string, string>;
  fallback: Record<string, string>;
  rendered: Record<string, string>;
};

const stylesByElement = new WeakMap<HTMLElement, ElementStyleState>();

/** Updates one base style while preserving any active modifier or layout override. */
export function setStyle(element: HTMLElement, property: string, value: string): void {
  const state = getStyleState(element);
  state.base[property] = value;
  renderResolvedProperty(element, state, property);
}

/** Removes one base style and reveals the next owned layer or original inline value. */
export function removeStyle(element: HTMLElement, property: string): void {
  const state = getStyleState(element);
  delete state.base[property];
  renderResolvedProperty(element, state, property);
}

/** Reconciles a complete derived layer without disturbing other style owners. */
export function setStyleLayer(element: HTMLElement, layer: StyleLayer, styles: StyleValues): void {
  const state = getStyleState(element);
  const previousStyles = state[layer];
  const affectedProperties = new Set([...Object.keys(previousStyles), ...Object.keys(styles)]);
  const nextStyles: Record<string, string> = {};

  for (const [property, value] of Object.entries(styles)) {
    if (value === undefined) {
      continue;
    }
    captureFallback(element, state, property);
    nextStyles[property] = value;
  }
  state[layer] = nextStyles;
  for (const property of affectedProperties) {
    renderResolvedProperty(element, state, property);
  }
}

function getStyleState(element: HTMLElement): ElementStyleState {
  const existing = stylesByElement.get(element);
  if (existing) {
    return existing;
  }
  const created: ElementStyleState = {
    base: Object.create(null) as Record<string, string>,
    modifier: Object.create(null) as Record<string, string>,
    layout: Object.create(null) as Record<string, string>,
    'parent-layout': Object.create(null) as Record<string, string>,
    fallback: Object.create(null) as Record<string, string>,
    rendered: Object.create(null) as Record<string, string>,
  };
  stylesByElement.set(element, created);
  return created;
}

function captureFallback(element: HTMLElement, state: ElementStyleState, property: string): void {
  if (hasValue(state.base, property) || hasValue(state.fallback, property)) {
    return;
  }
  const currentValue = element.style.getPropertyValue(property);
  state.fallback[property] = currentValue;
  state.rendered[property] = currentValue;
}

function renderResolvedProperty(
  element: HTMLElement,
  state: ElementStyleState,
  property: string,
): void {
  const value = resolveStyleValue(state, property);
  if (value === undefined) {
    if (!hasValue(state.rendered, property) && !element.style.getPropertyValue(property)) {
      return;
    }
    element.style.removeProperty(property);
    delete state.rendered[property];
    return;
  }
  if (state.rendered[property] === value) {
    return;
  }
  element.style.setProperty(property, value);
  state.rendered[property] = value;
}

function resolveStyleValue(state: ElementStyleState, property: string): string | undefined {
  if (property === 'display' && state.base[property] === 'none') {
    return 'none';
  }
  // A container's own layout must not replace its placement in its parent's layout.
  if (hasValue(state['parent-layout'], property)) {
    return state['parent-layout'][property];
  }
  if (hasValue(state.layout, property)) {
    return state.layout[property];
  }
  if (hasValue(state.modifier, property)) {
    return state.modifier[property];
  }
  if (hasValue(state.base, property)) {
    return state.base[property];
  }
  if (hasValue(state.fallback, property)) {
    return state.fallback[property];
  }
  return undefined;
}

function hasValue(values: Record<string, string>, property: string): boolean {
  return Object.hasOwn(values, property);
}
