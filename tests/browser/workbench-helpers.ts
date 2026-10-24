import type { Page } from '@playwright/test';

/** Projects start in the library; templates are available only through explicit creation. */
export const createProject = async (page: Page, template: string): Promise<void> => {
  await page.getByRole('button', { name: '+ New project', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'New project', exact: true })
    .getByRole('button', { name: `Create ${template}`, exact: true })
    .click();
};
