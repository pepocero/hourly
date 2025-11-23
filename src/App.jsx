import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Documentacion from './components/Documentacion';
import Layout from './components/Layout';

// Registrar Service Worker para PWA (deshabilitado temporalmente para evitar problemas de carga)
function registerServiceWorker() {
  // Service Worker deshabilitado temporalmente para evitar problemas de carga
  // Se puede habilitar más adelante si es necesario
  return;
  
  /* Código comentado - deshabilitar Service Worker
  if ('serviceWorker' in navigator) {
    // Esperar a que la página esté completamente cargada
    window.addEventListener('load', () => {
      // Pequeño delay para asegurar que la página esté lista
      setTimeout(() => {
        navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
          .then((registration) => {
            console.log('ServiceWorker registered successfully:', registration.scope);
            
            // Verificar actualizaciones periódicamente (solo si el registro fue exitoso)
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // Hay una nueva versión disponible
                    console.log('New service worker available');
                    // NO recargar automáticamente, dejar que el usuario decida
                  }
                });
              }
            });
          })
          .catch((error) => {
            // Solo loggear el error, no hacer nada más para no interrumpir la carga
            console.warn('ServiceWorker registration failed (non-critical):', error);
          });
      }, 1000);
    });
  }
  */
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
