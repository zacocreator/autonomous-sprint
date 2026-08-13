import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('diagnoses a risky Spotify-centered release and updates after fixes', async ({ page }) => {
  await page.getByRole('button', { name: 'Load sample diagnosis' }).first().click()

  await expect(page.getByRole('heading', { name: 'Critical' })).toBeVisible()
  await expect(page.getByText('Spotify pitch is still unsubmitted')).toBeVisible()
  await expect(page.getByText('Why this matters').first()).toBeVisible()
  await expect(page.getByText('Next action').first()).toBeVisible()

  await page.getByLabel('Spotify pitch', { exact: true }).selectOption('submitted')
  await page.getByLabel('Distributor upload', { exact: true }).selectOption('approved')
  await page.getByLabel('Metadata', { exact: true }).selectOption('final')
  await page.getByLabel('Artwork', { exact: true }).selectOption('final')
  await page.getByLabel('Smart link / pre-save', { exact: true }).selectOption('ready')
  await page.getByLabel('SNS promo assets', { exact: true }).selectOption('ready')
  await page.getByLabel('EPK / press text', { exact: true }).selectOption('ready')
  await page.getByLabel('Known blockers', { exact: true }).fill('')
  await page.getByRole('button', { name: 'Run diagnosis' }).click()

  await expect(page.getByText('Spotify pitch is still unsubmitted')).toBeHidden()
  await expect(page.getByText('Spotify pitch is submitted')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ready', exact: true })).toBeVisible()
})

test('flags missing identity and keeps release state after reload', async ({ page }) => {
  await page.getByLabel('Release title').fill('')
  await page.getByLabel('Artist name').fill('')
  await page.getByRole('button', { name: 'Run diagnosis' }).click()

  await expect(page.getByText('Release identity is incomplete')).toBeVisible()
  await expect(page.getByLabel('Readiness diagnosis results').getByText('Enter the release title and artist name')).toBeVisible()

  await page.getByLabel('Release title').fill('Late Signal')
  await page.getByLabel('Artist name').fill('Autumn Console')
  await page.reload()

  await expect(page.getByLabel('Release title')).toHaveValue('Late Signal')
  await expect(page.getByLabel('Artist name')).toHaveValue('Autumn Console')
})

test('supports mobile diagnosis without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.getByRole('button', { name: 'Load sample diagnosis' }).first().click()

  await expect(page.getByText('Risks and next actions')).toBeVisible()
  await expect(page.getByText('Spotify pitch is still unsubmitted')).toBeVisible()

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})
