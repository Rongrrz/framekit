import { fk } from 'framekit';
import { afterEach, describe, expect, it } from 'vitest';

import { bindHashRouter, navigateToPage, resolveInitialPage, type SitePage } from '../src/router';

afterEach(() => {
  window.history.replaceState(null, '', window.location.pathname);
});

describe('playground router', () => {
  it.each([
    ['', 'home'],
    ['#/', 'home'],
    ['#/guide', 'guide'],
    ['#/api', 'api'],
    ['#/unknown', 'home'],
  ] as const)('resolves %s to %s', (hash, page) => {
    window.history.replaceState(null, '', window.location.pathname + hash);
    expect(resolveInitialPage()).toBe(page);
  });

  it('updates route state and the address together', () => {
    const owner = fk.createFrame();
    const route = fk.createValue<'home' | 'guide' | 'api'>('home');
    bindHashRouter(owner, route);

    navigateToPage(route, 'api');

    expect(route.get()).toBe('api');
    expect(window.location.hash).toBe('#/api');
    owner.destroy();
  });

  it('responds to external hash changes only while its owner is alive', () => {
    const owner = fk.createFrame();
    const route = fk.createValue<SitePage>('home');
    bindHashRouter(owner, route);
    window.history.replaceState(null, '', '#/guide');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(route.get()).toBe('guide');
    window.history.replaceState(null, '', '#/unknown');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(route.get()).toBe('home');
    owner.destroy();
    window.history.replaceState(null, '', '#/api');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(route.get()).toBe('home');
  });
});
