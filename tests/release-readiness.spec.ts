import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

test('ワークストリーム行と状態列を持つ音楽制作カンバンとして表示される', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '音楽制作カンバン' })).toBeVisible()
  await expect(page.getByLabel('ワークストリーム別カンバン')).toBeVisible()
  await expect(page.getByLabel('メイン曲行')).toBeVisible()
  await expect(page.getByLabel('動画 / サムネイル行')).toBeVisible()
  await expect(page.getByLabel('投稿準備行')).toBeVisible()
})

test('カードを選択すると詳細ペインで編集できる', async ({ page }) => {
  await page.getByRole('button', { name: /最低限の動画方針を決める/ }).click()

  await expect(page.getByRole('heading', { name: 'カード詳細' })).toBeVisible()
  await expect(page.getByLabel('待ち / 依存')).toHaveValue('歌詞・音源・参考資料')

  await page.getByLabel('次アクション').fill('動画担当へ不足素材を送る')
  await expect(page.getByLabel('次アクション')).toHaveValue('動画担当へ不足素材を送る')
})

test('カードをドラッグして状態を変更すると診断が更新される', async ({ page }) => {
  await expect(page.getByText('外部依存で止まっている項目があります')).toBeVisible()

  const card = page.getByRole('button', { name: /最低限の動画方針を決める/ })
  const readyCell = page.getByLabel('動画 / サムネイル行').locator('.lane-cell').nth(5)
  await card.dragTo(readyCell)

  await expect(page.getByText('外部依存で止まっている項目があります')).toBeHidden()
})

test('新規プロジェクト作成でテンプレートから別ボードを作れる', async ({ page }) => {
  await page.getByRole('button', { name: '新規プロジェクト' }).click()
  await page.getByRole('button', { name: /ライブ \/ イベント/ }).click()
  await page.getByLabel('新規プロジェクト名').fill('9月ライブ準備')
  await page.getByRole('button', { name: 'プロジェクトを作成' }).click()

  await expect(page.getByLabel('プロジェクト概要').getByLabel('プロジェクト名')).toHaveValue('9月ライブ準備')
  await expect(page.getByLabel('セットリスト行')).toBeVisible()
  await expect(page.getByRole('button', { name: /当日持ち物を共有する/ })).toBeVisible()
})

test('複数プロジェクトを切り替えて保存できる', async ({ page }) => {
  await page.getByRole('button', { name: '新規プロジェクト' }).click()
  await page.getByRole('button', { name: /配信リリース/ }).click()
  await page.getByLabel('新規プロジェクト名').fill('秋の配信リリース')
  await page.getByRole('button', { name: 'プロジェクトを作成' }).click()

  await expect(page.getByLabel('プロジェクト一覧').getByText('秋の配信リリース')).toBeVisible()
  await page.reload()

  await expect(page.getByLabel('プロジェクト概要').getByLabel('プロジェクト名')).toHaveValue('秋の配信リリース')
  await page.getByRole('button', { name: /投稿祭 \/ ボカコレ/ }).click()
  await expect(page.getByLabel('プロジェクト概要').getByLabel('プロジェクト名')).toHaveValue('投稿祭 / ボカコレ')
})

test('フォルダ復元実験は補助導線として候補カードを追加できる', async ({ page }) => {
  await page.getByRole('button', { name: 'デモ候補を追加' }).click()

  await expect(page.getByRole('button', { name: /復元候補: Night Bus/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /復元候補: Guitar Motif/ })).toBeVisible()
})

test('モバイル幅でも主要UIが横にはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })

  await expect(page.getByRole('heading', { name: '音楽制作カンバン' })).toBeVisible()
  await expect(page.getByLabel('ワークストリーム別カンバン')).toBeVisible()

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})
