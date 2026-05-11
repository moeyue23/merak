import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type Modifier,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Briefcase,
  ChevronDownIcon,
  CircleDot,
  Inbox,
  LogOut,
  Plus,
  User,
  Users,
} from 'lucide-react';
import { SearchCommand } from '@/components/search-command';
import { client } from '@/client/client.gen';
import { useState, useRef, useEffect } from 'react';
import { NavLink, useRevalidator, useRouteLoaderData } from 'react-router';
import { useAuth } from '@/models/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SortableSubItemProps {
  item: {
    id: string;
    label: string;
    href: string;
  };
}

// 自定义 modifier：限制在父元素容器内
const restrictToParentElement: Modifier = ({ transform, activeNodeRect, containerNodeRect }) => {
  if (!activeNodeRect || !containerNodeRect) {
    return transform;
  }

  const activeHeight = activeNodeRect.height;

  // 计算元素当前的 y 位置（相对于容器）
  const activeY = activeNodeRect.top - containerNodeRect.top + transform.y;

  // 限制在容器内：不能超出顶部，不能超出底部
  const minY = 0;
  const maxY = containerNodeRect.height - activeHeight;

  let clampedY = activeY;
  if (clampedY < minY) clampedY = minY;
  if (clampedY > maxY) clampedY = maxY;

  // 转换回 transform 的增量
  const newTransformY = clampedY - (activeNodeRect.top - containerNodeRect.top);

  return {
    ...transform,
    y: newTransformY,
  };
};

function SortableSubItem({ item }: SortableSubItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <SidebarMenuSubItem className="cursor-grab active:cursor-grabbing">
        <SidebarMenuSubButton
          render={
            <NavLink to={item.href} style={{ pointerEvents: isDragging ? 'none' : undefined }} />
          }
        >
          {item.label}
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    </div>
  );
}

