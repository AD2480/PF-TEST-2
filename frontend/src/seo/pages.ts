/**
 * Titles and descriptions of the public pages. Used in the browser (the page's <title>, meta
 * description, canonical link and social-preview tags) and at build time, to write a static HTML
 * file per page with the same tags (link previews and search engines don't run JavaScript), plus
 * the sitemap and robots.txt. No imports: vite.config.ts loads this file too.
 */

export const SITE_NAME = 'ProjectFlow';

export interface PageMeta {
  /** URL path, e.g. "/privacy". */
  path: string;
  /** Written into dist/<file>. The front page is index.html. */
  file: string;
  /** The page's own title; the site name is added after it (not on the front page). */
  title: string;
  description: string;
  /** Listed in sitemap.xml. */
  sitemap: boolean;
  /** The lazily loaded module that renders the page; its files are preloaded in the page's HTML. */
  module?: string;
  priority?: number;
}

export const DEFAULT_DESCRIPTION =
  'ProjectFlow is a project and task manager for teams: plan work with acceptance criteria, submit evidence for review, and see each project as a 3D model with a history and forecast.';

export const PUBLIC_PAGES: PageMeta[] = [
  {
    path: '/',
    module: 'src/pages/public/HomePage.tsx',
    file: 'index.html',
    title: 'ProjectFlow: projects you can see, work that’s proven',
    description: DEFAULT_DESCRIPTION,
    sitemap: true,
    priority: 1,
  },
  {
    path: '/introduction',
    module: 'src/pages/public/IntroductionPage.tsx',
    file: 'introduction.html',
    title: 'Introduction',
    description:
      'How ProjectFlow works in nine short chapters: roles, the life of a task, reviews with evidence, the 3D model and forecast, and what the assistant can and can’t do.',
    sitemap: true,
    priority: 0.8,
  },
  {
    path: '/register',
    file: 'register.html',
    title: 'Create your free account',
    description: 'Create a free ProjectFlow account to plan projects with your team, review work against its criteria and see progress in 3D.',
    sitemap: true,
    priority: 0.7,
  },
  {
    path: '/login',
    file: 'login.html',
    title: 'Sign in',
    description: 'Sign in to ProjectFlow to continue to your projects.',
    sitemap: true,
    priority: 0.4,
  },
  {
    path: '/privacy',
    module: 'src/pages/public/LegalPages.tsx',
    file: 'privacy.html',
    title: 'Privacy policy',
    description: 'What ProjectFlow collects, why, where it is kept, who can see it, and how to see, change or delete your data.',
    sitemap: true,
    priority: 0.3,
  },
  {
    path: '/terms',
    module: 'src/pages/public/LegalPages.tsx',
    file: 'terms.html',
    title: 'Terms and conditions',
    description: 'The terms for using ProjectFlow: your account, your content, acceptable use, and the limits of the service.',
    sitemap: true,
    priority: 0.3,
  },
];

/** Pages behind sign-in: never indexed, disallowed in robots.txt. */
export const APP_PATHS = ['/dashboard', '/my-tasks', '/projects', '/inbox', '/calendar', '/analytics', '/settings'];

/** Account pages reached from emails or forms: usable, but not indexed. */
export const UTILITY_PATHS = ['/check-email', '/verify-email', '/forgot-password', '/reset-password'];

export const SOCIAL_IMAGE = { path: '/og-image.png', width: 1200, height: 630, alt: 'ProjectFlow: a project shown as a 3D model of stacked task blocks, with the words “Work you can walk around. Done when it’s proven.”' };

export function fullTitle(page: Pick<PageMeta, 'path' | 'title'>): string {
  return page.path === '/' ? page.title : `${page.title} · ${SITE_NAME}`;
}
