import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Edit, Trash2, Calendar, Euro, Eye } from 'lucide-react';
import apiService from '../services/api';
import ConfirmModal from './ConfirmModal';

const ProyectosList = forwardRef(({ onEdit, onDataChange, onViewDetails }, ref) => {
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [proyectoToDelete, setProyectoToDelete] = useState(null);

  useEffect(() => {
    loadProyectos();
  }, []);

  // Exponer la función loadProyectos para que pueda ser llamada desde el componente padre
  useImperativeHandle(ref, () => ({
    loadProyectos
  }));

  const loadProyectos = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProyectos();
      if (response.success) {
        setProyectos(response.data);
      }
    } catch (error) {
      setError('Error al cargar los proyectos');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (proyecto) => {
    setProyectoToDelete(proyecto);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!proyectoToDelete) return;

    try {
      const response = await apiService.deleteProyecto(proyectoToDelete.id);
      if (response.success) {
        loadProyectos();
        if (onDataChange) onDataChange();
        setShowDeleteModal(false);
        setProyectoToDelete(null);
      } else {
        alert('Error al eliminar el proyecto: ' + response.error);
      }
    } catch (error) {
      alert('Error al eliminar el proyecto');
      console.error('Error:', error);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setProyectoToDelete(null);
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
            onClick={loadProyectos}
            className="btn-primary mt-4"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (proyectos.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No tienes proyectos registrados</p>
          <p className="text-sm text-gray-500 mt-2">
            Crea tu primer proyecto para comenzar a registrar horas
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {proyectos.map((proyecto) => (
        <div key={proyecto.id} className="card">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center">
              <div
                className="w-4 h-4 rounded-full mr-3"
                style={{ backgroundColor: proyecto.color }}
              ></div>
              <h3 className="text-lg font-semibold text-gray-900">
                {proyecto.nombre}
              </h3>
            </div>
            <div className="flex space-x-2">
              {onViewDetails && (
                <button
                  onClick={() => onViewDetails(proyecto)}
                  className="text-blue-600 hover:text-blue-900"
                  title="Ver detalles"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => onEdit(proyecto)}
                className="text-primary-600 hover:text-primary-900"
                title="Editar proyecto"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDeleteClick(proyecto)}
                className="text-red-600 hover:text-red-900"
                title="Eliminar proyecto"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {proyecto.descripcion && (
            <p className="text-sm text-gray-600 mb-4">
              {proyecto.descripcion}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-500">
              <Euro className="h-4 w-4 mr-1" />
              <span>{proyecto.tarifa_hora || '0.00'}/hora</span>
            </div>
            <span className="text-xs text-gray-400">
              {new Date(proyecto.created_at).toLocaleDateString('es-ES')}
            </span>
          </div>
        </div>
      ))}
      
      {/* Modal de confirmación para eliminar */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Proyecto"
        message={`¿Estás seguro de que quieres eliminar el proyecto "${proyectoToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
});

export default ProyectosList;
