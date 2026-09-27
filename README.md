# ProjectFlow

A collaborative project and task management platform built around one question: **what evidence proves this work is done?**
Projects, per-project Owner/Manager/Member/Viewer roles, Kanban and list views, a To Do → In Progress → In Review → Done workflow in which *Done is only reachable through an evidence-based review*, acceptance criteria and checklists, comments, notifications, milestones, a calendar and analytics computed from real records.

| Folder | What it is | Status |
| --- | --- | --- |
| [`frontend/`](frontend/README.md) | React 19 + TypeScript + Vite 7 + Tailwind 4 + Redux Toolkit / RTK Query + React Router 7 + dnd-kit + Recharts + **three.js** | Phases 1–6 and the 3D redesign written (also runs standalone in a labelled demo mode) |
| [`backend/`](backend/) | Java 21 + Spring Boot 3.5 + Spring Security (JWT) + Spring Data JPA + Flyway + MySQL 8.4 | Phases 1–6 written |
| [`docs/`](docs/) | [Design review](docs/DESIGN_REVIEW.md), [redesign spec](docs/REDESIGN.md), [assessment and phase plan](docs/ASSESSMENT.md), [references](docs/REFERENCES.md) | |

See [CHANGELOG.md](CHANGELOG.md) for what changed in each phase.

## What makes it different

**Every project is a scale model you can walk around.** The *Model* chapter builds a 3D model of the project from its records:
- **Axes:** time runs left to right, there's one lane per person, and block height is priority.
- **Materials:** stone for not started, graphite for in progress, amber for in review, and **bronze for approved**.
- **Links and markers:** threads show dependencies, a glass plane marks today and obelisks are milestones.
- **Replay:** scrub a timeline to rebuild any past day from the recorded status changes; past today, the scheduler's estimate appears as ghost outlines.
- **History and forecast graph:** inside the app, on each project's *Overview* and under its 3D *Model*. The graph counts every task and every approved task day by day. It's recorded up to today and dashed as an estimate after that. On the Model page it moves with the replay, and clicking or dragging it moves the replay.
- **Analysis:** beside the model, short statements computed from the records, each marked *Recorded* or *Estimate*:
  - the estimated finish against the deadline, saying how many tasks had no estimate;
  - overdue work and what it holds up;
  - reviews waiting and rework;
  - open work per person.
  No AI is involved, so it's always there.
