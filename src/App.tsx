import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type ReleaseType = 'single' | 'ep' | 'album'
type PlatformFocus = 'spotify' | 'youtube' | 'niconico' | 'bandcamp' | 'other'
type DistributorStatus = 'not-started' | 'draft' | 'submitted' | 'approved' | 'live'
type SpotifyPitchStatus = 'not-needed' | 'not-available' | 'not-submitted' | 'submitted'
type SmartLinkStatus = 'not-created' | 'draft' | 'ready'
type UploadStatus = 'not-planned' | 'not-prepared' | 'scheduled' | 'ready'
type AudioStatus = 'not-final' | 'final-mix' | 'master-ready'
type AssetStatus = 'missing' | 'draft' | 'final'
type MetadataStatus = 'incomplete' | 'mostly-ready' | 'final'
type PromoStatus = 'none' | 'some' | 'ready'
type PressStatus = 'none' | 'outdated' | 'ready'
type Severity = 'critical' | 'warning' | 'ready'
type Priority = 'Do today' | 'This week' | 'Before launch' | 'Monitor'

type ReleaseState = {
  title: string
  artist: string
  releaseType: ReleaseType
  releaseDate: string
  platformFocus: PlatformFocus
  distributorStatus: DistributorStatus
  spotifyPitchStatus: SpotifyPitchStatus
  smartLinkStatus: SmartLinkStatus
  youtubeStatus: UploadStatus
  audioStatus: AudioStatus
  artworkStatus: AssetStatus
  metadataStatus: MetadataStatus
  promoAssetsStatus: PromoStatus
  epkStatus: PressStatus
  concern: string
  blockers: string
}

type Risk = {
  id: string
  severity: Severity
  title: string
  why: string
  evidence: string
  action: string
  priority: Priority
}

const STORAGE_KEY = 'release-readiness-validator-v1'
const todayISO = toDateInputValue(new Date())

const blankRelease: ReleaseState = {
  title: '',
  artist: '',
  releaseType: 'single',
  releaseDate: offsetDate(14),
  platformFocus: 'spotify',
  distributorStatus: 'draft',
  spotifyPitchStatus: 'not-available',
  smartLinkStatus: 'not-created',
  youtubeStatus: 'not-planned',
  audioStatus: 'final-mix',
  artworkStatus: 'draft',
  metadataStatus: 'mostly-ready',
  promoAssetsStatus: 'some',
  epkStatus: 'outdated',
  concern: '',
  blockers: '',
}

const sampleRelease: ReleaseState = {
  title: 'Night Bus',
  artist: 'Mina Echo',
  releaseType: 'single',
  releaseDate: offsetDate(6),
  platformFocus: 'spotify',
  distributorStatus: 'submitted',
  spotifyPitchStatus: 'not-submitted',
  smartLinkStatus: 'draft',
  youtubeStatus: 'not-prepared',
  audioStatus: 'master-ready',
  artworkStatus: 'final',
  metadataStatus: 'mostly-ready',
  promoAssetsStatus: 'some',
  epkStatus: 'outdated',
  concern: 'Spotify pitch and release day assets are not finished.',
  blockers: 'Waiting for Spotify to show the upcoming release.',
}

const severityRank: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  ready: 2,
}

