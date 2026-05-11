import { client } from '@/client/client.gen';
import { useState } from 'react';
import { useLoaderData, useFetcher, type ActionFunctionArgs } from 'react-router';
import { Plus, FolderKanban, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface Project {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export async function loader() {
  try {
    const res = await client.instance.get('/projects');
    return (res.data as { data: Project[] }).data;
  } catch {
    return [] as Project[];
  }
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    if (request.method === 'POST') {
      const fd = await request.formData();
      const res = await client.instance.post('/projects', {
        name: fd.get('name'),
        description: fd.get('description'),
      });
      return (res.data as { data: Project }).data;
    }
    if (request.method === 'DELETE') {
      const fd = await request.formData();
      await client.instance.delete(`/projects/${fd.get('id')}`);
    }
    return null;
  } catch {
    return null;
  }
}

export default function WorkspaceProjectsPage() {
  const projects = useLoaderData() as Project[];
  const [showCreate, setShowCreate] = useState(false);
  const deleteFetcher = useFetcher();
  const createFetcher = useFetcher();

  // Close modal only on successful submission
  if (createFetcher.state === 'idle' && createFetcher.data && showCreate) {
    setShowCreate(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <p className="mt-1 text-muted-foreground text-sm">Manage your projects and initiatives</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderKanban className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">No projects yet</p>
          <Button variant="outline" className="mt-4" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create your first project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <Card key={project.id} className="group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>{project.name}</CardTitle>
                  <deleteFetcher.Form method="delete">
                    <input type="hidden" name="id" value={project.id} />
                    <button
                      type="submit"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                      title="Delete project"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </deleteFetcher.Form>
                </div>
                {project.description && (
                  <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">
                  Created {new Date(project.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create project modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-card rounded-xl p-6 w-full max-w-md mx-4 ring-1 ring-foreground/10"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Create Project</h3>
            <createFetcher.Form method="post" className="space-y-4">
              <div>
                <label htmlFor="name" className="text-sm font-medium mb-1 block">
                  Name
                </label>
                <Input id="name" name="name" placeholder="Project name" required autoFocus />
              </div>
              <div>
                <label htmlFor="description" className="text-sm font-medium mb-1 block">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Brief description of the project"
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                />
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
