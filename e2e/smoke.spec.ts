import { test, expect } from '@playwright/test';

test.describe('PWA Smoke Tests', () => {
  test('Kitchen Kiosk route loads correctly', async ({ page }) => {
    await page.goto('/kitchen/display');
    await expect(page.locator('h1')).toContainText('KITCHEN LED');
    // Ensure the menu panel is visible
    await expect(page.locator('.primary-panel')).toBeVisible();
  });

  test('Login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('form')).toBeVisible();
  });
});
