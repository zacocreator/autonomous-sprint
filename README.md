# Music Deadline Studio

Music Deadline Studio is a local-first validation MVP for independent music creators working toward a deadline-driven release, contest, posting festival, cover video, MV, or distribution launch.

The product is not a generic task manager and not a standalone release checklist. The core experience is: update the current production state, then see what is risky, why it matters, and what to focus on next.

## Product Goal

Help music creators manage event/deadline-centered production work and naturally derive release readiness from progress, assets, external dependencies, and platform or event rules.

## Core Hypothesis

Music creators will value a product that connects daily production work with deadline-specific readiness, because generic tools do not understand music-specific dependencies such as demos, parked ideas, Mix/Master, artwork, MV, credits, posting windows, and promotion assets.

## Target User

- Vocaloid producers preparing for posting festivals such as Bokacolle
- DTM creators entering contests or public calls
- Utaite or internet-first creators preparing cover/MV releases
- Independent musicians coordinating their own release assets and promotion
- Small creator teams managing external dependencies without a manager

## MVP Scope

- Event/deadline project profile
- Preset event types: Bokacolle/posting festival, DTM contest, cover/MV, distribution release
- Idea/demo board with `Keep`, `Maybe`, `Parked`, and `Rejected`
- Production lanes for composition, arrangement, vocal, Mix/Master, artwork/MV, upload, and promotion
- Asset readiness for audio, lyrics, artwork, video, description/tags, credits, and SNS assets
- External dependency state for illustrator, video editor, and Mix/Master
- Rule checks for event requirements, posting windows, credits, and promotion plan
- Automatic risk diagnosis with `Critical`, `Warning`, and `Ready`
- `Next Focus` list with 1-3 prioritized actions
- Sample Bokacolle-style project for fast validation
- Browser-only persistence through `localStorage`

## Out of Scope

- DAW plugin
- Local file scanning
- External API integrations
- AI generation
- Full Jira/Linear/Asana feature parity
- Multi-user collaboration accounts
- Billing, marketplace, or creator matching
- Exhaustive support for every music event or distributor

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
- [ ] Sample event project is visible immediately
- [ ] Event type, deadline, platform, and goal can be edited
- [ ] Ideas/demos can be classified as Keep, Maybe, Parked, or Rejected
- [ ] Active idea can be selected
- [ ] Production lane status changes affect risk diagnosis
- [ ] Asset readiness changes affect risk diagnosis
- [ ] External dependency state changes affect risk diagnosis
- [ ] Rule checks affect risk diagnosis
- [ ] Next Focus shows concrete actions near the top of the experience
- [ ] Findings explain why the issue matters
- [ ] Findings include the signal that triggered them
- [ ] State persists after reload
- [ ] Mobile width has no horizontal scrolling
- [ ] `npm run lint` succeeds
- [ ] `npm run build` succeeds
- [ ] `npm run test:e2e` succeeds

## Known Limitations

- The MVP uses transparent local rules, not live platform or event data.
- Users still update project state manually.
- Rule profiles are simplified and should not be treated as official event guidance.
- The app does not connect to DAWs, cloud storage, distributors, YouTube, NicoNico, or SNS.
- The diagnosis is a validation aid, not legal, platform, or marketing advice.

## Storage and Privacy

The app has no backend. Project state is stored only in the current browser through `localStorage`.
