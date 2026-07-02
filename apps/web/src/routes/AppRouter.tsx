import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UploadPage } from '@/pages/UploadPage';
import { StudioPage } from '@/pages/StudioPage';
import { RequireVideo } from '@/routes/guards/RequireVideo';
import { RequireAdmin, RequireAuth } from '@/routes/guards/RequireAuth';
import { ROUTES } from '@/routes/paths';
import { AdminLayout } from '@/features/admin/components/AdminLayout';
import { AdminDashboardPage } from '@/features/admin/pages/AdminDashboardPage';
import { AdminUsersPage } from '@/features/admin/pages/AdminUsersPage';
import { AdminRbacPage } from '@/features/admin/pages/AdminRbacPage';
import { AdminMenusPage } from '@/features/admin/pages/AdminMenusPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.home} element={<UploadPage />} />
        <Route element={<RequireAuth />}>
          <Route
            path={ROUTES.studio}
            element={
              <RequireVideo>
                <StudioPage />
              </RequireVideo>
            }
          />
        </Route>
        <Route element={<RequireAdmin />}>
          <Route path={ROUTES.admin} element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="rbac" element={<AdminRbacPage />} />
            <Route path="menus" element={<AdminMenusPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
