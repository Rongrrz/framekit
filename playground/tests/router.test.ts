import { fk } from 'framekit';
import { afterEach, describe, expect, it } from 'vitest';

import { bindHashRouter, navigateToPage, resolveInitialPage } from '../src/router';

afterEach(() => {
  window.location.hash = '';
});

describe('playground router', () => {
  it('falls back to home for unknown hashes', () => {
    window.location.hash = '#/unknown';
    expect(resolveInitialPage()).toBe('home');
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
});
