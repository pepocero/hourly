// Base de datos simulada para desarrollo local

class MockDatabase {
  constructor() {
    this.users = [];
    this.proyectos = [];
    this.horas = [];
    this.nextId = 1;
  }

  // Usuarios
  async createUser(email, passwordHash, name) {
    const user = {
      id: this.nextId++,
      email,
      password_hash: passwordHash,
      name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.users.push(user);
    return { success: true, meta: { last_row_id: user.id } };
  }

  async getUserByEmail(email) {
    return this.users.find(user => user.email === email) || null;
  }

  async getUserById(id) {
    const user = this.users.find(user => user.id === id);
    if (user) {
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  // Proyectos
  async getProyectos(userId) {
    const proyectos = this.proyectos.filter(p => p.user_id === userId && p.activo);
    return { results: proyectos };
  }

  async createProyecto(userId, nombre, descripcion, tarifaHora, color) {
    const proyecto = {
      id: this.nextId++,
      user_id: userId,
      nombre,
      descripcion,
      tarifa_hora: tarifaHora,
      color,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.proyectos.push(proyecto);
    return { success: true, meta: { last_row_id: proyecto.id } };
  }

  async updateProyecto(proyectoId, userId, nombre, descripcion, tarifaHora, color) {
    const proyecto = this.proyectos.find(p => p.id === proyectoId && p.user_id === userId);
    if (proyecto) {
      proyecto.nombre = nombre;
      proyecto.descripcion = descripcion;
      proyecto.tarifa_hora = tarifaHora;
      proyecto.color = color;
      proyecto.updated_at = new Date().toISOString();
      return { success: true };
    }
    return { success: false };
  }

  async deleteProyecto(proyectoId, userId) {
    const proyecto = this.proyectos.find(p => p.id === proyectoId && p.user_id === userId);
    if (proyecto) {
      proyecto.activo = false;
      proyecto.updated_at = new Date().toISOString();
      return { success: true };
    }
    return { success: false };
  }

  // Horas trabajadas
  async getHoras(userId, fechaInicio, fechaFin) {
    let horas = this.horas.filter(h => h.user_id === userId);
    
    if (fechaInicio) {
      horas = horas.filter(h => h.fecha >= fechaInicio);
    }
    
    if (fechaFin) {
      horas = horas.filter(h => h.fecha <= fechaFin);
    }

    // Agregar información del proyecto
    const horasConProyecto = horas.map(hora => {
      const proyecto = this.proyectos.find(p => p.id === hora.proyecto_id);
      return {
        ...hora,
        proyecto_nombre: proyecto ? proyecto.nombre : 'Proyecto eliminado',
        proyecto_color: proyecto ? proyecto.color : '#gray'
      };
    });

    return { results: horasConProyecto.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)) };
  }

  async createHora(userId, proyectoId, fecha, horaInicio, horaFin, duracionMinutos, descripcion, tarifaAplicada, total) {
    const hora = {
      id: this.nextId++,
      user_id: userId,
      proyecto_id: proyectoId,
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      duracion_minutos: duracionMinutos,
      descripcion,
      tarifa_aplicada: tarifaAplicada,
      total,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.horas.push(hora);
    return { success: true, meta: { last_row_id: hora.id } };
  }

  async updateHora(horaId, userId, proyectoId, fecha, horaInicio, horaFin, duracionMinutos, descripcion, tarifaAplicada, total) {
    const hora = this.horas.find(h => h.id === horaId && h.user_id === userId);
    if (hora) {
      hora.proyecto_id = proyectoId;
      hora.fecha = fecha;
      hora.hora_inicio = horaInicio;
      hora.hora_fin = horaFin;
      hora.duracion_minutos = duracionMinutos;
      hora.descripcion = descripcion;
      hora.tarifa_aplicada = tarifaAplicada;
      hora.total = total;
      hora.updated_at = new Date().toISOString();
      return { success: true };
    }
    return { success: false };
  }

  async deleteHora(horaId, userId) {
    const index = this.horas.findIndex(h => h.id === horaId && h.user_id === userId);
    if (index !== -1) {
      this.horas.splice(index, 1);
      return { success: true };
    }
    return { success: false };
  }

  async getResumenHoras(userId, fechaInicio, fechaFin) {
    let horas = this.horas.filter(h => h.user_id === userId);
    
    if (fechaInicio) {
      horas = horas.filter(h => h.fecha >= fechaInicio);
    }
    
    if (fechaFin) {
      horas = horas.filter(h => h.fecha <= fechaFin);
    }

    const totalMinutos = horas.reduce((sum, h) => sum + (h.duracion_minutos || 0), 0);
    const totalGanancias = horas.reduce((sum, h) => sum + (h.total || 0), 0);
    const promedioMinutos = horas.length > 0 ? totalMinutos / horas.length : 0;

    return {
      total_registros: horas.length,
      total_minutos: totalMinutos,
      total_ganancias: totalGanancias,
      promedio_minutos: promedioMinutos
    };
  }
}

export default new MockDatabase();
