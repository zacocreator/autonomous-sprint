import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('manages subscriptions and keeps data after reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Load sample data' }).click()
  await page.getByLabel('Service name').fill('Build server')
  await page.getByLabel('Amount').fill('49')
  await page.getByLabel('Currency').selectOption('USD')
  await page.getByLabel('Billing').selectOption('monthly')
  await page.getByLabel('Next renewal').fill('2026-08-25')
  await page.getByRole('textbox', { name: 'Category' }).fill('Infrastructure')
  await page.getByLabel('Subscription status').selectOption('reviewing')
  await page.getByLabel('Memo').fill('Check usage before renewal.')
  await page.getByRole('button', { name: 'Add subscription' }).click()

  await expect(page.getByRole('heading', { name: 'Build server' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Build server' })).toBeVisible()

  const buildServer = page.locator('article', { hasText: 'Build server' })
  await buildServer.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Amount').fill('55')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.locator('article', { hasText: 'Build server' }).getByText('$55/mo')).toBeVisible()

  await page.getByLabel('Filter subscriptions by status').selectOption('cancel-candidate')
  await expect(page.getByRole('heading', { name: 'Test analytics' })).toBeVisible()

  await page.getByLabel('Filter subscriptions by status').selectOption('all')
  await page.locator('article', { hasText: 'Build server' }).getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('heading', { name: 'Build server' })).toBeHidden()
})

test('validates required input and avoids mobile horizontal overflow', async ({ page }) => {
  await page.getByRole('button', { name: 'Add subscription' }).click()
  await expect(page.getByText('Service name is required.')).toBeVisible()

  await page.setViewportSize({ width: 390, height: 900 })
  await page.getByRole('button', { name: 'Load sample data' }).click()
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})
