import { Outlet } from 'react-router';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toast';

export default function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-hidden p-6 h-dvh">
        <SidebarTrigger className="mb-4 md:hidden" />
        <Outlet />
      </main>
      <Toaster />
    </SidebarProvider>
  );
}
