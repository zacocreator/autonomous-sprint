import { useEffect, useMemo, useState } from 'react'
import './App.css'

type EventType = 'bokacolle' | 'dtm-contest' | 'cover-mv' | 'distribution'
type IdeaState = 'keep' | 'maybe' | 'parked' | 'rejected'
type WorkStatus = 'not-started' | 'in-progress' | 'blocked' | 'done'
type AssetStatus = 'missing' | 'draft' | 'ready'
type DependencyStatus = 'none' | 'planned' | 'waiting' | 'received'
type Severity = 'critical' | 'warning' | 'ready'
type Priority = 'Today' | 'This week' | 'Before deadline' | 'Monitor'
type BoardColumnId = 'decide' | 'next' | 'doing' | 'waiting' | 'ready'

type Idea = {
  id: string
  title: string
  state: IdeaState
  note: string
}

type WorkLane = {
  id: string
  label: string
  status: WorkStatus
}

type Asset = {
  id: string
  label: string
  status: AssetStatus
}

type ProjectState = {
  projectName: string
  eventType: EventType
  deadline: string
  platform: string
  goal: string
  activeIdeaId: string
  ideas: Idea[]
  lanes: WorkLane[]
  assets: Asset[]
  illustrator: DependencyStatus
  videoEditor: DependencyStatus
  mixMaster: DependencyStatus
  eventRulesChecked: boolean
  postingWindowChecked: boolean
  creditsChecked: boolean
  promoPlanReady: boolean
}

type Finding = {
  id: string
  severity: Severity
  title: string
  why: string
  signal: string
  action: string
  priority: Priority
}

type BoardCard =
  | { id: string; column: BoardColumnId; kind: 'idea'; title: string; meta: string; note: string; ideaId: string; state: IdeaState; active: boolean }
  | { id: string; column: BoardColumnId; kind: 'lane'; title: string; meta: string; note: string; laneId: string; status: WorkStatus }
  | { id: string; column: BoardColumnId; kind: 'asset'; title: string; meta: string; note: string; assetId: string; status: AssetStatus }
  | { id: string; column: BoardColumnId; kind: 'dependency'; title: string; meta: string; note: string; dependencyId: 'illustrator' | 'videoEditor' | 'mixMaster'; status: DependencyStatus }
  | { id: string; column: BoardColumnId; kind: 'rule'; title: string; meta: string; note: string; ruleId: 'eventRulesChecked' | 'postingWindowChecked' | 'creditsChecked' | 'promoPlanReady'; checked: boolean }

const STORAGE_KEY = 'deadline-music-os-v2'
const todayISO = toDateInputValue(new Date())

const sampleProject: ProjectState = {
  projectName: 'ボカコレ2026夏 Top100挑戦',
  eventType: 'bokacolle',
  deadline: offsetDate(18),
  platform: 'NicoNico / YouTube',
  goal: '投稿祭に合わせて1曲を完成させ、初動で聴かれる状態にする',
  activeIdeaId: 'idea-1',
  ideas: [
    { id: 'idea-1', title: '夜行バスのシンセロック', state: 'keep', note: '本命。サビ強めでMV化しやすい' },
    { id: 'idea-2', title: '透明感ピアノDnB', state: 'maybe', note: '展開がまだ弱い' },
    { id: 'idea-3', title: '8小節ギターリフ', state: 'parked', note: '別企画向き' },
    { id: 'idea-4', title: '和風EDM断片', state: 'rejected', note: '締切に対して作業量が重い' },
  ],
  lanes: [
    { id: 'composition', label: '作曲 / メロ', status: 'done' },
    { id: 'arrangement', label: '編曲', status: 'in-progress' },
    { id: 'vocal', label: 'ボーカル / 調声', status: 'in-progress' },
    { id: 'mix', label: 'Mix / Master', status: 'not-started' },
    { id: 'artwork', label: 'Artwork / MV', status: 'blocked' },
    { id: 'upload', label: '投稿準備', status: 'not-started' },
    { id: 'promotion', label: '告知 / 初動', status: 'not-started' },
  ],
  assets: [
    { id: 'audio', label: '完成音源', status: 'draft' },
    { id: 'lyrics', label: '歌詞', status: 'ready' },
    { id: 'artwork', label: 'サムネ / ジャケット', status: 'missing' },
    { id: 'video', label: 'MV / 投稿動画', status: 'missing' },
    { id: 'description', label: '概要欄 / タグ', status: 'draft' },
    { id: 'credits', label: 'クレジット', status: 'draft' },
    { id: 'sns', label: 'SNS告知素材', status: 'missing' },
  ],
  illustrator: 'waiting',
  videoEditor: 'none',
  mixMaster: 'planned',
  eventRulesChecked: true,
  postingWindowChecked: false,
  creditsChecked: false,
  promoPlanReady: false,
}

