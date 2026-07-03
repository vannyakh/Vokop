import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UploadPage } from '@/pages/UploadPage';
import { StudioPage } from '@/pages/StudioPage';
import { RequireVideo } from '@/routes/guards/RequireVideo';
import { RequireAuth } from '@/routes/guards/RequireAuth';
import { ROUTES } from '@/routes/paths';

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
      </Routes>
    </BrowserRouter>
  );
}
