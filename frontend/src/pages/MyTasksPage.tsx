import { CheckSquare, Search, SearchX, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMyTasksQuery } from '@/api/endpoints';
import type { DueFilter, Priority, TaskSort, TaskStatus } from '@/api/types';
import { PageContainer } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Segmented } from '@/components/ui/Segmented';
import { Skeleton } from '@/components/ui/Spinner';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { TaskTable } from '@/features/tasks/TaskTable';
import { PRIORITIES, PRIORITY_LABEL } from '@/lib/constants';
import { useDebouncedValue, useDocumentTitle, useUrlState } from '@/lib/hooks';

const DEFAULTS = { q: '', status: 'OPEN', priority: '', due: '', sort: 'dueDate', dir: 'asc', page: '0' };

export function MyTasksPage() {
  useDocumentTitle('My work');
  const [f, setF] = useUrlState(DEFAULTS);
  const [search, setSearch] = useState(f.q);
  const debounced = useDebouncedValue(search.trim(), 300);
  useEffect(() => {
    if (debounced !== f.q) setF({ q: debounced, page: '0' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const { data, isLoading, isFetching, isError, error, refetch } = useMyTasksQuery({
    search: f.q,
    status: f.status === 'ALL' ? '' : (f.status as TaskStatus | 'OPEN'),
    priority: f.priority as Priority | '',
    due: f.due as DueFilter | '',
    sort: f.sort as TaskSort,
    direction: f.dir as 'asc' | 'desc',
    page: Number(f.page),
    size: 20,
  });

  const filtered = Boolean(f.q || f.priority || f.due || (f.status !== 'OPEN' && f.status !== 'ALL'));
  const clear = () => {
    setSearch('');
    setF({ q: '', priority: '', due: '', status: 'OPEN', page: '0' });
  };

  return (
    <PageContainer>
      <PageHeader eyebrow="My work" title="Assigned to you" description="Everything assigned to you across all projects." />

      <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Segmented
            label="Status"
            value={f.status}
            onChange={(status) => setF({ status, page: '0' })}
            options={[
              { value: 'OPEN', label: 'Open' },
              { value: 'TODO', label: 'To Do' },
              { value: 'IN_PROGRESS', label: 'In Progress' },
              { value: 'IN_REVIEW', label: 'In Review' },
              { value: 'DONE', label: 'Done' },
              { value: 'ALL', label: 'All' },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-56">
            <Input leftIcon={<Search />} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search my tasks" aria-label="Search my tasks" />
          </div>
          <Select aria-label="Priority" value={f.priority} onChange={(e) => setF({ priority: e.target.value, page: '0' })} className="w-[calc(50%-4px)] sm:w-36">
            <option value="">Any priority</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </Select>
          <Select aria-label="Due date" value={f.due} onChange={(e) => setF({ due: e.target.value, page: '0' })} className="w-[calc(50%-4px)] sm:w-36">
            <option value="">Any due date</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="week">Next 7 days</option>
            <option value="none">No due date</option>
          </Select>
          {filtered && (
            <Button variant="ghost" size="sm" leftIcon={<X />} onClick={clear}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState error={error} onRetry={refetch} title="Couldn’t load your tasks" />
        ) : data && data.content.length > 0 ? (
          <>
            <TaskTable tasks={data.content} sort={f.sort as TaskSort} direction={f.dir as 'asc' | 'desc'} onSort={(sort, dir) => setF({ sort, dir, page: '0' })} showProject dimmed={isFetching} />
            <Pagination page={data.page} totalPages={data.totalPages} totalElements={data.totalElements} size={data.size} onPageChange={(p) => setF({ page: String(p) })} noun="tasks" />
          </>
        ) : filtered ? (
          <EmptyState icon={SearchX} title="No tasks match these filters" action={<Button variant="secondary" onClick={clear}>Clear filters</Button>} />
        ) : (
          <EmptyState icon={CheckSquare} title="Nothing assigned to you" description="Tasks assigned to you in any project will show up here." />
        )}
      </div>
    </PageContainer>
  );
}
