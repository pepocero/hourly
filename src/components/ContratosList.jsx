import React from 'react';
import { Edit, Trash2, Check } from 'lucide-react';

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
    <div className="mt-4 space-y-2">
      {contratos.map((contrato) => (
        <div
          key={contrato.id}
          onClick={() => onSelect(contrato)}
          className={`p-3 sm:p-4 rounded-lg border-2 transition-all cursor-pointer ${
            contratoSeleccionado?.id === contrato.id
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-primary-300 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
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
                  <span className="ml-1">/ semana</span>
                </span>
                <span className="hidden sm:inline text-gray-300">|</span>
                <span className="flex items-center">
                  <span className="font-medium">${contrato.valor_hora_extra}</span>
                  <span className="ml-1">/ hora extra</span>
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

