const styleValuesByElement = new WeakMap<HTMLElement, Record<string, string>>();

/** Writes an inline style only when FrameKit's resolved CSS output changed. */
export function setStyle(element: HTMLElement, property: string, value: string): void {
  let values = styleValuesByElement.get(element);
  if (!values) {
    values = Object.create(null) as Record<string, string>;
    styleValuesByElement.set(element, values);
  }
  if (values[property] === value) return;
  element.style.setProperty(property, value);
  values[property] = value;
}

export function removeStyle(element: HTMLElement, property: string): void {
  const values = styleValuesByElement.get(element);
  const hasCachedValue = values !== undefined && Object.hasOwn(values, property);
  if (!hasCachedValue && !element.style.getPropertyValue(property)) {
    return;
  }
  element.style.removeProperty(property);
  if (values) delete values[property];
}
