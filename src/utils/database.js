// Utilidades para manejo de base de datos D1

export class DatabaseService {
  constructor(db) {
    this.db = db;
  }

  // Usuarios
  async createUser(email, passwordHash, name) {
    const stmt = this.db.prepare(`
      INSERT INTO users (email, password_hash, name)
      VALUES (?, ?, ?)
    `);
    return await stmt.bind(email, passwordHash, name).run();
  }

  async getUserByEmail(email) {
    const stmt = this.db.prepare(`
      SELECT * FROM users WHERE email = ?
    `);
    return await stmt.bind(email).first();
  }

  async getUserById(id) {
    const stmt = this.db.prepare(`
      SELECT id, email, name, created_at FROM users WHERE id = ?
    `);
    return await stmt.bind(id).first();
  }

  // Proyectos
  async getProyectos(userId) {
    const stmt = this.db.prepare(`
      SELECT * FROM proyectos 
      WHERE user_id = ? AND activo = 1
      ORDER BY nombre ASC
    `);
    return await stmt.bind(userId).all();
  }

  async createProyecto(userId, nombre, descripcion, tarifaHora, color) {
    const stmt = this.db.prepare(`
      INSERT INTO proyectos (user_id, nombre, descripcion, tarifa_hora, color)
      VALUES (?, ?, ?, ?, ?)
    `);
    return await stmt.bind(userId, nombre, descripcion, tarifaHora, color).run();
  }

  async updateProyecto(proyectoId, userId, nombre, descripcion, tarifaHora, color) {
    const stmt = this.db.prepare(`
      UPDATE proyectos 
      SET nombre = ?, descripcion = ?, tarifa_hora = ?, color = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);
    return await stmt.bind(nombre, descripcion, tarifaHora, color, proyectoId, userId).run();
  }

  async deleteProyecto(proyectoId, userId) {
    const stmt = this.db.prepare(`
      UPDATE proyectos SET activo = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);
    return await stmt.bind(proyectoId, userId).run();
  }

  // Horas trabajadas
  async getHoras(userId, fechaInicio, fechaFin) {
    let query = `
      SELECT h.*, p.nombre as proyecto_nombre, p.color as proyecto_color
      FROM horas_trabajadas h
      JOIN proyectos p ON h.proyecto_id = p.id
      WHERE h.user_id = ?
    `;
    
    const params = [userId];
    
    if (fechaInicio) {
      query += ' AND h.fecha >= ?';
      params.push(fechaInicio);
    }
    
    if (fechaFin) {
      query += ' AND h.fecha <= ?';
      params.push(fechaFin);
    }
    
    query += ' ORDER BY h.fecha DESC, h.hora_inicio DESC';
    
    const stmt = this.db.prepare(query);
    return await stmt.bind(...params).all();
  }

  async createHora(userId, proyectoId, fecha, horaInicio, horaFin, duracionMinutos, descripcion, tarifaAplicada, total) {
    const stmt = this.db.prepare(`
      INSERT INTO horas_trabajadas 
      (user_id, proyecto_id, fecha, hora_inicio, hora_fin, duracion_minutos, descripcion, tarifa_aplicada, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return await stmt.bind(userId, proyectoId, fecha, horaInicio, horaFin, duracionMinutos, descripcion, tarifaAplicada, total).run();
  }

  async updateHora(horaId, userId, proyectoId, fecha, horaInicio, horaFin, duracionMinutos, descripcion, tarifaAplicada, total) {
    const stmt = this.db.prepare(`
      UPDATE horas_trabajadas 
      SET proyecto_id = ?, fecha = ?, hora_inicio = ?, hora_fin = ?, 
          duracion_minutos = ?, descripcion = ?, tarifa_aplicada = ?, total = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);
    return await stmt.bind(proyectoId, fecha, horaInicio, horaFin, duracionMinutos, descripcion, tarifaAplicada, total, horaId, userId).run();
  }

  async deleteHora(horaId, userId) {
    const stmt = this.db.prepare(`
      DELETE FROM horas_trabajadas WHERE id = ? AND user_id = ?
    `);
    return await stmt.bind(horaId, userId).run();
  }

  async getResumenHoras(userId, fechaInicio, fechaFin) {
    let query = `
      SELECT 
        COUNT(*) as total_registros,
        SUM(duracion_minutos) as total_minutos,
        SUM(total) as total_ganancias,
        AVG(duracion_minutos) as promedio_minutos
      FROM horas_trabajadas h
      WHERE h.user_id = ?
    `;
    
    const params = [userId];
    
    if (fechaInicio) {
      query += ' AND h.fecha >= ?';
      params.push(fechaInicio);
    }
    
    if (fechaFin) {
      query += ' AND h.fecha <= ?';
      params.push(fechaFin);
    }
    
    const stmt = this.db.prepare(query);
    return await stmt.bind(...params).first();
  }
}
