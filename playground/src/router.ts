import { createFrame, type Frame, type Instance, udim2, type ObservableValue } from 'framekit';

import { bindLayoutProperties, pageHeight, type PlaygroundLayout } from './layout';
import { watchOwnedValue } from './owned-value';

export type SitePage = 'home' | 'guide' | 'api';

const pageHashes = {
  home: '#/',
  guide: '#/guide',
  api: '#/api',
} satisfies Readonly<Record<SitePage, string>>;

export const resolveInitialPage = (): SitePage => {
  if (window.location.hash === pageHashes.guide) return 'guide';
  if (window.location.hash === pageHashes.api) return 'api';
  return 'home';
};

export const bindHashRouter = (owner: Instance, route: ObservableValue<SitePage>): void => {
  const listenerController = new AbortController();
  window.addEventListener('hashchange', () => route.set(resolveInitialPage()), {
    signal: listenerController.signal,
  });
  owner.onDestroy(() => listenerController.abort());
};

export const navigateToPage = (route: ObservableValue<SitePage>, page: SitePage): void => {
  route.set(page);
  const hash = pageHashes[page];
  if (window.location.hash !== hash) window.location.hash = hash;
};

export const createRoutedPage = (
  name: string,
  page: SitePage,
  layout: ObservableValue<PlaygroundLayout>,
  route: ObservableValue<SitePage>,
): Frame => {
  const frame = createFrame({ Name: name, BackgroundTransparency: 1 });
  bindLayoutProperties(frame, layout, frame, {
    desktop: { Size: udim2(1, 0, 0, pageHeight.desktop[page]) },
    mobile: { Size: udim2(1, 0, 0, pageHeight.mobile[page]) },
  });
  watchOwnedValue(frame, route, (currentPage) => {
    frame.Visible = currentPage === page;
  });
  return frame;
};
