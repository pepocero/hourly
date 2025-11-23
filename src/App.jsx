import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Documentacion from './components/Documentacion';
import Layout from './components/Layout';

// Registrar Service Worker para PWA
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          console.log('ServiceWorker registered successfully:', registration.scope);
          
          // Verificar actualizaciones periódicamente
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Hay una nueva versión disponible
                  console.log('New service worker available');
                  // Recargar la página para usar la nueva versión
                  window.location.reload();
                }
              });
            }
          });
          
          // Verificar actualizaciones cada hora
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch((error) => {
          console.error('ServiceWorker registration failed:', error);
          // Si falla el registro, intentar desregistrar cualquier SW anterior
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((reg) => {
              reg.unregister().then((success) => {
                if (success) {
                  console.log('Old service worker unregistered');
                  // Recargar después de desregistrar
                  window.location.reload();
                }
              });
            });
          });
        });
    });
  }
}

// Componente para rutas protegidas
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/" />;
}

// Componente para rutas públicas (solo para usuarios no autenticados)
function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
}

function App() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Página de presentación - siempre accesible */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Rutas públicas */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } 
          />
          
          {/* Rutas protegidas */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/documentacion" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Documentacion />
                </Layout>
              </ProtectedRoute>
            } 
          />
          
          {/* Ruta 404 */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
