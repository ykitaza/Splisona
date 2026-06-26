import { createBrowserRouter } from 'react-router-dom';
import { AuthGuard } from './components/auth/AuthGuard';
import { SignInPage } from './pages/SignInPage';
import { DashboardPage } from './pages/DashboardPage';
import { PersonaListPage } from './pages/PersonaListPage';
import { PersonaEditPage } from './pages/PersonaEditPage';
import { PersonaDetailPage } from './pages/PersonaDetailPage';
import { TestInputPage } from './pages/TestInputPage';
import { TestPersonaSelectPage } from './pages/TestPersonaSelectPage';
import { TestConfirmPage } from './pages/TestConfirmPage';
import { TestRunningPage } from './pages/TestRunningPage';
import { TestReportPage } from './pages/TestReportPage';

export const router = createBrowserRouter([
  { path: '/signin', element: <SignInPage /> },
  {
    element: <AuthGuard />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/personas', element: <PersonaListPage /> },
      { path: '/personas/new', element: <PersonaEditPage /> },
      { path: '/personas/:id', element: <PersonaDetailPage /> },
      { path: '/personas/:id/edit', element: <PersonaEditPage /> },
      { path: '/tests/new', element: <TestInputPage /> },
      { path: '/tests/new/personas', element: <TestPersonaSelectPage /> },
      { path: '/tests/new/confirm', element: <TestConfirmPage /> },
      { path: '/tests/:id/running', element: <TestRunningPage /> },
      { path: '/tests/:id/report', element: <TestReportPage /> },
    ],
  },
]);
