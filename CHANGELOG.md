# Changelog

All notable changes, by phase. Dates are when the phase was delivered.

## Launch-ready: real accounts, emails, legal pages, SEO and audits (2026-09-27)

### Added
- **Real accounts and email:**
  - sign-up with email confirmation;
  - a sign-in alert on every sign-in;
  - forgot password, and reset password (which signs out everywhere);
  - a "password changed" email;
  - emails sent through Resend's HTTPS API (or written to the log for local testing);
  - a new migration: V4 (confirmed email, accepted terms, session version, emailed-link tokens).
- **Bot protection:** a honeypot field, limits per IP address and per account (sign-in counts only failures), and optional Cloudflare Turnstile.
- **Pages:**
  - privacy policy (`/privacy`) and terms (`/terms`), with an "I agree" box on sign-up;
  - a custom 404, served with a real 404 status;
  - check-email, confirm-email, forgot-password and reset-password pages.
- **Cookie consent and analytics:**
  - a banner with equal yes/no, and *Cookie settings* in the footer and in Settings;
  - Vercel Web Analytics and/or GA4, loaded only after consent, with ids and tokens removed from addresses.
- **SEO:**
  - per-page titles, descriptions, canonical links and social-preview tags, also written into static HTML per public page;
  - `noindex` on signed-in pages;
  - sitemap.xml and robots.txt, generated at build time.
- **Social preview image and favicon set:** a 1200×630 image from a real frame of the 3D model; SVG with a dark-tab variant, ICO, Apple touch and app icons, and a web manifest.
- **Security headers and HTTPS:** a Content-Security-Policy and other security headers, HSTS, and a backend HTTPS redirect (`REQUIRE_HTTPS`).

### Changed
- **One call to action on the front page:** *Create your free account*.
- **Colours:** lightest grey, muted grey, warning amber and the wordmark now meet WCAG AA contrast in both themes.
- **Grids** without explicit columns can shrink, so nothing makes a phone page scroll sideways.
- **Tap targets:** bigger footer links, contents links and model checkboxes.
- **3D exhibits** on public pages load once the browser is idle.
- **Sample evidence links** use the reserved `.example` domain.

### Fixed
- **After sign-up**, new accounts sometimes landed on Today instead of the introduction: two redirects raced. Sign-in and sign-up now make one redirect.

### Security
- **Secrets:**
  - the backend refuses to start with the public default `JWT_SECRET` against a non-local database;
  - `vite build` fails if the bundle contains a secret key, or (with the real backend) the demo data;
  - the build refuses an `http://` API address.
- **Sessions:** tokens carry a session version; a password reset or change ends every other session.
- **Emailed links** are single-use (even when clicked twice at once), stored as SHA-256 hashes, and removed from the address bar once read.
- **Password reset and change** retire every older emailed link and close the account's live-update streams.
- **Confirming an email** doesn't sign in, so an address registered by someone else can't be taken over.
- **Sign-in limits** count only wrong passwords, per address and per account-and-address. There's no account-wide lockout that could be used against someone. IPv6 addresses are limited per /64 network.
- **Passwords over 72 bytes** get a clear message instead of a server error.
- **After a password change in one tab**, other tabs adopt the new session instead of signing the first tab out.
- **Google Analytics**' automatic events carry the redacted address too.
- **Names** are left out of confirmation and reset emails.

## Ready to host (2026-09-26)

### Added
- **Hosting files:**
  - `backend/Dockerfile` (a Java 21 container, running as a non-root user) and `.dockerignore`;
  - `frontend/vercel.json`, so app routes work on refresh;
  - a *Deploy it* section in the README listing every setting.

### Changed
- **Port:** the backend listens on the host's `PORT` when one is set (`SERVER_PORT` still wins).

### Fixed
- **False "backend isn't running" warning on a hosted site:** when the frontend and backend are on different addresses, the sign-in page's health check was blocked by CORS. `/actuator/health` now allows the configured origins.
- **Hosted wording:** the sign-in warning no longer gives local terminal commands when the backend is hosted.

## The assistant, with voice; the graph moves inside the app (2026-09-26)

