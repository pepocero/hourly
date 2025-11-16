import React, { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';
import apiService from '../services/api';

function HorarioContratoForm({ horario, contratoId, onClose, onSave }) {
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    hora_entrada: '',
    hora_salida: '',
    descripcion: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [terminaDiaSiguiente, setTerminaDiaSiguiente] = useState(false);

  useEffect(() => {
    if (horario) {
      setFormData({
        fecha: horario.fecha || new Date().toISOString().split('T')[0],
        hora_entrada: horario.hora_entrada || '',
        hora_salida: horario.hora_salida || '',
        descripcion: horario.descripcion || ''
      });
      // Si existe hora de salida y es menor que la de entrada, asumimos que cruza medianoche
      if (horario.hora_entrada && horario.hora_salida && horario.hora_salida < horario.hora_entrada) {
        setTerminaDiaSiguiente(true);
      }
    }
  }, [horario]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const dataToSend = {
        contrato_id: contratoId,
        fecha: formData.fecha,
        hora_entrada: formData.hora_entrada,
        hora_salida: formData.hora_salida,
        descripcion: formData.descripcion
      };

      let response;
      if (horario) {
        response = await apiService.updateHorarioContrato(horario.id, dataToSend);
      } else {
        response = await apiService.createHorarioContrato(dataToSend);
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
              {horario ? 'Editar Horario' : 'Registrar Horario'}
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
              <label htmlFor="hora_entrada" className="form-label">
                Hora de Entrada *
              </label>
              <input
                type="time"
                id="hora_entrada"
                name="hora_entrada"
                required
                value={formData.hora_entrada}
                onChange={(e) => {
                  handleChange(e);
                  // Ajustar indicador de día siguiente en base a comparación
                  const nuevaEntrada = e.target.value;
                  if (formData.hora_salida && formData.hora_salida < nuevaEntrada) {
                    setTerminaDiaSiguiente(true);
                  } else {
                    setTerminaDiaSiguiente(false);
                  }
                }}
                className="input-field w-full"
              />
            </div>
            <div>
              <label htmlFor="hora_salida" className="form-label">
                Hora de Salida
              </label>
              <input
                type="time"
                id="hora_salida"
                name="hora_salida"
                value={formData.hora_salida}
                onChange={(e) => {
                  handleChange(e);
                  const nuevaSalida = e.target.value;
                  if (formData.hora_entrada && nuevaSalida < formData.hora_entrada) {
                    setTerminaDiaSiguiente(true);
                  } else {
                    setTerminaDiaSiguiente(false);
                  }
                }}
                className="input-field w-full"
              />
              <p className="mt-1 text-xs text-gray-500">
                Si la salida es anterior a la entrada, se contabiliza como al día siguiente.
              </p>
            </div>
          </div>

          {/* Indicador día siguiente */}
          <div className="flex items-center space-x-2">
            <input
              id="terminaDiaSiguiente"
              type="checkbox"
              checked={terminaDiaSiguiente}
              onChange={(e) => setTerminaDiaSiguiente(e.target.checked)}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded"
            />
            <label htmlFor="terminaDiaSiguiente" className="text-sm text-gray-700">
              Termina al día siguiente
            </label>
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
              placeholder="Describe el trabajo realizado (opcional)..."
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

export default HorarioContratoForm;

