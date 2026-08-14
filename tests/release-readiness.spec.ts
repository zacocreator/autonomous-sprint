import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('surfaces event-centered risks and next focus from the sample project', async ({ page }) => {
  const results = page.getByLabel('リスク診断結果')

  await expect(page.getByRole('heading', { name: 'Music Deadline Studio' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Critical' })).toBeVisible()
  await expect(results.getByRole('heading', { name: 'Artwork / MV が外部待ちで締切リスクになっています' })).toBeVisible()
  await expect(results.getByRole('heading', { name: '投稿動画がまだありません' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '次に集中すること' })).toBeVisible()
  await expect(page.getByLabel('次にやること').getByText('依頼先に渡す音源、歌詞、参考、締切、使用範囲を1つのHandoffとして確定してください。')).toBeVisible()
})

test('updates diagnosis when production progress and assets are completed', async ({ page }) => {
  await page.getByLabel('Artwork / MV', { exact: true }).selectOption('done')
  await page.getByLabel('Mix / Master', { exact: true }).selectOption('done')
  await page.getByLabel('MV / 投稿動画', { exact: true }).selectOption('ready')
  await page.getByLabel('サムネ / ジャケット', { exact: true }).selectOption('ready')
  await page.getByLabel('SNS告知素材', { exact: true }).selectOption('ready')
  await page.getByLabel('Illustrator dependency').selectOption('received')
  await page.getByLabel('Video editor dependency').selectOption('received')
  await page.getByLabel('投稿期間 / 予約投稿 / 公開設定を確認した').check()
  await page.getByLabel('クレジット / 権利表記を確認した').check()
  await page.getByLabel('告知導線と初動投稿を用意した').check()

  await expect(page.getByText('Artwork / MV が外部待ちで締切リスクになっています')).toBeHidden()
  await expect(page.getByText('投稿動画がまだありません')).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Critical' })).toBeHidden()
})

test('persists project edits after reload', async ({ page }) => {
  await page.getByLabel('Project name').fill('M3秋向けデモ整理')
  await page.getByLabel('Event type').selectOption('dtm-contest')
  await page.getByLabel('Main platform').fill('SoundCloud / YouTube')
  await page.reload()

  await expect(page.getByLabel('Project name')).toHaveValue('M3秋向けデモ整理')
  await expect(page.getByLabel('Event type')).toHaveValue('dtm-contest')
  await expect(page.getByLabel('Main platform')).toHaveValue('SoundCloud / YouTube')
})

test('supports mobile use without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await expect(page.getByRole('heading', { name: 'Music Deadline Studio' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '次に集中すること' })).toBeVisible()

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})
