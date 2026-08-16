# Music Campaign Board Design System

## Purpose

このドキュメントは、Music Campaign BoardのUIを設計・実装するためのデザイン基準です。

目的は、音楽制作者が複数の曲案や制作タスクを無理なく進められる、軽量で分かりやすいカンバン型プロダクトを一貫した品質で作ることです。

この文書は実装手順、開発履歴、検証ログ、意思決定ログではありません。

## Product Personality

Music Campaign Boardは、音楽活動のための静かで軽い作業ボードです。

印象として目指すもの:

- Asanaのように、タスクを消化していく気持ちよさがある
- Linearのように、状態が明快で余計な装飾がない
- 創作活動を邪魔しない
- 事務作業の重さを感じさせない
- 何を次に進めるかがすぐ分かる

避ける印象:

- 重い業務システム
- 派手なAIダッシュボード
- 装飾過多なクリエイティブツール
- 汎用タスク管理ツールのコピー
- 入力項目が多すぎる管理台帳

## Design Principles

### 1. Songs First

ユーザーは「タスク」そのものではなく、曲や制作物を前に進めたい。

画面構造は、プロジェクト配下に曲ごとの行があり、その中に作業カードがある形を基本にする。

### 2. Progress Should Feel Moveable

状態は読むだけでなく、動かせるものとして見えるべき。

カードは軽く、つかみやすく、移動後の状態がすぐ理解できるようにする。

### 3. Calm but Satisfying

派手な演出は不要。ただし、タスクを完了したとき、状態が進んだとき、少し気持ちよく感じられる反応は必要。

### 4. Music Context Without Clutter

音楽固有の情報は必要だが、すべてをカード上に出さない。

カードは最小限、詳細はペインで扱う。

### 5. Manual First

自動化やAIがなくても使えることを前提にする。

手入力、手動更新、手動整理が自然にできるUIを優先する。

## Information Architecture

### Primary Objects

#### Project

音楽活動のまとまり。

例:

- コンペ
- 投稿祭
- 配信リリース
- 制作案件
- 歌ってみた企画
- EP制作

#### Song Row

Project配下の曲単位。

例:

- 曲案A
- 曲案B
- メイン曲
- 予備曲
- コラボ曲
- 収録曲1

#### Task Card

曲に紐づく作業、素材、依頼、確認事項。

例:

- 構成を固める
- 仮ミックス
- 歌詞
- イラスト依頼
- 動画
- 投稿文
- 提出形式確認

#### Shared Row

曲に直接紐づかない共通作業。

例:

- 共通準備
- 告知
- 提出
- 配信登録
- ライブ準備

Shared Rowは補助的な行であり、UIの主役はSong Rowとする。

## Layout

### Desktop

基本構成:

```text
Sidebar | Main Board | Detail Panel
```

#### Sidebar

役割:

- プロジェクト一覧
- 新規プロジェクト作成
- 主要ビュー切替

見た目:

- 幅は240pxから280px
- 背景は白または最も薄いsurface
- 強い影は使わない
- 選択中プロジェクトのみ淡いsurfaceで示す

#### Main Board

役割:

- 曲ごとの行
- 状態列
- カード移動

見た目:

- 画面の主役
- 1画面で複数曲を比較できる密度
- 横スクロールは許容するが、行ラベルは常に把握しやすくする

#### Detail Panel

役割:

- 選択カードの詳細編集
- 依存、素材状態、期限、次アクションの確認

見た目:

- 右側固定
- カードより静か
- フォームは縦に並べる
- 必要な情報だけ表示する

### Mobile

モバイルでは横長ボードをそのまま再現しない。

優先する構成:

- プロジェクト選択
- 曲行ごとの折りたたみリスト
- カードタップで詳細表示
- 状態変更は詳細画面内で行う

## Board Model

### Columns

列は短く、状態だけを表す。

標準列:

- アイデア
- 次にやる
- 作業中
- 待ち
- 確認中
- 完了

列の意味:

- アイデア: 候補、未採用、温め中
- 次にやる: 着手可能
- 作業中: 現在進行中
- 待ち: 外部依存、素材待ち、返信待ち
- 確認中: レビュー、最終確認、提出前確認
- 完了: 現時点で完了

### Rows

標準は曲ごとの行。

行ラベルは短く、曲名または仮タイトルを使う。

例:

- Night Bus
- 曲案A
- 春M3候補
- コラボ曲

共通作業は下部にShared Rowとしてまとめる。

## Card Design

### Shape

- 角丸は4pxから6px
- 大きな丸みは使わない
- 影は使わないか、ごく弱くする
- 太いボーダーで強調しない

### Content

カード上に表示する情報:

- タイトル
- 種別
- 期限
- 待ち/依存の有無
- 小さなリスク表示

カード上に出しすぎない情報:

- 長文メモ
- 素材の詳細
- 権利メモ
- 依頼条件
- 複数行の説明

### Interaction

- クリックでDetail Panelを開く
- ドラッグで状態列を移動する
- 選択中カードは背景差または細いアクセントで示す
- hover時は軽いsurface変化に留める

### Completion Feeling

完了列へ移動したときは、控えめな成功感を出してよい。

許容:

- 軽い色変化
- 短いtransition
- 小さなReadyラベル

避ける:

- 派手なアニメーション
- 大きな演出
- 音や過剰な祝福表現

## Color System

### Neutral

主に画面構造に使う。

- Background: `#F6F7F9`
- Surface: `#FFFFFF`
- Surface Subtle: `#F1F4F7`
- Surface Selected: `#EAF1FB`
- Border Subtle: `#DDE3EA`
- Divider: `#E6EBF0`

