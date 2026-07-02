import React, { useState, useEffect } from 'react';
import {
  Archive,
  FileDown,
  Trash2,
  Search,
  Calendar,
  Clock,
  ChevronLeft
} from 'lucide-react';
import apiService from '../services/api';
import ConfirmModal from './ConfirmModal';
import AlertModal from './AlertModal';
import {
  parseInformeGuardadoDatos,
  buildInformeGuardadoPDF
} from '../utils/informeGuardado';
import { revokePdfPreview } from '../utils/pdfPreview';
import PdfPreviewModal from './PdfPreviewModal';
import InformeCobroDetalleView from './InformeCobroDetalleView';
import { formatFechaEU, formatFechaRegistro } from '../utils/formatFecha';

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
  const [pdfPreview, setPdfPreview] = useState(null);

  const cerrarVistaPreviaPdf = () => {
    setPdfPreview((prev) => {
      revokePdfPreview(prev);
      return null;
    });
  };

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
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Error al cargar',
          message: response.error || 'No se pudieron cargar los informes guardados.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error cargando informes guardados:', error);
      setAlertModal({
        isOpen: true,
        title: 'Error al cargar',
        message: 'No se pudieron cargar los informes guardados.',
        type: 'error'
      });
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
      const preview = await buildInformeGuardadoPDF(informeSeleccionado);
      setPdfPreview({
        ...preview,
        title: informeSeleccionado.titulo || 'Vista previa del PDF'
      });
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

  const datosDetalle = informeSeleccionado
    ? parseInformeGuardadoDatos(informeSeleccionado)
    : null;

  if (informeSeleccionado && !datosDetalle) {
    return (
      <div className="card text-center py-10">
        <p className="text-red-600 mb-4">No se pudo leer el contenido de este informe guardado.</p>
        <button type="button" onClick={() => setInformeSeleccionado(null)} className="btn-secondary">
          Volver a la lista
        </button>
      </div>
    );
  }

  if (informeSeleccionado && datosDetalle) {
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
              {exportandoPdf ? 'Generando PDF...' : 'Ver PDF'}
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
          <InformeCobroDetalleView
            datosDetalle={datosDetalle}
            titulo={informeSeleccionado.titulo}
            subtitulo={`${formatFechaEU(informeSeleccionado.fecha_inicio)} – ${formatFechaEU(informeSeleccionado.fecha_fin)} • ${
              informeSeleccionado.num_semanas === 1
                ? '1 semana'
                : `${informeSeleccionado.num_semanas} semanas`
            }${informeSeleccionado.liquidacion_agrupada ? ' • Liquidación agrupada' : ''}`}
            metaLine={`Guardado: ${formatFechaRegistro(informeSeleccionado.created_at)}`}
          />
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

        <PdfPreviewModal
          isOpen={!!pdfPreview}
          preview={pdfPreview}
          onClose={cerrarVistaPreviaPdf}
          title={pdfPreview?.title}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-sm text-purple-900">
          Consulta informes de cobro guardados. Puedes filtrar por fechas y ver el PDF antes de descargarlo.
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

      <PdfPreviewModal
        isOpen={!!pdfPreview}
        preview={pdfPreview}
        onClose={cerrarVistaPreviaPdf}
        title={pdfPreview?.title}
      />
    </div>
  );
}

export default InformesGuardados;
