import type { Role } from '@/api/types';
import { cn } from '@/lib/cn';
import { PERMISSIONS, ROLES, type PermissionCell } from './content';

/** Numbered section heading for the public pages: "01 — Eyebrow", then a thin display title. */
export function SectionHead({ index, eyebrow, title, id }: { index: string; eyebrow: string; title: string; id?: string }) {
  return (
    <div>
      <p className="eyebrow flex items-center gap-3">
        <span className="font-mono tracking-normal text-subtle">{index}</span>
        <span className="h-px w-8 bg-line-strong" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2 id={id} className="mt-4 max-w-2xl font-display text-[32px] leading-[1.08] font-extralight tracking-[-0.035em] text-ink sm:text-[42px]">
        {title}
      </h2>
    </div>
  );
}

/** What each role may do, computed from the permission rules (see content.ts). */
export function PermissionTable({ className }: { className?: string }) {
  const roles: Role[] = ['OWNER', 'MANAGER', 'MEMBER', 'VIEWER'];
  const label = (r: Role) => ROLES.find((x) => x.role === r)!.label;
  return (
    <div className={cn('relative overflow-x-auto border border-line bg-surface', className)}>
      <table className="w-full min-w-[620px] text-left text-[13px]">
        <caption className="sr-only">What each role can do in a project</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="caps px-5 py-3 font-semibold text-muted">
              In a project, who can…
            </th>
            {roles.map((r) => (
              <th key={r} scope="col" className="caps w-[16%] px-3 py-3 text-center font-semibold text-ink">
                {label(r)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {PERMISSIONS.map((p) => (
            <tr key={p.label}>
              <th scope="row" className="px-5 py-2.5 font-normal text-ink-2">
                {p.label}
              </th>
              {roles.map((r) => (
                <td key={r} className="px-3 py-2.5 text-center">
                  <Cell value={p.cell(r)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({ value }: { value: PermissionCell }) {
  if (value === true)
    return (
      <>
        <span className="inline-block size-2 bg-ink" aria-hidden="true" />
        <span className="sr-only">Yes</span>
      </>
    );
  if (value === false)
    return (
      <>
        <span className="text-subtle" aria-hidden="true">
          —
        </span>
        <span className="sr-only">No</span>
      </>
    );
  return <span className="text-[11.5px] text-accent">{value}</span>;
}
