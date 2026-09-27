import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PublicPage } from '@/components/layout/PublicFrame';
import { ANALYTICS, ANALYTICS_CONFIGURED, CONTACT_EMAIL, OPERATOR_NAME, TURNSTILE_SITE_KEY, USE_MOCK_API } from '@/config';
import { openCookieSettings } from '@/features/consent/consent';
import { usePageMeta } from '@/lib/pageMeta';

/** When the policy and terms last changed. Update it with every change to either page. */
export const LEGAL_UPDATED = '27 September 2026';

const WRAP = 'mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-10';

interface Section {
  id: string;
  title: string;
  body: ReactNode;
}

function Contact() {
  return CONTACT_EMAIL ? (
    <a href={`mailto:${CONTACT_EMAIL}`} className="text-ink underline underline-offset-2">
      {CONTACT_EMAIL}
    </a>
  ) : (
    <span>the contact address the operator gave you (this copy hasn’t published one on this page yet)</span>
  );
}

/** A long legal text: title, date, contents on the side (wide screens), numbered sections. */
function LegalDocument({ eyebrow, title, intro, sections }: { eyebrow: string; title: string; intro: ReactNode; sections: Section[] }) {
  return (
    <PublicPage>
      <div className={WRAP}>
        <header className="border-b border-line py-12 lg:py-16">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-4 font-display text-[40px] leading-[1.05] font-extralight tracking-[-0.04em] text-ink sm:text-[52px]">{title}</h1>
          <p className="mt-4 text-[13px] text-muted">Last updated {LEGAL_UPDATED}</p>
          <div className="mt-6 max-w-2xl text-[15px] leading-relaxed text-ink-2">{intro}</div>
        </header>
        <div className="grid gap-10 py-12 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16 lg:py-16">
          <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
            <p className="caps text-muted">On this page</p>
            <ol className="mt-2 space-y-0.5 text-[13px]">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="flex gap-2 py-1 text-ink-2 hover:text-accent">
                    <span className="w-5 shrink-0 font-mono text-[11px] text-muted tabular">{String(i + 1).padStart(2, '0')}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="max-w-2xl space-y-12">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-24">
                <h2 id={`${s.id}-title`} className="flex items-baseline gap-3 font-display text-[24px] font-light tracking-[-0.02em] text-ink">
                  <span className="font-mono text-[12px] text-muted tabular">{String(i + 1).padStart(2, '0')}</span>
                  {s.title}
                </h2>
                <div className="legal-prose mt-4 space-y-3 text-[14px] leading-relaxed text-ink-2">{s.body}</div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </PublicPage>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-muted">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function PrivacyPage() {
  usePageMeta({ title: 'Privacy policy', path: '/privacy' });
  const analyticsLine = ANALYTICS_CONFIGURED
    ? [
        ANALYTICS.vercel && 'Vercel Web Analytics, which sets no cookies and counts visits in aggregate',
        ANALYTICS.ga4 && 'Google Analytics 4, which sets cookies (_ga and _ga_…) to recognise a returning browser; advertising features are turned off',
      ]
        .filter(Boolean)
        .join('; and ')
    : null;

  const sections: Section[] = [
    {
      id: 'who',
      title: 'Who is responsible',
      body: (
        <>
          <p>
            ProjectFlow is project-management software. This copy of it is run by {OPERATOR_NAME} (“we”), who decide how your information is used here. To ask
            about your information, or to see, correct, export or delete it, contact <Contact />.
          </p>
          {USE_MOCK_API && (
            <p className="border border-line bg-surface-2 px-3 py-2 text-[13px]">
              This copy is running in demo mode: there is no server, and everything you enter stays in this browser’s storage. Nothing is sent to us.
            </p>
          )}
        </>
      ),
    },
    {
      id: 'collect',
      title: 'What we collect',
      body: (
        <List
          items={[
            <>
              <strong className="font-medium text-ink">Your account:</strong> your name, email address, optional job title and avatar colour, when you accepted these
              terms and whether you confirmed your email. Your password is stored only as a one-way BCrypt hash; nobody can read it.
            </>,
            <>
              <strong className="font-medium text-ink">What you and your team put in:</strong> projects, tasks, acceptance criteria, checklists, comments, evidence
              links and uploaded files, submissions, reviews, milestones, dependencies, invitations and notifications.
            </>,
            <>
              <strong className="font-medium text-ink">A history of changes:</strong> who changed a task’s status or reviewed it, and when. The history graph and 3D
              model are built from it.
            </>,
            <>
              <strong className="font-medium text-ink">Sign-in security:</strong> when you sign in, your IP address and a short device description (such as “Chrome on
              macOS”) go into a sign-in alert email to you. The server also holds IP addresses in memory for up to two hours to limit repeated attempts. Our hosting
              providers keep standard server logs, which include IP addresses.
            </>,
          ]}
        />
      ),
    },
    {
      id: 'use',
      title: 'Why we use it',
      body: (
        <>
          <List
            items={[
              'To run the service you signed up for: your account, your projects, and showing your work to the members of your projects.',
              'To keep accounts safe: confirming email addresses, sign-in alerts, password resets, and limits on repeated attempts.',
              'To send the emails the service needs: confirming your address, sign-in alerts, password reset links and “your password was changed”. We don’t send marketing email.',
              ANALYTICS_CONFIGURED ? 'To understand which pages are used, but only if you agree to analytics.' : 'We don’t use analytics on this copy.',
            ]}
          />
          <p>We don’t sell your information, show advertising, or use your content to train AI models.</p>
        </>
      ),
    },
    {
      id: 'cookies',
      title: 'Cookies and browser storage',
      body: (
        <>
          <p>
            <strong className="font-medium text-ink">Essential, always on:</strong> your browser’s storage keeps your sign-in (for this tab only if you untick “Keep me
            signed in”), your theme and view settings, assistant voice settings, and your cookie choice. These don’t track you and aren’t shared.
          </p>
          <p>
            <strong className="font-medium text-ink">Analytics, only if you agree:</strong>{' '}
            {analyticsLine ? `${analyticsLine}. Addresses are shortened first, so project and task numbers and one-time links never reach them.` : 'this copy doesn’t use any.'}
          </p>
          <p>
            <button type="button" onClick={openCookieSettings} className="text-ink underline underline-offset-2">
              Open cookie settings
            </button>{' '}
            to change your choice at any time.
          </p>
        </>
      ),
    },
    {
      id: 'share',
      title: 'Who can see it',
      body: (
        <>
          <p>
            <strong className="font-medium text-ink">People in your projects</strong> see what their role allows (owner, manager, member or viewer). Evidence can
            only be opened by members of that project. People outside a project see nothing of it.
          </p>
          <p>
            <strong className="font-medium text-ink">Service providers</strong> process information for us, only to provide their service:
          </p>
          <List
            items={[
              'the hosts of this website, the server and the database (for example Vercel, Railway or Render, depending on how this copy is set up);',
              'our email provider (Resend), for the account emails listed above;',
              ...(TURNSTILE_SITE_KEY ? ['Cloudflare Turnstile, which checks that a person, not a bot, is filling in the sign-up and email-link forms;'] : []),
              'Anthropic, only if AI assistance is switched on for this copy: a question you ask, and the project records it needs, are sent to generate an answer. AI is never used unless you ask it something;',
              ...(ANALYTICS_CONFIGURED ? ['the analytics services named above, only if you agree.'] : []),
            ]}
          />
          <p>
            Voice input uses your browser’s own speech recognition. Your browser’s maker (for example Google for Chrome, or Apple for Safari) may process the audio to
            turn it into text; ProjectFlow only receives the text.
          </p>
          <p>We may disclose information if the law requires it.</p>
        </>
      ),
    },
    {
      id: 'keep',
      title: 'How long we keep it',
      body: (
        <List
          items={[
            'Your account and your projects are kept until you ask us to delete them, or the project owner deletes a project.',
            'Links sent by email expire after 24 hours (confirming your address) or 1 hour (resetting your password), and their records are deleted a week after they expire.',
            'Sign-in attempt counts are kept in memory for at most two hours.',
            'Server logs are kept by our hosting providers under their own retention periods.',
          ]}
        />
      ),
    },
    {
      id: 'security',
      title: 'How we protect it',
      body: (
        <List
          items={[
            'Connections use HTTPS.',
            'Passwords are stored as BCrypt hashes, and links sent by email are stored as SHA-256 hashes.',
            'Every request is checked against your role in the project, on the server.',
            'You get an email each time your account is signed in to. A password reset signs you out everywhere.',
            'Repeated sign-in and sign-up attempts are limited.',
          ]}
        />
      ),
    },
    {
      id: 'rights',
      title: 'Your choices and rights',
      body: (
        <>
          <p>
            You can change your name, job title and password in <Link to="/settings" className="text-ink underline underline-offset-2">Settings</Link>, and your
            cookie choice at any time. Depending on where you live (for example under the GDPR in the EU and UK, or India’s Digital Personal Data Protection Act,
            2023), you may also have the right to ask for a copy of your information, to have it corrected or deleted, to object to some uses, and to complain to a
            data-protection authority.
          </p>
          <p>
            To use any of these rights, contact <Contact />. We’ll reply within 30 days. Content you added to a shared project may stay visible to its other members
            where it’s part of their work (for example a review decision), but we’ll remove your name from it on request.
          </p>
        </>
      ),
    },
    {
      id: 'age',
      title: 'Age',
      body: <p>ProjectFlow is meant for people aged 16 or over. If you’re under the age of digital consent where you live, ask a parent or guardian first.</p>,
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      body: (
        <p>
          If we change this policy, we’ll update the date at the top. For significant changes we’ll tell account holders by email or in the app before they apply.
          The <Link to="/terms" className="text-ink underline underline-offset-2">terms and conditions</Link> explain the rules for using the service.
        </p>
      ),
    },
  ];

  return (
    <LegalDocument
      eyebrow="Privacy"
      title="Privacy policy"
      intro={<p>What ProjectFlow collects, why, who can see it, how long it’s kept, and how to see, change or delete your information. In plain language.</p>}
      sections={sections}
    />
  );
}

export function TermsPage() {
  usePageMeta({ title: 'Terms and conditions', path: '/terms' });
  const sections: Section[] = [
    {
      id: 'agreement',
      title: 'The agreement',
      body: (
        <p>
          These terms are an agreement between you and {OPERATOR_NAME} (“we”), who run this copy of ProjectFlow. By creating an account or using the service you
          accept them, and the <Link to="/privacy" className="text-ink underline underline-offset-2">privacy policy</Link>. If you use ProjectFlow for an
          organisation, you confirm you may accept these terms for it.
        </p>
      ),
    },
    {
      id: 'service',
      title: 'The service',
      body: (
        <>
          <p>
            ProjectFlow is a free project and task manager. It started as a student capstone project, and it’s provided as it is: we work to keep it running and
            correct, but we can’t promise it will always be available, fast or free of errors, and features may change or end.
          </p>
          <p>Keep your own copies of anything important. We don’t promise backups.</p>
        </>
      ),
    },
    {
      id: 'account',
      title: 'Your account',
      body: (
        <List
          items={[
            'Give your real name and an email address you can receive mail at, and confirm it when asked.',
            'One account per person. Keep your password to yourself; you’re responsible for what happens under your account.',
            'Tell us straight away if you think someone else has used your account. A password reset signs out every device.',
            'You must be 16 or over, or have a parent’s or guardian’s permission.',
          ]}
        />
      ),
    },
    {
      id: 'content',
      title: 'Your content',
      body: (
        <>
          <p>
            You keep ownership of what you put into ProjectFlow. You give us permission to store it, process it and show it to the members of your projects,
            only as needed to run the service.
          </p>
          <p>
            Only upload what you have the right to share. Don’t upload other people’s personal information unless you’re allowed to, and don’t use ProjectFlow for
            health, financial or other sensitive records it wasn’t built to protect.
          </p>
        </>
      ),
    },
    {
      id: 'use',
      title: 'Acceptable use',
      body: (
        <>
          <p>Don’t use ProjectFlow to:</p>
          <List
            items={[
              'break the law, or infringe anyone’s rights;',
              'harass, threaten or deceive people;',
              'upload malware, or content meant to harm people or computers;',
              'get around the permission checks or the review workflow, access accounts or projects that aren’t yours, or probe the service for weaknesses without our written permission;',
              'create accounts automatically, send spam, or overload the service (including scraping).',
            ]}
          />
          <p>If you find a security problem, please tell us privately at <Contact />.</p>
        </>
      ),
    },
    {
      id: 'ai',
      title: 'AI answers and forecasts',
      body: (
        <p>
          Forecasts are estimates from your records, and AI answers (when this copy offers them) can be wrong. Both are labelled as such. Check them before you
          rely on them. AI never changes anything by itself: every suggested change waits for a person to confirm it.
        </p>
      ),
    },
    {
      id: 'ending',
      title: 'Ending your use',
      body: (
        <p>
          You can stop using ProjectFlow at any time and ask us to delete your account at <Contact />. We may suspend or close accounts that break these terms or
          put other people or the service at risk; where we can, we’ll tell you first and let you take a copy of your content.
        </p>
      ),
    },
    {
      id: 'liability',
      title: 'Liability',
      body: (
        <p>
          As far as the law allows, we aren’t liable for indirect or consequential losses, lost data or lost profits from using ProjectFlow, and because the service
          is free, our total liability to you is limited to the amount you paid us in the last 12 months (which is nothing). Nothing in these terms limits
          liability that the law doesn’t allow to be limited, or your rights as a consumer.
        </p>
      ),
    },
    {
      id: 'changes',
      title: 'Changes and contact',
      body: (
        <p>
          We may update these terms; the date at the top shows the latest version. For significant changes we’ll tell account holders before they apply, and if
          you keep using ProjectFlow afterwards, the new terms apply. These terms are governed by the laws of the place where the operator is based. Questions:{' '}
          <Contact />.
        </p>
      ),
    },
  ];
  return (
    <LegalDocument
      eyebrow="Terms"
      title="Terms and conditions"
      intro={<p>The rules for using ProjectFlow: your account, your content, what isn’t allowed, and the limits of a free service.</p>}
      sections={sections}
    />
  );
}
