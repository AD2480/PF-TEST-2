/**
 * Words for the public pages (front page, introduction). The permission table is computed from
 * the same rules the app and the mock API enforce (`lib/permissions`), so it can't drift from
 * what the product actually allows.
 */
import type { Role, TaskStatus } from '@/api/types';
import { can, type TaskLike } from '@/lib/permissions';

export const ROLES: { role: Role; label: string; summary: string }[] = [
  { role: 'OWNER', label: 'Owner', summary: 'Created the project. Can do everything, including appointing managers and deleting the project.' },
  { role: 'MANAGER', label: 'Manager', summary: 'Runs the work: edits and assigns any task, invites members and viewers, and reviews submitted work.' },
  { role: 'MEMBER', label: 'Member', summary: 'Does the work: creates tasks, works on what’s assigned to them and submits evidence for review.' },
  { role: 'VIEWER', label: 'Viewer', summary: 'Follows along: sees everything in the project and changes nothing.' },
];

/** `true` = allowed, `false` = not allowed, a string = allowed with that condition. */
export type PermissionCell = boolean | string;

const ME = 1;
const SOMEONE_ELSE = 2;
const task = (assigneeId: number | null, reporterId: number, status: TaskStatus = 'TODO'): TaskLike => ({ assigneeId, reporterId, status });

export const PERMISSIONS: { label: string; cell: (role: Role) => PermissionCell }[] = [
  { label: 'See the project, tasks and activity', cell: () => true },
  { label: 'Comment', cell: (r) => can.comment(r) },
  { label: 'Create tasks', cell: (r) => can.createTask(r) },
  {
    label: 'Edit tasks',
    cell: (r) => (can.editTask(r, task(SOMEONE_ELSE, SOMEONE_ELSE), ME) ? true : can.editTask(r, task(ME, SOMEONE_ELSE), ME) ? 'Their own' : false),
  },
  {
    label: 'Assign people',
    cell: (r) => (can.assignTask(r, task(null, SOMEONE_ELSE), ME, SOMEONE_ELSE) ? true : can.assignTask(r, task(null, SOMEONE_ELSE), ME, ME) ? 'Themselves' : false),
  },
  {
    label: 'Start or pause work',
    cell: (r) =>
      can.changeStatus(r, task(SOMEONE_ELSE, SOMEONE_ELSE), ME, 'IN_PROGRESS') ? true : can.changeStatus(r, task(ME, SOMEONE_ELSE), ME, 'IN_PROGRESS') ? 'As assignee' : false,
  },
  { label: 'Submit work for review', cell: (r) => (can.submitWork(r, task(ME, SOMEONE_ELSE, 'IN_PROGRESS'), ME) ? 'As assignee' : false) },
  { label: 'Approve or request changes', cell: (r) => (can.reviewSubmission(r, SOMEONE_ELSE, ME) ? (can.reviewSubmission(r, ME, ME) ? true : 'Not their own') : false) },
  { label: 'Reopen approved work', cell: (r) => can.changeStatus(r, task(SOMEONE_ELSE, SOMEONE_ELSE, 'DONE'), ME, 'IN_PROGRESS') },
  { label: 'Invite members and viewers', cell: (r) => can.assignableRoles(r).includes('MEMBER') },
  { label: 'Appoint managers', cell: (r) => can.assignableRoles(r).includes('MANAGER') },
  { label: 'Edit project details and milestones', cell: (r) => can.editProject(r) && can.manageMilestones(r) },
  { label: 'Delete the project', cell: (r) => can.deleteProject(r) },
];

export interface StageStory {
  status: TaskStatus;
  label: string;
  /** Its material in the 3D model. */
  material: string;
  cssVar: string;
  who: string;
  needs: string;
  next: string;
}

