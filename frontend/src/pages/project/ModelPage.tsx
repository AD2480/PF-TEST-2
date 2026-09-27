import { useMemo } from 'react';
import { Link } from 'react-router';
import { Skeleton } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/States';
import { useProjectContext } from '@/features/projects/projectContext';
import { ProjectAssistant } from '@/features/ai/ProjectAssistant';
import { ModelAnalysis } from '@/features/model/ModelAnalysis';
import { ProjectModelView } from '@/features/model/ProjectModelView';
import { useProjectModel } from '@/features/model/useProjectModel';
import { useDocumentTitle } from '@/lib/hooks';
import { webglAvailable } from '@/three/sceneUtils';

/**
 * The project as a physical model: past work as recorded, a glass plane for today, and the
 * scheduler's projection as estimated ghosts, with a replay that rebuilds any moment from the
 * recorded status changes.
 */
export default function ModelPage() {
  const { project } = useProjectContext();
  useDocumentTitle(`${project.name} · Model`);
  const { model, analysis, error, refetch } = useProjectModel(project);
  const canRender = useMemo(() => webglAvailable(), []);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
      <p className="max-w-4xl text-[13px] leading-relaxed text-muted">
        <span className="caps mr-2 text-ink">The project in time and space</span>
        Each block is a task: its length is the time it took, its height its priority, its row the person doing it. The graph below it counts the same tasks day by
        day. Drag either to rebuild any past day from the record; past today, outlines and dashed lines are the scheduler’s estimate.
      </p>

      {!canRender ? (
        <div className="border border-line bg-surface px-6 py-10">
          <p className="font-display text-xl font-light text-ink">This browser can’t draw 3D right now.</p>
          <p className="mt-2 max-w-xl text-[13px] text-muted">
            WebGL is turned off or unavailable. The same records are on the{' '}
            <Link to={`/projects/${project.id}/timeline`} className="text-accent hover:underline">
              Timeline
            </Link>{' '}
            and the{' '}
            <Link to={`/projects/${project.id}/map`} className="text-accent hover:underline">
              dependency map
            </Link>
            .
          </p>
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !model ? (
        <Skeleton className="h-[72vh]" />
      ) : model.blocks.length === 0 ? (
        <div className="border border-line bg-surface px-6 py-10">
          <p className="font-display text-xl font-light text-ink">Nothing to model yet.</p>
          <p className="mt-2 text-[13px] text-muted">Tasks appear here as blocks as soon as they’re created.</p>
        </div>
      ) : (
        <ProjectModelView model={model} projectId={project.id} className="min-h-[calc(100dvh-10rem)]" />
      )}

      {model && analysis && model.blocks.length > 0 && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <ModelAnalysis analysis={analysis} model={model} projectId={project.id} />
          <ProjectAssistant projectId={project.id} model={model} />
        </div>
      )}
    </div>
  );
}
