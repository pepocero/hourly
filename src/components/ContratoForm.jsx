import React, { useState, useEffect } from 'react';
import { X, Briefcase } from 'lucide-react';
import apiService from '../services/api';
import DiasLaborablesPicker from './DiasLaborablesPicker';
import ConfirmModal from './ConfirmModal';
import { useFormConfirmations } from '../hooks/useFormConfirmations';
import {
  DIAS_LABORABLES_DEFAULT,
  formatDiasLaborables,
  parseDiasLaborables,
  getDiaCierreEfectivo,
  DIAS_SEMANA_NOMBRES
} from '../utils/contratoHoras';

function ContratoForm({ contrato, onClose, onSave }) {
  const [formData, setFormData] = useState({
    nombre: '',
    horas_semanales: '40',
    valor_hora_extra: '0',
    color: '#8b5cf6',
    dias_laborables: DIAS_LABORABLES_DEFAULT,
    dia_cierre_liquidacion: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const {
    showDiscardModal,
    showSaveModal,
    resetSnapshot,
    requestClose,
    confirmDiscard,
    cancelDiscard,
    requestSave,
    confirmSave,
    cancelSave
  } = useFormConfirmations({ onClose });

  const coloresPredefinidos = [
    '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
    '#ef4444', '#14b8a6', '#f97316', '#06b6d4', '#6366f1'
  ];

  useEffect(() => {
    if (contrato) {
      const data = {
        nombre: contrato.nombre || '',
        horas_semanales: contrato.horas_semanales?.toString() || '40',
        valor_hora_extra: contrato.valor_hora_extra?.toString() || '0',
        color: contrato.color || '#8b5cf6',
        dias_laborables: contrato.dias_laborables ?? DIAS_LABORABLES_DEFAULT,
        dia_cierre_liquidacion: contrato.dia_cierre_liquidacion ?? null
      };
      setFormData(data);
      resetSnapshot(data);
    } else {
      const data = {
        nombre: '',
        horas_semanales: '40',
        valor_hora_extra: '0',
        color: '#8b5cf6',
        dias_laborables: DIAS_LABORABLES_DEFAULT,
        dia_cierre_liquidacion: null
      };
      setFormData(data);
      resetSnapshot(data);
    }
  }, [contrato, resetSnapshot]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const performSave = async () => {
    setLoading(true);
    setError('');

    try {
      const dataToSend = {
        nombre: formData.nombre,
        horas_semanales: parseFloat(formData.horas_semanales),
        valor_hora_extra: parseFloat(formData.valor_hora_extra),
        color: formData.color,
        dias_laborables: formData.dias_laborables,
        dia_cierre_liquidacion: formData.dia_cierre_liquidacion
      };

      let response;
      if (contrato) {
        response = await apiService.updateContrato(contrato.id, dataToSend);
      } else {
        response = await apiService.createContrato(dataToSend);
      }

      if (response.success) {
        onSave();
      } else {
        setError(response.error || 'Error al guardar');
      }
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    requestSave(e, performSave);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-lg">
          <div className="flex items-center space-x-2">
            <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              {contrato ? 'Editar Contrato' : 'Nuevo Contrato'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => requestClose(formData)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 sm:p-6 space-y-3 sm:space-y-4 max-h-[calc(90vh-80px)] overflow-y-auto">
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Nombre */}
          <div>
            <label htmlFor="nombre" className="form-label">
              Nombre del Contrato *
            </label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              required
              value={formData.nombre}
              onChange={handleChange}
              className="input-field"
              placeholder="Ej: Empresa XYZ"
            />
          </div>

          {/* Horas semanales */}
          <div>
            <label htmlFor="horas_semanales" className="form-label">
              Horas Semanales *
            </label>
            <input
              type="number"
              step="0.5"
              id="horas_semanales"
              name="horas_semanales"
              required
              min="0"
              value={formData.horas_semanales}
              onChange={handleChange}
              className="input-field"
              placeholder="40"
            />
            <p className="text-xs text-gray-500 mt-1">
              Horas que debes cumplir por semana según tu contrato (se reparten entre los días laborables marcados)
            </p>
          </div>

          {/* Días laborables */}
          <div>
            <label className="form-label">
              Días laborables *
            </label>
            <DiasLaborablesPicker
              value={formData.dias_laborables}
              onChange={(dias_laborables) => setFormData((prev) => ({ ...prev, dias_laborables }))}
              color={formData.color}
            />
            <p className="text-xs text-gray-500 mt-2">
              Las horas semanales se reparten entre los días marcados ({formatDiasLaborables(formData.dias_laborables)}).
              Los días no marcados no cuentan para el cómputo del contrato.
            </p>
          </div>

          {/* Día de cierre de liquidación */}
          <div>
            <label htmlFor="dia_cierre_liquidacion" className="form-label">
              Día de cierre de liquidación
            </label>
            <select
              id="dia_cierre_liquidacion"
              name="dia_cierre_liquidacion"
              value={formData.dia_cierre_liquidacion ?? getDiaCierreEfectivo(formData.dias_laborables, null)}
              onChange={(e) => setFormData((prev) => ({
                ...prev,
                dia_cierre_liquidacion: parseInt(e.target.value, 10)
              }))}
              className="input-field"
            >
              {[0, 1, 2, 3, 4, 5, 6].map((diaIndex) => (
                <option key={diaIndex} value={diaIndex}>
                  {DIAS_SEMANA_NOMBRES[diaIndex]}
                  {diaIndex === getDiaCierreEfectivo(formData.dias_laborables, null) && formData.dia_cierre_liquidacion === null
                    ? ' (por defecto)'
                    : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Día en que cierras la semana para calcular extras definitivas (puede ser sábado o domingo aunque no sea día laborable).
              Si te pagan antes, el sistema marcará la liquidación como anticipada y calculará el ajuste al cerrar.
            </p>
          </div>

          {/* Valor hora extra */}
          <div>
            <label htmlFor="valor_hora_extra" className="form-label">
              Valor Hora Extra
            </label>
            <input
              type="number"
              step="0.01"
              id="valor_hora_extra"
              name="valor_hora_extra"
              min="0"
              value={formData.valor_hora_extra}
              onChange={handleChange}
              className="input-field"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Precio por cada hora extra trabajada después de cumplir las horas semanales
            </p>
          </div>

          {/* Color */}
          <div>
            <label className="form-label">
              Color *
            </label>
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              {coloresPredefinidos.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color: colorOption }))}
                  onTouchStart={() => setFormData(prev => ({ ...prev, color: colorOption }))}
                  className={`h-12 sm:h-14 rounded-lg border-3 transition-all ${
                    formData.color === colorOption
                      ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-900'
                      : 'border-gray-300 hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: colorOption }}
                  title={colorOption}
                  aria-label={`Color ${colorOption}`}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center space-x-2">
              <div
                className="w-6 h-6 rounded-full border-2 border-gray-300"
                style={{ backgroundColor: formData.color }}
              ></div>
              <p className="text-xs text-gray-600">
                Color seleccionado: <span className="font-medium">{formData.color}</span>
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Este color identificará el contrato en listas e informes
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-3 sm:pt-4">
            <button
              type="button"
              onClick={() => requestClose(formData)}
              className="btn-secondary flex-1 py-2.5 sm:py-2 text-sm sm:text-base"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 py-2.5 sm:py-2 text-sm sm:text-base"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={showDiscardModal}
        onClose={cancelDiscard}
        onConfirm={confirmDiscard}
        title="Descartar cambios"
        message="Tienes cambios sin guardar en este contrato. ¿Quieres cerrar sin guardar?"
        confirmText="Descartar"
        cancelText="Seguir editando"
        type="warning"
      />

      <ConfirmModal
        isOpen={showSaveModal}
        onClose={cancelSave}
        onConfirm={confirmSave}
        title={contrato ? 'Guardar cambios del contrato' : 'Crear contrato'}
        message={contrato
          ? 'Los cambios en horas semanales, días laborables o día de cierre afectarán el cálculo de extras y liquidaciones futuras.'
          : 'Se creará un nuevo contrato con la configuración indicada.'}
        confirmText={contrato ? 'Guardar cambios' : 'Crear contrato'}
        cancelText="Cancelar"
        type={contrato ? 'warning' : 'info'}
      >
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Nombre</span>
            <span className="font-medium text-gray-900">{formData.nombre || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Horas semanales</span>
            <span className="font-medium text-gray-900">{formData.horas_semanales}h</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Días laborables</span>
            <span className="font-medium text-gray-900">{formatDiasLaborables(formData.dias_laborables)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Cierre liquidación</span>
            <span className="font-medium text-gray-900">
              {DIAS_SEMANA_NOMBRES[formData.dia_cierre_liquidacion ?? getDiaCierreEfectivo(formData.dias_laborables, null)]}
            </span>
          </div>
        </div>
      </ConfirmModal>
    </div>
  );
}

export default ContratoForm;