const blankProject: ProjectState = {
  ...sampleProject,
  projectName: '',
  deadline: offsetDate(30),
  goal: '',
  activeIdeaId: 'idea-1',
  ideas: sampleProject.ideas.map((idea, index) => ({
    ...idea,
    title: index === 0 ? '新しい曲案' : '',
    note: '',
    state: index === 0 ? 'keep' : 'parked',
  })),
  lanes: sampleProject.lanes.map((lane) => ({ ...lane, status: 'not-started' })),
  assets: sampleProject.assets.map((asset) => ({ ...asset, status: 'missing' })),
  illustrator: 'none',
  videoEditor: 'none',
  mixMaster: 'none',
  eventRulesChecked: false,
  postingWindowChecked: false,
  creditsChecked: false,
  promoPlanReady: false,
}

const columns: { id: BoardColumnId; title: string; subtitle: string }[] = [
  { id: 'decide', title: 'Decide', subtitle: '曲案と方針' },
  { id: 'next', title: 'Next up', subtitle: '未着手' },
  { id: 'doing', title: 'Doing', subtitle: '制作中' },
  { id: 'waiting', title: 'Waiting', subtitle: '外部待ち/詰まり' },
  { id: 'ready', title: 'Ready', subtitle: '完了/確認済み' },
]

const severityRank: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  ready: 2,
}

