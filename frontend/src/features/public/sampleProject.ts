/**
 * A small, fictional sample project for the public pages (front page, sign-in, introduction).
 *
 * It is built relative to "now" so the replay always ends today, and it goes through exactly the
 * same code as a real project: the records below become Task / StatusChange / Dependency shapes,
 * the scheduler projects the open work, and `buildProjectModel` turns it into the 3D model.
 * Nothing here is sent to or read from the API.
 */
import type { Dependency, DependencyTask, Milestone, Priority, StatusChange, Task, TaskStatus, UserSummary } from '@/api/types';
import { todayIso } from '@/lib/dates';
import { schedule } from '@/lib/scheduler';
import { buildProjectModel, countsAt, DAY_MS, dayToIso, type ProjectModel } from '@/three/projectModel';

export const SAMPLE_PROJECT = { key: 'LIB', name: 'Library app', startOffset: -31, deadlineOffset: 16 } as const;

const PEOPLE: Record<'aarav' | 'priya' | 'rohan' | 'sneha', UserSummary> = {
  aarav: { id: 9001, name: 'Aarav Sharma', email: 'aarav@example.com', avatarColor: '#7d5f3d' },
  priya: { id: 9002, name: 'Priya Nair', email: 'priya@example.com', avatarColor: '#3a5f8f' },
  rohan: { id: 9003, name: 'Rohan Mehta', email: 'rohan@example.com', avatarColor: '#2f7a55' },
  sneha: { id: 9004, name: 'Sneha Iyer', email: 'sneha@example.com', avatarColor: '#93600e' },
};

interface SampleTask {
  n: number;
  title: string;
  who: keyof typeof PEOPLE;
  priority: Priority;
  /** Day offsets from today (negative = past). */
  created: number;
  moves: [day: number, to: TaskStatus][];
  due: number | null;
  /** Remaining estimate in working days, for open work. */
  estimate?: number;
  waitsOn?: number[];
}

/** Six weeks of a four-person team: approvals, one round of requested changes, a late task, and open work ahead. */
const TASKS: SampleTask[] = [
  { n: 1, title: 'Agree scope and acceptance criteria', who: 'aarav', priority: 'HIGH', created: -30, moves: [[-29, 'IN_PROGRESS'], [-26, 'IN_REVIEW'], [-25, 'DONE']], due: -24 },
  { n: 2, title: 'Design the data model', who: 'priya', priority: 'HIGH', created: -29, moves: [[-27, 'IN_PROGRESS'], [-22, 'IN_REVIEW'], [-21, 'DONE']], due: -20, waitsOn: [1] },
  { n: 3, title: 'Set up repository and CI', who: 'rohan', priority: 'MEDIUM', created: -29, moves: [[-28, 'IN_PROGRESS'], [-26, 'IN_REVIEW'], [-25, 'DONE']], due: -25 },
  {
    n: 4,
    title: 'Sign-in and roles',
    who: 'rohan',
    priority: 'URGENT',
    created: -26,
    moves: [[-24, 'IN_PROGRESS'], [-17, 'IN_REVIEW'], [-16, 'IN_PROGRESS'], [-13, 'IN_REVIEW'], [-12, 'DONE']],
    due: -14,
    waitsOn: [3],
  },
  { n: 5, title: 'Catalogue search API', who: 'priya', priority: 'HIGH', created: -22, moves: [[-20, 'IN_PROGRESS'], [-11, 'IN_REVIEW'], [-10, 'DONE']], due: -9, waitsOn: [2] },
  { n: 6, title: 'Admin dashboard', who: 'sneha', priority: 'HIGH', created: -19, moves: [[-18, 'IN_PROGRESS'], [-9, 'IN_REVIEW'], [-8, 'DONE']], due: -7, waitsOn: [4] },
  { n: 7, title: 'Borrowing rules', who: 'aarav', priority: 'HIGH', created: -18, moves: [[-12, 'IN_PROGRESS'], [-5, 'IN_REVIEW'], [-4, 'DONE']], due: -3, waitsOn: [2] },
  { n: 8, title: 'Search screen', who: 'sneha', priority: 'MEDIUM', created: -16, moves: [[-7, 'IN_PROGRESS'], [-2, 'IN_REVIEW']], due: -2, estimate: 1, waitsOn: [5] },
  { n: 9, title: 'Reminder emails', who: 'rohan', priority: 'LOW', created: -15, moves: [[-6, 'IN_PROGRESS']], due: 4, estimate: 4, waitsOn: [7] },
  { n: 10, title: 'Load test', who: 'priya', priority: 'MEDIUM', created: -9, moves: [[-4, 'IN_PROGRESS']], due: 3, estimate: 3, waitsOn: [5] },
  { n: 11, title: 'Usability test with five students', who: 'aarav', priority: 'HIGH', created: -7, moves: [[-2, 'IN_PROGRESS']], due: 5, estimate: 3, waitsOn: [8] },
  { n: 12, title: 'Accessibility pass', who: 'sneha', priority: 'MEDIUM', created: -10, moves: [], due: 8, estimate: 3, waitsOn: [8] },
  { n: 13, title: 'Deploy to staging', who: 'rohan', priority: 'URGENT', created: -8, moves: [], due: 7, estimate: 2, waitsOn: [9, 10] },
  { n: 14, title: 'Release notes', who: 'priya', priority: 'LOW', created: -6, moves: [], due: 13, estimate: 2, waitsOn: [12, 13] },
];

const MILESTONES = [
  { name: 'Scope agreed', due: -24, completed: true },
  { name: 'Beta', due: 6, completed: false },
  { name: 'Launch', due: 15, completed: false },
];