### Text

- Text Primary: `#17232D`
- Text Secondary: `#526170`
- Text Muted: `#6B7A89`
- Text Disabled: `#9AA6B2`

### Brand / Primary

Primaryは主要アクションと選択状態に限定する。

- Primary: `#1F5AA6`
- Primary Hover: `#174A8D`
- Primary Surface: `#EAF1FB`
- Primary Text: `#123F75`

### Semantic

色だけで状態を伝えない。必ずテキストラベルを併用する。

- Critical: `#B42318`
- Critical Surface: `#FFF1F0`
- Warning: `#B7791F`
- Warning Surface: `#FFF7E6`
- Ready: `#15803D`
- Ready Surface: `#ECFDF3`

### Category Accents

カード種別を示すために使う。面全体ではなく、小さなラベルや細いインジケータに限定する。

- Song: `#3B6FDB`
- Audio: `#0F766E`
- Visual: `#6D5BD0`
- Promo: `#A16207`
- Release: `#475569`
- Rights: `#64748B`
- Live: `#BE123C`

## Typography

### Font

優先順:

```css
Inter, "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, system-ui, sans-serif
```

### Scale

- Page title: 24px / 600
- Section title: 16pxから18px / 600
- Row label: 13pxから14px / 600
- Card title: 13pxから14px / 600
- Body: 14px / 400
- Metadata: 12px / 400
- Button: 13pxから14px / 600

### Rules

- letter-spacingは0
- 長い曲名やカード名は折り返す
- ボタン内テキストは折り返さない
- 巨大な見出しやhero typographyは使わない

## Spacing

8pxグリッドを基本にする。

- Page padding: 24px
- Sidebar padding: 16px
- Panel padding: 16px
- Board cell padding: 8px
- Card padding: 8pxから10px
- Button height: 36pxから40px
- Row height minimum: 96px

## Components

### Buttons

#### Primary Button

用途:

- 新規プロジェクト
- 作成
- 主要保存アクション

特徴:

- Primary色の塗り
- 1画面または1領域に1つまで
- ラベルは動詞で始める

#### Secondary Button

用途:

- 行を追加
- カードを追加
- キャンセル
- 補助操作

特徴:

- 白背景
- 控えめなborder
- Primaryより目立たせない

#### Text Button

用途:

- 行内の小さな追加
- 詳細表示
- 補助リンク

特徴:

- 背景は基本なし
- 重要操作には使わない

### Project Item

Sidebar内のプロジェクト表示。

表示情報:

- Project title
- Template or type
- Deadline distance
- Risk count

選択中のみsurface selectedを使う。

### Song Row

曲単位の横行。

表示情報:

- 曲名
- 補助メタ情報
- その行にカードを追加する操作

行ラベルは固定的に見えるようにする。

### Task Card

小さく、動かしやすく、読みやすくする。

カードはタスクの概要だけを持つ。

### Detail Panel

カード詳細を編集する場所。

標準フィールド:

- タイトル
- 曲行
- 状態
- 種別
- 担当
- 期限
- 待ち/依存
- 素材状態
- 次アクション

### Readiness Panel

診断結果を表示する場所。

表示ルール:

- Critical / Warning / Readyをテキストで示す
- なぜ危ないかを短く示す
- 次にやることを1アクションで示す
- カードや行と関連づく場合は対象を示す

## Motion

motionは控えめに使う。

許容:

- hoverのsurface変化
- drag中の軽いopacity
- 完了移動時の短いtransition
- panel表示の短いfade

基準:

- duration: 120msから180ms
- easing: ease-out

避ける:

- 大きな移動アニメーション
- バウンド
- 常時動く装飾
- 操作を遅く感じさせる演出

## Accessibility

- 主要操作はキーボードで可能にする
- focus ringを消さない
- 色だけで状態を表さない
- ボタンには明確なラベルを付ける
- ドラッグ操作の代替として、詳細ペイン内の状態変更を用意する
- コントラストはWCAG AA相当を目標にする
- モバイルではタップターゲットを最低44px程度確保する

## Empty States

空状態は、説明ではなく次アクションを示す。

例:

- まだ曲がありません
- 曲行を追加して、最初のカードを作成してください
- この列にカードはありません

空状態に大きなイラストは不要。

## Error States

エラーは短く具体的に示す。

例:

- 保存できませんでした
- プロジェクト名を入力してください
- 期限の日付を確認してください

エラー時には、次に何をすべきかを併記する。

## Do

- 曲ごとの進捗が一目で比較できるようにする
- カードを軽く見せる
- 詳細は右ペインへ逃がす
- 完了操作に小さな気持ちよさを持たせる
- 共通作業は補助行として整理する
- 日本語の短いラベルを使う

## Do Not

- 過度な角丸を使わない
- 太いボーダーでUIを強調しない
- カードを大きくしすぎない
- 全ての情報をカード内に詰め込まない
- 画面を青一色にしない
- AIらしい装飾やグラデーションを入れない
- 曲以外の作業カテゴリを行構造の主役にしない

## Design Review Checklist

UIを実装・変更する前に以下を確認する。

- Project、Song Row、Task Cardの関係が崩れていない
- 曲ごとの行が主役になっている
- 共通作業は補助行として扱われている
- カードは軽く、移動しやすく見える
- 右ペインで詳細編集できる
- 色やボーダーで過剰に強調していない
- 角丸が強すぎない
- Asanaの軽さとLinearの明快さが両立している
- モバイルで代替操作がある
- 日本語ラベルが短く分かりやすい
