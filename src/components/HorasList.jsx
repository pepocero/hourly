import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Edit, Trash2, Clock, Euro } from 'lucide-react';
import apiService from '../services/api';
import ConfirmModal from './ConfirmModal';

const HorasList = forwardRef(({ fechaInicio, fechaFin, onEdit, onDataChange }, ref) => {
  const [horas, setHoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [horaToDelete, setHoraToDelete] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [proyectoFiltro, setProyectoFiltro] = useState('');

  useEffect(() => {
    loadProyectos();
  }, []);

  useEffect(() => {
    loadHoras();
  }, [fechaInicio, fechaFin, proyectoFiltro]);

  useImperativeHandle(ref, () => ({
    loadHoras
  }));

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

  const loadHoras = async () => {
    try {
      setLoading(true);
      const response = await apiService.getHoras(fechaInicio, fechaFin);
      if (response.success) {
        let horasFiltradas = response.data;
        
        // Aplicar filtro por proyecto si está seleccionado
        if (proyectoFiltro) {
          horasFiltradas = response.data.filter(hora => 
            hora.proyecto_id === parseInt(proyectoFiltro)
          );
        }
        
        setHoras(horasFiltradas);
      }
    } catch (error) {
      setError('Error al cargar las horas trabajadas');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (hora) => {
    setHoraToDelete(hora);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!horaToDelete) return;

    try {
      const response = await apiService.deleteHora(horaToDelete.id);
      if (response.success) {
        loadHoras();
        if (onDataChange) onDataChange();
        setShowDeleteModal(false);
        setHoraToDelete(null);
      } else {
        alert('Error al eliminar la hora trabajada: ' + response.error);
      }
    } catch (error) {
      alert('Error al eliminar la hora trabajada');
      console.error('Error:', error);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setHoraToDelete(null);
  };

  const formatTime = (time) => {
    if (!time) return '-';
    return time.substring(0, 5); // HH:MM
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadHoras}
            className="btn-primary mt-4"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (horas.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No hay horas registradas en este período</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Filtro por proyecto */}
      <div className="mb-4">
        <label htmlFor="proyecto-filtro" className="block text-sm font-medium text-gray-700 mb-2">
          Filtrar por proyecto
        </label>
        <select
          id="proyecto-filtro"
          value={proyectoFiltro}
          onChange={(e) => setProyectoFiltro(e.target.value)}
          className="input-field max-w-xs"
        >
          <option value="">Todos los proyectos</option>
          {proyectos.map((proyecto) => (
            <option key={proyecto.id} value={proyecto.id}>
              {proyecto.nombre}
            </option>
          ))}
        </select>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Proyecto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Inicio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duración
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {horas.map((hora) => (
              <tr key={hora.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(hora.fecha)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: hora.proyecto_color }}
                    ></div>
                    <span className="text-sm text-gray-900">{hora.proyecto_nombre}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatTime(hora.hora_inicio)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatTime(hora.hora_fin)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDuration(hora.duracion_minutos)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <Euro className="h-4 w-4 text-green-600 mr-1" />
                    {hora.total ? parseFloat(hora.total).toFixed(2) : '0.00'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onEdit(hora)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(hora)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Modal de confirmación para eliminar */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Hora Trabajada"
        message={`¿Estás seguro de que quieres eliminar esta hora trabajada del ${horaToDelete ? formatDate(horaToDelete.fecha) : ''}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
});

HorasList.displayName = 'HorasList';

export default HorasList;