export interface SampleProjectData {
  now: Date;
  tasks: Task[];
  dependencies: Dependency[];
  milestones: Milestone[];
  history: StatusChange[];
  projectStart: string;
  deadline: string;
}

/** The sample project's records as of `now`. */
export function sampleProjectData(now: Date = new Date()): SampleProjectData {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  // Events happen during working hours on their day; the hour varies by task so nothing ties.
  const at = (day: number, n: number) => new Date(midnight + day * DAY_MS + (9.5 + ((n * 3) % 7)) * 3_600_000).toISOString();
  const date = (day: number) => dayToIso(midnight, day);
  const key = (n: number) => `${SAMPLE_PROJECT.key}-${n}`;

  const history: StatusChange[] = [];
  const tasks: Task[] = TASKS.map((s) => {
    const createdAt = at(s.created, s.n);
    let status: TaskStatus = 'TODO';
    history.push({ taskId: s.n, from: null, to: 'TODO', at: createdAt });
    for (const [day, to] of s.moves) {
      history.push({ taskId: s.n, from: status, to, at: at(day, s.n) });
      status = to;
    }
    const firstStart = s.moves.find(([, to]) => to === 'IN_PROGRESS');
    const done = s.moves.find(([, to]) => to === 'DONE');
    const last = s.moves[s.moves.length - 1];
    const person = PEOPLE[s.who];
    return {
      id: s.n,
      projectId: 0,
      projectKey: SAMPLE_PROJECT.key,
      projectName: SAMPLE_PROJECT.name,
      projectColor: '#7d5f3d',
      key: key(s.n),
      title: s.title,
      description: null,
      status,
      priority: s.priority,
      assignee: person,
      reporter: PEOPLE.aarav,
      dueDate: s.due === null ? null : date(s.due),
      milestoneId: null,
      milestoneName: null,
      position: s.n,
      commentCount: 0,
      submissionCount: s.moves.filter(([, to]) => to === 'IN_REVIEW').length,
      overdue: status !== 'DONE' && s.due !== null && s.due < 0,
      createdAt,
      updatedAt: last ? at(last[0], s.n) : createdAt,
      startedAt: firstStart ? at(firstStart[0], s.n) : null,
      completedAt: done ? at(done[0], s.n) : null,
      acceptanceCriteria: [],
      checklist: [],
      version: 1,
      estimateDays: s.estimate ?? null,
    };
  });

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const summary = (t: Task): DependencyTask => ({
    id: t.id,
    key: t.key,
    title: t.title,
    status: t.status,
    dueDate: t.dueDate,
    assignee: t.assignee,
    overdue: t.overdue,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
    milestoneId: t.milestoneId,
  });
  let depId = 0;
  const dependencies: Dependency[] = TASKS.flatMap((s) =>
    (s.waitsOn ?? []).map((blocker) => ({
      id: ++depId,
      projectId: 0,
      blocker: summary(byId.get(blocker)!),
      blocked: summary(byId.get(s.n)!),
      createdBy: PEOPLE.aarav,
      createdAt: at(s.created, s.n),
    })),
  );

  const milestones: Milestone[] = MILESTONES.map((m, i) => ({
    id: i + 1,
    projectId: 0,
    name: m.name,
    description: null,
    dueDate: date(m.due),
    completed: m.completed,
    completedAt: m.completed ? at(m.due, 1) : null,
    taskCount: 0,
    doneCount: 0,
    progress: m.completed ? 100 : 0,
    createdAt: at(SAMPLE_PROJECT.startOffset, 0),
  }));

  return { now, tasks, dependencies, milestones, history, projectStart: date(SAMPLE_PROJECT.startOffset), deadline: date(SAMPLE_PROJECT.deadlineOffset) };
}

/** The sample project as a 3D model, including the scheduler's estimate for the open work. */
export function buildSampleModel(now: Date = new Date()): ProjectModel {
  return modelFromData(sampleProjectData(now));
}

/** Records → scheduler projection → model, exactly as a project's Model page does it. */
export function modelFromData(data: SampleProjectData): ProjectModel {
  const now = data.now;
  const projection = schedule({
    today: todayIso(now),
    tasks: data.tasks.map((t) => ({
      id: t.id,
      key: t.key,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assigneeId: t.assignee?.id ?? null,
      dueDate: t.dueDate,
      estimateDays: t.estimateDays,
      startedOn: t.startedAt ? todayIso(new Date(t.startedAt)) : null,
      milestoneId: t.milestoneId,
    })),
    dependencies: data.dependencies.map((d) => ({ blockerId: d.blocker.id, blockedId: d.blocked.id })),
  });
  return buildProjectModel({
    now,
    projectStart: data.projectStart,
    deadline: data.deadline,
    tasks: data.tasks,
    dependencies: data.dependencies,
    milestones: data.milestones,
    history: data.history,
    projection,
  });
}

/** How many people and weeks the sample spans, for captions. */
export const SAMPLE_FACTS = {
  tasks: TASKS.length,
  people: Object.keys(PEOPLE).length,
  weeks: Math.round((SAMPLE_PROJECT.deadlineOffset - SAMPLE_PROJECT.startOffset) / 7),
};

/** One sentence for screen readers (the canvas itself is decorative for them). */
export function sampleSummary(model: ProjectModel): string {
  const c = countsAt(model, model.todayDay);
  return (
    `A sample project, ${SAMPLE_PROJECT.name}: ${SAMPLE_FACTS.tasks} tasks shared by ${SAMPLE_FACTS.people} people over about ${SAMPLE_FACTS.weeks} weeks. ` +
    `Today ${c.DONE} are approved, ${c.IN_REVIEW} ${c.IN_REVIEW === 1 ? 'is' : 'are'} in review, ${c.IN_PROGRESS} in progress and ${c.TODO} not started.`
  );
}
