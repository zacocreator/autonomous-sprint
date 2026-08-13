# Renewal Radar MVP Decisions

## Product Choice

The final MVP is Renewal Radar, a local-first subscription renewal tracker.

This was selected over the Micro Retro board concept because it provides clearer practical value for a small web service while staying implementable without external APIs, authentication, or backend infrastructure.

## Target User

Freelancers, solo builders, and small team owners who manage multiple recurring subscriptions such as SaaS tools, domains, cloud services, and creative software.

## Product Goal

Users can register their main recurring subscriptions within 10 minutes and understand renewals due in the next 30 days plus monthly equivalent cost from a single dashboard.

## MVP Scope

- Subscription CRUD
- Browser localStorage persistence
- Monthly and yearly equivalent totals
- 30-day renewal list
- Category-level spend summary
- Renewal-date sorted list
- Status and category filters
- JSON import and export
- Empty, validation, storage warning, and responsive UI states
- README and automated E2E QA

## Technical Decisions

- React, TypeScript, and Vite keep the implementation small and fast to validate.
- No backend is used for MVP; localStorage is sufficient for private single-device use.
- JSON import and export mitigate the main risk of browser-local storage.
- Playwright E2E tests cover the critical CRUD, persistence, filter, validation, and mobile overflow flows.

## Out of Scope

- Authentication
- Cloud sync
- Notifications
- Bank, email, or billing integrations
- AI recommendations
- Shared team workspaces
