import { expect, test } from '../fixtures/observability';

const publicPages = [
  { path: '/', title: /VisionFlow/ },
  { path: '/work', title: /VisionFlow/ },
  { path: '/contact', title: /VisionFlow/ },
  { path: '/search', title: /VisionFlow/ },
];

test.describe('public pages', () => {
  for (const pageCase of publicPages) {
    test(`${pageCase.path} renders successfully`, async ({ page }) => {
      const response = await page.goto(pageCase.path);

      expect(response?.ok()).toBe(true);
      await expect(page).toHaveTitle(pageCase.title);
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('body')).not.toContainText(
        /Application error|Internal Server Error|Unhandled Runtime Error/i,
      );
    });
  }

  test('home page exposes primary navigation links', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('link', { name: /Work/i }).first(),
    ).toBeVisible();
    await expect(
      page.locator('a[href="/contact"]').first(),
    ).toBeVisible();
  });

  test('work and contact pages expose main headings', async ({ page }) => {
    await page.goto('/work');
    await expect(page.locator('h1').first()).toBeVisible();

    await page.goto('/contact');
    await expect(page.locator('h1').first()).toBeVisible();
  });
});

test.describe('/work page with Supabase data', () => {
  test('loads works from Supabase and renders the first work title', async ({
    page,
  }) => {
    const worksResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/rest/v1/works') &&
        response.request().method() === 'GET',
    );

    await page.goto('/work');

    const worksResponse = await worksResponsePromise;
    expect(worksResponse.ok()).toBe(true);

    const works = (await worksResponse.json()) as Array<{
      title?: string;
    }>;

    expect(works.length).toBeGreaterThan(0);
    expect(works[0]?.title).toEqual(expect.any(String));

    await expect(page.getByText(works[0]!.title!).first()).toBeVisible();
  });
});
