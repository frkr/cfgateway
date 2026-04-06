import { test, expect } from '@playwright/test';

test.describe('Retry Button Functionality', () => {
  test('should open modal and click retry button', async ({ page }) => {
    // Set up a mock that works even before the page loads
    const mockMessages = {
      messages: [
        {
          id: 'msg_1',
          url: 'https://example.com/api/test',
          method: 'POST',
          status: 200,
          processed_at: '2023-10-27T10:00:00Z',
          id_parent: 'parent_1',
          filename: 'file_1.json',
          content: '{"test": "data"}'
        }
      ],
      message: 'Hello from Cloudflare'
    };

    // Dialog handler
    let dialogMessage = '';
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      console.log('Dialog appeared:', dialogMessage);
      await dialog.accept();
    });

    // Mocking
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (url.includes('/panel') && (url.includes('json=1') || route.request().headers()['accept']?.includes('application/json'))) {
         console.log('Mocking data request:', url);
         return route.fulfill({
           status: 200,
           contentType: 'application/json',
           body: JSON.stringify(mockMessages),
         });
      }
      return route.continue();
    });

    console.log('Navigating to /panel');
    await page.goto('/panel');

    // Wait for the message to appear
    console.log('Waiting for message link');
    // Using a more generic locator if text fails
    const messageRow = page.locator('div.cursor-pointer').filter({ hasText: '/api/test' });

    await expect(messageRow.first()).toBeVisible({ timeout: 15000 });
    await messageRow.first().click();

    // Verify modal is open
    console.log('Verifying modal');
    await expect(page.getByRole('heading', { name: 'Request Details' })).toBeVisible();

    // Click RETRY button
    console.log('Clicking Retry button');
    const retryButton = page.getByRole('button', { name: 'Retry' });
    await expect(retryButton).toBeVisible();
    await retryButton.click();

    // Verify alert message
    console.log('Waiting for success alert');
    await expect.poll(() => dialogMessage, { timeout: 5000 }).toContain('Retry sent successfully!');
  });
});
