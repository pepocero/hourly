// Servicio para comunicación con la API

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('token');
  }

  // Actualizar token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  // Obtener headers con autenticación
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Método base para hacer requests
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en la petición');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Métodos de autenticación
  async register(email, password, name) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email, password) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async logout() {
    await this.request('/auth/logout', {
      method: 'POST',
    });
    this.setToken(null);
  }

  async verifyToken() {
    return this.request('/auth/verify', {
      method: 'POST',
    });
  }

  // Métodos de proyectos
  async getProyectos() {
    return this.request('/api/proyectos');
  }

  async createProyecto(proyecto) {
    return this.request('/api/proyectos', {
      method: 'POST',
      body: JSON.stringify(proyecto),
    });
  }

  async updateProyecto(id, proyecto) {
    return this.request(`/api/proyectos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(proyecto),
    });
  }

  async deleteProyecto(id) {
    return this.request(`/api/proyectos/${id}`, {
      method: 'DELETE',
    });
  }

  // Métodos de horas trabajadas
  async getHoras(fechaInicio = null, fechaFin = null) {
    const params = new URLSearchParams();
    if (fechaInicio) params.append('fecha_inicio', fechaInicio);
    if (fechaFin) params.append('fecha_fin', fechaFin);

    const endpoint = `/api/horas${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async createHora(hora) {
    return this.request('/api/horas', {
      method: 'POST',
      body: JSON.stringify(hora),
    });
  }

  async updateHora(id, hora) {
    return this.request(`/api/horas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(hora),
    });
  }

  async deleteHora(id) {
    return this.request(`/api/horas/${id}`, {
      method: 'DELETE',
    });
  }

  async getResumenHoras(fechaInicio = null, fechaFin = null) {
    const params = new URLSearchParams();
    if (fechaInicio) params.append('fecha_inicio', fechaInicio);
    if (fechaFin) params.append('fecha_fin', fechaFin);

    const endpoint = `/api/horas/resumen${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request(endpoint);
  }

  // Exportar CSV
  async exportarCSV(fechaInicio = null, fechaFin = null) {
    const params = new URLSearchParams();
    if (fechaInicio) params.append('fecha_inicio', fechaInicio);
    if (fechaFin) params.append('fecha_fin', fechaFin);

    const endpoint = `/api/exportar/csv${params.toString() ? `?${params.toString()}` : ''}`;
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Error al exportar CSV');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `horas-laborales-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error al exportar CSV:', error);
      throw error;
    }
  }
}

export default new ApiService();
