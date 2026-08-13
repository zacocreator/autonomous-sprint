# Release Readiness Validator

Release Readiness Validator is a local-first MVP for independent music creators preparing an upcoming release. It is designed for validation, not production operations.

The core experience is release QA: the user enters the current release state, then the app diagnoses what is risky, why it matters, and what to do next.

## Product Goal

Help an independent music creator understand whether an upcoming release is ready enough to proceed, with prioritized risks instead of a generic checklist.

## Core Hypothesis

Music creators will value a product that understands release-specific dependencies, deadlines, external platform rules, and asset readiness enough to flag what is dangerous before launch.

## Target User

- Independent musicians releasing without a manager
- DTM and bedroom producers
- Vocaloid producers and internet-first creators
- Small bands or units coordinating their own release assets

## MVP Scope

- Enter one release's current state
- Diagnose readiness with `Critical`, `Warning`, and `Ready` findings
- Explain why each finding matters
- Recommend the next action for each risk
- Show an overall readiness summary and top priority action
- Load a sample risky release for fast validation
- Persist the current release state in browser `localStorage`

## Out of Scope

- General task management
- Custom checklist building
- External API integrations
- Spotify, distributor, YouTube, or NicoNico automation
- Team collaboration
- AI-generated copy
- Promotion service trust scoring
- Rights or royalty management

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
- [ ] Sample diagnosis loads a risky release
- [ ] Release title, artist, date, platform focus, distributor status, pitch status, link status, asset status, and notes can be edited
- [ ] Diagnosis can be run from the form
- [ ] Overall readiness shows `Critical`, `Warning`, or `Ready`
- [ ] Critical findings appear before warnings and ready items
- [ ] Each finding explains why it matters
- [ ] Each finding includes a concrete next action
- [ ] Missing release title or artist is treated as a risk
- [ ] Near release date with unsubmitted Spotify pitch is Critical
- [ ] Updating inputs and re-running diagnosis changes the output
- [ ] Current release state persists after reload
- [ ] Mobile width has no horizontal scrolling
- [ ] `npm run build` succeeds
- [ ] `npm run test:e2e` succeeds

## Known Limitations

- The MVP uses transparent local rules, not live platform data.
- The user must manually enter release state.
- Japan-first workflows such as YouTube, NicoNico, and Bokacolle are represented only at a basic validation level.
- The app does not verify actual distributor delivery, Spotify for Artists visibility, or public links.
- The diagnosis is a validation aid, not legal, platform, or marketing advice.

## Storage and Privacy

The app has no backend. Release state is stored only in the current browser through `localStorage`.
