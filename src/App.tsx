import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'

type EventType = 'festival' | 'contest' | 'cover-mv' | 'release' | 'live'
type IdeaState = 'keep' | 'maybe' | 'parked' | 'rejected'
type WorkStatus = 'not-started' | 'in-progress' | 'blocked' | 'done'
type AssetStatus = 'missing' | 'draft' | 'ready'
type DependencyStatus = 'none' | 'planned' | 'waiting' | 'received'
type Severity = 'critical' | 'warning' | 'ready'
type Priority = 'Today' | 'This week' | 'Before deadline' | 'Monitor'
type BoardColumnId = 'decide' | 'next' | 'doing' | 'waiting' | 'ready'
type AssetKind = 'session' | 'demo' | 'bounce' | 'mix' | 'master' | 'lyrics' | 'artwork' | 'video' | 'stems' | 'reference'

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

type FileTrace = {
  path: string
  name: string
  modifiedDaysAgo: number
}

type SongGroup = {
  id: string
  title: string
  files: FileTrace[]
  kinds: Set<AssetKind>
  lastTouchedDaysAgo: number
  stage: string
}

type ScanReport = {
  source: string
  groups: SongGroup[]
  insights: string[]
  filesAnalyzed: number
}

type Finding = {
  id: string
  severity: Severity
  title: string
  why: string
  signal: string
  action: string
  priority: Priority
  sourceCard?: string
}

type BoardCard =
  | { id: string; column: BoardColumnId; kind: 'idea'; title: string; meta: string; note: string; ideaId: string; state: IdeaState; active: boolean }
  | { id: string; column: BoardColumnId; kind: 'lane'; title: string; meta: string; note: string; laneId: string; status: WorkStatus }
  | { id: string; column: BoardColumnId; kind: 'asset'; title: string; meta: string; note: string; assetId: string; status: AssetStatus }
  | { id: string; column: BoardColumnId; kind: 'dependency'; title: string; meta: string; note: string; dependencyId: 'illustrator' | 'videoEditor' | 'mixMaster'; status: DependencyStatus }
  | { id: string; column: BoardColumnId; kind: 'rule'; title: string; meta: string; note: string; ruleId: 'eventRulesChecked' | 'postingWindowChecked' | 'creditsChecked' | 'promoPlanReady'; checked: boolean }

const STORAGE_KEY = 'deadline-music-os-v3'
const REPORT_STORAGE_KEY = 'deadline-music-os-scan-report-v1'
const todayISO = toDateInputValue(new Date())

const columns: { id: BoardColumnId; title: string; subtitle: string }[] = [
  { id: 'decide', title: 'Ideas', subtitle: 'choose or park' },
  { id: 'next', title: 'Next', subtitle: 'not started' },
  { id: 'doing', title: 'Working', subtitle: 'in progress' },
  { id: 'waiting', title: 'Waiting', subtitle: 'blocked or external' },
  { id: 'ready', title: 'Ready', subtitle: 'done or checked' },
]

const baseLanes: WorkLane[] = [
  { id: 'composition', label: 'Composition / topline', status: 'not-started' },
  { id: 'arrangement', label: 'Arrangement', status: 'not-started' },
  { id: 'vocal', label: 'Vocal / recording', status: 'not-started' },
  { id: 'mix', label: 'Mix / master', status: 'not-started' },
  { id: 'artwork', label: 'Artwork / MV', status: 'not-started' },
  { id: 'upload', label: 'Upload / submission', status: 'not-started' },
  { id: 'promotion', label: 'Promotion', status: 'not-started' },
]

const baseAssets: Asset[] = [
  { id: 'audio', label: 'Final audio', status: 'missing' },
  { id: 'lyrics', label: 'Lyrics', status: 'missing' },
  { id: 'artwork', label: 'Artwork / thumbnail', status: 'missing' },
  { id: 'video', label: 'MV / video', status: 'missing' },
  { id: 'description', label: 'Description / tags', status: 'missing' },
  { id: 'credits', label: 'Credits', status: 'missing' },
  { id: 'sns', label: 'SNS assets', status: 'missing' },
]

