import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard } from './AuthGuard';
import { SignInPage } from './SignInPage';
import { PersonaListPage } from '@/features/persona/PersonaListPage';
import { PersonaEditPage } from '@/features/persona/PersonaEditPage';
import { PersonaUnifiedPage } from '@/features/persona/PersonaUnifiedPage';
import { TestInputPage } from '@/features/test/TestInputPage';
import { TestRunningPage } from '@/features/test/TestRunningPage';
import { TestReportPage } from '@/features/report/TestReportPage';
import { TestListPage } from '@/features/test/TestListPage';
import { ProjectListPage } from '@/features/project/ProjectListPage';
import { ProjectDetailPage } from '@/features/project/ProjectDetailPage';

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
