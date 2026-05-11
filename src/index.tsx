import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/models/auth-context';
import '@/i18n';
import '@/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';

import AppLayout from '@/layouts/layout';
import Landing from '@/pages';
import InboxPage, { loader as inboxLoader, action as inboxAction } from '@/pages/app/inbox';
import MyIssuesPage from '@/pages/app/my-issues';
import EngineeringPage from '@/pages/app/teams/engineering';
import PrivateTeamPage from '@/pages/app/teams/private-team';
import WorkspaceMorePage from '@/pages/app/workspace/more';
import WorkspaceProjectsPage, {
  loader as projectsLoader,
  action as projectsAction,
} from '@/pages/app/workspace/projects';
import WorkspaceViewsPage from '@/pages/app/workspace/views';
import Login from '@/pages/login';
import Register from '@/pages/register';
import WorkspaceInitiativesPage from './pages/app/workspace/initiatives';
import WorkspaceMembersPage from './pages/app/workspace/members';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <Landing />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { path: 'inbox', loader: inboxLoader, action: inboxAction, element: <InboxPage /> },
      { path: 'my-issues', element: <MyIssuesPage /> },
      { path: 'workspace/initiatives', element: <WorkspaceInitiativesPage /> },
      {
        path: 'workspace/projects',
        loader: projectsLoader,
        action: projectsAction,
        element: <WorkspaceProjectsPage />,
      },
      { path: 'workspace/views', element: <WorkspaceViewsPage /> },
      { path: 'workspace/members', element: <WorkspaceMembersPage /> },
      { path: 'workspace/more', element: <WorkspaceMorePage /> },
      { path: 'teams/engineering', element: <EngineeringPage /> },
      { path: 'teams/private-team', element: <PrivateTeamPage /> },
    ],
  },
]);

const root = document.getElementById('root') as HTMLDivElement;

createRoot(root).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
