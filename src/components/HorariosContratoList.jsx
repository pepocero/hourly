import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Edit, Trash2, Calendar, Clock, DollarSign, FileCheck } from 'lucide-react';
import apiService from '../services/api';
import ConfirmModal from './ConfirmModal';
import AlertModal from './AlertModal';
import {
  calcularResumenHorasExtrasMultiples,
  calcularHorasExtrasPeriodo,
  getDuracionMinutosHorario,
  formatDiasLaborables,
  agruparLiquidacionesContrato,
  encontrarDiasYaLiquidados,
  contarDiasEnPeriodo
} from '../utils/contratoHoras';
import { formatFechaEUCorta, formatFechaEU, formatEuro, formatEuroPorHora } from '../utils/formatFecha';

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
      const response = await apiService.getLiquidacionesContrato(
        contratoId || null,
        null,
        fechaInicio || null,
        fechaFin || null
      );
      if (response.success) {
        setLiquidaciones(response.data || []);
      }
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

    const diasSolapados = encontrarDiasYaLiquidados(
      liquidaciones,
      parseInt(contratoId, 10),
      fechaInicio,
      fechaFin
    );
    if (diasSolapados.length > 0) {
      showAlert(
        'Días ya liquidados',
        `Hay ${diasSolapados.length} día(s) del periodo que ya fueron liquidados. Ajusta el rango de fechas.`,
        'warning'
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
        setLiquidacionMsg('Liquidación del periodo registrada correctamente');
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
    if (!minutes || minutes <= 0) return null;
    const horas = minutes / 60;
    return `${parseFloat(horas.toFixed(1))}h`;
  };

  const formatHorasDecimal = (horas) => {
    const n = parseFloat(horas);
    if (Number.isNaN(n)) return '0h';
    return `${parseFloat(n.toFixed(1))}h`;
  };

  const detallePorDiaContrato = useMemo(() => {
    const grupos = {};

    horarios.forEach((horario) => {
      const key = `${horario.contrato_id}-${horario.fecha}`;
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(horario);
    });

    const map = {};
    Object.entries(grupos).forEach(([key, registros]) => {
      const first = registros[0];
      const contrato = contratosMap[first.contrato_id] || {
        horas_por_dia: first.horas_por_dia,
        horas_semanales: first.horas_semanales,
        dias_laborables: first.dias_laborables,
        valor_hora_extra: first.valor_hora_extra
      };
      const resultado = calcularHorasExtrasPeriodo(registros, contrato, first.fecha, first.fecha);
      map[key] = {
        horasPorDia: resultado.horasPorDia,
        horasExtras: resultado.horasExtras
      };
    });

    return map;
  }, [horarios, contratosMap]);

  const formatDate = (dateString) => formatFechaEUCorta(dateString);

  // Calcular horas extras del periodo seleccionado
  const calcularHorasExtras = useMemo(() => {
    if (!fechaInicio || !fechaFin || horarios.length === 0) {
      return null;
    }

    return calcularResumenHorasExtrasMultiples(horarios, fechaInicio, fechaFin, contratosMap);
  }, [horarios, fechaInicio, fechaFin, contratosMap]);

  const resumenHorasExtras = calcularHorasExtras;
  const numDiasPeriodo = fechaInicio && fechaFin ? contarDiasEnPeriodo(fechaInicio, fechaFin) : 0;
  const detalleContrato = resumenHorasExtras?.detallesPorContrato?.[0];

  const liquidacionesAgrupadas = useMemo(
    () => agruparLiquidacionesContrato(liquidaciones, contratos || []),
    [liquidaciones, contratos]
  );

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
        {horarios.map((horario) => {
          const detalleDia = detallePorDiaContrato[`${horario.contrato_id}-${horario.fecha}`];
          const minutosTrabajados = getDuracionMinutosHorario(horario);

          return (
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
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{horario.hora_entrada}</span>
                    <span>-</span>
                    <span>{horario.hora_salida || 'En curso'}</span>
                    {minutosTrabajados > 0 && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span className="font-medium text-primary-600">
                          {formatDuration(minutosTrabajados)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {detalleDia && minutosTrabajados > 0 && (
                  <p className="mt-1.5 text-xs sm:text-sm text-gray-600">
                    <span>
                      Contrato:{' '}
                      <span className="font-medium text-gray-800">
                        {formatHorasDecimal(detalleDia.horasPorDia)}/día
                      </span>
                    </span>
                    <span className="text-gray-400 mx-2">•</span>
                    <span>
                      Extras:{' '}
                      <span className={`font-medium ${detalleDia.horasExtras > 0 ? 'text-orange-600' : 'text-gray-800'}`}>
                        {formatHorasDecimal(detalleDia.horasExtras)}
                      </span>
                    </span>
                  </p>
                )}

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
          );
        })}
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
                            Contrato: {detalle.horasSemanales}h semanales ({formatDiasLaborables(detalle.diasLaborables)})
                            {detalle.valorHoraExtra > 0 && (
                              <span> • Valor hora extra: {formatEuroPorHora(detalle.valorHoraExtra)}</span>
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
                                {formatEuro(detalle.importe)}
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
                      Contrato: {detalleContrato.horasSemanales}h semanales • {detalleContrato.horasPorDia}h/día ({formatDiasLaborables(detalleContrato.diasLaborables)})
                      {detalleContrato.valorHoraExtra > 0 && (
                        <span> • Valor hora extra: {formatEuroPorHora(detalleContrato.valorHoraExtra)}</span>
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
                          {formatEuro(resumenHorasExtras.totalImporte)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                  <p className="text-xs text-gray-600">
                    Periodo: {formatDate(fechaInicio)} – {formatDate(fechaFin)} ({numDiasPeriodo} día{numDiasPeriodo !== 1 ? 's' : ''})
                  </p>
                  <p className="text-xs text-gray-500">
                    Las horas extras se calculan por día: en días laborables, lo que supera las horas de contrato del día; en otros días, todo es extra.
                  </p>

                  {detalleContrato?.dias?.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-2 border border-gray-200 max-h-40 overflow-y-auto">
                      <p className="text-xs font-medium text-gray-700 mb-1">Desglose por día</p>
                      {detalleContrato.dias.map((dia) => (
                        <div key={dia.fecha} className="flex justify-between text-xs text-gray-600 py-0.5">
                          <span>{formatFechaEU(dia.fecha)}</span>
                          <span>
                            {dia.horasTrabajadas.toFixed(2)}h trab.
                            {' • '}
                            <span className="text-orange-600">{dia.horasExtras.toFixed(2)}h extras</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

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

                  {liquidacionesAgrupadas.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-700 mb-2">Liquidaciones registradas:</p>
                      <div className="space-y-2">
                        {liquidacionesAgrupadas.map((grupo) => {
                          const refLiq = grupo.registros[0];
                          const importeTotal = parseFloat(refLiq?.importe || 0);
                          const grupoKey = `${grupo.contratoId}-${grupo.periodoInicio}-${grupo.periodoFin}`;

                          return (
                            <div key={grupoKey} className="bg-gray-50 rounded p-2 border border-gray-200 text-xs">
                              <div className="flex justify-between items-center gap-2">
                                <span className="font-medium text-green-700">Periodo liquidado</span>
                                <span className="text-gray-500 text-right">
                                  {formatFechaEU(grupo.periodoInicio)} – {formatFechaEU(grupo.periodoFin)}
                                </span>
                              </div>
                              <p className="text-gray-600 mt-1">
                                {grupo.numDias} día{grupo.numDias !== 1 ? 's' : ''}
                                {' • '}
                                {refLiq ? `${parseFloat(refLiq.horas_extras).toFixed(2)}h extras` : ''}
                                {importeTotal !== 0 && ` • ${formatEuro(importeTotal)}`}
                              </p>
                            </div>
                          );
                        })}
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
          message={`¿Eliminar el horario del ${horarioToDelete ? formatFechaEU(horarioToDelete.fecha) : ''}? Esta acción no se puede deshacer.`}
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
          title="Confirmar liquidación del periodo"
          message="Se registrará una liquidación por el rango de fechas seleccionado. Los días ya liquidados no pueden repetirse."
          confirmText="Registrar liquidación"
          cancelText="Cancelar"
          type="info"
        >
          <div className="space-y-3 text-sm">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Periodo</span>
                <span className="font-medium text-gray-900">
                  {formatDate(fechaInicio)} – {formatDate(fechaFin)} ({numDiasPeriodo} días)
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
                    {formatEuro(resumenHorasExtras.totalImporte)}
                  </span>
                </div>
              )}
            </div>
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

