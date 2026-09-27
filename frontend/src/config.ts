/** Runtime configuration from Vite environment variables (see .env.example). */
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false';

/**
 * Whether the sign-in page lists the sample accounts. Always in demo mode. With the real backend
 * only when VITE_SHOW_SAMPLE_ACCOUNTS=true (as in `.env.backend` for local development), so a
 * deployment never publishes the seeded accounts' password by accident.
 */
export const SHOW_SAMPLE_ACCOUNTS = USE_MOCK_API || import.meta.env.VITE_SHOW_SAMPLE_ACCOUNTS === 'true';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || '/api';

const env = (v: string | undefined) => (v ?? '').trim();

/** The site's public address (no trailing slash), or this page's own origin when it isn't set. */
export const SITE_URL = (env(import.meta.env.VITE_SITE_URL) || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');

/** Named on the privacy policy and terms as the one responsible for this copy of ProjectFlow. */
export const OPERATOR_NAME = env(import.meta.env.VITE_OPERATOR_NAME) || 'the people who run this copy of ProjectFlow';

/** Where people can reach the operator; the legal pages say so honestly when it isn't set. */
export const CONTACT_EMAIL = env(import.meta.env.VITE_CONTACT_EMAIL);

/** Cloudflare Turnstile site key; the bot check is shown on sign-up and emailed-link forms only when set. */
export const TURNSTILE_SITE_KEY = USE_MOCK_API ? '' : env(import.meta.env.VITE_TURNSTILE_SITE_KEY);

/** Analytics that may be loaded once the visitor agrees. Nothing loads without consent. */
export const ANALYTICS = {
  vercel: env(import.meta.env.VITE_ANALYTICS).toLowerCase() === 'vercel',
  ga4: /^G-[A-Z0-9]{4,}$/i.test(env(import.meta.env.VITE_GA_MEASUREMENT_ID)) ? env(import.meta.env.VITE_GA_MEASUREMENT_ID) : '',
};
export const ANALYTICS_CONFIGURED = ANALYTICS.vercel || ANALYTICS.ga4 !== '';

/** Simulated network latency for the mock API, so loading states are visible. */
export const MOCK_LATENCY_MS: [min: number, max: number] = [150, 400];

export const STORAGE_KEYS = {
  token: 'projectflow.token',
  user: 'projectflow.user',
  theme: 'projectflow.theme',
  taskView: 'projectflow.taskView',
  consent: 'projectflow.consent',
} as const;