const sampleProject: ProjectState = {
  projectName: 'Bokacolle summer campaign',
  eventType: 'festival',
  deadline: offsetDate(18),
  platform: 'NicoNico / YouTube',
  goal: 'Finish one strong song and prepare the public posting package without last-minute asset gaps.',
  activeIdeaId: 'idea-1',
  ideas: [
    { id: 'idea-1', title: 'Night Bus Synth Rock', state: 'keep', note: 'Main candidate. Strong chorus, likely MV-friendly.' },
    { id: 'idea-2', title: 'Transparent Piano DnB', state: 'maybe', note: 'Nice texture, but the structure still feels weak.' },
    { id: 'idea-3', title: '8-bar Guitar Motif', state: 'parked', note: 'Probably better for another project.' },
    { id: 'idea-4', title: 'Japanese EDM Fragment', state: 'rejected', note: 'Too large for this deadline.' },
  ],
  lanes: [
    { id: 'composition', label: 'Composition / topline', status: 'done' },
    { id: 'arrangement', label: 'Arrangement', status: 'in-progress' },
    { id: 'vocal', label: 'Vocal / recording', status: 'in-progress' },
    { id: 'mix', label: 'Mix / master', status: 'not-started' },
    { id: 'artwork', label: 'Artwork / MV', status: 'blocked' },
    { id: 'upload', label: 'Upload / submission', status: 'not-started' },
    { id: 'promotion', label: 'Promotion', status: 'not-started' },
  ],
  assets: [
    { id: 'audio', label: 'Final audio', status: 'draft' },
    { id: 'lyrics', label: 'Lyrics', status: 'ready' },
    { id: 'artwork', label: 'Artwork / thumbnail', status: 'missing' },
    { id: 'video', label: 'MV / video', status: 'missing' },
    { id: 'description', label: 'Description / tags', status: 'draft' },
    { id: 'credits', label: 'Credits', status: 'draft' },
    { id: 'sns', label: 'SNS assets', status: 'missing' },
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
  ideas: [{ id: 'idea-1', title: 'New idea', state: 'keep', note: '' }],
  lanes: baseLanes,
  assets: baseAssets,
  illustrator: 'none',
  videoEditor: 'none',
  mixMaster: 'none',
  eventRulesChecked: false,
  postingWindowChecked: false,
  creditsChecked: false,
  promoPlanReady: false,
}

const mockFiles: FileTrace[] = [
  { path: 'Music/Bokacolle/Night_Bus/Night_Bus.logicx', name: 'Night_Bus.logicx', modifiedDaysAgo: 2 },
  { path: 'Music/Bokacolle/Night_Bus/Night_Bus_demo_v4.wav', name: 'Night_Bus_demo_v4.wav', modifiedDaysAgo: 2 },
  { path: 'Music/Bokacolle/Night_Bus/Night_Bus_mix_test.mp3', name: 'Night_Bus_mix_test.mp3', modifiedDaysAgo: 4 },
  { path: 'Music/Bokacolle/Night_Bus/lyrics.txt', name: 'lyrics.txt', modifiedDaysAgo: 6 },
  { path: 'Music/Bokacolle/Night_Bus/ref_motion_graphic.mov', name: 'ref_motion_graphic.mov', modifiedDaysAgo: 9 },
  { path: 'Music/Bokacolle/Piano_DnB/piano_dnb_idea.als', name: 'piano_dnb_idea.als', modifiedDaysAgo: 33 },
  { path: 'Music/Bokacolle/Piano_DnB/piano_dnb_rough.wav', name: 'piano_dnb_rough.wav', modifiedDaysAgo: 33 },
  { path: 'Music/Bokacolle/Guitar_Motif/guitar_riff_voice_memo.m4a', name: 'guitar_riff_voice_memo.m4a', modifiedDaysAgo: 94 },
  { path: 'Music/Bokacolle/Guitar_Motif/chord_notes.md', name: 'chord_notes.md', modifiedDaysAgo: 94 },
  { path: 'Music/Bokacolle/Japanese_EDM/edm_fragment.flp', name: 'edm_fragment.flp', modifiedDaysAgo: 140 },
  { path: 'Music/Bokacolle/Japanese_EDM/export_001.wav', name: 'export_001.wav', modifiedDaysAgo: 138 },
  { path: 'Music/Bokacolle/_campaign/artwork_brief.pdf', name: 'artwork_brief.pdf', modifiedDaysAgo: 12 },
  { path: 'Music/Bokacolle/_campaign/posting_rules.txt', name: 'posting_rules.txt', modifiedDaysAgo: 3 },
]

const severityRank: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  ready: 2,
}

