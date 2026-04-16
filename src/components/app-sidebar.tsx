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
import { Briefcase, ChevronDownIcon, CircleDot, Inbox, Settings, User, Users } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router';

export function AppSidebar() {
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [teamsOpen, setTeamsOpen] = useState(true);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="px-4 py-3 text-lg font-semibold">Merak</div>
      </SidebarHeader>

      <SidebarContent className="gap-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/app/inbox" className="flex items-center gap-2">
                <Inbox className="h-4 w-4" />
                <span>Inbox</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/app/my-issues" className="flex items-center gap-2">
                <CircleDot className="h-4 w-4" />
                <span>My issues</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarMenuItem>
          <Collapsible open={workspaceOpen} onOpenChange={setWorkspaceOpen}>
            <CollapsibleTrigger className="w-full">
              <SidebarMenuButton className="w-full">
                <Briefcase className="h-4 w-4" />
                <span>Workspace</span>
                <ChevronDownIcon
                  className={`ml-auto transition-transform ${workspaceOpen ? 'rotate-180' : ''}`}
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton href="/app/workspace/initiatives">
                    Initiatives
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton href="/app/workspace/projects">
                    Projects
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton href="/app/workspace/views">Views</SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton href="/app/workspace/more">More</SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <Collapsible open={teamsOpen} onOpenChange={setTeamsOpen}>
            <CollapsibleTrigger className="w-full">
              <SidebarMenuButton className="w-full">
                <Users className="h-4 w-4" />
                <span>Teams</span>
                <ChevronDownIcon
                  className={`ml-auto transition-transform ${teamsOpen ? 'rotate-180' : ''}`}
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton href="/app/teams/engineering">
                    Engineering
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton href="/app/teams/private-team">
                    Private team
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuItem>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenuButton className="w-full">
          <User className="h-4 w-4" />
          <span>userName</span>
          <Settings className="ml-auto h-4 w-4" />
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
