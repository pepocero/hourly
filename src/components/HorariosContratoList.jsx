import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Edit, Trash2, Calendar, Clock, DollarSign } from 'lucide-react';
import apiService from '../services/api';
import ConfirmModal from './ConfirmModal';

const HorariosContratoList = forwardRef(({ contratoId, fechaInicio, fechaFin, color, contratos, onEdit, onDataChange }, ref) => {
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [horarioToDelete, setHorarioToDelete] = useState(null);

  useEffect(() => {
    if (contratoId !== undefined) {
      loadHorarios();
    }
  }, [contratoId, fechaInicio, fechaFin]);

  // Exponer la función loadHorarios para que pueda ser llamada desde el componente padre
  useImperativeHandle(ref, () => ({
    loadHorarios
  }));

  const loadHorarios = async () => {
    try {
      setLoading(true);
      const response = await apiService.getHorariosContrato(contratoId || null, fechaInicio || null, fechaFin || null);
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

  // Obtener el lunes de la semana de una fecha
  const getMondayOfWeek = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Ajustar al lunes
    const monday = new Date(date.getFullYear(), date.getMonth(), diff);
    return monday.toISOString().split('T')[0];
  };

  // Calcular horas extras del periodo seleccionado
  const calcularHorasExtras = useMemo(() => {
    if (!fechaInicio || !fechaFin || horarios.length === 0) {
      return null;
    }

    // Agrupar horarios por contrato
    const horariosPorContrato = {};
    horarios.forEach(horario => {
      const contratoId = horario.contrato_id;
      if (!horariosPorContrato[contratoId]) {
        horariosPorContrato[contratoId] = {
          contratoId,
          contratoNombre: horario.contrato_nombre,
          horasSemanales: horario.horas_semanales || 0,
          valorHoraExtra: horario.valor_hora_extra || 0,
          horarios: []
        };
      }
      horariosPorContrato[contratoId].horarios.push(horario);
    });

    let totalHorasExtras = 0;
    let totalImporte = 0;
    const detallesPorContrato = [];

    // Calcular horas extras por contrato
    Object.values(horariosPorContrato).forEach(contratoData => {
      // Agrupar horarios por semana
      const horariosPorSemana = {};
      contratoData.horarios.forEach(horario => {
        const semanaLunes = getMondayOfWeek(horario.fecha);
        if (!horariosPorSemana[semanaLunes]) {
          horariosPorSemana[semanaLunes] = [];
        }
        horariosPorSemana[semanaLunes].push(horario);
      });

      // Calcular horas extras por semana
      let horasExtrasContrato = 0;
      Object.values(horariosPorSemana).forEach(horariosSemana => {
        const totalMinutosSemana = horariosSemana.reduce((sum, h) => sum + (h.duracion_minutos || 0), 0);
        const totalHorasSemana = totalMinutosSemana / 60;
        const horasExtrasSemana = Math.max(0, totalHorasSemana - contratoData.horasSemanales);
        horasExtrasContrato += horasExtrasSemana;
      });

      const importeContrato = horasExtrasContrato * contratoData.valorHoraExtra;
      totalHorasExtras += horasExtrasContrato;
      totalImporte += importeContrato;

      // Siempre agregar el detalle del contrato para mostrar el resumen completo
      detallesPorContrato.push({
        contratoNombre: contratoData.contratoNombre,
        horasExtras: horasExtrasContrato,
        importe: importeContrato,
        valorHoraExtra: contratoData.valorHoraExtra,
        horasSemanales: contratoData.horasSemanales
      });
    });

    return {
      totalHorasExtras,
      totalImporte,
      detallesPorContrato
    };
  }, [horarios, fechaInicio, fechaFin]);

  const resumenHorasExtras = calcularHorasExtras;

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
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (onEdit) {
                      onEdit(horario);
                    }
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (onEdit) {
                      onEdit(horario);
                    }
                  }}
                  className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  title="Editar horario"
                  type="button"
                >
                  <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDeleteClick(horario);
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDeleteClick(horario);
                  }}
                  className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  title="Eliminar horario"
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen de Horas Extras */}
      {resumenHorasExtras && fechaInicio && fechaFin && (
        <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg">
          <h5 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <span>Resumen de Horas Extras</span>
          </h5>
          
          {resumenHorasExtras.detallesPorContrato.length > 0 ? (
            <>
              {/* Mostrar desglose por contrato solo si hay múltiples contratos */}
              {resumenHorasExtras.detallesPorContrato.length > 1 && (
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Desglose por contrato:</p>
                  {resumenHorasExtras.detallesPorContrato.map((detalle, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 border border-orange-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{detalle.contratoNombre}</p>
                          <p className="text-xs text-gray-600">
                            Contrato: {detalle.horasSemanales}h semanales
                            {detalle.valorHoraExtra > 0 && (
                              <span> • Valor hora extra: ${detalle.valorHoraExtra}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Horas Extras</p>
                            <p className="text-lg font-bold text-orange-600">
                              {detalle.horasExtras.toFixed(2)}h
                            </p>
                          </div>
                          {detalle.valorHoraExtra > 0 && (
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Importe</p>
                              <p className="text-lg font-bold text-green-600">
                                ${detalle.importe.toFixed(2)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Resumen total */}
              <div className="bg-white rounded-lg p-4 border-2 border-orange-400">
                {resumenHorasExtras.detallesPorContrato.length === 1 && (
                  <div className="mb-3 pb-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {resumenHorasExtras.detallesPorContrato[0].contratoNombre}
                    </p>
                    <p className="text-xs text-gray-600">
                      Contrato: {resumenHorasExtras.detallesPorContrato[0].horasSemanales}h semanales
                      {resumenHorasExtras.detallesPorContrato[0].valorHoraExtra > 0 && (
                        <span> • Valor hora extra: ${resumenHorasExtras.detallesPorContrato[0].valorHoraExtra}</span>
                      )}
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Total Horas Extras</p>
                      <p className="text-xl sm:text-2xl font-bold text-orange-600">
                        {resumenHorasExtras.totalHorasExtras.toFixed(2)}h
                      </p>
                    </div>
                  </div>
                  
                  {resumenHorasExtras.totalImporte > 0 && (
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-gray-600">Importe Total</p>
                        <p className="text-xl sm:text-2xl font-bold text-green-600">
                          ${resumenHorasExtras.totalImporte.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    Periodo: {formatDate(fechaInicio)} - {formatDate(fechaFin)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Las horas extras se calculan semana por semana según el tipo de contrato
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <p className="text-sm text-gray-600 text-center">
                No se registraron horas extras en el periodo seleccionado
              </p>
            </div>
          )}
        </div>
      )}

      {showDeleteModal && (
        <ConfirmModal
          isOpen={showDeleteModal}
          onClose={handleDeleteCancel}
          title="Eliminar Horario"
          message={`¿Estás seguro de que deseas eliminar este horario del ${horarioToDelete?.fecha}?`}
          confirmText="Eliminar"
          onConfirm={handleDeleteConfirm}
          type="danger"
        />
      )}
    </>
  );
});

export default HorariosContratoList;

