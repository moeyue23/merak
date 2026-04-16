import { Outlet } from 'react-router';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export default function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <SidebarTrigger className="mb-4 md:hidden" />
        <Outlet />
      </main>
    </SidebarProvider>
  );
}
