import React from 'react';
import { Edit, Trash2, Check } from 'lucide-react';
import { formatDiasLaborables } from '../utils/contratoHoras';
import { formatEuroPorHora } from '../utils/formatFecha';

function ContratosList({ contratos, contratoSeleccionado, onSelect, onEdit, onDelete }) {
  if (contratos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No hay contratos registrados</p>
        <p className="text-xs mt-1">Crea tu primer contrato para comenzar</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {contratos.map((contrato) => (
        <div
          key={contrato.id}
          onClick={() => onSelect(contrato)}
          className={`p-3 sm:p-4 rounded-lg border-l-[6px] border-r-2 border-t-2 border-b-2 transition-all cursor-pointer shadow-sm hover:shadow-md ${
            contratoSeleccionado?.id === contrato.id
              ? 'border-r-primary-500 border-t-primary-500 border-b-primary-500 bg-primary-50'
              : 'border-r-gray-200 border-t-gray-200 border-b-gray-200 hover:border-r-primary-300 hover:border-t-primary-300 hover:border-b-primary-300 bg-white'
          }`}
          style={{ 
            borderLeftColor: contrato.color || '#8b5cf6',
            backgroundColor: contratoSeleccionado?.id === contrato.id ? `${contrato.color}10` : 'white'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <div
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex-shrink-0 shadow-md border-2 border-white"
                  style={{ backgroundColor: contrato.color || '#8b5cf6' }}
                  title={`Color: ${contrato.color}`}
                ></div>
                {contratoSeleccionado?.id === contrato.id && (
                  <Check className="h-4 w-4 text-primary-600 flex-shrink-0" />
                )}
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                  {contrato.nombre}
                </h4>
              </div>
              <div className="mt-1 flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-0">
                <span className="flex items-center">
                  <span className="font-medium">{contrato.horas_semanales}h</span>
                  <span className="ml-1">/ semana ({formatDiasLaborables(contrato.dias_laborables)})</span>
                </span>
                <span className="hidden sm:inline text-gray-300">|</span>
                <span className="flex items-center">
                  <span className="font-medium">{formatEuroPorHora(contrato.valor_hora_extra)}</span>
                  <span className="ml-1">hora extra</span>
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2 ml-2 flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(contrato);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  onEdit(contrato);
                }}
                className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Editar contrato"
              >
                <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(contrato.id);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  onDelete(contrato.id);
                }}
                className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Eliminar contrato"
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ContratosList;

