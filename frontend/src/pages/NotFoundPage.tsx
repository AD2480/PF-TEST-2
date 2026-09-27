import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/ui/States';

export function NotFoundPage({ title = 'Page not found', description = 'The page you’re looking for doesn’t exist or has moved.' }: { title?: string; description?: string }) {
  return (
    <EmptyState
      icon={Compass}
      title={title}
      description={description}
      className="min-h-[60vh]"
      action={
        <Link to="/dashboard" className="inline-flex h-9 items-center rounded-lg bg-brand px-3.5 text-sm font-medium text-white hover:bg-brand-hover dark:text-canvas">
          Go to dashboard
        </Link>
      }
    />
  );
}
