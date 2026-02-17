import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { PageContainer } from './components/layout/PageContainer';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { CreateMemorialPage } from './pages/memorial/CreateMemorialPage';
import { MemorialPage } from './pages/memorial/MemorialPage';
import { EditMemorialPage } from './pages/memorial/EditMemorialPage';
import { SharedMemorialPage } from './pages/memorial/SharedMemorialPage';
import { NotFoundPage } from './pages/NotFoundPage';
import './App.css';

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <PageContainer>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/memorials/shared/:token" element={<SharedMemorialPage />} />
        <Route path="/memorials/:id" element={<MemorialPage />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/memorials/new"
          element={
            <ProtectedRoute>
              <CreateMemorialPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/memorials/:id/edit"
          element={
            <ProtectedRoute>
              <EditMemorialPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </PageContainer>
  );
}

export default App;
