# ProjectFlow — Frontend

React + TypeScript single-page app for ProjectFlow, a collaborative project and task management platform.

It runs **on its own** with a built-in mock API (demo data kept in your browser), or against the Spring Boot backend when that is running. Both use the same REST contract, so switching needs only one environment variable.

## Tech stack

| Concern | Library |
| --- | --- |
| Build / dev server | Vite 7 |
| UI | React 19, TypeScript (strict), Tailwind CSS 4 |
| Routing | React Router 7 |
| State and data fetching | Redux Toolkit 2 + RTK Query |
| Forms and validation | React Hook Form + Zod |
| Kanban drag and drop | dnd-kit |
| Charts | Recharts |
| Accessible primitives | Radix UI (dialog, dropdown menu, tooltip) |
| Icons, toasts, dates | lucide-react, sonner, date-fns |
| Tests | Vitest |

## Run it (macOS + VS Code)

**Prerequisite:** Node.js **20.19 or newer** (22 LTS recommended). Check with `node -v`. If you need to install it: `brew install node@22`, or download it from nodejs.org.

1. Open the `projectflow` folder in VS Code.
2. Open a terminal with **Terminal → New Terminal** (<kbd>⌃</kbd> + <kbd>`</kbd>). This is your **frontend terminal**.
3. Run:

```bash
cd frontend
npm install
npm run dev
```

4. Open **http://localhost:5174** in your browser.
5. Click one of the demo accounts on the sign-in page. All demo accounts use the password **`Password@123`**.

| Account | Role it demonstrates |
| --- | --- |
| aarav@projectflow.dev | Owner of *Campus Connect Portal*; has a pending invitation |
| priya@projectflow.dev | Manager; reviews submitted work |
| rohan@projectflow.dev | Member; works on assigned tasks and submits them |
| vikram@projectflow.dev | Viewer; read-only access |

Stop the server with <kbd>⌃</kbd> + <kbd>C</kbd>.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:5174 using the **mock API** |
| `npm run dev:api` | Dev server using the **real backend**: `/api` is proxied to http://localhost:8080 (loads `.env.backend`) |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build on http://localhost:4174 |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | ESLint |
| `npm test` | Unit and API-contract tests (Vitest) |

## Configuration

Copy `.env.example` to `.env.local` to override the defaults:

```dotenv
VITE_USE_MOCK_API=true                      # false = use the Spring Boot backend
VITE_API_BASE_URL=http://localhost:8080/api # backend base URL
```

In mock mode, data lives in your browser's `localStorage`. You can restore the original demo data from **Settings → Data → Reset data**.

## What's included

- **Authentication:** register, sign in, sign out, protected routes, token validation on load, and automatic sign-out on 401 with a "session expired" message.
- **Projects:** create, edit, archive and delete projects (key, colour, dates, status); search, filter and paginate.
- **Team:** invite by email with a role, accept or decline invitations, change roles, remove members, revoke invitations, and a permission matrix.
- **Tasks:** a list view with server-side filtering, sorting and pagination, plus a Kanban board. Tasks have priorities, due dates, assignees and milestones. The board supports:
  - drag and drop with mouse, touch and keyboard
  - live drop feedback that explains the workflow rules while dragging
  - inline quick-add in each column
  - avatar, "Only my tasks" and "Recently updated" filters
  - a task side panel on a shareable URL (`/projects/:id/board/tasks/:taskId`)
  - fractional ordering, so a move rewrites only the moved task
- **Workflow:** To Do → In Progress → In Review → Done.
  - A task reaches *In Review* only when its assignee submits work (notes, links and file attachments).
  - It reaches *Done* only when a manager or owner approves the submission. Reviewers can't approve their own work.
  - "Request changes" sends a task back to In Progress with feedback.
  - Every submission and review is kept as history.
- **Collaboration:** comments (edit and delete), per-task and per-project activity history, notifications, and an inbox with category filters and inline invitation responses.
- **Planning:** milestones with progress and a timeline, plus a month calendar of task due dates, milestones and project deadlines.
- **Analytics:** progress vs expected, a health indicator with documented rules, status and priority distribution, workload by member, weekly completion trend, overdue and upcoming work, cycle time and approval rate. Each chart has a table view.
- **Quality:**
  - Responsive from 360 px phones to wide desktops, with light, dark and system themes.
  - Loading skeletons, empty states, error states with retry, and field-level validation that mirrors the server.
  - Accessibility: keyboard support, focus states, ARIA labels and a skip link, and it respects reduced motion.

### Permission rules

The rules live in `src/lib/permissions.ts`. The UI uses them to show or hide actions, and the mock API enforces them, as the backend will too.

| Action | Owner | Manager | Member | Viewer |
| --- | :-: | :-: | :-: | :-: |
| View project, tasks, activity | ✓ | ✓ | ✓ | ✓ |
| Create tasks, comment | ✓ | ✓ | ✓ | |
| Edit / move own tasks, submit assigned work | ✓ | ✓ | ✓ | |
| Edit and assign any task, delete tasks | ✓ | ✓ | own To Do tasks only (delete) | |
| Review submissions (never your own) | ✓ | ✓ | | |
| Manage milestones, invite Members/Viewers | ✓ | ✓ | | |
| Manage Managers, delete project | ✓ | | | |

### Project health rules

The rules live in `src/lib/health.ts` and are also shown in the app under **Analytics → Health rules**.

- **Progress** = tasks in Done ÷ all tasks.
- **Expected progress** = days elapsed since the start date ÷ days between the start date and the deadline.

The rules are checked from top to bottom. The first match wins:

1. **Completed:** the project status is Completed, or every task is Done.
2. **Not started:** the project has no tasks.
3. **Off track:** the deadline has passed with open tasks, *or* at least 25% of open tasks are overdue, *or* progress is more than 25 points behind expected.
4. **At risk:** any task is overdue, *or* progress is more than 10 points behind expected, *or* the deadline is within 7 days and progress is below 80%.
5. **On track:** none of the above.

## Folder structure

```
frontend/
├── index.html                 # HTML shell (applies saved theme before first paint)
├── vite.config.ts             # Vite + Tailwind plugin, @ alias, Vitest config
├── .env.example               # Environment variables (no secrets)
└── src/
    ├── main.tsx               # Providers: Redux, Router, Tooltip, Toaster, ErrorBoundary
    ├── App.tsx                # Route table
    ├── index.css              # Tailwind + design tokens (light/dark)
    ├── config.ts              # Env-driven configuration
    ├── api/
    │   ├── types.ts           # The REST contract (DTOs, envelopes, enums)
    │   ├── baseApi.ts         # RTK Query API, mock/HTTP switch, 401 handling
    │   ├── endpoints.ts       # Every endpoint + cache tags + optimistic board moves
    │   └── errors.ts          # Friendly error messages, field errors
    ├── app/                   # Store, UI slice (theme, sidebar), theme controller
    ├── components/
    │   ├── ui/                # Design system: Button, Form, Dialog, Menu, Badge, …
    │   ├── layout/            # AppShell, Sidebar, Topbar, Logo
    │   └── domain.tsx         # Status/priority/health/role badges, due dates
    ├── features/
    │   ├── auth/              # Auth slice, route guards
    │   ├── projects/          # Project form, cards, invitations, milestones, context
    │   ├── tasks/             # Kanban, table, filters, task form, submit/review, comments
    │   ├── analytics/         # Charts, health card, analytics view
    │   └── activity/          # Activity timeline
    ├── pages/                 # Route components (project/* are the project tabs)
    ├── lib/                   # permissions, health, dates, forms, hooks, formatting
    └── mock/                  # In-browser mock API: schema, seed, server, views
```

## Talking to the real backend

Run `npm run dev:api` (or set `VITE_USE_MOCK_API=false`). The frontend expects:

- Base URL `/api`, proxied by the Vite dev server to `http://localhost:8080` (CORS also allows `http://localhost:5174` for direct calls).
- `Authorization: Bearer <jwt>` on every request except `POST /auth/login` and `POST /auth/register`.
- Success responses shaped as `{ success: true, message, data, timestamp }`.
- Error responses shaped as `{ success: false, status, code, error, message, fieldErrors, path, timestamp }`.
- Page responses shaped as `{ content, page, size, totalElements, totalPages }` (zero-based `page`).
- Submissions posted as `multipart/form-data`: a JSON part named `data` (`{ notes, evidence: [{ kind, label, url }] }`) plus zero or more `files` parts. Evidence files are downloaded from `GET /api/files/{id}` with the bearer token (members only).
- Updates carry the `version` the client last saw; a stale version returns `409 EDIT_CONFLICT`.
- Board moves sent as `PATCH /tasks/{id}/move` with `{ status, previousTaskId, nextTaskId }`. The server stores a fractional `position` (see `src/lib/ordering.ts`).
- A machine-readable `code` in every error, e.g. `WORKFLOW_VIOLATION` for an illegal status change, `EDIT_CONFLICT` for a concurrent edit.

References and credits are listed in [`../docs/REFERENCES.md`](../docs/REFERENCES.md) and [`../THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

The complete list of endpoints and payloads is in `src/api/endpoints.ts` and `src/api/types.ts`. The mock implementation in `src/mock/server.ts` is the executable reference for their behaviour.
