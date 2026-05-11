import { Outlet } from 'react-router';
import { AppSidebar } from '@/components/app-sidebar';
import { client } from '@/client/client.gen';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toast';

interface Team {
  id: number;
  name: string;
}

export async function loader() {
  try {
    const res = await client.instance.get('/teams');
    return (res.data as { data: Team[] }).data;
  } catch {
    return [] as Team[];
  }
}

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
