import React, { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import apiService from '../services/api';

function HorasForm({ hora, onClose, onSave }) {
  const [formData, setFormData] = useState({
    proyecto_id: '',
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '',
    hora_fin: '',
    descripcion: '',
    tarifa_aplicada: '',
    total: ''
  });
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProyectos();
    if (hora) {
      setFormData({
        proyecto_id: hora.proyecto_id || '',
        fecha: hora.fecha || new Date().toISOString().split('T')[0],
        hora_inicio: hora.hora_inicio || '',
        hora_fin: hora.hora_fin || '',
        descripcion: hora.descripcion || '',
        tarifa_aplicada: hora.tarifa_aplicada || '',
        total: hora.total || ''
      });
    }
  }, [hora]);

  const loadProyectos = async () => {
    try {
      const response = await apiService.getProyectos();
      if (response.success) {
        setProyectos(response.data);
      }
    } catch (error) {
      console.error('Error cargando proyectos:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Calcular total automáticamente cuando cambian las horas o la tarifa
    if (name === 'hora_inicio' || name === 'hora_fin' || name === 'tarifa_aplicada' || name === 'proyecto_id') {
      calculateTotal(name, value);
    }
  };

  const calculateTotal = (fieldName, value) => {
    // Si se selecciona un proyecto, usar su tarifa
    if (fieldName === 'proyecto_id' && value) {
      const proyectoSeleccionado = proyectos.find(p => p.id === parseInt(value));
      if (proyectoSeleccionado) {
        const tarifa = parseFloat(proyectoSeleccionado.tarifa_hora) || 0;
        setFormData(prev => ({
          ...prev,
          tarifa_aplicada: tarifa.toFixed(2)
        }));
      }
    }

    // Calcular duración basada en hora de inicio y fin
    const horaInicio = fieldName === 'hora_inicio' ? value : formData.hora_inicio;
    const horaFin = fieldName === 'hora_fin' ? value : formData.hora_fin;
    const tarifa = fieldName === 'tarifa_aplicada' ? parseFloat(value) || 0 : parseFloat(formData.tarifa_aplicada) || 0;

    if (horaInicio && horaFin && tarifa > 0) {
      // Convertir horas a minutos para calcular la diferencia
      const [inicioHora, inicioMin] = horaInicio.split(':').map(Number);
      const [finHora, finMin] = horaFin.split(':').map(Number);
      
      const inicioMinutos = inicioHora * 60 + inicioMin;
      const finMinutos = finHora * 60 + finMin;
      
      // Calcular diferencia en minutos
      let diferenciaMinutos = finMinutos - inicioMinutos;
      
      // Si la hora de fin es menor que la de inicio, asumir que es al día siguiente
      if (diferenciaMinutos < 0) {
        diferenciaMinutos += 24 * 60; // Agregar 24 horas
      }
      
      // Convertir minutos a horas
      const cantidadHoras = diferenciaMinutos / 60;
      const total = cantidadHoras * tarifa;
      
      setFormData(prev => ({
        ...prev,
        total: total.toFixed(2)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        total: '0.00'
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Calcular cantidad de horas y duración en minutos
      let cantidadHoras = 0;
      let duracionMinutos = 0;
      
      if (formData.hora_inicio && formData.hora_fin) {
        const [inicioHora, inicioMin] = formData.hora_inicio.split(':').map(Number);
        const [finHora, finMin] = formData.hora_fin.split(':').map(Number);
        
        const inicioMinutos = inicioHora * 60 + inicioMin;
        const finMinutos = finHora * 60 + finMin;
        
        duracionMinutos = finMinutos - inicioMinutos;
        if (duracionMinutos < 0) {
          duracionMinutos += 24 * 60;
        }
        
        cantidadHoras = duracionMinutos / 60;
      }

      const dataToSend = {
        proyecto_id: formData.proyecto_id,
        fecha: formData.fecha,
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin,
        cantidad_horas: cantidadHoras,
        descripcion: formData.descripcion,
        tarifa_aplicada: formData.tarifa_aplicada,
        total: formData.total
      };

      let response;
      if (hora) {
        response = await apiService.updateHora(hora.id, dataToSend);
      } else {
        response = await apiService.createHora(dataToSend);
      }

      if (response.success) {
        onSave();
      } else {
        setError(response.error || 'Error al guardar');
      }
    } catch (error) {
      setError(error.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              {hora ? 'Editar Hora' : 'Nueva Hora Trabajada'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 sm:p-6 space-y-3 sm:space-y-4">
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Proyecto */}
          <div>
            <label htmlFor="proyecto_id" className="form-label">
              Proyecto *
            </label>
            <select
              id="proyecto_id"
              name="proyecto_id"
              required
              value={formData.proyecto_id}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">Seleccionar proyecto</option>
              {proyectos.map((proyecto) => (
                <option key={proyecto.id} value={proyecto.id}>
                  {proyecto.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label htmlFor="fecha" className="form-label">
              Fecha *
            </label>
            <input
              type="date"
              id="fecha"
              name="fecha"
              required
              value={formData.fecha}
              onChange={handleChange}
              className="input-field"
            />
          </div>

          {/* Horario */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label htmlFor="hora_inicio" className="form-label">
                Hora de inicio *
              </label>
              <input
                type="time"
                id="hora_inicio"
                name="hora_inicio"
                required
                value={formData.hora_inicio}
                onChange={handleChange}
                className="input-field w-full"
              />
            </div>
            <div>
              <label htmlFor="hora_fin" className="form-label">
                Hora de fin *
              </label>
              <input
                type="time"
                id="hora_fin"
                name="hora_fin"
                required
                value={formData.hora_fin}
                onChange={handleChange}
                className="input-field w-full"
              />
            </div>
          </div>

          {/* Tarifa y Total */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label htmlFor="tarifa_aplicada" className="form-label">
                Tarifa/hora
              </label>
              <input
                type="number"
                step="0.01"
                id="tarifa_aplicada"
                name="tarifa_aplicada"
                value={formData.tarifa_aplicada}
                onChange={handleChange}
                className="input-field w-full"
                placeholder="0.00"
                readOnly={formData.proyecto_id ? true : false}
              />
              {formData.proyecto_id && (
                <p className="text-xs text-gray-500 mt-1">
                  Tarifa del proyecto seleccionado
                </p>
              )}
            </div>
            <div>
              <label htmlFor="total" className="form-label">
                Total
              </label>
              <input
                type="number"
                step="0.01"
                id="total"
                name="total"
                value={formData.total}
                onChange={handleChange}
                className="input-field bg-gray-50 w-full"
                placeholder="0.00"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">
                Calculado automáticamente
              </p>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="descripcion" className="form-label">
              Descripción
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              rows="3"
              value={formData.descripcion}
              onChange={handleChange}
              className="input-field"
              placeholder="Describe el trabajo realizado..."
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-3 sm:pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 py-2.5 sm:py-2 text-sm sm:text-base"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 py-2.5 sm:py-2 text-sm sm:text-base"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HorasForm;
