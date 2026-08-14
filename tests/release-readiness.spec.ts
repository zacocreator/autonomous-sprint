import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('recovers a campaign board from the demo music folder', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Music Deadline Studio' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Start from a messy music folder, not a blank task board.' })).toBeVisible()

  await page.getByRole('button', { name: 'Recover demo folder' }).click()

  await expect(page.getByRole('heading', { name: /Demo folder:/ })).toBeVisible()
  await expect(page.getByText('files analyzed locally by file trace')).toBeVisible()
  await expect(page.getByLabel('Detected song groups').getByText('Night Bus')).toBeVisible()
  await expect(page.getByLabel('Detected song groups').getByText('Guitar Motif')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Recovered music workflow' })).toBeVisible()
  await expect(page.getByLabel('Production kanban').getByText('Night Bus')).toBeVisible()
})

test('shows inferred risks and cause cards after recovery', async ({ page }) => {
  await page.getByRole('button', { name: 'Recover demo folder' }).click()

  await expect(page.getByRole('heading', { name: 'Dormant idea was recovered from the folder' })).toBeVisible()
  await expect(page.getByLabel('Risk diagnosis results').getByText('Cause card').first()).toBeVisible()
  await expect(page.getByLabel('Next focus').getByText('Review Guitar Motif')).toBeVisible()
})

test('updates diagnosis when recovered board cards are completed', async ({ page }) => {
  await page.getByRole('button', { name: 'Recover demo folder' }).click()

  await page.getByLabel('MV / video', { exact: true }).selectOption('ready')
  await page.getByLabel('Artwork / thumbnail', { exact: true }).selectOption('ready')
  await page.getByLabel('SNS assets', { exact: true }).selectOption('ready')
  await page.getByLabel('Mix / master', { exact: true }).selectOption('done')
  await page.getByLabel('Promotion path checked').check()

  await expect(page.getByText('No video asset was found')).toBeHidden()
  await expect(page.getByText('Promotion path is not ready')).toBeHidden()
})

test('persists recovered folder state after reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Recover demo folder' }).click()
  await expect(page.getByRole('textbox', { name: 'Project' })).toHaveValue('Demo folder recovery')

  await page.reload()

  await expect(page.getByRole('textbox', { name: 'Project' })).toHaveValue('Demo folder recovery')
  await expect(page.getByRole('heading', { name: /Demo folder:/ })).toBeVisible()
})

test('supports mobile recovery view without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.getByRole('button', { name: 'Recover demo folder' }).click()

  await expect(page.getByRole('heading', { name: 'Music Deadline Studio' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Recovered music workflow' })).toBeVisible()

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})
