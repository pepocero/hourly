import React from 'react';
import { FileText } from 'lucide-react';
import { buildFilasTablaInformeContrato, refrescarDatosInformeContratos } from '../utils/contratoHoras';
import { formatFechaEU, formatEuro } from '../utils/formatFecha';

function formatTime(time) {
  return time ? time.substring(0, 5) : '-';
}

function InformeCobroDetalleView({ datosDetalle, titulo, subtitulo, metaLine }) {
  if (!datosDetalle) return null;

  const datos = refrescarDatosInformeContratos(datosDetalle);
  const subtotales = Object.values(datos.subtotalesPorContrato || {});
  const resumen = datos.resumen || {};

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
          <FileText className="h-5 w-5 text-orange-600" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">
            {titulo}
          </h3>
          {subtitulo && (
            <p className="text-sm text-gray-600 mt-1">{subtitulo}</p>
          )}
          {metaLine && (
            <p className="text-xs text-gray-500 mt-1">{metaLine}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
          <p className="text-xs text-blue-700">Total horas</p>
          <p className="text-lg font-bold text-blue-900">{(resumen.totalHoras || 0).toFixed(1)}h</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
          <p className="text-xs text-amber-700">Horas extras</p>
          <p className="text-lg font-bold text-amber-900">{(resumen.totalHorasExtras || 0).toFixed(2)}h</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
          <p className="text-xs text-green-700">Importe extras</p>
          <p className="text-lg font-bold text-green-900">{formatEuro(resumen.totalGanancias || 0)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <p className="text-xs text-gray-600">Registros</p>
          <p className="text-lg font-bold text-gray-900">{resumen.totalRegistros || 0}</p>
        </div>
      </div>

      {subtotales.map((subtotal) => {
        const filas = buildFilasTablaInformeContrato(subtotal);

        return (
          <div key={subtotal.nombre} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-white">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">{subtotal.nombre}</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-3 py-2 text-left font-medium text-gray-500">Día</th>
                    <th className="px-2 sm:px-3 py-2 text-left font-medium text-gray-500">Entrada</th>
                    <th className="px-2 sm:px-3 py-2 text-left font-medium text-gray-500">Salida</th>
                    <th className="px-2 sm:px-3 py-2 text-right font-medium text-gray-500">Trab.</th>
                    <th className="px-2 sm:px-3 py-2 text-right font-medium text-gray-500">Contrato</th>
                    <th className="px-2 sm:px-3 py-2 text-right font-medium text-gray-500">Extras</th>
                    <th className="px-2 sm:px-3 py-2 text-left font-medium text-gray-500">Comentario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filas.map((fila) => (
                    <tr
                      key={fila.id}
                      className={fila.esDiaSuelto ? 'bg-amber-50' : ''}
                    >
                      <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                        {formatFechaEU(fila.fecha)}
                        {fila.esDiaSuelto && <span className="text-amber-700 ml-1">*</span>}
                      </td>
                      <td className="px-2 sm:px-3 py-2 whitespace-nowrap">{formatTime(fila.horaEntrada)}</td>
                      <td className="px-2 sm:px-3 py-2 whitespace-nowrap">{formatTime(fila.horaSalida)}</td>
                      <td className="px-2 sm:px-3 py-2 text-right whitespace-nowrap">{fila.horasTurno}</td>
                      <td className="px-2 sm:px-3 py-2 text-right whitespace-nowrap">{fila.horasContrato}</td>
                      <td className={`px-2 sm:px-3 py-2 text-right whitespace-nowrap font-medium ${fila.destacarExtras ? 'text-orange-600' : ''}`}>
                        {fila.horasExtras}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-gray-600">{fila.comentario || '-'}</td>
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
        );
      })}
    </div>
  );
}

export default InformeCobroDetalleView;