export const TASK_STAGES: StageStory[] = [
  {
    status: 'TODO',
    label: 'To do',
    material: 'Stone plate',
    cssVar: '--model-todo',
    who: 'Anyone except a viewer can create a task. Managers assign it to someone; a member can take an unassigned task themselves.',
    needs: 'A title and the acceptance criteria a reviewer will check, one per line. Optionally a checklist, an estimate in working days, a due date and a milestone.',
    next: 'The assignee (or a manager) starts the work, which moves it to In progress.',
  },
  {
    status: 'IN_PROGRESS',
    label: 'In progress',
    material: 'Graphite',
    cssVar: '--model-progress',
    who: 'The assignee does the work and ticks off the checklist. A manager can move it back to To do.',
    needs: 'Every checklist item ticked, notes for the reviewer, and at least one piece of evidence: a repository, a deployment or another link, a screenshot or a file.',
    next: 'Only the assignee can submit, and submitting is the only way into In review.',
  },
  {
    status: 'IN_REVIEW',
    label: 'In review',
    material: 'Amber',
    cssVar: '--model-review',
    who: 'A manager or the owner reviews it in the review workspace, but never their own submission.',
    needs: 'A verdict on every acceptance criterion: met or not met. Requesting changes also needs written feedback.',
    next: 'If every criterion is met, the reviewer approves and the task is Done. Requesting changes sends it back to In progress, and the next submission becomes version 2.',
  },
  {
    status: 'DONE',
    label: 'Done',
    material: 'Bronze',
    cssVar: '--model-done',
    who: 'Nobody can drag a card here, and the server refuses a direct request too. An approved review is the only way in.',
    needs: 'Nothing more. Every submission, version and review decision stays on the task.',
    next: 'A manager can reopen it if something turns out to be wrong. The history is kept.',
  },
];

/** The model's visual grammar, as a legend. */
export const MODEL_GRAMMAR: [term: string, meaning: string][] = [
  ['Left to right', 'Time. A block starts when the work started and ends when it was approved, or at today while it’s still open.'],
  ['Rows', 'People. Each assignee has a lane; unassigned work has its own lane.'],
  ['Height', 'Priority, from low to urgent. Work that hasn’t started is a flat plate.'],
  ['Material', 'Status: stone for not started, graphite for in progress, amber for in review, bronze for approved.'],
  ['Threads', 'Dependencies. A thread runs from a task to the task that waits on it.'],
  ['Glass plane', 'Today. Behind it is what was recorded; beyond it is an estimate.'],
  ['Outlines', 'The scheduler’s estimate for open work, always labelled as an estimate.'],
  ['Red strip', 'Overdue: from the due date until the work is approved.'],
  ['Obelisks', 'Milestones. The deadline is marked at the far end.'],
];

/** "Inside the app": every place, in the order of the masthead and project chapters. */
export const PLACES: { name: string; text: string }[] = [
  { name: 'Today', text: 'What needs a decision, each item with the rule that raised it, beside a 3D skyline of your projects.' },
  { name: 'My work', text: 'Everything assigned to you across projects, filtered by status, priority and due date.' },
  { name: 'Board and list', text: 'Drag work between To do and In progress. Done is reached only through review.' },
  { name: 'Model', text: 'The project in 3D, replayable day by day from its recorded status changes.' },
  { name: 'Timeline', text: 'Recorded work against today and the deadline.' },
  { name: 'Dependencies', text: 'What waits on what, as a graph and as an accessible list. Loops are refused.' },
  { name: 'What if', text: 'Try reassignments, time off and new estimates before changing anything, then apply them in one step.' },
  { name: 'Milestones and calendar', text: 'Milestones inside each project, and one calendar of due dates across all of them.' },
  { name: 'Reports', text: 'Flow, review turnaround, rework and time in status, computed from recorded events.' },
  { name: 'Search', text: '⌘K or Ctrl K finds any task or project you can open, and nothing you can’t.' },
  { name: 'Live updates', text: 'Changes appear for everyone on the project without refreshing.' },
  { name: 'Assistant, with voice', text: 'A button on every page: forecasts, risks and what to do next straight from the records, and task commands you confirm. Type or speak, or say “Hey ProjectFlow”.' },
  { name: 'AI answers (optional)', text: 'Free questions, review notes and status drafts, when a provider is set up on the server. It suggests; it never approves, assigns or changes dates by itself.' },
];

export const FIRST_STEPS: { title: string; text: string }[] = [
  { title: 'Create a project', text: 'Give it a name, a short key such as LIB, and its dates. You become its owner.' },
  { title: 'Invite your team', text: 'In the People chapter, invite managers, members and viewers by email. They accept from their inbox.' },
  { title: 'Write tasks with criteria', text: 'For each task, write what a reviewer will check, one criterion per line, and add an estimate.' },
  { title: 'Link what waits on what', text: 'On a task, add “waits on” for the work it depends on. A loop is refused and the message names it.' },
  { title: 'Do the work and submit', text: 'Start the task, tick the checklist, then submit with links or files as evidence.' },
  { title: 'Review it', text: 'Mark each criterion as met or not met. Approve, or request changes with feedback.' },
  { title: 'Watch it happen', text: 'Open the project’s Model chapter and press Play to replay the project.' },
];
