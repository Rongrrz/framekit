import { expect, test, type Page } from '@playwright/test';

import { createProject } from './workbench-helpers';

const addScript = async (page: Page, source: string, origins = ''): Promise<void> => {
  await page.getByRole('treeitem', { name: 'Feature panel', exact: true }).click();
  await page.getByRole('button', { name: '+ Insert', exact: true }).click();
  await page.getByRole('button', { name: 'Add Script', exact: true }).click();
  await page.getByRole('textbox', { name: 'TypeScript source', exact: true }).fill(source);
  await page.getByRole('textbox', { name: 'Allowed backend origins', exact: true }).fill(origins);
  await page.getByRole('button', { name: 'Apply script', exact: true }).click();
};

test.beforeEach(async ({ page }) => {
  await page.goto('/project-workbench/');
  await createProject(page, 'Welcome card');
});

test('TypeScript scripts can query project DOM while editor access and undeclared requests stay blocked', async ({
  page,
}) => {
  let deniedRequests = 0;
  await page.route('https://denied.framekit.test/**', async (route) => {
    deniedRequests += 1;
    await route.abort();
  });
  await addScript(
    page,
    `import type { ScriptContext } from '@framekit/script';
export default async (ctx: ScriptContext): Promise<void> => {
  const body = document.body;
  body.dataset.query = String(ctx.query('span') !== null);
  try { window.parent.document.body.dataset.injected = 'bad'; } catch { body.dataset.editorBlocked = 'yes'; }
  try { window.localStorage.setItem('bad', 'bad'); } catch { body.dataset.storageBlocked = 'yes'; }
  try { await fetch('https://denied.framekit.test/raw'); } catch { body.dataset.networkBlocked = 'yes'; }
  try { await ctx.fetch('https://denied.framekit.test/managed'); } catch { body.dataset.managedBlocked = 'yes'; }
  body.dataset.literal = '</script><img src=x onerror="parent.document.body.dataset.injected=1">';
};`,
  );
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  const body = page.frameLocator('iframe[title="Presented project"]').locator('body');
  await expect(body).toHaveAttribute('data-editor-blocked', 'yes');
  await expect(body).toHaveAttribute('data-storage-blocked', 'yes');
  await expect(body).toHaveAttribute('data-network-blocked', 'yes');
  await expect(body).toHaveAttribute('data-managed-blocked', 'yes');
  await expect(body).toHaveAttribute('data-query', 'true');
  await expect(body).toHaveAttribute('data-literal', /<\/script>/);
  await expect(page.locator('body')).not.toHaveAttribute('data-injected');
  expect(deniedRequests).toBe(0);
});

test('approved backend requests work and owned resources stop when the parent is destroyed', async ({
  page,
}) => {
  await page.route('https://api.framekit.test/data', async (route) =>
    route.fulfill({
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: '{"message":"Backend connected"}',
    }),
  );
  await addScript(
    page,
    `import type { ScriptContext } from '@framekit/script';
export default async (ctx: ScriptContext): Promise<void> => {
  const response = await ctx.fetch('https://api.framekit.test/data');
  const data: { message: string } = await response.json();
  document.body.dataset.backend = data.message;
  let ticks = 0;
  ctx.interval(() => { document.body.dataset.ticks = String(++ticks); }, 16);
  ctx.listen(window, 'cleanup-probe', () => { document.body.dataset.leaked = 'yes'; });
  ctx.own(() => { document.body.dataset.cleaned = 'yes'; });
  ctx.timeout(() => ctx.parent.destroy(), 150);
};`,
    'https://api.framekit.test',
  );
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  const body = page.frameLocator('iframe[title="Presented project"]').locator('body');
  await expect(body).toHaveAttribute('data-backend', 'Backend connected');
  await expect(body).toHaveAttribute('data-cleaned', 'yes');
  const ticks = await body.getAttribute('data-ticks');
  await body.evaluate((element) => {
    element.ownerDocument.defaultView!.dispatchEvent(new Event('cleanup-probe'));
  });
  await page.waitForTimeout(80);
  await expect(body).toHaveAttribute('data-ticks', ticks!);
  await expect(body).not.toHaveAttribute('data-leaked');
  await page.getByRole('button', { name: 'Exit presentation', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('treeitem', { name: 'Script', exact: true }).dblclick();
  await expect(
    page.getByRole('textbox', { name: 'Allowed backend origins', exact: true }),
  ).toHaveValue('https://api.framekit.test');
  await page.getByRole('button', { name: 'Close script editor', exact: true }).click();
  await page.reload();
  await page.getByRole('treeitem', { name: 'Script', exact: true }).dblclick();
  await expect(page.getByRole('textbox', { name: 'TypeScript source', exact: true })).toHaveValue(
    /ctx\.fetch/,
  );
});

test('surfaces script errors and syntax failures without losing the exit control', async ({
  page,
}) => {
  await addScript(page, "export default () => { throw new Error('Script failed safely'); };");
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Presentation', exact: true })).toContainText(
    'Script failed safely',
  );
  await page.getByRole('button', { name: 'Exit presentation', exact: true }).click();
  await page.getByRole('treeitem', { name: 'Script', exact: true }).dblclick();
  await page
    .getByRole('textbox', { name: 'TypeScript source', exact: true })
    .fill('export default ( => {');
  await page.getByRole('button', { name: 'Apply script', exact: true }).click();
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Presentation', exact: true })).toContainText(
    'expected',
  );
  await page.getByRole('button', { name: 'Exit presentation', exact: true }).click();
  await expect(page.getByRole('treeitem', { name: 'Script', exact: true })).toBeVisible();
});

test('stops ordinary infinite script loops so presentation can still be closed', async ({
  page,
}) => {
  await addScript(page, 'export default () => { while (true) {} };');
  await page.getByRole('button', { name: 'Present', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Presentation', exact: true })).toContainText(
    'work budget',
  );
  await page.getByRole('button', { name: 'Exit presentation', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
});
