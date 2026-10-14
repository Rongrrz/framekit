export type StyleLayer = 'modifier' | 'layout' | 'parent-layout';
export type StyleValues = Readonly<{ [property: string]: string | undefined }>;
type StyleRecord = Record<string, string | undefined>;

type ElementStyleState = {
  base: StyleRecord;
  modifier: StyleValues;
  layout: StyleValues;
  'parent-layout': StyleValues;
  fallback: StyleRecord;
  rendered: StyleRecord;
};

const stylesByElement = new WeakMap<HTMLElement, ElementStyleState>();
// Derived layers are replaced as a whole, so unused layers can share one immutable record.
const emptyStyles: StyleValues = Object.freeze(Object.create(null) as Record<string, string>);

/** Captures detached default styles, then creates elements with independent override records. */
export function createStyledElementFactory<Element extends HTMLElement>(
  template: Element,
): () => Element {
  const prototype = template.cloneNode(false) as Element;
  const state = stylesByElement.get(template);
  // These private snapshots are never written. Writable descriptors let instance records
  // shadow inherited defaults by normal assignment without per-property defineProperty calls.
  const defaults = state && {
    ...state,
    base: copyStyleRecord(state.base),
    fallback: copyStyleRecord(state.fallback),
    rendered: copyStyleRecord(state.rendered),
  };
  return () => {
    const element = prototype.cloneNode(false) as Element;
    if (defaults) {
      stylesByElement.set(element, {
        ...defaults,
        base: Object.create(defaults.base) as StyleRecord,
        fallback: Object.create(defaults.fallback) as StyleRecord,
        rendered: Object.create(defaults.rendered) as StyleRecord,
      });
    }
    return element;
  };
}

function copyStyleRecord(values: StyleRecord): StyleRecord {
  const copy = Object.create(null) as StyleRecord;
  for (const property in values) {
    copy[property] = values[property];
  }
  return copy;
}

function clearStyleValue(values: StyleRecord, property: string): void {
  delete values[property];
  // Removing an inherited default needs an explicit shadow, or it would become visible again.
  if (values[property] !== undefined) {
    values[property] = undefined;
  }
}

/** Updates one base style while preserving any active modifier or layout override. */
export function setStyle(element: HTMLElement, property: string, value: string): void {
  const state = getStyleState(element);
  state.base[property] = value;
  renderResolvedProperty(element, state, property);
}

/** Removes one base style and reveals the next owned layer or original inline value. */
export function removeStyle(element: HTMLElement, property: string): void {
  const state = getStyleState(element);
  clearStyleValue(state.base, property);
  renderResolvedProperty(element, state, property);
}

/** Reconciles a complete derived layer without disturbing other style owners. */
export function setStyleLayer(element: HTMLElement, layer: StyleLayer, styles: StyleValues): void {
  const state = getStyleState(element);
  const previousStyles = state[layer];
  const properties = Object.keys(styles);
  let nextStyles = emptyStyles;
  if (properties.length > 0) {
    const definedStyles = Object.create(null) as Record<string, string>;
    for (const property of properties) {
      const value = styles[property];
      if (value === undefined) {
        continue;
      }
      captureFallback(element, state, property);
      definedStyles[property] = value;
    }
    nextStyles = definedStyles;
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
    modifier: emptyStyles,
    layout: emptyStyles,
    'parent-layout': emptyStyles,
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
    clearStyleValue(state.rendered, property);
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