function App() {
  const [project, setProject] = useState<ProjectState>(sampleProject)
  const [scanReport, setScanReport] = useState<ScanReport | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [storageWarning, setStorageWarning] = useState('')
  const [saveState, setSaveState] = useState<'Saved' | 'Saving...'>('Saved')

  useEffect(() => {
    try {
      const rawProject = window.localStorage.getItem(STORAGE_KEY)
      const rawReport = window.localStorage.getItem(REPORT_STORAGE_KEY)
      if (rawProject) setProject(parseProject(JSON.parse(rawProject)))
      if (rawReport) setScanReport(parseScanReport(JSON.parse(rawReport)))
    } catch {
      setStorageWarning('Saved data could not be loaded. You can continue with a fresh project.')
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    setSaveState('Saving...')
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project))
      if (scanReport) {
        window.localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(serializeScanReport(scanReport)))
      } else {
        window.localStorage.removeItem(REPORT_STORAGE_KEY)
      }
      setStorageWarning('')
    } catch {
      setStorageWarning('This browser cannot save changes. Keep this tab open while validating.')
    }
    setSaveState('Saved')
  }, [isLoaded, project, scanReport])

  const findings = useMemo(() => diagnoseProject(project, scanReport), [project, scanReport])
  const summary = useMemo(() => summarizeFindings(findings), [findings])
  const nextFocus = findings.filter((finding) => finding.severity !== 'ready').slice(0, 3)
  const boardCards = useMemo(() => buildBoard(project), [project])
  const days = daysUntil(project.deadline)
  const directoryInputProps = { webkitdirectory: '' }

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

  function applyRecovery(report: ScanReport) {
    setScanReport(report)
    setProject(projectFromScan(report))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function recoverDemoFolder() {
    applyRecovery(analyzeFiles(mockFiles, 'Demo folder'))
  }

  async function recoverSelectedFolder(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    const traces = files.map((file) => ({
      path: file.webkitRelativePath || file.name,
      name: file.name,
      modifiedDaysAgo: Math.max(0, Math.round((Date.now() - file.lastModified) / 86_400_000)),
    }))
    applyRecovery(analyzeFiles(traces, 'Selected local folder'))
    event.target.value = ''
  }

  function loadSample() {
    setProject(sampleProject)
    setScanReport(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetProject() {
    setProject(blankProject)
    setScanReport(null)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Music project recovery</p>
          <h1>Music Deadline Studio</h1>
        </div>
        <div className="topbar-actions">
          <span className="save-state" aria-live="polite">{saveState}</span>
          <button className="secondary" type="button" onClick={loadSample}>Sample board</button>
          <button className="ghost" type="button" onClick={resetProject}>Reset</button>
        </div>
      </header>

      {storageWarning && <p className="alert">{storageWarning}</p>}

      <section className="recovery-panel" aria-label="Folder recovery">
        <div>
          <span className="panel-kicker">Passive capture prototype</span>
          <h2>Start from a messy music folder, not a blank task board.</h2>
          <p>
            This demo infers song ideas, assets, progress, dormant sketches, and missing release materials from file names,
            extensions, and timestamps. No audio content is read.
          </p>
        </div>
        <div className="recovery-actions">
          <button className="primary" type="button" onClick={recoverDemoFolder}>Recover demo folder</button>
          <label className="file-picker">
            Choose local folder
            <input type="file" multiple {...directoryInputProps} onChange={recoverSelectedFolder} />
          </label>
        </div>
      </section>

      {scanReport && (
        <section className="scan-report" aria-label="Recovered folder insights">
          <div className="section-heading">
            <div>
              <span className="panel-kicker">Recovered state</span>
              <h2>{scanReport.source}: {scanReport.groups.length} song/workstream groups</h2>
            </div>
            <p className="board-context">{scanReport.filesAnalyzed} files analyzed locally by file trace.</p>
          </div>
          <div className="insight-grid">
            {scanReport.insights.map((insight) => <article key={insight}>{insight}</article>)}
          </div>
          <div className="song-table" aria-label="Detected song groups">
            <div className="song-table-header">
              <span>Detected group</span>
              <span>Stage</span>
              <span>Assets found</span>
              <span>Last touched</span>
            </div>
            {scanReport.groups.map((group) => (
              <div className="song-table-row" key={group.id}>
                <strong>{group.title}</strong>
                <span>{group.stage}</span>
                <span>{Array.from(group.kinds).join(', ') || 'unknown'}</span>
                <span>{group.lastTouchedDaysAgo} days ago</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={`command-bar overall-${summary.overall}`} aria-label="Project summary and risk summary">
        <div className="project-fields">
          <label>
            Project
            <input value={project.projectName} onChange={(event) => updateProject('projectName', event.target.value)} placeholder="Bokacolle summer campaign" />
          </label>
          <label>
            Deadline
            <input type="date" value={project.deadline} onChange={(event) => updateProject('deadline', event.target.value)} />
          </label>
          <label>
            Type
            <select aria-label="Event type" value={project.eventType} onChange={(event) => updateProject('eventType', event.target.value as EventType)}>
              <option value="festival">Festival / posting event</option>
              <option value="contest">DTM contest / client brief</option>
              <option value="cover-mv">Cover / MV</option>
              <option value="release">Distribution release</option>
              <option value="live">Live / band campaign</option>
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
        <section className="board-panel" aria-label="Production kanban">
          <div className="section-heading">
            <div>
              <span className="panel-kicker">Campaign board</span>
              <h2>Recovered music workflow</h2>
            </div>
            <p className="board-context">{project.goal || 'Move the recovered cards as the project becomes clearer.'}</p>
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
          <section className="panel sticky" aria-label="Next focus">
            <div className="section-heading">
              <div>
                <span className="panel-kicker">Next focus</span>
                <h2>Cards to move next</h2>
              </div>
            </div>
            <ol className="focus-list">
              {nextFocus.length > 0 ? nextFocus.map((finding) => (
                <li key={finding.id}>
                  <span className={`severity-dot severity-${finding.severity}`} />
                  <div>
                    <strong>{finding.action}</strong>
                    <small>{finding.sourceCard ? `Caused by: ${finding.sourceCard}` : finding.title}</small>
                  </div>
                </li>
              )) : (
                <li>
                  <span className="severity-dot severity-ready" />
                  <div>
                    <strong>Keep updating the board</strong>
                    <small>No major risk is visible from current traces.</small>
                  </div>
                </li>
              )}
            </ol>
          </section>

          <section className="panel" aria-label="Risk diagnosis results">
            <div className="section-heading">
              <div>
                <span className="panel-kicker">Risk diagnosis</span>
                <h2>Why it may fail</h2>
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
                    {finding.sourceCard && (
                      <div>
                        <dt>Cause card</dt>
                        <dd>{finding.sourceCard}</dd>
                      </div>
                    )}
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
          <button className="mini-button" type="button" onClick={() => onSetActiveIdea(card.ideaId)}>Use</button>
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
          Checked
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

function analyzeFiles(files: FileTrace[], source: string): ScanReport {
  const groups = groupFiles(files)
  const insights = buildScanInsights(groups, files.length)
  return { source, groups, insights, filesAnalyzed: files.length }
}

function groupFiles(files: FileTrace[]): SongGroup[] {
  const map = new Map<string, FileTrace[]>()
  for (const file of files) {
    const groupName = inferGroupName(file.path, file.name)
    map.set(groupName, [...(map.get(groupName) ?? []), file])
  }

  return Array.from(map.entries())
    .filter(([title]) => !title.startsWith('_'))
    .map(([title, groupFiles], index) => {
      const kinds = new Set(groupFiles.map((file) => classifyFile(file.name)).filter(Boolean) as AssetKind[])
      return {
        id: `group-${index + 1}`,
        title: titleFromSlug(title),
        files: groupFiles,
        kinds,
        lastTouchedDaysAgo: Math.min(...groupFiles.map((file) => file.modifiedDaysAgo)),
        stage: inferStage(kinds),
      }
    })
    .sort((a, b) => a.lastTouchedDaysAgo - b.lastTouchedDaysAgo)
}

function buildScanInsights(groups: SongGroup[], fileCount: number) {
  const insights = [
    `${fileCount} files became ${groups.length} song/workstream groups without manual card creation.`,
  ]
  const active = groups.find((group) => group.lastTouchedDaysAgo <= 7)
  const dormant = groups.find((group) => group.lastTouchedDaysAgo >= 60)
  const nearRelease = groups.find((group) => group.kinds.has('mix') && !group.kinds.has('artwork') && !group.kinds.has('video'))

  if (active) insights.push(`${active.title} looks active now: touched ${active.lastTouchedDaysAgo} days ago and estimated as ${active.stage}.`)
  if (dormant) insights.push(`${dormant.title} looks dormant but recoverable: last touched ${dormant.lastTouchedDaysAgo} days ago.`)
  if (nearRelease) insights.push(`${nearRelease.title} has mix progress but no artwork/video trace, so release packaging may be the next gap.`)
  if (!nearRelease) insights.push('No group looks release-ready yet; the board should start with production and asset recovery.')

  return insights.slice(0, 4)
}

function projectFromScan(report: ScanReport): ProjectState {
  const ideas = report.groups.slice(0, 4).map<Idea>((group, index) => ({
    id: `idea-${index + 1}`,
    title: group.title,
    state: index === 0 ? 'keep' : group.lastTouchedDaysAgo >= 60 ? 'parked' : 'maybe',
    note: `${group.stage}. Found ${group.files.length} files: ${Array.from(group.kinds).join(', ') || 'unknown'}.`,
  }))
  const active = ideas[0]
  const activeGroup = report.groups[0]
  const activeKinds = activeGroup?.kinds ?? new Set<AssetKind>()

  return {
    projectName: `${report.source} recovery`,
    eventType: 'festival',
    deadline: offsetDate(21),
    platform: 'NicoNico / YouTube / DSP',
    goal: 'Recover existing sketches and turn the most promising work into a deadline-ready campaign board.',
    activeIdeaId: active?.id ?? 'idea-1',
    ideas: ideas.length > 0 ? ideas : blankProject.ideas,
    lanes: [
      { id: 'composition', label: 'Composition / topline', status: activeKinds.has('session') || activeKinds.has('demo') ? 'done' : 'not-started' },
      { id: 'arrangement', label: 'Arrangement', status: activeKinds.has('bounce') || activeKinds.has('mix') || activeKinds.has('master') ? 'done' : 'in-progress' },
      { id: 'vocal', label: 'Vocal / recording', status: activeKinds.has('lyrics') && activeKinds.has('demo') ? 'in-progress' : 'not-started' },
      { id: 'mix', label: 'Mix / master', status: activeKinds.has('master') ? 'done' : activeKinds.has('mix') ? 'in-progress' : 'not-started' },
      { id: 'artwork', label: 'Artwork / MV', status: activeKinds.has('artwork') || activeKinds.has('video') ? 'in-progress' : 'not-started' },
      { id: 'upload', label: 'Upload / submission', status: 'not-started' },
      { id: 'promotion', label: 'Promotion', status: 'not-started' },
    ],
    assets: [
      { id: 'audio', label: 'Final audio', status: activeKinds.has('master') ? 'ready' : activeKinds.has('mix') || activeKinds.has('bounce') ? 'draft' : 'missing' },
      { id: 'lyrics', label: 'Lyrics', status: activeKinds.has('lyrics') ? 'ready' : 'missing' },
      { id: 'artwork', label: 'Artwork / thumbnail', status: activeKinds.has('artwork') ? 'draft' : 'missing' },
      { id: 'video', label: 'MV / video', status: activeKinds.has('video') ? 'draft' : 'missing' },
      { id: 'description', label: 'Description / tags', status: 'missing' },
      { id: 'credits', label: 'Credits', status: 'missing' },
      { id: 'sns', label: 'SNS assets', status: 'missing' },
    ],
    illustrator: activeKinds.has('artwork') ? 'planned' : 'none',
    videoEditor: activeKinds.has('video') ? 'planned' : 'none',
    mixMaster: activeKinds.has('mix') || activeKinds.has('master') ? 'received' : 'none',
    eventRulesChecked: report.groups.some((group) => group.files.some((file) => /rule|guideline|brief/i.test(file.name))),
    postingWindowChecked: false,
    creditsChecked: false,
    promoPlanReady: false,
  }
}

function buildBoard(project: ProjectState): BoardCard[] {
  return [
    ...project.ideas.map<BoardCard>((idea) => ({
      id: `idea-${idea.id}`,
      column: idea.state === 'keep' ? 'doing' : idea.state === 'maybe' ? 'decide' : idea.state === 'parked' ? 'next' : 'ready',
      kind: 'idea',
      title: idea.title || 'Untitled idea',
      meta: ideaStateLabel(idea.state),
      note: idea.note || 'No note',
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
    dependencyCard('illustrator', 'Illustrator', project.illustrator, 'External visual dependency.'),
    dependencyCard('videoEditor', 'Video editor', project.videoEditor, 'External MV/video dependency.'),
    dependencyCard('mixMaster', 'Mix / master support', project.mixMaster, 'External audio dependency.'),
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
    ruleCard('eventRulesChecked', 'Event rules / brief', project.eventRulesChecked, 'Posting, contest, or client requirements.'),
    ruleCard('postingWindowChecked', 'Posting window', project.postingWindowChecked, 'Public timing, upload settings, tags, and platform rules.'),
    ruleCard('creditsChecked', 'Credits / usage', project.creditsChecked, 'Collaborator names, links, and usage terms.'),
    ruleCard('promoPlanReady', 'Promotion path', project.promoPlanReady, 'SNS assets, captions, public link, and launch post.'),
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

function diagnoseProject(project: ProjectState, report: ScanReport | null) {
  const days = daysUntil(project.deadline)
  const findings: Finding[] = []
  const keepIdeas = project.ideas.filter((idea) => idea.state === 'keep' && idea.title.trim()).length
  const maybeIdeas = project.ideas.filter((idea) => idea.state === 'maybe' && idea.title.trim()).length
  const activeIdea = project.ideas.find((idea) => idea.id === project.activeIdeaId)
  const getLane = (id: string) => project.lanes.find((lane) => lane.id === id)?.status ?? 'not-started'
  const getAsset = (id: string) => project.assets.find((asset) => asset.id === id)?.status ?? 'missing'
  const unfinishedCore = ['composition', 'arrangement', 'vocal', 'mix'].filter((id) => getLane(id) !== 'done')
  const missingLaunchAssets = project.assets.filter((asset) => ['artwork', 'video', 'description', 'credits', 'sns'].includes(asset.id) && asset.status === 'missing')
  const dormantGroup = report?.groups.find((group) => group.lastTouchedDaysAgo >= 60)

  if (report && dormantGroup) {
    findings.push({
      id: 'dormant-idea-found',
      severity: 'warning',
      title: 'Dormant idea was recovered from the folder',
      why: 'Old sketches often disappear inside folders even when they could become useful for a new deadline.',
      signal: `${dormantGroup.title} was last touched ${dormantGroup.lastTouchedDaysAgo} days ago.`,
      action: `Review ${dormantGroup.title} and either park it intentionally or promote it to a candidate.`,
      priority: 'This week',
      sourceCard: dormantGroup.title,
    })
  }

  if (!project.projectName.trim()) {
    findings.push({
      id: 'project-name-missing',
      severity: 'critical',
      title: 'Project target is unclear',
      why: 'The board needs a campaign or deadline target to connect songs, assets, dependencies, and readiness.',
      signal: 'Project is empty.',
      action: 'Name the campaign or deadline this board is preparing for.',
      priority: 'Today',
      sourceCard: 'Project',
    })
  }

  if (!project.deadline || days < 0) {
    findings.push({
      id: 'deadline-invalid',
      severity: 'critical',
      title: 'Deadline cannot be diagnosed',
      why: 'Without a date, the app cannot judge hidden deadlines for mix, artwork, upload, or promotion.',
      signal: days < 0 ? 'Deadline is in the past.' : 'Deadline is empty.',
      action: 'Set the real release, submission, live, or posting deadline.',
      priority: 'Today',
      sourceCard: 'Deadline',
    })
  }

  if (keepIdeas === 0) {
    findings.push({
      id: 'no-kept-idea',
      severity: 'critical',
      title: 'No active candidate is selected',
      why: 'Recovering many ideas is useful, but a deadline board needs one current candidate to move production forward.',
      signal: 'No idea is marked Keep.',
      action: 'Pick one recovered idea as Keep, and park the rest.',
      priority: 'Today',
      sourceCard: 'Ideas',
    })
  } else if (keepIdeas > 1 && days <= 21) {
    findings.push({
      id: 'too-many-kept-ideas',
      severity: 'warning',
      title: 'Too many candidates are still active',
      why: 'Multiple active candidates can keep a creator exploring while downstream assets remain blocked.',
      signal: `${keepIdeas} ideas are marked Keep.`,
      action: 'Keep only the main candidate for this deadline.',
      priority: 'This week',
      sourceCard: 'Ideas',
    })
  } else if (activeIdea?.state === 'keep') {
    findings.push({
      id: 'active-idea-ready',
      severity: 'ready',
      title: 'A main candidate is visible',
      why: 'The board can connect production and asset work to a concrete song/workstream.',
      signal: `Active idea: ${activeIdea.title || 'Untitled idea'}`,
      action: 'Use this candidate as the anchor for production and packaging.',
      priority: 'Monitor',
      sourceCard: activeIdea.title,
    })
  }

  if (maybeIdeas > 0 && days <= 10) {
    findings.push({
      id: 'maybe-ideas-close-deadline',
      severity: 'warning',
      title: 'Undecided ideas remain close to deadline',
      why: 'A Maybe idea can keep the project open-ended when mix, video, and upload work need certainty.',
      signal: `${maybeIdeas} ideas are still Maybe.`,
      action: 'Park Maybe ideas and focus on one candidate for this deadline.',
      priority: 'Today',
      sourceCard: 'Ideas',
    })
  }

  if (days <= 14 && unfinishedCore.length >= 2) {
    findings.push({
      id: 'core-production-behind',
      severity: 'critical',
      title: 'Core production is behind the deadline',
      why: 'When audio is not locked, artwork, video, upload, and promotion can all inherit the delay.',
      signal: `Unfinished core lanes: ${unfinishedCore.map((id) => laneLabel(project, id)).join(' / ')}`,
      action: 'Create a hard date for the export candidate before adding more launch polish.',
      priority: 'Today',
      sourceCard: 'Production lanes',
    })
  } else if (days <= 21 && getLane('mix') === 'not-started') {
    findings.push({
      id: 'mix-not-started',
      severity: 'warning',
      title: 'Mix / master has not started',
      why: 'The scan may find demos, but release readiness depends on a candidate mix or master.',
      signal: 'Mix / master is Not started.',
      action: 'Move Mix / master to Working and create the first export candidate.',
      priority: 'This week',
      sourceCard: 'Mix / master',
    })
  }

  if (getLane('artwork') === 'blocked' || project.illustrator === 'waiting') {
    findings.push({
      id: 'artwork-external-wait',
      severity: days <= 28 ? 'critical' : 'warning',
      title: 'Artwork / MV is a deadline dependency',
      why: 'Visual assets often create a hidden deadline before the public posting or release date.',
      signal: `Artwork lane: ${statusLabel(getLane('artwork'))}, Illustrator: ${dependencyLabel(project.illustrator)}`,
      action: 'Confirm the handoff package: audio, lyrics, references, deadline, credits, and usage.',
      priority: days <= 28 ? 'Today' : 'This week',
      sourceCard: 'Artwork / MV',
    })
  }

  if ((project.eventType === 'festival' || project.eventType === 'cover-mv') && getAsset('video') === 'missing' && days <= 21) {
    findings.push({
      id: 'video-missing',
      severity: 'critical',
      title: 'No video asset was found',
      why: 'For NicoNico/YouTube-centered work, final audio is not enough. The public package needs video or a minimum visual upload.',
      signal: 'MV / video is Missing.',
      action: 'Decide whether this project needs a full MV or a minimum static-video path.',
      priority: 'Today',
      sourceCard: 'MV / video',
    })
  }

  if (missingLaunchAssets.length >= 3 && days <= 14) {
    findings.push({
      id: 'launch-assets-missing',
      severity: 'critical',
      title: 'Multiple launch assets are missing',
      why: 'Missing launch assets tend to appear late and turn creative time into searching, writing, and formatting work.',
      signal: `Missing: ${missingLaunchAssets.map((asset) => asset.label).join(' / ')}`,
      action: 'Create minimum versions of the missing public assets before more production polishing.',
      priority: 'Today',
      sourceCard: 'Launch assets',
    })
  } else if (missingLaunchAssets.length > 0) {
    findings.push({
      id: 'launch-assets-partial',
      severity: 'warning',
      title: 'Some launch assets are missing',
      why: 'Recovered audio files are useful, but release/event readiness also depends on public-facing materials.',
      signal: `Missing: ${missingLaunchAssets.map((asset) => asset.label).join(' / ')}`,
      action: 'Finish missing assets in the order required by the upload or event workflow.',
      priority: days <= 21 ? 'This week' : 'Before deadline',
      sourceCard: 'Launch assets',
    })
  }

  if (!project.eventRulesChecked) {
    findings.push({
      id: 'rules-not-checked',
      severity: days <= 21 ? 'critical' : 'warning',
      title: 'Event rules or brief are not checked',
      why: 'Posting windows, file formats, tags, rankings, or client requirements can invalidate otherwise good work.',
      signal: 'Event rules / brief is unchecked.',
      action: 'Check the rules that can make this work ineligible or late.',
      priority: days <= 21 ? 'Today' : 'This week',
      sourceCard: 'Event rules / brief',
    })
  } else {
    findings.push({
      id: 'rules-ready',
      severity: 'ready',
      title: 'Rules or brief are checked',
      why: 'The board can now judge production work against a known campaign context.',
      signal: 'Event rules / brief is checked.',
      action: 'Recheck only if the event or client brief changes.',
      priority: 'Monitor',
      sourceCard: 'Event rules / brief',
    })
  }

  if (!project.promoPlanReady && days <= 14) {
    findings.push({
      id: 'promo-not-ready',
      severity: 'warning',
      title: 'Promotion path is not ready',
      why: 'Creators often finish audio first, then lose release momentum because public posts and links are late.',
      signal: 'Promotion path is unchecked.',
      action: 'Prepare one launch post, one short clip/image, and one stable public link.',
      priority: 'This week',
      sourceCard: 'Promotion path',
    })
  }

  return findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
}

function summarizeFindings(findings: Finding[]) {
  const critical = findings.filter((finding) => finding.severity === 'critical').length
  const warning = findings.filter((finding) => finding.severity === 'warning').length
  const ready = findings.filter((finding) => finding.severity === 'ready').length
  const overall: Severity = critical > 0 ? 'critical' : warning > 0 ? 'warning' : 'ready'

  return { critical, warning, ready, overall }
}

function inferGroupName(path: string, name: string) {
  const parts = path.split(/[\\/]/).filter(Boolean)
  if (parts.length >= 2) return parts[parts.length - 2]
  return name.replace(/\.[^.]+$/, '').replace(/(_|-)?(demo|rough|mix|master|bounce|lyrics|ref|reference|stems?).*$/i, '')
}

function classifyFile(name: string): AssetKind | null {
  const lower = name.toLowerCase()
  if (/\.(logicx|als|flp|cpr|band|ptx|rpp)$/.test(lower)) return 'session'
  if (/stem|stems/.test(lower)) return 'stems'
  if (/master/.test(lower)) return 'master'
  if (/mix/.test(lower)) return 'mix'
  if (/bounce|export|2mix/.test(lower)) return 'bounce'
  if (/demo|rough|idea|memo/.test(lower) || /\.(wav|mp3|m4a|aiff|flac)$/.test(lower)) return 'demo'
  if (/lyric|lyrics|歌詞/.test(lower) || /\.(txt|md|docx)$/.test(lower)) return 'lyrics'
  if (/art|jacket|cover|thumb|thumbnail|illust/.test(lower) || /\.(png|jpg|jpeg|psd|ai)$/.test(lower)) return 'artwork'
  if (/mv|video|movie/.test(lower) || /\.(mov|mp4|avi|prproj)$/.test(lower)) return 'video'
  if (/ref|reference|brief|rule|guideline/.test(lower) || /\.(pdf)$/.test(lower)) return 'reference'
  return null
}

function inferStage(kinds: Set<AssetKind>) {
  if (kinds.has('master')) return 'master/package prep'
  if (kinds.has('mix')) return 'mix candidate'
  if (kinds.has('bounce') || kinds.has('stems')) return 'arrangement/export'
  if (kinds.has('demo') && kinds.has('session')) return 'demo in production'
  if (kinds.has('demo') || kinds.has('session')) return 'sketch/demo'
  return 'unknown'
}

function titleFromSlug(value: string) {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
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

function parseScanReport(value: unknown): ScanReport | null {
  const record = value as { source?: string; filesAnalyzed?: number; groups?: Array<Omit<SongGroup, 'kinds'> & { kinds: AssetKind[] }>; insights?: string[] }
  if (!record.source || !record.groups) return null
  return {
    source: record.source,
    filesAnalyzed: record.filesAnalyzed ?? 0,
    insights: record.insights ?? [],
    groups: record.groups.map((group) => ({ ...group, kinds: new Set(group.kinds) })),
  }
}

function serializeScanReport(report: ScanReport) {
  return {
    ...report,
    groups: report.groups.map((group) => ({ ...group, kinds: Array.from(group.kinds) })),
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
    composition: 'Core musical idea or topline.',
    arrangement: 'Structure and density toward a finished track.',
    vocal: 'Voice, recording, or vocal editing.',
    mix: 'Candidate mix or master export.',
    artwork: 'Public visual surface.',
    upload: 'Submission or platform upload.',
    promotion: 'Launch copy, clips, and public links.',
  }[id] ?? 'Production work.'
}

function assetNote(id: string) {
  return {
    audio: 'Final or candidate audio for release/submission.',
    lyrics: 'Lyrics for video, captions, and credits.',
    artwork: 'Cover, thumbnail, or announcement image.',
    video: 'NicoNico/YouTube/MV public asset.',
    description: 'Description, tags, links, and post text.',
    credits: 'Collaborators and usage terms.',
    sns: 'Launch posts, clips, and short assets.',
  }[id] ?? 'Public asset.'
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
