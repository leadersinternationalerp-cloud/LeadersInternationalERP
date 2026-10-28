import { test, expect } from '@playwright/test';

test.describe('PWA & Route Smoke Tests', () => {
  test('Kitchen Kiosk route loads correctly without authentication', async ({ page }) => {
    await page.goto('/kitchen/display');
    await expect(page.locator('h1')).toContainText('KITCHEN LED');
    await expect(page.locator('.primary-panel')).toBeVisible();
  });

  test('Login page loads with form and sign in action', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('form')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('Offline fallback page is accessible', async ({ page }) => {
    const response = await page.goto('/offline.html');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toContainText('You are currently offline');
  });

  test('Service worker is served with correct headers and no redirect', async ({ request }) => {
    const res = await request.get('/sw.js');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('javascript');
  });

  test('Web manifest is served with valid JSON and required icons', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.name).toBe('Leaders International School ERP');
    expect(json.icons.length).toBeGreaterThanOrEqual(4);
    expect(json.screenshots.length).toBeGreaterThanOrEqual(2);
  });

  test('Invalid login credentials return expected error message', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'invalid_user_test');
    await page.fill('input[name="password"]', '123456');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.locator('text=Invalid username/email or password/PIN')).toBeVisible();
  });
});
