import { expect, test } from '@playwright/test';

import type {} from './harness.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/index.html');
  await page.waitForFunction(() => Boolean(window.framekit));
});

test('keeps hostile text literal through rendering, stroke, and updates', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { createScreenGui, createTextLabel, createUITextStroke } = window.framekit;
    const gui = createScreenGui();
    const payload = '<svg onload="document.documentElement.dataset.injected=1"></svg>';
    const label = createTextLabel({ Text: payload });
    label.Parent = gui;
    createUITextStroke().Parent = label;
    gui.mount('#root');
    const initialText = label.unsafeElement.querySelector('[data-framekit-text]')!.textContent;
    label.Text = '</span><img src=x onerror="document.documentElement.dataset.injected=1">';
    const updatedText = label.unsafeElement.querySelector('[data-framekit-text]')!.textContent;
    const result = {
      initialText,
      updatedText,
      injectedElements: label.unsafeElement.querySelectorAll('svg, img, script').length,
      injected: document.documentElement.dataset.injected,
    };
    gui.destroy();
    return result;
  });
  expect(result.initialText).toContain('<svg onload=');
  expect(result.updatedText).toContain('<img src=x onerror=');
  expect(result.injectedElements).toBe(0);
  expect(result.injected).toBeUndefined();
});

test('rejects obfuscated executable URLs before changing links or images', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { createLink, createImageLabel } = window.framekit;
    const sources = [
      'javascript:alert(1)',
      ' \u0000JaVaScRiPt:alert(1)',
      'java\tscript:alert(1)',
      'java\nscript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
    ];
    const link = createLink({ Href: '/safe' });
    const image = createImageLabel({ Image: '/safe.png' });
    let rejected = 0;
    for (const source of sources) {
      for (const attempt of [
        () => createLink({ Href: source }),
        () => createImageLabel({ Image: source }),
        () => link.setProperties({ Href: source }),
        () => image.setProperties({ Image: source }),
      ]) {
        try {
          attempt();
        } catch (error) {
          if (!(error instanceof TypeError)) {
            throw error;
          }
          rejected += 1;
        }
      }
    }
    const result = {
      rejected,
      href: link.Href,
      nativeHref: link.unsafeElement.getAttribute('href'),
      image: image.Image,
      nativeImage: image.unsafeElement.querySelector('img')!.getAttribute('src'),
    };
    link.destroy();
    image.destroy();
    return result;
  });
  expect(result).toEqual({
    rejected: 24,
    href: '/safe',
    nativeHref: '/safe',
    image: '/safe.png',
    nativeImage: '/safe.png',
  });
});

test('keeps password values out of diagnostic snapshots and the visible inspector', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const password = window.framekit.createTextInput({
      InputType: 'Password',
      Text: 'private-password',
    });
    document.querySelector('#root')!.append(password.unsafeElement);
    const inspector = window.framekitDevtools.createRuntimeInspector(password);
    inspector.gui.mount(document.body);
    inspector.select(password);
    const result = {
      snapshot: window.framekitDevtools.inspectInstance(password).properties.Text,
      visibleSecret: inspector.gui.unsafeElement.textContent!.includes('private-password'),
      value: password.unsafeElement.value,
    };
    password.destroy();
    return result;
  });
  expect(result).toEqual({
    snapshot: '[redacted]',
    visibleSecret: false,
    value: 'private-password',
  });
});
