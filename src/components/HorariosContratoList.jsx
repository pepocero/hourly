import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Edit, Trash2, Calendar, Clock, DollarSign, AlertCircle, CheckCircle2, FileCheck } from 'lucide-react';
import apiService from '../services/api';
import ConfirmModal from './ConfirmModal';
import AlertModal from './AlertModal';
import {
  calcularResumenHorasExtrasMultiples,
  formatDiasLaborables,
  getMondayOfWeek
} from '../utils/contratoHoras';

const HorariosContratoList = forwardRef(({ contratoId, fechaInicio, fechaFin, color, contratos, onEdit, onDataChange }, ref) => {
  const [horarios, setHorarios] = useState([]);
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registrandoLiquidacion, setRegistrandoLiquidacion] = useState(false);
  const [error, setError] = useState('');
  const [liquidacionMsg, setLiquidacionMsg] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLiquidacionModal, setShowLiquidacionModal] = useState(false);
  const [horarioToDelete, setHorarioToDelete] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  const closeAlertModal = () => {
    setAlertModal({ isOpen: false, title: '', message: '', type: 'info' });
  };

  const showAlert = (title, message, type = 'info') => {
    setAlertModal({ isOpen: true, title, message, type });
  };

  const contratosMap = useMemo(() => {
    if (!contratos) return {};
    return contratos.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});
  }, [contratos]);

  useEffect(() => {
    if (contratoId !== undefined) {
      loadHorarios();
    }
  }, [contratoId, fechaInicio, fechaFin]);

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      loadLiquidaciones();
    } else {
      setLiquidaciones([]);
    }
  }, [contratoId, fechaInicio, fechaFin, horarios.length]);

  useImperativeHandle(ref, () => ({
    loadHorarios,
    loadLiquidaciones
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

  const loadLiquidaciones = async () => {
    try {
      const semanas = [...new Set(horarios.map((h) => getMondayOfWeek(h.fecha)))];
      const allLiquidaciones = [];

      for (const semana of semanas) {
        const response = await apiService.getLiquidacionesContrato(contratoId || null, semana);
        if (response.success && response.data) {
          allLiquidaciones.push(...response.data);
        }
      }

      if (semanas.length === 0 && contratoId) {
        const response = await apiService.getLiquidacionesContrato(contratoId, null);
        if (response.success && response.data) {
          allLiquidaciones.push(...response.data);
        }
      }

      setLiquidaciones(allLiquidaciones);
    } catch (error) {
      console.error('Error cargando liquidaciones:', error);
    }
  };

  const handleRegistrarLiquidacionClick = () => {
    if (!fechaInicio || !fechaFin || !contratoId) {
      showAlert(
        'Datos incompletos',
        'Selecciona un contrato y un rango de fechas antes de registrar la liquidación.',
        'warning'
      );
      return;
    }

    if (!resumenHorasExtras || resumenHorasExtras.detallesPorContrato.length === 0) {
      showAlert(
        'Sin datos para liquidar',
        'No hay horas registradas en el periodo seleccionado para calcular una liquidación.',
        'info'
      );
      return;
    }

    setShowLiquidacionModal(true);
  };

  const handleRegistrarLiquidacionConfirm = async () => {
    setShowLiquidacionModal(false);
    setRegistrandoLiquidacion(true);
    setLiquidacionMsg('');

    try {
      const response = await apiService.createLiquidacionContrato({
        contrato_id: parseInt(contratoId),
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      });

      if (response.success) {
        setLiquidacionMsg('Liquidación registrada correctamente');
        await loadLiquidaciones();
        if (onDataChange) onDataChange();
      } else {
        showAlert('No se pudo registrar', response.error || 'Error al registrar liquidación', 'error');
      }
    } catch (error) {
      showAlert('No se pudo registrar', error.message || 'Error al registrar liquidación', 'error');
    } finally {
      setRegistrandoLiquidacion(false);
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
        showAlert('Error al eliminar', `No se pudo eliminar el horario: ${response.error}`, 'error');
      }
    } catch (error) {
      showAlert('Error al eliminar', 'No se pudo eliminar el horario. Inténtalo de nuevo.', 'error');
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

  // Calcular horas extras del periodo seleccionado
  const calcularHorasExtras = useMemo(() => {
    if (!fechaInicio || !fechaFin || horarios.length === 0) {
      return null;
    }

    return calcularResumenHorasExtrasMultiples(horarios, fechaInicio, fechaFin, contratosMap);
  }, [horarios, fechaInicio, fechaFin, contratosMap]);

  const resumenHorasExtras = calcularHorasExtras;
  const esAnticipada = resumenHorasExtras?.detallesPorContrato?.some(
    (d) => d.tipoLiquidacion === 'anticipada' || d.semanas?.some((s) => !s.esDefinitiva)
  );
  const esDefinitiva = resumenHorasExtras?.detallesPorContrato?.some(
    (d) => d.tipoLiquidacion === 'definitiva' || d.semanas?.every((s) => s.esDefinitiva)
  );
  const esMixta = esAnticipada && esDefinitiva;

  const getLiquidacionConfirmType = () => {
    if (esMixta) return 'warning';
    if (esAnticipada) return 'warning';
    return 'info';
  };

  const getLiquidacionTipoLabel = () => {
    if (esMixta) return 'Mixta (anticipada y definitiva)';
    if (esAnticipada && !esDefinitiva) return 'Anticipada (provisional)';
    return 'Definitiva';
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

          {esAnticipada && !esDefinitiva && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-medium">Liquidación anticipada (provisional)</p>
                <p className="text-xs mt-1">
                  El periodo no incluye el día de cierre de la semana. Las extras mostradas son provisionales.
                  Al cerrar la semana se calculará el ajuste definitivo.
                </p>
                {resumenHorasExtras.detallesPorContrato.flatMap((d) => d.semanas || [])
                  .filter((s) => s.diasPendientes?.length > 0)
                  .map((s, i) => (
                    <p key={i} className="text-xs mt-1">
                      Días pendientes: {s.diasPendientes.join(', ')} (cierre: {s.diaCierreLabel})
                    </p>
                  ))}
              </div>
            </div>
          )}

          {esDefinitiva && (
            <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-lg flex items-start space-x-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-900">
                Liquidación definitiva: el periodo incluye el día de cierre semanal del contrato.
              </p>
            </div>
          )}
          
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
                            Contrato: {detalle.horasSemanales}h semanales ({formatDiasLaborables(detalle.diasLaborables)})
                            {detalle.valorHoraExtra > 0 && (
                              <span> • Valor hora extra: ${detalle.valorHoraExtra}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Horas Trabajadas</p>
                            <p className="text-lg font-bold text-blue-600">
                              {detalle.horasTrabajadas.toFixed(2)}h
                            </p>
                          </div>
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
                      Contrato: {resumenHorasExtras.detallesPorContrato[0].horasSemanales}h semanales ({formatDiasLaborables(resumenHorasExtras.detallesPorContrato[0].diasLaborables)})
                      {resumenHorasExtras.detallesPorContrato[0].valorHoraExtra > 0 && (
                        <span> • Valor hora extra: ${resumenHorasExtras.detallesPorContrato[0].valorHoraExtra}</span>
                      )}
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Total Horas Trabajadas</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">
                        {resumenHorasExtras.totalHorasTrabajadas.toFixed(2)}h
                      </p>
                    </div>
                  </div>
                  
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
                
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                  <p className="text-xs text-gray-600">
                    Periodo: {formatDate(fechaInicio)} - {formatDate(fechaFin)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Las horas extras se calculan semana por semana según los días laborables y el día de cierre del contrato
                  </p>

                  {contratoId && (
                    <button
                      type="button"
                      onClick={handleRegistrarLiquidacionClick}
                      disabled={registrandoLiquidacion}
                      className="btn-primary flex items-center justify-center space-x-2 text-sm w-full sm:w-auto"
                    >
                      <FileCheck className="h-4 w-4" />
                      <span>{registrandoLiquidacion ? 'Registrando...' : 'Registrar liquidación'}</span>
                    </button>
                  )}

                  {liquidacionMsg && (
                    <p className="text-xs text-green-700 font-medium">{liquidacionMsg}</p>
                  )}

                  {liquidaciones.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700 mb-2">Liquidaciones registradas:</p>
                      <div className="space-y-2">
                        {liquidaciones.map((liq) => (
                          <div key={liq.id} className="bg-gray-50 rounded p-2 border border-gray-200 text-xs">
                            <div className="flex justify-between items-center">
                              <span className={`font-medium capitalize ${
                                liq.tipo === 'anticipada' ? 'text-amber-700' :
                                liq.tipo === 'ajuste' ? 'text-purple-700' : 'text-green-700'
                              }`}>
                                {liq.tipo}
                              </span>
                              <span className="text-gray-500">Sem. {liq.semana_lunes}</span>
                            </div>
                            <p className="text-gray-600 mt-1">
                              {parseFloat(liq.horas_extras).toFixed(2)}h extras
                              {parseFloat(liq.importe) !== 0 && ` • $${parseFloat(liq.importe).toFixed(2)}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
          title="Eliminar horario"
          message={`¿Eliminar el horario del ${horarioToDelete?.fecha}? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={handleDeleteConfirm}
          type="danger"
        />
      )}

      {showLiquidacionModal && resumenHorasExtras && (
        <ConfirmModal
          isOpen={showLiquidacionModal}
          onClose={() => setShowLiquidacionModal(false)}
          onConfirm={handleRegistrarLiquidacionConfirm}
          title="Confirmar liquidación"
          message="Revisa el resumen antes de registrar. Una vez guardada, no podrás duplicar la misma liquidación para la misma semana."
          confirmText="Registrar liquidación"
          cancelText="Cancelar"
          type={getLiquidacionConfirmType()}
        >
          <div className="space-y-3 text-sm">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Periodo</span>
                <span className="font-medium text-gray-900">
                  {formatDate(fechaInicio)} – {formatDate(fechaFin)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Horas extras</span>
                <span className="font-medium text-orange-600">
                  {resumenHorasExtras.totalHorasExtras.toFixed(2)}h
                </span>
              </div>
              {resumenHorasExtras.totalImporte > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Importe</span>
                  <span className="font-medium text-green-600">
                    ${resumenHorasExtras.totalImporte.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Tipo</span>
                <span className={`font-medium ${
                  esAnticipada && !esDefinitiva ? 'text-amber-700' :
                  esMixta ? 'text-amber-700' : 'text-green-700'
                }`}>
                  {getLiquidacionTipoLabel()}
                </span>
              </div>
            </div>

            {(esAnticipada || esMixta) && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
                <p className="font-medium">Atención: liquidación provisional</p>
                <p className="mt-1">
                  {esMixta
                    ? 'Algunas semanas del periodo aún no han cerrado. Se registrarán como anticipadas y, al cerrar cada semana, se calculará el ajuste correspondiente.'
                    : 'La semana aún no ha cerrado según el día de cierre del contrato. Las horas extras son provisionales y podrían cambiar al cerrar la semana.'}
                </p>
              </div>
            )}

            {esDefinitiva && !esMixta && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-900 text-xs">
                El periodo incluye el cierre semanal del contrato. La liquidación se registrará como definitiva.
              </div>
            )}
          </div>
        </ConfirmModal>
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlertModal}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </>
  );
});

export default HorariosContratoList;

