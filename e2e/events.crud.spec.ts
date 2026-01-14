import { test, expect } from '@playwright/test';

test('create a new event', async ({ page }) => {
    // Navigate to the events page
    await page.goto('/events/new');

    // Fill in basic information
    await page.fill('#summary', 'Test Event from E2E');
    await page.fill('#description', 'This event was created by an automated test.');

    // Set a date (default is today, but let's ensure it's filled)
    // The id is startDate
    const today = new Date().toISOString().split('T')[0];
    await page.fill('#startDate', today);

    // Click Create Event
    // Using AsyncButton which might have a specific selector or just the text
    await page.click('button:has-text("Create Event")');

    // Verify redirect to /events or success toast
    await expect(page).toHaveURL(/\/events/);

    // Check for success toast (if possible)
    const successToast = page.getByText('Successfully Saved!');
    await expect(successToast).toBeVisible();
});
