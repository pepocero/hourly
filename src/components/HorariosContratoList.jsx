import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Edit, Trash2, Calendar, Clock } from 'lucide-react';
import apiService from '../services/api';
import ConfirmModal from './ConfirmModal';

const HorariosContratoList = forwardRef(({ contratoId, color, contratos, onEdit, onDataChange }, ref) => {
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [horarioToDelete, setHorarioToDelete] = useState(null);

  useEffect(() => {
    if (contratoId !== undefined) {
      loadHorarios();
    }
  }, [contratoId]);

  // Exponer la función loadHorarios para que pueda ser llamada desde el componente padre
  useImperativeHandle(ref, () => ({
    loadHorarios
  }));

  const loadHorarios = async () => {
    try {
      setLoading(true);
      const response = await apiService.getHorariosContrato(contratoId || null);
      if (response.success) {
        setHorarios(response.data);
      }
    } catch (error) {
      setError('Error al cargar los horarios');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Obtener color del contrato
  const getContratoColor = (contratoIdParam) => {
    if (!contratos) return '#8b5cf6';
    const contrato = contratos.find(c => c.id === contratoIdParam);
    return contrato?.color || '#8b5cf6';
  };

  const handleDeleteClick = (horario) => {
    setHorarioToDelete(horario);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!horarioToDelete) return;

    try {
      const response = await apiService.deleteHorarioContrato(horarioToDelete.id);
      if (response.success) {
        loadHorarios();
        if (onDataChange) onDataChange();
        setShowDeleteModal(false);
        setHorarioToDelete(null);
      } else {
        alert('Error al eliminar el horario: ' + response.error);
      }
    } catch (error) {
      alert('Error al eliminar el horario');
      console.error('Error:', error);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setHorarioToDelete(null);
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (horarios.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No hay horarios registrados</p>
        <p className="text-xs mt-1">Registra tu primer horario para comenzar</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {horarios.map((horario) => (
          <div
            key={horario.id}
            className="p-3 sm:p-4 bg-white border-l-4 border-r border-t border-b border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            style={{ borderLeftColor: getContratoColor(horario.contrato_id) }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Contrato y Fecha */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 mb-2 space-y-1 sm:space-y-0">
                  {horario.contrato_nombre && (
                    <div className="flex items-center space-x-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getContratoColor(horario.contrato_id) }}
                      ></div>
                      <span className="text-xs font-medium text-gray-600">
                        {horario.contrato_nombre}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {formatDate(horario.fecha)}
                    </span>
                  </div>
                </div>

                {/* Horario */}
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{horario.hora_entrada}</span>
                  <span>-</span>
                  <span>{horario.hora_salida || 'En curso'}</span>
                  {horario.duracion_minutos > 0 && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="font-medium text-primary-600">
                        {formatDuration(horario.duracion_minutos)}
                      </span>
                    </>
                  )}
                </div>

                {/* Descripción */}
                {horario.descripcion && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {horario.descripcion}
                  </p>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex items-center space-x-1 sm:space-x-2 ml-2 flex-shrink-0">
                <button
                  onClick={() => onEdit(horario)}
                  onTouchStart={() => onEdit(horario)}
                  className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="Editar horario"
                >
                  <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(horario)}
                  onTouchStart={() => handleDeleteClick(horario)}
                  className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Eliminar horario"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showDeleteModal && (
        <ConfirmModal
          title="Eliminar Horario"
          message={`¿Estás seguro de que deseas eliminar este horario del ${horarioToDelete?.fecha}?`}
          confirmText="Eliminar"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </>
  );
});

export default HorariosContratoList;

