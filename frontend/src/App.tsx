import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { Route, Routes } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { GuestOnly, RequireAuth } from '@/features/auth/RequireAuth';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { Spinner } from '@/components/ui/Spinner';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProjectLayout } from '@/pages/project/ProjectLayout';

/**
 * Pages load on demand, so charts, drag-and-drop and three.js only download when a page that
 * uses them is opened. `page` adapts named exports to React.lazy.
 */
function page<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M) {
  return lazy(async () => ({ default: (await load())[name] as ComponentType }));
}

const HomePage = page(() => import('@/pages/public/HomePage'), 'HomePage');
const PrivacyPage = page(() => import('@/pages/public/LegalPages'), 'PrivacyPage');
const TermsPage = page(() => import('@/pages/public/LegalPages'), 'TermsPage');
const PublicNotFoundPage = page(() => import('@/pages/public/PublicNotFoundPage'), 'PublicNotFoundPage');
const CheckEmailPage = page(() => import('@/pages/auth/AccountPages'), 'CheckEmailPage');
const VerifyEmailPage = page(() => import('@/pages/auth/AccountPages'), 'VerifyEmailPage');
const ForgotPasswordPage = page(() => import('@/pages/auth/AccountPages'), 'ForgotPasswordPage');
const ResetPasswordPage = page(() => import('@/pages/auth/AccountPages'), 'ResetPasswordPage');
const IntroductionPage = page(() => import('@/pages/public/IntroductionPage'), 'IntroductionPage');
const DashboardPage = page(() => import('@/pages/DashboardPage'), 'DashboardPage');
const MyTasksPage = page(() => import('@/pages/MyTasksPage'), 'MyTasksPage');
const ProjectsPage = page(() => import('@/pages/ProjectsPage'), 'ProjectsPage');
const InboxPage = page(() => import('@/pages/InboxPage'), 'InboxPage');
const CalendarPage = page(() => import('@/pages/CalendarPage'), 'CalendarPage');
const AnalyticsPage = page(() => import('@/pages/AnalyticsPage'), 'AnalyticsPage');
const SettingsPage = page(() => import('@/pages/SettingsPage'), 'SettingsPage');
const OverviewPage = page(() => import('@/pages/project/OverviewPage'), 'OverviewPage');
const BoardPage = page(() => import('@/pages/project/BoardPage'), 'BoardPage');
const TaskPeekPanel = page(() => import('@/features/tasks/TaskPeekPanel'), 'TaskPeekPanel');
const TaskListPage = page(() => import('@/pages/project/TaskListPage'), 'TaskListPage');
const TaskDetailPage = page(() => import('@/pages/project/TaskDetailPage'), 'TaskDetailPage');
const ReviewWorkspacePage = page(() => import('@/pages/project/ReviewWorkspacePage'), 'ReviewWorkspacePage');
const ModelPage = lazy(() => import('@/pages/project/ModelPage'));
const TimelinePage = page(() => import('@/pages/project/TimelinePage'), 'TimelinePage');
const DependencyMapPage = page(() => import('@/pages/project/DependencyMapPage'), 'DependencyMapPage');
const PlanningPage = page(() => import('@/pages/project/PlanningPage'), 'PlanningPage');
const MilestonesPage = page(() => import('@/pages/project/MilestonesPage'), 'MilestonesPage');
const TeamPage = page(() => import('@/pages/project/TeamPage'), 'TeamPage');
const ProjectAnalyticsPage = page(() => import('@/pages/project/ProjectAnalyticsPage'), 'ProjectAnalyticsPage');
const ActivityPage = page(() => import('@/pages/project/ActivityPage'), 'ActivityPage');
const ProjectSettingsPage = page(() => import('@/pages/project/ProjectSettingsPage'), 'ProjectSettingsPage');

/** Public pages load on demand too; this is what shows for the moment they take. */
function PublicSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-canvas text-muted">
          <Spinner label="Loading" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export function App() {
  return (
    <Routes>
      {/* Public: the front page and the introduction are open to everyone, signed in or not. */}
      <Route
        index
        element={
          <PublicSuspense>
            <HomePage />
          </PublicSuspense>
        }
      />
      <Route
        path="/introduction"
        element={
          <PublicSuspense>
            <IntroductionPage />
          </PublicSuspense>
        }
      />
      <Route path="/privacy" element={<PublicSuspense><PrivacyPage /></PublicSuspense>} />
      <Route path="/terms" element={<PublicSuspense><TermsPage /></PublicSuspense>} />
      {/* Account pages reached from emails: open whether or not someone is signed in. */}
      <Route path="/check-email" element={<PublicSuspense><CheckEmailPage /></PublicSuspense>} />
      <Route path="/verify-email" element={<PublicSuspense><VerifyEmailPage /></PublicSuspense>} />
      <Route path="/forgot-password" element={<PublicSuspense><ForgotPasswordPage /></PublicSuspense>} />
      <Route path="/reset-password" element={<PublicSuspense><ResetPasswordPage /></PublicSuspense>} />
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnly>
            <RegisterPage />
          </GuestOnly>
        }
      />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="my-tasks" element={<MyTasksPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="board" element={<BoardPage />}>
            <Route path="tasks/:taskId" element={<TaskPeekPanel />} />
          </Route>
          <Route path="tasks" element={<TaskListPage />} />
          <Route path="tasks/:taskId" element={<TaskDetailPage />} />
          <Route path="tasks/:taskId/review" element={<ReviewWorkspacePage />} />
          <Route path="model" element={<ModelPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="map" element={<DependencyMapPage />} />
          <Route path="plan" element={<PlanningPage />} />
          <Route path="milestones" element={<MilestonesPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="analytics" element={<ProjectAnalyticsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="settings" element={<ProjectSettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="inbox" element={<InboxPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Anything else: a public 404, for visitors and signed-in people alike (no sign-in wall). */}
      <Route
        path="*"
        element={
          <PublicSuspense>
            <PublicNotFoundPage />
          </PublicSuspense>
        }
      />
    </Routes>
  );
}
