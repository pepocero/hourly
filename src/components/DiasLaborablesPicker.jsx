import React from 'react';
import { DIAS_SEMANA_LABELS, DIAS_LABORABLES_DEFAULT } from '../utils/contratoHoras';

function DiasLaborablesPicker({ value = DIAS_LABORABLES_DEFAULT, onChange, color = '#8b5cf6', disabled = false }) {
  const toggleDia = (bit) => {
    if (disabled) return;

    const activos = value & bit;
    if (activos) {
      const restantes = value & ~bit;
      if (restantes === 0) return;
      onChange(restantes);
    } else {
      onChange(value | bit);
    }
  };

  return (
    <div className="flex items-center justify-between gap-1 sm:gap-2">
      {DIAS_SEMANA_LABELS.map((label, index) => {
        const bit = 1 << index;
        const activo = (value & bit) !== 0;

        return (
          <button
            key={label + index}
            type="button"
            disabled={disabled}
            onClick={() => toggleDia(bit)}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full text-xs sm:text-sm font-semibold transition-all border-2 ${
              activo
                ? 'text-white shadow-md'
                : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            style={activo ? { backgroundColor: color, borderColor: color } : undefined}
            title={activo ? `Día laborable: ${label}` : `No laborable: ${label}`}
            aria-pressed={activo}
            aria-label={`Día ${label}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default DiasLaborablesPicker;
