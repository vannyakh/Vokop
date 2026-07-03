import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ADMIN_ROUTES } from '@vokop/shared';
import { AdminShellLayout } from '@/routes/AdminShellLayout';
import { GuestOnly } from '@/routes/guards/GuestOnly';
import { RequireAdmin } from '@/routes/guards/RequireAdmin';
import { RequireAuth } from '@/routes/guards/RequireAuth';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { UsersPage } from '@/pages/UsersPage';
import { RbacPage } from '@/pages/RbacPage';
import { MenusPage } from '@/pages/MenusPage';
import { ActivityLogPage } from '@/pages/ActivityLogPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <GuestOnly />,
    children: [{ index: true, element: <LoginPage /> }],
  },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        element: <RequireAdmin />,
        children: [
          {
            element: <AdminShellLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'users', element: <UsersPage /> },
              { path: 'rbac', element: <RbacPage /> },
              { path: 'menus', element: <MenusPage /> },
              { path: 'activity', element: <ActivityLogPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to={ADMIN_ROUTES.home} replace /> },
]);
