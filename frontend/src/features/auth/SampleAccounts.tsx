import { USE_MOCK_API } from '@/config';
import { cn } from '@/lib/cn';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/mock/demoAccounts';

/** One-click sign-in as a seeded account: demo mode and local development only. */
export default function SampleAccounts({
  disabled,
  loadingEmail,
  onPick,
}: {
  disabled: boolean;
  loadingEmail: string | null;
  onPick: (email: string, password: string) => void;
}) {
  return (
    <section className="mt-9" aria-labelledby="sample-accounts">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="sample-accounts" className="caps text-muted">
          Sample accounts
        </h2>
        <span className="text-[11px] text-muted">
          Password <code className="bg-surface-2 px-1 py-0.5 font-mono text-ink-2">{DEMO_PASSWORD}</code>
        </span>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-px border border-line bg-line">
        {DEMO_ACCOUNTS.map((a) => (
          <li key={a.email}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(a.email, DEMO_PASSWORD)}
              className={cn('block h-full w-full bg-surface px-3.5 py-3 text-left transition-colors hover:bg-surface-2 disabled:opacity-60')}
              title={`${a.name} · ${a.hint}`}
            >
              <span className="caps block text-[9.5px] text-accent">{a.role}</span>
              <span className="mt-1 block text-[13.5px] font-medium text-ink">{loadingEmail === a.email ? 'Signing in…' : a.name.split(' ')[0]}</span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-muted">{a.hint}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">
        {USE_MOCK_API
          ? 'Demo mode: these accounts live in this browser only.'
          : 'These exist when the backend’s demo data is on (DEMO_DATA=true, the default for local development).'}
      </p>
    </section>
  );
}
