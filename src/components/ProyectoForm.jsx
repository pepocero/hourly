import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import apiService from '../services/api';

function ProyectoForm({ proyecto, onClose, onSave }) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tarifa_hora: '',
    color: '#3b82f6'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const colors = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
  ];

  React.useEffect(() => {
    if (proyecto) {
      setFormData({
        nombre: proyecto.nombre || '',
        descripcion: proyecto.descripcion || '',
        tarifa_hora: proyecto.tarifa_hora || '',
        color: proyecto.color || '#3b82f6'
      });
    }
  }, [proyecto]);

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
      let response;
      if (proyecto) {
        response = await apiService.updateProyecto(proyecto.id, formData);
      } else {
        response = await apiService.createProyecto(formData);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {proyecto ? 'Editar Proyecto' : 'Nuevo Proyecto'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Nombre */}
          <div>
            <label htmlFor="nombre" className="form-label">
              Nombre del proyecto *
            </label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              required
              value={formData.nombre}
              onChange={handleChange}
              className="input-field"
              placeholder="Ej: Desarrollo web para cliente X"
            />
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
              placeholder="Describe el proyecto..."
            />
          </div>

          {/* Tarifa por hora */}
          <div>
            <label htmlFor="tarifa_hora" className="form-label">
              Tarifa por hora
            </label>
            <input
              type="number"
              step="0.01"
              id="tarifa_hora"
              name="tarifa_hora"
              value={formData.tarifa_hora}
              onChange={handleChange}
              className="input-field"
              placeholder="0.00"
            />
          </div>

          {/* Color */}
          <div>
            <label className="form-label">
              Color del proyecto
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color ? 'border-gray-900' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProyectoForm;
