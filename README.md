# Renewal Radar

Renewal Radar is a small local-first web app for tracking subscription renewals. It helps solo operators and small teams see upcoming renewals, monthly equivalent spend, yearly equivalent spend, category cost, and review candidates in one screen.

## Target User

- Freelancers and solo product builders
- Small team owners managing SaaS, domains, cloud tools, and creative software
- Anyone who wants to review recurring costs without connecting bank, email, or billing accounts

## Product Goal

Users can register their main recurring subscriptions within 10 minutes and understand renewals due in the next 30 days plus monthly equivalent cost from a single dashboard.

## MVP Features

- Add, edit, and delete subscriptions
- Track service name, amount, currency, billing cycle, next renewal date, category, status, and memo
- Store data in browser `localStorage`
- Show monthly equivalent spend, yearly equivalent spend, 30-day renewals, and review candidates
- Show category-level monthly spend
- List subscriptions sorted by renewal date
- Filter by status and category
- Export and import JSON backups
- Empty, validation, storage warning, and no-result states
- Responsive layout for desktop and mobile

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
- [ ] Empty state appears when no subscriptions exist
- [ ] Sample data can be loaded
- [ ] A subscription can be added with all required fields
- [ ] Empty service name is rejected
- [ ] Zero or negative amount is rejected
- [ ] Existing subscriptions can be edited
- [ ] Existing subscriptions can be deleted
- [ ] Data remains after page reload
- [ ] Monthly and yearly totals update after CRUD changes
- [ ] 30-day renewals list updates from renewal dates
- [ ] Category totals update from active subscriptions
- [ ] Status filter works
- [ ] Category filter works
- [ ] No-result state appears when filters match nothing
- [ ] JSON export downloads a file
- [ ] JSON import replaces data only after confirmation
- [ ] Invalid JSON import shows an error and keeps existing data
- [ ] Mobile width has no horizontal scrolling
- [ ] Desktop layout keeps dashboard, editor, insights, and list readable
- [ ] `npm run build` succeeds
- [ ] `npm run test:e2e` succeeds

## Storage and Privacy

Renewal Radar has no backend. Subscription data is stored only in the current browser through `localStorage`. Export JSON before clearing browser data or switching devices.
