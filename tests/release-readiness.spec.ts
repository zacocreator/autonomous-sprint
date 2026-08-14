import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('日本語の音楽制作カンバンとして初回表示される', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '音楽制作カンバン' })).toBeVisible()
  await expect(page.getByLabel('制作カンバン')).toBeVisible()
  await expect(page.getByRole('heading', { name: '次に見るべきこと' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Readiness診断' })).toBeVisible()
  await expect(page.getByText('曲、素材、告知、提出準備')).toBeVisible()
})

test('テンプレートを適用すると管理対象が切り替わる', async ({ page }) => {
  await page.getByRole('tab', { name: 'ライブ / イベント' }).click()
  await page.getByRole('button', { name: 'テンプレートを適用' }).click()

  await expect(page.getByLabel('プロジェクト概要').getByLabel('プロジェクト名')).toHaveValue('ライブ / イベント')
  await expect(page.getByRole('heading', { name: 'セットリスト' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '当日持ち物 / セット図' })).toBeVisible()
  await expect(page.getByLabel('公開先 / 場所')).toHaveValue('ライブハウス / 配信')
})

test('状態変更からリスク診断と次アクションが更新される', async ({ page }) => {
  await expect(page.getByText('外部依存で止まっている項目があります')).toBeVisible()

  await page.getByLabel('動画 / サムネイルの状態').selectOption('ready')

  await expect(page.getByText('外部依存で止まっている項目があります')).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Readiness診断' })).toBeVisible()
})

test('入力内容が保存される', async ({ page }) => {
  await page.getByLabel('プロジェクト名').fill('秋の配信リリース')
  await page.getByRole('button', { name: '行を追加' }).click()
  await expect(page.getByLabel('新しい制作項目の項目名')).toHaveValue('新しい制作項目')

  await page.reload()

  await expect(page.getByLabel('プロジェクト名')).toHaveValue('秋の配信リリース')
  await expect(page.getByLabel('新しい制作項目の項目名')).toHaveValue('新しい制作項目')
})

test('フォルダ復元実験は補助導線として候補行を追加できる', async ({ page }) => {
  await page.getByRole('button', { name: 'デモ候補を追加' }).click()

  await expect(page.getByText('復元候補: Night Bus')).toBeVisible()
  await expect(page.getByText('復元候補: Guitar Motif')).toBeVisible()
})

test('モバイル幅でも主要UIが横にはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })

  await expect(page.getByRole('heading', { name: '音楽制作カンバン' })).toBeVisible()
  await expect(page.getByLabel('制作カンバン')).toBeVisible()

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})