function App() {
  const [project, setProject] = useState<ProjectState>(sampleProject)
  const [isLoaded, setIsLoaded] = useState(false)
  const [storageWarning, setStorageWarning] = useState('')
  const [saveState, setSaveState] = useState<'Saved' | 'Saving...'>('Saved')

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) setProject(parseProject(JSON.parse(raw)))
    } catch {
      setStorageWarning('保存済みの制作データを読み込めませんでした。このまま新しい状態で続けられます。')
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    setSaveState('Saving...')
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
      setStorageWarning('')
    } catch {
      setStorageWarning('このブラウザでは変更を保存できません。検証中はタブを開いたままにしてください。')
    }
    setSaveState('Saved')
  }, [isLoaded, project])

  const findings = useMemo(() => diagnoseProject(project), [project])
  const summary = useMemo(() => summarizeFindings(findings), [findings])
  const nextFocus = findings.filter((finding) => finding.severity !== 'ready').slice(0, 3)
  const boardCards = useMemo(() => buildBoard(project), [project])
  const days = daysUntil(project.deadline)

  function updateProject<Key extends keyof ProjectState>(key: Key, value: ProjectState[Key]) {
    setProject((current) => ({ ...current, [key]: value }))
  }

  function updateIdea(id: string, patch: Partial<Idea>) {
    setProject((current) => ({
      ...current,
      ideas: current.ideas.map((idea) => (idea.id === id ? { ...idea, ...patch } : idea)),
    }))
  }

  function updateLane(id: string, status: WorkStatus) {
    setProject((current) => ({
      ...current,
      lanes: current.lanes.map((lane) => (lane.id === id ? { ...lane, status } : lane)),
    }))
  }

  function updateAsset(id: string, status: AssetStatus) {
    setProject((current) => ({
      ...current,
      assets: current.assets.map((asset) => (asset.id === id ? { ...asset, status } : asset)),
    }))
  }

  function updateDependency(id: 'illustrator' | 'videoEditor' | 'mixMaster', status: DependencyStatus) {
    setProject((current) => ({ ...current, [id]: status }))
  }

  function updateRule(id: 'eventRulesChecked' | 'postingWindowChecked' | 'creditsChecked' | 'promoPlanReady', checked: boolean) {
    setProject((current) => ({ ...current, [id]: checked }))
  }

  function loadSample() {
    setProject(sampleProject)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetProject() {
    setProject(blankProject)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Music production board</p>
          <h1>Music Deadline Studio</h1>
        </div>
        <div className="topbar-actions">
          <span className="save-state" aria-live="polite">{saveState}</span>
          <button className="secondary" type="button" onClick={loadSample}>サンプル</button>
          <button className="ghost" type="button" onClick={resetProject}>リセット</button>
        </div>
      </header>

      {storageWarning && <p className="alert">{storageWarning}</p>}

      <section className={`command-bar overall-${summary.overall}`} aria-label="プロジェクト概要とリスクサマリー">
        <div className="project-fields">
          <label>
            Project
            <input value={project.projectName} onChange={(event) => updateProject('projectName', event.target.value)} placeholder="ボカコレ2026夏 Top100挑戦" />
          </label>
          <label>
            Deadline
            <input type="date" value={project.deadline} onChange={(event) => updateProject('deadline', event.target.value)} />
          </label>
          <label>
            Type
            <select aria-label="Event type" value={project.eventType} onChange={(event) => updateProject('eventType', event.target.value as EventType)}>
              <option value="bokacolle">ボカコレ / 投稿祭</option>
              <option value="dtm-contest">DTMコンペ / 公募</option>
              <option value="cover-mv">歌ってみた / MV公開</option>
              <option value="distribution">配信リリース</option>
            </select>
          </label>
          <label>
            Platform
            <input value={project.platform} onChange={(event) => updateProject('platform', event.target.value)} placeholder="NicoNico / YouTube" />
          </label>
        </div>
        <div className="readiness-strip">
          <Metric label="Readiness" value={severityLabel(summary.overall)} />
          <Metric label="Days" value={`${days}`} />
          <Metric label="Critical" value={`${summary.critical}`} />
          <Metric label="Warning" value={`${summary.warning}`} />
        </div>
      </section>

      <section className="main-layout">
        <section className="board-panel" aria-label="制作カンバン">
          <div className="section-heading">
            <div>
              <span className="panel-kicker">Kanban</span>
              <h2>締切に向けた制作ボード</h2>
            </div>
            <p className="board-context">{project.goal || 'この締切で達成したいことをProject欄に整理してください。'}</p>
          </div>
          <div className="kanban-board">
            {columns.map((column) => {
              const cards = boardCards.filter((card) => card.column === column.id)
              return (
                <section className="kanban-column" aria-label={`${column.title} column`} key={column.id}>
                  <header className="column-header">
                    <div>
                      <h3>{column.title}</h3>
                      <span>{column.subtitle}</span>
                    </div>
                    <strong>{cards.length}</strong>
                  </header>
                  <div className="card-stack">
                    {cards.map((card) => (
                      <BoardCardView
                        card={card}
                        key={card.id}
                        onAssetChange={updateAsset}
                        onDependencyChange={updateDependency}
                        onIdeaChange={updateIdea}
                        onLaneChange={updateLane}
                        onRuleChange={updateRule}
                        onSetActiveIdea={(id) => updateProject('activeIdeaId', id)}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </section>

        <aside className="right-rail">
          <section className="panel sticky" aria-label="次にやること">
            <div className="section-heading">
              <div>
                <span className="panel-kicker">Next focus</span>
                <h2>次に動かすカード</h2>
              </div>
            </div>
            <ol className="focus-list">
              {nextFocus.length > 0 ? nextFocus.map((finding) => (
                <li key={finding.id}>
                  <span className={`severity-dot severity-${finding.severity}`} />
                  <div>
                    <strong>{finding.action}</strong>
                    <small>{finding.title}</small>
                  </div>
                </li>
              )) : (
                <li>
                  <span className="severity-dot severity-ready" />
                  <div>
                    <strong>進捗更新を続ける</strong>
                    <small>大きなリスクは見えていません</small>
                  </div>
                </li>
              )}
            </ol>
          </section>

          <section className="panel" aria-label="リスク診断結果">
            <div className="section-heading">
              <div>
                <span className="panel-kicker">Risk diagnosis</span>
                <h2>危ない理由</h2>
              </div>
            </div>
            <div className="risk-list">
              {findings.slice(0, 6).map((finding) => (
                <article className={`risk-card risk-${finding.severity}`} key={finding.id}>
                  <div className="risk-topline">
                    <span className={`severity-pill severity-${finding.severity}`}>{severityLabel(finding.severity)}</span>
                    <span className="priority-pill">{finding.priority}</span>
                  </div>
                  <h3>{finding.title}</h3>
                  <dl>
                    <div>
                      <dt>Signal</dt>
                      <dd>{finding.signal}</dd>
                    </div>
                    <div>
                      <dt>Next action</dt>
                      <dd>{finding.action}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  )
}

function BoardCardView({
  card,
  onAssetChange,
  onDependencyChange,
  onIdeaChange,
  onLaneChange,
  onRuleChange,
  onSetActiveIdea,
}: {
  card: BoardCard
  onAssetChange: (id: string, status: AssetStatus) => void
  onDependencyChange: (id: 'illustrator' | 'videoEditor' | 'mixMaster', status: DependencyStatus) => void
  onIdeaChange: (id: string, patch: Partial<Idea>) => void
  onLaneChange: (id: string, status: WorkStatus) => void
  onRuleChange: (id: 'eventRulesChecked' | 'postingWindowChecked' | 'creditsChecked' | 'promoPlanReady', checked: boolean) => void
  onSetActiveIdea: (id: string) => void
}) {
  return (
    <article className={`board-card card-${card.kind}`}>
      <div className="card-topline">
        <span>{kindLabel(card.kind)}</span>
        {card.kind === 'idea' && card.active && <strong>Active</strong>}
      </div>
      <h4>{card.title}</h4>
      <p>{card.note}</p>
      <small>{card.meta}</small>

      {card.kind === 'idea' && (
        <div className="card-controls">
          <select aria-label={`${card.title} state`} value={card.state} onChange={(event) => onIdeaChange(card.ideaId, { state: event.target.value as IdeaState })}>
            <option value="keep">Keep</option>
            <option value="maybe">Maybe</option>
            <option value="parked">Parked</option>
            <option value="rejected">Rejected</option>
          </select>
          <button className="mini-button" type="button" onClick={() => onSetActiveIdea(card.ideaId)}>本命</button>
        </div>
      )}

      {card.kind === 'lane' && (
        <select aria-label={card.title} value={card.status} onChange={(event) => onLaneChange(card.laneId, event.target.value as WorkStatus)}>
          <option value="not-started">Not started</option>
          <option value="in-progress">In progress</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
        </select>
      )}

      {card.kind === 'asset' && (
        <select aria-label={card.title} value={card.status} onChange={(event) => onAssetChange(card.assetId, event.target.value as AssetStatus)}>
          <option value="missing">Missing</option>
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
        </select>
      )}

      {card.kind === 'dependency' && (
        <select aria-label={`${card.title} dependency`} value={card.status} onChange={(event) => onDependencyChange(card.dependencyId, event.target.value as DependencyStatus)}>
          <option value="none">None</option>
          <option value="planned">Planned</option>
          <option value="waiting">Waiting</option>
          <option value="received">Received</option>
        </select>
      )}

      {card.kind === 'rule' && (
        <label className="card-checkbox">
          <input
            aria-label={`${card.title} checked`}
            checked={card.checked}
            onChange={(event) => onRuleChange(card.ruleId, event.target.checked)}
            type="checkbox"
          />
          確認済み
        </label>
      )}
    </article>
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

function buildBoard(project: ProjectState): BoardCard[] {
  return [
    ...project.ideas.map<BoardCard>((idea) => ({
      id: `idea-${idea.id}`,
      column: idea.state === 'keep' ? 'doing' : idea.state === 'maybe' ? 'decide' : idea.state === 'parked' ? 'next' : 'ready',
      kind: 'idea',
      title: idea.title || 'Untitled idea',
      meta: ideaStateLabel(idea.state),
      note: idea.note || 'メモなし',
      ideaId: idea.id,
      state: idea.state,
      active: project.activeIdeaId === idea.id,
    })),
    ...project.lanes.map<BoardCard>((lane) => ({
      id: `lane-${lane.id}`,
      column: lane.status === 'blocked' ? 'waiting' : lane.status === 'in-progress' ? 'doing' : lane.status === 'done' ? 'ready' : 'next',
      kind: 'lane',
      title: lane.label,
      meta: statusLabel(lane.status),
      note: laneNote(lane.id),
      laneId: lane.id,
      status: lane.status,
    })),
    ...project.assets.map<BoardCard>((asset) => ({
      id: `asset-${asset.id}`,
      column: asset.status === 'ready' ? 'ready' : asset.status === 'draft' ? 'doing' : 'next',
      kind: 'asset',
      title: asset.label,
      meta: assetStatusLabel(asset.status),
      note: assetNote(asset.id),
      assetId: asset.id,
      status: asset.status,
    })),
    ...dependencyCards(project),
    ...ruleCards(project),
  ]
}

function dependencyCards(project: ProjectState): BoardCard[] {
  return [
    dependencyCard('illustrator', 'Illustrator', project.illustrator, 'サムネ/ジャケット/MV素材の外部依存'),
    dependencyCard('videoEditor', 'Video editor', project.videoEditor, 'MVや投稿動画の外部依存'),
    dependencyCard('mixMaster', 'Mix / Master support', project.mixMaster, '音源確定前の外部依存'),
  ]
}

function dependencyCard(
  dependencyId: 'illustrator' | 'videoEditor' | 'mixMaster',
  title: string,
  status: DependencyStatus,
  note: string,
): BoardCard {
  return {
    id: `dependency-${dependencyId}`,
    column: status === 'waiting' ? 'waiting' : status === 'received' ? 'ready' : status === 'planned' ? 'next' : 'decide',
    kind: 'dependency',
    title,
    meta: dependencyLabel(status),
    note,
    dependencyId,
    status,
  }
}

function ruleCards(project: ProjectState): BoardCard[] {
  return [
    ruleCard('eventRulesChecked', '募集要項 / 投稿条件', project.eventRulesChecked, '失格、ランキング対象外、応募形式の確認'),
    ruleCard('postingWindowChecked', '投稿期間 / 予約投稿', project.postingWindowChecked, '公開時刻、予約投稿、必要タグの確認'),
    ruleCard('creditsChecked', 'クレジット / 使用条件', project.creditsChecked, '共同制作者、外注、権利表記の確認'),
    ruleCard('promoPlanReady', '告知導線 / 初動投稿', project.promoPlanReady, '公開URL、SNS素材、投稿文の準備'),
  ]
}

function ruleCard(
  ruleId: 'eventRulesChecked' | 'postingWindowChecked' | 'creditsChecked' | 'promoPlanReady',
  title: string,
  checked: boolean,
  note: string,
): BoardCard {
  return {
    id: `rule-${ruleId}`,
    column: checked ? 'ready' : 'next',
    kind: 'rule',
    title,
    meta: checked ? 'Checked' : 'Needs check',
    note,
    ruleId,
    checked,
  }
}

function diagnoseProject(project: ProjectState) {
  const days = daysUntil(project.deadline)
  const findings: Finding[] = []
  const keepIdeas = project.ideas.filter((idea) => idea.state === 'keep' && idea.title.trim()).length
  const maybeIdeas = project.ideas.filter((idea) => idea.state === 'maybe' && idea.title.trim()).length
  const activeIdea = project.ideas.find((idea) => idea.id === project.activeIdeaId)
  const getLane = (id: string) => project.lanes.find((lane) => lane.id === id)?.status ?? 'not-started'
  const getAsset = (id: string) => project.assets.find((asset) => asset.id === id)?.status ?? 'missing'
  const unfinishedCore = ['composition', 'arrangement', 'vocal', 'mix'].filter((id) => getLane(id) !== 'done')
  const missingLaunchAssets = project.assets.filter((asset) => ['artwork', 'video', 'description', 'credits', 'sns'].includes(asset.id) && asset.status === 'missing')

  if (!project.projectName.trim()) {
    findings.push({
      id: 'project-name-missing',
      severity: 'critical',
      title: 'プロジェクトの対象が曖昧です',
      why: '締切、曲案、素材、外注待ちを結びつける中心がないと、日々の作業と公開準備がまた分断されます。',
      signal: 'Project が未入力です。',
      action: 'この締切で何を出すかを1行で名前にしてください。',
      priority: 'Today',
    })
  }

  if (!project.deadline || days < 0) {
    findings.push({
      id: 'deadline-invalid',
      severity: 'critical',
      title: '締切が診断できません',
      why: '締切から逆算できないと、外注依頼、投稿予約、Mix締切、告知素材の危険度を判断できません。',
      signal: days < 0 ? '締切日が過去です。' : '締切日が未入力です。',
      action: '実際に間に合わせたい公開日または応募締切を入れてください。',
      priority: 'Today',
    })
  }

  if (keepIdeas === 0) {
    findings.push({
      id: 'no-kept-idea',
      severity: 'critical',
      title: '採用候補が決まっていません',
      why: '複数モチーフを残すのは自然ですが、締切が近い状態でKeepがないと制作レーン全体が止まります。',
      signal: 'Keep 状態の曲案がありません。',
      action: '今の締切に出す候補を1つだけ Keep にしてください。',
      priority: 'Today',
    })
  } else if (keepIdeas > 1 && days <= 21) {
    findings.push({
      id: 'too-many-kept-ideas',
      severity: 'warning',
      title: '採用候補がまだ多すぎます',
      why: 'コンペや投稿祭では曲案を残せることが重要ですが、締切3週間前以降は複数Keepが制作時間を削ります。',
      signal: `${keepIdeas}件の曲案が Keep です。`,
      action: '本命以外を Maybe または Parked に落として、制作レーンを1曲に集中してください。',
      priority: 'This week',
    })
  } else if (activeIdea?.state === 'keep') {
    findings.push({
      id: 'active-idea-ready',
      severity: 'ready',
      title: '本命の曲案が見えています',
      why: '作業対象が明確なため、制作進捗と素材準備を同じ締切に結びつけられます。',
      signal: `Active idea: ${activeIdea.title || 'Untitled idea'}`,
      action: 'この曲案を基準に制作レーンと素材状態を更新してください。',
      priority: 'Monitor',
    })
  }

  if (maybeIdeas > 0 && days <= 10) {
    findings.push({
      id: 'maybe-ideas-close-deadline',
      severity: 'warning',
      title: '迷っている曲案が締切直前まで残っています',
      why: 'Maybeが残ること自体は悪くありませんが、直前期は判断保留がMix、動画、投稿準備の遅れにつながります。',
      signal: `${maybeIdeas}件の Maybe 案があります。`,
      action: 'Maybe案をParkedに退避し、今回の締切では本命だけを進めてください。',
      priority: 'Today',
    })
  }

  if (days <= 14 && unfinishedCore.length >= 2) {
    findings.push({
      id: 'core-production-behind',
      severity: 'critical',
      title: '制作本体が締切に対して遅れています',
      why: '音源が固まらないままMV、概要欄、告知素材を進めると、後戻りが連鎖します。',
      signal: `未完了の中核レーン: ${unfinishedCore.map((id) => laneLabel(project, id)).join(' / ')}`,
      action: '今日中に「完成音源を出す日」を決め、Mix/Masterより後ろの作業を一度止めてください。',
      priority: 'Today',
    })
  } else if (days <= 21 && getLane('mix') === 'not-started') {
    findings.push({
      id: 'mix-not-started',
      severity: 'warning',
      title: 'Mix / Master の着手が遅れています',
      why: '締切型制作ではラフ完成が遅れるほど、投稿素材や外注チェックに使える時間がなくなります。',
      signal: 'Mix / Master が Not started です。',
      action: '仮Mixではなく、提出候補の音源を作る日を今週内に置いてください。',
      priority: 'This week',
    })
  }

  if (getLane('artwork') === 'blocked' || project.illustrator === 'waiting') {
    findings.push({
      id: 'artwork-external-wait',
      severity: days <= 28 ? 'critical' : 'warning',
      title: 'Artwork / MV が外部待ちで締切リスクになっています',
      why: '投稿祭やMV公開では、公開締切より前にイラスト・動画側の実質締切が発生します。',
      signal: `Artwork lane: ${statusLabel(getLane('artwork'))}, Illustrator: ${dependencyLabel(project.illustrator)}`,
      action: '依頼先に渡す音源、歌詞、参考、締切、使用範囲を1つのHandoffとして確定してください。',
      priority: days <= 28 ? 'Today' : 'This week',
    })
  }

  if ((project.eventType === 'bokacolle' || project.eventType === 'cover-mv') && getAsset('video') === 'missing' && days <= 21) {
    findings.push({
      id: 'video-missing',
      severity: 'critical',
      title: '投稿動画がまだありません',
      why: 'NicoNico/YouTube中心の公開では、音源完成だけでは公開できません。動画、サムネ、概要欄が公開面の本体です。',
      signal: 'MV / 投稿動画 が Missing です。',
      action: '静止画動画で出すのか、MVを依頼するのかを今日決めてください。',
      priority: 'Today',
    })
  }

  if (missingLaunchAssets.length >= 3 && days <= 14) {
    findings.push({
      id: 'launch-assets-missing',
      severity: 'critical',
      title: '公開素材がまとめて不足しています',
      why: '公開直前に素材不足へ気づくと、制作ではなく探す・書く・整える作業に時間を奪われます。',
      signal: `Missing: ${missingLaunchAssets.map((asset) => asset.label).join(' / ')}`,
      action: '音源以外の不足素材を3つまでに絞り、今日中に最低限版を作ってください。',
      priority: 'Today',
    })
  } else if (missingLaunchAssets.length > 0) {
    findings.push({
      id: 'launch-assets-partial',
      severity: 'warning',
      title: '公開素材に抜けがあります',
      why: '素材の抜けは公開準備の最後に発見されやすく、投稿予約や告知導線を止めます。',
      signal: `Missing: ${missingLaunchAssets.map((asset) => asset.label).join(' / ')}`,
      action: '不足素材をReadyにする順番を、投稿画面に必要なものから並べてください。',
      priority: days <= 21 ? 'This week' : 'Before deadline',
    })
  }

  if (!project.eventRulesChecked) {
    findings.push({
      id: 'rules-not-checked',
      severity: days <= 21 ? 'critical' : 'warning',
      title: 'イベント/応募ルールが未確認です',
      why: '投稿期間、公開済み可否、タグ、ランキング条件、応募形式は制作内容や公開方法そのものに影響します。',
      signal: '募集要項 / 投稿条件が未チェックです。',
      action: '制作を進める前に、今回のイベントで失格やランキング対象外になりうる条件だけ確認してください。',
      priority: days <= 21 ? 'Today' : 'This week',
    })
  } else {
    findings.push({
      id: 'rules-ready',
      severity: 'ready',
      title: 'イベントルールは確認済みです',
      why: '投稿条件が確認済みなら、制作と公開準備の判断を締切に結びつけやすくなります。',
      signal: '募集要項 / 投稿条件 がチェック済みです。',
      action: 'ルール変更や追記だけ締切前に再確認してください。',
      priority: 'Monitor',
    })
  }

  if (!project.postingWindowChecked && days <= 10) {
    findings.push({
      id: 'posting-window-not-checked',
      severity: 'critical',
      title: '投稿期間と公開設定が未確認です',
      why: '投稿祭では予約投稿、公開タイミング、期間外公開がランキングや参加条件に影響することがあります。',
      signal: '投稿期間 / 予約投稿 / 公開設定が未チェックです。',
      action: '予約投稿の可否、公開開始時刻、必要タグを確認し、投稿画面を先に作ってください。',
      priority: 'Today',
    })
  }

  if (!project.creditsChecked && (getAsset('credits') !== 'ready' || project.illustrator !== 'none' || project.videoEditor !== 'none')) {
    findings.push({
      id: 'credits-unresolved',
      severity: 'warning',
      title: 'クレジットと使用条件が曖昧です',
      why: '歌ってみた、MV、外注、共同制作では、公開後より公開前に表記と使用範囲を揃える方が手戻りが少なくなります。',
      signal: 'クレジット / 権利表記 が未チェックです。',
      action: '参加者名、リンク、使用範囲、概要欄表記を1か所にまとめて確認してください。',
      priority: days <= 14 ? 'Today' : 'This week',
    })
  }

  if (!project.promoPlanReady && days <= 14) {
    findings.push({
      id: 'promo-not-ready',
      severity: 'warning',
      title: '告知導線が制作進捗から分離しています',
      why: 'リリース単体チェックでは見落としやすいですが、SNS素材や投稿文は公開直前にまとめて発生しがちです。',
      signal: '告知導線と初動投稿 が未チェックです。',
      action: '公開URLがなくても作れる告知文、短尺、固定投稿だけ先に用意してください。',
      priority: 'This week',
    })
  }

  if (getAsset('audio') === 'ready' && getAsset('description') === 'ready' && project.postingWindowChecked) {
    findings.push({
      id: 'posting-package-ready',
      severity: 'ready',
      title: '投稿パッケージの核は揃っています',
      why: '完成音源、概要欄、公開設定が揃うと、公開直前の不確実性が大きく下がります。',
      signal: '完成音源 / 概要欄 / 投稿設定 がReadyです。',
      action: 'サムネ、クレジット、告知素材の最終確認に移ってください。',
      priority: 'Monitor',
    })
  }

  if (findings.length === 0) {
    findings.push({
      id: 'no-risk-visible',
      severity: 'ready',
      title: '大きなリスクは見えていません',
      why: '現在の入力では、締切、制作、素材、ルールの間に重大な矛盾はありません。',
      signal: 'Critical / Warning の条件に該当しません。',
      action: '進捗が変わったらこの画面を更新し、締切1週間前に再確認してください。',
      priority: 'Monitor',
    })
  }

  return findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
}

function summarizeFindings(findings: Finding[]) {
  const critical = findings.filter((finding) => finding.severity === 'critical').length
  const warning = findings.filter((finding) => finding.severity === 'warning').length
  const ready = findings.filter((finding) => finding.severity === 'ready').length
  const overall: Severity = critical > 0 ? 'critical' : warning > 0 ? 'warning' : 'ready'

  return {
    critical,
    warning,
    ready,
    overall,
  }
}

function parseProject(value: unknown): ProjectState {
  const record = value as Partial<ProjectState>
  return {
    ...sampleProject,
    ...record,
    ideas: mergeById(sampleProject.ideas, record.ideas),
    lanes: mergeById(sampleProject.lanes, record.lanes),
    assets: mergeById(sampleProject.assets, record.assets),
  }
}

function mergeById<T extends { id: string }>(base: T[], incoming?: T[]) {
  if (!incoming) return base
  return base.map((item) => ({ ...item, ...incoming.find((next) => next.id === item.id) }))
}

function kindLabel(kind: BoardCard['kind']) {
  return {
    idea: 'Idea',
    lane: 'Work',
    asset: 'Asset',
    dependency: 'Wait',
    rule: 'Rule',
  }[kind]
}

function laneNote(id: string) {
  return {
    composition: '曲の芯を固める',
    arrangement: '完成形の密度に近づける',
    vocal: '歌/調声/録音を確定する',
    mix: '提出候補の音源にする',
    artwork: '公開面の見た目を揃える',
    upload: '投稿画面と公開設定を作る',
    promotion: '初動で出す素材と文面を揃える',
  }[id] ?? '制作作業'
}

function assetNote(id: string) {
  return {
    audio: '投稿や配信に使う最終音源',
    lyrics: '動画、概要欄、クレジットの元情報',
    artwork: 'サムネ、ジャケット、告知画像',
    video: 'NicoNico/YouTubeで公開する本体',
    description: '概要欄、タグ、リンク、説明文',
    credits: '共同制作者と表記',
    sns: '公開前後の告知素材',
  }[id] ?? '公開素材'
}

function laneLabel(project: ProjectState, id: string) {
  return project.lanes.find((lane) => lane.id === id)?.label ?? id
}

function statusLabel(status: WorkStatus) {
  return {
    'not-started': 'Not started',
    'in-progress': 'In progress',
    blocked: 'Blocked',
    done: 'Done',
  }[status]
}

function assetStatusLabel(status: AssetStatus) {
  return {
    missing: 'Missing',
    draft: 'Draft',
    ready: 'Ready',
  }[status]
}

function dependencyLabel(status: DependencyStatus) {
  return {
    none: 'None',
    planned: 'Planned',
    waiting: 'Waiting',
    received: 'Received',
  }[status]
}

function ideaStateLabel(state: IdeaState) {
  return {
    keep: 'Keep',
    maybe: 'Maybe',
    parked: 'Parked',
    rejected: 'Rejected',
  }[state]
}

function severityLabel(severity: Severity) {
  return {
    critical: 'Critical',
    warning: 'Warning',
    ready: 'Ready',
  }[severity]
}

function daysUntil(dateValue: string) {
  if (!dateValue) return 0
  const current = new Date(`${todayISO}T00:00:00`).getTime()
  const target = new Date(`${dateValue}T00:00:00`).getTime()
  return Math.ceil((target - current) / 86_400_000)
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function offsetDate(days: number) {
  const next = new Date()
  next.setDate(next.getDate() + days)
  return toDateInputValue(next)
}

export default App
