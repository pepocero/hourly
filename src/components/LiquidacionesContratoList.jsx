import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FileCheck, Trash2, AlertCircle, Receipt, Eye, X } from 'lucide-react';
import apiService from '../services/api';
import ConfirmModal from './ConfirmModal';
import AlertModal from './AlertModal';
import InformeCobroDetalleView from './InformeCobroDetalleView';
import { agruparLiquidacionesContrato, contarDiasEnPeriodo, buildInformeContratosSnapshot } from '../utils/contratoHoras';
import { formatFechaEU, formatFechaRegistro, formatEuro } from '../utils/formatFecha';
import { generarTituloInformeCobro, buildSnapshotContratosPDF } from '../utils/informeGuardado';
import { revokePdfPreview } from '../utils/pdfPreview';
import PdfPreviewModal from './PdfPreviewModal';

const LiquidacionesContratoList = forwardRef(({ contratoId, fechaInicio, fechaFin, contratos, onDataChange, onInformeCobroGenerado }, ref) => {
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anulandoKey, setAnulandoKey] = useState(null);
  const [grupoToAnular, setGrupoToAnular] = useState(null);
  const [showAnularModal, setShowAnularModal] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [grupoInformeModal, setGrupoInformeModal] = useState(null);
  const [procesandoInforme, setProcesandoInforme] = useState(false);
  const [snapshotDetalle, setSnapshotDetalle] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);

  const abrirVistaPreviaPdf = (preview, title) => {
    setPdfPreview({ ...preview, title });
  };

  const cerrarVistaPreviaPdf = () => {
    setPdfPreview((prev) => {
      revokePdfPreview(prev);
      return null;
    });
  };

  const getPeriodoGrupo = (grupo) => ({
    inicio: grupo.periodoInicio,
    fin: grupo.periodoFin
  });

  const cargarSnapshotGrupo = async (grupo) => {
    const { inicio, fin } = getPeriodoGrupo(grupo);
    const horariosRes = await apiService.getHorariosContrato(grupo.contratoId, inicio, fin, true);
    const horarios = horariosRes.data || [];
    if (horarios.length === 0) return null;
    return buildInformeContratosSnapshot(horarios, inicio, fin, {
      contratoId: grupo.contratoId,
      contratoNombre: grupo.contratoNombre,
      liquidacionAgrupada: true
    });
  };

  const handleInformeCobroClick = (grupo) => {
    setGrupoInformeModal(grupo);
  };

  const handleInformeSoloPDF = async () => {
    if (!grupoInformeModal) return;

    try {
      setProcesandoInforme(true);
      const snapshot = await cargarSnapshotGrupo(grupoInformeModal);
      if (!snapshot) {
        setAlertModal({ isOpen: true, title: 'Sin datos', message: 'No hay horarios en ese periodo.', type: 'info' });
        return;
      }
      const preview = await buildSnapshotContratosPDF(snapshot);
      abrirVistaPreviaPdf(
        preview,
        generarTituloInformeCobro(
          grupoInformeModal.contratoNombre,
          grupoInformeModal.periodoInicio,
          grupoInformeModal.periodoFin,
          contarDiasEnPeriodo(grupoInformeModal.periodoInicio, grupoInformeModal.periodoFin)
        )
      );
      setGrupoInformeModal(null);
    } catch (error) {
      setAlertModal({ isOpen: true, title: 'Error', message: 'No se pudo generar el PDF.', type: 'error' });
    } finally {
      setProcesandoInforme(false);
    }
  };

  const handleInformeVerDetalle = async () => {
    if (!grupoInformeModal) return;

    try {
      setProcesandoInforme(true);
      const snapshot = await cargarSnapshotGrupo(grupoInformeModal);
      if (!snapshot) {
        setAlertModal({ isOpen: true, title: 'Sin datos', message: 'No hay horarios en ese periodo.', type: 'info' });
        return;
      }
      setGrupoInformeModal(null);
      setSnapshotDetalle({
        snapshot,
        contratoNombre: grupoInformeModal.contratoNombre,
        periodoInicio: grupoInformeModal.periodoInicio,
        periodoFin: grupoInformeModal.periodoFin
      });
    } catch (error) {
      setAlertModal({ isOpen: true, title: 'Error', message: 'No se pudo cargar el detalle del informe.', type: 'error' });
    } finally {
      setProcesandoInforme(false);
    }
  };

  const handleInformeGuardar = async () => {
    if (!grupoInformeModal) return;
    const { inicio, fin } = getPeriodoGrupo(grupoInformeModal);
    const numDias = contarDiasEnPeriodo(inicio, fin);

    try {
      setProcesandoInforme(true);
      const response = await apiService.createInformeGuardado({
        titulo: generarTituloInformeCobro(grupoInformeModal.contratoNombre, inicio, fin, numDias),
        contrato_id: grupoInformeModal.contratoId,
        fecha_inicio: inicio,
        fecha_fin: fin,
        num_semanas: numDias,
        liquidacion_agrupada: true
      });

      if (response.success) {
        setGrupoInformeModal(null);
        if (onInformeCobroGenerado) {
          onInformeCobroGenerado(response.data);
        } else {
          setAlertModal({
            isOpen: true,
            title: 'Informe guardado',
            message: 'El informe se ha guardado. Puedes consultarlo en Informes → Informes guardados.',
            type: 'info'
          });
        }
      } else {
        setAlertModal({
          isOpen: true,
          title: 'No se pudo guardar',
          message: response.error || 'Error al guardar el informe.',
          type: 'error'
        });
      }
    } catch (error) {
      setAlertModal({ isOpen: true, title: 'Error', message: 'No se pudo guardar el informe.', type: 'error' });
    } finally {
      setProcesandoInforme(false);
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
    const key = `${grupoToAnular.contratoId}-${grupoToAnular.periodoInicio}-${grupoToAnular.periodoFin}`;
    setAnulandoKey(key);
    setShowAnularModal(false);

    try {
      const response = await apiService.anularLiquidacionPeriodoAgrupado(
        grupoToAnular.contratoId,
        grupoToAnular.periodoInicio,
        grupoToAnular.periodoFin
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
          Cada liquidación cubre un periodo de fechas. Puedes anularla si se registró por error.
        </p>
      </div>

      <div className="space-y-3">
        {grupos.map((grupo) => {
          const key = `${grupo.contratoId}-${grupo.periodoInicio}-${grupo.periodoFin}`;
          const refLiq = grupo.registros[0];
          const importeTotal = parseFloat(refLiq?.importe || 0);
          const horasExtras = refLiq ? parseFloat(refLiq.horas_extras || 0) : 0;
          const numDias = grupo.numDias || contarDiasEnPeriodo(grupo.periodoInicio, grupo.periodoFin);

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
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Periodo {formatFechaEU(grupo.periodoInicio)} – {formatFechaEU(grupo.periodoFin)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {numDias} día{numDias !== 1 ? 's' : ''}
                    {' • '}
                    {horasExtras.toFixed(2)}h extras
                    {importeTotal !== 0 && ` • ${formatEuro(importeTotal)}`}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleInformeCobroClick(grupo)}
                    className="btn-primary flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
                  >
                    <Receipt className="h-4 w-4" />
                    <span>Informe para cobro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAnularClick(grupo)}
                    disabled={anulandoKey === key}
                    className="btn-secondary flex items-center justify-center gap-2 text-sm text-red-700 border-red-200 hover:bg-red-50 w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{anulandoKey === key ? 'Anulando...' : 'Anular periodo'}</span>
                  </button>
                </div>
              </div>

              <div className="px-3 sm:px-4 py-2 text-xs text-gray-500 border-t border-gray-100">
                Registrada: {formatFechaRegistro(refLiq?.created_at)}
                {' • '}
                {parseFloat(refLiq?.horas_trabajadas || 0).toFixed(2)}h trab.
                {' / '}
                {parseFloat(refLiq?.horas_esperadas || 0).toFixed(2)}h contrato
              </div>
            </div>
          );
        })}
      </div>

      {grupoInformeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Informe para cobro</h3>
            <p className="text-sm text-gray-600">
              Periodo {formatFechaEU(grupoInformeModal.periodoInicio)} – {formatFechaEU(grupoInformeModal.periodoFin)}
            </p>
            <p className="text-xs text-gray-500">
              Puedes guardar el informe para consultarlo después o ver el PDF antes de descargarlo.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleInformeVerDetalle}
                disabled={procesandoInforme}
                className="btn-secondary w-full flex items-center justify-center gap-2 border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100"
              >
                <Eye className="h-4 w-4" />
                {procesandoInforme ? 'Cargando...' : 'Ver detalle del informe'}
              </button>
              <button
                type="button"
                onClick={handleInformeGuardar}
                disabled={procesandoInforme}
                className="btn-primary w-full"
              >
                {procesandoInforme ? 'Procesando...' : 'Guardar informe'}
              </button>
              <button
                type="button"
                onClick={handleInformeSoloPDF}
                disabled={procesandoInforme}
                className="btn-secondary w-full"
              >
                Ver PDF
              </button>
              <button
                type="button"
                onClick={() => setGrupoInformeModal(null)}
                disabled={procesandoInforme}
                className="btn-secondary w-full text-gray-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {snapshotDetalle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col z-50 sm:p-4">
          <div className="bg-white flex flex-col flex-1 sm:flex-none sm:max-h-[92vh] sm:rounded-xl sm:shadow-xl sm:mx-auto sm:w-full sm:max-w-4xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 bg-orange-50 flex-shrink-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Detalle del informe para cobro</h3>
              <button
                type="button"
                onClick={() => setSnapshotDetalle(null)}
                className="p-2 rounded-lg text-gray-600 hover:bg-orange-100 hover:text-gray-900"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <InformeCobroDetalleView
                datosDetalle={snapshotDetalle.snapshot}
                titulo={generarTituloInformeCobro(
                  snapshotDetalle.contratoNombre,
                  snapshotDetalle.periodoInicio,
                  snapshotDetalle.periodoFin,
                  contarDiasEnPeriodo(snapshotDetalle.periodoInicio, snapshotDetalle.periodoFin)
                )}
                subtitulo={`${formatFechaEU(snapshotDetalle.periodoInicio)} – ${formatFechaEU(snapshotDetalle.periodoFin)}`}
                metaLine="Vista previa sin guardar — ideal para consultar desde el móvil"
              />
            </div>
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setSnapshotDetalle(null)}
                className="btn-secondary w-full sm:w-auto"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showAnularModal}
        onClose={() => {
          setShowAnularModal(false);
          setGrupoToAnular(null);
        }}
        onConfirm={handleAnularConfirm}
        title="Anular liquidación del periodo"
        message={
          grupoToAnular
            ? `¿Anular la liquidación del ${formatFechaEU(grupoToAnular.periodoInicio)} al ${formatFechaEU(grupoToAnular.periodoFin)}? Los días quedarán libres para volver a liquidar.`
            : ''
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

      <PdfPreviewModal
        isOpen={!!pdfPreview}
        preview={pdfPreview}
        onClose={cerrarVistaPreviaPdf}
        title={pdfPreview?.title}
      />
    </>
  );
});

LiquidacionesContratoList.displayName = 'LiquidacionesContratoList';

export default LiquidacionesContratoList;
