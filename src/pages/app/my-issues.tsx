import { client } from '@/client/client.gen';
import { useState } from 'react';
import { useLoaderData, useFetcher, type ActionFunctionArgs } from 'react-router';
import { Plus, CircleDot, CheckCircle2, Play, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { timeAgo } from '@/lib/time';

interface Issue {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  project_id: number;
  assignee_id: number;
  reporter_id: number;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: number;
  name: string;
}

export async function loader() {
  const [issuesRes, projectsRes] = await Promise.allSettled([
    client.instance.get('/issues?assignee_id=me'),
    client.instance.get('/projects'),
  ]);

  const issues =
    issuesRes.status === 'fulfilled' ? (issuesRes.value.data as { data: Issue[] }).data : [];
  const projects =
    projectsRes.status === 'fulfilled' ? (projectsRes.value.data as { data: Project[] }).data : [];

  return { issues, projects };
}

export async function action({ request }: ActionFunctionArgs) {
  const fd = await request.formData();
  try {
    if (request.method === 'POST') {
      const res = await client.instance.post('/issues', {
        title: fd.get('title'),
        description: fd.get('description') || '',
        project_id: Number(fd.get('project_id')),
        priority: fd.get('priority'),
        assignee_id: Number(fd.get('assignee_id')) || undefined,
      });
      return (res.data as { data: Issue }).data;
    }
    if (request.method === 'PUT') {
      const id = fd.get('id') as string;
      const status = fd.get('status') as string;
      const res = await client.instance.put(`/issues/${id}`, { status });
      return (res.data as { data: Issue }).data;
    }
    if (request.method === 'DELETE') {
      const id = fd.get('id') as string;
      await client.instance.delete(`/issues/${id}`);
      return { ok: true };
    }
    return null;
  } catch {
    return null;
  }
}

const STATUS_CONFIG = {
  todo: { icon: CircleDot, className: 'text-muted-foreground' },
  in_progress: { icon: Play, className: 'text-blue-500' },
  done: { icon: CheckCircle2, className: 'text-green-500' },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  urgent: {
    label: 'Urgent',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  high: {
    label: 'High',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  medium: {
    label: 'Medium',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  low: {
    label: 'Low',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
};

const STATUS_ORDER = ['todo', 'in_progress', 'done'];

function nextStatus(current: string): string {
  const idx = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
}

export default function MyIssuesPage() {
  const { issues, projects } = useLoaderData() as {
    issues: Issue[];
    projects: Project[];
  };
  const [showCreate, setShowCreate] = useState(false);
  const createFetcher = useFetcher();
  const statusFetcher = useFetcher();

  const getProjectName = (projectId: number) =>
    projects.find(p => p.id === projectId)?.name ?? `Project #${projectId}`;

  // Close modal on successful creation
  if (createFetcher.state === 'idle' && createFetcher.data && showCreate) {
    setShowCreate(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">My Issues</h2>
          <p className="mt-1 text-muted-foreground text-sm">Issues assigned to you</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Issue
        </Button>
      </div>

      {issues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CircleDot className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">No issues assigned to you</p>
          <Button variant="outline" className="mt-4" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create your first issue
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {issues.map(issue => {
            const StatusIcon =
              STATUS_CONFIG[issue.status as keyof typeof STATUS_CONFIG]?.icon ?? CircleDot;
            const statusClass =
              STATUS_CONFIG[issue.status as keyof typeof STATUS_CONFIG]?.className ?? '';

            return (
              <div
                key={issue.id}
                className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <button
                  onClick={() => {
                    const fd = new FormData();
                    fd.set('id', String(issue.id));
                    fd.set('status', nextStatus(issue.status));
                    statusFetcher.submit(fd, { method: 'put', action: '/app/my-issues' });
                  }}
                  className="shrink-0 cursor-pointer"
                  title={`Status: ${issue.status}. Click to change.`}
                >
                  <StatusIcon className={`h-5 w-5 ${statusClass}`} />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm truncate ${issue.status === 'done' ? 'line-through text-muted-foreground' : 'font-medium'}`}
                    >
                      {issue.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted inline-flex items-center gap-1">
                      <FolderKanban className="h-3 w-3" />
                      {getProjectName(issue.project_id)}
                    </span>
                  </div>
                </div>

                <span
                  className={`shrink-0 text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_CONFIG[issue.priority]?.className ?? ''}`}
                >
                  {PRIORITY_CONFIG[issue.priority]?.label ?? issue.priority}
                </span>

                <span className="shrink-0 text-xs text-muted-foreground w-16 text-right">
                  {timeAgo(issue.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-card rounded-xl p-6 w-full max-w-md mx-4 ring-1 ring-foreground/10"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Create Issue</h3>
            <createFetcher.Form method="post" className="space-y-4">
              <div>
                <label htmlFor="title" className="text-sm font-medium mb-1 block">
                  Title
                </label>
                <Input id="title" name="title" placeholder="Issue title" required autoFocus />
              </div>
              <div>
                <label htmlFor="description" className="text-sm font-medium mb-1 block">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Optional description"
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                />
              </div>
              <div>
                <label htmlFor="project_id" className="text-sm font-medium mb-1 block">
                  Project
                </label>
                <select
                  id="project_id"
                  name="project_id"
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select a project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="priority" className="text-sm font-medium mb-1 block">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  defaultValue="medium"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </div>
            </createFetcher.Form>
          </div>
        </div>
      )}
    </div>
  );
}
