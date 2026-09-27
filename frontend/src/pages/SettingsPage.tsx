import { zodResolver } from '@hookform/resolvers/zod';
import { Database, KeyRound, Monitor, Moon, Palette, Sun, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { z } from 'zod';
import { api } from '@/api/baseApi';
import { useChangePasswordMutation, useUpdateProfileMutation } from '@/api/endpoints';
import { useAppDispatch, useAppSelector } from '@/app/store';
import { themeChanged, type ThemePreference } from '@/app/uiSlice';
import { PageContainer } from '@/components/layout/AppShell';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { Field, FormError, Input } from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/PageHeader';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { API_BASE_URL, USE_MOCK_API } from '@/config';
import { tokenRefreshed, userUpdated } from '@/features/auth/authSlice';
import { openCookieSettings } from '@/features/consent/consent';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/dates';
import { applyServerErrors, rules } from '@/lib/forms';
import { useDocumentTitle, useUrlState } from '@/lib/hooks';

const profileSchema = z.object({
  name: rules.name,
  jobTitle: z.string().trim().max(80, 'Job title must be at most 80 characters.'),
  avatarColor: z.string(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: rules.password,
    confirmPassword: z.string().min(1, 'Please confirm the new password.'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match.' });

function ProfileSection() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user)!;
  const [update, { isLoading }] = useUpdateProfileMutation();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    watch,
    formState: { errors, isDirty },
  } = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, jobTitle: user.jobTitle ?? '', avatarColor: user.avatarColor },
  });
  const preview = { name: watch('name') || user.name, avatarColor: watch('avatarColor') };

  return (
    <Card>
      <CardHeader title="Profile" description="How teammates see you across ProjectFlow." />
      <CardBody>
        <form
          className="space-y-4"
          noValidate
          onSubmit={handleSubmit(async (v) => {
            setFormError(null);
            try {
              const saved = await update({ name: v.name, jobTitle: v.jobTitle || null, avatarColor: v.avatarColor }).unwrap();
              dispatch(userUpdated(saved));
              reset({ name: saved.name, jobTitle: saved.jobTitle ?? '', avatarColor: saved.avatarColor });
              toast.success('Profile updated');
            } catch (e) {
              setFormError(applyServerErrors(e, setError, ['name', 'jobTitle', 'avatarColor']));
            }
          })}
        >
          <FormError message={formError} />
          <div className="flex items-center gap-4">
            <Avatar user={preview} size="xl" />
            <div className="text-[13px]">
              <p className="font-medium text-ink">{user.email}</p>
              <p className="text-xs text-muted">Member since {formatDate(user.createdAt.slice(0, 10), 'MMMM yyyy')}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={errors.name?.message} required>
              {(p) => <Input {...p} {...register('name')} autoComplete="name" />}
            </Field>
            <Field label="Job title" error={errors.jobTitle?.message} hint="Optional, e.g. Frontend Developer">
              {(p) => <Input {...p} {...register('jobTitle')} />}
            </Field>
          </div>
          <div className="space-y-1.5">
            <span className="block text-[13px] font-medium text-ink-2">Avatar colour</span>
            <Controller control={control} name="avatarColor" render={({ field }) => <ColorPicker label="Avatar colour" value={field.value} onChange={field.onChange} />} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={isLoading} disabled={!isDirty}>
              Save profile
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function SecuritySection() {
  const dispatch = useAppDispatch();
  const [change, { isLoading }] = useChangePasswordMutation();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });

  return (
    <Card>
      <CardHeader title="Password" description="Use at least 8 characters with a letter and a number." />
      <CardBody>
        <form
          className="max-w-md space-y-4"
          noValidate
          onSubmit={handleSubmit(async (v) => {
            setFormError(null);
            try {
              const res = await change({ currentPassword: v.currentPassword, newPassword: v.newPassword }).unwrap();
              // The server signed out every other device; this one continues with a new session.
              if (res?.token) dispatch(tokenRefreshed({ token: res.token, user: res.user }));
              reset();
              toast.success('Password changed. Other devices were signed out.');
            } catch (e) {
              setFormError(applyServerErrors(e, setError, ['currentPassword', 'newPassword']));
            }
          })}
        >
          <FormError message={formError} />
          <Field label="Current password" error={errors.currentPassword?.message} required>
            {(p) => <PasswordInput {...p} {...register('currentPassword')} autoComplete="current-password" />}
          </Field>
          <Field label="New password" error={errors.newPassword?.message} required>
            {(p) => <PasswordInput {...p} {...register('newPassword')} autoComplete="new-password" />}
          </Field>
          <Field label="Confirm new password" error={errors.confirmPassword?.message} required>
            {(p) => <PasswordInput {...p} {...register('confirmPassword')} autoComplete="new-password" />}
          </Field>
          <Button type="submit" loading={isLoading}>
            Change password
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

const THEMES: { value: ThemePreference; label: string; icon: typeof Sun; text: string }[] = [
  { value: 'light', label: 'Light', icon: Sun, text: 'Bright surfaces' },
  { value: 'dark', label: 'Dark', icon: Moon, text: 'Easy on the eyes' },
  { value: 'system', label: 'System', icon: Monitor, text: 'Follow your device' },
];

function AppearanceSection() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  return (
    <Card>
      <CardHeader title="Theme" description="Saved on this device." />
      <CardBody>
        <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-3">
          {THEMES.map(({ value, label, icon: Icon, text }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={theme === value}
              onClick={() => dispatch(themeChanged(value))}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                theme === value ? 'border-brand/50 bg-brand-soft/50 ring-1 ring-brand/30' : 'border-line hover:bg-surface-2',
              )}
            >
              <Icon className="size-5 text-muted" aria-hidden="true" />
              <span>
                <span className="block text-[13px] font-semibold text-ink">{label}</span>
                <span className="block text-xs text-muted">{text}</span>
              </span>
            </button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function DataSection() {
  const dispatch = useAppDispatch();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <CardHeader title="Data source" />
      <CardBody className="space-y-4 text-[13px] text-ink-2">
        {USE_MOCK_API ? (
          <>
            <p>
              You’re using the <strong className="text-ink">built-in demo API</strong>. It enforces the same rules as the Spring Boot backend, and stores data in this browser’s local
              storage.
            </p>
            <div className="flex flex-col gap-3 rounded-lg border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-ink">Reset demo data</p>
                <p className="text-xs text-muted">Restore the original demo projects, tasks and accounts. Your changes will be lost.</p>
              </div>
              <Button variant="secondary" onClick={() => setConfirm(true)}>
                Reset data
              </Button>
            </div>
          </>
        ) : (
          <p>
            Connected to the backend at <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">{API_BASE_URL}</code>.
          </p>
        )}
        <div className="flex flex-col gap-3 rounded-lg border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-ink">Privacy and cookies</p>
            <p className="text-xs text-muted">
              Read the{' '}
              <Link to="/privacy" className="text-ink underline underline-offset-2">
                privacy policy
              </Link>{' '}
              and{' '}
              <Link to="/terms" className="text-ink underline underline-offset-2">
                terms
              </Link>
              . To see, export or delete your data, contact whoever runs this site.
            </p>
          </div>
          <Button variant="secondary" onClick={openCookieSettings}>
            Cookie settings
          </Button>
        </div>
      </CardBody>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Reset demo data?"
        description="All projects, tasks and accounts go back to the original demo state. Accounts you registered will be removed."
        confirmLabel="Reset data"
        loading={busy}
        onConfirm={async () => {
          setBusy(true);
          const { resetDb } = await import('@/mock/store');
          await resetDb();
          dispatch(api.util.resetApiState());
          setBusy(false);
          setConfirm(false);
          toast.success('Demo data restored');
        }}
      />
    </Card>
  );
}

const TABS = [
  { value: 'profile', label: 'Profile', icon: UserRound },
  { value: 'security', label: 'Security', icon: KeyRound },
  { value: 'appearance', label: 'Appearance', icon: Palette },
  { value: 'data', label: 'Data and privacy', icon: Database },
] as const;

export function SettingsPage() {
  useDocumentTitle('Settings');
  const [f, setF] = useUrlState({ tab: 'profile' });
  const tab = TABS.some((t) => t.value === f.tab) ? f.tab : 'profile';
  useEffect(() => window.scrollTo({ top: 0 }), [tab]);

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader eyebrow="Account" title="Settings" description="Manage your account and preferences." />
      <div className="mt-6 grid gap-6 md:grid-cols-[200px_1fr]">
        <nav aria-label="Settings sections" className="scrollbar-thin -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:px-0">
          {TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setF({ tab: value })}
              aria-current={tab === value ? 'page' : undefined}
              className={cn(
                'flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-colors',
                tab === value ? 'bg-brand-soft text-brand-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
        <div className="min-w-0 space-y-6">
          {tab === 'profile' && <ProfileSection />}
          {tab === 'security' && <SecuritySection />}
          {tab === 'appearance' && <AppearanceSection />}
          {tab === 'data' && <DataSection />}
        </div>
      </div>
    </PageContainer>
  );
}
