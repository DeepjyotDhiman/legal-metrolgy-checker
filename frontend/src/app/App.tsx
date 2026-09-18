import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import AppRoutes from './routes';

/**
 * Root application component.
 * Wraps the app in BrowserRouter and AuthProvider so all children
 * can access routing and authentication context.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
