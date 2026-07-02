import React from 'react';
import { X, Download } from 'lucide-react';
import { downloadPdfBlob } from '../utils/pdfPreview';

function PdfPreviewModal({ isOpen, preview, onClose, title = 'Vista previa del PDF' }) {
  if (!isOpen || !preview?.url) return null;

  const handleDownload = () => {
    downloadPdfBlob(preview.blob, preview.filename);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col z-[70] p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl flex flex-col flex-1 min-h-0 max-w-6xl w-full mx-auto overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4 border-b border-gray-200 shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate min-w-0">
            {preview.title || title}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="btn-primary flex items-center gap-2 text-sm px-3 py-2"
            >
              <Download className="h-4 w-4" />
              Descargar
            </button>
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
        <div className="flex-1 min-h-0 bg-gray-100">
          <iframe
            src={preview.url}
            title={preview.title || title}
            className="w-full h-full min-h-[70vh] border-0"
          />
        </div>
      </div>
    </div>
  );
}

export default PdfPreviewModal;
