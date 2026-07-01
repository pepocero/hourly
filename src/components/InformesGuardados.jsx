import React, { useState, useEffect } from 'react';
import {
  Archive,
  FileDown,
  Trash2,
  Search,
  Calendar,
  Clock,
  Euro,
  ChevronLeft,
  FileText
} from 'lucide-react';
import apiService from '../services/api';
import ConfirmModal from './ConfirmModal';
import AlertModal from './AlertModal';
import {
  parseInformeGuardadoDatos,
  exportarInformeGuardadoPDF
} from '../utils/informeGuardado';
import { isDiaSuelto } from '../utils/contratoHoras';
import { formatFechaEU, formatFechaRegistro, formatEuro } from '../utils/formatFecha';

function InformesGuardados({ contratos = [], informeIdInicial = null, onInformeInicialConsumido }) {
  const [informes, setInformes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFin, setFiltroFin] = useState('');
  const [filtroContrato, setFiltroContrato] = useState('');
  const [informeSeleccionado, setInformeSeleccionado] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [informeToDelete, setInformeToDelete] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

  useEffect(() => {
    loadInformes();
  }, [filtroInicio, filtroFin, filtroContrato]);

  useEffect(() => {
    if (informeIdInicial) {
      abrirInforme(informeIdInicial);
      if (onInformeInicialConsumido) onInformeInicialConsumido();
    }
  }, [informeIdInicial]);

  const loadInformes = async () => {
    try {
      setLoading(true);
      const response = await apiService.getInformesGuardados(
        filtroInicio || null,
        filtroFin || null,
        filtroContrato ? parseInt(filtroContrato, 10) : null
      );
      if (response.success) {
        setInformes(response.data || []);
      }
    } catch (error) {
      console.error('Error cargando informes guardados:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirInforme = async (id) => {
    try {
      setCargandoDetalle(true);
      const response = await apiService.getInformeGuardado(id);
      if (response.success) {
        setInformeSeleccionado(response.data);
      } else {
        setAlertModal({
          isOpen: true,
          title: 'No encontrado',
          message: response.error || 'No se pudo cargar el informe.',
          type: 'error'
        });
      }
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'No se pudo cargar el informe guardado.',
        type: 'error'
      });
    } finally {
      setCargandoDetalle(false);
    }
  };

  const handleExportarPDF = async () => {
    if (!informeSeleccionado) return;
    try {
      setExportandoPdf(true);
      await exportarInformeGuardadoPDF(informeSeleccionado);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error al exportar',
        message: error.message || 'No se pudo generar el PDF.',
        type: 'error'
      });
    } finally {
      setExportandoPdf(false);
    }
  };

  const handleEliminarConfirm = async () => {
    if (!informeToDelete) return;
    try {
      setEliminando(true);
      const response = await apiService.deleteInformeGuardado(informeToDelete.id);
      if (response.success) {
        if (informeSeleccionado?.id === informeToDelete.id) {
          setInformeSeleccionado(null);
        }
        await loadInformes();
      } else {
        setAlertModal({
          isOpen: true,
          title: 'No se pudo eliminar',
          message: response.error || 'Error al eliminar el informe.',
          type: 'error'
        });
      }
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'No se pudo eliminar el informe.',
        type: 'error'
      });
    } finally {
      setEliminando(false);
      setInformeToDelete(null);
    }
  };

  const formatTime = (time) => (time ? time.substring(0, 5) : '-');

  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const datosDetalle = informeSeleccionado
    ? parseInformeGuardadoDatos(informeSeleccionado)
    : null;

  if (informeSeleccionado && datosDetalle) {
    const subtotales = Object.values(datosDetalle.subtotalesPorContrato || {});
    const resumen = datosDetalle.resumen || {};

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            type="button"
            onClick={() => setInformeSeleccionado(null)}
            className="btn-secondary flex items-center gap-2 text-sm w-fit"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver a la lista
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportarPDF}
              disabled={exportandoPdf}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <FileDown className="h-4 w-4" />
              {exportandoPdf ? 'Generando PDF...' : 'Exportar PDF'}
            </button>
            <button
              type="button"
              onClick={() => setInformeToDelete(informeSeleccionado)}
              className="btn-secondary flex items-center gap-2 text-sm text-red-700 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                {informeSeleccionado.titulo}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {formatFechaEU(informeSeleccionado.fecha_inicio)} – {formatFechaEU(informeSeleccionado.fecha_fin)}
                {' • '}
                {informeSeleccionado.num_semanas === 1
                  ? '1 semana'
                  : `${informeSeleccionado.num_semanas} semanas`}
                {informeSeleccionado.liquidacion_agrupada ? ' • Liquidación agrupada' : ''}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Guardado: {formatFechaRegistro(informeSeleccionado.created_at)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-700">Total horas</p>
              <p className="text-lg font-bold text-blue-900">{(resumen.totalHoras || 0).toFixed(1)}h</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <p className="text-xs text-amber-700">Horas extras</p>
              <p className="text-lg font-bold text-amber-900">{(resumen.totalHorasExtras || 0).toFixed(2)}h</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-700">Importe extras</p>
              <p className="text-lg font-bold text-green-900">{formatEuro(resumen.totalGanancias || 0)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">Registros</p>
              <p className="text-lg font-bold text-gray-900">{resumen.totalRegistros || 0}</p>
            </div>
          </div>

          {subtotales.map((subtotal) => (
            <div key={subtotal.nombre} className="mb-6 last:mb-0">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">{subtotal.nombre}</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Entrada</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Salida</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duración</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Comentario</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(subtotal.registros || []).map((h) => (
                      <tr
                        key={h.id}
                        className={isDiaSuelto(h) ? 'bg-amber-50' : ''}
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          {formatFechaEU(h.fecha)}
                          {isDiaSuelto(h) && <span className="text-amber-700 ml-1">*</span>}
                        </td>
                        <td className="px-3 py-2">{formatTime(h.hora_entrada)}</td>
                        <td className="px-3 py-2">{formatTime(h.hora_salida)}</td>
                        <td className="px-3 py-2">{formatDuration(h.duracion_minutos)}</td>
                        <td className="px-3 py-2 text-gray-600">{h.descripcion || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Total: {(subtotal.totalHoras || 0).toFixed(2)}h
                {' • '}
                Extras: {(subtotal.horasExtras || 0).toFixed(2)}h
                {' • '}
                {formatEuro(subtotal.totalExtras || 0)}
              </p>
            </div>
          ))}
        </div>

        <ConfirmModal
          isOpen={!!informeToDelete}
          onClose={() => !eliminando && setInformeToDelete(null)}
          onConfirm={handleEliminarConfirm}
          title="Eliminar informe guardado"
          message={`¿Eliminar "${informeToDelete?.titulo}"? Esta acción no se puede deshacer.`}
          confirmText={eliminando ? 'Eliminando...' : 'Eliminar'}
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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-sm text-purple-900">
          Consulta informes de cobro guardados. Puedes filtrar por fechas y exportar a PDF cuando lo necesites.
        </p>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Search className="h-4 w-4" />
          Buscar informes
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
            <input
              type="date"
              value={filtroInicio}
              onChange={(e) => setFiltroInicio(e.target.value)}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
            <input
              type="date"
              value={filtroFin}
              onChange={(e) => setFiltroFin(e.target.value)}
              className="input-field w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Contrato</label>
            <select
              value={filtroContrato}
              onChange={(e) => setFiltroContrato(e.target.value)}
              className="input-field w-full"
            >
              <option value="">Todos</option>
              {contratos.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading || cargandoDetalle ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : informes.length === 0 ? (
        <div className="card text-center py-10">
          <Archive className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No hay informes guardados con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {informes.map((informe) => (
            <button
              key={informe.id}
              type="button"
              onClick={() => abrirInforme(informe.id)}
              className="card w-full text-left hover:border-primary-300 transition-colors"
              style={{ borderLeftWidth: '4px', borderLeftColor: informe.contrato_color || '#8b5cf6' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">{informe.titulo}</p>
                  <p className="text-sm text-gray-600 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatFechaEU(informe.fecha_inicio)} – {formatFechaEU(informe.fecha_fin)}
                    </span>
                    <span>•</span>
                    <span>
                      {informe.num_semanas === 1 ? '1 semana' : `${informe.num_semanas} semanas`}
                    </span>
                    {informe.liquidacion_agrupada ? (
                      <>
                        <span>•</span>
                        <span className="text-blue-700">Agrupada</span>
                      </>
                    ) : null}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Guardado: {formatFechaRegistro(informe.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {informe.num_semanas} sem.
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, title: '', message: '', type: 'info' })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}

export default InformesGuardados;
