import { expect, test, type Page } from '@playwright/test';

import { chooseDropdown, createProject, expectWorker } from './workbench-helpers';

const openScript = async (page: Page): Promise<void> => {
  await page.getByRole('treeitem', { name: 'Feature panel', exact: true }).click();
  await page.getByRole('button', { name: '+ Insert', exact: true }).click();
  await page.getByRole('button', { name: 'Add Script', exact: true }).click();
};

test.beforeEach(async ({ page }) => {
  await page.goto('/project-workbench/');
  await createProject(page, 'Welcome card');
});

test('script colors preserve unfinished source, literal markup, selection, and native undo', async ({
  page,
}) => {
  await openScript(page);
  const source = page.getByRole('textbox', { name: 'TypeScript source', exact: true });
  const mirror = page.locator('[data-script-mirror] pre');
  await expect(mirror).toBeInViewport();
  await expectWorker.poll(() => mirror.locator('span[style*="color"]').count()).toBeGreaterThan(5);
  const buffer =
    "\tconst html = '</font><img src=x onerror=document.body.dataset.injected=1>';\nexport default ( => {\n  \n";
  await source.fill(buffer);
  await expect.poll(() => mirror.textContent()).toBe(buffer);
  await expectWorker.poll(() => mirror.locator('span[style*="color"]').count()).toBeGreaterThan(5);
  await expect(source).toHaveValue(buffer);
  await expect(page.locator('body')).not.toHaveAttribute('data-injected');
  await expect(mirror.locator('img, script')).toHaveCount(0);
  await source.press('ControlOrMeta+End');
  await source.pressSequentially('x');
  await expect(source).toHaveValue(`${buffer}x`);
  await expect.poll(() => mirror.textContent()).toBe(`${buffer}x`);
  await expect
    .poll(() => source.evaluate((element: HTMLTextAreaElement) => element.selectionStart))
    .toBe(buffer.length + 1);
  await source.press('ControlOrMeta+z');
  // Browsers group native edits differently, but highlighting must leave undo/redo intact.
  await expect(source).not.toHaveValue(`${buffer}x`);
  const undone = await source.inputValue();
  await expect.poll(() => mirror.textContent()).toBe(undone);
  await source.press('ControlOrMeta+Shift+z');
  await expect(source).toHaveValue(`${buffer}x`);
  await expect.poll(() => mirror.textContent()).toBe(`${buffer}x`);
});

test('Format and its keyboard shortcut produce readable TypeScript that persists only on Apply', async ({
  page,
}) => {
  await openScript(page);
  const source = page.getByRole('textbox', { name: 'TypeScript source', exact: true });
  const unformatted = 'export default(ctx)=>{const message="Hello";ctx.parent.Name=message;}';
  const formatted =
    "export default (ctx) => {\n  const message = 'Hello';\n  ctx.parent.Name = message;\n};\n";
  await source.fill(unformatted);
  await page.getByRole('button', { name: 'Format', exact: true }).click();
  await expectWorker(source).toHaveValue(formatted);
  await expectWorker(
    page.getByRole('dialog', { name: 'TypeScript script', exact: true }).getByRole('status'),
  ).toContainText('Formatted with 2-space indentation');
  await page.getByRole('button', { name: 'Apply script', exact: true }).click();
  await page.getByRole('treeitem', { name: 'Script', exact: true }).dblclick();
  await expect(source).toHaveValue(formatted);
  await source.fill('export default()=>{console.log("unsaved")}');
  await source.press('Shift+Alt+KeyF');
  await expectWorker(source).toHaveValue("export default () => {\n  console.log('unsaved');\n};\n");
  await page.getByRole('button', { name: 'Close script editor', exact: true }).click();
  await page.getByRole('treeitem', { name: 'Script', exact: true }).dblclick();
  await expect(source).toHaveValue(formatted);
  const mirror = page.locator('[data-script-mirror] pre');
  await expect(mirror).toBeInViewport();
  await expectWorker.poll(() => mirror.locator('span[style*="color"]').count()).toBeGreaterThan(5);
  await page.screenshot({ path: '/tmp/framekit-script-editor-dark.png' });
});