### Added
- **Assistant:** an *Assistant* button on every signed-in page, plus Alt+A and the ⌘K palette, opens a side panel for the current or chosen project.
- **Predictive analysis:** forecast, risks, recent changes and "what should I work on next" are computed from the records and labelled *no AI*. Other questions go to the AI when a provider is configured, or get an honest "needs AI" reply.
- **Task management by command:** "Create a task … due Friday, high priority, assign it to Rohan" becomes a draft that opens the normal task form, filled in. "Start LIB-8" becomes a confirm button, and "Open LIB-8" or "Show the 3D model" navigate. Everything goes through the usual endpoints and permission checks, and nothing changes without a click.
- **AI suggestions:** AI answers may carry suggested actions (*create task*, *start task*). The server keeps only those two types and only real task keys, and shows them as the same confirm cards (also under *Ask about this project* on the Model page).
- **Voice:** push-to-talk, an optional "Hey ProjectFlow" wake phrase and answers read aloud, using the browser's speech recognition and synthesis.
  - The wake phrase is off by default, remembered per user on this browser, and listens only while the tab is visible.
  - The Assistant button and the panel header show whether it's listening now or paused. If the microphone is blocked or the speech service keeps stopping, it switches off and says why.
  - The panel says where audio goes.
  - Voice can prepare a change but never confirm one.
- **Keyboard and focus:** Alt+A opens the panel, moves into it when it's open, and closes it from inside (when the text box is empty). Focus returns to the Assistant button on close. The conversation is kept while the panel is closed.
- **Overview graph:** a *History and forecast* card on each project's Overview, with the graph and the analysis lines that need attention, linking to the 3D model.

### Changed
- **Front page:** keeps a small 3D preview of the sample project. The history-and-forecast graph, analysis and assistant are inside the app only; the sign-in and introduction exhibits no longer show the graph.
- **Model and Overview pages:** now share one hook for building the model (cached queries).
- **Task form:** can start from a draft (title, description, priority, due date, assignee, estimate).

## Front page, introduction, sign-in, history-and-forecast graph and AI assistant (2026-09-26)

### Added
- **Front page (`/`):**
  - a live exhibit of a fictional sample project, using the same 3D model, camera views, replay, graph and analysis as a real project;
  - three ideas, how work moves, a roles table computed from the permission rules, and everything inside the app.
- **Introduction (`/introduction`):** nine short chapters with a sticky index, including an interactive life of a task, how to read the model and forecast, and what the AI assistant can and can't do. New accounts land here unless an invitation link sent them elsewhere.
- **Sign-in and registration:**
  - redesigned under the public header;
  - on large screens, the sample project (sign-in) or the four-stage sculpture (registration);
  - *Keep me signed in* (off keeps the session in this tab only);
  - a Caps Lock warning;
  - sample accounts, shown in demo mode, or with the backend when `VITE_SHOW_SAMPLE_ACCOUNTS=true`.
- **History and forecast graph:** on every project's Model page, under the 3D model. It shows all tasks and approved tasks day by day, recorded up to today and dashed as an estimate after it. It's synced with the replay (click or drag to scrub), with a table of the numbers.
- **Analysis:** beside the model, computed from records and marked *Recorded* or *Estimate*, with the tone in words as well as colour. It covers:
  - the estimated finish against the deadline;
  - open tasks without an estimate (the forecast assumes 1 day each and says so);
  - overdue work and what it holds up;
  - reviews waiting and rework;
  - open tasks per person, listed alphabetically with no ranking.
- **AI assistant:** *Ask about this project*, backed by `POST /api/projects/{id}/ai/ask`.
  - Any member may ask; the server checks membership before gathering the project's records.
  - The page's scheduler estimate is sent along, filtered to the project's own task keys and labelled as an estimate.
  - Answers cite task keys (invented keys are dropped) and list what the records don't show.
  - With no provider configured it says it's unavailable, in demo mode too.

### Changed
- **AI prompts:** user-written text is escaped so it can't close its `<record>` wrapper.
- **Hourly AI limit:** a request counts once the provider replies, even if the reply is unusable; only transport failures are refunded.
- **Long answers:** trimmed so follow-up questions stay within the history limit.
- **Calendar days in the model:** rounded, so due dates don't shift by a day across daylight-saving changes.
- **Touch scrolling:** 3D views embedded in pages (the sample project, the sculpture, the skyline) leave touch scrolling to the page and don't zoom on the mouse wheel.
- **Sign-in on phones:** the exhibit isn't mounted at all, so no three.js download or WebGL.
- **Camera fitting:** the camera centres the model's projection.

