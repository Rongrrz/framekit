import type { LayoutBreakpoint, SceneNode } from './document';

/** Width ranges are shared by preview, inspector scope, templates, and generated websites. */
export const layoutBreakpoints = [
  { id: 'phone', label: 'Phone · below 600 px', min: 0 },
  { id: 'tablet', label: 'Tablet · 600–1023 px', min: 600 },
  { id: 'desktop', label: 'Desktop · 1024 px and up', min: 1024 },
] as const;

export const breakpointForWidth = (width: number): LayoutBreakpoint =>
  width < 600 ? 'phone' : width < 1024 ? 'tablet' : 'desktop';

export const responsiveProperties = (
  node: SceneNode,
  layout: LayoutBreakpoint | null,
): SceneNode['properties'] => ({
  ...node.properties,
  ...(layout ? node.responsive?.[layout] : {}),
});
