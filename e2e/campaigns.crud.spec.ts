import { expect, test, Page, Locator } from '@playwright/test';

const HARNESS_ROUTE = '/testing/campaigns-automation';

const campaignCards = (page: Page) => page.locator('[data-testid="campaign-card"]');
const cardByName = (page: Page, name: string) =>
	page.locator(`[data-testid="campaign-card"][data-campaign-name="${name}"]`);

async function gotoHarness(page: Page) {
	await page.goto(HARNESS_ROUTE);
	await expect(page.getByTestId('campaign-harness')).toHaveAttribute('data-hydrated', 'true');
}

async function waitForToast(page: Page, message: string) {
	const toast = page.getByRole('alert').filter({ hasText: message }).first();
	await expect(toast).toBeVisible();
	const dismiss = toast.getByRole('button', { name: 'Dismiss' });
	if (await dismiss.count()) {
		await dismiss.click();
	}
}

async function createCampaign(page: Page, name: string, content = '{}') {
	await page.getByTestId('campaign-name-input').fill(name);
	await page.getByTestId('campaign-content-input').fill(content);
	await page.getByTestId('campaign-submit').click();
	await waitForToast(page, 'Campaign created for automation harness');
	await expect(cardByName(page, name)).toHaveCount(1);
	return await cardByName(page, name).getAttribute('data-campaign-id');
}

async function updateCampaign(page: Page, name: string, updates: { name?: string; content?: string }) {
	await cardByName(page, name)
		.locator('[data-testid="campaign-edit-button"]')
		.click();
	await expect(page.getByTestId('campaign-edit-banner')).toBeVisible();

	if (updates.name) {
		await page.getByTestId('campaign-name-input').fill(updates.name);
	}

	if (updates.content) {
		await page.getByTestId('campaign-content-input').fill(updates.content);
	}

	await page.getByTestId('campaign-submit').click();
	await waitForToast(page, 'Campaign updated for automation harness');
	return updates.name ?? name;
}

async function expectCampaignOrder(page: Page, expectedNames: string[]) {
	await expect(campaignCards(page)).toHaveCount(expectedNames.length);
	const names = await campaignCards(page).evaluateAll((cards) =>
		cards.map((card) => card.getAttribute('data-campaign-name') || '')
	);
	expect(names).toEqual(expectedNames);
}

async function deleteCampaign(page: Page, name: string) {
	await cardByName(page, name)
		.locator('[data-testid="campaign-delete-button"]')
		.click();
	await waitForToast(page, 'Campaign deleted successfully!');
}

async function selectCampaign(page: Page, name: string) {
	const checkbox = cardByName(page, name).locator('input[type="checkbox"]');
	await checkbox.check();
}

async function bulkDelete(page: Page, count: number) {
	const confirmPattern = `Delete ${count} ${count === 1 ? 'campaign' : 'campaigns'}?`;
	const dialogPromise = page.waitForEvent('dialog');
	await Promise.all([
		dialogPromise.then((dialog) => {
			expect(dialog.message()).toBe(confirmPattern);
			dialog.accept();
		}),
		page.getByRole('button', { name: `Delete Selected (${count})` }).click()
	]);
	const label = `${count} ${count === 1 ? 'campaign' : 'campaigns'} deleted successfully!`;
	await waitForToast(page, label);
}

async function openDetailFromCard(page: Page, card: Locator) {
	const id = await card.getAttribute('data-campaign-id');
	await card.locator('span.text-blue-600').click();
	await expect(page).toHaveURL(new RegExp(`/testing/campaigns-automation/${id}`));
	await expect(page.getByTestId('campaign-harness-detail')).toBeVisible();
	await page.getByRole('link', { name: 'Back to list' }).click();
	await expect(page).toHaveURL(HARNESS_ROUTE);
}

test.describe('Campaigns CRUD smoke tests', () => {
	test.beforeEach(async ({ page }) => {
		await gotoHarness(page);
	});

	test('creates campaigns and lists them in order', async ({ page }) => {
		await createCampaign(page, 'Alpha Launch', '{"channels":["email"]}');
		await createCampaign(page, 'Beta Reminder', '{"channels":["sms"]}');
		await expectCampaignOrder(page, ['Alpha Launch', 'Beta Reminder']);
	});

	test('updates a campaign and opens the detail route', async ({ page }) => {
		await createCampaign(page, 'Gamma', '{"audience":"global"}');
		const updatedName = await updateCampaign(page, 'Gamma', {
			name: 'Gamma Refresh',
			content: '{"audience":"vip"}'
		});
		await expectCampaignOrder(page, [updatedName]);
		const card = cardByName(page, updatedName);
		await openDetailFromCard(page, card);
	});

	test('deletes campaigns individually and in bulk', async ({ page }) => {
		await createCampaign(page, 'Delta', '{}');
		await createCampaign(page, 'Echo', '{}');
		await createCampaign(page, 'Foxtrot', '{}');

		await deleteCampaign(page, 'Delta');
		await expectCampaignOrder(page, ['Echo', 'Foxtrot']);

		await selectCampaign(page, 'Echo');
		await selectCampaign(page, 'Foxtrot');
		await bulkDelete(page, 2);
		await expect(campaignCards(page)).toHaveCount(0);
	});
});