## Fix: backend compile error, and run instructions that survive copy and paste (2026-09-26)

- **Backend didn't compile:** `GlobalExceptionHandler` imported `MissingServletRequestPartException` from `org.springframework.web.bind`; it lives in `org.springframework.web.multipart.support`.
- **Why it slipped through:** earlier compile checks used hand-written stand-ins for the Spring APIs, and they had the same mistake.
- **New checks:**
  - The backend (main and tests) is now compiled against the real source code of every library, at the versions Spring Boot 3.5.16 selects. It reports 0 errors.
  - Repository query method names, JPQL queries and entity column names are checked against the entities and migrations.
  - The frontend is type-checked against the libraries' real types. It reports 0 errors, and every imported lucide icon exists in 0.525.
- **README commands:** the command blocks no longer have `# comments` after commands. The macOS terminal (zsh) passes them to the command as arguments, so `npm install  # first time only` failed with `EINVALIDTAGNAME "#"`, and the dev server then couldn't find `@tailwindcss/vite`. Troubleshooting now covers both errors.
- **Changelog:** entries are back in date order.

## Redesign: a project you can walk around (2026-09-26)

Answers the design review in [docs/DESIGN_REVIEW.md](docs/DESIGN_REVIEW.md); the spec is [docs/REDESIGN.md](docs/REDESIGN.md).

### Added
- **Project Model** (chapter III, `/projects/:id/model`): a three.js model built from the project's records.
  - Layout: time runs left to right, one lane per person, and height is priority. Materials are stone, graphite, amber and bronze (approved). Dependency threads, a glass Today plane, milestone obelisks and the deadline are drawn in.
  - Replay: a scrubber rebuilds any day from the recorded status history; past today, scheduler estimates show as labelled ghosts.
  - Controls: camera presets (Overview, Plan, Elevation, Today), toggles, hover details, and a selection panel that highlights what the task waits on and what it unblocks.
  - Keyboard: full keyboard navigation with screen-reader announcements.
- **Portfolio Skyline** on Today: one tower per project, layered by status, with a red sleeve for overdue work, synchronised with a text list.
- **Flow Sculpture** on sign-in and registration: four stages as an interactive sculpture, with the stage names as real text.
- `GET /api/projects/{id}/history` (members only) and the same route in the demo API: every recorded status change, oldest first (time, then id).
- Project cards show a small **tower glyph** of their tasks instead of a coloured letter tile.
- Tests: the 3D model's geometry and replay logic, history ordering and access (backend and demo API).

### Changed
- **Navigation:** the sidebar and top bar are replaced by a typographic **masthead** with five places, and by a full-screen numbered index on phones. Projects have six numbered **chapters** instead of eleven tabs.
- **Today** (formerly Mission Control): the stat tiles, trend chart, project list and activity feed are gone; it's now the skyline, the decisions list, and up next, proven done and next three weeks. *My tasks* is now *My work* and *Analytics* is now *Reports*.
- **Loading:** pages load on demand; three.js only downloads with a 3D view.
- **Autofill:** autofilled inputs keep the app's colours (fixes the blue-grey fields in the registration screenshot).
- **Timeline:** month names no longer run together, and the Today/Deadline labels have their own row.
- **Demo indicator:** the badge by the wordmark no longer repeats as a live-status "Demo".

### Dependencies
- `three` ~0.186.0 and `@types/three` ~0.186.0. Run `npm install` in `frontend` after updating.

## Diagnostics for a backend that isn't reachable (2026-09-26)

- When Spring Boot isn't running, the Vite dev proxy now answers with the API's error shape (`503 BACKEND_UNAVAILABLE`) and a message saying how to start it, instead of an empty 500 that the app could only report as "The server ran into a problem".
- Sign-in and registration pages check `/actuator/health` in backend mode and show what to do if the backend is down or reports `DOWN` (usually MySQL); the notice clears itself once the backend answers.
- A 5xx without details now points to the backend terminal.
- README: *Troubleshooting* table for the common start-up failures.
- Verification: the backend **tests** now also compile against API stubs (main and test sources, 0 errors).