function EditableUsername({
  username,
  onSave,
}: {
  username: string;
  onSave: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(username);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== username) {
      onSave(trimmed);
    } else {
      setValue(username);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="flex-1 min-w-0 bg-transparent text-sm outline-2 outline-blue-500 rounded px-0.5"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={e => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') {
            setValue(username);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <span
      className="flex-1 min-w-0 text-sm truncate cursor-pointer hover:text-blue-400 transition-colors"
      onClick={() => setEditing(true)}
      title="Click to rename"
    >
      {username}
    </span>
  );
}

export function AppSidebar() {
  const { user, logout, updateUser } = useAuth();
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [teamsOpen, setTeamsOpen] = useState(true);
  const [workspaceItems, setWorkspaceItems] = useState([
    { id: 'initiatives', label: 'Initiatives', href: '/app/workspace/initiatives' },
    { id: 'projects', label: 'Projects', href: '/app/workspace/projects' },
    { id: 'views', label: 'Views', href: '/app/workspace/views' },
  ]);
  const moreItem = { id: 'more', label: 'More', href: '/app/workspace/more' };
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const layoutTeams =
    (useRouteLoaderData('layout') as { id: number; name: string }[] | undefined) ?? [];

  const [teamsItems, setTeamsItems] = useState<{ id: string; label: string; href: string }[]>([]);

  useEffect(() => {
    setTeamsItems(
      layoutTeams.map(t => ({
        id: String(t.id),
        label: t.name,
        href: `/app/teams/${t.id}`,
      }))
    );
  }, [layoutTeams]);

  const revalidator = useRevalidator();

  const handleCreateTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await client.instance.post('/teams', {
        name: fd.get('name'),
        description: fd.get('description'),
      });
      setShowCreateTeam(false);
      revalidator.revalidate();
    } catch {
      // Silently fail — form submission doesn't need error UI for V1
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (
    event: { active: { id: string | number }; over: { id: string | number } | null },

    setItems: React.Dispatch<React.SetStateAction<{ id: string; label: string; href: string }[]>>
  ) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems(items => {
        const oldIndex = items.findIndex(item => item.id === String(active.id));
        const newIndex = items.findIndex(item => item.id === String(over.id));
        if (oldIndex === -1 || newIndex === -1) return items;
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-4 py-3 text-lg font-semibold">Merak</div>
        <div className="px-2 pb-2">
          <SearchCommand />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/app/inbox" className="flex w-full items-center gap-2">
                <Inbox className="h-4 w-4" />
                <span>Inbox</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/app/my-issues" className="flex w-full items-center gap-2">
                <CircleDot className="h-4 w-4" />
                <span>My issues</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarMenuItem>
          <Collapsible open={workspaceOpen} onOpenChange={setWorkspaceOpen}>
            <CollapsibleTrigger
              className="w-full"
              render={
                <SidebarMenuButton className="w-full">
                  <Briefcase className="h-4 w-4" />
                  <span>Workspace</span>
                  <ChevronDownIcon
                    className={`ml-auto transition-transform ${workspaceOpen ? 'rotate-180' : ''}`}
                  />
                </SidebarMenuButton>
              }
            ></CollapsibleTrigger>

            <CollapsibleContent>
              <SidebarMenuSub>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                  onDragEnd={e => handleDragEnd(e, setWorkspaceItems)}
                >
                  <SortableContext
                    items={workspaceItems.map(i => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {workspaceItems.map(item => (
                      <SortableSubItem key={item.id} item={item} />
                    ))}
                  </SortableContext>
                </DndContext>

                <SidebarMenuSubItem>
                  <SidebarMenuSubButton render={<NavLink to={moreItem.href} />}>
                    {moreItem.label}
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <Collapsible open={teamsOpen} onOpenChange={setTeamsOpen}>
            <CollapsibleTrigger
              className="w-full"
              render={
                <SidebarMenuButton className="w-full">
                  <Users className="h-4 w-4" />
                  <span>Teams</span>
                  <span
                    onClick={e => {
                      e.stopPropagation();
                      setShowCreateTeam(true);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        setShowCreateTeam(true);
                      }
                    }}
                    className="ml-1 p-0.5 rounded hover:bg-accent cursor-pointer"
                    title="Create team"
                    role="button"
                    tabIndex={0}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                  <ChevronDownIcon
                    className={`transition-transform ${teamsOpen ? 'rotate-180' : ''}`}
                  />
                </SidebarMenuButton>
              }
            ></CollapsibleTrigger>

            <CollapsibleContent>
              <SidebarMenuSub>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                  onDragEnd={e => handleDragEnd(e, setTeamsItems)}
                >
                  <SortableContext
                    items={teamsItems.map(i => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {teamsItems.map(item => (
                      <SortableSubItem key={item.id} item={item} />
                    ))}
                  </SortableContext>
                </DndContext>
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuItem>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenuButton className="w-full">
          <User className="h-4 w-4 shrink-0" />
          <EditableUsername
            username={user?.username ?? 'Guest'}
            onSave={name => updateUser({ username: name })}
          />
          <span
            onClick={logout}
            className="ml-auto cursor-pointer shrink-0"
            title="Log out"
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') logout();
            }}
          >
            <LogOut className="h-4 w-4" />
          </span>
        </SidebarMenuButton>
      </SidebarFooter>

      {/* Create team modal */}
      {showCreateTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowCreateTeam(false)}
        >
          <div
            className="bg-card rounded-xl p-6 w-full max-w-sm mx-4 ring-1 ring-foreground/10"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Create Team</h3>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label htmlFor="team-name" className="text-sm font-medium mb-1 block">
                  Name
                </label>
                <Input id="team-name" name="name" placeholder="Team name" required autoFocus />
              </div>
              <div>
                <label htmlFor="team-desc" className="text-sm font-medium mb-1 block">
                  Description
                </label>
                <textarea
                  id="team-desc"
                  name="description"
                  placeholder="Brief description"
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateTeam(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Sidebar>
  );
}
