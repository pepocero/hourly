import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext();

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

  const checkAuth = async () => {
    try {
      const rememberMe = localStorage.getItem('rememberMe') === 'true';
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        apiService.setToken(token, rememberMe || !!localStorage.getItem('token'));
        // Agregar timeout para no bloquear la carga si la API no responde
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        
        try {
          const response = await Promise.race([
            apiService.verifyToken(),
            timeoutPromise
          ]);
          
          if (response && response.success) {
            setUser(response.data.user);
            setIsAuthenticated(true);
          } else {
            // Token inválido, limpiar
            apiService.setToken(null);
          }
        } catch (timeoutError) {
          // Si hay timeout o error de conexión, no borrar el token:
          // con "Recuérdame" debe persistir para reintentar en la siguiente carga
          console.warn('No se pudo verificar el token (API no disponible):', timeoutError);
        }
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      apiService.setToken(null);
    } finally {
      // Siempre marcar como no cargando, incluso si hay errores
      setLoading(false);
    }
  };

  const login = async (email, password, rememberMe = false) => {
    try {
      const response = await apiService.login(email, password, rememberMe);
      if (response.success) {
        setUser(response.data.user);
        setIsAuthenticated(true);
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
        // Después del registro exitoso, hacer login automáticamente
        return await login(email, password);
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
      setUser(null);
      setIsAuthenticated(false);
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