- **Assistant, with voice:** an *Assistant* button in the corner of every signed-in page (or Alt+A) opens a side panel. It covers predictive analysis and task management; see [The assistant](#the-assistant) below.
- **AI answers:** free questions go to an AI model, when one is configured on the server, and are answered from that project's records and the scheduler's estimate.
  - The server gathers the records after checking membership.
  - Answers cite task keys and list what the records don't show.
  - The AI can suggest a task or a start, which you confirm.
  - Without a provider it says it's unavailable and never invents an answer.
- **Around it:** *Today* shows your portfolio as a 3D skyline of towers. The public pages show a live 3D preview of a sample project (without the graph or analysis, which live inside the app):
  - the front page (`/`);
  - an introduction (`/introduction`);
  - the sign-in page.
  Every 3D view can be driven by keyboard and has a text equivalent.

There's no sidebar. A typographic masthead has five places (Today · My work · Projects · Calendar · Reports), and each project has six numbered chapters. [docs/DESIGN_REVIEW.md](docs/DESIGN_REVIEW.md) lists the flaws of the previous design and what fixed each one; [docs/REDESIGN.md](docs/REDESIGN.md) is the spec.

## What it does

| Question | Where it's answered |
| --- | --- |
| **What needs my attention?** | *Today*: a ranked list of decisions, each naming the rule that raised it and the tasks, milestones or people behind it, next to the portfolio skyline. No opaque scores. |
| **How did we get here?** | The project *Model*'s replay, rebuilt from every recorded status change, and the history-and-forecast graph under it. |
| **Will we make the deadline, and how sure is that?** | The *Model*'s analysis: the estimated finish against the deadline, marked as an estimate and naming how many tasks had no estimate. Or ask the AI assistant, which answers from the records and cites its tasks. |
| **What's blocking the work?** | *Dependencies* on each task, the dependency map (interactive graph plus an accessible list), threads in the 3D model, blocked/blocking badges on cards, and *Blocked*/*Blocking* items on Today. |
| **What happens next if…?** | *Plan*: a deterministic what-if scheduler over working days and estimates. Preview a scenario (reassign, re-estimate, time off), then apply it in one transaction; stale scenarios are refused. |
| **What proves it's done?** | Acceptance criteria and checklist on every task, evidence-based submissions, and a *review workspace* where Done is only reachable through an approval with every criterion met. |

Ready for real people: sign-up with email confirmation, sign-in alert emails, forgot/reset password, bot protection, a privacy policy and terms, cookie consent with optional analytics, and per-page SEO tags, sitemap and social image (see [Deploy it](#deploy-it)).

Also: ⌘K / Ctrl K search and commands, a calendar agenda with *Hide completed*, a project *Timeline* with a Today rule, analytics built from recorded events (flow over time, review turnaround, rework, time in status), optional server-side AI assistance that never acts on its own, and live updates over Server-Sent Events.

> **Verification status — please read.** This code was written in a sandbox that could not reach the npm registry or Maven Central. The backend was compiled against the real source code of its libraries, but **nothing here has been built with npm or Maven, run as a server, or tested against MySQL**. See [Verify locally](#verify-locally) for exactly which checks ran here and which you need to run. Please report anything that fails.

---

## Run it on macOS with VS Code

You need two terminals: one for the backend, one for the frontend.

### Prerequisites (one-time)

| Tool | Check | Install |
| --- | --- | --- |
| Java 21 (JDK) | `java -version` | `brew install openjdk@21` then follow the `sudo ln -sfn …` line Homebrew prints |
| Node.js 20.19+ (22 LTS recommended) | `node -v` | `brew install node@22` |
| MySQL 8 — **either** Docker Desktop **or** Homebrew MySQL | `docker -v` / `mysql --version` | [Docker Desktop](https://www.docker.com/products/docker-desktop/) or `brew install mysql` |

Maven is **not** needed: the backend ships the Maven Wrapper (`./mvnw`), which downloads Maven on first use.

Open the `projectflow` folder in VS Code (**File → Open Folder…**). Recommended extensions: *Extension Pack for Java*, *Spring Boot Extension Pack*, *ESLint*, *Tailwind CSS IntelliSense*.

### Terminal 1 — database and backend

Open a terminal (**Terminal → New Terminal**). Run each command on its own line exactly as shown. (The macOS terminal doesn't treat `#` as a comment, so don't paste notes after a command.)

Start MySQL with Docker Desktop open. This creates the database, user and password, all named `projectflow`:

```bash
cd backend
docker compose up -d
```

*Or*, with Homebrew MySQL instead of Docker:

```bash
cd backend
brew services start mysql
mysql -u root -e "CREATE DATABASE projectflow; CREATE USER 'projectflow'@'localhost' IDENTIFIED BY 'projectflow'; GRANT ALL ON projectflow.* TO 'projectflow'@'localhost';"
```

Then start the backend. `chmod` is only needed the first time.

```bash
chmod +x mvnw
./mvnw spring-boot:run
```

On first start Flyway creates the schema and the demo data seeder fills an empty database. Wait for `Started ProjectFlowApplication`.

- API: **http://localhost:8080/api**
- Swagger UI: **http://localhost:8080/swagger-ui.html**
- Health: **http://localhost:8080/actuator/health**

Configuration comes from environment variables (see `backend/.env.example`; no real secrets are committed). The defaults work for local development. For anything shared, set at least `JWT_SECRET` (`openssl rand -base64 48`) and `DB_PASSWORD`.

**Optional: AI assistance.** Off by default; the UI then says *AI assistance is not configured* and nothing is simulated. To turn it on, start the backend with your own key (it never reaches the browser):

```bash
AI_PROVIDER=anthropic AI_API_KEY=sk-ant-... AI_MODEL=claude-sonnet-5 ./mvnw spring-boot:run
```

What AI can do:
- answer free questions about a project, in the Assistant panel or the Model chapter's *Ask about this project*, and suggest a task or a start for you to confirm;
- draft review notes;
- suggest acceptance criteria;
- draft a project status update.

Its limits:
- It sees only records the requesting user can already see. For questions, that's the project's tasks, people, milestones, dependencies, status history and the scheduler estimate shown on the page, but no evidence links or files.
- User-written text is escaped and marked as data in the prompt.
- Nothing it produces is saved or applied until a person chooses to.
- Requests are limited per user per hour (`AI_MAX_REQUESTS_PER_HOUR`, default 30). A request counts once the provider has replied, even if the reply can't be used.

### The assistant

Open it with the **Assistant** button in the bottom-right corner of any page in the app, or with <kbd>Alt</kbd>+<kbd>A</kbd> (<kbd>Option</kbd>+<kbd>A</kbd> on a Mac). It works on the project you're looking at, or the one you choose at the top of the panel.

- <kbd>Alt</kbd>+<kbd>A</kbd> opens the panel. If it's already open, it moves you into it. From inside the panel, with the text box empty, it closes it, and so does <kbd>Esc</kbd>. It never fires while you're typing in another field, so <kbd>Option</kbd>+<kbd>A</kbd> still types "å" there.
- The conversation stays while the panel is closed, until you press **Clear** or sign out.
- Requests made while the project's records are still loading wait for them, rather than being answered from partial data.

| You type or say | What happens | Needs AI? |
| --- | --- | --- |
| "Will we make the deadline?" · "What's at risk?" · "What changed this week?" | Answered at once from the records and the scheduler's estimate, labelled *Computed from the records · no AI* | No |
| "What should I work on next?" · "Show my tasks" | Your open tasks across projects, in a suggested order (overdue, then in progress, then due soonest), with the reason for each | No |
| "Create a task to write release notes, high priority, due Friday and assign it to Rohan" | A draft you check; **Review and create** opens the normal task form, filled in. Nothing is saved until you press Create. | No |
| "Start LIB-8" · "Open LIB-8" · "Show the 3D model" | Start becomes a confirm button (with the usual permission check). Open and show just navigate. | No |
| Anything else ("Why did the search API slip?") | An AI answer from the project's records, with cited tasks, what the records don't show, and any suggested actions as confirm cards | Yes |

Changes always go through the normal endpoints with your own permissions, so the assistant can't do more than you could by hand. It never approves work, and it never changes a deadline or an assignee unless you confirm that in the task form.

**Voice.**
- **Talking:** press the microphone in the panel and speak, and your words are sent when you stop.
- **Wake phrase:** under *Voice*, you can turn on **Listen for "Hey ProjectFlow"**. It's off by default and remembered for you, on this browser only (another person signing in on the same browser starts with it off). It listens only while the tab is open and visible. Say "Hey ProjectFlow, what's at risk?", or pause after "Hey ProjectFlow" and then give the command.
  - What's actually running is always shown: the Assistant button shows a pulsing microphone while it's listening, and the panel header says *Listening*, or *Wake paused* while the tab is hidden or push-to-talk is in use.
  - If the browser blocks the microphone, or its speech service keeps stopping, listening switches off and the panel says why.
- **Answers aloud:** **Read answers aloud** speaks replies.
- **Browsers:** voice uses the browser's own speech recognition, so it works in Chrome, Edge and Safari but not Firefox.
- **Privacy:** those browsers may send audio to their maker (Google or Apple) to transcribe it. ProjectFlow only receives the text, never audio.
- **Voice never confirms:** it can prepare a change, but confirming always takes a click or a key press.

### Terminal 2 — frontend

Open a second terminal (the **+** in the terminal panel) and run these one at a time. `npm install` is only needed the first time, and again after a dependency changes. It must finish without `npm error` lines before the next command will work.

```bash
cd frontend
npm install
npm run dev:api
```

`dev:api` sends `/api` requests through the Vite proxy to the real backend.

Open **http://localhost:5174**:
- the front page, with a live sample project;
- **Introduction** for a five-minute guide;
- **Sign in**.

Every demo account uses the password **`Password@123`**. The sign-in page lists them in demo mode, and with the backend when `VITE_SHOW_SAMPLE_ACCOUNTS=true` (set in `.env.backend` for local development; keep it off for anything shared):

| Account | Role it demonstrates |
| --- | --- |
| aarav@projectflow.dev | Owner of *Campus Connect Portal*; has pending invitations |
| priya@projectflow.dev | Manager; reviews submitted work |
| rohan@projectflow.dev | Member; works on assigned tasks and submits them |
| vikram@projectflow.dev | Viewer; read-only |

`npm run dev` (without `:api`) starts a **demo mode** that uses an in-browser mock API and stores data in this browser only. It is labelled *Demo* next to the wordmark and is not the real backend.

Stop either server with <kbd>⌃</kbd> + <kbd>C</kbd>. `docker compose down` stops MySQL (add `-v` to delete its data and reseed next time).

### Ports

| What | URL |
| --- | --- |
| Frontend (Vite) | http://localhost:5174 |
| Backend API | http://localhost:8080/api |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| MySQL | localhost:3306 |

---

## Verify locally

**Checks that ran in the sandbox** (the real packages couldn't be installed, so stand-ins were used where noted)

- **Frontend syntax:** a TypeScript syntax parse of every `.ts`/`.tsx` file in `frontend/src` found 0 errors.
- **Frontend types:** a strict TypeScript check of `frontend/src`, with the same options as `tsconfig.app.json`, found 0 errors in ProjectFlow code. It ran against the **real** types and source code of every library, fetched from GitHub at the versions `package.json` selects: React 19 (`@types/react`), React Router 7.6, Redux Toolkit 2.8, React Redux 9.2, React Hook Form 7.60, Zod 3.25, date-fns 4.1, Radix, dnd-kit, Recharts 3.1, Sonner 2.0, lucide-react 0.525, tailwind-merge, clsx, three.js (`@types/three` 0.186) and `vite/client`.
  - Self-test: a copy with eight planted mistakes across these libraries produced exactly those eight errors.
  - Caveats: it ran on TypeScript 6.0 rather than 5.8, and Vitest's `describe`/`it`/`expect` used a small stand-in. `vite.config.ts` was reviewed by hand against Vite 7.3's proxy types rather than type-checked. `frontend/tools/seo.ts` was type-checked with Node's types and a minimal stand-in for Vite's plugin types.
- **Frontend tests:** all 88 unit and mock-API tests passed. They ran with a small stand-in for Vitest, and include:
  - the launch files: one HTML file per public page with its own tags, `app.html` and `404.html` kept out of search, the sitemap, robots.txt, per-page preloads, and the build refusing secrets;
  - analytics redaction (ids, query strings and one-time tokens never reach analytics);
  - sign-up needing accepted terms and an empty honeypot;
  - the assistant's command and question parsing (dates like "Friday" or "14/10", task keys typed or spoken, the wake phrase) and its "what next" ordering;
  - the 3D model's own tests;
  - the sample project;
  - the history series and analysis (assumed estimates, missing history, workload wording);
  - the public permission table, which is computed from the same permission rules as the app.
- **Whole app in Chromium:** the app was bundled from real library sources fetched from GitHub (React Router, Redux Toolkit, React Redux, Zod, React Hook Form, dnd-kit, tailwind-merge, three.js r186 and the Tailwind 4 compiler). It ran in demo mode in headless Chromium with WebGL.
  - Every main page was screenshotted in light and dark, on desktop and phone widths, with no console errors. That includes the front page, the introduction, sign-in and registration, and the Model page with its graph, analysis and assistant (shown in its "not available" state, since demo mode has no AI).
  - The 3D model was driven by keyboard, scrubber, replay and camera presets.
  - The assistant was driven end to end, with a stand-in for the browser's speech recognition. 24 checks passed:
    - opening it from the button and with Alt+A, closing it with Alt+A from inside, focus going back to the button, and Alt+A moving focus into an open panel;
    - the conversation being kept while the panel is closed;
    - forecast, risks, changes and next-work answers;
    - the honest "needs AI" reply;
    - a spoken task request becoming a draft, then a prefilled form, and a task created only after confirming;
    - starting a task after confirming;
    - push-to-talk;
    - the "Hey ProjectFlow" wake phrase opening the panel and answering, the button and header showing it's listening, the setting being stored per user, and turning it off.
  - Icons, Radix menus/dialogs, toasts and charts were simple stand-ins in these screenshots.
  - **Launch features, end to end:** 22 checks passed. They cover:
    - static per-page titles, canonical links and social tags;
    - `noindex` on app pages, a real HTTP 404, robots.txt and the sitemap;
    - the security headers, icons and manifest;
    - the cookie banner (nothing loads before yes; "no" loads nothing; changing the choice later works and is remembered);
    - sign-up validation, the terms box and the hidden honeypot;
    - a new account landing on the introduction, signed-in pages being `noindex`, and the 404 for signed-in people;
    - one-time tokens being removed from the address bar;
    - no Content-Security-Policy violations.

    They also found and fixed an old bug: after sign-up the app sometimes jumped to Today instead of the introduction.
  - **Served like Vercel:** the pages were served the way `vercel.json` describes, with clean URLs, the app rewrite, a real 404 status and every security header including the Content-Security-Policy. No page logged a policy violation.
  - **Launch audit:** 34 routes (public pages, account pages and every signed-in page) were checked in light and dark, at 1440 px and 390 px wide:
    - text contrast against WCAG 2.2 AA;
    - no sideways scrolling on a phone;
    - tap targets of at least 24×24 px, or spaced as WCAG allows;
    - a text alternative for every image, canvas, icon button and form field;
    - one `h1` per page.

    The first run found low contrast in three colours used on almost every page (the "flow" of the wordmark, the lightest grey, and warning amber), two pages wider than a phone, and a few small targets. All are fixed and the audit is now clean.
  - **Links:** all 119 distinct links found on those pages were followed and none is broken. The only external links were the sample project's evidence links, which now use the reserved `.example` domain so they're clearly fictional.
  - **Speed:** measured on a simulated slow phone (Lighthouse's mobile profile: 1.6 Mbps, 150 ms round trips, 4× slower CPU), with a minified, compressed demo-mode bundle. Results:
    - first paint about 2.6 s and largest paint about 3.1 s on `/privacy`, `/introduction` and `/`;
    - 370–540 KB transferred.

    The 3D exhibits now load after the page is idle, which cut the front page's main-thread blocking by about a third. These numbers come from the sandbox's bundler and a plain HTTP/1.1 server, which splits the code into many more files than Vite does; expect the Vercel build to be at least as fast. Run Lighthouse after deploying for the real figures.
  - The favicon set and the social image were rendered in Chromium from the logo and a frame of the real 3D model. The social image was compressed from 109 KB to 47 KB with no visible change.
- **Backend compile:** all backend main **and test** sources were compiled with `javac` 21 against the **real source code** of their libraries, at the exact versions Spring Boot 3.5.16 selects. The libraries: Spring Framework 6.2.19, Spring Boot 3.5.16, Spring Security 6.5.11, Spring Data 3.5.13, Jakarta Persistence 3.1, Servlet 6.0, Validation 3.0.2, Jackson 2.21, jjwt 0.12.7, swagger-core, JUnit 5.12, AssertJ 3.27, JsonPath 2.9 and Hamcrest 3.0.
  - Result: 0 errors in ProjectFlow code.
  - Self-test: a copy with three planted mistakes (a wrong import, a wrong Spring method and a wrong MockMvc matcher) produced exactly those three errors.
  - Earlier releases were checked against hand-written stubs, which is how a wrong package for `MissingServletRequestPartException` slipped through; it's fixed.
- **Backend queries and schema:** every derived repository method name (69 property paths) and every JPQL query (8) was checked against the entity fields, and every mapped table and column (129 columns) against the Flyway migrations. None failed.
- **Backend pieces run directly:**
  - the email sender was run against a stand-in for Resend's API: it sent the right request (key, from, to, subject, reply-to, HTML and text), and it refuses to start without a key;
  - the Turnstile check was run against a stand-in for Cloudflare's verify endpoint: good token, bad token, honeypot;
  - also run: the rate limiter, the email texts (escaping, time zone) and client-IP handling behind proxies.

  They ran with Jackson from the local Gradle install and small stand-ins for Spring's annotations. A Spring test of the whole account flow was added but, like the other backend tests, runs only with `./mvnw verify`. It covers:
  - sign-up, then confirming the email;
  - the sign-in alert;
  - a password reset ending old sessions;
  - a password change keeping this device signed in;
  - the bot checks.
- **Backend not run:** the backend tests and application startup were not run. Spring wiring, Flyway SQL (including the new V4 migration) and runtime behaviour are only exercised by `./mvnw verify` on your machine.
- **Icons:** all 103 lucide icons the app imports exist in lucide-react 0.525.
- **Review:** two independent read-throughs of the Phase 2–6 code were done, and a third of the front page, introduction, graph, analysis and assistant. Their findings are fixed (see CHANGELOG).
- **Not run:**
  - **AI:** it was never called with a real provider here (no key, no network), so its answers are untested. Tests cover the escaping of user text in prompts, the server-side filtering of suggested actions (only *create task* and *start task*, only real task keys) and the unavailable path.
  - **Real voice:** real speech recognition wasn't tested, only the stand-in.

**Checks you need to run** (they could not run here):

Backend: this compiles the code, applies migrations V1–V4 to H2 (in MySQL mode) and runs the workflow, permission, dependency, planning, search, AI-unavailable, live-update and account (sign-up, email confirmation, reset) tests.

```bash
cd backend
./mvnw verify
```

Frontend:

```bash
cd frontend
npm run typecheck
npm run lint
npm test
npm run build
```

Then walk through the demo flow below against the real backend (MySQL).

## Demo flow

1. Sign in as **aarav** → *Projects* → **New project**. In its *V People* chapter invite `priya@projectflow.dev` as Manager and `rohan@projectflow.dev` as Member; each accepts from their *Inbox*.
2. Create three tasks with **acceptance criteria** (one per line) and **estimates**, assigned to Rohan: *API*, *UI*, *Release*.
3. **Dependencies:** on *UI* add "waits on *API*"; on *Release* add "waits on *UI*". Try to make *API* wait on *Release*: it's refused with the loop it would create. Open *IV Schedule → Dependencies* to see the chain; switch to *List* for the same information as text. The chain also shows as threads in *III Model*.
4. **Blocker:** give *API* a due date in the past. *Today* now shows it as **Blocking**, and Rohan sees *UI* as **Blocked**, each with the reason.
5. **Scenario:** as aarav open *IV Schedule → What if*. Add "Rohan is away 3 days" and re-estimate *API*. Compare the projected finish (labelled as an estimate), then **Apply**. Rohan is notified of moved dates. If someone edits a task in between, the apply is refused as out of date and you recalculate.
6. **Submit:** as **rohan** open *API* → **Start work** → tick the checklist → **Submit for review** with a repository URL, a deployment URL and a screenshot. Dragging the card to *Done* is refused (the server refuses it too: `409 WORKFLOW_VIOLATION`).
7. **Request changes:** as **priya** → *Today* → *Review waiting* → **Open review**. Mark one criterion *Not met*, write feedback, **Request changes**. The task returns to *In Progress*.
8. **Resubmit** as rohan (version 2). The review workspace shows *What was asked in version 1* next to the new evidence.
9. **Approve** as priya with every criterion *Met*. The task is *Done*; both versions and both reviews are kept. *UI* is no longer blocked.
10. **Timeline and analytics:** *IV Schedule → Timeline* shows the recorded work against the Today rule and deadline; *I Overview → Analytics* updates flow, review turnaround, rework and time in status. Other signed-in users see these changes live, without refreshing.
11. **Model:** open *III Model*. Drag to turn it, scroll to zoom, or use the arrow keys to move between tasks and Enter to open one. Press **P** (or the play button) to replay the project day by day; *API* turns amber when submitted and bronze when approved.

The seeded data already includes overdue blockers (CCP-10, MBA-4) holding up other work, review revisions (CCP-5, CCP-13, MBA-3), a workload imbalance and completed milestones.

## Deploy it

The frontend is a static site (for example on Vercel). The backend and MySQL need a host that runs containers or Java, such as Railway or Render. `backend/Dockerfile` builds the backend on any host that accepts a Dockerfile. The backend listens on the host's `PORT` if it sets one.

**Backend settings** (environment variables on the backend service; `backend/.env.example` lists them all):

| Key | Value |
| --- | --- |
| `DB_URL` | `jdbc:mysql://HOST:PORT/DATABASE?sslMode=REQUIRED&serverTimezone=UTC&characterEncoding=utf8` |
| `DB_USERNAME` / `DB_PASSWORD` | From your MySQL provider's connection page |
| `JWT_SECRET` | The output of `openssl rand -base64 48`. The server refuses to start without it when the database isn't local. |
| `CORS_ALLOWED_ORIGINS` | The frontend's address, e.g. `https://your-app.vercel.app`, with no `/` at the end (comma-separate several) |
| `APP_URL` | The same address. Links in emails point here. |
| `DEMO_DATA` | `false`. The sample accounts' password is published in this README. |
| `EMAIL_PROVIDER` | `resend` |
| `EMAIL_API_KEY` | Your Resend API key (`re_…`) |
| `EMAIL_FROM` | e.g. `ProjectFlow <no-reply@yourdomain.com>`, on a domain you verified in Resend |
| `REQUIRE_HTTPS` | `true` |
| `TRUSTED_PROXIES` | `1` (Railway and Render each put one proxy in front of the app) |
| `TURNSTILE_SECRET_KEY` | Optional: your Cloudflare Turnstile secret key |
| `AI_PROVIDER` | `none`, or `anthropic` with `AI_API_KEY` and `AI_MODEL` |

Start with an empty database; Flyway creates the tables on first start.

**Frontend settings** (on Vercel, with *Root Directory* set to `frontend`; `frontend/.env.example` lists them all):

| Key | Value |
| --- | --- |
| `VITE_USE_MOCK_API` | `false` |
| `VITE_API_BASE_URL` | The backend's address plus `/api`, e.g. `https://your-backend.up.railway.app/api`. The build refuses `http://`. |
| `VITE_SHOW_SAMPLE_ACCOUNTS` | `false` |
| `VITE_SITE_URL` | Your site's address (on Vercel the production domain is used when it's empty) |
| `VITE_OPERATOR_NAME` / `VITE_CONTACT_EMAIL` | Who runs the site and how to reach them; shown on the privacy policy and terms |
| `VITE_TURNSTILE_SITE_KEY` | Optional: the Turnstile site key matching the backend's secret |
| `VITE_ANALYTICS` / `VITE_GA_MEASUREMENT_ID` | Optional: `vercel` for Vercel Web Analytics, and/or a GA4 id (`G-…`). Either one turns on the cookie banner. |

`VITE_…` values are built into the site, so redeploy after changing them. Uploaded evidence is stored on the backend's disk (`STORAGE_DIR`). Attach a persistent volume at `/app/data`, or uploads are lost when the backend is redeployed.

### Real sign-ups and account emails

With `EMAIL_PROVIDER=resend`:

1. **New accounts confirm their email.** The confirmation link works once, for 24 hours. The person then signs in with their password; confirming deliberately doesn't sign anyone in. That way, if someone registered your address first, you still have to reset the password, which shuts them out. Until the address is confirmed, signing in says so and offers a new link.
2. **Every sign-in sends an alert** with the time, the device (such as "Chrome on macOS") and the IP address, and a link to reset the password. Alerts only go to confirmed addresses.
3. **Forgot password** emails a link that works once, for 1 hour. Resetting signs the account out everywhere, and sends a "your password was changed" email. So does changing the password in Settings (that device stays signed in).

Details of the account emails and limits:
- **Links:** they're stored only as SHA-256 hashes and work once, even if clicked twice at the same moment. A password reset or change retires every older link and closes the account's live-update streams.
- **Privacy of answers:** they never reveal whether an address has an account, except at sign-up.
- **Names:** confirmation and reset emails don't include the name typed at sign-up.
- **Password length:** passwords over 72 bytes (BCrypt's limit) are refused with a clear message.
- **Rate limits** count only wrong passwords (30 per address and 10 per account per address in 15 minutes). There's deliberately no account-wide limit, which anyone could use to lock a chosen person out. IPv6 addresses are limited per /64 network.

Setting up email:
1. Create a Resend account and an API key.
2. Verify a domain you own in Resend (it gives you DNS records to add).
3. Set `EMAIL_FROM` to an address on that domain.

Without a verified domain, Resend only delivers to your own account's address, which is enough to test with.

- **Local development:** `EMAIL_PROVIDER=log` writes each email, links included, to the backend log instead of sending it.
- **Without email:** with `EMAIL_PROVIDER=none` accounts work at once, and "Forgot password?" is hidden because nothing could be sent.

### Launch checklist: what's in place

| | What's in place | Where |
| --- | --- | --- |
| **Privacy and terms** | A privacy policy and a terms page, in plain language. The policy lists the analytics and bot check this copy actually uses. Sign-up needs a ticked "I agree". | `/privacy`, `/terms` |
| **Secrets** | The frontend holds none; `vite build` fails if the bundle contains an API key or private key. With the real backend, the demo API and its sample password are left out of the bundle. The backend refuses the public default `JWT_SECRET`. | `frontend/tools/seo.ts`, `JwtService` |
| **HTTPS** | Vercel serves HTTPS only and sends HSTS (`vercel.json`). The backend redirects plain HTTP with `REQUIRE_HTTPS=true` and sends HSTS on HTTPS. The build refuses an `http://` API address. | `vercel.json`, `HttpsFilter` |
| **Security headers** | Content-Security-Policy, X-Frame-Options, nosniff, Referrer-Policy and Permissions-Policy. The microphone is allowed for voice input only. | `vercel.json` |
| **Cookie consent** | A banner appears only when analytics are configured; "No, thanks" is as easy as yes. *Cookie settings* in the footer and in Settings changes the choice later, and turning analytics off deletes Google's cookies. | `features/consent` |
| **Analytics** | Vercel Web Analytics and/or GA4, loaded only after consent. Addresses are sent with ids and query strings removed. | `features/analytics` |
| **Titles and descriptions** | Every public page has its own title, description, canonical link and social-preview tags. They're in static HTML too, because link previews don't run JavaScript. Signed-in pages are `noindex`. | `src/seo/pages.ts` |
| **Social preview image** | A 1200×630 image with a frame of the real 3D model, compressed to 47 KB. | `public/og-image.png` |
| **Favicon** | SVG (switches for dark browser tabs), ICO, Apple touch icon, and 192/512/maskable app icons, plus a web manifest. | `public/` |
| **Sitemap and robots.txt** | Generated at build time. Signed-in and emailed-link pages are disallowed. | `dist/sitemap.xml`, `dist/robots.txt` |
| **404 page** | A custom page, served with a real 404 status by Vercel (`404.html`). | `PublicNotFoundPage` |
| **Bot protection** | A honeypot field, and limits per IP address and per account on sign-up, sign-in (only failures count), emailed links and resets. Cloudflare Turnstile is optional. | `RateLimiter`, `HumanCheck` |
| **Form validation** | Every form is checked in the browser and again on the server, with the same messages. | `lib/forms.ts`, `Requests.java` |
| **One call to action** | The front page has one button, *Create your free account*. Everything else there is a quiet text link. | `HomePage` |

### After deploying

- Run Lighthouse (Chrome DevTools → Lighthouse, mobile) on `/`, `/login` and `/privacy`.
- Share the address in a chat app to see the social preview.
- Submit `sitemap.xml` in Google Search Console.
- Sign up with a real address and click through the emails.

## Troubleshooting

**"Can’t reach the ProjectFlow backend" or "The backend isn’t running" on the sign-in page.** The frontend is up but Spring Boot isn't answering on port 8080. Look at the backend terminal:

| What you see there | Fix |
| --- | --- |
| Nothing / you never started it | `cd backend && docker compose up -d && ./mvnw spring-boot:run`, then wait for `Started ProjectFlowApplication` |
| `Communications link failure` or `Connection refused` to MySQL | MySQL isn't running: start Docker Desktop, then `docker compose up -d` (or `brew services start mysql`) |
| `Access denied for user 'projectflow'` | The database user doesn't exist or has another password; see *Option B* above, or set `DB_USERNAME`/`DB_PASSWORD` |
| `Port 8080 was already in use` | Stop the other process (`lsof -i :8080`) or run with `SERVER_PORT=8081` and start the frontend with `PROJECTFLOW_API_TARGET=http://localhost:8081 npm run dev:api` |
| `release version 21 not supported` / `invalid target release` | Maven is using an older JDK: `export JAVA_HOME=$(/usr/libexec/java_home -v 21)` |
| `./mvnw: Permission denied` | `chmod +x mvnw` |
| `no such service: #` from Docker | A note after `#` was pasted with the command. Run `docker compose up -d` on its own. |
| `COMPILATION ERROR` | Please send me the first error lines. To start the app while a *test* fails to compile, `./mvnw spring-boot:run -Dmaven.test.skip=true` skips compiling tests. |
| A Flyway error after an earlier run | Reset the local database: `docker compose down -v && docker compose up -d` |

**Frontend terminal errors.**

| What you see there | Fix |
| --- | --- |
| `npm error code EINVALIDTAGNAME` … `Invalid tag name "#"` | A note after `#` was pasted onto the command line. Run `npm install` on its own. |
| `Cannot find package '@tailwindcss/vite'` or `failed to load config from …vite.config.ts` | `npm install` didn't finish. Run it again in the `frontend` folder and wait for it to finish without `npm error` lines. |
| `Port 5174 is in use` | Another dev server is still running. Stop it with <kbd>⌃</kbd> + <kbd>C</kbd> in its terminal. |

**"The backend is running but not healthy".** Spring Boot started but reports `DOWN`, almost always because MySQL went away. Start MySQL and restart the backend.

**"The server failed without explaining why".** The backend returned an error without its usual JSON. The real cause is in the backend terminal (a stack trace); please send it.

## Known limitations

- **Legal pages:** the privacy policy and terms are a plain-language starting point written for this app, not legal advice. Have them checked for where you operate, and set `VITE_OPERATOR_NAME` and `VITE_CONTACT_EMAIL`.
- **Rate limits:** they're kept in memory, so they reset when the backend restarts and aren't shared between several backend instances.
- **Deleting accounts:** there's no "delete my account" button. Deletion requests go to the operator (the privacy policy says so).
- **Speed:** public pages are rendered in the browser, so the first paint waits for the JavaScript. Prerendering them would make it faster.
- Not compiled or run against MySQL in the sandbox (see above).
- Dependencies are finish-to-start and within one project only. The map highlights the *longest chain of open tasks* counted in tasks; it is deliberately not called a critical path.
- The planner is a deterministic simulation over working days (Mon–Fri) and estimates. It doesn't model partial allocation or holidays beyond the time off you add, and its results are always labelled as estimates.
- Live updates use one SSE connection per browser tab and an in-memory registry, so a multi-instance deployment would need a shared broker. Clients refetch through the normal endpoints; events carry ids only.
- Evidence files are stored on local disk (`backend/data/uploads`) without virus scanning. Only PNG/JPEG/GIF/WebP are shown inline; everything else downloads with `nosniff`.
- ProjectFlow stores evidence links but never opens or verifies them; neither does the AI.
- Demo mode keeps uploaded files only up to 512 KB each, in browser storage, and has no AI (the assistant says so).
- AI answers can be wrong. They're instructed to use only the records and to separate facts from estimates, and they cite tasks so you can check. The forecast the assistant sees is the one the page shows, computed in the browser by ProjectFlow's scheduler and labelled as such to the model.
- With *Keep me signed in* turned off, the session lives in that browser tab only: new tabs ask you to sign in, and the server token itself still lasts 24 hours.
- The assistant understands commands in English. Its speech recognition depends on the browser (none in Firefox) and on a network connection in most browsers. The wake phrase only works while the tab is open and visible.
- The 3D views need WebGL. Without it they show their text equivalents, with links to the Timeline and dependency map. On very large projects (hundreds of tasks) the model will be slower to turn; it only draws when something changes.

## References and credits

ProjectFlow is an original implementation. Ideas were adapted from four public repositories. Plane (AGPL-3.0) was used for ideas only, and no code was copied from it. One collision-detection algorithm was adapted from dnd-kit (MIT) with attribution. The Maven Wrapper scripts (Apache-2.0) come from the Apache Maven Wrapper project via spring-petclinic-rest.

- [docs/REFERENCES.md](docs/REFERENCES.md): what was inspected in each repository, which ideas were taken and how they were applied, plus licence and compatibility notes.
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md): adapted code and licence texts.
- Visual direction: a minimal fine-art catalogue look (pale stone canvas, square white panels, thin display type, tracked capitals, one bronze accent), taken from the design reference supplied during the project. No assets were copied.
