import { client } from '@/client/client.gen';
import { useState } from 'react';
import {
  useLoaderData,
  useFetcher,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router';
import { Users, Plus, X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Team {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  created_at: string;
}

interface TeamMember {
  id: number;
  team_id: number;
  user_id: number;
  role: string;
  created_at: string;
}

interface UserInfo {
  id: number;
  username: string;
  email: string;
}

export async function loader({ params }: LoaderFunctionArgs) {
  const [teamRes, membersRes, usersRes] = await Promise.allSettled([
    client.instance.get(`/teams/${params.id}`),
    client.instance.get(`/teams/${params.id}/members`),
    client.instance.get('/auth/users'),
  ]);

  const team = teamRes.status === 'fulfilled' ? (teamRes.value.data as { data: Team }).data : null;
  const members =
    membersRes.status === 'fulfilled' ? (membersRes.value.data as { data: TeamMember[] }).data : [];
  const allUsers =
    usersRes.status === 'fulfilled'
      ? (usersRes.value.data as { data: { users: UserInfo[] } }).data.users
      : [];

  return { team, members, allUsers };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const fd = await request.formData();
  const intent = fd.get('intent') as string;

  try {
    if (intent === 'add-member') {
      const res = await client.instance.post(`/teams/${params.id}/members`, {
        user_id: Number(fd.get('user_id')),
        role: fd.get('role') || 'member',
      });
      return (res.data as { data: TeamMember }).data;
    }
    if (intent === 'remove-member') {
      await client.instance.delete(`/teams/${params.id}/members/${fd.get('user_id')}`);
      return { ok: true };
    }
    return null;
  } catch {
    return null;
  }
}

export default function TeamDetailPage() {
  const { team, members, allUsers } = useLoaderData() as {
    team: Team | null;
    members: TeamMember[];
    allUsers: UserInfo[];
  };
  const [showAddMember, setShowAddMember] = useState(false);
  const addMemberFetcher = useFetcher();
  const removeFetcher = useFetcher();

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground">Team not found</p>
      </div>
    );
  }

  // Close modal on successful add
  if (addMemberFetcher.state === 'idle' && addMemberFetcher.data && showAddMember) {
    setShowAddMember(false);
  }

  const getUsername = (userId: number) =>
    allUsers.find(u => u.id === userId)?.username ?? `User #${userId}`;

  const nonMemberUsers = allUsers.filter(u => !members.some(m => m.user_id === u.id));

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold">{team.name}</h2>
        {team.description && (
          <p className="mt-2 text-muted-foreground text-sm">{team.description}</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Created by {getUsername(team.owner_id)} &middot;{' '}
          {new Date(team.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" />
          Members ({members.length})
        </h3>
        <Button
          size="sm"
          onClick={() => setShowAddMember(true)}
          disabled={nonMemberUsers.length === 0}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Member
        </Button>
      </div>

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No members yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {members.map(member => (
            <div
              key={member.id}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-card"
            >
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                {getUsername(member.user_id).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {getUsername(member.user_id)}
                  </span>
                  {member.role === 'admin' && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                      <Shield className="h-2.5 w-2.5" />
                      Admin
                    </span>
                  )}
                </div>
              </div>
              {member.role !== 'admin' && (
                <removeFetcher.Form method="post">
                  <input type="hidden" name="intent" value="remove-member" />
                  <input type="hidden" name="user_id" value={member.user_id} />
                  <button
                    type="submit"
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    title="Remove member"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </removeFetcher.Form>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add member modal */}
      {showAddMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowAddMember(false)}
        >
          <div
            className="bg-card rounded-xl p-6 w-full max-w-sm mx-4 ring-1 ring-foreground/10"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Add Member</h3>
            {nonMemberUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">All users are already members</p>
            ) : (
              <addMemberFetcher.Form method="post" className="space-y-4">
                <input type="hidden" name="intent" value="add-member" />
                <div>
                  <label htmlFor="user_id" className="text-sm font-medium mb-1 block">
                    User
                  </label>
                  <select
                    id="user_id"
                    name="user_id"
                    required
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select a user</option>
                    {nonMemberUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddMember(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add</Button>
                </div>
              </addMemberFetcher.Form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
