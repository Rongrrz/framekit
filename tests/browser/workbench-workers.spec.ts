import { expect, test } from '@playwright/test';

import { createProject, expectWorker } from './workbench-helpers';

const workerUrl = '**/project-workbench/src/code-worker.ts*';

test.beforeEach(async ({ page }) => {
  // Deliberately exceed the ordinary five-second assertion deadline, as a cold CI worker can.
  await page.route(workerUrl, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 6_000));
    await route.continue();
  });
  await page.goto('/project-workbench/');
  await createProject(page, 'Welcome card');
});

test('export waits for cold formatting before enabling the displayed source download', async ({
  page,
}) => {
  const starting = page.waitForRequest(workerUrl);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await starting;
  const region = page.getByRole('region', { name: 'Generated TypeScript', exact: true });
  const download = page.getByRole('button', { name: 'Download .ts', exact: true });
  await expect(region).toContainText('Preparing source…');
  await expect(download).toBeDisabled();
  await expectWorker(region).toContainText('const welcomeCard = createScrollingFrame({');
  await expect(download).toBeEnabled();
});

test('script editing stays usable and queued Format completes after a cold worker starts', async ({
  page,
}) => {
  await page.getByRole('treeitem', { name: 'Feature panel', exact: true }).click();
  await page.getByRole('button', { name: '+ Insert', exact: true }).click();
  const starting = page.waitForRequest(workerUrl);
  await page.getByRole('button', { name: 'Add Script', exact: true }).click();
  await starting;
  const source = page.getByRole('textbox', { name: 'TypeScript source', exact: true });
  await source.fill('export default()=>{console.log("Cold start")}');
  const format = page.getByRole('button', { name: 'Format', exact: true });
  await format.click();
  await expect(format).toBeDisabled();
  await expect(source).toBeEditable();
  await expectWorker(source).toHaveValue(
    "export default () => {\n  console.log('Cold start');\n};\n",
  );
  await expect(format).toBeEnabled();
});