function App() {
  const [release, setRelease] = useState<ReleaseState>(blankRelease)
  const [risks, setRisks] = useState<Risk[]>([])
  const [hasDiagnosed, setHasDiagnosed] = useState(false)
  const [storageWarning, setStorageWarning] = useState('')
  const [saveState, setSaveState] = useState<'Saved' | 'Saving...'>('Saved')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) setRelease(parseRelease(JSON.parse(raw)))
    } catch {
      setStorageWarning('Saved release data could not be loaded. You can continue with a fresh diagnosis.')
    } finally {
      setIsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    setSaveState('Saving...')
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(release))
      setStorageWarning('')
    } catch {
      setStorageWarning('This browser cannot save changes. Keep this tab open while validating the release.')
    }
    setSaveState('Saved')
  }, [isLoaded, release])

  const diagnosis = useMemo(() => summarizeRisks(risks), [risks])

  function updateField<Key extends keyof ReleaseState>(key: Key, value: ReleaseState[Key]) {
    setRelease((current) => ({ ...current, [key]: value }))
    setHasDiagnosed(false)
  }

  function runDiagnosis(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setRisks(diagnoseRelease(release))
    setHasDiagnosed(true)
  }

  function loadSample() {
    setRelease(sampleRelease)
    setRisks(diagnoseRelease(sampleRelease))
    setHasDiagnosed(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetRelease() {
    setRelease(blankRelease)
    setRisks([])
    setHasDiagnosed(false)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Release QA for independent music creators</p>
          <h1>Release Readiness Validator</h1>
        </div>
        <div className="topbar-actions">
          <span className="save-state" aria-live="polite">{saveState}</span>
          <button className="secondary" type="button" onClick={loadSample}>Load sample diagnosis</button>
          <button className="ghost" type="button" onClick={resetRelease}>Reset</button>
        </div>
      </header>

      {storageWarning && <p className="alert">{storageWarning}</p>}

      <section className={`diagnosis-hero ${hasDiagnosed ? `overall-${diagnosis.overall}` : ''}`} aria-label="Readiness diagnosis summary">
        <div>
          <span className="panel-kicker">Overall readiness</span>
          <h2>{hasDiagnosed ? severityLabel(diagnosis.overall) : 'Not diagnosed yet'}</h2>
          <p>{hasDiagnosed ? diagnosis.message : 'Enter the current release state, then run a readiness diagnosis to see what is risky and why.'}</p>
        </div>
        <div className="summary-grid">
          <Metric label="Critical" value={`${diagnosis.critical}`} />
          <Metric label="Warning" value={`${diagnosis.warning}`} />
          <Metric label="Ready" value={`${diagnosis.ready}`} />
        </div>
        {hasDiagnosed && diagnosis.topAction && (
          <div className="priority-action">
            <span>Top priority</span>
            <strong>{diagnosis.topAction}</strong>
          </div>
        )}
      </section>

      <section className="workspace">
        <form className="editor" onSubmit={runDiagnosis}>
          <div className="section-heading">
            <div>
              <span className="panel-kicker">Release state</span>
              <h2>Describe the release</h2>
            </div>
            <button className="primary compact" type="submit">{hasDiagnosed ? 'Re-run diagnosis' : 'Run diagnosis'}</button>
          </div>

          <div className="form-grid">
            <label>
              Release title
              <input value={release.title} onChange={(event) => updateField('title', event.target.value)} placeholder="Night Bus" />
            </label>
            <label>
              Artist name
              <input value={release.artist} onChange={(event) => updateField('artist', event.target.value)} placeholder="Mina Echo" />
            </label>
            <label>
              Release type
              <select aria-label="Release type" value={release.releaseType} onChange={(event) => updateField('releaseType', event.target.value as ReleaseType)}>
                <option value="single">Single</option>
                <option value="ep">EP</option>
                <option value="album">Album</option>
              </select>
            </label>
            <label>
              Release date
              <input type="date" value={release.releaseDate} onChange={(event) => updateField('releaseDate', event.target.value)} />
            </label>
            <label>
              Main platform focus
              <select aria-label="Main platform focus" value={release.platformFocus} onChange={(event) => updateField('platformFocus', event.target.value as PlatformFocus)}>
                <option value="spotify">Spotify / DSP</option>
                <option value="youtube">YouTube</option>
                <option value="niconico">NicoNico</option>
                <option value="bandcamp">Bandcamp</option>
                <option value="other">Other / mixed</option>
              </select>
            </label>
            <label>
              Distributor upload
              <select aria-label="Distributor upload" value={release.distributorStatus} onChange={(event) => updateField('distributorStatus', event.target.value as DistributorStatus)}>
                <option value="not-started">Not started</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="live">Already live</option>
              </select>
            </label>
          </div>

          <div className="fieldset">
            <h3>External release dependencies</h3>
            <div className="form-grid">
              <label>
                Spotify pitch
                <select aria-label="Spotify pitch" value={release.spotifyPitchStatus} onChange={(event) => updateField('spotifyPitchStatus', event.target.value as SpotifyPitchStatus)}>
                  <option value="not-needed">Not needed</option>
                  <option value="not-available">Not available yet</option>
                  <option value="not-submitted">Not submitted</option>
                  <option value="submitted">Submitted</option>
                </select>
              </label>
              <label>
                Smart link / pre-save
                <select aria-label="Smart link / pre-save" value={release.smartLinkStatus} onChange={(event) => updateField('smartLinkStatus', event.target.value as SmartLinkStatus)}>
                  <option value="not-created">Not created</option>
                  <option value="draft">Draft</option>
                  <option value="ready">Ready</option>
                </select>
              </label>
              <label>
                YouTube premiere / upload
                <select aria-label="YouTube premiere / upload" value={release.youtubeStatus} onChange={(event) => updateField('youtubeStatus', event.target.value as UploadStatus)}>
                  <option value="not-planned">Not planned</option>
                  <option value="not-prepared">Not prepared</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="ready">Ready</option>
                </select>
              </label>
            </div>
          </div>

          <div className="fieldset">
            <h3>Assets and launch materials</h3>
            <div className="form-grid">
              <label>
                Final audio
                <select aria-label="Final audio" value={release.audioStatus} onChange={(event) => updateField('audioStatus', event.target.value as AudioStatus)}>
                  <option value="not-final">Not final</option>
                  <option value="final-mix">Final mix</option>
                  <option value="master-ready">Master ready</option>
                </select>
              </label>
              <label>
                Artwork
                <select aria-label="Artwork" value={release.artworkStatus} onChange={(event) => updateField('artworkStatus', event.target.value as AssetStatus)}>
                  <option value="missing">Missing</option>
                  <option value="draft">Draft</option>
                  <option value="final">Final</option>
                </select>
              </label>
              <label>
                Metadata
                <select aria-label="Metadata" value={release.metadataStatus} onChange={(event) => updateField('metadataStatus', event.target.value as MetadataStatus)}>
                  <option value="incomplete">Incomplete</option>
                  <option value="mostly-ready">Mostly ready</option>
                  <option value="final">Final</option>
                </select>
              </label>
              <label>
                SNS promo assets
                <select aria-label="SNS promo assets" value={release.promoAssetsStatus} onChange={(event) => updateField('promoAssetsStatus', event.target.value as PromoStatus)}>
                  <option value="none">None</option>
                  <option value="some">Some prepared</option>
                  <option value="ready">Ready</option>
                </select>
              </label>
              <label>
                EPK / press text
                <select aria-label="EPK / press text" value={release.epkStatus} onChange={(event) => updateField('epkStatus', event.target.value as PressStatus)}>
                  <option value="none">None</option>
                  <option value="outdated">Outdated</option>
                  <option value="ready">Ready</option>
                </select>
              </label>
            </div>
          </div>

          <label>
            Biggest concern
            <textarea aria-label="Biggest concern" value={release.concern} onChange={(event) => updateField('concern', event.target.value)} placeholder="What feels most uncertain about this release?" />
          </label>
          <label>
            Known blockers
            <textarea aria-label="Known blockers" value={release.blockers} onChange={(event) => updateField('blockers', event.target.value)} placeholder="Waiting on approval, assets, codes, collaborators..." />
          </label>

          <button className="primary" type="submit">{hasDiagnosed ? 'Re-run diagnosis' : 'Run readiness diagnosis'}</button>
        </form>

        <aside className="insights">
          <div className="section-heading">
            <div>
              <span className="panel-kicker">What the product judges</span>
              <h2>Release risk model</h2>
            </div>
          </div>
          <ul className="model-list">
            <li><strong>Deadline sensitivity</strong><span>Near launches make unsubmitted pitch, draft links, and unfinished assets more severe.</span></li>
            <li><strong>Dependency order</strong><span>Distributor state can block pitch visibility and smart link readiness.</span></li>
            <li><strong>Irreversible mistakes</strong><span>Metadata and artwork issues become more costly once a release is submitted or live.</span></li>
            <li><strong>Launch confidence</strong><span>Ready items are shown as evidence, not as a generic completion score.</span></li>
          </ul>
        </aside>
      </section>

      <section className="results-panel" aria-label="Readiness diagnosis results">
        <div className="section-heading">
          <div>
            <span className="panel-kicker">Diagnosis results</span>
            <h2>Risks and next actions</h2>
          </div>
          {hasDiagnosed && <p className="release-meta">{release.artist || 'Unknown artist'} / {release.title || 'Untitled release'} / {daysUntil(release.releaseDate)} days</p>}
        </div>

        {!hasDiagnosed ? (
          <div className="empty-state">
            <h2>No diagnosis yet</h2>
            <p>Run a diagnosis or load the sample release to see Critical, Warning, and Ready findings with reasons and next actions.</p>
            <button className="secondary" type="button" onClick={loadSample}>Load sample diagnosis</button>
          </div>
        ) : (
          <div className="risk-list">
            {risks.map((risk) => (
              <article className={`risk-card risk-${risk.severity}`} key={risk.id}>
                <div className="risk-topline">
                  <span className={`severity-pill severity-${risk.severity}`}>{severityLabel(risk.severity)}</span>
                  <span className="priority-pill">{risk.priority}</span>
                </div>
                <h3>{risk.title}</h3>
                <dl>
                  <div>
                    <dt>Why this matters</dt>
                    <dd>{risk.why}</dd>
                  </div>
                  <div>
                    <dt>Rule behind it</dt>
                    <dd>{risk.evidence}</dd>
                  </div>
                  <div>
                    <dt>Next action</dt>
                    <dd>{risk.action}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
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

function diagnoseRelease(release: ReleaseState) {
  const days = daysUntil(release.releaseDate)
  const risks: Risk[] = []

  if (!release.title.trim() || !release.artist.trim()) {
    risks.push({
      id: 'identity-missing',
      severity: 'critical',
      title: 'Release identity is incomplete',
      why: 'A missing title or artist name makes every downstream check ambiguous, including metadata, artwork, links, and pitch text.',
      evidence: 'Release QA requires the release object before platform-specific readiness can be trusted.',
      action: 'Enter the release title and artist name before sharing this diagnosis with collaborators.',
      priority: 'Do today',
    })
  }

  if (!release.releaseDate) {
    risks.push({
      id: 'date-missing',
      severity: 'critical',
      title: 'Release date is missing',
      why: 'The product cannot judge pitch windows, distributor lead time, or launch asset urgency without a date.',
      evidence: 'Deadline sensitivity is the core dependency for release readiness.',
      action: 'Set the planned release date, even if it is tentative.',
      priority: 'Do today',
    })
  } else if (days < 0 && release.distributorStatus !== 'live') {
    risks.push({
      id: 'date-past',
      severity: 'critical',
      title: 'Release date is already in the past',
      why: 'The release is not marked live, but the planned release date has passed. This usually means the plan or status is stale.',
      evidence: 'Readiness diagnosis depends on current state; stale dates hide launch risk.',
      action: 'Update the release date or mark the release as already live before using the diagnosis.',
      priority: 'Do today',
    })
  }

  if (release.platformFocus === 'spotify') {
    if (release.spotifyPitchStatus === 'not-submitted' && days <= 7) {
      risks.push({
        id: 'spotify-pitch-critical',
        severity: 'critical',
        title: 'Spotify pitch is still unsubmitted',
        why: 'With 7 days or less before release, an unsubmitted pitch can remove playlist and Release Radar opportunities.',
        evidence: 'Spotify for Artists pitch timing was a repeated Discovery dependency; distributor delivery can also delay pitch visibility.',
        action: 'Open Spotify for Artists today. If the release is visible, submit the pitch immediately; if not, confirm distributor delivery status.',
        priority: 'Do today',
      })
    } else if (release.spotifyPitchStatus === 'not-available' && days <= 14) {
      risks.push({
        id: 'spotify-pitch-unavailable',
        severity: 'warning',
        title: 'Spotify pitch is not available yet',
        why: 'Pitch access depends on the release appearing in Spotify for Artists. A short remaining window makes distributor processing a bottleneck.',
        evidence: 'Discovery evidence showed pitch timing depends on distributor upload lead time plus Spotify visibility.',
        action: 'Check whether the distributor has delivered the release and monitor Spotify for Artists daily until pitch is available.',
        priority: days <= 7 ? 'Do today' : 'This week',
      })
    } else if (release.spotifyPitchStatus === 'submitted') {
      risks.push({
        id: 'spotify-pitch-ready',
        severity: 'ready',
        title: 'Spotify pitch is submitted',
        why: 'The most time-sensitive Spotify pre-release action is no longer open.',
        evidence: 'Submitted pitch reduces timing risk for Spotify-centered releases.',
        action: 'Keep the pitch details aligned with final metadata and launch story.',
        priority: 'Monitor',
      })
    }
  }

  if (release.distributorStatus === 'not-started' && days <= 21 && release.platformFocus === 'spotify') {
    risks.push({
      id: 'distributor-not-started',
      severity: 'critical',
      title: 'Distributor upload has not started',
      why: 'A Spotify/DSP release often needs distributor lead time before platform pitching, smart links, and pre-save links can be finalized.',
      evidence: 'Discovery evidence showed distributor lead time can be earlier than the platform pitch deadline.',
      action: 'Upload the release package to the distributor before spending time on downstream promotion assets.',
      priority: 'Do today',
    })
  } else if ((release.distributorStatus === 'draft' || release.distributorStatus === 'submitted') && days <= 14) {
    risks.push({
      id: 'distributor-processing',
      severity: 'warning',
      title: 'Distributor status may still block downstream readiness',
      why: 'Draft or submitted releases can still delay pitch availability, smart link completion, and final platform checks.',
      evidence: 'External service dependencies were a core Deep Dive finding.',
      action: 'Confirm expected approval and delivery timing, then re-run the diagnosis when the status changes.',
      priority: days <= 7 ? 'Do today' : 'This week',
    })
  } else if (release.distributorStatus === 'approved' || release.distributorStatus === 'live') {
    risks.push({
      id: 'distributor-ready',
      severity: 'ready',
      title: 'Distributor state is stable',
      why: 'The release has cleared the biggest delivery dependency for DSP-centered readiness.',
      evidence: 'Distributor approval reduces uncertainty for pitch, links, and platform appearance checks.',
      action: 'Verify platform pages and links match the final release metadata.',
      priority: 'Monitor',
    })
  }

  if (release.audioStatus === 'not-final') {
    risks.push({
      id: 'audio-not-final',
      severity: days <= 14 ? 'critical' : 'warning',
      title: 'Final audio is not locked',
      why: 'Unfinished audio can force re-export, re-upload, artwork/video timing changes, and collaborator handoffs close to release.',
      evidence: 'Creative file/version sprawl and release asset readiness were linked in Discovery.',
      action: 'Lock the master candidate before finalizing metadata, links, and promo cuts.',
      priority: days <= 14 ? 'Do today' : 'This week',
    })
  } else if (release.audioStatus === 'master-ready') {
    risks.push({
      id: 'audio-ready',
      severity: 'ready',
      title: 'Master audio is ready',
      why: 'A locked master lowers the risk of late file replacement or mismatched promo assets.',
      evidence: 'Release QA treats final audio as a dependency for downstream launch materials.',
      action: 'Use this exact master for distributor upload and promotional snippets.',
      priority: 'Monitor',
    })
  }

  if (release.metadataStatus === 'incomplete') {
    risks.push({
      id: 'metadata-incomplete',
      severity: 'critical',
      title: 'Metadata is incomplete',
      why: 'Incomplete titles, credits, genre, explicit status, or release dates can become costly to fix after submission or release.',
      evidence: 'Discovery evidence showed some distributor metadata changes are limited or require takedown/re-delivery.',
      action: 'Finalize the release metadata before approving distributor delivery or public links.',
      priority: 'Do today',
    })
  } else if (release.metadataStatus === 'mostly-ready') {
    risks.push({
      id: 'metadata-mostly-ready',
      severity: 'warning',
      title: 'Metadata is not fully locked',
      why: 'Small metadata gaps can create last-minute uncertainty in pitch text, platform matching, and public links.',
      evidence: 'Metadata immutability was one of the highest-confidence release risks.',
      action: 'Review title, artist spelling, contributors, genre/mood, explicit status, UPC/ISRC, and release date as a single pass.',
      priority: 'This week',
    })
  } else {
    risks.push({
      id: 'metadata-ready',
      severity: 'ready',
      title: 'Metadata is locked',
      why: 'Final metadata lowers the chance of takedown/re-delivery or inconsistent public pages.',
      evidence: 'Locked metadata supports pitch, smart links, EPK, and platform readiness.',
      action: 'Keep all public copy aligned with the final metadata.',
      priority: 'Monitor',
    })
  }

  if (release.artworkStatus === 'missing') {
    risks.push({
      id: 'artwork-missing',
      severity: 'critical',
      title: 'Artwork is missing',
      why: 'Artwork is required for distributor upload, public links, press materials, and social posts.',
      evidence: 'Discovery linked release readiness with asset packaging across distributor, EPK, and social workflows.',
      action: 'Create or commission final cover artwork before advancing release promotion.',
      priority: 'Do today',
    })
  } else if (release.artworkStatus === 'draft') {
    risks.push({
      id: 'artwork-draft',
      severity: 'warning',
      title: 'Artwork is still a draft',
      why: 'Draft artwork can block final distributor approval, smart link thumbnails, and release day visuals.',
      evidence: 'Asset state is a dependency, not a standalone task.',
      action: 'Confirm final artwork dimensions, file format, explicit marks, and credit usage.',
      priority: days <= 7 ? 'Do today' : 'This week',
    })
  } else {
    risks.push({
      id: 'artwork-ready',
      severity: 'ready',
      title: 'Artwork is final',
      why: 'Final artwork reduces launch-page and social asset uncertainty.',
      evidence: 'Ready artwork is a stable input for distributor, EPK, and promotional material.',
      action: 'Use the same approved artwork across public surfaces.',
      priority: 'Monitor',
    })
  }

  if (release.smartLinkStatus === 'not-created' && days <= 14) {
    risks.push({
      id: 'smart-link-missing',
      severity: 'warning',
      title: 'Smart link or pre-save is missing',
      why: 'Without a ready landing link, early attention from posts, emails, or press can be lost or require link changes later.',
      evidence: 'Discovery evidence showed smart links depend on release source URLs, ISRC/UPC, and platform availability.',
      action: 'Create a draft link now, then replace draft destinations as platform URLs become available.',
      priority: days <= 7 ? 'Do today' : 'This week',
    })
  } else if (release.smartLinkStatus === 'draft' && days <= 7) {
    risks.push({
      id: 'smart-link-draft',
      severity: 'warning',
      title: 'Smart link is still in draft',
      why: 'Release day posts and bio links need a final destination before listeners arrive.',
      evidence: 'Smart links were a cross-tool dependency in the release workflow evidence.',
      action: 'Finalize the public link and test it on mobile before scheduling or posting launch copy.',
      priority: 'Do today',
    })
  } else if (release.smartLinkStatus === 'ready') {
    risks.push({
      id: 'smart-link-ready',
      severity: 'ready',
      title: 'Public release link is ready',
      why: 'A tested destination reduces release day link-switching risk.',
      evidence: 'Link readiness supports promotion and direct-to-fan continuity.',
      action: 'Use the same link in bio, email, captions, and EPK.',
      priority: 'Monitor',
    })
  }

  if ((release.platformFocus === 'youtube' || release.platformFocus === 'niconico') && release.youtubeStatus === 'not-prepared' && days <= 7) {
    risks.push({
      id: 'video-upload-not-prepared',
      severity: 'critical',
      title: 'Primary video upload is not prepared',
      why: 'For YouTube or NicoNico-centered releases, upload scheduling, description, thumbnail, tags, and premiere timing are core launch dependencies.',
      evidence: 'Japan-first and video-first workflows remain a validation target; the MVP conservatively treats upload readiness as a platform dependency.',
      action: 'Prepare the upload package and schedule the release page before announcing the final link.',
      priority: 'Do today',
    })
  } else if ((release.platformFocus === 'youtube' || release.platformFocus === 'niconico') && (release.youtubeStatus === 'scheduled' || release.youtubeStatus === 'ready')) {
    risks.push({
      id: 'video-upload-ready',
      severity: 'ready',
      title: 'Primary video release surface is prepared',
      why: 'A scheduled or ready upload gives promotion materials a stable destination.',
      evidence: 'Platform-specific readiness is part of the Venture A validation scope.',
      action: 'Verify title, description, thumbnail, credits, and scheduled visibility.',
      priority: 'Monitor',
    })
  }

  if (release.promoAssetsStatus === 'none' && days <= 7) {
    risks.push({
      id: 'promo-assets-none',
      severity: 'critical',
      title: 'Release day promo assets are missing',
      why: 'When launch is close, missing captions, short clips, or announcement images make promotion reactive and fragmented.',
      evidence: 'Discovery showed promotion burden and social content pressure repeatedly affect independent creators.',
      action: 'Prepare at least one release day post, one short clip, and one direct fan message before launch.',
      priority: 'Do today',
    })
  } else if (release.promoAssetsStatus === 'some') {
    risks.push({
      id: 'promo-assets-some',
      severity: 'warning',
      title: 'Promotion assets are only partially prepared',
      why: 'Partial assets can cover launch day but may not support pre-release, release day, and post-release follow-up.',
      evidence: 'Release strategy evidence included social, email, EPK, and post-release follow-up as linked tasks.',
      action: 'Choose the one or two launch moments that matter most and finish assets for those before adding more.',
      priority: days <= 7 ? 'Do today' : 'This week',
    })
  } else {
    risks.push({
      id: 'promo-assets-ready',
      severity: 'ready',
      title: 'Promotion assets are ready',
      why: 'Prepared assets reduce release day scrambling and keep messaging consistent.',
      evidence: 'Prepared launch materials support the release workflow without turning the product into a scheduler.',
      action: 'Keep a copy of final captions and media beside the release link.',
      priority: 'Monitor',
    })
  }

  if (release.epkStatus === 'none' && release.releaseType !== 'single') {
    risks.push({
      id: 'epk-none',
      severity: 'warning',
      title: 'EPK or press text is missing',
      why: 'For EPs and albums, press, venue, playlist, and collaborator outreach often need a compact release story and current artist materials.',
      evidence: 'Discovery evidence showed EPKs package music, bio, visuals, and press context for outreach.',
      action: 'Draft a short release note, current bio, approved photo, and key links.',
      priority: 'This week',
    })
  } else if (release.epkStatus === 'outdated') {
    risks.push({
      id: 'epk-outdated',
      severity: 'warning',
      title: 'EPK or press text is outdated',
      why: 'Old bios, photos, or links can weaken outreach and create mismatched public context.',
      evidence: 'EPK readiness connects release, promotion, and booking workflows.',
      action: 'Update the release story, artist bio, image, and contact link before sending any outreach.',
      priority: days <= 7 ? 'Do today' : 'This week',
    })
  } else if (release.epkStatus === 'ready') {
    risks.push({
      id: 'epk-ready',
      severity: 'ready',
      title: 'Press context is ready',
      why: 'Current release context makes external handoff to press, curators, or venues easier.',
      evidence: 'EPK evidence showed outreach depends on an asset package beyond audio files.',
      action: 'Reuse the approved release story in pitch, bio, and social copy.',
      priority: 'Monitor',
    })
  }

  if (release.blockers.trim()) {
    risks.push({
      id: 'known-blockers',
      severity: 'warning',
      title: 'Known blockers need an owner',
      why: 'A blocker written in notes can still be missed unless it is converted into the next concrete release decision.',
      evidence: 'Deep Dive identified memory load and handoff gaps as a root cause of release risk.',
      action: `Resolve or assign this blocker: ${release.blockers.trim()}`,
      priority: 'Do today',
    })
  }

  return risks.sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
}

function summarizeRisks(risks: Risk[]) {
  const critical = risks.filter((risk) => risk.severity === 'critical').length
  const warning = risks.filter((risk) => risk.severity === 'warning').length
  const ready = risks.filter((risk) => risk.severity === 'ready').length
  const overall: Severity = critical > 0 ? 'critical' : warning > 0 ? 'warning' : 'ready'
  const topAction = risks.find((risk) => risk.severity !== 'ready')?.action

  return {
    critical,
    warning,
    ready,
    overall,
    topAction,
    message: {
      critical: 'This release has serious readiness risk. Fix the top Critical item before spending time on lower-impact launch polish.',
      warning: 'This release is close, but a few dependencies still need attention before launch confidence is high.',
      ready: 'No major readiness risk is visible from the current inputs. Keep monitoring platform pages and public links.',
    }[overall],
  }
}

function parseRelease(value: unknown): ReleaseState {
  const record = value as Partial<ReleaseState>
  return { ...blankRelease, ...record }
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
