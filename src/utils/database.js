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

  async setHoraPagado(horaId, userId, pagado) {
    const stmt = this.db.prepare(`
      UPDATE horas_trabajadas
      SET pagado = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);
    return await stmt.bind(pagado ? 1 : 0, horaId, userId).run();
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

  // ========== CONTRATOS ==========
  
  async getContratos(userId) {
    const stmt = this.db.prepare(`
      SELECT * FROM contratos 
      WHERE user_id = ? AND activo = 1
      ORDER BY nombre ASC
    `);
    return await stmt.bind(userId).all();
  }

  async getContratoById(contratoId, userId) {
    const stmt = this.db.prepare(`
      SELECT * FROM contratos 
      WHERE id = ? AND user_id = ?
    `);
    return await stmt.bind(contratoId, userId).first();
  }

  async createContrato(userId, nombre, horasSemanales, valorHoraExtra, color, diasLaborables = 31, diaCierreLiquidacion = null) {
    const stmt = this.db.prepare(`
      INSERT INTO contratos (user_id, nombre, horas_semanales, valor_hora_extra, color, dias_laborables, dia_cierre_liquidacion)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return await stmt.bind(userId, nombre, horasSemanales, valorHoraExtra, color, diasLaborables, diaCierreLiquidacion).run();
  }

  async updateContrato(contratoId, userId, nombre, horasSemanales, valorHoraExtra, color, diasLaborables = 31, diaCierreLiquidacion = null) {
    const stmt = this.db.prepare(`
      UPDATE contratos 
      SET nombre = ?, horas_semanales = ?, valor_hora_extra = ?, color = ?, dias_laborables = ?, dia_cierre_liquidacion = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);
    return await stmt.bind(nombre, horasSemanales, valorHoraExtra, color, diasLaborables, diaCierreLiquidacion, contratoId, userId).run();
  }

  async deleteContrato(contratoId, userId) {
    const stmt = this.db.prepare(`
      UPDATE contratos 
      SET activo = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);
    return await stmt.bind(contratoId, userId).run();
  }

  // ========== HORARIOS DE CONTRATO ==========
  
  async getHorariosContrato(userId, contratoId = null, fechaInicio = null, fechaFin = null) {
    let query = `
      SELECT hc.*, c.nombre as contrato_nombre, c.horas_semanales, c.valor_hora_extra, c.dias_laborables, c.dia_cierre_liquidacion
      FROM horarios_contrato hc
      LEFT JOIN contratos c ON hc.contrato_id = c.id
      WHERE hc.user_id = ?
    `;
    const params = [userId];

    if (contratoId) {
      query += ` AND hc.contrato_id = ?`;
      params.push(contratoId);
    }

    if (fechaInicio) {
      query += ` AND hc.fecha >= ?`;
      params.push(fechaInicio);
    }

    if (fechaFin) {
      query += ` AND hc.fecha <= ?`;
      params.push(fechaFin);
    }

    query += ` ORDER BY hc.fecha DESC, hc.hora_entrada DESC`;

    const stmt = this.db.prepare(query);
    return await stmt.bind(...params).all();
  }

  async createHorarioContrato(userId, contratoId, fecha, horaEntrada, horaSalida, duracionMinutos, descripcion, esDiaSuelto = 0) {
    const stmt = this.db.prepare(`
      INSERT INTO horarios_contrato (user_id, contrato_id, fecha, hora_entrada, hora_salida, duracion_minutos, descripcion, es_dia_suelto)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return await stmt.bind(userId, contratoId, fecha, horaEntrada, horaSalida, duracionMinutos, descripcion, esDiaSuelto ? 1 : 0).run();
  }

  async updateHorarioContrato(horarioId, userId, contratoId, fecha, horaEntrada, horaSalida, duracionMinutos, descripcion, esDiaSuelto = 0) {
    const stmt = this.db.prepare(`
      UPDATE horarios_contrato 
      SET contrato_id = ?, fecha = ?, hora_entrada = ?, hora_salida = ?, 
          duracion_minutos = ?, descripcion = ?, es_dia_suelto = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);
    return await stmt.bind(contratoId, fecha, horaEntrada, horaSalida, duracionMinutos, descripcion, esDiaSuelto ? 1 : 0, horarioId, userId).run();
  }

  async deleteHorarioContrato(horarioId, userId) {
    const stmt = this.db.prepare(`DELETE FROM horarios_contrato WHERE id = ? AND user_id = ?`);
    return await stmt.bind(horarioId, userId).run();
  }

  async getResumenSemanalContrato(userId, contratoId, fechaInicio, fechaFin) {
    const stmt = this.db.prepare(`
      SELECT 
        SUM(duracion_minutos) as total_minutos,
        COUNT(*) as total_registros
      FROM horarios_contrato
      WHERE user_id = ? AND contrato_id = ? AND fecha >= ? AND fecha <= ?
    `);
    return await stmt.bind(userId, contratoId, fechaInicio, fechaFin).first();
  }

  // ========== LIQUIDACIONES DE CONTRATO ==========

  async getLiquidacionesContrato(userId, contratoId = null, semanaLunes = null, fechaInicio = null, fechaFin = null) {
    let query = `
      SELECT l.*, c.nombre as contrato_nombre, c.color as contrato_color
      FROM liquidaciones_contrato l
      LEFT JOIN contratos c ON l.contrato_id = c.id
      WHERE l.user_id = ?
    `;
    const params = [userId];

    if (contratoId) {
      query += ` AND l.contrato_id = ?`;
      params.push(contratoId);
    }

    if (semanaLunes) {
      query += ` AND l.semana_lunes = ?`;
      params.push(semanaLunes);
    }

    if (fechaInicio && fechaFin) {
      query += ` AND l.semana_lunes <= ? AND date(l.semana_lunes, '+6 days') >= ?`;
      params.push(fechaFin, fechaInicio);
    }

    query += ` ORDER BY l.semana_lunes DESC, l.contrato_id ASC, l.created_at DESC`;

    const stmt = this.db.prepare(query);
    return await stmt.bind(...params).all();
  }

  async getLiquidacionByTipo(userId, contratoId, semanaLunes, tipo) {
    const stmt = this.db.prepare(`
      SELECT * FROM liquidaciones_contrato
      WHERE user_id = ? AND contrato_id = ? AND semana_lunes = ? AND tipo = ?
    `);
    return await stmt.bind(userId, contratoId, semanaLunes, tipo).first();
  }

  async createLiquidacionContrato(userId, data) {
    const stmt = this.db.prepare(`
      INSERT INTO liquidaciones_contrato (
        user_id, contrato_id, semana_lunes, fecha_inicio, fecha_cierre,
        horas_trabajadas, horas_esperadas, horas_extras, importe, tipo, notas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return await stmt.bind(
      userId,
      data.contrato_id,
      data.semana_lunes,
      data.fecha_inicio,
      data.fecha_cierre,
      data.horas_trabajadas,
      data.horas_esperadas,
      data.horas_extras,
      data.importe,
      data.tipo,
      data.notas || null
    ).run();
  }

  async deleteLiquidacionContrato(liquidacionId, userId) {
    const stmt = this.db.prepare(`
      DELETE FROM liquidaciones_contrato WHERE id = ? AND user_id = ?
    `);
    return await stmt.bind(liquidacionId, userId).run();
  }

  async deleteLiquidacionesSemana(userId, contratoId, semanaLunes) {
    const stmt = this.db.prepare(`
      DELETE FROM liquidaciones_contrato
      WHERE user_id = ? AND contrato_id = ? AND semana_lunes = ?
    `);
    return await stmt.bind(userId, contratoId, semanaLunes).run();
  }
}
