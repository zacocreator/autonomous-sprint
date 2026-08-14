import { useEffect, useMemo, useState } from 'react'
import './App.css'

type TemplateKey = 'festival' | 'contest' | 'coverMv' | 'release' | 'live'
type Status = 'idea' | 'next' | 'doing' | 'waiting' | 'review' | 'ready'
type Severity = 'critical' | 'warning' | 'ready'
type WorkKind = 'song' | 'audio' | 'visual' | 'promo' | 'release' | 'live' | 'rights'

type WorkItem = {
  id: string
  title: string
  kind: WorkKind
  status: Status
  owner: string
  due: string
  dependency: string
  asset: string
  nextAction: string
}

type Project = {
  title: string
  template: TemplateKey
  deadline: string
  platform: string
  items: WorkItem[]
}

type Finding = {
  id: string
  severity: Severity
  title: string
  why: string
  action: string
  source: string
}

const STORAGE_KEY = 'music-campaign-board-mvp-v1'
const today = dateOffset(0)

const templates: Record<TemplateKey, { label: string; context: string; items: WorkItem[] }> = {
  festival: {
    label: '投稿祭 / ボカコレ',
    context: '締切、投稿ルール、動画、告知を同時に進める制作向け',
    items: [
      item('song-a', 'メイン曲案', 'song', 'doing', '自分', 10, 'なし', '2mix試作あり', '構成を固定して仮歌を書き出す'),
      item('song-b', '保留中の曲案', 'song', 'idea', '自分', 18, 'なし', '8小節モチーフのみ', '採用するか保留するか決める'),
      item('mix', 'ミックス / マスター', 'audio', 'next', '自分', 7, 'メイン曲案の構成確定', 'ラフのみ', '初回書き出しの期限を決める'),
      item('movie', '動画 / サムネイル', 'visual', 'waiting', '外注候補', 6, '歌詞・音源・参考資料', '未着手', '最低限の静止画動画にするか決める'),
      item('rules', '投稿ルール確認', 'release', 'next', '自分', 14, 'イベント公式情報', '未確認', '尺・タグ・投稿期間を確認する'),
      item('promo', '告知素材', 'promo', 'next', '自分', 4, '動画とURL', '未着手', 'X用文面と短尺素材を1本作る'),
    ],
  },
  contest: {
    label: 'DTMコンペ / 案件',
    context: '複数案、要件、提出物、修正条件を管理する制作向け',
    items: [
      item('brief', '募集要項 / ブリーフ', 'release', 'review', '自分', 20, 'クライアント/募集ページ', '確認中', '必須条件を未確認リストに落とす'),
      item('candidate-1', '候補曲 A', 'song', 'doing', '自分', 12, 'なし', 'デモあり', '提出候補として残すか判断する'),
      item('candidate-2', '候補曲 B', 'song', 'idea', '自分', 14, 'なし', 'モチーフのみ', 'これ以上進めるか止めるか決める'),
      item('mix', '提出用ミックス', 'audio', 'next', '自分', 5, '候補曲の決定', '未着手', '候補曲を1つに絞って書き出す'),
      item('delivery', '提出ファイル / 権利表記', 'rights', 'next', '自分', 3, '応募要項', '未整理', 'ファイル形式とクレジットを確認する'),
    ],
  },
  coverMv: {
    label: '歌ってみた / MV',
    context: '録音、ミックス、イラスト、動画、権利確認が分かれる制作向け',
    items: [
      item('recording', 'ボーカル録音', 'audio', 'doing', '自分', 15, 'オケ・歌詞', 'テイクあり', '採用テイクを選ぶ'),
      item('mix', 'ミックス依頼', 'audio', 'waiting', 'Mix担当', 10, '音源・BPM・参考曲', '素材不足', '依頼パックの不足を埋める'),
      item('illustration', 'イラスト', 'visual', 'waiting', '絵師', 12, '構図・納期・使用範囲', 'ラフ待ち', '使用範囲と納品形式を確認する'),
      item('movie', 'MV編集', 'visual', 'next', '動画担当', 7, '音源・イラスト', '未着手', '最低限の納品物を定義する'),
      item('rights', '原曲 / クレジット確認', 'rights', 'review', '自分', 20, '原曲情報', '確認中', '概要欄の表記を固める'),
      item('promo', '公開告知', 'promo', 'next', '自分', 4, 'サムネイル・URL', '未着手', '公開文面を作る'),
    ],
  },
  release: {
    label: '配信リリース',
    context: 'ディストリビューター、メタデータ、審査、ピッチ、告知の準備向け',
    items: [
      item('master', '最終音源', 'audio', 'review', '自分', 28, 'なし', 'マスター候補あり', 'ラウドネスと冒頭末尾を確認する'),
      item('metadata', '曲名 / 権利者 / 歌詞', 'rights', 'next', '自分', 24, '共同制作者確認', '未整理', '表記ゆれと権利者名をそろえる'),
      item('artwork', 'ジャケット', 'visual', 'waiting', 'デザイナー', 23, 'サイズ・文字入れ規定', 'ラフ待ち', '規定サイズと納品日を確認する'),
      item('distributor', '配信登録', 'release', 'next', '自分', 21, '音源・メタデータ・ジャケット', '未着手', '審査日数を逆算して登録する'),
      item('pitch', 'Spotify pitch / EPK', 'promo', 'next', '自分', 14, '配信登録完了', '未着手', 'ピッチ文の初稿を作る'),
      item('launch', 'SNS / Smart Link', 'promo', 'next', '自分', 5, '配信URL', '未着手', '予約リンク導線を作る'),
    ],
  },
  live: {
    label: 'ライブ / イベント',
    context: '曲、リハ、物販、告知、当日準備をまとめる小規模チーム向け',
    items: [
      item('setlist', 'セットリスト', 'live', 'review', 'バンド', 18, '出演時間', '候補あり', '曲順と転換を確認する'),
      item('rehearsal', 'リハーサル', 'live', 'next', 'バンド', 12, 'メンバー予定', '未確定', '候補日を2つに絞る'),
      item('new-song', '新曲仕上げ', 'song', 'doing', '全員', 10, 'デモ共有', 'ラフあり', '演奏できる尺まで縮める'),
      item('visual', 'フライヤー / 物販画像', 'visual', 'waiting', 'デザイナー', 9, 'イベント情報', '未着手', '最低限の告知画像を依頼する'),
      item('promo', '告知 / 予約導線', 'promo', 'next', '自分', 7, '会場URL・画像', '未着手', '予約リンク付き告知を出す'),
      item('day', '当日持ち物 / セット図', 'live', 'next', '全員', 3, '会場情報', '未整理', '共有できる当日メモを作る'),
    ],
  },
}

