import { test, expect } from '@playwright/test';

test.describe('Leaders ERP Smoke Tests', () => {
  test('should load the login page', async ({ page }) => {
    await page.goto('/');
    
    // Check if login form is present
    await expect(page.locator('form')).toBeVisible();
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  test('should show authentication error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    await page.fill('input[type="email"]', 'invalid@leaders.ac.tz');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.getByRole('button', { name: /login/i }).click();

    await expect(page.locator('text=Invalid login credentials')).toBeVisible();
  });
});
