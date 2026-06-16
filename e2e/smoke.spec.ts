import { test, expect } from '@playwright/test';

// Smoke tests: the app boots and the key routes render. The CA license badge (#21318)
// renders in the hero and the footer on every page, so it is a stable anchor that the
// SPA actually mounted. Using .first() because it appears more than once by design.

test('home page boots and renders the hero', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Hunter Lease/i);
  await expect(page.getByText(/21318/).first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Узнать свою цену|See my price/i }),
  ).toBeVisible();
});

test('catalog route loads the SPA (not a 404)', async ({ page }) => {
  await page.goto('/deals');
  await expect(page).toHaveURL(/\/deals/);
  await expect(page.getByText(/21318/).first()).toBeVisible();
});

test('hunter-score methodology page renders', async ({ page }) => {
  await page.goto('/hunter-score');
  await expect(page.getByRole('heading', { name: 'Hunter Score', exact: true })).toBeVisible();
});
