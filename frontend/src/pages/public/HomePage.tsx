import { ArrowRight } from 'lucide-react';
import { lazy, Suspense, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useAppSelector } from '@/app/store';
import { PublicPage } from '@/components/layout/PublicFrame';
import { DeferredMount } from '@/components/DeferredMount';
import { buttonClass } from '@/components/ui/buttonStyles';
import { PLACES, ROLES } from '@/features/public/content';
import { PermissionTable, SectionHead } from '@/features/public/PublicParts';
import { cn } from '@/lib/cn';
import { usePageMeta } from '@/lib/pageMeta';

// Both pull in three.js, so they load after the page's text is already on screen.
const SampleModelExhibit = lazy(() => import('@/features/public/SampleModelExhibit'));
const FlowSculptureCanvas = lazy(() => import('@/features/model/FlowSculptureCanvas'));

const WRAP = 'mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-10';

/**
 * The front page. It reads like an exhibition catalogue: a live 3D preview of a sample project,
 * three ideas, how work moves, who may do what, and what's inside. The graph, analysis and AI
 * assistant are inside the app, on each project's Overview and Model pages.
 */
export function HomePage() {
  usePageMeta({ title: 'ProjectFlow', path: '/' });
  const signedIn = useAppSelector((s) => s.auth.token !== null);

  return (
    <PublicPage>
      {/* Hero: the promise on the left, a live 3D preview of a sample project on the right. The
          history-and-forecast graph, analysis and assistant live inside the app (each project's Model). */}
      <section className="border-b border-line">
        <div className={cn(WRAP, 'grid gap-10 pt-12 pb-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:pt-16 lg:pb-16')}>
          <div className="flex flex-col">
            <p className="eyebrow">Project and task management</p>
            <h1 className="mt-6 font-display text-[44px] leading-[1.02] font-extralight tracking-[-0.045em] text-ink sm:text-[60px] xl:text-[72px]">
              Work you can walk around.
              <br />
              <span className="text-accent-display">Done when it’s proven.</span>
            </h1>
            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-ink-2">
              ProjectFlow turns a team’s project into a model built from its own records: who did what and when, and what’s estimated to come. Nothing counts as
              done until a reviewer has checked the evidence against criteria agreed before the work began.
            </p>
            {/* One call to action. Everything else on the page is a quiet text link. */}
            <div className="mt-8">
              <MainAction signedIn={signedIn} />
            </div>

            <dl className="mt-12 grid max-w-lg grid-cols-2 gap-6 border-t border-line pt-6 sm:grid-cols-4 lg:mt-auto lg:grid-cols-2 xl:grid-cols-4">
              <Fact value="4" label="Roles, checked on every request" />
              <Fact value="4" label="Stages, one way to Done" />
              <Fact value="3D" label="Every project, replayable day by day" />
              <Fact value="AI" label="Optional, and it never acts on its own" />
            </dl>
          </div>

          <div className="h-[440px] sm:h-[540px] lg:h-auto lg:min-h-[600px]">
            <DeferredMount className="h-full border border-line bg-surface" fallback={<ExhibitPlaceholder />}>
              <Suspense fallback={<div className="h-full border border-line bg-surface" />}>
                <SampleModelExhibit className="h-full" chart={false} label="Sample project · replaying its six weeks" />
              </Suspense>
            </DeferredMount>
          </div>
        </div>
      </section>

      {/* Three ideas ------------------------------------------------------------------------ */}
      <section id="ideas" className="scroll-mt-16 border-b border-line">
        <div className={cn(WRAP, 'py-16 lg:py-24')}>
          <SectionHead index="01" eyebrow="Three ideas" title="What makes it different" />
          <div className="mt-10 grid border border-line bg-surface lg:grid-cols-3">
            <Idea
              numeral="I"
              title="A project is a place, not a list."
              art={<ModelArt />}
              where="Model · in every project"
            >
              Time runs left to right, each person has a lane, and a block’s height is its priority. Threads show what waits on what. Drag back to any day and the
              model rebuilds it from recorded status changes; past today, the scheduler’s estimate takes over.
            </Idea>
            <Idea numeral="II" title="Done means proven." art={<ProofArt />} where="Review workspace">
              Every task carries acceptance criteria and a checklist. The assignee submits evidence; a manager checks each criterion. A card can’t be dragged to
              Done, and the server refuses a direct request too.
            </Idea>
            <Idea numeral="III" title="Every alert says why." art={<ReasonArt />} where="Today">
              Today lists what needs a decision: reviews waiting, overdue work blocking others, people with too much on. Each item names the rule that raised it
              and the records behind it. There are no opaque scores.
            </Idea>
          </div>
        </div>
      </section>

      {/* Workflow --------------------------------------------------------------------------- */}
      <section id="workflow" className="scroll-mt-16 border-b border-line">
        <div className={cn(WRAP, 'grid gap-12 py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:py-24')}>
          <div>
            <SectionHead index="02" eyebrow="How work moves" title="Four stages. One way to Done." />
            <p className="mt-6 max-w-md text-[14px] leading-relaxed text-ink-2">
              Work is planned with its criteria, made, proven with evidence and approved by someone else. The rules below are enforced by the server, not just
              hidden in the interface.
            </p>
            <ul className="mt-8 max-w-md divide-y divide-line border-y border-line">
              {[
                'Only the assignee can submit work for review.',
                'Submitting needs a finished checklist and at least one piece of evidence.',
                'Reviewers judge every criterion, and never their own work.',
                'Requested changes send the task back; every version is kept.',
              ].map((rule, i) => (
                <li key={rule} className="flex gap-4 py-3 text-[13.5px] text-ink">
                  <span className="w-5 shrink-0 font-mono text-[11px] text-muted tabular">{String(i + 1).padStart(2, '0')}</span>
                  {rule}
                </li>
              ))}
            </ul>
            <Link to="/introduction#life-of-a-task" className="caps mt-6 inline-flex items-center gap-2 text-accent hover:text-ink">
              The life of a task, step by step <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="border border-line bg-surface p-6 sm:p-8">
            <p className="caps text-muted">Exhibit · Plan, make, prove, approve</p>
            <DeferredMount className="mt-6 h-[min(40vh,380px)]">
              <Suspense fallback={<div className="mt-6 h-[min(40vh,380px)]" />}>
                <FlowSculptureCanvas className="mt-6" />
              </Suspense>
            </DeferredMount>
          </div>
        </div>
      </section>

      {/* Roles ------------------------------------------------------------------------------ */}
      <section id="roles" className="scroll-mt-16 border-b border-line">
        <div className={cn(WRAP, 'py-16 lg:py-24')}>
          <SectionHead index="03" eyebrow="Roles" title="Four roles, checked on every request." />
          <div className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((r) => (
              <div key={r.role} className="bg-surface p-6">
                <p className="font-display text-[26px] font-light tracking-[-0.02em] text-ink">{r.label}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{r.summary}</p>
              </div>
            ))}
          </div>
          <PermissionTable className="mt-8" />
        </div>
      </section>

      {/* Inside ----------------------------------------------------------------------------- */}
      <section id="inside" className="scroll-mt-16 border-b border-line">
        <div className={cn(WRAP, 'py-16 lg:py-24')}>
          <SectionHead index="04" eyebrow="Inside" title="Everything a project needs, in one place." />
          <ol className="mt-10 grid gap-x-12 border-t border-line md:grid-cols-2">
            {PLACES.map((p, i) => (
              <li key={p.name} className="flex gap-5 border-b border-line py-5">
                <span className="w-6 shrink-0 pt-1 font-mono text-[11px] text-muted tabular">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <span className="block font-display text-[19px] font-light tracking-[-0.01em] text-ink">{p.name}</span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-muted">{p.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing ---------------------------------------------------------------------------- */}
      <section>
        <div className={cn(WRAP, 'py-16 lg:py-24')}>
          <div className="grid items-end gap-8 border border-line bg-surface p-8 sm:p-12 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <p className="eyebrow">Begin</p>
              <p className="mt-5 font-display text-[36px] leading-[1.05] font-extralight tracking-[-0.04em] text-ink sm:text-[48px]">
                Start with one project.
                <br />
                <span className="text-accent-display">Watch it take shape.</span>
              </p>
            </div>
            <MainAction signedIn={signedIn} />
          </div>
        </div>
      </section>
    </PublicPage>
  );
}

/** Shown until the 3D preview loads: says what's coming, so the space isn't a blank box. */
function ExhibitPlaceholder() {
  return (
    <div className="flex h-full flex-col justify-end p-5">
      <p className="caps text-muted">Sample project · 3D model</p>
      <p className="mt-1 text-[12.5px] text-muted">Loading the preview…</p>
    </div>
  );
}

/** The page's single call to action: create an account (or, when signed in, open the app). */
function MainAction({ signedIn }: { signedIn: boolean }) {
  if (signedIn) {
    return (
      <Link to="/dashboard" className={buttonClass('primary', 'lg')}>
        Open ProjectFlow <ArrowRight />
      </Link>
    );
  }
  return (
    <div>
      <Link to="/register" className={buttonClass('primary', 'lg')}>
        Create your free account <ArrowRight />
      </Link>
      <p className="mt-3 text-[13px] text-muted">
        Already have one?{' '}
        <Link to="/login" className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="numeral block text-[40px] leading-none text-ink" aria-hidden="true">
          {value}
        </span>
        <span className="mt-2 block text-[12px] leading-snug text-muted">
          <span className="sr-only">{value} </span>
          {label}
        </span>
      </dd>
    </div>
  );
}

function Idea({ numeral, title, art, where, children }: { numeral: string; title: string; art: ReactNode; where: string; children: ReactNode }) {
  return (
    <article className="flex flex-col border-line p-6 not-last:border-b sm:p-8 lg:not-last:border-r lg:not-last:border-b-0">
      <p className="numeral text-[56px] leading-none text-accent-display" aria-hidden="true">
        {numeral}
      </p>
      <h3 className="mt-6 font-display text-[22px] leading-snug font-light tracking-[-0.02em] text-ink">{title}</h3>
      <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">{children}</p>
      <div className="mt-8 border border-line bg-canvas p-4" aria-hidden="true">
        {art}
      </div>
      <p className="caps mt-5 text-muted">
        <span className="sr-only">Where: </span>
        {where}
      </p>
    </article>
  );
}

// Small diagrams for the three ideas ----------------------------------------------------------

function ModelArt() {
  return (
    <svg viewBox="0 0 240 104" className="h-auto w-full" role="presentation">
      {[26, 58, 90].map((y) => (
        <line key={y} x1="0" x2="240" y1={y} y2={y} stroke="var(--line-strong)" strokeWidth="1" />
      ))}
      <rect x="8" y="12" width="62" height="14" fill="var(--model-done)" />
      <rect x="78" y="6" width="54" height="20" fill="var(--model-done)" />
      <rect x="20" y="40" width="86" height="18" fill="var(--model-done)" />
      <rect x="112" y="46" width="40" height="12" fill="var(--model-review)" />
      <rect x="60" y="70" width="70" height="20" fill="var(--model-progress)" />
      <rect x="170" y="80" width="46" height="10" fill="none" stroke="var(--ink-2)" strokeDasharray="3 2" />
      <rect x="160" y="86" width="60" height="4" fill="var(--model-todo)" />
      <line x1="152" x2="152" y1="0" y2="104" stroke="var(--accent)" strokeWidth="1.2" />
      <path d="M106 49 C 120 30, 130 30, 134 16" fill="none" stroke="var(--ink-2)" strokeWidth="0.8" />
    </svg>
  );
}

function ProofArt() {
  const rows = [
    { y: 14, w: 120, met: true },
    { y: 40, w: 150, met: true },
    { y: 66, w: 96, met: true },
  ];
  return (
    <svg viewBox="0 0 240 104" className="h-auto w-full" role="presentation">
      {rows.map((r) => (
        <g key={r.y}>
          <rect x="6" y={r.y} width="14" height="14" fill={r.met ? 'var(--model-done)' : 'none'} stroke="var(--model-done)" />
          <path d={`M9 ${r.y + 7} l3 3 l6 -6`} fill="none" stroke="var(--surface)" strokeWidth="1.6" />
          <rect x="30" y={r.y + 4} width={r.w} height="6" fill="var(--line-strong)" />
        </g>
      ))}
      <rect x="150" y="80" width="84" height="20" fill="none" stroke="var(--model-done)" strokeWidth="1.2" />
      <text x="192" y="94" textAnchor="middle" fontSize="9" letterSpacing="2" fontWeight="600" fill="var(--model-done)">
        APPROVED
      </text>
    </svg>
  );
}

function ReasonArt() {
  const rows = [
    { y: 8, tag: 'var(--model-review)', w: 120 },
    { y: 42, tag: 'var(--danger)', w: 140 },
    { y: 76, tag: 'var(--model-progress)', w: 104 },
  ];
  return (
    <svg viewBox="0 0 240 104" className="h-auto w-full" role="presentation">
      {rows.map((r) => (
        <g key={r.y}>
          <rect x="6" y={r.y} width="4" height="20" fill={r.tag} />
          <rect x="18" y={r.y + 2} width={r.w} height="6" fill="var(--ink-2)" />
          <rect x="18" y={r.y + 13} width={r.w * 0.7} height="4" fill="var(--line-strong)" />
          <rect x="190" y={r.y + 3} width="44" height="12" fill="none" stroke="var(--line-strong)" />
          <text x="212" y={r.y + 12} textAnchor="middle" fontSize="7" letterSpacing="1.2" fill="var(--muted)">
            RULE
          </text>
        </g>
      ))}
    </svg>
  );
}
