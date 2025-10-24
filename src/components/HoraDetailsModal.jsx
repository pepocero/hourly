import React from 'react';
import { X, Calendar, Clock, Euro, FileText, User, Tag } from 'lucide-react';

function HoraDetailsModal({ isOpen, onClose, hora }) {
  if (!isOpen || !hora) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 flex items-center">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 mr-2 text-primary-600" />
            <span className="hidden sm:inline">Detalles de Hora Trabajada</span>
            <span className="sm:hidden">Detalles</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none p-1"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

          {/* Content */}
          <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
            {/* Información básica */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex-shrink-0">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Fecha</p>
                  <p className="text-sm sm:text-base text-gray-900">{formatDate(hora.fecha)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex-shrink-0">
                  <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Proyecto</p>
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: hora.proyecto_color }}
                    ></div>
                    <p className="text-sm sm:text-base text-gray-900">{hora.proyecto_nombre}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Horarios */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex-shrink-0">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Hora de Inicio</p>
                  <p className="text-sm sm:text-base text-gray-900">{formatTime(hora.hora_inicio)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex-shrink-0">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Hora de Fin</p>
                  <p className="text-sm sm:text-base text-gray-900">{formatTime(hora.hora_fin)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex-shrink-0">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Duración Total</p>
                  <p className="text-sm sm:text-base text-gray-900">{formatDuration(hora.duracion_minutos)}</p>
                </div>
              </div>
            </div>

            {/* Información financiera */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex-shrink-0">
                  <Euro className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Tarifa por Hora</p>
                  <p className="text-sm sm:text-base text-gray-900">
                    {hora.tarifa_aplicada ? parseFloat(hora.tarifa_aplicada).toFixed(2) : '0.00'} €
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex-shrink-0">
                  <Euro className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Total</p>
                  <p className="text-sm sm:text-base font-semibold text-green-600">
                    {hora.total ? parseFloat(hora.total).toFixed(2) : '0.00'} €
                  </p>
                </div>
              </div>
            </div>

            {/* Descripción/Observaciones */}
            <div className="border-t border-gray-200 pt-4 sm:pt-6">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="flex-shrink-0">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Descripción / Observaciones</p>
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    {hora.descripcion ? (
                      <p className="text-sm sm:text-base text-gray-900 whitespace-pre-wrap">{hora.descripcion}</p>
                    ) : (
                      <p className="text-sm sm:text-base text-gray-500 italic">Sin descripción</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="border-t border-gray-200 pt-4 sm:pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
                <div>
                  <p><span className="font-medium">ID:</span> {hora.id}</p>
                  <p><span className="font-medium">Creado:</span> {new Date(hora.created_at).toLocaleString('es-ES')}</p>
                </div>
                <div>
                  <p><span className="font-medium">Actualizado:</span> {new Date(hora.updated_at).toLocaleString('es-ES')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-3 sm:p-4 lg:p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <button
              onClick={onClose}
              className="btn-secondary px-3 sm:px-4 py-2 text-xs sm:text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  export default HoraDetailsModal;
