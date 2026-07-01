import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FileCheck, Trash2, AlertCircle, Receipt } from 'lucide-react';
import apiService from '../services/api';
import ConfirmModal from './ConfirmModal';
import AlertModal from './AlertModal';
import { agruparLiquidacionesContrato, contarSemanasEnPeriodo } from '../utils/contratoHoras';
import { formatFechaEU, formatFechaRegistro, formatEuro } from '../utils/formatFecha';
import { generarTituloInformeCobro } from '../utils/informeGuardado';

const LiquidacionesContratoList = forwardRef(({ contratoId, fechaInicio, fechaFin, contratos, onDataChange, onInformeCobroGenerado }, ref) => {
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anulandoKey, setAnulandoKey] = useState(null);
  const [grupoToAnular, setGrupoToAnular] = useState(null);
  const [showAnularModal, setShowAnularModal] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [generandoInformeKey, setGenerandoInformeKey] = useState(null);

  const getPeriodoGrupo = (grupo) => ({
    inicio: grupo.agrupada ? grupo.periodoInicio : grupo.semanaLunes,
    fin: grupo.agrupada ? grupo.periodoFin : grupo.semanaFin
  });

  const handleInformeCobro = async (grupo) => {
    const { inicio, fin } = getPeriodoGrupo(grupo);
    const key = grupo.agrupada
      ? `agrupada-${grupo.contratoId}-${grupo.periodoInicio}-${grupo.periodoFin}`
      : `${grupo.contratoId}-${grupo.semanaLunes}`;
    const numSemanas = contarSemanasEnPeriodo(inicio, fin);

    try {
      setGenerandoInformeKey(key);
      const response = await apiService.createInformeGuardado({
        titulo: generarTituloInformeCobro(grupo.contratoNombre, inicio, fin, numSemanas),
        contrato_id: grupo.contratoId,
        fecha_inicio: inicio,
        fecha_fin: fin,
        num_semanas: numSemanas,
        liquidacion_agrupada: grupo.agrupada
      });

      if (response.success) {
        if (onInformeCobroGenerado) {
          onInformeCobroGenerado(response.data);
        } else {
          setAlertModal({
            isOpen: true,
            title: 'Informe de cobro generado',
            message: 'El informe se ha guardado. Consulta Informes → Informes guardados para exportarlo a PDF.',
            type: 'success'
          });
        }
      } else {
        setAlertModal({
          isOpen: true,
          title: 'No se pudo generar',
          message: response.error || 'Error al generar el informe de cobro.',
          type: 'error'
        });
      }
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'No se pudo generar el informe de cobro.',
        type: 'error'
      });
    } finally {
      setGenerandoInformeKey(null);
    }
  };

  useImperativeHandle(ref, () => ({
    loadLiquidaciones
  }));

  useEffect(() => {
    loadLiquidaciones();
  }, [contratoId, fechaInicio, fechaFin]);

  const loadLiquidaciones = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const getTipoStyle = (tipo) => {
    switch (tipo) {
      case 'anticipada':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'definitiva':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ajuste':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const agruparPorSemana = () => agruparLiquidacionesContrato(liquidaciones, contratos || []);

  const handleAnularClick = (grupo) => {
    setGrupoToAnular(grupo);
    setShowAnularModal(true);
  };

  const handleAnularConfirm = async () => {
    if (!grupoToAnular) return;
    const key = grupoToAnular.agrupada
      ? `agrupada-${grupoToAnular.contratoId}-${grupoToAnular.periodoInicio}-${grupoToAnular.periodoFin}`
      : `${grupoToAnular.contratoId}-${grupoToAnular.semanaLunes}`;
    setAnulandoKey(key);
    setShowAnularModal(false);

    try {
      const response = grupoToAnular.agrupada
        ? await apiService.anularLiquidacionPeriodoAgrupado(
            grupoToAnular.contratoId,
            grupoToAnular.periodoInicio,
            grupoToAnular.periodoFin
          )
        : await apiService.anularLiquidacionesSemana(
            grupoToAnular.contratoId,
            grupoToAnular.semanaLunes
          );
      if (response.success) {
        await loadLiquidaciones();
        if (onDataChange) onDataChange();
      } else {
        setAlertModal({
          isOpen: true,
          title: 'No se pudo anular',
          message: response.error || 'Error al anular la liquidación.',
          type: 'error'
        });
      }
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'No se pudo anular',
        message: 'Error al anular la liquidación. Inténtalo de nuevo.',
        type: 'error'
      });
    } finally {
      setAnulandoKey(null);
      setGrupoToAnular(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const grupos = agruparPorSemana();

  if (grupos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileCheck className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="text-sm">No hay liquidaciones registradas</p>
        <p className="text-xs mt-1">
          {fechaInicio && fechaFin
            ? 'Prueba otro rango de fechas o registra una liquidación desde Horarios'
            : 'Registra una liquidación desde la pestaña Horarios'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900">
          Puedes anular una liquidación registrada por error. Las agrupadas se anulan por periodo;
          las semanales eliminan todos los registros de esa semana (anticipada, definitiva y ajuste).
        </p>
      </div>

      <div className="space-y-3">
        {grupos.map((grupo) => {
          const key = grupo.agrupada
            ? `agrupada-${grupo.contratoId}-${grupo.periodoInicio}-${grupo.periodoFin}`
            : `${grupo.contratoId}-${grupo.semanaLunes}`;
          const importeTotal = grupo.registros.reduce((sum, r) => sum + parseFloat(r.importe || 0), 0);
          const refLiq = grupo.registros.find((r) => r.tipo === 'definitiva')
            || grupo.registros.find((r) => r.tipo === 'anticipada');
          const horasExtras = refLiq ? parseFloat(refLiq.horas_extras || 0) : 0;
          const { inicio, fin } = getPeriodoGrupo(grupo);
          const numSemanas = contarSemanasEnPeriodo(inicio, fin);

          return (
            <div
              key={key}
              className="border border-gray-200 rounded-lg overflow-hidden"
              style={{ borderLeftWidth: '4px', borderLeftColor: grupo.contratoColor }}
            >
              <div className="bg-gray-50 px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-1">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: grupo.contratoColor }}
                    />
                    <span className="font-medium text-gray-900">{grupo.contratoNombre}</span>
                    {grupo.agrupada && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        Agrupada
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {grupo.agrupada
                      ? `Periodo ${formatFechaEU(grupo.periodoInicio)} – ${formatFechaEU(grupo.periodoFin)}`
                      : `Semana ${formatFechaEU(grupo.semanaLunes)} – ${formatFechaEU(grupo.semanaFin)}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {numSemanas === 1 ? '1 semana' : `${numSemanas} semanas`}
                    {' • '}
                    {horasExtras.toFixed(2)}h extras
                    {importeTotal !== 0 && ` • ${formatEuro(importeTotal)}`}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleInformeCobro(grupo)}
                    disabled={generandoInformeKey === key}
                    className="btn-primary flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
                  >
                    <Receipt className="h-4 w-4" />
                    <span>{generandoInformeKey === key ? 'Generando...' : 'Informe para cobro'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAnularClick(grupo)}
                    disabled={anulandoKey === key}
                    className="btn-secondary flex items-center justify-center gap-2 text-sm text-red-700 border-red-200 hover:bg-red-50 w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{anulandoKey === key ? 'Anulando...' : (grupo.agrupada ? 'Anular periodo' : 'Anular semana')}</span>
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {grupo.registros.map((liq) => (
                  <div key={liq.id} className="px-3 sm:px-4 py-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${getTipoStyle(liq.tipo)}`}>
                          {liq.tipo}
                        </span>
                        <span className="text-xs text-gray-500">
                          Registrada: {formatFechaRegistro(liq.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-gray-600">
                          {parseFloat(liq.horas_trabajadas).toFixed(2)}h trab. / {parseFloat(liq.horas_esperadas).toFixed(2)}h esp.
                        </span>
                        <span className="font-medium text-orange-600">
                          {parseFloat(liq.horas_extras).toFixed(2)}h extras
                        </span>
                        {parseFloat(liq.importe) !== 0 && (
                          <span className={`font-medium ${parseFloat(liq.importe) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatEuro(liq.importe)}
                          </span>
                        )}
                      </div>
                    </div>
                    {liq.notas && (
                      <p className="text-xs text-gray-500 mt-2">{liq.notas}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmModal
        isOpen={showAnularModal}
        onClose={() => {
          setShowAnularModal(false);
          setGrupoToAnular(null);
        }}
        onConfirm={handleAnularConfirm}
        title="Anular liquidación de la semana"
        message={
          grupoToAnular?.agrupada
            ? `¿Anular la liquidación agrupada del ${grupoToAnular ? formatFechaEU(grupoToAnular.periodoInicio) : ''} al ${grupoToAnular ? formatFechaEU(grupoToAnular.periodoFin) : ''}? Se eliminarán todos los registros de ese periodo.`
            : `¿Anular la liquidación de la semana del ${grupoToAnular ? formatFechaEU(grupoToAnular.semanaLunes) : ''}? Se eliminarán todos los registros de esa semana y podrás volver a registrarla.`
        }
        confirmText="Anular liquidación"
        cancelText="Cancelar"
        type="danger"
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, title: '', message: '', type: 'info' })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </>
  );
});

LiquidacionesContratoList.displayName = 'LiquidacionesContratoList';

export default LiquidacionesContratoList;
