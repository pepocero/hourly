import React, { useMemo } from 'react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';
import {
  downloadPdfBlob,
  abrirPdfEnNuevaPestana,
  esDispositivoMovilPdf
} from '../utils/pdfPreview';

function PdfPreviewModal({ isOpen, preview, onClose, title = 'Vista previa del PDF' }) {
  const esMovil = useMemo(() => esDispositivoMovilPdf(), []);

  if (!isOpen || !preview?.url) return null;

  const handleDownload = () => {
    downloadPdfBlob(preview.blob, preview.filename);
  };

  const handleAbrir = () => {
    abrirPdfEnNuevaPestana(preview.blob, preview.filename);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col z-[70] p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl flex flex-col flex-1 min-h-0 max-w-6xl w-full mx-auto overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border-b border-gray-200 shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate min-w-0">
            {preview.title || title}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {esMovil ? (
              <>
                <button
                  type="button"
                  onClick={handleAbrir}
                  className="btn-primary flex items-center gap-2 text-sm px-3 py-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir PDF
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="btn-secondary flex items-center gap-2 text-sm px-3 py-2"
                >
                  <Download className="h-4 w-4" />
                  Descargar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleDownload}
                className="btn-primary flex items-center gap-2 text-sm px-3 py-2"
              >
                <Download className="h-4 w-4" />
                Descargar
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Cerrar vista previa"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {esMovil ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-6 sm:p-10 text-center bg-gray-50">
            <div className="p-4 bg-orange-100 rounded-full mb-4">
              <FileText className="h-10 w-10 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF listo</h3>
            <p className="text-sm text-gray-600 max-w-sm mb-6">
              En el móvil la vista previa embebida no funciona bien. Usa{' '}
              <strong>Abrir PDF</strong> para verlo en el navegador o{' '}
              <strong>Descargar</strong> para guardarlo en el dispositivo.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={handleAbrir}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                <ExternalLink className="h-5 w-5" />
                Abrir PDF
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="btn-secondary w-full flex items-center justify-center gap-2 py-3"
              >
                <Download className="h-5 w-5" />
                Descargar
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-4">{preview.filename}</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 bg-gray-100">
            <iframe
              src={preview.url}
              title={preview.title || title}
              className="w-full h-full min-h-[70vh] border-0"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default PdfPreviewModal;
