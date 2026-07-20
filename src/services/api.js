// Servicio para comunicación con la API

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  // Actualizar token
  // rememberMe: true → localStorage (persiste al cerrar el navegador)
  // rememberMe: false → sessionStorage (se limpia al cerrar la pestaña/navegador)
  setToken(token, rememberMe = true) {
    this.token = token;
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    localStorage.removeItem('rememberMe');

    if (token) {
      if (rememberMe) {
        localStorage.setItem('token', token);
        localStorage.setItem('rememberMe', 'true');
      } else {
        sessionStorage.setItem('token', token);
      }
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
    
    // Crear AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos
    
    const config = {
      headers: this.getHeaders(),
      ...options,
      signal: controller.signal,
    };

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      
      // Verificar si la respuesta es JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Si no es JSON, intentar leer como texto
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
      }

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('API Error:', error);
      
      // Manejar diferentes tipos de errores
      if (error.name === 'AbortError') {
        throw new Error('La petición tardó demasiado. Verifica tu conexión a internet.');
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet y que la URL de la API esté configurada correctamente.');
      }
      
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

  async login(email, password, rememberMe = false) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe: !!rememberMe }),
    });

    if (response.success && response.data.token) {
      this.setToken(response.data.token, !!rememberMe);
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

  async setHoraPagado(id, pagado) {
    return this.request(`/api/horas/${id}/pagado`, {
      method: 'PATCH',
      body: JSON.stringify({ pagado: !!pagado }),
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

  // ========== CONTRATOS ==========

  async getContratos() {
    return this.request('/api/contratos');
  }

  async createContrato(contrato) {
    return this.request('/api/contratos', {
      method: 'POST',
      body: JSON.stringify(contrato),
    });
  }

  async updateContrato(id, contrato) {
    return this.request(`/api/contratos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(contrato),
    });
  }

  async deleteContrato(id) {
    return this.request(`/api/contratos/${id}`, {
      method: 'DELETE',
    });
  }

  // ========== HORARIOS DE CONTRATO ==========

  async getHorariosContrato(contratoId = null, fechaInicio = null, fechaFin = null, paraInforme = false) {
    const params = new URLSearchParams();
    if (contratoId) params.append('contrato_id', contratoId);
    if (fechaInicio) params.append('fecha_inicio', fechaInicio);
    if (fechaFin) params.append('fecha_fin', fechaFin);
    if (paraInforme) params.append('para_informe', '1');

    const endpoint = `/api/horarios-contrato${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async createHorarioContrato(horario) {
    return this.request('/api/horarios-contrato', {
      method: 'POST',
      body: JSON.stringify(horario),
    });
  }

  async updateHorarioContrato(id, horario) {
    return this.request(`/api/horarios-contrato/${id}`, {
      method: 'PUT',
      body: JSON.stringify(horario),
    });
  }

  async deleteHorarioContrato(id) {
    return this.request(`/api/horarios-contrato/${id}`, {
      method: 'DELETE',
    });
  }

  async getResumenSemanalContrato(contratoId, fechaInicio, fechaFin) {
    const params = new URLSearchParams();
    params.append('contrato_id', contratoId);
    params.append('fecha_inicio', fechaInicio);
    params.append('fecha_fin', fechaFin);

    const endpoint = `/api/horarios-contrato/resumen?${params.toString()}`;
    return this.request(endpoint);
  }

  // ========== LIQUIDACIONES DE CONTRATO ==========

  async getLiquidacionesContrato(contratoId = null, semanaLunes = null, fechaInicio = null, fechaFin = null) {
    const params = new URLSearchParams();
    if (contratoId) params.append('contrato_id', contratoId);
    if (semanaLunes) params.append('semana_lunes', semanaLunes);
    if (fechaInicio) params.append('fecha_inicio', fechaInicio);
    if (fechaFin) params.append('fecha_fin', fechaFin);

    const endpoint = `/api/liquidaciones-contrato${params.toString() ? `?${params.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async createLiquidacionContrato(data) {
    return this.request('/api/liquidaciones-contrato', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteLiquidacionContrato(id) {
    return this.request(`/api/liquidaciones-contrato/${id}`, {
      method: 'DELETE',
    });
  }

  async anularLiquidacionesSemana(contratoId, semanaLunes) {
    const params = new URLSearchParams({
      contrato_id: String(contratoId),
      semana_lunes: semanaLunes
    });
    return this.request(`/api/liquidaciones-contrato/semana?${params.toString()}`, {
      method: 'DELETE',
    });
  }

  async anularLiquidacionPeriodoAgrupado(contratoId, fechaInicio, fechaCierre) {
    const params = new URLSearchParams({
      contrato_id: String(contratoId),
      fecha_inicio: fechaInicio,
      fecha_cierre: fechaCierre
    });
    return this.request(`/api/liquidaciones-contrato/periodo?${params.toString()}`, {
      method: 'DELETE',
    });
  }

  async getAjustePendiente(contratoId, semanaLunes, fechaFin = null) {
    const params = new URLSearchParams();
    params.append('contrato_id', contratoId);
    params.append('semana_lunes', semanaLunes);
    if (fechaFin) params.append('fecha_fin', fechaFin);

    return this.request(`/api/liquidaciones-contrato/ajuste-pendiente?${params.toString()}`);
  }

  async setLiquidacionPeriodoPagado(contratoId, fechaInicio, fechaFin, pagado) {
    return this.request('/api/liquidaciones-contrato/periodo/pagado', {
      method: 'PATCH',
      body: JSON.stringify({
        contrato_id: contratoId,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        pagado: !!pagado
      }),
    });
  }

  async getInformesGuardados(fechaInicio = null, fechaFin = null, contratoId = null) {
    const params = new URLSearchParams();
    if (fechaInicio) params.append('fecha_inicio', fechaInicio);
    if (fechaFin) params.append('fecha_fin', fechaFin);
    if (contratoId) params.append('contrato_id', contratoId);
    const query = params.toString();
    return this.request(`/api/informes-guardados${query ? `?${query}` : ''}`);
  }

  async getInformeGuardado(informeId) {
    return this.request(`/api/informes-guardados/${informeId}`);
  }

  async createInformeGuardado(data) {
    return this.request('/api/informes-guardados', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteInformeGuardado(informeId) {
    return this.request(`/api/informes-guardados/${informeId}`, {
      method: 'DELETE',
    });
  }

  async updateInformeGuardado(informeId, data) {
    return this.request(`/api/informes-guardados/${informeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

export default new ApiService();
