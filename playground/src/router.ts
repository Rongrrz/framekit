import {
  watchOwnedValue,
  createFrame,
  type Frame,
  type Instance,
  udim2,
  type ObservableValue,
} from 'framekit';

/** Each documentation topic has a stable, linkable route. */
export const documentationPages = [
  { page: 'guide', label: 'Getting started', group: 'Learn' },
  { page: 'elements', label: 'Elements & input', group: 'Learn' },
  { page: 'layout', label: 'Layout & styling', group: 'Learn' },
  { page: 'state', label: 'State & collections', group: 'Learn' },
  { page: 'lifecycle', label: 'Ownership & cleanup', group: 'Learn' },
  { page: 'animation', label: 'Animation', group: 'Build' },
  { page: 'overlays', label: 'Tooltips & popovers', group: 'Build' },
  { page: 'controls', label: 'Menus, dialogs & trees', group: 'Build' },
  { page: 'devtools', label: 'Runtime inspector', group: 'Build' },
  { page: 'api', label: 'API overview', group: 'Reference' },
] as const;

export type DocsPage = (typeof documentationPages)[number]['page'];

export const sitePages = [...documentationPages, { page: 'examples', label: 'Examples' }] as const;

export type SitePage = 'home' | (typeof sitePages)[number]['page'];

export const pageHash = (page: SitePage): string => (page === 'home' ? '#/' : `#/${page}`);

export const resolveInitialPage = (): SitePage =>
  sitePages.find(({ page }) => pageHash(page) === window.location.hash)?.page ?? 'home';

export const bindHashRouter = (owner: Instance, route: ObservableValue<SitePage>): void => {
  const listenerController = new AbortController();
  window.addEventListener('hashchange', () => route.set(resolveInitialPage()), {
    signal: listenerController.signal,
  });
  owner.onDestroy(() => listenerController.abort());
};

export const navigateToPage = (route: ObservableValue<SitePage>, page: SitePage): void => {
  route.set(page);

  const hash = pageHash(page);

  if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
};

export const createRoutedPage = (
  name: string,
  page: SitePage,
  route: ObservableValue<SitePage>,
): Frame => {
  const frame = createFrame({ Name: name, BackgroundTransparency: 1 });
  frame.Size = udim2(1, 0, 0, 0);
  frame.AutomaticSize = 'Y';
  frame.unsafeElement.classList.add('pg-route');
  watchOwnedValue(frame, route, (currentPage) => {
    frame.Visible = currentPage === page;

    if (frame.Visible && frame.unsafeElement.isConnected) {
      const heading = frame.unsafeElement.querySelector<HTMLElement>(
        '[role=heading][aria-level="1"]',
      );

      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    }
  });

  return frame;
};