const statusColumns: { id: Status; label: string; hint: string }[] = [
  { id: 'idea', label: 'アイデア', hint: '保留・候補' },
  { id: 'next', label: '次にやる', hint: '未着手' },
  { id: 'doing', label: '作業中', hint: '進行中' },
  { id: 'waiting', label: '待ち', hint: '外部依存' },
  { id: 'review', label: '確認中', hint: '見直し' },
  { id: 'ready', label: '完了', hint: '準備済み' },
]

const kindLabels: Record<WorkKind, string> = {
  song: '曲',
  audio: '音源',
  visual: '映像/画像',
  promo: '告知',
  release: '提出/配信',
  live: 'ライブ',
  rights: '権利/表記',
}

function App() {
  const [project, setProject] = useState<Project>(() => readStoredProject())
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>(project.template)
  const [saved, setSaved] = useState('保存済み')

  useEffect(() => {
    setSaved('保存中')
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
    const timer = window.setTimeout(() => setSaved('保存済み'), 160)
    return () => window.clearTimeout(timer)
  }, [project])

  const findings = useMemo(() => diagnose(project), [project])
  const summary = useMemo(() => summarize(findings), [findings])
  const nextFocus = findings.filter((finding) => finding.severity !== 'ready').slice(0, 3)

  function applyTemplate(key: TemplateKey) {
    const template = templates[key]
    setSelectedTemplate(key)
    setProject({
      title: template.label,
      template: key,
      deadline: dateOffset(key === 'release' ? 35 : key === 'live' ? 21 : 18),
      platform: platformFor(key),
      items: template.items,
    })
  }

  function updateProject<Key extends keyof Project>(key: Key, value: Project[Key]) {
    setProject((current) => ({ ...current, [key]: value }))
  }

  function updateItem(id: string, patch: Partial<WorkItem>) {
    setProject((current) => ({
      ...current,
      items: current.items.map((work) => (work.id === id ? { ...work, ...patch } : work)),
    }))
  }

  function addRow() {
    const id = `item-${Date.now()}`
    setProject((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          id,
          title: '新しい制作項目',
          kind: 'song',
          status: 'next',
          owner: '自分',
          due: dateOffset(7),
          dependency: 'なし',
          asset: '未整理',
          nextAction: '次に必要な1アクションを書く',
        },
      ],
    }))
  }

  function addRecoveredRows() {
    setProject((current) => ({
      ...current,
      items: [
        ...current.items,
        item('recovered-night-bus', '復元候補: Night Bus', 'song', 'review', '自分', 14, 'なし', 'logicx / demo / lyricsあり', 'この企画で使うか保留するか判断する'),
        item('recovered-guitar', '復元候補: Guitar Motif', 'song', 'idea', '自分', 30, 'なし', 'ボイスメモのみ', '別プロジェクトに回すか決める'),
      ],
    }))
  }

  return (
    <div className="workspace-shell">
      <aside className="sidebar" aria-label="ナビゲーション">
        <div className="brand">
          <span className="brand-mark">MC</span>
          <div>
            <strong>Music Campaign</strong>
            <small>Board MVP</small>
          </div>
        </div>
        <nav>
          <a className="active" href="#board">制作ボード</a>
          <a href="#diagnosis">リスク診断</a>
          <a href="#templates">テンプレート</a>
          <a href="#recovery">フォルダ復元実験</a>
        </nav>
      </aside>

      <main className="main">
        <header className="page-header">
          <div>
            <p className="eyebrow">短期MVP</p>
            <h1>音楽制作カンバン</h1>
            <p>曲、素材、告知、提出準備を並べて、止まっている場所と次の一手を確認します。</p>
          </div>
          <div className="header-actions">
            <span aria-live="polite" className="save-state">{saved}</span>
            <button className="secondary" type="button" onClick={() => applyTemplate(project.template)}>サンプルに戻す</button>
            <button className="primary" type="button" onClick={addRow}>行を追加</button>
          </div>
        </header>

        <section className={`summary-bar summary-${summary.overall}`} aria-label="プロジェクト概要">
          <div className="project-fields">
            <label>
              プロジェクト名
              <input value={project.title} onChange={(event) => updateProject('title', event.target.value)} />
            </label>
            <label>
              締切
              <input type="date" value={project.deadline} onChange={(event) => updateProject('deadline', event.target.value)} />
            </label>
            <label>
              公開先 / 場所
              <input value={project.platform} onChange={(event) => updateProject('platform', event.target.value)} />
            </label>
          </div>
          <div className="metrics" aria-label="診断サマリー">
            <Metric label="総合" value={severityLabel(summary.overall)} />
            <Metric label="残日数" value={`${daysUntil(project.deadline)}日`} />
            <Metric label="Critical" value={`${summary.critical}`} />
            <Metric label="Warning" value={`${summary.warning}`} />
          </div>
        </section>

        <section className="toolbar" id="templates" aria-label="テンプレート">
          <div>
            <h2>テンプレート</h2>
            <p>{templates[selectedTemplate].context}</p>
          </div>
          <div className="template-tabs" role="tablist" aria-label="テンプレートを選ぶ">
            {(Object.keys(templates) as TemplateKey[]).map((key) => (
              <button
                aria-selected={selectedTemplate === key}
                className={selectedTemplate === key ? 'tab active' : 'tab'}
                key={key}
                onClick={() => setSelectedTemplate(key)}
                role="tab"
                type="button"
              >
                {templates[key].label}
              </button>
            ))}
          </div>
          <button className="secondary" type="button" onClick={() => applyTemplate(selectedTemplate)}>テンプレートを適用</button>
        </section>

        <div className="content-grid">
          <section className="board-area" id="board" aria-label="制作カンバン">
            <div className="section-title">
              <div>
                <h2>ワークストリーム</h2>
                <p>曲だけでなく、動画、告知、提出、ライブ準備も同じボードで扱えます。</p>
              </div>
            </div>
            <div className="kanban" aria-label="状態別カンバン">
              {statusColumns.map((column) => {
                const cards = project.items.filter((work) => work.status === column.id)
                return (
                  <section className="kanban-column" key={column.id} aria-label={`${column.label}列`}>
                    <header>
                      <div>
                        <h3>{column.label}</h3>
                        <span>{column.hint}</span>
                      </div>
                      <strong>{cards.length}</strong>
                    </header>
                    <div className="kanban-stack">
                      {cards.length === 0 ? <p className="empty">該当なし</p> : cards.map((work) => (
                        <article className={`work-card kind-${work.kind}`} key={work.id}>
                          <div className="card-line">
                            <span>{kindLabels[work.kind]}</span>
                            <small>{formatDue(work.due)}</small>
                          </div>
                          <h4>{work.title}</h4>
                          <p>{work.nextAction}</p>
                          <select
                            aria-label={`${work.title}の状態`}
                            value={work.status}
                            onChange={(event) => updateItem(work.id, { status: event.target.value as Status })}
                          >
                            {statusColumns.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                          </select>
                        </article>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>

            <div className="work-table-wrap" aria-label="制作項目一覧">
              <table>
                <caption>制作項目の詳細</caption>
                <thead>
                  <tr>
                    <th>項目</th>
                    <th>種別</th>
                    <th>状態</th>
                    <th>担当</th>
                    <th>期限</th>
                    <th>待ち / 依存</th>
                    <th>素材状態</th>
                    <th>次アクション</th>
                  </tr>
                </thead>
                <tbody>
                  {project.items.map((work) => (
                    <tr key={work.id}>
                      <td>
                        <input
                          aria-label={`${work.title}の項目名`}
                          value={work.title}
                          onChange={(event) => updateItem(work.id, { title: event.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          aria-label={`${work.title}の種別`}
                          value={work.kind}
                          onChange={(event) => updateItem(work.id, { kind: event.target.value as WorkKind })}
                        >
                          {(Object.keys(kindLabels) as WorkKind[]).map((kind) => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}
                        </select>
                      </td>
                      <td>
                        <select
                          aria-label={`${work.title}の一覧状態`}
                          value={work.status}
                          onChange={(event) => updateItem(work.id, { status: event.target.value as Status })}
                        >
                          {statusColumns.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
                        </select>
                      </td>
                      <td><input aria-label={`${work.title}の担当`} value={work.owner} onChange={(event) => updateItem(work.id, { owner: event.target.value })} /></td>
                      <td><input aria-label={`${work.title}の期限`} type="date" value={work.due} onChange={(event) => updateItem(work.id, { due: event.target.value })} /></td>
                      <td><input aria-label={`${work.title}の依存`} value={work.dependency} onChange={(event) => updateItem(work.id, { dependency: event.target.value })} /></td>
                      <td><input aria-label={`${work.title}の素材状態`} value={work.asset} onChange={(event) => updateItem(work.id, { asset: event.target.value })} /></td>
                      <td><input aria-label={`${work.title}の次アクション`} value={work.nextAction} onChange={(event) => updateItem(work.id, { nextAction: event.target.value })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="right-panel" id="diagnosis" aria-label="リスク診断">
            <section>
              <h2>次に見るべきこと</h2>
              <ol className="focus-list">
                {nextFocus.length > 0 ? nextFocus.map((finding) => (
                  <li key={finding.id}>
                    <span className={`dot ${finding.severity}`} />
                    <div>
                      <strong>{finding.action}</strong>
                      <small>{finding.source}</small>
                    </div>
                  </li>
                )) : (
                  <li>
                    <span className="dot ready" />
                    <div>
                      <strong>大きな未対応リスクは見えていません</strong>
                      <small>次の更新で状態が変わったら再診断されます。</small>
                    </div>
                  </li>
                )}
              </ol>
            </section>

            <section>
              <h2>Readiness診断</h2>
              <div className="finding-list">
                {findings.map((finding) => (
                  <article className={`finding ${finding.severity}`} key={finding.id}>
                    <div className="finding-head">
                      <span>{severityLabel(finding.severity)}</span>
                      <small>{finding.source}</small>
                    </div>
                    <h3>{finding.title}</h3>
                    <dl>
                      <div>
                        <dt>なぜ危ないか</dt>
                        <dd>{finding.why}</dd>
                      </div>
                      <div>
                        <dt>次にやること</dt>
                        <dd>{finding.action}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <section className="recovery-experiment" id="recovery" aria-label="フォルダ復元実験">
          <div>
            <h2>フォルダ復元実験</h2>
            <p>中長期仮説として、散らばった音源ファイルから曲候補を復元してボードに追加する導線です。短期MVPでは補助扱いに留めます。</p>
          </div>
          <button className="secondary" type="button" onClick={addRecoveredRows}>デモ候補を追加</button>
        </section>
      </main>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function item(
  id: string,
  title: string,
  kind: WorkKind,
  status: Status,
  owner: string,
  dueDays: number,
  dependency: string,
  asset: string,
  nextAction: string,
): WorkItem {
  return { id, title, kind, status, owner, due: dateOffset(dueDays), dependency, asset, nextAction }
}

function diagnose(project: Project): Finding[] {
  const findings: Finding[] = []
  const days = daysUntil(project.deadline)
  const activeWork = project.items.filter((work) => work.status !== 'ready')
  const waiting = activeWork.filter((work) => work.status === 'waiting')
  const dueSoon = activeWork.filter((work) => daysUntil(work.due) <= 7)
  const songItems = project.items.filter((work) => work.kind === 'song')
  const publicItems = project.items.filter((work) => ['visual', 'promo', 'release', 'rights'].includes(work.kind))
  const readySongCount = songItems.filter((work) => ['review', 'ready'].includes(work.status)).length
  const unresolvedAssets = activeWork.filter((work) => /未|不足|待ち|確認中|ラフ/.test(work.asset))

  if (!project.title.trim()) {
    findings.push(finding('no-title', 'critical', 'プロジェクトの目的が空です', '何に向けた制作か分からないと、曲、素材、告知、提出物の優先順位を診断できません。', 'プロジェクト名に締切やイベント名を入れる', 'プロジェクト名'))
  }

  if (days < 0) {
    findings.push(finding('past-deadline', 'critical', '締切が過ぎています', '期限が過去のままだと、今日やるべき項目の判定が崩れます。', '実際の締切へ更新する', '締切'))
  } else if (days <= 7 && activeWork.length >= 3) {
    findings.push(finding('too-many-open', 'critical', '締切直前に未完了項目が多すぎます', '音楽制作では最後に書き出し、動画、概要欄、告知が重なりやすく、複数項目が残ると公開直前に破綻します。', '今日動かす項目を3つ以内に絞る', '全体進捗'))
  }

  if (waiting.length > 0) {
    const urgent = waiting.some((work) => daysUntil(work.due) <= 10)
    findings.push(finding('external-wait', urgent ? 'critical' : 'warning', '外部依存で止まっている項目があります', 'イラスト、動画、ミックス、メンバー確認の待ちは、自分の作業時間では取り返しにくい遅延になります。', `${waiting[0].title}の不足素材と返信期限を確認する`, waiting.map((work) => work.title).join(' / ')))
  }

  if (readySongCount === 0 && days <= 14) {
    findings.push(finding('no-song-locked', 'critical', '曲の軸がまだ固定されていません', '曲が固まらないまま素材や告知を進めると、後工程のやり直しが増えます。', '採用曲または提出候補を1つに絞る', '曲'))
  }

  if (publicItems.some((work) => work.status === 'next') && days <= 10) {
    findings.push(finding('public-package-late', 'warning', '公開用パッケージが後回しです', 'YouTube、ニコニコ、配信リリースでは音源以外に画像、説明文、タグ、URL、告知素材が必要になります。', '最低限の公開素材を先に作る', '公開準備'))
  }

  if (unresolvedAssets.length >= 2) {
    findings.push(finding('asset-unclear', 'warning', '素材状態が曖昧な項目が複数あります', '未整理のままだと、必要なファイルがあるかではなく、探す作業に時間を使うことになります。', `${unresolvedAssets[0].title}から素材の有無を確定する`, '素材状態'))
  }

  if (dueSoon.length > 0) {
    findings.push(finding('due-soon', 'warning', '近日中に期限が来る項目があります', '締切前の細かい未完了は見落としやすく、公開直前の判断を増やします。', `${dueSoon[0].title}を今日の最優先にする`, dueSoon.map((work) => work.title).join(' / ')))
  }

  if (findings.length === 0) {
    findings.push(finding('ready', 'ready', 'この時点では大きなリスクは見えていません', '主要項目が完了または確認中に進んでおり、外部待ちも目立ちません。', '状態が変わったらボードを更新する', '全体進捗'))
  }

  return findings.sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
}

function finding(id: string, severity: Severity, title: string, why: string, action: string, source: string): Finding {
  return { id, severity, title, why, action, source }
}

function summarize(findings: Finding[]) {
  const critical = findings.filter((finding) => finding.severity === 'critical').length
  const warning = findings.filter((finding) => finding.severity === 'warning').length
  const ready = findings.filter((finding) => finding.severity === 'ready').length
  return { critical, warning, ready, overall: critical > 0 ? 'critical' : warning > 0 ? 'warning' : 'ready' as Severity }
}

function readStoredProject(): Project {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return normalizeProject(JSON.parse(raw))
  } catch {
    // 壊れた保存データは捨てて、検証用サンプルから始める。
  }
  return sampleProject()
}

function normalizeProject(value: unknown): Project {
  const record = value as Partial<Project>
  const template = record.template && templates[record.template] ? record.template : 'festival'
  return {
    title: record.title || templates[template].label,
    template,
    deadline: record.deadline || dateOffset(18),
    platform: record.platform || platformFor(template),
    items: Array.isArray(record.items) && record.items.length > 0 ? record.items.map(normalizeItem) : templates[template].items,
  }
}

function normalizeItem(value: Partial<WorkItem>): WorkItem {
  return {
    id: value.id || `item-${Date.now()}`,
    title: value.title || '未整理の項目',
    kind: value.kind || 'song',
    status: value.status || 'next',
    owner: value.owner || '自分',
    due: value.due || dateOffset(7),
    dependency: value.dependency || 'なし',
    asset: value.asset || '未整理',
    nextAction: value.nextAction || '次に必要な1アクションを書く',
  }
}

function sampleProject(): Project {
  return {
    title: templates.festival.label,
    template: 'festival',
    deadline: dateOffset(18),
    platform: platformFor('festival'),
    items: templates.festival.items,
  }
}

function platformFor(key: TemplateKey) {
  return {
    festival: 'ニコニコ / YouTube',
    contest: 'コンペ提出先',
    coverMv: 'YouTube / ニコニコ',
    release: 'Spotify / Apple Music / YouTube Music',
    live: 'ライブハウス / 配信',
  }[key]
}

function severityLabel(severity: Severity) {
  return {
    critical: 'Critical',
    warning: 'Warning',
    ready: 'Ready',
  }[severity]
}

function severityRank(severity: Severity) {
  return {
    critical: 0,
    warning: 1,
    ready: 2,
  }[severity]
}

function daysUntil(dateValue: string) {
  const current = new Date(`${today}T00:00:00`).getTime()
  const target = new Date(`${dateValue}T00:00:00`).getTime()
  return Math.ceil((target - current) / 86_400_000)
}

function formatDue(dateValue: string) {
  const days = daysUntil(dateValue)
  if (days < 0) return '期限超過'
  if (days === 0) return '今日'
  return `${days}日後`
}

function dateOffset(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export default App