## Review fixes after Phases 2–6 (2026-09-26)

An independent read-through of Phases 2–6 found the issues below; all are fixed.

- **Plan apply stale check covers the whole basis.** The request now carries every open task's version and every dependency id the scenario used (`basis`); if any task was edited, added, finished or deleted, or a dependency changed, nothing is applied (`409 EDIT_CONFLICT`). Previously only the changed tasks were checked. Mock API matches; tests extended.
- **Plan page:** a rejected apply no longer refetches and silently recalculates the scenario; *Recalculate with the latest data* is the only way to clear the stale state. Fixed a TypeScript narrowing error in the scenario builder that would have failed `tsc -b`. The scenario tile no longer turns grey.
- **Per-project page state** (saved plan scenarios) can no longer carry over between projects when navigating back/forward.
- **Dependencies:** concurrent "A waits on B" and "B waits on A" requests can no longer both pass the loop check (row lock on the project). Deleting a dependency you can't access returns 404, the same as an unknown id.
- **Live updates:** removed members and everyone in a deleted project are now told to drop it; SSE timeouts and disconnects are closed quietly instead of logging errors; per-user ticket cap; member lookups are cached briefly so a large plan apply doesn't query once per event.
- **AI:** the provider call no longer holds a database connection (the prompt is built in a short read-only transaction first); a failed provider call no longer uses up the caller's hourly quota.
- **Timeline:** the *Today* and *Deadline* labels were hidden under the sticky header; they now sit in the header and are in the legend. Copy no longer says there are no estimates.
- **Dependency map:** no longer re-scrolls on every click and background refresh.
- **⌘K palette:** Enter can no longer open a result for the previous search text.
- **Task form:** server errors for the estimate now appear on the estimate field; an invalid estimate on the task page is reset to the saved value.

## Phase 6 — Live updates, accessibility and verification

- **Server-Sent Events** (`GET /api/events/stream`) with one-time tickets (`POST /api/events/ticket`, 60 s) because `EventSource` can't send a bearer token. Events are sent after commit, only to current project members, and carry ids only; clients refetch through the normal authorised endpoints. Automatic reconnect with back-off; demo mode syncs across tabs through storage events.
- Contrast and reduced-motion fixes across the new pages.

## Phase 5 — Event-based analytics and focused AI

- Analytics from recorded events: work in each status over time (from `task_status_events`), review turnaround (median hours to review), rework rate and rounds to approval, median time in each status. Workload is shown alphabetically; people are never ranked.
- **AI assistance (optional, server-side):** review notes per criterion with a draft of feedback, acceptance-criteria suggestions, and a draft project status update. Keys stay on the server; context is limited to records the caller can see; the model is told it cannot open links or files and every answer lists its limits; nothing is saved or applied without a person choosing to. With no provider configured every AI endpoint returns `503 AI_UNAVAILABLE` and the UI says so — no simulated answers. Per-user hourly limit.

## Phase 4 — Estimates and the what-if planner

- Optional estimates in working days on tasks (`V3__task_estimates.sql`), always labelled as estimates.
- **Plan** tab: a deterministic scheduler (working days, dependencies, one task at a time per person) projects finish dates. Build a scenario — reassign, re-estimate, add time off — compare it with the current projection, then apply the resulting changes in one transaction (owners/managers). People whose dates move are notified with the reason.

## Phases 2–3 — Mission Control, search, calendar agenda, dependencies, map, timeline

- **Mission Control** dashboard: "what needs attention", each item with the rule that raised it and the records behind it (reviews waiting, changes requested, overdue, due soon and not started, own work awaiting review, project and milestone risk, workload, unassigned work due soon, blocked and blocking tasks); recently approved work with its evidence.
- **⌘K / Ctrl K command palette:** pages, commands and server-side search over the projects and tasks you can access (`GET /api/search`).
- **Calendar agenda view** with *Hide completed*.
- **Dependencies** (`V2__task_dependencies.sql`): finish-to-start, same project only, loops rejected with the chain that would close them; blocked/blocking shown on cards, task pages and Mission Control. Demo data includes overdue blockers (CCP-10, MBA-4).
- **Map** tab: interactive dependency graph (layered, keyboard-focusable, upstream/downstream highlighting) plus an equivalent list view. It shows the longest chain of open tasks counted in tasks and explicitly doesn't call it a critical path.
- **Timeline** tab: tasks grouped by milestone on a date axis with a Today rule and the project deadline, drawn from recorded dates only.

