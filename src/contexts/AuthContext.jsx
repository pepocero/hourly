import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext();

const USER_KEY = 'user';

function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function readStoredUser() {
  const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistUser(user, rememberMe) {
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(USER_KEY);
  if (!user) return;
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem(USER_KEY, JSON.stringify(user));
}

function isUnauthorizedError(error) {
  const msg = (error?.message || '').toLowerCase();
  return (
    msg.includes('token inválido') ||
    msg.includes('token invalido') ||
    msg.includes('token expirado') ||
    msg.includes('token no proporcionado') ||
    msg.includes('no autorizado') ||
    msg.includes('unauthorized') ||
    msg.includes('401')
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Verificar token al cargar la aplicación
  useEffect(() => {
    checkAuth();
  }, []);

  const clearSession = () => {
    apiService.setToken(null);
    persistUser(null, true);
    setUser(null);
    setIsAuthenticated(false);
  };

  const checkAuth = async () => {
    try {
      let rememberMe = localStorage.getItem('rememberMe') === 'true';
      let token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const storedUser = readStoredUser();

      // En PWA instalada, migrar sesión de sessionStorage a localStorage
      // para que no se pierda al cerrar la app
      if (token && isStandalonePwa()) {
        rememberMe = true;
        const sessionOnly = !localStorage.getItem('token') && !!sessionStorage.getItem('token');
        if (sessionOnly || !localStorage.getItem('rememberMe')) {
          apiService.setToken(token, true);
          if (storedUser) persistUser(storedUser, true);
          token = localStorage.getItem('token');
          rememberMe = true;
        }
      }

      if (!token) {
        return;
      }

      apiService.setToken(token, rememberMe || !!localStorage.getItem('token'));

      // Restaurar sesión de inmediato (evita pedir login mientras se verifica)
      if (storedUser) {
        setUser(storedUser);
        setIsAuthenticated(true);
      } else {
        // Hay token: mantener autenticado aunque falte el perfil cacheado
        setIsAuthenticated(true);
      }

      try {
        const response = await apiService.verifyToken();

        if (response && response.success) {
          setUser(response.data.user);
          setIsAuthenticated(true);
          persistUser(response.data.user, rememberMe || !!localStorage.getItem('token'));
        } else {
          clearSession();
        }
      } catch (verifyError) {
        // Solo cerrar sesión si el servidor rechaza el token de forma explícita.
        // Timeouts / red / API caída: conservar la sesión persistida.
        if (isUnauthorizedError(verifyError)) {
          clearSession();
        } else {
          console.warn('No se pudo verificar el token (API no disponible):', verifyError);
          if (storedUser) {
            setUser(storedUser);
          }
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      // No borrar credenciales ante errores inesperados de arranque
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, rememberMe = true) => {
    try {
      // En PWA instalada siempre persistir sesión
      const shouldRemember = rememberMe || isStandalonePwa();
      const response = await apiService.login(email, password, shouldRemember);
      if (response.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        persistUser(response.data.user, shouldRemember);
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password, name) => {
    try {
      const response = await apiService.register(email, password, name);
      if (response.success) {
        // Después del registro exitoso, hacer login automáticamente (sesión persistente)
        return await login(email, password, true);
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Error al hacer logout:', error);
    } finally {
      clearSession();
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
