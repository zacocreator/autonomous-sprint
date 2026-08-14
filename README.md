# Music Deadline Studio

Music Deadline Studio is a local-first validation MVP for independent music creators and small music teams. It explores a product direction where creators do not need to start from a blank task board: the app can recover project state from existing music folder traces and turn it into a lightweight campaign board.

The product is not a generic task manager and not a standalone release checklist. The core experience is: point the app at a music folder, recover song ideas/assets/progress, then see what looks dormant, missing, risky, or ready to move next.

## Product Goal

Help music creators turn messy creative folders into actionable production/campaign state with less manual setup than a generic task management tool.

## Core Hypothesis

Music creators will value a workspace that starts from how they already work: DAW sessions, demos, bounces, lyrics, references, artwork, video files, and scattered assets. The app should infer enough structure to create a useful board and surface readiness risks.

## Target User

- Vocaloid and DTM creators with many sketches, bounces, and dormant ideas
- Utaite or MV creators coordinating audio, lyrics, illustration, video, credits, and publish timing
- Independent musicians preparing releases, contests, or posting events
- Small bands or units with shared folders and multiple songs/workstreams

## MVP Scope

- Mock folder recovery demo
- Browser folder picker for local file trace analysis where supported
- File type detection from names/extensions: DAW/session, demo, bounce, mix, master, lyrics, artwork, video, stems, references
- Detected song/workstream groups
- Estimated progress stage
- Dormant idea signal from last-modified dates
- Generated campaign board from recovered file traces
- Music-specific cards for ideas, production lanes, assets, dependencies, and rules
- Risk diagnosis with cause cards and next actions
- `Next Focus` list with 1-3 prioritized actions
- Browser-only persistence through `localStorage`

## Out of Scope

- Reading audio contents
- Uploading files to a backend
- Cloud Drive integration
- DAW-specific parsing
- AI audio analysis
- Full background monitoring
- Full Jira/Linear/Asana feature parity
- Multi-user collaboration accounts
- Billing, marketplace, or creator matching

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build

```bash
npm run build
```

## Test

```bash
npm run lint
npm run test:e2e
```

## QA Checklist

- [ ] App opens without runtime errors
- [ ] Demo folder recovery creates detected song/workstream groups
- [ ] Recovery insights show file count, active work, dormant ideas, and missing package signals
- [ ] Recovered board is generated without manually creating cards
- [ ] Event type, deadline, platform, and project name can be edited
- [ ] Cards can be updated and diagnosis changes
- [ ] Risk findings include cause cards where relevant
- [ ] State persists after reload
- [ ] Mobile width has no horizontal scrolling
- [ ] `npm run lint` succeeds
- [ ] `npm run build` succeeds
- [ ] `npm run test:e2e` succeeds

## Known Limitations

- File recovery uses transparent local heuristics based on file names, extensions, and timestamps.
- The app does not read audio contents.
- Browser folder selection support varies by browser.
- Rule profiles are simplified and should not be treated as official event guidance.
- The diagnosis is a validation aid, not legal, platform, or marketing advice.

## Storage and Privacy

The app has no backend. Project state and recovered file traces are stored only in the current browser through `localStorage`.
