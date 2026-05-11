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
import { Briefcase, ChevronDownIcon, CircleDot, Inbox, LogOut, User, Users } from 'lucide-react';
import { SearchCommand } from '@/components/search-command';
import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router';
import { useAuth } from '@/models/auth-context';

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
  const [teamsItems, setTeamsItems] = useState([
    { id: 'engineering', label: 'Engineering', href: '/app/teams/engineering' },
    { id: 'private-team', label: 'Private team', href: '/app/teams/private-team' },
  ]);

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
                  <ChevronDownIcon
                    className={`ml-auto transition-transform ${teamsOpen ? 'rotate-180' : ''}`}
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
    </Sidebar>
  );
}
