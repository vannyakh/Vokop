import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { UploadPage } from '@/pages/UploadPage';
import { StudioPage } from '@/pages/StudioPage';
import { RequireVideo } from '@/routes/guards/RequireVideo';
import { ROUTES } from '@/routes/paths';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.home} element={<UploadPage />} />
        <Route
          path={ROUTES.studio}
          element={
            <RequireVideo>
              <StudioPage />
            </RequireVideo>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