## Phase 1 — Backend, persistence, permissions and the review workflow (2026-09-26)

### Added — backend (`backend/`, new)
- Spring Boot 3.5.16 / Java 21 application with Flyway (`V1__initial_schema.sql`) on MySQL 8.4, `docker-compose.yml` for local MySQL, `.env.example` without secrets, Maven Wrapper.
- Stateless JWT auth (jjwt 0.12.7, BCrypt), consistent `{success, message, data, timestamp}` envelope and `{success:false, status, code, …}` errors.
- Per-project roles enforced on the server: `@PreAuthorize("@projectAccess…")` on every project/task route, then role rules in services (`Permissions`).
- Every endpoint the frontend uses: auth, profile, dashboard, calendar, projects, members, invitations, milestones, tasks (list/filter/sort/paginate, board moves with fractional ordering), comments, notifications, activity, analytics.
- **Acceptance criteria and checklists** on tasks; criteria are snapshotted into each submission.
- **Evidence-based submissions**: typed evidence (repository, deployment, link, screenshot, file), multipart upload to local storage, member-only download at `GET /api/files/{id}` (`nosniff`, inline only for safe image types).
- **Criteria-based review**: approval requires every criterion marked met; changes requested requires feedback; nobody reviews their own work; In Review/Done are unreachable by drag or direct status calls; all versions and reviews are kept.
- Optimistic locking (`@Version` + client version) → `409 EDIT_CONFLICT`.
- `task_status_events` history used for cycle time; first-time approval rate.
- Demo data seeder (empty database only) with overdue work, review revisions (CCP-5, CCP-13, MBA-3), workload imbalance and completed milestones.
- MockMvc integration tests on H2 (MySQL mode): role boundaries, approval bypass, submission preconditions, full request-changes → resubmit → approve cycle, own-review block, evidence access, edit conflicts.
- Swagger UI at `/swagger-ui.html`.

### Added — frontend
- **Review workspace** (`/projects/:id/tasks/:taskId/review`): evidence on the left, per-criterion Met/Not met verdicts and feedback on the right, version switcher, "what was asked in the previous version".
- **Definition of done** card on tasks: editable acceptance criteria and checklist, locked in review/done.
- Submit dialog rebuilt around evidence: repository and deployment fields, extra links, screenshots with previews, checklist blockers you can tick in place, the criteria the reviewer will check.
- Authorised file previews/downloads (token-bearing fetch → object URL).
- Acceptance criteria on task creation (one per line).
- `EDIT_CONFLICT` handling with a reload action.

### Changed
- Frontend dev server moved to **port 5174**; backend mode calls same-origin `/api` through a Vite proxy to `localhost:8080`.
- API contract: `Submission.links/attachments` replaced by `criteria` + typed `evidence`; `Review.results`; `Task.acceptanceCriteria/checklist/version/startedAt`; `ProjectDetail.version`; new activity types and `EDIT_CONFLICT`.
- Board drops that mean "review" now open the review workspace instead of a dialog (the old `ReviewDialog` was removed).
- Analytics: cycle time measured from first start (not creation) to approval; "first-time approval" is the share of reviewed tasks approved on their first submission.
- Demo (mock) API brought to parity with the backend; stored schema bumped to v3 (older browser data is reseeded).
- Visual direction changed to a "gallery" catalogue look: stone canvas, square white panels, thin display type, tracked capitals for navigation and buttons, a single bronze accent.

### Verification
- Ran: TypeScript syntax parse of all frontend sources (0 errors).
- Not run (no registry access in the build sandbox): `./mvnw verify`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and the manual demo flow. See README → *Verify locally*.

## Phase 0 — Frontend with in-browser mock API

- Complete React frontend (projects, board, list, task detail, comments, notifications, milestones, calendar, analytics) running against an in-browser mock API.
