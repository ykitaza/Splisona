import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard } from './components/auth/AuthGuard';
import { SignInPage } from './pages/SignInPage';
import { DashboardPage } from './pages/DashboardPage';
import { PersonaListPage } from './pages/PersonaListPage';
import { PersonaEditPage } from './pages/PersonaEditPage';
import { PersonaDetailPage } from './pages/PersonaDetailPage';
import { PersonaUnifiedPage } from './pages/PersonaUnifiedPage';
import { TestInputPage } from './pages/TestInputPage';
import { TestRunningPage } from './pages/TestRunningPage';
import { TestReportPage } from './pages/TestReportPage';
import { TestListPage } from './pages/TestListPage';
import { ProjectListPage } from './pages/ProjectListPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';

export const routeConfig = [
  { path: '/signin', element: <SignInPage /> },
  {
    element: <AuthGuard />,
    children: [
      { path: '/', element: <Navigate to="/personas" replace /> },
      { path: '/dashboard', element: <Navigate to="/personas" replace /> },
      { path: '/personas', element: <PersonaListPage /> },
      { path: '/personas/new', element: <PersonaEditPage /> },
      { path: '/personas/:id', element: <PersonaUnifiedPage /> },
      { path: '/personas/:id/edit', element: <PersonaUnifiedPage /> },
      { path: '/tests/new', element: <TestInputPage /> },
      { path: '/tests/:id/running', element: <TestRunningPage /> },
      { path: '/tests/:id/report', element: <TestReportPage /> },
      { path: '/results', element: <TestListPage /> },
      { path: '/projects', element: <ProjectListPage /> },
      { path: '/projects/:id', element: <ProjectDetailPage /> },
    ],
  },
];

export const router = createBrowserRouter(routeConfig);
