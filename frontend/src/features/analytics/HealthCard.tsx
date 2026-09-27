import { Info } from 'lucide-react';
import { useState } from 'react';
import type { Health } from '@/api/types';
import { HEALTH_COLOR, HealthBadge } from '@/components/domain';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Dialog } from '@/components/ui/Dialog';
import { ProgressBar } from '@/components/ui/Progress';
import { HEALTH_LABEL } from '@/lib/constants';
import { HEALTH_RULES, PROGRESS_DEFINITION } from '@/lib/health';

export function HealthRulesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="How project health is calculated" description="Rules are checked from top to bottom; the first level whose conditions match is shown." size="lg">
      <div className="space-y-4">
        <p className="rounded-lg bg-surface-2 px-3 py-2.5 text-[13px] leading-relaxed text-ink-2">{PROGRESS_DEFINITION}</p>
        <ol className="space-y-3">
          {HEALTH_RULES.map((r) => (
            <li key={r.level} className="flex gap-3">
              <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: HEALTH_COLOR[r.level] }} aria-hidden="true" />
              <div>
                <p className="text-[13px] font-semibold text-ink">{HEALTH_LABEL[r.level]}</p>
                <ul className="mt-0.5 space-y-0.5 text-[13px] text-muted">
                  {r.rules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted">Overdue = a task that is not Done and whose due date is before today. Everything is calculated from the stored task records each time you load the page.</p>
      </div>
    </Dialog>
  );
}

export function HealthCard({
  health,
  reasons,
  progress,
  expected,
  color,
}: {
  health: Health;
  reasons: string[];
  progress: number;
  expected: number | null;
  color?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader
        title="Project health"
        action={
          <Button variant="ghost" size="xs" leftIcon={<Info />} onClick={() => setOpen(true)}>
            How it’s calculated
          </Button>
        }
      />
      <CardBody className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <HealthBadge health={health} className="h-7 px-2.5 text-[13px]" />
          <div className="text-right">
            <p className="text-2xl font-semibold text-ink tabular">{progress}%</p>
            <p className="text-xs text-muted">{expected !== null ? `${expected}% expected by today` : 'No deadline set'}</p>
          </div>
        </div>
        <ProgressBar value={progress} marker={expected} size="md" color={color} label="Progress against expected" />
        <ul className="space-y-1.5">
          {reasons.map((r) => (
            <li key={r} className="flex gap-2 text-[13px] text-ink-2">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-muted" aria-hidden="true" />
              {r}
            </li>
          ))}
        </ul>
      </CardBody>
      <HealthRulesDialog open={open} onOpenChange={setOpen} />
    </Card>
  );
}
