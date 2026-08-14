import { useEffect, useMemo, useState } from 'react'
import './App.css'

type TemplateKey = 'festival' | 'contest' | 'coverMv' | 'release' | 'live' | 'blank'
type Status = 'idea' | 'next' | 'doing' | 'waiting' | 'review' | 'ready'
type Severity = 'critical' | 'warning' | 'ready'
type WorkKind = 'song' | 'audio' | 'visual' | 'promo' | 'release' | 'live' | 'rights'

type WorkItem = {
  id: string
  title: string
  lane: string
  kind: WorkKind
  status: Status
  owner: string
  due: string
  dependency: string
  asset: string
  nextAction: string
}

type Project = {
  id: string
  title: string
  template: TemplateKey
  deadline: string
  platform: string
  items: WorkItem[]
}

type Workspace = {
  activeProjectId: string
  projects: Project[]
}

type Finding = {
  id: string
  severity: Severity
  title: string
  why: string
  action: string
  source: string
}

type NewProjectDraft = {
  template: TemplateKey
  title: string
  deadline: string
  platform: string
}

const STORAGE_KEY = 'music-campaign-board-workspace-v1'
const LEGACY_STORAGE_KEY = 'music-campaign-board-mvp-v1'
const today = dateOffset(0)

const statusColumns: { id: Status; label: string; hint: string }[] = [
  { id: 'idea', label: 'アイデア', hint: '候補' },
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

const templates: Record<TemplateKey, { label: string; context: string; lanes: string[]; items: WorkItem[] }> = {
  festival: {
    label: '投稿祭 / ボカコレ',
    context: '曲案、動画、投稿ルール、告知を締切に向けて進める',
    lanes: ['メイン曲', '曲案ストック', '動画 / サムネイル', '投稿準備', '告知'],
    items: [
      item('song-a', '構成を固定する', 'メイン曲', 'song', 'doing', '自分', 10, 'なし', '2mix試作あり', '仮歌を書き出して曲尺を固定する'),
      item('song-b', '保留曲を判断する', '曲案ストック', 'song', 'idea', '自分', 18, 'なし', '8小節モチーフのみ', '今回使うか別企画へ回すか決める'),
      item('mix', '初回ミックスを書き出す', 'メイン曲', 'audio', 'next', '自分', 7, '構成確定', 'ラフのみ', '初回書き出しの期限を決める'),
      item('movie', '最低限の動画方針を決める', '動画 / サムネイル', 'visual', 'waiting', '外注候補', 6, '歌詞・音源・参考資料', '未着手', '静止画動画かMVかを決める'),
      item('rules', '投稿ルールを確認する', '投稿準備', 'release', 'next', '自分', 14, 'イベント公式情報', '未確認', '尺・タグ・投稿期間を確認する'),
      item('promo', '告知素材を作る', '告知', 'promo', 'next', '自分', 4, '動画とURL', '未着手', 'X用文面と短尺素材を1本作る'),
    ],
  },
  contest: {
    label: 'DTMコンペ / 案件',
    context: '複数案、募集要項、提出物、修正条件を整理する',
    lanes: ['要件確認', '候補曲A', '候補曲B', '提出準備'],
    items: [
      item('brief', '募集要項を分解する', '要件確認', 'release', 'review', '自分', 20, '募集ページ', '確認中', '必須条件を未確認リストに落とす'),
      item('candidate-1', '候補曲Aを仕上げ候補にする', '候補曲A', 'song', 'doing', '自分', 12, 'なし', 'デモあり', '提出候補として残すか判断する'),
      item('candidate-2', '候補曲Bを続けるか決める', '候補曲B', 'song', 'idea', '自分', 14, 'なし', 'モチーフのみ', 'これ以上進めるか止めるか決める'),
      item('mix', '提出用ミックスを作る', '提出準備', 'audio', 'next', '自分', 5, '候補曲の決定', '未着手', '候補曲を1つに絞って書き出す'),
      item('delivery', '提出ファイルと権利表記を確認する', '提出準備', 'rights', 'next', '自分', 3, '応募要項', '未整理', 'ファイル形式とクレジットを確認する'),
    ],
  },
  coverMv: {
    label: '歌ってみた / MV',
    context: '録音、ミックス、イラスト、動画、権利確認をつなぐ',
    lanes: ['ボーカル', 'ミックス依頼', 'イラスト', 'MV編集', '公開準備'],
    items: [
      item('recording', '採用テイクを選ぶ', 'ボーカル', 'audio', 'doing', '自分', 15, 'オケ・歌詞', 'テイクあり', '採用テイクを選ぶ'),
      item('mix', 'ミックス依頼パックを揃える', 'ミックス依頼', 'audio', 'waiting', 'Mix担当', 10, '音源・BPM・参考曲', '素材不足', '依頼パックの不足を埋める'),
      item('illustration', 'イラスト使用範囲を確認する', 'イラスト', 'visual', 'waiting', '絵師', 12, '構図・納期・使用範囲', 'ラフ待ち', '使用範囲と納品形式を確認する'),
      item('movie', 'MV納品物を定義する', 'MV編集', 'visual', 'next', '動画担当', 7, '音源・イラスト', '未着手', '最低限の納品物を定義する'),
      item('rights', '原曲クレジットを固める', '公開準備', 'rights', 'review', '自分', 20, '原曲情報', '確認中', '概要欄の表記を固める'),
      item('promo', '公開告知を作る', '公開準備', 'promo', 'next', '自分', 4, 'サムネイル・URL', '未着手', '公開文面を作る'),
    ],
  },
  release: {
    label: '配信リリース',
    context: '音源、メタデータ、ジャケット、配信登録、ピッチ、告知を逆算する',
    lanes: ['最終音源', 'メタデータ', 'ジャケット', '配信登録', '告知'],
    items: [
      item('master', '最終音源を確認する', '最終音源', 'audio', 'review', '自分', 28, 'なし', 'マスター候補あり', 'ラウドネスと冒頭末尾を確認する'),
      item('metadata', '曲名と権利者名を揃える', 'メタデータ', 'rights', 'next', '自分', 24, '共同制作者確認', '未整理', '表記ゆれと権利者名をそろえる'),
      item('artwork', 'ジャケット規定を確認する', 'ジャケット', 'visual', 'waiting', 'デザイナー', 23, 'サイズ・文字入れ規定', 'ラフ待ち', '規定サイズと納品日を確認する'),
      item('distributor', '配信登録を開始する', '配信登録', 'release', 'next', '自分', 21, '音源・メタデータ・ジャケット', '未着手', '審査日数を逆算して登録する'),
      item('pitch', 'Spotify pitchを準備する', '告知', 'promo', 'next', '自分', 14, '配信登録完了', '未着手', 'ピッチ文の初稿を作る'),
      item('launch', 'Smart LinkとSNSを準備する', '告知', 'promo', 'next', '自分', 5, '配信URL', '未着手', '予約リンク導線を作る'),
    ],
  },
  live: {
    label: 'ライブ / イベント',
    context: '曲、リハ、物販、告知、当日準備をまとめる',
    lanes: ['セットリスト', '新曲', 'リハーサル', '告知', '当日準備'],
    items: [
      item('setlist', '曲順と転換を確認する', 'セットリスト', 'live', 'review', 'バンド', 18, '出演時間', '候補あり', '曲順と転換を確認する'),
      item('rehearsal', 'リハ日を決める', 'リハーサル', 'live', 'next', 'バンド', 12, 'メンバー予定', '未確定', '候補日を2つに絞る'),
      item('new-song', '新曲を演奏尺まで縮める', '新曲', 'song', 'doing', '全員', 10, 'デモ共有', 'ラフあり', '演奏できる尺まで縮める'),
      item('visual', '告知画像を依頼する', '告知', 'visual', 'waiting', 'デザイナー', 9, 'イベント情報', '未着手', '最低限の告知画像を依頼する'),
      item('promo', '予約導線を出す', '告知', 'promo', 'next', '自分', 7, '会場URL・画像', '未着手', '予約リンク付き告知を出す'),
      item('day', '当日持ち物を共有する', '当日準備', 'live', 'next', '全員', 3, '会場情報', '未整理', '共有できる当日メモを作る'),
    ],
  },
  blank: {
    label: '空のボード',
    context: '手動で曲・告知・ライブ準備などを組み立てる',
    lanes: ['未整理'],
    items: [item('manual-first', '最初の制作項目を入れる', '未整理', 'song', 'next', '自分', 7, 'なし', '未整理', '次に必要な1アクションを書く')],
  },
}

function App() {
  const [workspace, setWorkspace] = useState<Workspace>(() => readWorkspace())
  const [selectedItemId, setSelectedItemId] = useState(() => workspace.projects[0]?.items[0]?.id ?? '')
  const [draggedItemId, setDraggedItemId] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newProject, setNewProject] = useState<NewProjectDraft>(() => defaultDraft('festival'))
  const [saved, setSaved] = useState('保存済み')

  const activeProject = workspace.projects.find((project) => project.id === workspace.activeProjectId) ?? workspace.projects[0]
  const findings = useMemo(() => diagnose(activeProject), [activeProject])
  const summary = useMemo(() => summarize(findings), [findings])
  const selectedItem = activeProject.items.find((work) => work.id === selectedItemId) ?? activeProject.items[0]
  const lanes = useMemo(() => buildLanes(activeProject), [activeProject])

  useEffect(() => {
    setSaved('保存中')
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
    const timer = window.setTimeout(() => setSaved('保存済み'), 160)
    return () => window.clearTimeout(timer)
  }, [workspace])

  useEffect(() => {
    if (!activeProject.items.some((work) => work.id === selectedItemId)) {
      setSelectedItemId(activeProject.items[0]?.id ?? '')
    }
  }, [activeProject, selectedItemId])

  function updateActiveProject(patch: Partial<Project>) {
    setWorkspace((current) => ({
      ...current,
      projects: current.projects.map((project) => (project.id === current.activeProjectId ? { ...project, ...patch } : project)),
    }))
  }

  function updateItem(id: string, patch: Partial<WorkItem>) {
    setWorkspace((current) => ({
      ...current,
      projects: current.projects.map((project) => {
        if (project.id !== current.activeProjectId) return project
        return { ...project, items: project.items.map((work) => (work.id === id ? { ...work, ...patch } : work)) }
      }),
    }))
  }

  function addItem(lane: string, status: Status = 'next') {
    const id = makeId('item')
    const newItem: WorkItem = {
      id,
      title: '新しい制作項目',
      lane,
      kind: 'song',
      status,
      owner: '自分',
      due: dateOffset(7),
      dependency: 'なし',
      asset: '未整理',
      nextAction: '次に必要な1アクションを書く',
    }
    updateActiveProject({ items: [...activeProject.items, newItem] })
    setSelectedItemId(id)
  }

  function addLane() {
    const lane = `新しい行 ${lanes.length + 1}`
    addItem(lane, 'next')
  }

  function moveItem(id: string, lane: string, status: Status) {
    updateItem(id, { lane, status })
    setSelectedItemId(id)
  }

  function createProject() {
    const project = projectFromDraft(newProject)
    setWorkspace((current) => ({
      activeProjectId: project.id,
      projects: [...current.projects, project],
    }))
    setSelectedItemId(project.items[0]?.id ?? '')
    setIsCreating(false)
  }

  function switchProject(id: string) {
    const project = workspace.projects.find((candidate) => candidate.id === id)
    setWorkspace((current) => ({ ...current, activeProjectId: id }))
    setSelectedItemId(project?.items[0]?.id ?? '')
    setIsCreating(false)
  }

  function addRecoveredRows() {
    const recovered = [
      item(makeId('recovered'), '復元候補: Night Busを採用判断する', '曲案ストック', 'song', 'review', '自分', 14, 'なし', 'logicx / demo / lyricsあり', 'この企画で使うか保留するか判断する'),
      item(makeId('recovered'), '復元候補: Guitar Motifを保留整理する', '曲案ストック', 'song', 'idea', '自分', 30, 'なし', 'ボイスメモのみ', '別プロジェクトに回すか決める'),
    ]
    updateActiveProject({ items: [...activeProject.items, ...recovered] })
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
        <button className="primary full-width" type="button" onClick={() => setIsCreating(true)}>新規プロジェクト</button>
        <section className="project-list" aria-label="プロジェクト一覧">
          <h2>プロジェクト</h2>
          {workspace.projects.map((project) => {
            const projectSummary = summarize(diagnose(project))
            return (
              <button
                className={project.id === activeProject.id ? 'project-nav active' : 'project-nav'}
                key={project.id}
                onClick={() => switchProject(project.id)}
                type="button"
              >
                <span>{project.title}</span>
                <small>{templates[project.template].label} / {daysUntil(project.deadline)}日</small>
                <strong>{projectSummary.critical > 0 ? `Critical ${projectSummary.critical}` : projectSummary.warning > 0 ? `Warning ${projectSummary.warning}` : 'Ready'}</strong>
              </button>
            )
          })}
        </section>
        <nav>
          <a className="active" href="#board">制作ボード</a>
          <a href="#diagnosis">リスク診断</a>
          <a href="#recovery">フォルダ復元実験</a>
        </nav>
      </aside>

      <main className="main">
        <header className="page-header">
          <div>
            <p className="eyebrow">短期MVP / 3 Sprint PoC</p>
            <h1>音楽制作カンバン</h1>
            <p>縦にワークストリーム、横に状態を置き、カードを動かして制作・告知・提出準備を進めます。</p>
          </div>
          <div className="header-actions">
            <span aria-live="polite" className="save-state">{saved}</span>
            <button className="secondary" type="button" onClick={addLane}>行を追加</button>
            <button className="primary" type="button" onClick={() => addItem(lanes[0] ?? '未整理')}>カードを追加</button>
          </div>
        </header>

        {isCreating && (
          <section className="create-panel" aria-label="新規プロジェクト作成">
            <div className="section-title">
              <div>
                <h2>新しい音楽プロジェクトを作る</h2>
                <p>テンプレートを選ぶと、初期の行とカードが作られます。空のボードから手動で始めることもできます。</p>
              </div>
              <button className="secondary" type="button" onClick={() => setIsCreating(false)}>閉じる</button>
            </div>
            <div className="template-cards" role="list">
              {(Object.keys(templates) as TemplateKey[]).map((key) => (
                <button
                  aria-pressed={newProject.template === key}
                  className={newProject.template === key ? 'template-card active' : 'template-card'}
                  key={key}
                  onClick={() => setNewProject(defaultDraft(key))}
                  type="button"
                >
                  <strong>{templates[key].label}</strong>
                  <span>{templates[key].context}</span>
                  <small>{templates[key].lanes.join(' / ')}</small>
                </button>
              ))}
            </div>
            <div className="create-fields">
              <label>
                新規プロジェクト名
                <input value={newProject.title} onChange={(event) => setNewProject((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label>
                締切
                <input type="date" value={newProject.deadline} onChange={(event) => setNewProject((current) => ({ ...current, deadline: event.target.value }))} />
              </label>
              <label>
                公開先 / 場所
                <input value={newProject.platform} onChange={(event) => setNewProject((current) => ({ ...current, platform: event.target.value }))} />
              </label>
              <button className="primary" type="button" onClick={createProject}>プロジェクトを作成</button>
            </div>
          </section>
        )}

        <section className={`summary-bar summary-${summary.overall}`} aria-label="プロジェクト概要">
          <div className="project-fields">
            <label>
              プロジェクト名
              <input value={activeProject.title} onChange={(event) => updateActiveProject({ title: event.target.value })} />
            </label>
            <label>
              締切
              <input type="date" value={activeProject.deadline} onChange={(event) => updateActiveProject({ deadline: event.target.value })} />
            </label>
            <label>
              公開先 / 場所
              <input value={activeProject.platform} onChange={(event) => updateActiveProject({ platform: event.target.value })} />
            </label>
          </div>
          <div className="metrics" aria-label="診断サマリー">
            <Metric label="総合" value={severityLabel(summary.overall)} />
            <Metric label="残日数" value={`${daysUntil(activeProject.deadline)}日`} />
            <Metric label="Critical" value={`${summary.critical}`} />
            <Metric label="Warning" value={`${summary.warning}`} />
          </div>
        </section>

        <div className="content-grid">
          <section className="board-area" id="board" aria-label="制作カンバン">
            <div className="section-title">
              <div>
                <h2>ワークストリームボード</h2>
                <p>カードはドラッグで列移動できます。行は曲、MV、告知、配信、ライブ準備など自由に分けられます。</p>
              </div>
            </div>
            <div className="swimlane-board" aria-label="ワークストリーム別カンバン">
              <div className="status-header-row">
                <span>行</span>
                {statusColumns.map((column) => <strong key={column.id}>{column.label}<small>{column.hint}</small></strong>)}
              </div>
              {lanes.map((lane) => (
                <section className="swimlane" key={lane} aria-label={`${lane}行`}>
                  <div className="lane-label">
                    <strong>{lane}</strong>
                    <button className="text-button" type="button" onClick={() => addItem(lane)}>+ 追加</button>
                  </div>
                  {statusColumns.map((column) => {
                    const cards = activeProject.items.filter((work) => work.lane === lane && work.status === column.id)
                    return (
                      <div
                        className="lane-cell"
                        key={column.id}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (draggedItemId) moveItem(draggedItemId, lane, column.id)
                          setDraggedItemId('')
                        }}
                      >
                        {cards.map((work) => (
                          <button
                            className={`work-card kind-${work.kind} ${selectedItem?.id === work.id ? 'selected' : ''}`}
                            draggable
                            key={work.id}
                            onClick={() => setSelectedItemId(work.id)}
                            onDragStart={() => setDraggedItemId(work.id)}
                            type="button"
                          >
                            <span className="card-line">
                              <span>{kindLabels[work.kind]}</span>
                              <small>{formatDue(work.due)}</small>
                            </span>
                            <strong>{work.title}</strong>
                            <small>{work.dependency === 'なし' ? work.nextAction : `待ち: ${work.dependency}`}</small>
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </section>
              ))}
            </div>

            <details className="table-details">
              <summary>一覧で編集</summary>
              <div className="work-table-wrap" aria-label="制作項目一覧">
                <table>
                  <caption>制作項目の詳細</caption>
                  <thead>
                    <tr>
                      <th>項目</th>
                      <th>行</th>
                      <th>種別</th>
                      <th>状態</th>
                      <th>担当</th>
                      <th>期限</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeProject.items.map((work) => (
                      <tr key={work.id}>
                        <td><input aria-label={`${work.title}の項目名`} value={work.title} onChange={(event) => updateItem(work.id, { title: event.target.value })} /></td>
                        <td><input aria-label={`${work.title}の行`} value={work.lane} onChange={(event) => updateItem(work.id, { lane: event.target.value })} /></td>
                        <td>
                          <select aria-label={`${work.title}の種別`} value={work.kind} onChange={(event) => updateItem(work.id, { kind: event.target.value as WorkKind })}>
                            {(Object.keys(kindLabels) as WorkKind[]).map((kind) => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}
                          </select>
                        </td>
                        <td>
                          <select aria-label={`${work.title}の一覧状態`} value={work.status} onChange={(event) => updateItem(work.id, { status: event.target.value as Status })}>
                            {statusColumns.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
                          </select>
                        </td>
                        <td><input aria-label={`${work.title}の担当`} value={work.owner} onChange={(event) => updateItem(work.id, { owner: event.target.value })} /></td>
                        <td><input aria-label={`${work.title}の期限`} type="date" value={work.due} onChange={(event) => updateItem(work.id, { due: event.target.value })} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          <aside className="inspector" aria-label="詳細ペイン">
            {selectedItem ? (
              <section>
                <div className="section-title">
                  <div>
                    <h2>カード詳細</h2>
                    <p>{selectedItem.lane} / {kindLabels[selectedItem.kind]}</p>
                  </div>
                </div>
                <div className="inspector-fields">
                  <label>
                    タイトル
                    <input value={selectedItem.title} onChange={(event) => updateItem(selectedItem.id, { title: event.target.value })} />
                  </label>
                  <label>
                    行
                    <input value={selectedItem.lane} onChange={(event) => updateItem(selectedItem.id, { lane: event.target.value })} />
                  </label>
                  <label>
                    状態
                    <select value={selectedItem.status} onChange={(event) => updateItem(selectedItem.id, { status: event.target.value as Status })}>
                      {statusColumns.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}
                    </select>
                  </label>
                  <label>
                    種別
                    <select value={selectedItem.kind} onChange={(event) => updateItem(selectedItem.id, { kind: event.target.value as WorkKind })}>
                      {(Object.keys(kindLabels) as WorkKind[]).map((kind) => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}
                    </select>
                  </label>
                  <label>
                    担当
                    <input value={selectedItem.owner} onChange={(event) => updateItem(selectedItem.id, { owner: event.target.value })} />
                  </label>
                  <label>
                    期限
                    <input type="date" value={selectedItem.due} onChange={(event) => updateItem(selectedItem.id, { due: event.target.value })} />
                  </label>
                  <label>
                    待ち / 依存
                    <input value={selectedItem.dependency} onChange={(event) => updateItem(selectedItem.id, { dependency: event.target.value })} />
                  </label>
                  <label>
                    素材状態
                    <input value={selectedItem.asset} onChange={(event) => updateItem(selectedItem.id, { asset: event.target.value })} />
                  </label>
                  <label>
                    次アクション
                    <input value={selectedItem.nextAction} onChange={(event) => updateItem(selectedItem.id, { nextAction: event.target.value })} />
                  </label>
                </div>
              </section>
            ) : (
              <section>
                <h2>カード詳細</h2>
                <p>カードを選ぶと詳細を編集できます。</p>
              </section>
            )}
          </aside>

          <aside className="right-panel" id="diagnosis" aria-label="リスク診断">
            <section>
              <h2>次に見るべきこと</h2>
              <ol className="focus-list">
                {findings.filter((finding) => finding.severity !== 'ready').slice(0, 3).map((finding) => (
                  <li key={finding.id}>
                    <span className={`dot ${finding.severity}`} />
                    <div>
                      <strong>{finding.action}</strong>
                      <small>{finding.source}</small>
                    </div>
                  </li>
                ))}
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
            <p>中長期仮説です。短期MVPでは、散らばった曲候補を手動ボードへ追加する補助導線として扱います。</p>
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

function item(id: string, title: string, lane: string, kind: WorkKind, status: Status, owner: string, dueDays: number, dependency: string, asset: string, nextAction: string): WorkItem {
  return { id, title, lane, kind, status, owner, due: dateOffset(dueDays), dependency, asset, nextAction }
}

function diagnose(project: Project): Finding[] {
  const findings: Finding[] = []
  const days = daysUntil(project.deadline)
  const activeWork = project.items.filter((work) => work.status !== 'ready')
  const waiting = activeWork.filter((work) => work.status === 'waiting')
  const dueSoon = activeWork.filter((work) => daysUntil(work.due) <= 7)
  const laneMap = buildLanes(project)
  const stalledLanes = laneMap.filter((lane) => project.items.some((work) => work.lane === lane && ['waiting', 'idea'].includes(work.status)) && !project.items.some((work) => work.lane === lane && work.status === 'ready'))
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
  if (stalledLanes.length > 0) {
    findings.push(finding('lane-stalled', 'warning', '止まっている行があります', '行単位で進捗が止まると、曲や告知などまとまりごと放置されやすくなります。', `${stalledLanes[0]}のカードを1つ次の状態へ動かす`, stalledLanes.join(' / ')))
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

function readWorkspace(): Workspace {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return normalizeWorkspace(JSON.parse(raw))
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) return normalizeWorkspace({ activeProjectId: 'legacy', projects: [{ id: 'legacy', ...JSON.parse(legacy) }] })
  } catch {
    // 壊れた保存データは捨てて、検証用サンプルから始める。
  }
  const project = projectFromDraft(defaultDraft('festival'))
  return { activeProjectId: project.id, projects: [project] }
}

function normalizeWorkspace(value: unknown): Workspace {
  const record = value as Partial<Workspace>
  const projects = Array.isArray(record.projects) && record.projects.length > 0 ? record.projects.map(normalizeProject) : [projectFromDraft(defaultDraft('festival'))]
  const activeProjectId = projects.some((project) => project.id === record.activeProjectId) ? record.activeProjectId as string : projects[0].id
  return { activeProjectId, projects }
}

function normalizeProject(value: Partial<Project>): Project {
  const template = value.template && templates[value.template] ? value.template : 'festival'
  const id = value.id || makeId('project')
  return {
    id,
    title: value.title || templates[template].label,
    template,
    deadline: value.deadline || dateOffset(18),
    platform: value.platform || platformFor(template),
    items: Array.isArray(value.items) && value.items.length > 0 ? value.items.map(normalizeItem) : cloneItems(templates[template].items),
  }
}

function normalizeItem(value: Partial<WorkItem>): WorkItem {
  return {
    id: value.id || makeId('item'),
    title: value.title || '未整理の項目',
    lane: value.lane || kindLabels[value.kind || 'song'],
    kind: value.kind || 'song',
    status: value.status || 'next',
    owner: value.owner || '自分',
    due: value.due || dateOffset(7),
    dependency: value.dependency || 'なし',
    asset: value.asset || '未整理',
    nextAction: value.nextAction || '次に必要な1アクションを書く',
  }
}

function defaultDraft(template: TemplateKey): NewProjectDraft {
  return {
    template,
    title: templates[template].label,
    deadline: dateOffset(template === 'release' ? 35 : template === 'live' ? 21 : 18),
    platform: platformFor(template),
  }
}

function projectFromDraft(draft: NewProjectDraft): Project {
  return {
    id: makeId('project'),
    title: draft.title,
    template: draft.template,
    deadline: draft.deadline,
    platform: draft.platform,
    items: cloneItems(templates[draft.template].items),
  }
}

function cloneItems(items: WorkItem[]) {
  return items.map((work) => ({ ...work, id: makeId(work.id) }))
}

function buildLanes(project: Project) {
  return Array.from(new Set(project.items.map((work) => work.lane.trim()).filter(Boolean)))
}

function platformFor(key: TemplateKey) {
  return {
    festival: 'ニコニコ / YouTube',
    contest: 'コンペ提出先',
    coverMv: 'YouTube / ニコニコ',
    release: 'Spotify / Apple Music / YouTube Music',
    live: 'ライブハウス / 配信',
    blank: '未定',
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

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default App
