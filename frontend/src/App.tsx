import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ConnectionProvider } from './context/ConnectionContext';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import ImportCsv from './pages/ImportCsv';
import Hives from './pages/Hives';
import Interventions from './pages/Interventions';
import Alerts from './pages/Alerts';
import './App.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConnectionProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <ErrorBoundary>
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/history" element={<History />} />
                            <Route path="/hives" element={<Hives />} />
                            <Route path="/import" element={<ImportCsv />} />
                            <Route path="/interventions" element={<Interventions />} />
                            <Route path="/alerts" element={<Alerts />} />
                          </Routes>
                        </ErrorBoundary>
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ConnectionProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
