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
  const properties = Object.keys(styles);
  const nextStyles = Object.create(null) as Record<string, string>;

  for (const property of properties) {
    const value = styles[property];
    if (value === undefined) {
      continue;
    }
    captureFallback(element, state, property);
    nextStyles[property] = value;
  }
  state[layer] = nextStyles;
  for (const property of Object.keys(previousStyles)) {
    renderResolvedProperty(element, state, property);
  }
  for (const property of properties) {
    if (!Object.hasOwn(previousStyles, property)) {
      renderResolvedProperty(element, state, property);
    }
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
  if (state.base[property] !== undefined || state.fallback[property] !== undefined) {
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
    if (state.rendered[property] === undefined && !element.style.getPropertyValue(property)) {
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
  return (
    state['parent-layout'][property] ??
    state.layout[property] ??
    state.modifier[property] ??
    state.base[property] ??
    state.fallback[property]
  );
}