test('script colors follow the GitHub theme from Settings and stay aligned while scrolling', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await settings.getByRole('tab', { name: 'Appearance', exact: true }).click();
  await chooseDropdown(settings, 'Code theme', 'GitHub Light');
  await settings.getByRole('button', { name: 'Close settings', exact: true }).click();
  await openScript(page);
  const root = page.locator('[data-script-editor]');
  const source = page.getByRole('textbox', { name: 'TypeScript source', exact: true });
  const mirror = root.locator('[data-script-mirror] pre');
  const buffer = `${Array.from(
    { length: 100 },
    (_, index) => `const line${index + 1} = '${'long line '.repeat(20)}';`,
  ).join('\n')}\n`;
  await source.fill(buffer);
  await expect(root).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expectWorker
    .poll(() => mirror.locator('span[style*="color"]').count())
    .toBeGreaterThan(100);
  await source.evaluate((element: HTMLTextAreaElement) => {
    element.scrollTop = 480;
    element.scrollLeft = 300;
  });
  await expect
    .poll(async () => {
      const input = await source.boundingBox();
      const pre = await mirror.boundingBox();
      const scroll = await source.evaluate((element: HTMLTextAreaElement) => ({
        x: element.scrollLeft,
        y: element.scrollTop,
      }));
      return {
        x: Math.round(pre!.x - input!.x + scroll.x),
        y: Math.round(pre!.y - input!.y + scroll.y),
      };
    })
    .toEqual({ x: 12, y: 12 });
  const gutter = root.locator('[data-script-gutter] pre');
  await expect(gutter).toHaveText(/100\s+101$/);
  expect(Math.abs((await gutter.boundingBox())!.y - (await mirror.boundingBox())!.y)).toBeLessThan(
    1,
  );
  await page.screenshot({ path: '/tmp/framekit-script-editor-light-scrolled.png' });
});

test('format failures and late formatting leave the current editing buffer intact', async ({
  page,
}) => {
  await openScript(page);
  const source = page.getByRole('textbox', { name: 'TypeScript source', exact: true });
  const format = page.getByRole('button', { name: 'Format', exact: true });
  await source.fill('export default ( => {');
  await format.click();
  await expectWorker(
    page.getByRole('dialog', { name: 'TypeScript script', exact: true }).getByRole('status'),
  ).toContainText('Could not format this TypeScript');
  await expect(source).toHaveValue('export default ( => {');
  await expect(format).toBeEnabled();
  await page.getByRole('button', { name: 'Apply script', exact: true }).click();
  await page.getByRole('treeitem', { name: 'Script', exact: true }).dblclick();
  await expect(source).toHaveValue('export default ( => {');

  // Deliver new input in the same task as Format so the worker cannot win the race.
  await source.fill('export default()=>{}');
  await format.evaluate((element) => {
    (element as HTMLButtonElement).click();
    const input = element.closest('dialog')!.querySelector('textarea')!;
    input.value = '// newer edits';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  });
  await expectWorker(
    page.getByRole('dialog', { name: 'TypeScript script', exact: true }).getByRole('status'),
  ).toContainText('Source changed while formatting');
  await expect(source).toHaveValue('// newer edits');
  await page.getByRole('button', { name: 'Close script editor', exact: true }).click();
  await page.getByRole('treeitem', { name: 'Script', exact: true }).dblclick();
  await expect(source).toHaveValue('export default ( => {');
  await expect
    .poll(() => page.locator('[data-script-mirror] pre').textContent())
    .toBe('export default ( => {');
  await expectWorker
    .poll(() => page.locator('[data-script-mirror] pre span[style*="color"]').count())
    .toBeGreaterThan(2);
});

test('destroying an open script editor leaves no delayed updates or errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/tests/browser/index.html');
  await page.evaluate(async () => {
    const path = '/project-workbench/src/app.ts';
    const { createWorkbench } = await import(/* @vite-ignore */ path);
    const app = createWorkbench();
    app.mount('#root');
    const destroy = document.createElement('button');
    destroy.id = 'destroy-script-editor';
    destroy.addEventListener('click', () => app.destroy());
    document.body.append(destroy);
  });
  await createProject(page, 'Welcome card');
  await openScript(page);
  await page
    .getByRole('textbox', { name: 'TypeScript source', exact: true })
    .fill('export default()=>{}');
  const mutations = await page
    .getByRole('button', { name: 'Format', exact: true })
    .evaluate(async (element) => {
      (element as HTMLButtonElement).click();
      document.getElementById('destroy-script-editor')!.click();
      let laterMutations = 0;
      const observer = new MutationObserver((records) => {
        laterMutations += records.length;
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
      window.dispatchEvent(new Event('resize'));
      await new Promise((resolve) => setTimeout(resolve, 200));
      const count = laterMutations + observer.takeRecords().length;
      observer.disconnect();
      return count;
    });
  await expect(page.locator('#root')).toBeEmpty();
  expect(mutations).toBe(0);
  expect(errors).toEqual([]);
});
