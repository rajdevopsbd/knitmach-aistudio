import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Onboarding } from './pages/Onboarding';
import { WorkerDashboard } from './pages/worker/Dashboard';
import { EmployerDashboard } from './pages/employer/Dashboard';
import { JobWizard } from './pages/employer/JobWizard';
import { CandidateSearch } from './pages/employer/CandidateSearch';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
              
              <Route element={<ProtectedRoute />}>
                <Route path="onboarding" element={<Onboarding />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['worker', 'admin']} />}>
                <Route path="worker/dashboard" element={<WorkerDashboard />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['employer', 'admin']} />}>
                <Route path="employer/dashboard" element={<EmployerDashboard />} />
                <Route path="employer/job-wizard" element={<JobWizard />} />
                <Route path="employer/search" element={<CandidateSearch />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
