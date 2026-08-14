import { useEffect, useMemo, useState } from 'react'
import './App.css'

type EventType = 'bokacolle' | 'dtm-contest' | 'cover-mv' | 'distribution'
type IdeaState = 'keep' | 'maybe' | 'parked' | 'rejected'
type WorkStatus = 'not-started' | 'in-progress' | 'blocked' | 'done'
type AssetStatus = 'missing' | 'draft' | 'ready'
type DependencyStatus = 'none' | 'planned' | 'waiting' | 'received'
type Severity = 'critical' | 'warning' | 'ready'
type Priority = 'Today' | 'This week' | 'Before deadline' | 'Monitor'

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

const STORAGE_KEY = 'deadline-music-os-v1'
const todayISO = toDateInputValue(new Date())

const sampleProject: ProjectState = {
  projectName: 'ボカコレ2026夏 Top100挑戦',
  eventType: 'bokacolle',
  deadline: offsetDate(18),
  platform: 'NicoNico / YouTube',
  goal: '投稿祭に合わせて1曲を完成させ、初動で聴かれる状態にする',
  activeIdeaId: 'idea-1',
  ideas: [
    { id: 'idea-1', title: '夜行バスのシンセロック', state: 'keep', note: 'サビ強め。MV化しやすい' },
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
          <p className="eyebrow">Deadline-centered production OS</p>
          <h1>Music Deadline Studio</h1>
        </div>
        <div className="topbar-actions">
          <span className="save-state" aria-live="polite">{saveState}</span>
          <button className="secondary" type="button" onClick={loadSample}>サンプルを読み込む</button>
          <button className="ghost" type="button" onClick={resetProject}>リセット</button>
        </div>
      </header>

      {storageWarning && <p className="alert">{storageWarning}</p>}

      <section className={`diagnosis-hero overall-${summary.overall}`} aria-label="制作リスク診断サマリー">
        <div>
          <span className="panel-kicker">Project readiness</span>
          <h2>{severityLabel(summary.overall)}</h2>
          <p>{summary.message}</p>
        </div>
        <div className="summary-grid">
          <Metric label="締切まで" value={`${days}日`} />
          <Metric label="Critical" value={`${summary.critical}`} />
          <Metric label="Warning" value={`${summary.warning}`} />
        </div>
        <div className="priority-action">
          <span>Next focus</span>
          <strong>{nextFocus[0]?.action ?? '現時点では大きなリスクは見えていません。進捗が変わったら再確認してください。'}</strong>
        </div>
      </section>

      <section className="workspace">
        <div className="left-column">
          <section className="panel" aria-label="イベント概要">
            <div className="section-heading">
              <div>
                <span className="panel-kicker">Event / Opportunity</span>
                <h2>締切から制作を組み立てる</h2>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Project name
                <input value={project.projectName} onChange={(event) => updateProject('projectName', event.target.value)} placeholder="ボカコレ2026夏 Top100挑戦" />
              </label>
              <label>
                Deadline
                <input type="date" value={project.deadline} onChange={(event) => updateProject('deadline', event.target.value)} />
              </label>
              <label>
                Event type
                <select aria-label="Event type" value={project.eventType} onChange={(event) => updateProject('eventType', event.target.value as EventType)}>
                  <option value="bokacolle">ボカコレ / 投稿祭</option>
                  <option value="dtm-contest">DTMコンペ / 公募</option>
                  <option value="cover-mv">歌ってみた / MV公開</option>
                  <option value="distribution">配信リリース</option>
                </select>
              </label>
              <label>
                Main platform
                <input value={project.platform} onChange={(event) => updateProject('platform', event.target.value)} placeholder="NicoNico / YouTube" />
              </label>
            </div>
            <label>
              Goal
              <textarea value={project.goal} onChange={(event) => updateProject('goal', event.target.value)} placeholder="この締切で達成したいこと" />
            </label>
          </section>

          <section className="panel" aria-label="曲案ボード">
            <div className="section-heading">
              <div>
                <span className="panel-kicker">Ideas / Demos</span>
                <h2>曲案を捨てずに選ぶ</h2>
              </div>
            </div>
            <div className="idea-grid">
              {project.ideas.map((idea) => (
                <article className={`idea-card idea-${idea.state}`} key={idea.id}>
                  <label>
                    Idea
                    <input value={idea.title} onChange={(event) => updateIdea(idea.id, { title: event.target.value })} placeholder="曲案名" />
                  </label>
                  <div className="inline-controls">
                    <label>
                      State
                      <select aria-label={`${idea.title || idea.id} state`} value={idea.state} onChange={(event) => updateIdea(idea.id, { state: event.target.value as IdeaState })}>
                        <option value="keep">Keep</option>
                        <option value="maybe">Maybe</option>
                        <option value="parked">Parked</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </label>
                    <label>
                      Active
                      <input
                        aria-label={`${idea.title || idea.id} active idea`}
                        checked={project.activeIdeaId === idea.id}
                        onChange={() => updateProject('activeIdeaId', idea.id)}
                        type="radio"
                      />
                    </label>
                  </div>
                  <label>
                    Note
                    <textarea value={idea.note} onChange={(event) => updateIdea(idea.id, { note: event.target.value })} placeholder="残す理由 / ボツ理由 / 懸念" />
                  </label>
                </article>
              ))}
            </div>
          </section>

          <section className="panel" aria-label="制作レーン">
            <div className="section-heading">
              <div>
                <span className="panel-kicker">Production lanes</span>
                <h2>制作進捗</h2>
              </div>
            </div>
            <div className="lane-list">
              {project.lanes.map((lane) => (
                <label className="row-control" key={lane.id}>
                  <span>{lane.label}</span>
                  <select aria-label={lane.label} value={lane.status} onChange={(event) => updateLane(lane.id, event.target.value as WorkStatus)}>
                    <option value="not-started">Not started</option>
                    <option value="in-progress">In progress</option>
                    <option value="blocked">Blocked</option>
                    <option value="done">Done</option>
                  </select>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className="right-column">
          <section className="panel sticky" aria-label="次にやること">
            <div className="section-heading">
              <div>
                <span className="panel-kicker">Today / This week</span>
                <h2>次に集中すること</h2>
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

          <section className="panel" aria-label="素材と外部依存">
            <div className="section-heading">
              <div>
                <span className="panel-kicker">Assets / Dependencies</span>
                <h2>素材と待ち状態</h2>
              </div>
            </div>
            <div className="asset-list">
              {project.assets.map((asset) => (
                <label className="row-control" key={asset.id}>
                  <span>{asset.label}</span>
                  <select aria-label={asset.label} value={asset.status} onChange={(event) => updateAsset(asset.id, event.target.value as AssetStatus)}>
                    <option value="missing">Missing</option>
                    <option value="draft">Draft</option>
                    <option value="ready">Ready</option>
                  </select>
                </label>
              ))}
            </div>
            <div className="dependency-grid">
              <label>
                Illustrator
                <select aria-label="Illustrator dependency" value={project.illustrator} onChange={(event) => updateProject('illustrator', event.target.value as DependencyStatus)}>
                  <option value="none">None</option>
                  <option value="planned">Planned</option>
                  <option value="waiting">Waiting</option>
                  <option value="received">Received</option>
                </select>
              </label>
              <label>
                Video editor
                <select aria-label="Video editor dependency" value={project.videoEditor} onChange={(event) => updateProject('videoEditor', event.target.value as DependencyStatus)}>
                  <option value="none">None</option>
                  <option value="planned">Planned</option>
                  <option value="waiting">Waiting</option>
                  <option value="received">Received</option>
                </select>
              </label>
              <label>
                Mix / Master
                <select aria-label="Mix master dependency" value={project.mixMaster} onChange={(event) => updateProject('mixMaster', event.target.value as DependencyStatus)}>
                  <option value="none">None</option>
                  <option value="planned">Planned</option>
                  <option value="waiting">Waiting</option>
                  <option value="received">Received</option>
                </select>
              </label>
            </div>
          </section>

          <section className="panel" aria-label="ルール確認">
            <div className="section-heading">
              <div>
                <span className="panel-kicker">Rule profile</span>
                <h2>イベント固有チェック</h2>
              </div>
            </div>
            <label className="check-control">
              <input checked={project.eventRulesChecked} onChange={(event) => updateProject('eventRulesChecked', event.target.checked)} type="checkbox" />
              募集要項 / 投稿条件を確認した
            </label>
            <label className="check-control">
              <input checked={project.postingWindowChecked} onChange={(event) => updateProject('postingWindowChecked', event.target.checked)} type="checkbox" />
              投稿期間 / 予約投稿 / 公開設定を確認した
            </label>
            <label className="check-control">
              <input checked={project.creditsChecked} onChange={(event) => updateProject('creditsChecked', event.target.checked)} type="checkbox" />
              クレジット / 権利表記を確認した
            </label>
            <label className="check-control">
              <input checked={project.promoPlanReady} onChange={(event) => updateProject('promoPlanReady', event.target.checked)} type="checkbox" />
              告知導線と初動投稿を用意した
            </label>
          </section>
        </aside>
      </section>

      <section className="results-panel" aria-label="リスク診断結果">
        <div className="section-heading">
          <div>
            <span className="panel-kicker">Risk diagnosis</span>
            <h2>なぜ危ないか</h2>
          </div>
          <p className="project-meta">{project.projectName || 'Untitled project'} / {days} days left</p>
        </div>
        <div className="risk-list">
          {findings.map((finding) => (
            <article className={`risk-card risk-${finding.severity}`} key={finding.id}>
              <div className="risk-topline">
                <span className={`severity-pill severity-${finding.severity}`}>{severityLabel(finding.severity)}</span>
                <span className="priority-pill">{finding.priority}</span>
              </div>
              <h3>{finding.title}</h3>
              <dl>
                <div>
                  <dt>Why this matters</dt>
                  <dd>{finding.why}</dd>
                </div>
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
    </main>
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
      signal: 'Project name が未入力です。',
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
    message: {
      critical: '締切に対して危ない依存関係があります。タスクを増やす前に、上位のCriticalを潰してください。',
      warning: '制作は進んでいますが、公開素材・ルール・外部待ちに注意が必要です。',
      ready: '現在の進捗では大きなリスクは見えていません。日々の更新から自然にReadinessを確認できます。',
    }[overall],
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

function dependencyLabel(status: DependencyStatus) {
  return {
    none: 'None',
    planned: 'Planned',
    waiting: 'Waiting',
    received: 'Received',
  }[status]
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
